import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {BRAND} from '../lib/brand';
import {LogoOverlay} from './LogoOverlay';

type Props = {
  variant?: 'open' | 'close';
  addressLine1: string;
  addressLine2: string;
  priceLabel: string;
  beds: number;
  baths: number;
  sqft: number;
  neighborhood: string;
  hookLine?: string;
};

export const BrandCard: React.FC<Props> = ({
  variant = 'open',
  addressLine1,
  addressLine2,
  priceLabel,
  beds,
  baths,
  sqft,
  neighborhood,
  hookLine,
}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();

  const fadeIn  = interpolate(frame, [0, fps * 0.6], [0, 1], {extrapolateRight: 'clamp'});
  const fadeOut = interpolate(frame, [durationInFrames - fps * 0.5, durationInFrames], [1, 0], {extrapolateLeft: 'clamp'});
  const opacity = Math.min(fadeIn, fadeOut);

  const rise = spring({frame, fps, config: {damping: 200}}) * 12;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BRAND.colors.espresso,
        fontFamily: BRAND.fonts.primary,
        opacity,
        color: BRAND.colors.linen,
        padding: 120,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      <div style={{transform: `translateY(-${rise}px)`, maxWidth: 1400}}>
        {hookLine && variant === 'open' && (
          <div
            style={{
              fontFamily: BRAND.fonts.accent,
              fontSize: 60,
              color: BRAND.colors.tan,
              marginBottom: 24,
              lineHeight: 1.1,
            }}
          >
            {hookLine}
          </div>
        )}

        <div
          style={{
            fontSize: 92,
            fontWeight: 700,
            letterSpacing: -1,
            lineHeight: 1.05,
            color: BRAND.colors.linen,
          }}
        >
          {addressLine1}
        </div>
        <div
          style={{
            fontSize: 38,
            fontWeight: 300,
            marginTop: 12,
            color: BRAND.colors.warmStone,
          }}
        >
          {addressLine2} · {neighborhood}
        </div>

        <div
          style={{
            marginTop: 60,
            display: 'flex',
            gap: 40,
            fontSize: 30,
            color: BRAND.colors.linen,
            letterSpacing: 1,
          }}
        >
          <span><strong>{beds}</strong> BD</span>
          <span style={{opacity: 0.4}}>·</span>
          <span><strong>{baths}</strong> BA</span>
          <span style={{opacity: 0.4}}>·</span>
          <span><strong>{sqft.toLocaleString()}</strong> SF</span>
          <span style={{opacity: 0.4}}>·</span>
          <span style={{color: BRAND.colors.tan, fontWeight: 700}}>{priceLabel}</span>
        </div>

        {variant === 'close' && (
          <div
            style={{
              marginTop: 80,
              fontSize: 26,
              color: BRAND.colors.warmStone,
              lineHeight: 1.5,
            }}
          >
            <div style={{fontSize: 32, color: BRAND.colors.linen, marginBottom: 8}}>{BRAND.agent.name}</div>
            <div>{BRAND.agent.title}</div>
            <div>{BRAND.agent.phone} · {BRAND.agent.email}</div>
            <div>{BRAND.agent.website}</div>
          </div>
        )}
      </div>

      <LogoOverlay
        realCorner="tr"
        danaCorner="bl"
        realVariant="white"
        danaVariant="light"
        height={84}
      />
    </AbsoluteFill>
  );
};
