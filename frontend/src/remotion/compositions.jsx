/**
 * Remotion Video Compositions — reusable templates for Dana Massey RE
 *
 * Each composition is a React component that Remotion renders frame-by-frame
 * into an MP4. The <Player> component previews them in-browser; the CLI
 * renders them server-side for export.
 */
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Img, Sequence } from 'remotion'

/* ─── Brand tokens (matches index.css) ─── */
const BRAND = {
  espresso:   '#3A2A1E',
  warmBrown:  '#5A4136',
  camel:      '#B79782',
  warmStone:  '#C8C3B9',
  cream:      '#EFEDE8',
  sage:       '#8B9A7B',
  white:      '#FFFFFF',
  fontDisplay: "'Cormorant Garamond', Georgia, serif",
  fontBody:    "'Nunito Sans', system-ui, sans-serif",
}

/* ─── Helper: animated text that fades + slides in ─── */
function AnimatedText({ children, delay = 0, style = {} }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const opacity = interpolate(frame - delay, [0, fps * 0.4], [0, 1], { extrapolateRight: 'clamp' })
  const y = interpolate(frame - delay, [0, fps * 0.4], [30, 0], { extrapolateRight: 'clamp' })

  return (
    <div style={{ opacity, transform: `translateY(${y}px)`, ...style }}>
      {children}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   1. JUST LISTED / JUST SOLD — the hero listing video
   Props: address, price, beds, baths, sqft, photoUrl, type ('listed'|'sold'), agentName
   ═══════════════════════════════════════════════════════════════════════════ */
export function ListingVideo({
  address = '1234 E Main St, Gilbert AZ',
  price = '$525,000',
  beds = '4',
  baths = '3',
  sqft = '2,100',
  photoUrl = '',
  type = 'listed',
  agentName = 'Dana Massey',
}) {
  const frame = useCurrentFrame()
  const { fps, durationInFrames } = useVideoConfig()

  const scale = interpolate(frame, [0, fps * 2], [1.1, 1], { extrapolateRight: 'clamp' })
  const overlayOpacity = interpolate(frame, [0, fps * 0.5], [0, 0.55], { extrapolateRight: 'clamp' })
  const badgeScale = spring({ frame: frame - fps * 0.3, fps, config: { damping: 12 } })

  const label = type === 'sold' ? 'JUST SOLD' : 'JUST LISTED'
  const labelColor = type === 'sold' ? BRAND.sage : BRAND.camel

  return (
    <AbsoluteFill style={{ background: BRAND.espresso }}>
      {/* Background photo with slow zoom */}
      {photoUrl && (
        <AbsoluteFill>
          <Img src={photoUrl} style={{
            width: '100%', height: '100%', objectFit: 'cover',
            transform: `scale(${scale})`,
          }} />
        </AbsoluteFill>
      )}

      {/* Dark overlay */}
      <AbsoluteFill style={{ background: `rgba(58, 42, 30, ${overlayOpacity})` }} />

      {/* Content */}
      <AbsoluteFill style={{
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        alignItems: 'center', padding: 60, textAlign: 'center',
      }}>
        {/* Badge */}
        <Sequence from={Math.floor(fps * 0.3)}>
          <div style={{
            background: labelColor, color: BRAND.white,
            padding: '10px 28px', fontSize: 18, fontWeight: 700,
            letterSpacing: 4, textTransform: 'uppercase',
            fontFamily: BRAND.fontBody,
            transform: `scale(${badgeScale})`,
            marginBottom: 24,
          }}>
            {label}
          </div>
        </Sequence>

        {/* Address */}
        <AnimatedText delay={fps * 0.6} style={{
          fontFamily: BRAND.fontDisplay, fontSize: 52, fontWeight: 700,
          color: BRAND.white, lineHeight: 1.1, marginBottom: 16,
          textShadow: '0 2px 20px rgba(0,0,0,0.4)',
        }}>
          {address}
        </AnimatedText>

        {/* Price */}
        <AnimatedText delay={fps * 0.9} style={{
          fontFamily: BRAND.fontDisplay, fontSize: 44, fontWeight: 600,
          color: BRAND.camel, marginBottom: 20,
        }}>
          {price}
        </AnimatedText>

        {/* Specs */}
        <AnimatedText delay={fps * 1.2} style={{
          fontFamily: BRAND.fontBody, fontSize: 20, fontWeight: 400,
          color: BRAND.warmStone, letterSpacing: 2,
        }}>
          {beds} BED &nbsp;·&nbsp; {baths} BATH &nbsp;·&nbsp; {sqft} SQFT
        </AnimatedText>

        {/* Agent */}
        <Sequence from={Math.floor(fps * 2)}>
          <AnimatedText delay={fps * 2} style={{
            fontFamily: BRAND.fontBody, fontSize: 16, fontWeight: 500,
            color: BRAND.camel, letterSpacing: 3, textTransform: 'uppercase',
            marginTop: 40, opacity: 0.9,
          }}>
            {agentName} &nbsp;·&nbsp; REAL Broker
          </AnimatedText>
        </Sequence>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   2. MARKET STATS — animated stat counter video
   Props: stats [{label, value, prefix?, suffix?}], title, subtitle
   ═══════════════════════════════════════════════════════════════════════════ */
export function MarketStatsVideo({
  title = 'East Valley Market Update',
  subtitle = 'April 2026',
  stats = [
    { label: 'Median Price', value: 485000, prefix: '$', suffix: '' },
    { label: 'Avg Days on Market', value: 28, prefix: '', suffix: ' days' },
    { label: 'Active Listings', value: 1240, prefix: '', suffix: '' },
    { label: 'Month-over-Month', value: 3.2, prefix: '+', suffix: '%' },
  ],
}) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  return (
    <AbsoluteFill style={{
      background: `linear-gradient(135deg, ${BRAND.espresso} 0%, ${BRAND.warmBrown} 100%)`,
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
      alignItems: 'center', padding: 60,
    }}>
      {/* Title */}
      <AnimatedText delay={0} style={{
        fontFamily: BRAND.fontDisplay, fontSize: 44, fontWeight: 700,
        color: BRAND.white, marginBottom: 6, textAlign: 'center',
      }}>
        {title}
      </AnimatedText>

      <AnimatedText delay={fps * 0.3} style={{
        fontFamily: BRAND.fontBody, fontSize: 16, fontWeight: 500,
        color: BRAND.camel, letterSpacing: 3, textTransform: 'uppercase',
        marginBottom: 50,
      }}>
        {subtitle}
      </AnimatedText>

      {/* Stats grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 30,
        width: '100%', maxWidth: 700,
      }}>
        {stats.map((stat, i) => {
          const staggerDelay = fps * (0.6 + i * 0.4)
          const progress = interpolate(frame - staggerDelay, [0, fps * 0.8], [0, 1], {
            extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
          })
          const displayValue = typeof stat.value === 'number'
            ? Math.round(stat.value * progress).toLocaleString()
            : stat.value

          return (
            <AnimatedText key={i} delay={staggerDelay} style={{
              background: 'rgba(255,255,255,0.06)',
              borderLeft: `3px solid ${BRAND.camel}`,
              padding: '20px 24px', borderRadius: 4,
            }}>
              <div style={{
                fontFamily: BRAND.fontDisplay, fontSize: 40, fontWeight: 700,
                color: BRAND.white, lineHeight: 1,
              }}>
                {stat.prefix || ''}{displayValue}{stat.suffix || ''}
              </div>
              <div style={{
                fontFamily: BRAND.fontBody, fontSize: 13, fontWeight: 500,
                color: BRAND.warmStone, marginTop: 6, letterSpacing: 1,
                textTransform: 'uppercase',
              }}>
                {stat.label}
              </div>
            </AnimatedText>
          )
        })}
      </div>

      {/* Footer */}
      <Sequence from={Math.floor(fps * 3)}>
        <AnimatedText delay={fps * 3} style={{
          fontFamily: BRAND.fontBody, fontSize: 14, color: BRAND.camel,
          letterSpacing: 2, textTransform: 'uppercase', marginTop: 40,
        }}>
          Dana Massey · REAL Broker · East Valley AZ
        </AnimatedText>
      </Sequence>
    </AbsoluteFill>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   3. TESTIMONIAL — client quote video
   Props: quote, clientName, result, photoUrl
   ═══════════════════════════════════════════════════════════════════════════ */
export function TestimonialVideo({
  quote = '"Dana made the entire process seamless. We closed in 22 days and got exactly what we wanted."',
  clientName = 'The Johnson Family',
  result = 'Closed in 22 days at 99% of asking',
  photoUrl = '',
}) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  return (
    <AbsoluteFill style={{ background: BRAND.cream }}>
      {/* Accent circle */}
      <div style={{
        position: 'absolute', top: -80, right: -80,
        width: 300, height: 300, borderRadius: '50%',
        background: BRAND.sage, opacity: 0.12,
      }} />

      <AbsoluteFill style={{
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        alignItems: 'center', padding: 60, textAlign: 'center',
      }}>
        {/* Big quote mark */}
        <AnimatedText delay={0} style={{
          fontFamily: BRAND.fontDisplay, fontSize: 120, color: BRAND.camel,
          lineHeight: 0.5, opacity: 0.4, marginBottom: 20,
        }}>
          "
        </AnimatedText>

        {/* Quote text */}
        <AnimatedText delay={fps * 0.4} style={{
          fontFamily: BRAND.fontDisplay, fontSize: 32, fontWeight: 500,
          fontStyle: 'italic', color: BRAND.espresso,
          lineHeight: 1.5, maxWidth: 650, marginBottom: 30,
        }}>
          {quote}
        </AnimatedText>

        {/* Divider */}
        <AnimatedText delay={fps * 1} style={{
          width: 60, height: 2, background: BRAND.camel, marginBottom: 20,
        }}>
          <div />
        </AnimatedText>

        {/* Client name */}
        <AnimatedText delay={fps * 1.2} style={{
          fontFamily: BRAND.fontBody, fontSize: 16, fontWeight: 600,
          color: BRAND.warmBrown, letterSpacing: 2, textTransform: 'uppercase',
          marginBottom: 8,
        }}>
          {clientName}
        </AnimatedText>

        {/* Result badge */}
        <AnimatedText delay={fps * 1.5} style={{
          fontFamily: BRAND.fontBody, fontSize: 13, fontWeight: 500,
          color: BRAND.sage, background: '#edf4ee',
          padding: '6px 16px', borderRadius: 4,
        }}>
          {result}
        </AnimatedText>

        {/* Footer */}
        <Sequence from={Math.floor(fps * 2.5)}>
          <AnimatedText delay={fps * 2.5} style={{
            fontFamily: BRAND.fontBody, fontSize: 13, color: BRAND.camel,
            letterSpacing: 2, textTransform: 'uppercase', marginTop: 50,
          }}>
            Dana Massey · REAL Broker
          </AnimatedText>
        </Sequence>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}

/* ─── Template registry (used by VideoStudio page) ─── */
export const VIDEO_TEMPLATES = [
  {
    id: 'listing',
    name: 'Just Listed / Just Sold',
    description: 'Property showcase with photo, address, price, specs',
    component: ListingVideo,
    defaultProps: {
      address: '1234 E Main St, Gilbert AZ',
      price: '$525,000',
      beds: '4', baths: '3', sqft: '2,100',
      photoUrl: '', type: 'listed', agentName: 'Dana Massey',
    },
    durationInFrames: 150, // 5 seconds at 30fps
    fps: 30,
    width: 1080,
    height: 1080,
  },
  {
    id: 'market_stats',
    name: 'Market Stats',
    description: 'Animated stat counters for market updates',
    component: MarketStatsVideo,
    defaultProps: {
      title: 'East Valley Market Update',
      subtitle: 'April 2026',
      stats: [
        { label: 'Median Price', value: 485000, prefix: '$', suffix: '' },
        { label: 'Avg Days on Market', value: 28, prefix: '', suffix: ' days' },
        { label: 'Active Listings', value: 1240, prefix: '', suffix: '' },
        { label: 'Month-over-Month', value: 3.2, prefix: '+', suffix: '%' },
      ],
    },
    durationInFrames: 150,
    fps: 30,
    width: 1080,
    height: 1080,
  },
  {
    id: 'testimonial',
    name: 'Client Testimonial',
    description: 'Animated client quote with result badge',
    component: TestimonialVideo,
    defaultProps: {
      quote: '"Dana made the entire process seamless. We closed in 22 days and got exactly what we wanted."',
      clientName: 'The Johnson Family',
      result: 'Closed in 22 days at 99% of asking',
      photoUrl: '',
    },
    durationInFrames: 120,
    fps: 30,
    width: 1080,
    height: 1080,
  },
]
