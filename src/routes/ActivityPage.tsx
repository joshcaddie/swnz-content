import { useNavigate } from 'react-router-dom'
import { useActivity, type ActivityEvent } from '../api/activity'
import { C } from '../theme'
import { FullScreenMessage } from '../App'

const KIND_META: Record<ActivityEvent['kind'], { icon: string; bg: string; color: string }> = {
  created: { icon: '＋', bg: '#e6f3fb', color: '#1d3a5f' },
  submitted: { icon: '↑', bg: '#eaf2fc', color: '#3f6cab' },
  approved: { icon: '✓', bg: '#e7f7ec', color: '#1f8a4c' },
  comment: { icon: '💬', bg: '#f4f0fb', color: '#6b4fb5' },
}

export function ActivityPage() {
  const navigate = useNavigate()
  const { data: events, isLoading } = useActivity()

  if (isLoading) return <FullScreenMessage text="Loading activity…" />

  const dayOf = (iso: string) => new Date(iso).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
  const timeOf = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  let lastDay = ''

  return (
    <div className="swnz-scroll" style={{ flex: 1, overflowY: 'auto', padding: '28px 36px 60px' }}>
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        <div style={{ fontWeight: 800, fontSize: 30, color: C.inkDark, marginBottom: 20 }}>⚡ Activity</div>
        {(events ?? []).map((e) => {
          const day = dayOf(e.at)
          const showDay = day !== lastDay
          lastDay = day
          const m = KIND_META[e.kind]
          return (
            <div key={e.id}>
              {showDay && <div style={{ fontWeight: 800, fontSize: 14, letterSpacing: '0.6px', color: C.muted2, margin: '22px 0 10px' }}>{day.toUpperCase()}</div>}
              <div onClick={() => navigate(`/requests/${e.requestId}`)} className="swnz-hover swnz-hover-blue" style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#fff', border: '1px solid #ededf1', borderRadius: 12, padding: '14px 18px', marginBottom: 8, cursor: 'pointer' }}>
                <span style={{ width: 34, height: 34, borderRadius: '50%', background: m.bg, color: m.color, fontWeight: 800, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{m.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: C.inkDark }}>{e.requestName}</div>
                  <div style={{ color: '#6f6a7a', fontSize: 14 }}>{e.detail}</div>
                </div>
                <div style={{ color: C.muted2, fontSize: 13 }}>{timeOf(e.at)}</div>
              </div>
            </div>
          )
        })}
        {(events ?? []).length === 0 && <div style={{ color: C.muted }}>No activity yet.</div>}
      </div>
    </div>
  )
}
