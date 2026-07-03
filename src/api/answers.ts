import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Json } from '../lib/database.types'
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
    /**
     * Team-side save of an answer value. Upserts by field_id so it only touches
     * value+updated_at — each field is its own row, so two people editing
     * different fields never overwrite each other. Does not refetch the request
     * (would clobber in-progress edits); only nudges the board progress.
     */
    saveValue: async (fieldId: string, value: Json) => {
      const { error } = await supabase
        .from('answers')
        .upsert(
          { request_id: requestId, field_id: fieldId, value, updated_at: new Date().toISOString() },
          { onConflict: 'field_id' },
        )
      if (error) throw error
      qc.invalidateQueries({ queryKey: qk.board })
    },
  }
}
