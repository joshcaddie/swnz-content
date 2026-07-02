import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { ProfileRow } from '../lib/database.types'
import { qk } from './keys'

export function useProfiles() {
  return useQuery({
    queryKey: qk.profiles,
    queryFn: async (): Promise<ProfileRow[]> => {
      const { data, error } = await supabase.from('profiles').select('*').order('name')
      if (error) throw error
      return data ?? []
    },
  })
}
