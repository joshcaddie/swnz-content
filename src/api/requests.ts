import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useBrand } from '../lib/brand'
import type {
  AnswerRow,
  Json,
  RequestRow,
  RequestFieldRow,
  RequestPageRow,
  RequestSectionRow,
  Structure,
} from '../lib/database.types'
import { qk } from './keys'

export interface BoardCard {
  id: string
  title: string
  clientName: string | null
  ownerName: string
  ownerInitials: string
  ownerColor: string
  featured: boolean
  total: number
  approved: number
  complete: number
  todo: number
  pct: number
  badge: string | null
  due: string | null
  overdue: boolean
  stageId: string | null
  position: number
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '–'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

interface RawBoardRequest extends RequestRow {
  clients: { name: string } | null
  owner: { name: string; avatar_color: string } | null
}

/** Board: the active brand's requests + their progress, ready to group by stage in the UI. */
export function useBoard() {
  const { brandId } = useBrand()
  return useQuery({
    queryKey: [...qk.board, brandId],
    queryFn: async (): Promise<BoardCard[]> => {
      const [{ data: reqs, error }, { data: prog }] = await Promise.all([
        supabase
          .from('requests')
          .select('*, clients(name), owner:profiles(name, avatar_color)')
          .eq('brand', brandId ?? 'swnz')
          .order('position'),
        supabase.from('request_progress').select('*'),
      ])
      if (error) throw error
      const progById = new Map((prog ?? []).map((p) => [p.request_id, p]))
      const today = new Date().toISOString().slice(0, 10)

      return ((reqs ?? []) as unknown as RawBoardRequest[]).map((r) => {
        const p = progById.get(r.id)
        const total = p?.total ?? 0
        const approved = p?.approved ?? 0
        const complete = p?.submitted ?? 0 // submitted, awaiting review
        const answered = p?.answered ?? 0
        const todo = Math.max(0, total - approved - complete)
        const ownerName = r.owner?.name ?? r.owner_name ?? 'Unassigned'
        const overdue = !!r.due_date && r.due_date < today && answered < total
        return {
          id: r.id,
          title: r.name,
          clientName: r.clients?.name ?? null,
          ownerName,
          ownerInitials: r.owner_initials ?? initialsOf(ownerName),
          ownerColor: r.owner?.avatar_color ?? r.owner_color ?? '#cfd2dd',
          featured: !r.status_badge,
          total,
          approved,
          complete,
          todo,
          pct: total ? Math.round((answered / total) * 100) : 0,
          badge: r.status_badge,
          due: r.due_date,
          overdue,
          stageId: r.stage_id,
          position: r.position,
        }
      })
    },
  })
}

export interface RequestDetail {
  request: RequestRow & { clients: { name: string; contact_name: string | null; contact_email: string | null } | null }
  pages: RequestPageRow[]
  sections: RequestSectionRow[]
  fields: RequestFieldRow[]
  answers: AnswerRow[]
}

export function useRequest(id: string | undefined) {
  return useQuery({
    queryKey: id ? qk.request(id) : ['request', 'none'],
    enabled: !!id,
    queryFn: async (): Promise<RequestDetail> => {
      const { data: request, error } = await supabase
        .from('requests')
        .select('*, clients(name, contact_name, contact_email)')
        .eq('id', id!)
        .single()
      if (error) throw error
      const { data: pages } = await supabase
        .from('request_pages')
        .select('*')
        .eq('request_id', id!)
        .order('position')
      const pageIds = (pages ?? []).map((p) => p.id)
      const { data: sections } = pageIds.length
        ? await supabase.from('request_sections').select('*').in('page_id', pageIds).order('position')
        : { data: [] as RequestSectionRow[] }
      const sectionIds = (sections ?? []).map((s) => s.id)
      const { data: fields } = sectionIds.length
        ? await supabase.from('request_fields').select('*').in('section_id', sectionIds).order('position')
        : { data: [] as RequestFieldRow[] }
      const { data: answers } = await supabase.from('answers').select('*').eq('request_id', id!)
      return {
        request: request as unknown as RequestDetail['request'],
        pages: pages ?? [],
        sections: sections ?? [],
        fields: fields ?? [],
        answers: answers ?? [],
      }
    },
  })
}

export function useCreateRequest() {
  const qc = useQueryClient()
  const { brandId } = useBrand()
  return useMutation({
    mutationFn: async (input: {
      name: string
      clientId: string | null
      stageId: string | null
      dueDate: string | null
      folder?: string
      structure: Structure
    }): Promise<string> => {
      const { data, error } = await supabase.rpc('create_request', {
        p_name: input.name,
        p_client: input.clientId,
        p_stage: input.stageId,
        p_due: input.dueDate,
        p_folder: input.folder ?? 'Default Folder',
        p_structure: input.structure as unknown as Json,
        p_brand: brandId ?? 'swnz',
      })
      if (error) throw error
      return data as unknown as string
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.board }),
  })
}

export function useUpdateRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<RequestRow> & { id: string }) => {
      const { error } = await supabase.from('requests').update(patch).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: qk.board })
      qc.invalidateQueries({ queryKey: qk.request(v.id) })
    },
  })
}

export function useMoveRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, stageId, position }: { id: string; stageId: string; position: number }) => {
      const { error } = await supabase.from('requests').update({ stage_id: stageId, position }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.board }),
  })
}

export function useDeleteRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('requests').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.board }),
  })
}

/** Duplicate a request (structure only, fresh token) via the SQL helpers. */
export function useDuplicateRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (req: RequestRow) => {
      const { data: structure, error: e1 } = await supabase.rpc('request_structure', { p_request: req.id })
      if (e1) throw e1
      const { error: e2 } = await supabase.rpc('create_request', {
        p_name: `${req.name} (copy)`,
        p_client: req.client_id,
        p_stage: req.stage_id,
        p_due: req.due_date,
        p_folder: req.folder,
        p_structure: structure as unknown as Json,
        p_brand: req.brand ?? 'swnz',
      })
      if (e2) throw e2
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.board }),
  })
}
