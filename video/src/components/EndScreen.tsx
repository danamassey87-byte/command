import {AbsoluteFill, Audio, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {BRAND} from '../lib/brand';
import {LogoOverlay} from './LogoOverlay';

type Props = {
  voUrl?: string;
};

export const EndScreen: React.FC<Props> = ({voUrl}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const fadeIn = interpolate(frame, [0, fps * 0.8], [0, 1], {extrapolateRight: 'clamp'});

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BRAND.colors.espresso,
        opacity: fadeIn,
        color: BRAND.colors.linen,
        fontFamily: BRAND.fonts.primary,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 120,
        gap: 60,
      }}
    >
      <div
        style={{
          fontFamily: BRAND.fonts.accent,
          fontSize: 90,
          color: BRAND.colors.tan,
          lineHeight: 1.1,
        }}
      >
        Want to see it in person?
      </div>

      <div style={{fontSize: 42, fontWeight: 600}}>
        Tour link below · Subscribe for weekly East Valley tours
      </div>

      <div
        style={{
          marginTop: 40,
          fontSize: 26,
          color: BRAND.colors.warmStone,
          textAlign: 'center',
          lineHeight: 1.5,
        }}
      >
        <div>{BRAND.agent.name} · {BRAND.agent.brokerage}</div>
        <div>{BRAND.agent.phone} · {BRAND.agent.email}</div>
        <div>{BRAND.agent.website}</div>
      </div>

      <LogoOverlay
        realCorner="tr"
        danaCorner="tl"
        realVariant="white"
        danaVariant="light"
        height={72}
      />
      {voUrl && <Audio src={voUrl} />}
    </AbsoluteFill>
  );
};
