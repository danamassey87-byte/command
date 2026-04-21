import { useState } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { Button, Input, Textarea } from '../../components/ui/index.jsx'
import { useClientAvatars, useContentPillars, useSeoKeywordSets } from '../../lib/hooks.js'
import * as DB from '../../lib/supabase.js'
import PostComposer from '../PostComposer/PostComposer.jsx'
import VideoStudio from '../VideoStudio/VideoStudio.jsx'
import GammaPresentations from '../GammaPresentations/GammaPresentations.jsx'

const MODES = [
  { id: 'post',          label: 'Post',          icon: '📱' },
  { id: 'blog',          label: 'Blog',          icon: '✍️' },
  { id: 'video',         label: 'Video',         icon: '🎬' },
  { id: 'presentation',  label: 'Presentation',  icon: '🎯' },
  { id: 'direct_mail',   label: 'Direct Mail',   icon: '✉️' },
]

export default function CreateTab() {
  const { pieceId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [mode, setMode] = useState('post')

  return (
    <div>
      {/* Mode selector */}
      <div style={{
        display: 'flex', gap: 6, marginBottom: 16,
        padding: '10px 14px', background: '#fff',
        border: '1px solid #e8e3de', borderRadius: 10,
        overflowX: 'auto',
      }}>
        {MODES.map(m => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            style={{
              padding: '8px 16px', borderRadius: 8, fontSize: '0.82rem',
              border: mode === m.id ? '2px solid var(--brown-dark)' : '2px solid transparent',
              background: mode === m.id ? '#faf8f5' : '#fff',
              color: 'var(--brown-dark)', cursor: 'pointer',
              fontWeight: mode === m.id ? 600 : 400,
              display: 'flex', alignItems: 'center', gap: 6,
              whiteSpace: 'nowrap', transition: 'all 0.15s ease',
            }}
          >
            <span>{m.icon}</span>
            {m.label}
          </button>
        ))}
        <button
          onClick={() => navigate('/content/inspo')}
          style={{
            padding: '8px 16px', borderRadius: 8, fontSize: '0.82rem',
            border: '2px solid transparent', background: '#fff',
            color: 'var(--brown-warm)', cursor: 'pointer', fontWeight: 500,
            display: 'flex', alignItems: 'center', gap: 6,
            whiteSpace: 'nowrap', transition: 'all 0.15s ease',
            marginLeft: 'auto',
          }}
        >
          <span>&#10024;</span>
          Inspo Library
        </button>
        <button
          onClick={() => navigate('/media')}
          style={{
            padding: '8px 16px', borderRadius: 8, fontSize: '0.82rem',
            border: '2px solid transparent', background: '#fff',
            color: 'var(--brown-warm)', cursor: 'pointer', fontWeight: 500,
            display: 'flex', alignItems: 'center', gap: 6,
            whiteSpace: 'nowrap', transition: 'all 0.15s ease',
          }}
        >
          <span>📷</span>
          Media Library
        </button>
      </div>

      {/* Active mode */}
      {mode === 'post' && <PostComposer />}
      {mode === 'blog' && <BlogMode />}
      {mode === 'video' && <VideoStudio />}
      {mode === 'presentation' && <GammaPresentations />}
      {mode === 'direct_mail' && <DirectMailMode />}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   BLOG MODE — long-form SEO editor
   ═══════════════════════════════════════════════════════════════════════════ */
function BlogMode() {
  const { data: avatars } = useClientAvatars()
  const { data: pillars } = useContentPillars()
  const { data: keywordSets } = useSeoKeywordSets()
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [seoKeyword, setSeoKeyword] = useState('')
  const [metaDesc, setMetaDesc] = useState('')
  const [keywordSetId, setKeywordSetId] = useState('')
  const [avatarId, setAvatarId] = useState('')
  const [framework, setFramework] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Inspo panel
  const [inspoOpen, setInspoOpen] = useState(false)
  const [inspoText, setInspoText] = useState('')
  const [inspoLoading, setInspoLoading] = useState(false)
  const [inspoResult, setInspoResult] = useState(null)

  const selectedSet = (keywordSets ?? []).find(k => k.id === keywordSetId)
  const setKeywords = selectedSet?.keywords || []

  async function aiWriteBlog() {
    if (aiLoading) return
    setAiLoading(true)
    try {
      const kws = setKeywords.length ? `\n\nSEO TARGET KEYWORDS: ${setKeywords.join(', ')}` : ''
      const result = await DB.generateContent({
        type: 'write',
        pillar: 'Real Estate Blog',
        prompt: `Write a long-form blog post${title ? ` titled "${title}"` : ' about real estate in the East Valley, AZ area'}. Include headings (##), actionable advice, and a strong conclusion with CTA.${kws}${seoKeyword ? `\nPrimary keyword: ${seoKeyword}` : ''}`,
        avatar_id: avatarId || undefined,
        framework: framework || undefined,
      })
      if (result.text) {
        // If Claude returns a title on the first line, split it
        const lines = result.text.split('\n')
        if (!title && lines[0]?.startsWith('#')) {
          setTitle(lines[0].replace(/^#+\s*/, ''))
          setBody(lines.slice(1).join('\n').trim())
        } else {
          setBody(result.text)
        }
      }
    } catch (err) { console.error(err) }
    finally { setAiLoading(false) }
  }

  async function handleInspoRecreate() {
    if (inspoLoading || !inspoText.trim()) return
    setInspoLoading(true)
    setInspoResult(null)
    try {
      const result = await DB.generateContent({
        type: 'recreate_inspo',
        prompt: inspoText,
        platform: 'blog',
        avatar_id: avatarId || undefined,
        framework: framework || undefined,
      })
      setInspoResult(result)
    } catch (err) { setInspoResult({ error: err.message }) }
    finally { setInspoLoading(false) }
  }

  async function saveDraft() {
    setSaving(true)
    try {
      await DB.createContentPiece({
        title: title || 'Untitled Blog',
        body_text: body,
        content_type: 'blog',
        content_date: new Date().toISOString().slice(0, 10),
        status: 'draft',
      })
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  async function saveToBank() {
    setSaving(true)
    try {
      await DB.createContentPiece({
        title: title || 'Untitled Blog',
        body_text: body,
        content_type: 'blog',
        content_date: new Date().toISOString().slice(0, 10),
        status: 'banked',
        banked_at: new Date().toISOString(),
      })
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  // SEO checklist
  const checks = [
    { check: !!title, label: 'Has a title' },
    { check: seoKeyword && title.toLowerCase().includes(seoKeyword.toLowerCase()), label: 'Keyword in title' },
    { check: body.length > 300, label: '300+ words' },
    { check: body.includes('##'), label: 'Has subheadings' },
    { check: metaDesc.length >= 50 && metaDesc.length <= 155, label: 'Meta desc 50-155 chars' },
    { check: seoKeyword && body.toLowerCase().includes(seoKeyword.toLowerCase()), label: 'Keyword in body' },
  ]
  const passCount = checks.filter(c => c.check).length

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
      <div>
        {/* AI bar */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          <Button size="sm" onClick={aiWriteBlog} disabled={aiLoading}>
            {aiLoading ? 'Writing...' : '✦ AI Write Blog'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setInspoOpen(true)}>
            ✨ Recreate Inspo
          </Button>
        </div>

        {/* Editor */}
        <div style={{
          background: '#fff', border: '1px solid #e8e3de', borderRadius: 12,
          padding: '20px', marginBottom: 16,
        }}>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Blog post title..."
            style={{
              width: '100%', border: 'none', fontSize: '1.3rem',
              fontFamily: 'var(--font-display)', fontWeight: 600,
              color: 'var(--brown-dark)', marginBottom: 12, outline: 'none',
              background: 'transparent',
            }}
          />
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Start writing your blog post... Use markdown for headings (## Heading), bold (**bold**), and lists (- item)."
            style={{
              width: '100%', minHeight: 400, border: 'none', resize: 'vertical',
              fontSize: '0.92rem', lineHeight: 1.8, color: 'var(--brown-dark)',
              fontFamily: 'var(--font-body)', outline: 'none', background: 'transparent',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <Button size="sm" variant="ghost" onClick={saveDraft} disabled={saving}>Save Draft</Button>
          <Button size="sm" variant="ghost" onClick={saveToBank} disabled={saving} style={{ color: 'var(--brown-warm)' }}>Save to Bank</Button>
        </div>
      </div>

      {/* SEO sidebar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Targeting */}
        <div style={{ background: '#fff', border: '1px solid #e8e3de', borderRadius: 12, padding: '14px 16px' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', color: 'var(--brown-dark)', margin: '0 0 10px' }}>Targeting</h3>
          <div style={{ marginBottom: 8 }}>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)', marginBottom: 3 }}>Avatar</label>
            <select value={avatarId} onChange={e => setAvatarId(e.target.value)} style={{ width: '100%', padding: '6px 8px', border: '1px solid #e0dbd6', borderRadius: 6, fontSize: '0.82rem' }}>
              <option value="">All audiences</option>
              {(avatars ?? []).map(a => <option key={a.id} value={a.id}>{a.name} ({a.type})</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)', marginBottom: 3 }}>Framework</label>
            <select value={framework} onChange={e => setFramework(e.target.value)} style={{ width: '100%', padding: '6px 8px', border: '1px solid #e0dbd6', borderRadius: 6, fontSize: '0.82rem' }}>
              <option value="">Auto</option>
              <option value="aida">AIDA (Top of Funnel)</option>
              <option value="pastor">PASTOR (Mid Funnel)</option>
              <option value="pas">PAS</option>
              <option value="bab">BAB</option>
              <option value="4ps">4Ps</option>
              <option value="storybrand">StoryBrand</option>
              <option value="fab">FAB</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)', marginBottom: 3 }}>Keyword Set</label>
            <select value={keywordSetId} onChange={e => setKeywordSetId(e.target.value)} style={{ width: '100%', padding: '6px 8px', border: '1px solid #e0dbd6', borderRadius: 6, fontSize: '0.82rem' }}>
              <option value="">None</option>
              {(keywordSets ?? []).map(ks => <option key={ks.id} value={ks.id}>{ks.name}</option>)}
            </select>
            {setKeywords.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 4 }}>
                {setKeywords.slice(0, 5).map((kw, i) => (
                  <span key={i} style={{ padding: '1px 6px', borderRadius: 3, fontSize: '0.62rem', background: '#edf4ee', color: 'var(--sage-green)' }}>{kw}</span>
                ))}
                {setKeywords.length > 5 && <span style={{ fontSize: '0.62rem', color: 'var(--color-text-muted)' }}>+{setKeywords.length - 5}</span>}
              </div>
            )}
          </div>
        </div>

        {/* SEO settings */}
        <div style={{ background: '#fff', border: '1px solid #e8e3de', borderRadius: 12, padding: '14px 16px' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', color: 'var(--brown-dark)', margin: '0 0 10px' }}>SEO</h3>
          <div style={{ marginBottom: 8 }}>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)', marginBottom: 3 }}>Target Keyword</label>
            <input value={seoKeyword} onChange={e => setSeoKeyword(e.target.value)} placeholder="homes for sale Gilbert AZ" style={{ width: '100%', padding: '6px 8px', border: '1px solid #e0dbd6', borderRadius: 6, fontSize: '0.82rem' }} />
          </div>
          <div style={{ marginBottom: 8 }}>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)', marginBottom: 3 }}>Meta Description</label>
            <textarea value={metaDesc} onChange={e => setMetaDesc(e.target.value)} placeholder="155 chars max" rows={2} style={{ width: '100%', padding: '6px 8px', border: '1px solid #e0dbd6', borderRadius: 6, fontSize: '0.82rem', resize: 'vertical' }} />
            <div style={{ fontSize: '0.65rem', color: metaDesc.length > 155 ? '#c5221f' : 'var(--color-text-muted)', marginTop: 1 }}>{metaDesc.length}/155</div>
          </div>

          {/* Checklist */}
          <div style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)', marginBottom: 4, marginTop: 8 }}>
            SEO Score: {passCount}/{checks.length}
          </div>
          <div style={{ height: 4, background: '#e8e3de', borderRadius: 2, marginBottom: 6 }}>
            <div style={{ width: `${(passCount / checks.length) * 100}%`, height: '100%', background: passCount >= 4 ? 'var(--sage-green)' : passCount >= 2 ? '#c99a2e' : '#c5221f', borderRadius: 2, transition: 'width 0.3s' }} />
          </div>
          {checks.map((c, i) => (
            <div key={i} style={{ display: 'flex', gap: 5, alignItems: 'center', fontSize: '0.72rem', marginBottom: 3 }}>
              <span style={{ color: c.check ? 'var(--sage-green)' : '#c5221f' }}>{c.check ? '✓' : '✗'}</span>
              <span style={{ color: c.check ? 'var(--brown-dark)' : 'var(--color-text-muted)' }}>{c.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Inspo panel */}
      {inspoOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(58,42,30,0.3)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'flex-end' }}
          onClick={() => setInspoOpen(false)}>
          <div style={{ width: 480, maxWidth: '90vw', height: '100%', background: '#fff', padding: 24, overflowY: 'auto', boxShadow: '-8px 0 32px rgba(58,42,30,0.12)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--brown-dark)', margin: 0 }}>Recreate Inspo for Blog</h3>
              <button onClick={() => setInspoOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>&times;</button>
            </div>
            <textarea value={inspoText} onChange={e => setInspoText(e.target.value)} placeholder="Paste the blog post or article you want to recreate..." rows={6} style={{ width: '100%', padding: '10px', border: '1px solid #e0dbd6', borderRadius: 8, fontSize: '0.85rem', marginBottom: 12 }} />
            <Button size="sm" onClick={handleInspoRecreate} disabled={inspoLoading || !inspoText.trim()}>
              {inspoLoading ? 'Analyzing...' : '✨ Recreate for Blog'}
            </Button>
            {inspoResult?.recreated_text && (
              <div style={{ marginTop: 14 }}>
                <div style={{ padding: '10px 14px', background: '#edf4ee', borderRadius: 8, fontSize: '0.85rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: 8 }}>
                  {inspoResult.recreated_text}
                </div>
                <Button size="sm" onClick={() => { setBody(inspoResult.recreated_text); setInspoOpen(false) }}>Use This</Button>
              </div>
            )}
            {inspoResult?.error && (
              <div style={{ marginTop: 10, padding: '8px 12px', background: '#fce8e6', borderRadius: 8, color: '#c5221f', fontSize: '0.82rem' }}>{inspoResult.error}</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   DIRECT MAIL MODE
   ═══════════════════════════════════════════════════════════════════════════ */
function DirectMailMode() {
  const { data: avatars } = useClientAvatars()
  const navigate = useNavigate()

  const [mailType, setMailType] = useState('postcard')
  const [headline, setHeadline] = useState('')
  const [body, setBody] = useState('')
  const [cta, setCta] = useState('')
  const [avatarId, setAvatarId] = useState('')
  const [framework, setFramework] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Inspo
  const [inspoOpen, setInspoOpen] = useState(false)
  const [inspoText, setInspoText] = useState('')
  const [inspoLoading, setInspoLoading] = useState(false)
  const [inspoResult, setInspoResult] = useState(null)

  const FRAMEWORK_HINTS = {
    postcard: { fw: 'BAB or 4Ps', tip: 'Postcards are scannable — 3 seconds max. Lead with a bold stat or transformation. One image, one CTA. Keep body under 75 words.' },
    letter: { fw: 'PASTOR', tip: 'Letters give you room for story + proof. Open with the problem, share a client success story, paint the transformation, make your offer.' },
    expired_letter: { fw: 'PAS', tip: 'Lead with the pain — their listing expired. Agitate — every day it sat, buyers assumed something was wrong. Solution — you fix both pricing and marketing.' },
    farming_piece: { fw: 'BAB', tip: 'Show the transformation. "Before: 97 days. After: Under contract in 9 days." Include a recent sold stat from the neighborhood.' },
  }

  const hint = FRAMEWORK_HINTS[mailType] || FRAMEWORK_HINTS.postcard

  async function aiWriteMail() {
    if (aiLoading) return
    setAiLoading(true)
    try {
      const result = await DB.generateContent({
        type: 'write',
        pillar: 'Direct Mail',
        prompt: `Write a ${mailType.replace(/_/g, ' ')} for a real estate agent.${headline ? ` Headline: "${headline}"` : ''} ${cta ? `CTA: "${cta}"` : ''}\n\nKeep it ${mailType === 'postcard' ? 'under 75 words' : mailType === 'letter' ? 'under 300 words' : 'concise and direct'}.`,
        avatar_id: avatarId || undefined,
        framework: framework || hint.fw.split(' ')[0].toLowerCase(),
      })
      if (result.text) {
        const lines = result.text.split('\n').filter(l => l.trim())
        if (!headline && lines.length > 1) {
          setHeadline(lines[0].replace(/^[#*]+\s*/, ''))
          setBody(lines.slice(1).join('\n'))
        } else {
          setBody(result.text)
        }
      }
    } catch (e) { console.error(e) }
    finally { setAiLoading(false) }
  }

  async function handleInspoRecreate() {
    if (inspoLoading || !inspoText.trim()) return
    setInspoLoading(true)
    setInspoResult(null)
    try {
      const result = await DB.generateContent({
        type: 'recreate_inspo',
        prompt: inspoText,
        platform: 'direct_mail',
        avatar_id: avatarId || undefined,
        framework: framework || hint.fw.split(' ')[0].toLowerCase(),
      })
      setInspoResult(result)
    } catch (err) { setInspoResult({ error: err.message }) }
    finally { setInspoLoading(false) }
  }

  async function saveToBank() {
    setSaving(true)
    try {
      await DB.createContentPiece({
        title: headline || 'Untitled Direct Mail',
        body_text: `${headline}\n\n${body}\n\n${cta}`,
        content_type: 'direct_mail',
        content_date: new Date().toISOString().slice(0, 10),
        status: 'banked',
        banked_at: new Date().toISOString(),
        notes: mailType,
      })
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
      <div>
        {/* AI bar */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          <Button size="sm" onClick={aiWriteMail} disabled={aiLoading}>
            {aiLoading ? 'Writing...' : `✦ AI Write ${mailType.replace(/_/g, ' ')}`}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setInspoOpen(true)}>
            ✨ Recreate Inspo
          </Button>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e8e3de', borderRadius: 12, padding: '20px' }}>
          {/* Mail type tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            {['postcard', 'letter', 'expired_letter', 'farming_piece'].map(t => (
              <button
                key={t}
                onClick={() => setMailType(t)}
                style={{
                  padding: '6px 12px', borderRadius: 6, fontSize: '0.78rem',
                  border: mailType === t ? '2px solid var(--brown-dark)' : '1px solid #e0dbd6',
                  background: mailType === t ? '#faf8f5' : '#fff',
                  color: 'var(--brown-dark)', cursor: 'pointer',
                  fontWeight: mailType === t ? 600 : 400, textTransform: 'capitalize',
                }}
              >
                {t.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)', marginBottom: 4 }}>Headline</label>
            <input value={headline} onChange={e => setHeadline(e.target.value)} placeholder={mailType === 'expired_letter' ? "Your listing expired. Here's why." : 'Thinking about selling?'} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e0dbd6', borderRadius: 6, fontSize: '0.95rem', fontWeight: 600 }} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)', marginBottom: 4 }}>Body Copy</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Write your direct mail copy..." rows={mailType === 'postcard' ? 5 : 10} style={{ width: '100%', padding: '8px 10px', border: '1px solid #e0dbd6', borderRadius: 6, fontSize: '0.88rem', lineHeight: 1.7, resize: 'vertical' }} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)', marginBottom: 4 }}>Call to Action</label>
            <input value={cta} onChange={e => setCta(e.target.value)} placeholder="Call Dana: 480.818.7554" style={{ width: '100%', padding: '8px 10px', border: '1px solid #e0dbd6', borderRadius: 6, fontSize: '0.88rem' }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button size="sm" variant="ghost" onClick={saveToBank} disabled={saving} style={{ color: 'var(--brown-warm)' }}>Save to Bank</Button>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ background: '#fff', border: '1px solid #e8e3de', borderRadius: 12, padding: '14px 16px' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', color: 'var(--brown-dark)', margin: '0 0 10px' }}>Targeting</h3>
          <div style={{ marginBottom: 8 }}>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)', marginBottom: 3 }}>Avatar</label>
            <select value={avatarId} onChange={e => setAvatarId(e.target.value)} style={{ width: '100%', padding: '6px 8px', border: '1px solid #e0dbd6', borderRadius: 6, fontSize: '0.82rem' }}>
              <option value="">All audiences</option>
              {(avatars ?? []).map(a => <option key={a.id} value={a.id}>{a.name} ({a.type})</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)', marginBottom: 3 }}>Framework</label>
            <select value={framework} onChange={e => setFramework(e.target.value)} style={{ width: '100%', padding: '6px 8px', border: '1px solid #e0dbd6', borderRadius: 6, fontSize: '0.82rem' }}>
              <option value="">Auto ({hint.fw})</option>
              <option value="pas">PAS</option>
              <option value="pastor">PASTOR</option>
              <option value="bab">BAB</option>
              <option value="4ps">4Ps</option>
              <option value="fab">FAB</option>
            </select>
          </div>
        </div>

        <div style={{ background: '#faf8f5', border: '1px solid #e8e3de', borderRadius: 12, padding: '14px 16px' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', color: 'var(--brown-dark)', margin: '0 0 6px' }}>
            {mailType.replace(/_/g, ' ')} Tips
          </h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', lineHeight: 1.7, margin: 0 }}>
            <strong>Recommended:</strong> {hint.fw}<br /><br />
            {hint.tip}
          </p>
        </div>
      </div>

      {/* Inspo panel */}
      {inspoOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(58,42,30,0.3)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'flex-end' }}
          onClick={() => setInspoOpen(false)}>
          <div style={{ width: 480, maxWidth: '90vw', height: '100%', background: '#fff', padding: 24, overflowY: 'auto', boxShadow: '-8px 0 32px rgba(58,42,30,0.12)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--brown-dark)', margin: 0 }}>Recreate Inspo for Direct Mail</h3>
              <button onClick={() => setInspoOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>&times;</button>
            </div>
            <textarea value={inspoText} onChange={e => setInspoText(e.target.value)} placeholder="Paste a mailer, letter, or postcard copy you want to recreate..." rows={6} style={{ width: '100%', padding: '10px', border: '1px solid #e0dbd6', borderRadius: 8, fontSize: '0.85rem', marginBottom: 12 }} />
            <Button size="sm" onClick={handleInspoRecreate} disabled={inspoLoading || !inspoText.trim()}>
              {inspoLoading ? 'Analyzing...' : '✨ Recreate'}
            </Button>
            {inspoResult?.recreated_text && (
              <div style={{ marginTop: 14 }}>
                <div style={{ padding: '10px 14px', background: '#edf4ee', borderRadius: 8, fontSize: '0.85rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: 8 }}>{inspoResult.recreated_text}</div>
                <Button size="sm" onClick={() => { setBody(inspoResult.recreated_text); setInspoOpen(false) }}>Use This</Button>
              </div>
            )}
            {inspoResult?.error && (
              <div style={{ marginTop: 10, padding: '8px 12px', background: '#fce8e6', borderRadius: 8, color: '#c5221f', fontSize: '0.82rem' }}>{inspoResult.error}</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
