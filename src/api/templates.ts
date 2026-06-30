import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Structure, TemplateRow } from '../lib/database.types'
import { qk } from './keys'

export function useTemplates() {
  return useQuery({
    queryKey: qk.templates,
    queryFn: async (): Promise<TemplateRow[]> => {
      const { data, error } = await supabase.from('templates').select('*').order('updated_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

export function useCreateTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { name: string; description?: string; structure: Structure }) => {
      const { data, error } = await supabase.from('templates').insert(input).select('*').single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.templates }),
  })
}

export function useDeleteTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('templates').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.templates }),
  })
}
