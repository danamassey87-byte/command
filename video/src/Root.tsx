import {Composition, registerRoot} from 'remotion';
import {ListingTour} from './compositions/ListingTour';
import {Thumbnail} from './compositions/Thumbnail';
import {ListingTourSchema, ThumbnailSchema, ListingTourProps, ThumbnailProps} from './lib/types';
import {fetchListing} from './lib/fetchListing';
import {BRAND} from './lib/brand';

// 1080p @ 30fps, 3:45 total.
const FPS = 30;
const TOTAL_SECONDS = 225;
const WIDTH = 1920;
const HEIGHT = 1080;

// Default props are used by Remotion Studio when no listing_id is passed.
// Production renders override these via `inputProps` (CLI flag) or `calculateMetadata`.
const DEFAULT_THEIA: ListingTourProps = {
  listing_id: 'be5ffee3-19b6-4ba8-bd8c-504d4debe78b',
  property_id: '56165498-a9dc-47cf-9404-25aaff5e15b8',
  address_line1: '9603 E Theia Dr',
  address_line2: 'Mesa, AZ 85212',
  price_label: '$650,000',
  beds: 4,
  baths: 3,
  sqft: 2429,
  neighborhood: 'Eastmark · Innovation Park',
  hook_line: 'Live outside nine months a year.',
  scenes: [],            // populated by calculateMetadata
  musicUrl: undefined,
  aerialDuskUrl: undefined,
};

const DEFAULT_THUMB: ThumbnailProps = {
  headline: 'Live Outside\n9 Months a Year',
  sub_tag: 'Eastmark · Mesa AZ',
  hero_url: 'https://cdn1.photos.sparkplatform.com/az/20260411222423623460000000.jpg',
  price_label: '$650K',
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ListingTour"
        component={ListingTour}
        durationInFrames={TOTAL_SECONDS * FPS}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        schema={ListingTourSchema}
        defaultProps={DEFAULT_THEIA}
        calculateMetadata={async ({props}) => {
          // Pull live data from Supabase when SUPABASE_URL is configured.
          // Falls back to passed-in defaultProps for local Studio preview.
          if (process.env.SUPABASE_URL || process.env.REMOTION_SUPABASE_URL) {
            const live = await fetchListing(props.listing_id);
            return {props: live};
          }
          return {props};
        }}
      />
      <Composition
        id="ListingTourThumbnail"
        component={Thumbnail}
        durationInFrames={1}
        fps={1}
        width={1280}
        height={720}
        schema={ThumbnailSchema}
        defaultProps={DEFAULT_THUMB}
      />
    </>
  );
};

registerRoot(RemotionRoot);
