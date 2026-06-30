import type { CSSProperties } from 'react'
import type { Detail, RawCard } from '../types'
import { COLUMNS, avatarBgFor, badgeFor } from '../data'

interface Props {
  onOpen: (detail: Detail) => void
}

const pillOutline: CSSProperties = {
  border: '1.5px solid #d7d5dd',
  color: '#5b5667',
  fontWeight: 600,
  fontSize: 14,
  padding: '11px 18px',
  borderRadius: 26,
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  cursor: 'pointer',
  background: '#fff',
}

const gettingStarted: CSSProperties = {
  background: 'linear-gradient(135deg,#1ed79a,#1ba0e6)',
  color: '#fff',
  fontWeight: 800,
  fontSize: 13,
  letterSpacing: '0.6px',
  padding: 14,
  borderRadius: 26,
  textAlign: 'center',
  cursor: 'pointer',
  boxShadow: '0 4px 12px rgba(27,160,230,.3)',
}

function Avatar({ initials }: { initials: string }) {
  return (
    <div
      style={{
        width: 34,
        height: 34,
        borderRadius: '50%',
        background: avatarBgFor(initials),
        color: '#2b2535',
        fontWeight: 800,
        fontSize: 13,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 'none',
      }}
    >
      {initials}
    </div>
  )
}

function StatRow({ approved, complete, todo, light }: { approved: number; complete: number; todo: number; light: boolean }) {
  const num = light ? '#fff' : '#2b2535'
  const sub = light ? '#ffffffcc' : '#9b95a5'
  const border = light ? '1px solid #ffffff33' : '1px solid #ededf1'
  const cell = (value: number, label: string) => (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div style={{ color: num, fontWeight: 800, fontSize: 26 }}>{value}</div>
      <div style={{ color: sub, fontWeight: 600, fontSize: 13, marginTop: 2 }}>{label}</div>
    </div>
  )
  return (
    <div style={{ display: 'flex', marginTop: 16, borderTop: border, paddingTop: 14 }}>
      {cell(approved, 'Approved')}
      {cell(complete, 'Complete')}
      {cell(todo, 'To Do')}
    </div>
  )
}

