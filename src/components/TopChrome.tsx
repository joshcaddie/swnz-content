import type { CSSProperties } from 'react'

interface Props {
  qaOpen: boolean
  onLogo: () => void
  onToggleQA: () => void
  onAddRequest: () => void
}

const navItem: CSSProperties = {
  color: '#e7e2ef',
  fontWeight: 500,
  fontSize: 17,
  cursor: 'pointer',
}

const qaRow: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '13px 14px',
  borderRadius: 10,
  cursor: 'pointer',
}

export function TopChrome({ qaOpen, onLogo, onToggleQA, onAddRequest }: Props) {
  return (
    <>
      {/* brand bar */}
      <div
        style={{
          height: 6,
          background: 'linear-gradient(90deg,#1ed79a 0%,#19c2c0 45%,#1ba0e6 100%)',
          flex: 'none',
        }}
      />
      <div
        style={{
          background: '#16294a',
          height: 74,
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          padding: '0 26px',
          gap: 30,
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}
      >
        <div
          onClick={onLogo}
          style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', flex: 'none' }}
        >
          <img
            src="/assets/swnz-icon.png"
            alt="SWNZ"
            style={{ width: 48, height: 48, objectFit: 'contain', flex: 'none' }}
          />
          <div style={{ color: '#fff', fontWeight: 800, fontSize: 20, letterSpacing: '0.2px' }}>
            School Websites New Zealand
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 34 }}>
          <div
            onClick={onLogo}
            style={{ color: '#2fb3e8', fontWeight: 700, fontSize: 17, cursor: 'pointer', position: 'relative' }}
          >
            Requests
            <span
              style={{
                position: 'absolute',
                left: '50%',
                transform: 'translateX(-50%)',
                bottom: -12,
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: '#2fb3e8',
              }}
            />
          </div>
          <div style={navItem}>Calendar</div>
          <div style={{ ...navItem, display: 'flex', alignItems: 'center', gap: 6 }}>
            Clients
            <span style={{ fontSize: 11, opacity: 0.8 }}>▾</span>
          </div>
          <div style={navItem}>Team</div>
          <div style={navItem}>Templates</div>
          <div style={navItem}>Reminders</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 22, flex: 'none' }}>
          <div style={{ position: 'relative', color: '#e7e2ef', fontSize: 21, cursor: 'pointer' }}>
            🔔
            <span
              style={{
                position: 'absolute',
                top: -7,
                right: -9,
                background: '#2fb3e8',
                color: '#fff',
                fontSize: 11,
                fontWeight: 800,
                minWidth: 18,
                height: 18,
                borderRadius: 9,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 4px',
              }}
            >
              1
            </span>
          </div>
          <div
            style={{
              position: 'relative',
              width: 26,
              height: 26,
              borderRadius: '50%',
              border: '2px solid #e7e2ef',
              color: '#e7e2ef',
              fontWeight: 800,
              fontSize: 15,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            ?
            <span
              style={{
                position: 'absolute',
                top: -9,
                right: -14,
                background: '#2fb3e8',
                color: '#fff',
                fontSize: 10,
                fontWeight: 800,
                minWidth: 20,
                height: 18,
                borderRadius: 9,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 4px',
              }}
            >
              9+
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'linear-gradient(135deg,#e7a36b,#b9714a)',
                border: '2px solid #2a3f5c',
              }}
            />
            <span style={{ color: '#e7e2ef', fontSize: 12 }}>▾</span>
          </div>
          <div
            onClick={onToggleQA}
            style={{
              background: 'linear-gradient(135deg,#1ed79a,#1ba0e6)',
              color: '#fff',
              fontWeight: 800,
              fontSize: 14,
              letterSpacing: '0.6px',
              padding: '13px 20px',
              borderRadius: 26,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(27,160,230,.32)',
            }}
          >
            QUICK ACTIONS <span style={{ fontSize: 11 }}>▾</span>
          </div>

          {qaOpen && (
            <div
              style={{
                position: 'absolute',
                top: 70,
                right: 26,
                width: 248,
                background: '#fff',
                borderRadius: 14,
                boxShadow: '0 14px 40px rgba(16,28,52,.28)',
                padding: 8,
                zIndex: 50,
              }}
            >
              <div onClick={onAddRequest} className="swnz-hover swnz-hover-blue" style={qaRow}>
                <span style={{ width: 34, height: 34, borderRadius: 9, background: '#e6f3fb', color: '#1d3a5f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flex: 'none' }}>＋</span>
                <span style={{ fontWeight: 700, fontSize: 16, color: '#2b2535' }}>Add Request</span>
              </div>
              <div className="swnz-hover swnz-hover-blue" style={qaRow}>
                <span style={{ width: 34, height: 34, borderRadius: 9, background: '#dff0fb', color: '#1493d6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flex: 'none' }}>👤</span>
                <span style={{ fontWeight: 700, fontSize: 16, color: '#2b2535' }}>Add Client</span>
              </div>
              <div className="swnz-hover swnz-hover-blue" style={qaRow}>
                <span style={{ width: 34, height: 34, borderRadius: 9, background: '#e7f5f1', color: '#1b9e7a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flex: 'none' }}>📄</span>
                <span style={{ fontWeight: 700, fontSize: 16, color: '#2b2535' }}>Add Template</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
