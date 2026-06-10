import {AbsoluteFill, Img} from 'remotion';
import {BRAND} from '../lib/brand';

type Props = {
  realCorner?: 'tl' | 'tr' | 'bl' | 'br';
  danaCorner?: 'tl' | 'tr' | 'bl' | 'br';
  realVariant?: 'white' | 'black';
  danaVariant?: 'light' | 'dark';
  opacity?: number;
  height?: number;
};

const corner = (which: Props['realCorner']): React.CSSProperties => {
  const pad = 60;
  switch (which) {
    case 'tl': return {top: pad, left: pad};
    case 'tr': return {top: pad, right: pad};
    case 'bl': return {bottom: pad, left: pad};
    case 'br': return {bottom: pad, right: pad};
    default:   return {};
  }
};

export const LogoOverlay: React.FC<Props> = ({
  realCorner = 'tl',
  danaCorner = 'br',
  realVariant = 'white',
  danaVariant = 'light',
  opacity = 0.95,
  height = 72,
}) => {
  const realSrc = realVariant === 'white' ? BRAND.logos.realWhite : BRAND.logos.realWhite;
  const danaSrc = danaVariant === 'light' ? BRAND.logos.danaLight : BRAND.logos.danaDark;

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <Img
        src={realSrc}
        style={{position: 'absolute', height, width: 'auto', opacity, ...corner(realCorner)}}
      />
      <Img
        src={danaSrc}
        style={{position: 'absolute', height, width: 'auto', opacity, ...corner(danaCorner)}}
      />
    </AbsoluteFill>
  );
};
