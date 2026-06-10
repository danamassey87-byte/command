import {z} from 'zod';

export const ListingTourSchema = z.object({
  // Identity
  listing_id: z.string().uuid(),
  property_id: z.string().uuid(),

  // Headline data
  address_line1: z.string(),
  address_line2: z.string(),       // "Mesa, AZ 85212"
  price_label: z.string(),         // "$650,000" or "$650K"
  beds: z.number(),
  baths: z.number(),
  sqft: z.number(),
  neighborhood: z.string(),         // "Eastmark · Innovation Park"

  // Hook
  hook_line: z.string(),            // displayed on cold open + thumbnail

  // Per-scene data
  scenes: z.array(z.object({
    id: z.string(),                 // matches a VO segment id
    label: z.string(),              // chapter label
    duration_seconds: z.number(),
    emptyUrl: z.string().url().optional(),
    stagedUrl: z.string().url(),
    voUrl: z.string().url(),
    kenBurnsZoom: z.tuple([z.number(), z.number()]).default([1.0, 1.05]),
  })),

  // Music
  musicUrl: z.string().url().optional(),

  // Aerial / b-roll (optional, used in cold open + close)
  aerialDuskUrl: z.string().url().optional(),
});

export type ListingTourProps = z.infer<typeof ListingTourSchema>;

export const ThumbnailSchema = z.object({
  headline:    z.string(),
  sub_tag:     z.string(),
  hero_url:    z.string().url(),
  price_label: z.string(),
});
export type ThumbnailProps = z.infer<typeof ThumbnailSchema>;
