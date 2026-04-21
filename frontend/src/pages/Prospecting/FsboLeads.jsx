import { useState } from 'react'
import ProspectingList from './ProspectingList'
import FsboLeadsDb from '../../components/FsboLeadsDb.jsx'

export default function FsboLeads() {
  const [dataSource, setDataSource] = useState('prospects')

  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 12, padding: '0 16px' }}>
        <button onClick={() => setDataSource('prospects')} style={{
          padding: '5px 14px', fontSize: '0.75rem', borderRadius: 6, cursor: 'pointer',
          border: `1px solid ${dataSource === 'prospects' ? 'var(--brown-dark)' : 'var(--color-border)'}`,
          background: dataSource === 'prospects' ? 'var(--brown-dark)' : 'transparent',
          color: dataSource === 'prospects' ? 'var(--cream)' : 'var(--brown-warm)',
        }}>Prospects View</button>
        <button onClick={() => setDataSource('db')} style={{
          padding: '5px 14px', fontSize: '0.75rem', borderRadius: 6, cursor: 'pointer',
          border: `1px solid ${dataSource === 'db' ? 'var(--brown-dark)' : 'var(--color-border)'}`,
          background: dataSource === 'db' ? 'var(--brown-dark)' : 'transparent',
          color: dataSource === 'db' ? 'var(--cream)' : 'var(--brown-warm)',
        }}>Database</button>
      </div>

      {dataSource === 'db' ? (
        <div style={{ padding: '0 16px' }}><FsboLeadsDb /></div>
      ) : (
        <ProspectingList
          source="fsbo"
          title="FSBO Leads"
          subtitle="For Sale By Owner — homeowners selling without an agent"
        />
      )}
    </div>
  )
}
