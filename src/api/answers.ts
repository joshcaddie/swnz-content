import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { qk } from './keys'

/** Team review actions on a request's answers. */
export function useReview(requestId: string) {
  const qc = useQueryClient()
  const refresh = () => {
    qc.invalidateQueries({ queryKey: qk.request(requestId) })
    qc.invalidateQueries({ queryKey: qk.board })
  }

  return {
    approve: async (answerId: string) => {
      const { error } = await supabase
        .from('answers')
        .update({ status: 'approved', approved_at: new Date().toISOString() })
        .eq('id', answerId)
      if (error) throw error
      await refresh()
    },
    requestChanges: async (answerId: string) => {
      const { error } = await supabase
        .from('answers')
        .update({ status: 'changes_requested', approved_at: null })
        .eq('id', answerId)
      if (error) throw error
      await refresh()
    },
    approveAllSubmitted: async () => {
      const { error } = await supabase
        .from('answers')
        .update({ status: 'approved', approved_at: new Date().toISOString() })
        .eq('request_id', requestId)
        .eq('status', 'submitted')
      if (error) throw error
      await refresh()
    },
  }
}
