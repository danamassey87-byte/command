import {AbsoluteFill, Img} from 'remotion';
import {BRAND} from '../lib/brand';
import {LogoOverlay} from '../components/LogoOverlay';
import {ThumbnailProps} from '../lib/types';

export const Thumbnail: React.FC<ThumbnailProps> = ({headline, sub_tag, hero_url, price_label}) => {
  return (
    <AbsoluteFill style={{backgroundColor: BRAND.colors.espresso, fontFamily: BRAND.fonts.primary}}>
      {/* Hero photo */}
      <AbsoluteFill>
        <Img
          src={hero_url}
          style={{width: '100%', height: '100%', objectFit: 'cover'}}
        />
      </AbsoluteFill>

      {/* Warm cinematic overlay — same vibe as the video */}
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse at 60% 55%, rgba(255,170,90,0.28) 0%, rgba(40,20,10,0.0) 65%)',
          mixBlendMode: 'soft-light',
        }}
      />

      {/* Bottom-up dark gradient for headline legibility */}
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.55) 28%, rgba(0,0,0,0) 65%)',
        }}
      />

      {/* Top-right price tag */}
      <div
        style={{
          position: 'absolute',
          top: 64,
          right: 64,
          padding: '20px 36px',
          backgroundColor: BRAND.colors.espresso,
          color: BRAND.colors.tan,
          fontSize: 52,
          fontWeight: 800,
          letterSpacing: 1,
          borderLeft: `8px solid ${BRAND.colors.tan}`,
        }}
      >
        {price_label}
      </div>

      {/* Headline — large, bold, accent-color emphasis on key words */}
      <div
        style={{
          position: 'absolute',
          left: 80,
          bottom: 160,
          right: 80,
          color: BRAND.colors.linen,
        }}
      >
        <div
          style={{
            fontSize: 96,
            fontWeight: 800,
            letterSpacing: -1,
            lineHeight: 1.0,
            textShadow: '0 4px 16px rgba(0,0,0,0.65)',
            maxWidth: 1100,
          }}
        >
          {headline}
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 30,
            color: BRAND.colors.tan,
            letterSpacing: 4,
            fontWeight: 700,
            textTransform: 'uppercase',
            textShadow: '0 2px 8px rgba(0,0,0,0.8)',
          }}
        >
          {sub_tag}
        </div>
      </div>

      <LogoOverlay
        realCorner="tl"
        danaCorner="br"
        realVariant="white"
        danaVariant="light"
        height={84}
      />
    </AbsoluteFill>
  );
};
