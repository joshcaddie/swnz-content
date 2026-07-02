import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from '@dnd-kit/core'
import { useQueryClient } from '@tanstack/react-query'
import { useBoard, useDeleteRequest, useDuplicateRequest, useMoveRequest, type BoardCard } from '../api/requests'
import { useStages } from '../api/stages'
import { useClients } from '../api/clients'
import { qk } from '../api/keys'
import { supabase } from '../lib/supabase'
import { useBrand } from '../lib/brand'
import { C, badgeStyles, formatDate } from '../theme'
import { FullScreenMessage } from '../App'

const STATUS_OPTIONS = ['PUBLISHED', 'OVERDUE', 'ARCHIVED', 'DRAFT']

export function BoardPage() {
  const { brand } = useBrand()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data: cards, isLoading } = useBoard()
  const { data: stages } = useStages()
  const { data: clients } = useClients()
  const move = useMoveRequest()
  const del = useDeleteRequest()
  const dup = useDuplicateRequest()

  const [params] = useSearchParams()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [clientFilter, setClientFilter] = useState<string | null>(params.get('client'))
  const [ownerFilter, setOwnerFilter] = useState<string | null>(null)
  const [menuFor, setMenuFor] = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const ownerNames = useMemo(
    () => [...new Set((cards ?? []).map((c) => c.ownerName))].sort(),
    [cards],
  )

  const filtered = useMemo(() => {
    let list = cards ?? []
    if (search.trim()) {
      const s = search.toLowerCase()
      list = list.filter((c) => c.title.toLowerCase().includes(s) || (c.clientName ?? '').toLowerCase().includes(s))
    }
    if (statusFilter) list = list.filter((c) => c.badge === statusFilter)
    if (clientFilter) list = list.filter((c) => c.clientName === clientFilter)
    if (ownerFilter) list = list.filter((c) => c.ownerName === ownerFilter)
    return list
  }, [cards, search, statusFilter, clientFilter, ownerFilter])

  const byStage = useMemo(() => {
    const map = new Map<string, BoardCard[]>()
    for (const st of stages ?? []) map.set(st.id, [])
    for (const c of filtered) {
      if (c.stageId && map.has(c.stageId)) map.get(c.stageId)!.push(c)
    }
    for (const arr of map.values()) arr.sort((a, b) => a.position - b.position)
    return map
  }, [filtered, stages])

  if (isLoading) return <FullScreenMessage text="Loading board…" />

  const onDragEnd = async (e: DragEndEvent) => {
    const cardId = String(e.active.id)
    const overId = e.over ? String(e.over.id) : null
    if (!overId || !overId.startsWith('stage:')) return
    const targetStage = overId.slice('stage:'.length)
    const card = (cards ?? []).find((c) => c.id === cardId)
    if (!card || card.stageId === targetStage) return
    const targetCards = byStage.get(targetStage) ?? []
    const newPos = (targetCards[targetCards.length - 1]?.position ?? -1) + 1

    // Optimistic: reflect the move immediately, then persist.
    qc.setQueryData<BoardCard[]>(qk.board, (prev) =>
      (prev ?? []).map((c) => (c.id === cardId ? { ...c, stageId: targetStage, position: newPos } : c)),
    )
    try {
      await move.mutateAsync({ id: cardId, stageId: targetStage, position: newPos })
    } catch {
      qc.invalidateQueries({ queryKey: qk.board })
    }
  }

  const onDelete = async (id: string) => {
    setMenuFor(null)
    if (confirm('Delete this request? This cannot be undone.')) await del.mutateAsync(id)
  }
  const onDuplicate = async (id: string) => {
    setMenuFor(null)
    const { data } = await supabase.from('requests').select('*').eq('id', id).single()
    if (data) await dup.mutateAsync(data)
  }

  const pill = (label: string, active: boolean, onClick: () => void) => (
    <div
      onClick={onClick}
      style={{
        border: `1.5px solid ${active ? brand.accent : '#d7d5dd'}`,
        color: active ? brand.accent : '#5b5667',
        fontWeight: active ? 800 : 600,
        fontSize: 14,
        padding: '11px 18px',
        borderRadius: 26,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        cursor: 'pointer',
        background: '#fff',
      }}
    >
      {label} <span style={{ fontSize: 11, opacity: 0.7 }}>▾</span>
    </div>
  )

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* sub tabs */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '18px 30px 0', gap: 34, background: C.bg }}>
        <div style={{ display: 'flex', gap: 32 }}>
          <div style={{ color: brand.accent, fontWeight: 800, fontSize: 15, letterSpacing: '0.8px', paddingBottom: 12, borderBottom: `3px solid ${brand.accent}` }}>REQUESTS</div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingBottom: 8 }}>
          <div style={{ border: `1.5px solid ${brand.accent}`, color: brand.accent, fontWeight: 800, fontSize: 13, letterSpacing: '0.5px', padding: '9px 16px', borderRadius: 22, cursor: 'pointer' }}>⚡ ACTIVITY</div>
          <div style={{ color: '#6f6a7a', fontWeight: 800, fontSize: 20, cursor: 'pointer' }}>⋯</div>
        </div>
      </div>

      {/* filter row */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '16px 30px', gap: 18, background: C.bg, position: 'relative' }}>
        <div style={{ color: '#4b4556', fontWeight: 700, fontSize: 15 }}>Filter By:</div>
        <div style={{ position: 'relative' }}>
          {pill(statusFilter ? `Status: ${statusFilter}` : 'Status', !!statusFilter, () => setMenuFor(menuFor === 'status' ? null : 'status'))}
          {menuFor === 'status' && (
            <Dropdown onClose={() => setMenuFor(null)} options={['All', ...STATUS_OPTIONS]} onPick={(o) => setStatusFilter(o === 'All' ? null : o)} />
          )}
        </div>
        <div style={{ position: 'relative' }}>
          {pill(ownerFilter ? `Owner: ${ownerFilter}` : 'Owner', !!ownerFilter, () => setMenuFor(menuFor === 'owner' ? null : 'owner'))}
          {menuFor === 'owner' && (
            <Dropdown onClose={() => setMenuFor(null)} options={['All', ...ownerNames]} onPick={(o) => setOwnerFilter(o === 'All' ? null : o)} />
          )}
        </div>
        <div style={{ position: 'relative' }}>
          {pill(clientFilter ? `Client: ${clientFilter}` : 'Client', !!clientFilter, () => setMenuFor(menuFor === 'client' ? null : 'client'))}
          {menuFor === 'client' && (
            <Dropdown onClose={() => setMenuFor(null)} options={['All', ...(clients ?? []).map((c) => c.name)]} onPick={(o) => setClientFilter(o === 'All' ? null : o)} />
          )}
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ background: '#e4e3e9', borderRadius: 26, padding: '11px 18px', display: 'flex', alignItems: 'center', gap: 10, minWidth: 230 }}>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search requests..." style={{ border: 'none', background: 'transparent', outline: 'none', fontFamily: 'inherit', fontSize: 14, color: '#5b5667', flex: 1, width: '100%' }} />
          <span style={{ color: C.muted, fontSize: 15 }}>🔍</span>
        </div>
      </div>

      {/* columns */}
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="swnz-scroll" style={{ flex: 1, display: 'flex', gap: 18, padding: '6px 30px 30px', overflowX: 'auto', minHeight: 0, alignItems: 'flex-start' }}>
          {(stages ?? []).map((st) => {
            const colCards = byStage.get(st.id) ?? []
            return (
              <Column key={st.id} id={st.id} name={st.name} count={colCards.length}>
                {colCards.map((card) => (
                  <Card
                    key={card.id}
                    card={card}
                    onOpen={() => navigate(`/requests/${card.id}`)}
                    menuOpen={menuFor === card.id}
                    onToggleMenu={() => setMenuFor(menuFor === card.id ? null : card.id)}
                    onDelete={() => onDelete(card.id)}
                    onDuplicate={() => onDuplicate(card.id)}
                  />
                ))}
              </Column>
            )
          })}
        </div>
      </DndContext>
    </div>
  )
}

