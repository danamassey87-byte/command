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
      // Build conversation history for multi-turn context
      const conversationHistory = [...messages, userMsg].map(m => ({
        role: m.role,
        content: m.content,
      }))

      // Call the ai-assistant-chat edge function (Claude-powered)
      const { data: aiResponse, error: aiError } = await supabase.functions.invoke('ai-assistant-chat', {
        body: {
          messages: conversationHistory,
          contact_id: attachedContact?.id || null,
        },
      })

      if (aiError) throw new Error(aiError.message || 'AI request failed')
      if (aiResponse?.error) throw new Error(aiResponse.error)

      const assistantMsg = {
        role: 'assistant',
        content: aiResponse.text || 'Sorry, I got an empty response. Please try again.',
        compliance: aiResponse.compliance || null,
      }
      setMessages(prev => [...prev, assistantMsg])

      // Log interaction
      DB.createInteraction({
        kind: 'note',
        channel: 'command',
        body: `AI Assistant: ${text.trim().slice(0, 100)}...`,
        contact_id: attachedContact?.id || null,
        metadata: { type: 'ai-chat', prompt_length: text.length },
      }).catch(() => {})

      // Track actual cost from usage data
      const usage = aiResponse.usage || {}
      const inputCost = (usage.input_tokens || 0) * 0.000003
      const outputCost = (usage.output_tokens || 0) * 0.000015
      setCostThisSession(prev => prev + inputCost + outputCost)

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

