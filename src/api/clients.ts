import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { ClientRow } from '../lib/database.types'
import { qk } from './keys'

export function useClients() {
  return useQuery({
    queryKey: qk.clients,
    queryFn: async (): Promise<ClientRow[]> => {
      const { data, error } = await supabase.from('clients').select('*').order('name')
      if (error) throw error
      return data ?? []
    },
  })
}

export function useCreateClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Partial<ClientRow>): Promise<ClientRow> => {
      const { data, error } = await supabase.from('clients').insert(input).select('*').single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.clients }),
  })
}

export function useUpdateClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<ClientRow> & { id: string }) => {
      const { error } = await supabase.from('clients').update(patch).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.clients }),
  })
}

export function useDeleteClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('clients').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.clients })
      qc.invalidateQueries({ queryKey: qk.board })
    },
  })
}
