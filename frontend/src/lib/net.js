// ─── Frontend network helpers ────────────────────────────────────────────────
// M2 from SECURITY_AUDIT_PUNCHLIST: every frontend `fetch(...)` call needs a
// timeout, or a slow Meta / weather / Replicate / etc. API can hang the UI
// indefinitely. AbortSignal.timeout is standard since Chrome 103 / Firefox
// 100 / Safari 16; everyone Dana uses has it.
//
// Default: 15s. Tighten for cheap endpoints (5s for health checks); loosen
// for expensive ones (30s for image gen).

/** fetch() with a default timeout. */
export function fetchWithTimeout(url, opts = {}, ms = 15_000) {
  return fetch(url, {
    ...opts,
    signal: opts.signal ?? AbortSignal.timeout(ms),
  })
}

/** AbortError predicate — useful for distinguishing timeout from other errors. */
export function isTimeoutError(err) {
  return err?.name === 'TimeoutError' || err?.name === 'AbortError'
}
