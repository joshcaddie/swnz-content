import { FIELD_GROUPS } from '../data'

interface Props {
  onClose: () => void
  onPick: (label: string, icon: string) => void
}

export function FieldModal({ onClose, onPick }: Props) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(16,28,52,.55)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        zIndex: 60,
        padding: '40px 20px',
        overflow: 'auto',
      }}
    >
      <div style={{ background: '#fff', borderRadius: 18, width: 1180, maxWidth: '100%', padding: '30px 34px 40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 22 }}>
          <div style={{ flex: 1, textAlign: 'center', fontWeight: 800, fontSize: 26, color: '#241d33', paddingLeft: 30 }}>
            Select a field type
          </div>
          <span onClick={onClose} style={{ color: '#9b95a5', fontSize: 24, cursor: 'pointer' }}>✕</span>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e3e2e8', borderRadius: 12, padding: '15px 20px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <input
            placeholder="Search for a field type..."
            style={{ border: 'none', outline: 'none', fontFamily: 'inherit', fontSize: 18, color: '#5b5667', flex: 1, background: 'transparent', width: '100%' }}
          />
          <span style={{ color: '#9b95a5', fontSize: 18 }}>🔍</span>
        </div>

        {FIELD_GROUPS.map((grp) => (
          <div key={grp.group}>
            <div style={{ fontWeight: 800, fontSize: 14, letterSpacing: '1.2px', color: '#9b95a5', margin: '20px 0 14px' }}>
              {grp.group}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 14 }}>
              {grp.items.map((it) => (
                <div
                  key={it.type}
                  onClick={() => onPick(it.type, it.icon)}
                  className="swnz-hover swnz-hover-card"
                  style={{ background: '#f3f3f6', borderRadius: 12, padding: '22px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'center' }}
                >
                  <span style={{ fontSize: 25, color: '#3b3548' }}>{it.icon}</span>
                  <span style={{ fontWeight: 700, fontSize: 15, color: '#2b2535', lineHeight: 1.3 }}>{it.type}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
