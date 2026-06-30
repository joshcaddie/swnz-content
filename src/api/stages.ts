import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { StageRow } from '../lib/database.types'
import { qk } from './keys'

export function useStages() {
  return useQuery({
    queryKey: qk.stages,
    queryFn: async (): Promise<StageRow[]> => {
      const { data, error } = await supabase.from('stages').select('*').order('position')
      if (error) throw error
      return data ?? []
    },
  })
}