function Card({ card, onOpen }: { card: RawCard; onOpen: (d: Detail) => void }) {
  const detail: Detail = card.detail || 'oranga'
  const open = () => onOpen(detail)

  if (card.featured) {
    return (
      <div
        onClick={open}
        style={{
          background: 'linear-gradient(150deg,#1ec98f 0%,#17a7c4 50%,#1b8fe0 100%)',
          borderRadius: 13,
          padding: '16px 17px 17px',
          cursor: 'pointer',
          boxShadow: '0 6px 16px rgba(23,143,196,.28)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: 18, lineHeight: 1.25, flex: 1 }}>{card.title}</div>
          <div style={{ color: '#ffffffcc', fontWeight: 800, fontSize: 18 }}>⋯</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
          <Avatar initials={card.initials} />
          <div style={{ color: '#fff', fontWeight: 600, fontSize: 15 }}>{card.owner}</div>
          {card.extra && <div style={{ color: '#ffffffcc', fontWeight: 600, fontSize: 14 }}>{card.extra}</div>}
        </div>
        <StatRow approved={card.approved ?? 0} complete={card.complete ?? 0} todo={card.todo ?? 0} light />
      </div>
    )
  }

  const b = badgeFor(card.status)
  const dueColor = card.overdue ? '#e23b1e' : '#5b5667'
  return (
    <div
      onClick={open}
      style={{
        background: '#fff',
        border: '1px solid #e6e5ec',
        borderRadius: 13,
        padding: '16px 17px 17px',
        cursor: 'pointer',
        boxShadow: '0 2px 6px rgba(40,30,60,.05)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ color: '#2b2535', fontWeight: 800, fontSize: 18, lineHeight: 1.25, flex: 1 }}>{card.title}</div>
        <div style={{ color: '#9b95a5', fontWeight: 800, fontSize: 18 }}>⋯</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
        <Avatar initials={card.initials} />
        <div style={{ color: '#3b3548', fontWeight: 600, fontSize: 15 }}>{card.owner}</div>
        {card.extra && <div style={{ color: '#9b95a5', fontWeight: 600, fontSize: 14 }}>{card.extra}</div>}
      </div>

      {card.mode === 'stats' && (
        <StatRow approved={card.approved ?? 0} complete={card.complete ?? 0} todo={card.todo ?? 0} light={false} />
      )}

      {card.mode === 'progress' && (
        <div>
          <div style={{ textAlign: 'right', color: '#6f6a7a', fontWeight: 700, fontSize: 15, marginTop: 14 }}>
            {(card.pct ?? 0) + '%'}
          </div>
          <div style={{ height: 5, background: '#ececf0', borderRadius: 4, marginTop: 7, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: (card.pct ?? 0) + '%', background: '#1493d6', borderRadius: 4 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', marginTop: 15 }}>
            <div style={{ background: b.bg, color: b.color, fontWeight: 800, fontSize: 12, letterSpacing: '0.6px', padding: '6px 12px', borderRadius: 7 }}>
              {card.status}
            </div>
            <div style={{ flex: 1 }} />
            <div style={{ color: '#8b8595', fontWeight: 700, fontSize: 14 }}>
              Due: <span style={{ color: dueColor, fontWeight: 800 }}>{card.due}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function Board({ onOpen }: Props) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* sub tabs */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '18px 30px 0', gap: 34, background: '#eef0f3' }}>
        <div style={{ display: 'flex', gap: 32 }}>
          <div style={{ color: '#1493d6', fontWeight: 800, fontSize: 15, letterSpacing: '0.8px', paddingBottom: 12, borderBottom: '3px solid #1493d6' }}>
            REQUESTS
          </div>
          <div style={{ color: '#8b8595', fontWeight: 700, fontSize: 15, letterSpacing: '0.8px', paddingBottom: 12, cursor: 'pointer' }}>
            RECURRING/BULK
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingBottom: 8 }}>
          <div style={{ border: '1.5px solid #1493d6', color: '#1493d6', fontWeight: 800, fontSize: 13, letterSpacing: '0.5px', padding: '9px 16px', borderRadius: 22, display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}>
            ⚡ ACTIVITY
          </div>
          <div style={{ color: '#6f6a7a', fontWeight: 800, fontSize: 20, letterSpacing: '1px', cursor: 'pointer' }}>⋯</div>
        </div>
      </div>

      {/* filter row */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '16px 30px', gap: 18, background: '#eef0f3' }}>
        <div style={{ border: '1.5px solid #1493d6', color: '#1493d6', fontWeight: 800, fontSize: 14, padding: '11px 18px', borderRadius: 26, cursor: 'pointer' }}>
          Unassigned: Shown
        </div>
        <div style={{ color: '#4b4556', fontWeight: 700, fontSize: 15, marginLeft: 6 }}>Filter By:</div>
        <div style={pillOutline}>Status <span style={{ fontSize: 11, opacity: 0.7 }}>▾</span></div>
        <div style={pillOutline}>Owner <span style={{ fontSize: 11, opacity: 0.7 }}>▾</span></div>
        <div style={pillOutline}>Client <span style={{ fontSize: 11, opacity: 0.7 }}>▾</span></div>
        <div style={{ flex: 1 }} />
        <div style={{ color: '#4b4556', fontWeight: 700, fontSize: 15 }}>View:</div>
        <div style={{ border: '1.5px solid #1493d6', color: '#1493d6', fontWeight: 800, fontSize: 14, padding: '11px 18px', borderRadius: 26, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          ⊞ Kanban <span style={{ fontSize: 11 }}>▾</span>
        </div>
        <div style={{ background: '#e4e3e9', borderRadius: 26, padding: '11px 18px', display: 'flex', alignItems: 'center', gap: 10, minWidth: 230 }}>
          <input
            placeholder="Search requests..."
            style={{ border: 'none', background: 'transparent', outline: 'none', fontFamily: 'inherit', fontSize: 14, color: '#5b5667', flex: 1, width: '100%' }}
          />
          <span style={{ color: '#8b8595', fontSize: 15 }}>🔍</span>
        </div>
      </div>

      {/* columns */}
      <div
        className="swnz-scroll"
        style={{ flex: 1, display: 'flex', gap: 18, padding: '6px 30px 30px', overflowX: 'auto', minHeight: 0, alignItems: 'flex-start' }}
      >
        {COLUMNS.map((col, ci) => (
          <div
            key={col.name}
            style={{ flex: 'none', width: 330, background: '#e7e7ec', borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '100%' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 4px 2px' }}>
              <div style={{ fontWeight: 800, fontSize: 17, color: '#2b2535', flex: 1 }}>{col.name}</div>
              <div style={{ border: '1.5px solid #c3bdd0', color: '#5b5667', fontWeight: 800, fontSize: 13, minWidth: 30, textAlign: 'center', padding: '2px 8px', borderRadius: 7 }}>
                {col.count}
              </div>
              <div style={{ color: '#8b8595', fontWeight: 800, fontSize: 18, cursor: 'pointer' }}>⋯</div>
            </div>

            {col.cards.map((card, idx) => (
              <Card key={idx} card={card} onOpen={onOpen} />
            ))}

            {ci === 0 && (
              <>
                <div style={{ flex: 1 }} />
                <div style={gettingStarted}>GETTING STARTED - VALUE…</div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
