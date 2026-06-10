import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {BRAND} from '../lib/brand';

type Props = {label: string};

// Lower-third chapter title — gentle slide-in from the left, then dwell.
export const Chapter: React.FC<Props> = ({label}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();

  const slideIn = interpolate(frame, [0, fps * 0.6], [-40, 0], {extrapolateRight: 'clamp'});
  const opacityIn = interpolate(frame, [0, fps * 0.5], [0, 1], {extrapolateRight: 'clamp'});
  const opacityOut = interpolate(frame, [fps * 3.5, fps * 4.5], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const opacity = Math.min(opacityIn, opacityOut);

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div
        style={{
          position: 'absolute',
          left: 80,
          bottom: 100,
          opacity,
          transform: `translateX(${slideIn}px)`,
          fontFamily: BRAND.fonts.primary,
          color: BRAND.colors.linen,
        }}
      >
        <div
          style={{
            fontSize: 18,
            letterSpacing: 4,
            textTransform: 'uppercase',
            color: BRAND.colors.tan,
            marginBottom: 8,
          }}
        >
          Chapter
        </div>
        <div
          style={{
            fontSize: 42,
            fontWeight: 600,
            lineHeight: 1.1,
            textShadow: '0 2px 8px rgba(0,0,0,0.5)',
          }}
        >
          {label}
        </div>
      </div>
    </AbsoluteFill>
  );
};
