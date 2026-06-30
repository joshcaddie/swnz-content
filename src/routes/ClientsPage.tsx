import { useState } from 'react'
import { useClients, useCreateClient, useDeleteClient, useUpdateClient } from '../api/clients'
import type { ClientRow } from '../lib/database.types'
import { initialsOf } from '../api/requests'
import { C } from '../theme'
import { FullScreenMessage } from '../App'

const COLORS = ['#9fb6e6', '#86d29a', '#5fd0c0', '#f49ac1', '#c9a8e9', '#f2c94c', '#5cd1b8', '#7fd6a0']

export function ClientsPage() {
  const { data: clients, isLoading } = useClients()
  const create = useCreateClient()
  const update = useUpdateClient()
  const del = useDeleteClient()
  const [editing, setEditing] = useState<Partial<ClientRow> | null>(null)

  if (isLoading) return <FullScreenMessage text="Loading clients…" />

  const save = async () => {
    if (!editing?.name?.trim()) return
    const payload = {
      name: editing.name.trim(),
      contact_name: editing.contact_name ?? null,
      contact_email: editing.contact_email ?? null,
      color: editing.color ?? COLORS[0],
    }
    if (editing.id) await update.mutateAsync({ id: editing.id, ...payload })
    else await create.mutateAsync(payload)
    setEditing(null)
  }

  return (
    <div className="swnz-scroll" style={{ flex: 1, overflowY: 'auto', padding: '28px 36px 60px' }}>
      <div style={{ display: 'flex', alignItems: 'center', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ fontWeight: 800, fontSize: 30, color: C.inkDark, flex: 1 }}>Clients</div>
        <div onClick={() => setEditing({ color: COLORS[0] })} style={{ background: C.navy2, color: '#fff', fontWeight: 800, fontSize: 13, letterSpacing: '0.5px', padding: '13px 22px', borderRadius: 26, cursor: 'pointer' }}>ADD CLIENT</div>
      </div>

      <div style={{ maxWidth: 1100, margin: '24px auto 0', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18 }}>
        {(clients ?? []).map((c) => (
          <div key={c.id} style={{ background: '#fff', border: '1px solid #e9e8ee', borderRadius: 14, padding: 22, boxShadow: '0 2px 8px rgba(40,30,60,.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 46, height: 46, borderRadius: '50%', background: c.color, color: '#1f3a28', fontWeight: 800, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{initialsOf(c.contact_name || c.name)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 18, color: C.inkDark }}>{c.name}</div>
                {c.contact_name && <div style={{ color: '#7b7686', fontSize: 14 }}>{c.contact_name}</div>}
              </div>
            </div>
            {c.contact_email && <div style={{ color: '#7b7686', fontSize: 14, marginTop: 12 }}>✉ {c.contact_email}</div>}
            <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
              <span onClick={() => setEditing(c)} style={{ color: C.cyan, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Edit</span>
              <span onClick={() => { if (confirm(`Delete ${c.name}?`)) del.mutate(c.id) }} style={{ color: '#c9491f', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Delete</span>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <Modal title={editing.id ? 'Edit client' : 'Add client'} onClose={() => setEditing(null)} onSave={save}>
          <Field label="School / client name">
            <input autoFocus value={editing.name ?? ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} style={inputStyle} />
          </Field>
          <Field label="Contact name">
            <input value={editing.contact_name ?? ''} onChange={(e) => setEditing({ ...editing, contact_name: e.target.value })} style={inputStyle} />
          </Field>
          <Field label="Contact email">
            <input type="email" value={editing.contact_email ?? ''} onChange={(e) => setEditing({ ...editing, contact_email: e.target.value })} style={inputStyle} />
          </Field>
          <Field label="Colour">
            <div style={{ display: 'flex', gap: 10 }}>
              {COLORS.map((col) => (
                <div key={col} onClick={() => setEditing({ ...editing, color: col })} style={{ width: 30, height: 30, borderRadius: '50%', background: col, cursor: 'pointer', border: editing.color === col ? '3px solid #1d3a5f' : '3px solid transparent' }} />
              ))}
            </div>
          </Field>
        </Modal>
      )}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', border: '1px solid #e1e0e7', borderRadius: 10, padding: '13px 15px', fontFamily: 'inherit', fontSize: 16, color: C.ink, outline: 'none',
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontWeight: 700, fontSize: 14, color: '#4b4556', marginBottom: 8 }}>{label}</div>
      {children}
    </div>
  )
}

export function Modal({ title, children, onClose, onSave, saveLabel = 'SAVE' }: {
  title: string
  children: React.ReactNode
  onClose: () => void
  onSave?: () => void
  saveLabel?: string
}) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(16,28,52,.5)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 70, padding: '60px 20px', overflow: 'auto' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 18, width: 520, maxWidth: '100%', padding: '28px 30px 30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ fontWeight: 800, fontSize: 22, color: C.inkDark, flex: 1 }}>{title}</div>
          <span onClick={onClose} style={{ color: C.muted2, fontSize: 22, cursor: 'pointer' }}>✕</span>
        </div>
        {children}
        {onSave && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 18 }}>
            <div onClick={onClose} style={{ color: '#5b5667', fontWeight: 700, fontSize: 14, padding: '12px 18px', cursor: 'pointer' }}>Cancel</div>
            <div onClick={onSave} style={{ background: C.navy2, color: '#fff', fontWeight: 800, fontSize: 13, letterSpacing: '0.5px', padding: '12px 24px', borderRadius: 24, cursor: 'pointer' }}>{saveLabel}</div>
          </div>
        )}
      </div>
    </div>
  )
}
