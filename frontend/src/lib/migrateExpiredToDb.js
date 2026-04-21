/**
 * Migrate expired_cannonball localStorage data to the expired_leads DB table.
 * Run once — will skip records that already exist by address match.
 *
 * Usage: import { migrateExpiredData } from './migrateExpiredToDb'; await migrateExpiredData()
 */
import supabase from './supabase.js'

const LS_KEY = 'expired_cannonball_data'

export async function migrateExpiredData() {
  const raw = localStorage.getItem(LS_KEY)
  if (!raw) return { migrated: 0, skipped: 0, message: 'No localStorage data found' }

  let localData
  try { localData = JSON.parse(raw) } catch { return { migrated: 0, skipped: 0, message: 'Invalid JSON in localStorage' } }
  if (!Array.isArray(localData) || localData.length === 0) return { migrated: 0, skipped: 0, message: 'Empty data' }

  let migrated = 0
  let skipped = 0

  for (const item of localData) {
    const address = item.address?.trim()
    if (!address) { skipped++; continue }

    // Check if already in DB
    const { data: existing } = await supabase.from('expired_leads')
      .select('id')
      .ilike('property_id', '%') // check any exists
      .limit(1)

    // Find or create property
    let propertyId = null
    const { data: propMatch } = await supabase.from('properties')
      .select('id')
      .ilike('address', `%${address}%`)
      .limit(1)

    if (propMatch?.length) {
      propertyId = propMatch[0].id
    } else {
      const { data: newProp } = await supabase.from('properties').insert({
        address,
        city: item.city?.trim() || null,
        zip: item.zip?.trim() || null,
        state: 'AZ',
        mls_id: item.mls?.trim() || null,
        role_for_dana: 'comp-only',
      }).select('id').single()
      if (newProp) propertyId = newProp.id
    }

    if (!propertyId) { skipped++; continue }

    // Check if expired_lead already exists for this property
    const { data: existingLead } = await supabase.from('expired_leads')
      .select('id')
      .eq('property_id', propertyId)
      .limit(1)

    if (existingLead?.length) { skipped++; continue }

    // Map status
    const statusMap = {
      new: 'new',
      cannonball: 'new', // cannonball is a tag, not a pipeline status
      appt_scheduled: 'appt-set',
      relisted: 'dead',
    }

    // Create expired_lead
    await supabase.from('expired_leads').insert({
      property_id: propertyId,
      data_source: 'manual',
      listed_price: item.price ? Number(String(item.price).replace(/[^0-9]/g, '')) : null,
      status: statusMap[item.status] || 'new',
    })

    migrated++
  }

  return { migrated, skipped, total: localData.length, message: `Migrated ${migrated} of ${localData.length} records (${skipped} skipped)` }
}
