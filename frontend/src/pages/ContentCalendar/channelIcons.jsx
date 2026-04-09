// Brown-toned feather-style channel icons. Uses currentColor so parent CSS
// controls the stroke via var(--brown-mid) / var(--brown-dark).
//
// Size defaults to 16 so they slot neatly into calendar pills but can be bumped
// via the `size` prop for the detail panel.
const S = { strokeWidth: 1.8, fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round' }

export const CHANNEL_META = {
  instagram: { label: 'Instagram',   postUrl: 'https://www.instagram.com/' },
  facebook:  { label: 'Facebook',    postUrl: 'https://www.facebook.com/' },
  tiktok:    { label: 'TikTok',      postUrl: 'https://www.tiktok.com/upload' },
  youtube:   { label: 'YouTube',     postUrl: 'https://studio.youtube.com/' },
  linkedin:  { label: 'LinkedIn',    postUrl: 'https://www.linkedin.com/feed/' },
  pinterest: { label: 'Pinterest',   postUrl: 'https://www.pinterest.com/pin-builder/' },
  gmb:       { label: 'GMB',         postUrl: 'https://business.google.com/posts' },
  blog:      { label: 'Blog',        postUrl: null, internal: '/content/ai-studio' },
  email:     { label: 'Email',       postUrl: null, internal: '/email/builder' },
  twitter:   { label: 'Twitter/X',   postUrl: 'https://twitter.com/compose/tweet' },
  stories:   { label: 'Stories',     postUrl: 'https://www.instagram.com/' },
  threads:   { label: 'Threads',     postUrl: 'https://www.threads.net/' },
  nextdoor:  { label: 'Nextdoor',    postUrl: 'https://nextdoor.com/' },
}

export function channelMeta(key) {
  return CHANNEL_META[key] || { label: key || 'Post', postUrl: null }
}

export function ChannelIcon({ channel, size = 16, className = '' }) {
  const props = { width: size, height: size, viewBox: '0 0 24 24', className, ...S }
  switch (channel) {
    case 'instagram':
      return (
        <svg {...props}>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17" cy="7" r="0.6" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'stories':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="4.5" />
          <circle cx="12" cy="3" r="0.8" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'facebook':
      return (
        <svg {...props}>
          <path d="M15 3h-2a4 4 0 0 0-4 4v3H6v4h3v7h4v-7h3l1-4h-4V7a1 1 0 0 1 1-1h2z" />
        </svg>
      )
    case 'tiktok':
      return (
        <svg {...props}>
          <path d="M14 4v11.5a3.5 3.5 0 1 1-3.5-3.5" />
          <path d="M14 4c.5 2.5 2.5 4 5 4" />
        </svg>
      )
    case 'youtube':
      return (
        <svg {...props}>
          <rect x="2.5" y="6" width="19" height="12" rx="3" />
          <path d="M11 9.5l4 2.5-4 2.5z" fill="currentColor" stroke="currentColor" />
        </svg>
      )
    case 'linkedin':
      return (
        <svg {...props}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="8" y1="10" x2="8" y2="17" />
          <circle cx="8" cy="7" r="0.8" fill="currentColor" stroke="none" />
          <path d="M12 17v-4a2 2 0 0 1 4 0v4" />
          <line x1="12" y1="10" x2="12" y2="17" />
        </svg>
      )
    case 'pinterest':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M11 7h2a3 3 0 0 1 0 6h-1.5l-1 5" />
        </svg>
      )
    case 'gmb':
      return (
        <svg {...props}>
          <path d="M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
      )
    case 'blog':
      return (
        <svg {...props}>
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
          <polyline points="14 3 14 8 19 8" />
          <line x1="8" y1="13" x2="16" y2="13" />
          <line x1="8" y1="17" x2="14" y2="17" />
        </svg>
      )
    case 'email':
      return (
        <svg {...props}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <polyline points="3 7 12 13 21 7" />
        </svg>
      )
    case 'twitter':
      return (
        <svg {...props}>
          <path d="M4 4l7.5 9.5L4.5 20H7l6-6.5L17 20h3l-7.8-10L19.5 4H17L11.8 9.7 7 4z" />
        </svg>
      )
    case 'threads':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M9 9a3 3 0 0 1 6 0v2" />
          <path d="M15 11a3 3 0 1 1-3 3" />
        </svg>
      )
    case 'nextdoor':
      return (
        <svg {...props}>
          <path d="M3 21V9l9-6 9 6v12h-6v-7H9v7z" />
        </svg>
      )
    default:
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="8" />
        </svg>
      )
  }
}
