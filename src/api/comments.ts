import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { CommentRow } from '../lib/database.types'
import { qk } from './keys'

export function useComments(requestId: string, fieldId?: string | null) {
  return useQuery({
    queryKey: [...qk.comments(requestId), fieldId ?? 'all'],
    queryFn: async (): Promise<CommentRow[]> => {
      let q = supabase.from('comments').select('*').eq('request_id', requestId).order('created_at')
      if (fieldId) q = q.eq('field_id', fieldId)
      const { data, error } = await q
      if (error) throw error
      return data ?? []
    },
  })
}

export function useAddComment(requestId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ fieldId, body, authorName }: { fieldId: string | null; body: string; authorName: string }) => {
      const { data: auth } = await supabase.auth.getUser()
      const { error } = await supabase.from('comments').insert({
        request_id: requestId,
        field_id: fieldId,
        author_type: 'team',
        author_id: auth.user?.id ?? null,
        author_name: authorName,
        body,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.comments(requestId) }),
  })
}
