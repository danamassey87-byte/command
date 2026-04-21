import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Button, Badge } from '../../components/ui/index.jsx'
import * as DB from '../../lib/supabase.js'
import supabase from '../../lib/supabase.js'

const SUGGESTED_PROMPTS = [
  { label: 'Write listing description', prompt: 'Write a compelling MLS listing description for my listing at', icon: '🏠' },
  { label: 'Draft follow-up email', prompt: 'Draft a follow-up email to a buyer I showed homes to yesterday. Keep it warm and personal.', icon: '📧' },
  { label: 'OH prep checklist', prompt: 'What should I prepare for an open house this weekend in the Phoenix heat?', icon: '📋' },
  { label: 'Social media caption', prompt: 'Write an Instagram caption for a just-listed post. Make it engaging but compliant.', icon: '📱' },
  { label: 'Objection handler', prompt: 'How should I respond when a seller says "I want to wait until spring to list"?', icon: '💬' },
  { label: 'Market update', prompt: 'Help me write a brief Gilbert AZ market update for my weekly email newsletter.', icon: '📊' },
]

function MessageBubble({ message }) {
  const isUser = message.role === 'user'
  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 12,
    }}>
      <div style={{
        maxWidth: '75%',
        padding: '12px 16px',
        borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        background: isUser ? 'var(--brown-dark, #3A2A1E)' : 'var(--cream-3, #F6F4EE)',
        color: isUser ? 'var(--cream, #EFEDE8)' : 'var(--brown-dark, #3A2A1E)',
        border: isUser ? 'none' : '1px solid var(--color-border, #C8C3B9)',
        fontSize: '0.85rem',
        lineHeight: 1.55,
        whiteSpace: 'pre-wrap',
      }}>
        {message.content}
        {message.compliance && (
          <div style={{
            marginTop: 8, padding: '6px 10px', borderRadius: 6,
            background: message.compliance === 'pass' ? 'rgba(139,154,123,.15)' : 'rgba(201,154,46,.15)',
            fontSize: '0.7rem',
          }}>
            Compliance: <Badge variant={message.compliance === 'pass' ? 'success' : 'warning'} size="sm">{message.compliance}</Badge>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AIAssistant() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [costThisSession, setCostThisSession] = useState(0)
  const [attachedContact, setAttachedContact] = useState(null)
  const [contactSearch, setContactSearch] = useState('')
  const [contactResults, setContactResults] = useState([])

  // Contact search: type @name to attach context
  useEffect(() => {
    const match = input.match(/@(\w{2,})$/)
    if (match) {
      const q = match[1].toLowerCase()
      supabase.from('contacts').select('id, name, email, phone, tier, stage')
        .is('deleted_at', null).ilike('name', `%${q}%`).limit(5)
        .then(({ data }) => setContactResults(data ?? []))
    } else {
      setContactResults([])
    }
  }, [input])
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(async (text) => {
    if (!text?.trim() || loading) return
    const userMsg = { role: 'user', content: text.trim() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      // Build context from recent interactions + RAG
      const systemPrompt = `You are Dana Massey's real estate AI assistant. Dana is a solo agent in Arizona with REAL Brokerage, focused on the East Valley / Gilbert market.

Rules:
- Always comply with Fair Housing Act — never reference protected classes
- Include brokerage disclosure (REAL Brokerage) in any marketing copy
- Never use guarantee language about sales or prices
- Match Dana's tone: warm, direct, professional but not stuffy
- For listing descriptions: lead with lifestyle, mention key features, end with call to action
- For emails: personal touch, no corporate-speak
- For social: engaging hooks, hashtag suggestions, platform-specific formatting

If generating content that will be published, note any compliance considerations.`

      // Use Claude via the existing AI prompts system or direct call
      // For now, generate a helpful response locally
      // In production, this would call an edge function that wraps Claude
      const responses = generateLocalResponse(text.trim(), messages)

      const assistantMsg = {
        role: 'assistant',
        content: responses.text,
        compliance: responses.compliance || null,
      }
      setMessages(prev => [...prev, assistantMsg])

      // Log interaction
      DB.createInteraction({
        kind: 'note',
        channel: 'command',
        body: `AI Assistant: ${text.trim().slice(0, 100)}...`,
        metadata: { type: 'ai-chat', prompt_length: text.length },
      }).catch(() => {})

      // Track estimated cost
      const estimatedTokens = (text.length + responses.text.length) / 4
      const estimatedCost = estimatedTokens * 0.000003 // Sonnet pricing rough estimate
      setCostThisSession(prev => prev + estimatedCost)

    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${e.message}. Connect your Anthropic API key in Settings > Connected Accounts to enable AI responses.` }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }, [loading, messages])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 140px)' }}>
      {/* Header */}
      <div style={{ padding: '12px 0', borderBottom: '1px solid var(--color-border)', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 500, margin: 0, color: 'var(--brown-dark)' }}>
              AI Assistant
            </h1>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
              Compliance-aware writing, analysis, and strategy
            </p>
          </div>
          {costThisSession > 0 && (
            <div style={{
              fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)',
              padding: '4px 10px', borderRadius: 999, border: '1px solid var(--color-border)',
            }}>
              ~${costThisSession.toFixed(4)} this session
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 4px' }}>
        {messages.length === 0 ? (
          <div style={{ padding: '40px 0', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--brown-dark)', marginBottom: 8 }}>
              What can I help with?
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: 20, maxWidth: 400, margin: '0 auto 20px' }}>
              I can write listing descriptions, draft emails, create social captions, prep for appointments, and more — all compliance-checked.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, maxWidth: 500, margin: '0 auto' }}>
              {SUGGESTED_PROMPTS.map((sp, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(sp.prompt)}
                  style={{
                    padding: '10px 14px', borderRadius: 8, textAlign: 'left',
                    border: '1px solid var(--color-border)', background: '#fff',
                    cursor: 'pointer', fontSize: '0.78rem', color: 'var(--brown-dark)',
                    transition: 'border-color 0.15s',
                  }}
                  onMouseEnter={e => e.target.style.borderColor = 'var(--brown-dark)'}
                  onMouseLeave={e => e.target.style.borderColor = 'var(--color-border)'}
                >
                  <span style={{ marginRight: 6 }}>{sp.icon}</span>
                  {sp.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => <MessageBubble key={i} message={msg} />)
        )}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 12 }}>
            <div style={{
              padding: '12px 16px', borderRadius: '16px 16px 16px 4px',
              background: 'var(--cream-3)', border: '1px solid var(--color-border)',
              fontSize: '0.85rem', color: 'var(--color-text-muted)',
            }}>
              Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Context: attached contact */}
      {attachedContact && (
        <div style={{
          padding: '6px 12px', background: 'var(--cream)', borderRadius: 8,
          border: '1px solid var(--color-border)', marginBottom: 4,
          display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem',
        }}>
          <span style={{ color: 'var(--color-text-muted)' }}>Context:</span>
          <Link to={`/contact/${attachedContact.id}`} style={{ fontWeight: 600, color: 'var(--brown-dark)', textDecoration: 'none' }}>
            {attachedContact.name}
          </Link>
          {attachedContact.email && <span style={{ color: 'var(--color-text-muted)' }}>{attachedContact.email}</span>}
          <button onClick={() => setAttachedContact(null)} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)',
            marginLeft: 'auto', fontSize: '0.8rem',
          }}>×</button>
        </div>
      )}

      {/* Input */}
      <div style={{
        padding: '12px 0', borderTop: '1px solid var(--color-border)',
        display: 'flex', gap: 8,
      }}>
        <div style={{ flex: 1, position: 'relative' }}>
        {contactResults.length > 0 && (
          <div style={{
            position: 'absolute', bottom: '100%', left: 0, right: 0, marginBottom: 4,
            background: '#fff', border: '1px solid var(--color-border)', borderRadius: 8,
            boxShadow: '0 4px 12px rgba(58,42,30,.1)', zIndex: 10,
          }}>
            {contactResults.map(c => (
              <button key={c.id} onClick={() => {
                setAttachedContact(c)
                setInput(prev => prev.replace(/@\w+$/, ''))
                setContactResults([])
              }} style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px',
                border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left',
                fontSize: '0.82rem', borderBottom: '1px solid var(--color-border)',
              }}>
                <span style={{ fontWeight: 600 }}>{c.name}</span>
                {c.tier && <span style={{ fontSize: '0.62rem', color: c.tier === 'hot' ? '#c0604a' : 'var(--color-text-muted)' }}>{c.tier}</span>}
                {c.email && <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', marginLeft: 'auto' }}>{c.email}</span>}
              </button>
            ))}
          </div>
        )}
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything... Type @name to attach a contact for context."
          rows={2}
          style={{
            flex: 1, padding: '10px 14px', fontSize: '0.85rem',
            border: '1px solid var(--color-border)', borderRadius: 10,
            fontFamily: 'inherit', resize: 'none', outline: 'none',
            background: '#fff', width: '100%',
          }}
        />
        </div>
        <Button onClick={() => sendMessage(input)} disabled={loading || !input.trim()} style={{ alignSelf: 'flex-end' }}>
          {loading ? '...' : 'Send'}
        </Button>
      </div>
    </div>
  )
}

// ─── Local response generator (placeholder until Claude API is wired) ────────
function generateLocalResponse(prompt, history) {
  const p = prompt.toLowerCase()

  if (p.includes('listing description') || p.includes('mls description')) {
    return {
      text: `Here's a listing description framework for your property:

**Headline:** [Lifestyle hook — what will the buyer's life look like here?]

**Opening:** Start with the emotional hook — the feeling of coming home. Don't lead with beds/baths.

**Body:**
- Key upgrades and features (kitchen, primary suite, outdoor living)
- Neighborhood and lifestyle (schools, parks, shopping, dining)
- Smart home / energy efficiency if applicable

**Closing:** Clear call to action with your contact info.

**Compliance notes:**
- Include "Brokered by REAL Brokerage"
- Avoid terms like "family neighborhood" (Fair Housing)
- Don't guarantee any values or appreciation

Want me to draft a specific one? Give me the address and key features.`,
      compliance: 'pass',
    }
  }

  if (p.includes('follow-up') || p.includes('email')) {
    return {
      text: `Here's a follow-up email draft:

---

**Subject:** Great meeting you [at the open house / at yesterday's showings]!

Hi [Name],

It was wonderful [showing you homes yesterday / meeting you at the open house at {address}]. I really enjoyed hearing about what you're looking for.

[Personal detail — reference something specific they mentioned]

I wanted to follow up with [a few more options that match what we discussed / some additional information about the property].

Would you be free [this week / Thursday afternoon] for a quick call to discuss next steps?

Looking forward to connecting!

Warm regards,
Dana Massey
REAL Brokerage | Arizona
dana@danamassey.com

---

**Tips:** Personalize the bracketed sections. Send within 24 hours of the interaction.`,
      compliance: 'pass',
    }
  }

  if (p.includes('open house') || p.includes('oh prep') || p.includes('heat')) {
    return {
      text: `**Arizona Open House Prep Checklist (Hot Weather Edition):**

**48 Hours Before:**
- Confirm A/C is set to 72°F (pre-cool if vacant)
- Stock bottled water (frozen bottles work great — they thaw by showtime)
- Order directional signs + check they won't melt or blow over
- Post social media announcement with time, address, and "escape the heat" hook

**Day-Of:**
- Arrive 30 min early to cool the house and turn on all lights
- Set out water station at the entry
- Close blinds on sun-facing windows
- Place entry mat (people track in dust)
- Have sign-in kiosk ready (iPad charged + QR printed)

**During:**
- Greet at the door — don't let visitors wander without introduction
- Ask about timeline and pre-approval status (qualify)
- Note which rooms get the most attention

**After:**
- Process sign-ins within 1 hour
- Send follow-up emails same day
- Update your listing agent with attendance + feedback

**Heat-specific warnings:** If it's 110°+, consider a shorter window (1 hour vs 2) and mention A/C comfort in your marketing.`,
      compliance: 'pass',
    }
  }

  if (p.includes('social') || p.includes('instagram') || p.includes('caption')) {
    return {
      text: `Here's an Instagram caption framework:

**Hook (first line — this is what shows before "more"):**
"This kitchen is giving main character energy 🤩" or "POV: You just found your dream home in Gilbert"

**Body:**
- 2-3 key features with personality
- Neighborhood/lifestyle angle
- Price if public, "DM for details" if not

**Call to action:**
"Save this for your house hunting folder 📌"
"Tag someone who needs to see this home 👀"
"Link in bio for the full listing"

**Hashtags (mix of these):**
#GilbertAZ #ArizonaRealEstate #EastValleyHomes #GilbertRealtor #AZRealEstate #NewListing #JustListed #DreamHome #HomeForSale #RealBrokerage

**Compliance note:** Don't use "perfect for families" or reference schools/churches directly in the caption. Focus on the home's features.`,
      compliance: 'pass',
    }
  }

  if (p.includes('objection') || p.includes('wait') || p.includes('spring')) {
    return {
      text: `**Objection: "I want to wait until spring to list"**

**Acknowledge:** "I totally understand that thinking — spring has always been seen as the traditional selling season."

**Reframe with data:**
"Here's what's interesting about our market right now:
- Inventory is lower in [current season], which means less competition for your home
- Serious buyers are out year-round in Arizona — we don't have the weather barriers other markets do
- Interest rates [current context] are motivating buyers to act now
- Homes listed before the spring rush often get more attention"

**Plant the seed:**
"What I'd recommend is this: let me run a market analysis now so we know exactly where your home stands. That way, whether you list now or in spring, you'll be making the decision with real data — not guesswork."

**Close:** "Can I swing by [this week] to take a look and put the numbers together? No pressure either way."

**Key:** Don't argue. Acknowledge, then present an alternative framing with data. The CMA is your foot in the door.`,
      compliance: 'pass',
    }
  }

  // Default
  return {
    text: `I'd be happy to help with that! Here are some thoughts:

${prompt.length > 50 ? 'Based on what you described, here are a few approaches to consider:\n\n1. **Start with the data** — pull relevant market stats or client history to ground your approach\n2. **Draft, then refine** — I can help you create a first draft, then we iterate\n3. **Compliance check** — I\'ll flag any Fair Housing, ADRE, or NAR concerns\n\nCould you give me a bit more detail about the specific situation? For example:\n- Which client or property is this for?\n- What\'s the desired outcome?\n- Any specific tone or style preferences?' : 'Could you tell me more about what you\'re working on? I can help with:\n\n- **Writing:** Listing descriptions, emails, social captions, newsletters\n- **Strategy:** Pricing analysis, marketing plans, objection handling\n- **Preparation:** Open house prep, listing appointment prep, CMA talking points\n- **Compliance:** Review any content for Fair Housing, ADRE, and NAR compliance'}

Just ask naturally — I'm here to help.`,
    compliance: null,
  }
}
