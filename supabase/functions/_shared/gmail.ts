// ─────────────────────────────────────────────────────────────────────────────
// Gmail Utilities — shared module for showing monitor + client email monitor
//
// Handles token refresh, message fetching, and email parsing helpers.
// Tokens stored in user_settings key='google_tokens' (same as gmail-reply-detect).
// ─────────────────────────────────────────────────────────────────────────────

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me'

export interface FullMessage {
  id: string
  threadId: string
  from: string
  subject: string
  body: string
  internalDate: string
}

// ─── Token Management ───────────────────────────────────────────────────────

/** Get a fresh Gmail access token, refreshing if needed */
export async function getGmailAccessToken(supabase: any): Promise<string> {
  const { data: tokenRow, error } = await supabase
    .from('user_settings')
    .select('value')
    .eq('key', 'google_tokens')
    .maybeSingle()

  if (error || !tokenRow?.value?.access_token) {
    throw new Error('Google account not connected. Connect via Settings.')
  }

  let tokens = tokenRow.value

  const expiresAt = tokens.expires_at ? new Date(tokens.expires_at).getTime() : 0
  const isExpired = Date.now() > expiresAt - 5 * 60 * 1000

  if (isExpired && tokens.refresh_token) {
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')

    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth credentials not configured for token refresh.')
    }

    const refreshResp = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: tokens.refresh_token,
        grant_type: 'refresh_token',
      }),
    })

    const refreshData = await refreshResp.json()

    if (refreshResp.ok && refreshData.access_token) {
      tokens = {
        ...tokens,
        access_token: refreshData.access_token,
        expires_in: refreshData.expires_in || 3600,
        expires_at: new Date(Date.now() + (refreshData.expires_in || 3600) * 1000).toISOString(),
      }

      await supabase
        .from('user_settings')
        .upsert(
          { key: 'google_tokens', value: tokens, updated_at: new Date().toISOString() },
          { onConflict: 'key' },
        )
    } else {
      throw new Error(`Token refresh failed: ${refreshData.error_description || refreshData.error}`)
    }
  }

  return tokens.access_token
}

// ─── Gmail API Helpers ──────────────────────────────────────────────────────

/** Search Gmail with a query string, returns message stubs (id + threadId) */
export async function searchGmail(
  accessToken: string,
  query: string,
  maxResults = 50,
): Promise<Array<{ id: string; threadId: string }>> {
  const params = new URLSearchParams({ q: query, maxResults: String(maxResults) })
  const resp = await fetch(`${GMAIL_API}/messages?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!resp.ok) {
    if (resp.status === 429) {
      console.warn('Gmail rate limited, backing off')
      return []
    }
    const errText = await resp.text().catch(() => '')
    throw new Error(`Gmail search error (${resp.status}): ${errText.slice(0, 300)}`)
  }

  const data = await resp.json()
  return data.messages || []
}

/** Fetch full message content (headers + body) */
export async function fetchMessageContent(
  accessToken: string,
  messageId: string,
): Promise<FullMessage> {
  const resp = await fetch(`${GMAIL_API}/messages/${messageId}?format=full`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!resp.ok) {
    throw new Error(`Failed to fetch message ${messageId}: ${resp.status}`)
  }

  const msg = await resp.json()
  const headers = msg.payload?.headers || []

  const getHeader = (name: string) =>
    headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || ''

  return {
    id: msg.id,
    threadId: msg.threadId,
    from: getHeader('From'),
    subject: getHeader('Subject'),
    body: extractBody(msg.payload),
    internalDate: new Date(parseInt(msg.internalDate)).toISOString(),
  }
}

/** Extract body text from Gmail message payload (handles multipart) */
function extractBody(payload: any): string {
  if (!payload) return ''

  // Direct body
  if (payload.body?.data) {
    return base64UrlDecode(payload.body.data)
  }

  // Multipart — prefer text/plain, fall back to text/html
  if (payload.parts) {
    // Try plain text first
    const plain = findPart(payload.parts, 'text/plain')
    if (plain?.body?.data) return base64UrlDecode(plain.body.data)

    // Fall back to HTML (we'll strip tags)
    const html = findPart(payload.parts, 'text/html')
    if (html?.body?.data) return stripHtml(base64UrlDecode(html.body.data))

    // Nested multipart
    for (const part of payload.parts) {
      if (part.parts) {
        const nested = extractBody(part)
        if (nested) return nested
      }
    }
  }

  return ''
}

function findPart(parts: any[], mimeType: string): any {
  for (const part of parts) {
    if (part.mimeType === mimeType) return part
    if (part.parts) {
      const found = findPart(part.parts, mimeType)
      if (found) return found
    }
  }
  return null
}

function base64UrlDecode(data: string): string {
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

// ─── Parsing Helpers ────────────────────────────────────────────────────────

/** Strip HTML tags, preserving line breaks */
export function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:div|p|tr|td|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** Extract email from "Name <email@domain.com>" format */
export function extractEmail(fromStr: string): string {
  const match = fromStr.match(/<([^>]+)>/)
  if (match) return match[1].trim()
  if (fromStr.includes('@')) return fromStr.trim()
  return ''
}

/** Extract display name from "Name <email@domain.com>" format */
export function extractName(fromStr: string): string {
  const match = fromStr.match(/^"?([^"<]+)"?\s*</)
  if (match) return match[1].trim()
  return ''
}

/**
 * Normalize an address string for fuzzy matching.
 * "123 Main Street, Gilbert, AZ 85234" → "123 main st"
 */
export function normalizeAddress(addr: string): string {
  return addr
    .split(',')[0]
    .trim()
    .toLowerCase()
    .replace(/\bstreet\b/g, 'st')
    .replace(/\bavenue\b/g, 'ave')
    .replace(/\bdrive\b/g, 'dr')
    .replace(/\bboulevard\b/g, 'blvd')
    .replace(/\blane\b/g, 'ln')
    .replace(/\bcourt\b/g, 'ct')
    .replace(/\bplace\b/g, 'pl')
    .replace(/\broad\b/g, 'rd')
    .replace(/\bcircle\b/g, 'cir')
    .replace(/\btrail\b/g, 'trl')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Parse a flexible date string to ISO date (YYYY-MM-DD) */
export function parseFlexibleDate(dateStr: string): string {
  // Try native Date parse first
  const d = new Date(dateStr)
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0]
  }
  // MM/DD/YYYY
  const slashMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (slashMatch) {
    return `${slashMatch[3]}-${slashMatch[1].padStart(2, '0')}-${slashMatch[2].padStart(2, '0')}`
  }
  // Fallback: today
  return new Date().toISOString().split('T')[0]
}
