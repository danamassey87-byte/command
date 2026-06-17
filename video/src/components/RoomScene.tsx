import {AbsoluteFill, Audio, Img, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';

type Props = {
  emptyUrl?: string;
  stagedUrl: string;
  voUrl: string;
  zoomFrom?: number;       // default 1.0
  zoomTo?: number;         // default 1.05
  crossfadeSeconds?: number; // default 1.0
  emptyHoldSeconds?: number; // default 2.5 — fixed beat on the empty photo
};

/**
 * RoomScene
 * - Holds on `emptyUrl` while panning slowly (3% Ken Burns)
 * - Crossfades to `stagedUrl` with a warm color/light overlay
 * - Continues the slow Ken Burns on the staged frame
 *
 * If `emptyUrl` is omitted, renders the staged frame only with slow Ken Burns
 * (used for rooms that have no empty MLS sibling).
 */
export const RoomScene: React.FC<Props> = ({
  emptyUrl,
  stagedUrl,
  voUrl,
  zoomFrom = 1.0,
  zoomTo = 1.05,
  crossfadeSeconds = 1.0,
  emptyHoldSeconds = 2.5,
}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();

  // Total scene length is set by parent Sequence durationInFrames.
  const total = durationInFrames;
  const crossfadeFrames = Math.round(crossfadeSeconds * fps);

  // Empty room holds a short FIXED beat (~2.5s), then crossfades into staged
  // for the rest of the scene. This replaces the old "30% of scene duration"
  // rule, which made long scenes (e.g. the 35s backyard) sit on the empty
  // photo for 10s+ and felt glacial. Capped at 40% of the scene so it can
  // never swallow a short scene or leave no room for the crossfade.
  const emptyHoldFrames = Math.min(
    Math.round(emptyHoldSeconds * fps),
    Math.round(total * 0.4),
  );
  const crossfadeStart = emptyHoldFrames;
  const crossfadeEnd = emptyHoldFrames + crossfadeFrames;

  const stagedOpacity = emptyUrl
    ? interpolate(frame, [crossfadeStart, crossfadeEnd], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})
    : 1;

  // Ken Burns: continuous slow zoom over the whole scene.
  const zoom = interpolate(frame, [0, total], [zoomFrom, zoomTo], {extrapolateRight: 'clamp'});

  // Warm overlay ramps in alongside staged crossfade. Keeps "cozy/homey" feel.
  const warmOverlayOpacity = emptyUrl
    ? interpolate(frame, [crossfadeStart, crossfadeEnd], [0, 0.18], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})
    : 0.12;

  const imgStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transform: `scale(${zoom})`,
    transformOrigin: 'center center',
    willChange: 'transform, opacity',
  };

  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      {emptyUrl && (
        <Img src={emptyUrl} style={imgStyle} />
      )}
      <Img src={stagedUrl} style={{...imgStyle, opacity: stagedOpacity}} />

      {/* Warm cinematic overlay — ramp up as the room "comes alive" */}
      <AbsoluteFill
        style={{
          background: 'radial-gradient(ellipse at 50% 55%, rgba(255,170,90,0.28) 0%, rgba(40,20,10,0.0) 60%)',
          mixBlendMode: 'soft-light',
          opacity: warmOverlayOpacity,
          pointerEvents: 'none',
        }}
      />
      {/* Bottom vignette for legibility under lower-thirds */}
      <AbsoluteFill
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 35%)',
          pointerEvents: 'none',
        }}
      />

      <Audio src={voUrl} />
    </AbsoluteFill>
  );
};
