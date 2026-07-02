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

/** Snapshot an existing request's structure as a reusable template. */
export function useSaveAsTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ requestId, name, description }: { requestId: string; name: string; description?: string }) => {
      const { data: structure, error: e1 } = await supabase.rpc('request_structure', { p_request: requestId })
      if (e1) throw e1
      const { error: e2 } = await supabase
        .from('templates')
        .insert({ name, description: description ?? null, structure: structure as unknown as Structure })
      if (e2) throw e2
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
