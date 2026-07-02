import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBoard } from '../api/requests'
import { C } from '../theme'
import { FullScreenMessage } from '../App'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function CalendarPage() {
  const navigate = useNavigate()
  const { data: cards, isLoading } = useBoard()
  const now = new Date()
  const [ym, setYm] = useState<{ y: number; m: number }>({ y: now.getFullYear(), m: now.getMonth() })

  const byDate = useMemo(() => {
    const m = new Map<string, { id: string; title: string; overdue: boolean }[]>()
    for (const c of cards ?? []) {
      if (!c.due) continue
      const key = c.due.slice(0, 10)
      if (!m.has(key)) m.set(key, [])
      m.get(key)!.push({ id: c.id, title: c.title, overdue: c.overdue })
    }
    return m
  }, [cards])

  if (isLoading) return <FullScreenMessage text="Loading calendar…" />

  const first = new Date(ym.y, ym.m, 1)
  const startOffset = (first.getDay() + 6) % 7 // Monday-first
  const daysInMonth = new Date(ym.y, ym.m + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array.from({ length: startOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)
  const todayKey = new Date().toISOString().slice(0, 10)
  const keyOf = (d: number) => `${ym.y}-${String(ym.m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

  const nav = (delta: number) => {
    const d = new Date(ym.y, ym.m + delta, 1)
    setYm({ y: d.getFullYear(), m: d.getMonth() })
  }

  return (
    <div className="swnz-scroll" style={{ flex: 1, overflowY: 'auto', padding: '28px 36px 60px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ fontWeight: 800, fontSize: 30, color: C.inkDark, flex: 1 }}>Calendar</div>
          <div onClick={() => nav(-1)} style={navBtn}>‹</div>
          <div style={{ fontWeight: 800, fontSize: 20, color: C.navy2, minWidth: 200, textAlign: 'center' }}>{MONTHS[ym.m]} {ym.y}</div>
          <div onClick={() => nav(1)} style={navBtn}>›</div>
          <div onClick={() => setYm({ y: now.getFullYear(), m: now.getMonth() })} style={{ border: `1.5px solid ${C.cyan}`, color: C.cyan, fontWeight: 800, fontSize: 13, padding: '9px 16px', borderRadius: 22, cursor: 'pointer' }}>TODAY</div>
        </div>
        <div style={{ color: C.muted, fontSize: 14, margin: '6px 0 20px' }}>Requests shown on their due dates. Click one to open it.</div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 8 }}>
          {DOW.map((d) => (
            <div key={d} style={{ fontWeight: 800, fontSize: 13, letterSpacing: '0.8px', color: C.muted2, padding: '6px 10px' }}>{d.toUpperCase()}</div>
          ))}
          {cells.map((d, i) => {
            const key = d ? keyOf(d) : ''
            const items = d ? byDate.get(key) ?? [] : []
            const isToday = key === todayKey
            return (
              <div key={i} style={{ minHeight: 110, background: d ? '#fff' : 'transparent', border: d ? `1px solid ${isToday ? C.cyan : '#e9e8ee'}` : 'none', borderWidth: isToday ? 2 : 1, borderRadius: 12, padding: 8 }}>
                {d && <div style={{ fontWeight: 800, fontSize: 14, color: isToday ? C.cyan : C.muted, marginBottom: 6 }}>{d}</div>}
                {items.map((it) => (
                  <div key={it.id} onClick={() => navigate(`/requests/${it.id}`)} title={it.title}
                    style={{ background: it.overdue ? '#f7d9d0' : '#e6f3fb', color: it.overdue ? '#c9491f' : C.navy2, fontWeight: 700, fontSize: 12, padding: '5px 8px', borderRadius: 7, marginBottom: 5, cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {it.title}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const navBtn: React.CSSProperties = { width: 40, height: 40, borderRadius: '50%', background: '#fff', border: '1px solid #e1e0e7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6f6a7a', fontSize: 18, cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,.05)' }
