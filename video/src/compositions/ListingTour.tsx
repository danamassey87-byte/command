import {AbsoluteFill, Audio, Sequence, useVideoConfig} from 'remotion';
import {BrandCard} from '../components/BrandCard';
import {Chapter} from '../components/Chapter';
import {EndScreen} from '../components/EndScreen';
import {LogoOverlay} from '../components/LogoOverlay';
import {RoomScene} from '../components/RoomScene';
import {ListingTourProps} from '../lib/types';
import {BRAND} from '../lib/brand';

const sec = (n: number, fps: number) => Math.round(n * fps);

export const ListingTour: React.FC<ListingTourProps> = (props) => {
  const {fps} = useVideoConfig();

  // Find a scene by id (matches a VO segment slug).
  const sceneById = (id: string) => props.scenes.find((s) => s.id === id);

  // Helper to render a Sequence with a RoomScene + optional chapter lower-third.
  const renderScene = (
    id: string,
    startSec: number,
    durSec: number,
    chapterLabel?: string,
  ) => {
    const scene = sceneById(id);
    if (!scene) return null;
    return (
      <Sequence from={sec(startSec, fps)} durationInFrames={sec(durSec, fps)} key={id}>
        <RoomScene
          emptyUrl={scene.emptyUrl}
          stagedUrl={scene.stagedUrl}
          voUrl={scene.voUrl}
          zoomFrom={scene.kenBurnsZoom?.[0] ?? 1.0}
          zoomTo={scene.kenBurnsZoom?.[1] ?? 1.05}
        />
        {chapterLabel && (
          <Sequence durationInFrames={sec(5, fps)}>
            <Chapter label={chapterLabel} />
          </Sequence>
        )}
        <LogoOverlay realCorner="tr" danaCorner="bl" height={56} opacity={0.85} />
      </Sequence>
    );
  };

  return (
    <AbsoluteFill style={{backgroundColor: BRAND.colors.espresso}}>
      {/* Background music — ducked under VO in post or by mixing externally.
          For now we let Remotion mix at 100%. Replace with a music URL when ready. */}
      {props.musicUrl && <Audio src={props.musicUrl} volume={0.18} />}

      {/* 00:00-00:08 Cold open hook */}
      {renderScene('01_cold_open', 0, 8)}

      {/* 00:08-00:18 Title card */}
      <Sequence from={sec(8, fps)} durationInFrames={sec(10, fps)}>
        <BrandCard
          variant="open"
          addressLine1={props.address_line1}
          addressLine2={props.address_line2}
          priceLabel={props.price_label}
          beds={props.beds}
          baths={props.baths}
          sqft={props.sqft}
          neighborhood={props.neighborhood}
          hookLine={props.hook_line}
        />
        {/* Title-card VO plays on top of the card */}
        {sceneById('02_title') && <Audio src={sceneById('02_title')!.voUrl} />}
      </Sequence>

      {/* 00:18-00:38 Curb / exterior */}
      {renderScene('03_exterior', 18, 20, 'Curb Appeal')}

      {/* 00:38-01:05 Great room + dining */}
      {renderScene('04_greatroom', 38, 27, 'Great Room')}

      {/* 01:05-01:35 Kitchen */}
      {renderScene('05_kitchen', 65, 30, 'Chef’s Kitchen')}

      {/* 01:35-02:00 Primary suite */}
      {renderScene('06_primary', 95, 25, 'Primary Suite')}

      {/* 02:00-02:18 Secondary bedrooms */}
      {renderScene('07_secondary', 120, 18, 'Secondary Bedrooms')}

      {/* 02:18-02:30 Garage */}
      {renderScene('08_garage', 138, 12, '3-Car Tandem Garage')}

      {/* 02:30-03:05 Backyard money shot */}
      {renderScene('09_backyard', 150, 35, 'The $50K Backyard')}

      {/* 03:05-03:25 Eastmark community */}
      {renderScene('10_eastmark', 185, 20, 'Eastmark · Innovation Park')}

      {/* 03:25-03:45 End screen */}
      <Sequence from={sec(205, fps)} durationInFrames={sec(20, fps)}>
        <EndScreen voUrl={sceneById('11_close')?.voUrl} />
      </Sequence>
    </AbsoluteFill>
  );
};
