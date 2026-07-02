import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useBrand } from '../lib/brand'

export interface ActivityEvent {
  id: string
  kind: 'created' | 'submitted' | 'approved' | 'comment'
  requestId: string
  requestName: string
  detail: string
  at: string
}

/** Event feed derived from existing tables — no extra writes needed. Scoped to the active brand. */
export function useActivity(limit = 60) {
  const { brandId } = useBrand()
  return useQuery({
    queryKey: ['activity', brandId, limit],
    queryFn: async (): Promise<ActivityEvent[]> => {
      const [{ data: requests }, { data: answers }, { data: comments }] = await Promise.all([
        supabase.from('requests').select('id, name, created_at').eq('brand', brandId ?? 'swnz').order('created_at', { ascending: false }).limit(limit),
        supabase.from('answers').select('id, request_id, status, submitted_at, approved_at').or('submitted_at.not.is.null,approved_at.not.is.null').limit(200),
        supabase.from('comments').select('id, request_id, author_name, body, created_at').order('created_at', { ascending: false }).limit(limit),
      ])
      const nameById = new Map((requests ?? []).map((r) => [r.id, r.name]))
      const events: ActivityEvent[] = []

      for (const r of requests ?? []) {
        events.push({ id: `req-${r.id}`, kind: 'created', requestId: r.id, requestName: r.name, detail: 'Request created', at: r.created_at })
      }
      // Answers/comments from the other brand's requests won't be in nameById — skip them.
      for (const a of answers ?? []) {
        const rn = nameById.get(a.request_id)
        if (!rn) continue
        if (a.submitted_at) events.push({ id: `sub-${a.id}`, kind: 'submitted', requestId: a.request_id, requestName: rn, detail: 'Answer submitted for review', at: a.submitted_at })
        if (a.approved_at) events.push({ id: `app-${a.id}`, kind: 'approved', requestId: a.request_id, requestName: rn, detail: 'Answer approved', at: a.approved_at })
      }
      for (const c of comments ?? []) {
        const rn = nameById.get(c.request_id)
        if (!rn) continue
        events.push({ id: `com-${c.id}`, kind: 'comment', requestId: c.request_id, requestName: rn, detail: `${c.author_name ?? 'Someone'}: ${c.body.slice(0, 80)}`, at: c.created_at })
      }
      return events.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit)
    },
  })
}

/** Count of answers awaiting review in the active brand — powers the bell badge. */
export function useAwaitingCount() {
  const { brandId } = useBrand()
  return useQuery({
    queryKey: ['awaiting-count', brandId],
    refetchInterval: 60_000,
    queryFn: async (): Promise<number> => {
      const { count } = await supabase
        .from('answers')
        .select('id, requests!inner(brand)', { count: 'exact', head: true })
        .eq('status', 'submitted')
        .eq('requests.brand', brandId ?? 'swnz')
      return count ?? 0
    },
  })
}
