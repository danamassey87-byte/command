import { useParams, useSearchParams } from 'react-router-dom'
import PostComposer from '../PostComposer/PostComposer.jsx'

/**
 * CreateTab — wraps the existing PostComposer for now.
 * Phase 2 will replace this with the unified multi-mode composer
 * (Post, Blog, Video, Presentation, Direct Mail).
 */
export default function CreateTab() {
  // Pass through pieceId and date params
  return <PostComposer />
}
