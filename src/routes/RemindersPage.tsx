import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { qk } from '../api/keys'
import { Switch } from '../components/StructureBuilder'
import { C, formatDate } from '../theme'
import { FullScreenMessage } from '../App'

interface Row {
  id: string
  name: string
  due_date: string | null
  reminders_enabled: boolean
  clients: { name: string; contact_email: string | null } | null
}

export function RemindersPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data: rows, isLoading, refetch } = useQuery({
    queryKey: ['reminder-rows'],
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await supabase
        .from('requests')
        .select('id, name, due_date, reminders_enabled, clients(name, contact_email)')
        .order('due_date', { ascending: true, nullsFirst: false })
      if (error) throw error
      return (data ?? []) as unknown as Row[]
    },
  })

  if (isLoading) return <FullScreenMessage text="Loading reminders…" />

  const toggle = async (r: Row) => {
    await supabase.from('requests').update({ reminders_enabled: !r.reminders_enabled }).eq('id', r.id)
    await refetch()
    qc.invalidateQueries({ queryKey: qk.board })
  }

  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="swnz-scroll" style={{ flex: 1, overflowY: 'auto', padding: '28px 36px 60px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ fontWeight: 800, fontSize: 30, color: C.inkDark }}>Reminders</div>
        <div style={{ color: C.muted, fontSize: 15, margin: '6px 0 24px' }}>
          Clients with reminders on are emailed daily when their request is overdue or due within 3 days
          (requires the email service to be configured). Toggle per request below.
        </div>
        <div style={{ background: '#fff', border: '1px solid #e9e8ee', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 10px rgba(40,30,60,.05)' }}>
          <div style={{ display: 'flex', padding: '14px 24px', background: '#fbfbfc', borderBottom: '1px solid #f0eff3', fontWeight: 800, fontSize: 12, letterSpacing: '0.8px', color: C.muted2 }}>
            <div style={{ flex: 2 }}>REQUEST</div>
            <div style={{ flex: 1.4 }}>CLIENT</div>
            <div style={{ width: 120 }}>DUE</div>
            <div style={{ width: 90, textAlign: 'right' }}>REMIND</div>
          </div>
          {(rows ?? []).map((r) => {
            const overdue = !!r.due_date && r.due_date < today
            return (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', padding: '15px 24px', borderTop: '1px solid #f6f5f8' }}>
                <div onClick={() => navigate(`/requests/${r.id}`)} style={{ flex: 2, fontWeight: 700, fontSize: 15, color: C.navy2, cursor: 'pointer' }}>{r.name}</div>
                <div style={{ flex: 1.4, color: '#5b5667', fontSize: 14 }}>
                  {r.clients?.name ?? '—'}
                  {r.clients && !r.clients.contact_email && <span style={{ color: '#c9491f', fontSize: 12 }}> · no email</span>}
                </div>
                <div style={{ width: 120, color: overdue ? '#e23b1e' : '#5b5667', fontWeight: overdue ? 800 : 600, fontSize: 14 }}>{formatDate(r.due_date)}</div>
                <div style={{ width: 90, display: 'flex', justifyContent: 'flex-end' }}>
                  <Switch on={r.reminders_enabled} onToggle={() => toggle(r)} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