function Dropdown({ options, onPick, onClose }: { options: string[]; onPick: (o: string) => void; onClose: () => void }) {
  return (
    <div style={{ position: 'absolute', top: 46, left: 0, minWidth: 200, background: '#fff', borderRadius: 12, boxShadow: '0 14px 40px rgba(16,28,52,.22)', padding: 6, zIndex: 50 }}>
      {options.map((o) => (
        <div key={o} className="swnz-hover swnz-hover-blue" onClick={() => { onPick(o); onClose() }} style={{ padding: '10px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 15, color: C.ink }}>{o}</div>
      ))}
    </div>
  )
}

function Column({ id, name, count, children }: { id: string; name: string; count: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `stage:${id}` })
  return (
    <div ref={setNodeRef} style={{ flex: 'none', width: 330, background: isOver ? '#dde7ee' : '#e7e7ec', borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '100%', transition: 'background .12s' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 4px 2px' }}>
        <div style={{ fontWeight: 800, fontSize: 17, color: C.ink, flex: 1 }}>{name}</div>
        <div style={{ border: '1.5px solid #c3bdd0', color: '#5b5667', fontWeight: 800, fontSize: 13, minWidth: 30, textAlign: 'center', padding: '2px 8px', borderRadius: 7 }}>{count}</div>
        <div style={{ color: C.muted, fontWeight: 800, fontSize: 18, cursor: 'pointer' }}>⋯</div>
      </div>
      {children}
    </div>
  )
}

function Card({ card, onOpen, menuOpen, onToggleMenu, onDelete, onDuplicate }: {
  card: BoardCard
  onOpen: () => void
  menuOpen: boolean
  onToggleMenu: () => void
  onDelete: () => void
  onDuplicate: () => void
}) {
  const { brand: brandCard } = useBrand()
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: card.id })
  const style: React.CSSProperties = {
    transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
  }
  const avatar = (light: boolean) => (
    <div style={{ width: 34, height: 34, borderRadius: '50%', background: card.ownerColor, color: light ? '#16294a' : '#2b2535', fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{card.ownerInitials}</div>
  )
  const menu = menuOpen && (
    <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', top: 36, right: 8, width: 170, background: '#fff', borderRadius: 10, boxShadow: '0 14px 40px rgba(16,28,52,.24)', padding: 6, zIndex: 30 }}>
      <div className="swnz-hover swnz-hover-blue" onClick={onOpen} style={{ padding: '9px 12px', borderRadius: 7, cursor: 'pointer', fontSize: 14, color: C.ink }}>Open</div>
      <div className="swnz-hover swnz-hover-blue" onClick={onDuplicate} style={{ padding: '9px 12px', borderRadius: 7, cursor: 'pointer', fontSize: 14, color: C.ink }}>Duplicate</div>
      <div className="swnz-hover swnz-hover-blue" onClick={onDelete} style={{ padding: '9px 12px', borderRadius: 7, cursor: 'pointer', fontSize: 14, color: '#c9491f' }}>Delete</div>
    </div>
  )
  const kebab = (color: string) => (
    <div onClick={(e) => { e.stopPropagation(); onToggleMenu() }} style={{ color, fontWeight: 800, fontSize: 18, cursor: 'pointer' }}>⋯</div>
  )

  if (card.featured) {
    return (
      <div ref={setNodeRef} {...listeners} {...attributes} onClick={onOpen} style={{ ...style, position: 'relative', background: brandCard.cardGradient, borderRadius: 13, padding: '16px 17px 17px', boxShadow: '0 6px 16px rgba(23,143,196,.28)' }}>
        {menu}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: 18, lineHeight: 1.25, flex: 1 }}>{card.title}</div>
          {kebab('#ffffffcc')}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
          {avatar(true)}
          <div style={{ color: '#fff', fontWeight: 600, fontSize: 15 }}>{card.ownerName}</div>
        </div>
        <div style={{ display: 'flex', marginTop: 16, borderTop: '1px solid #ffffff33', paddingTop: 14 }}>
          {([['Approved', card.approved], ['Complete', card.complete], ['To Do', card.todo]] as const).map(([l, v]) => (
            <div key={l} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 26 }}>{v}</div>
              <div style={{ color: '#ffffffcc', fontWeight: 600, fontSize: 13, marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const b = badgeStyles[card.badge ?? ''] ?? { bg: '#e3e2e7', color: '#6b6675' }
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} onClick={onOpen} style={{ ...style, position: 'relative', background: '#fff', border: '1px solid #e6e5ec', borderRadius: 13, padding: '16px 17px 17px', boxShadow: '0 2px 6px rgba(40,30,60,.05)' }}>
      {menu}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ color: C.ink, fontWeight: 800, fontSize: 18, lineHeight: 1.25, flex: 1 }}>{card.title}</div>
        {kebab('#9b95a5')}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
        {avatar(false)}
        <div style={{ color: '#3b3548', fontWeight: 600, fontSize: 15 }}>{card.ownerName}</div>
      </div>
      <div style={{ textAlign: 'right', color: '#6f6a7a', fontWeight: 700, fontSize: 15, marginTop: 14 }}>{card.pct}%</div>
      <div style={{ height: 5, background: '#ececf0', borderRadius: 4, marginTop: 7, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${card.pct}%`, background: brandCard.accent, borderRadius: 4 }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', marginTop: 15 }}>
        {card.badge && <div style={{ background: b.bg, color: b.color, fontWeight: 800, fontSize: 12, letterSpacing: '0.6px', padding: '6px 12px', borderRadius: 7 }}>{card.badge}</div>}
        <div style={{ flex: 1 }} />
        {card.due && <div style={{ color: C.muted, fontWeight: 700, fontSize: 14 }}>Due: <span style={{ color: card.overdue ? '#e23b1e' : '#5b5667', fontWeight: 800 }}>{formatDate(card.due)}</span></div>}
      </div>
    </div>
  )
}
