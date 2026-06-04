// ─── HTML safety helpers ─────────────────────────────────────────────────────
// XSS defense for the email-preview pipe, Weekly Seller Update, PropertyMap
// InfoWindow, BioLink public links, and anywhere else user/contact freetext
// reaches `dangerouslySetInnerHTML`, Maps `setContent`, or an anchor `href`.

/** Escape the five HTML special chars so a string can be safely interpolated
 *  into an HTML attribute value or text node. */
export function escHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Validate a URL string and only allow http/https/mailto/tel. Anything else
 *  (e.g. `javascript:`, `data:`, `vbscript:`) collapses to `#` so an anchor
 *  click can't execute script in the current document. */
export function safeUrl(u, fallback = '#') {
  if (!u) return fallback
  const raw = String(u).trim()
  if (!raw) return fallback
  try {
    const parsed = new URL(raw, typeof window !== 'undefined' ? window.location.origin : 'https://example.com')
    if (!['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol)) return fallback
    return parsed.toString()
  } catch {
    return fallback
  }
}

/** Strip everything that isn't a safe social-handle char. Keeps a-z 0-9 . _ -
 *  so an Instagram handle like `dana.massey_re` survives but `";<>` cannot
 *  break out of a URL-interpolated attribute. */
export function safeHandle(s) {
  return String(s ?? '').replace(/[^A-Za-z0-9._-]/g, '')
}
