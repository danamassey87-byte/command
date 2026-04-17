/**
 * CSV export utilities for contacts and expenses.
 */

function escapeCsv(val) {
  if (val == null) return ''
  const str = String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function downloadCsv(content, filename) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function exportContacts(contacts, filename = 'contacts.csv') {
  const headers = ['Name', 'Email', 'Phone', 'Type', 'Source', 'Stage', 'Budget Min', 'Budget Max', 'Areas', 'Pre-Approval', 'Lender', 'Notes', 'Created']
  const rows = (contacts ?? []).map(c => [
    escapeCsv(c.name),
    escapeCsv(c.email),
    escapeCsv(c.phone),
    escapeCsv(c.type),
    escapeCsv(c.source),
    escapeCsv(c.stage),
    escapeCsv(c.budget_min),
    escapeCsv(c.budget_max),
    escapeCsv(Array.isArray(c.areas) ? c.areas.join('; ') : c.areas),
    escapeCsv(c.pre_approval_amount),
    escapeCsv(c.lender_name),
    escapeCsv(c.notes),
    escapeCsv(c.created_at ? new Date(c.created_at).toLocaleDateString() : ''),
  ].join(','))

  downloadCsv(headers.join(',') + '\n' + rows.join('\n'), filename)
  return rows.length
}

export function exportExpenses(expenses, filename = 'expenses.csv') {
  const headers = ['Date', 'Vendor', 'Description', 'Amount', 'Category', 'Client', 'Listing', 'Payment Method', 'Tax Deductible', 'Notes']
  const rows = (expenses ?? []).map(e => [
    escapeCsv(e.date),
    escapeCsv(e.vendor),
    escapeCsv(e.description),
    escapeCsv(e.amount),
    escapeCsv(e.category?.name),
    escapeCsv(e.contact?.name),
    escapeCsv(e.listing?.property?.address),
    escapeCsv(e.payment_method),
    escapeCsv(e.is_deductible ? 'Yes' : 'No'),
    escapeCsv(e.notes),
  ].join(','))

  downloadCsv(headers.join(',') + '\n' + rows.join('\n'), filename)
  return rows.length
}

export function exportProspects(prospects, filename = 'prospects.csv') {
  const headers = ['Name', 'Phone', 'Email', 'Source', 'Status', 'Address', 'City', 'Zip', 'Notes', 'Created']
  const rows = (prospects ?? []).map(p => [
    escapeCsv(p.name),
    escapeCsv(p.phone),
    escapeCsv(p.email),
    escapeCsv(p.source),
    escapeCsv(p.status),
    escapeCsv(p.address),
    escapeCsv(p.city),
    escapeCsv(p.zip),
    escapeCsv(p.notes),
    escapeCsv(p.created_at ? new Date(p.created_at).toLocaleDateString() : ''),
  ].join(','))

  downloadCsv(headers.join(',') + '\n' + rows.join('\n'), filename)
  return rows.length
}
