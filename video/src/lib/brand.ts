// Dana's brand profile, mirrored from user_settings.brand_profile.
// Source of truth lives in Supabase; this file is the render-time cache.
export const BRAND = {
  colors: {
    espresso:    '#3A2A1E',
    secondary:   '#524136',
    tan:         '#B79782',
    sage:        '#8B9A7B',
    warmStone:   '#C8C3B9',
    linen:       '#EFEDE8',
    white:       '#FFFFFF',
    black:       '#000000',
  },
  fonts: {
    primary: 'Nunito Sans',
    accent:  'Halow Duo Script',
  },
  logos: {
    danaLight:  'https://lfydlxhfctuiyykuyqnr.supabase.co/storage/v1/object/public/brand-assets/logos/1775542408244-2hteza.png',
    danaDark:   'https://lfydlxhfctuiyykuyqnr.supabase.co/storage/v1/object/public/brand-assets/logos/1775542404653-ndzhvp.png',
    realWhite:  'https://lfydlxhfctuiyykuyqnr.supabase.co/storage/v1/object/public/brand-assets/logos/1775542416316-1mnlgj.png',
  },
  agent: {
    name:    'Dana Massey',
    title:   'REALTOR® | Pricing Strategy Advisor',
    phone:   '480.818.7554',
    email:   'dana@danamassey.com',
    website: 'danamassey.com',
    brokerage: 'REAL Broker',
  },
} as const;
