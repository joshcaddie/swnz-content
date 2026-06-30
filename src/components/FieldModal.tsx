import { useState } from 'react'
import type { FieldType } from '../lib/database.types'
import { FIELD_GROUPS, FIELD_TYPES } from '../fields/registry'
import { C } from '../theme'

export function FieldModal({ onClose, onPick }: { onClose: () => void; onPick: (type: FieldType, label: string) => void }) {
  const [search, setSearch] = useState('')
  const q = search.trim().toLowerCase()

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(16,28,52,.55)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 60, padding: '40px 20px', overflow: 'auto' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 18, width: 1180, maxWidth: '100%', padding: '30px 34px 40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 22 }}>
          <div style={{ flex: 1, textAlign: 'center', fontWeight: 800, fontSize: 26, color: C.inkDark, paddingLeft: 30 }}>Select a field type</div>
          <span onClick={onClose} style={{ color: C.muted2, fontSize: 24, cursor: 'pointer' }}>✕</span>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e3e2e8', borderRadius: 12, padding: '15px 20px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search for a field type..." style={{ border: 'none', outline: 'none', fontFamily: 'inherit', fontSize: 18, color: '#5b5667', flex: 1, background: 'transparent', width: '100%' }} />
          <span style={{ color: C.muted2, fontSize: 18 }}>🔍</span>
        </div>
        {FIELD_GROUPS.map((group) => {
          const items = FIELD_TYPES.filter((f) => f.group === group && (!q || f.label.toLowerCase().includes(q)))
          if (items.length === 0) return null
          return (
            <div key={group}>
              <div style={{ fontWeight: 800, fontSize: 14, letterSpacing: '1.2px', color: C.muted2, margin: '20px 0 14px' }}>{group}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 14 }}>
                {items.map((it) => (
                  <div key={it.type} onClick={() => onPick(it.type, it.label)} className="swnz-hover swnz-hover-card" style={{ background: C.panel, borderRadius: 12, padding: '22px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'center' }}>
                    <span style={{ fontSize: 25, color: '#3b3548' }}>{it.icon}</span>
                    <span style={{ fontWeight: 700, fontSize: 15, color: C.ink, lineHeight: 1.3 }}>{it.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
