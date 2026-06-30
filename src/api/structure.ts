import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { FieldConfig, FieldType } from '../lib/database.types'
import { qk } from './keys'

/** Builder mutations for a single request. Each op refreshes the request query. */
export function useBuilder(requestId: string) {
  const qc = useQueryClient()
  const refresh = () => qc.invalidateQueries({ queryKey: qk.request(requestId) })

  async function nextPos(table: 'request_pages' | 'request_sections' | 'request_fields', col: string, parent: string) {
    const { data } = await supabase.from(table).select('position').eq(col, parent).order('position', { ascending: false }).limit(1)
    return (data?.[0]?.position ?? -1) + 1
  }

  return {
    addPage: async (name = 'Untitled page') => {
      const position = await nextPos('request_pages', 'request_id', requestId)
      const { data, error } = await supabase
        .from('request_pages')
        .insert({ request_id: requestId, name, position })
        .select('id')
        .single()
      if (error) throw error
      await refresh()
      return data.id
    },
    renamePage: async (id: string, name: string) => {
      const { error } = await supabase.from('request_pages').update({ name }).eq('id', id)
      if (error) throw error
      await refresh()
    },
    deletePage: async (id: string) => {
      const { error } = await supabase.from('request_pages').delete().eq('id', id)
      if (error) throw error
      await refresh()
    },
    addSection: async (pageId: string, name = 'Untitled section') => {
      const position = await nextPos('request_sections', 'page_id', pageId)
      const { data, error } = await supabase
        .from('request_sections')
        .insert({ page_id: pageId, name, position })
        .select('id')
        .single()
      if (error) throw error
      await refresh()
      return data.id
    },
    updateSection: async (id: string, patch: { name?: string; instructions?: string | null; repeatable?: boolean; conditions?: boolean }) => {
      const { error } = await supabase.from('request_sections').update(patch).eq('id', id)
      if (error) throw error
      await refresh()
    },
    deleteSection: async (id: string) => {
      const { error } = await supabase.from('request_sections').delete().eq('id', id)
      if (error) throw error
      await refresh()
    },
    addField: async (sectionId: string, type: FieldType, label: string, config: FieldConfig = {}, tag?: string) => {
      const position = await nextPos('request_fields', 'section_id', sectionId)
      const { error } = await supabase
        .from('request_fields')
        .insert({ section_id: sectionId, type, label, config, tag: tag ?? null, position })
      if (error) throw error
      await refresh()
    },
    updateField: async (id: string, patch: { label?: string; config?: FieldConfig; tag?: string | null }) => {
      const { error } = await supabase.from('request_fields').update(patch).eq('id', id)
      if (error) throw error
      await refresh()
    },
    deleteField: async (id: string) => {
      const { error } = await supabase.from('request_fields').delete().eq('id', id)
      if (error) throw error
      await refresh()
    },
  }
}
