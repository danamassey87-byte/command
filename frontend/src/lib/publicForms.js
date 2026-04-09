import supabase from './supabase'

// ─── Public Intake Forms ─────────────────────────────────────────────────────
// Lets Dana publish a local form to Supabase so clients can fill it out via
// a shareable URL. Submissions come back into the same Supabase table and are
// merged into the responses list on the IntakeForms page.

/** Build a slug from a form's local id + type. */
export function buildSlug(form) {
  const shortId = form.id.replace(/-/g, '').slice(0, 8)
  return `${form.type}-${shortId}`
}

/** Build the public URL for a slug. */
export function publicFormUrl(slug) {
  return `${window.location.origin}/form/${slug}`
}

/** Publish (or re-publish) a local form to Supabase.
 *  Upserts on slug — re-publishing the same form updates its definition. */
export async function publishForm(form) {
  const slug = buildSlug(form)
  const payload = {
    slug,
    form_json: form,
    published: true,
  }

  // Upsert by slug
  const { data, error } = await supabase
    .from('public_forms')
    .upsert(payload, { onConflict: 'slug' })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return { id: data.id, slug, url: publicFormUrl(slug) }
}

/** Unpublish a form (slug becomes inaccessible to anon users). */
export async function unpublishForm(slug) {
  const { error } = await supabase
    .from('public_forms')
    .update({ published: false })
    .eq('slug', slug)
  if (error) throw new Error(error.message)
}

/** Anon-safe fetch by slug — used by the public /form/:slug page. */
export async function fetchPublicForm(slug) {
  const { data, error } = await supabase
    .from('public_forms')
    .select('id, slug, form_json, published')
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data // null if not found / not published
}

/** Anon-safe submit. */
export async function submitPublicForm({ formId, slug, clientName, data }) {
  const { error } = await supabase
    .from('public_form_submissions')
    .insert({
      form_id: formId,
      form_slug: slug,
      client_name: clientName || null,
      data: data || {},
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    })
  if (error) throw new Error(error.message)
}

/** Authed read — get all submissions across all forms. */
export async function fetchAllSubmissions() {
  const { data, error } = await supabase
    .from('public_form_submissions')
    .select(`
      id, form_id, form_slug, client_name, data, created_at,
      merged_contact_id, merged_at,
      merged_contact:contacts!merged_contact_id(id, name, email, phone, type)
    `)
    .order('created_at', { ascending: false })
  if (error) {
    // If merged_contact_id column doesn't exist yet, fall back to basic shape
    const { data: basic, error: basicErr } = await supabase
      .from('public_form_submissions')
      .select('id, form_id, form_slug, client_name, data, created_at')
      .order('created_at', { ascending: false })
    if (basicErr) throw new Error(basicErr.message)
    return basic || []
  }
  return data || []
}

/** Authed read — list of currently published forms (id + slug + updated_at). */
export async function listPublishedForms() {
  const { data, error } = await supabase
    .from('public_forms')
    .select('id, slug, published, updated_at')
    .eq('published', true)
  if (error) throw new Error(error.message)
  return data || []
}
