import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import type { FieldConfig, FieldType, Structure } from '../lib/database.types'
import { useRequest } from '../api/requests'
import { useSaveAsTemplate } from '../api/templates'
import { supabase } from '../lib/supabase'
import { qk } from '../api/keys'
import { FieldModal } from '../components/FieldModal'
import { StructureBuilder, newFieldKey, needsOptions, type BuilderApi } from '../components/StructureBuilder'
import { C } from '../theme'
import { FullScreenMessage } from '../App'

/**
 * Edit the structure of an EXISTING request. Text edits apply locally at once and
 * flush to the DB debounced; add/delete ops write immediately and re-sync.
 */
export function RequestBuilderPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data, isLoading } = useRequest(id)
  const saveTemplate = useSaveAsTemplate()

  const [structure, setStructure] = useState<Structure | null>(null)
  const [activePage, setActivePage] = useState(0)
  const [sel, setSel] = useState<{ si: number; fi: number } | null>(null)
  const [fieldModal, setFieldModal] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)

  // Index maps: structure position -> DB row ids (rebuilt whenever server data changes).
  const maps = useMemo(() => {
    if (!data) return null
    const pageIds = data.pages.map((p) => p.id)
    const sectionIds = data.pages.map((p) => data.sections.filter((s) => s.page_id === p.id).map((s) => s.id))
    const fieldIds = data.pages.map((p) =>
      data.sections.filter((s) => s.page_id === p.id).map((s) => data.fields.filter((f) => f.section_id === s.id).map((f) => f.id)),
    )
    return { pageIds, sectionIds, fieldIds }
  }, [data])

  // Rebuild the editable structure from server rows.
  useEffect(() => {
    if (!data) return
    setStructure({
      pages: data.pages.map((p) => ({
        name: p.name,
        sections: data.sections
          .filter((s) => s.page_id === p.id)
          .map((s) => ({
            name: s.name,
            instructions: s.instructions,
            repeatable: s.repeatable,
            fields: data.fields
              .filter((f) => f.section_id === s.id)
              .map((f) => ({ type: f.type, label: f.label, tag: f.tag ?? undefined, config: { ...f.config, key: f.config?.key ?? f.id } })),
          })),
        indent: p.indent ?? 0,
        navOnly: !!p.nav_only,
      })),
    })
  }, [data])

  // Debounced writer: one timer per row+kind so rapid typing coalesces.
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const write = (key: string, fn: () => PromiseLike<unknown>) => {
    const t = timers.current.get(key)
    if (t) clearTimeout(t)
    timers.current.set(
      key,
      setTimeout(async () => {
        timers.current.delete(key)
        await fn()
        setSavedAt(new Date().toLocaleTimeString())
      }, 600),
    )
  }
  const refresh = () => qc.invalidateQueries({ queryKey: qk.request(id) })

  const local = (fn: (s: Structure) => void) =>
    setStructure((s) => {
      if (!s) return s
      const copy = JSON.parse(JSON.stringify(s)) as Structure
      fn(copy)
      return copy
    })

  if (isLoading || !data || !structure || !maps) return <FullScreenMessage text="Loading builder…" />

  const pid = (pi: number) => maps.pageIds[pi]
  const sid = (si: number) => maps.sectionIds[activePage]?.[si]
  const fid = (si: number, fi: number) => maps.fieldIds[activePage]?.[si]?.[fi]
  const hasAnswer = (si: number, fi: number) => data.answers.some((a) => a.field_id === fid(si, fi))

  const api: BuilderApi = {
    addPage: async () => {
      await supabase.from('request_pages').insert({ request_id: id, name: 'Untitled page', position: data.pages.length })
      await refresh()
    },
    addPages: async (newPages) => {
      // Batched: all pages → their sections → all fields, three round-trips total.
      const startPos = data.pages.length
      const { data: pageRows, error: pErr } = await supabase
        .from('request_pages')
        .insert(newPages.map((pg, i) => ({ request_id: id, name: pg.name, position: startPos + i, indent: pg.indent ?? 0, nav_only: !!pg.navOnly })))
        .select('id, position')
      if (pErr || !pageRows) { alert(`Could not create pages: ${pErr?.message}`); return }
      const pageIdAt = (i: number) => pageRows.find((r) => r.position === startPos + i)!.id

      const sectionInserts = newPages.flatMap((pg, i) =>
        pg.sections.map((sec, si) => ({ page_id: pageIdAt(i), name: sec.name, instructions: sec.instructions ?? null, repeatable: !!sec.repeatable, position: si })),
      )
      const { data: secRows, error: sErr } = await supabase
        .from('request_sections')
        .insert(sectionInserts)
        .select('id, page_id, position')
      if (sErr || !secRows) { alert(`Could not create sections: ${sErr?.message}`); return }

      const fieldInserts = newPages.flatMap((pg, i) =>
        pg.sections.flatMap((sec, si) => {
          const secRow = secRows.find((r) => r.page_id === pageIdAt(i) && r.position === si)!
          return sec.fields.map((f, fi) => ({
            section_id: secRow.id, type: f.type, label: f.label, tag: f.tag ?? null, config: f.config ?? {}, position: fi,
          }))
        }),
      )
      if (fieldInserts.length) {
        const { error: fErr } = await supabase.from('request_fields').insert(fieldInserts)
        if (fErr) { alert(`Could not create fields: ${fErr.message}`); return }
      }
      await refresh()
    },
    renamePage: (pi, v) => {
      local((s) => { s.pages[pi].name = v })
      const rowId = pid(pi)
      write(`page-${rowId}`, () => supabase.from('request_pages').update({ name: v }).eq('id', rowId))
    },
    patchPage: async (pi, patch) => {
      const rowId = pid(pi)
      if (patch.navOnly) {
        const secIds = maps.sectionIds[pi] ?? []
        const pageFields = data.fields.filter((f) => secIds.includes(f.section_id))
        const answered = data.answers.some((a) => pageFields.some((f) => f.id === a.field_id))
        const warn = answered
          ? 'Make this a navigation label only? Its sections, fields AND the client answers on them will be removed.'
          : pageFields.length > 0
            ? 'Make this a navigation label only? Its sections and fields will be removed.'
            : null
        if (warn && !confirm(warn)) return
        if (secIds.length) await supabase.from('request_sections').delete().in('id', secIds)
      }
      const upd: { nav_only?: boolean; indent?: number } = {}
      if (patch.navOnly !== undefined) upd.nav_only = patch.navOnly
      if (patch.indent !== undefined) upd.indent = patch.indent
      await supabase.from('request_pages').update(upd).eq('id', rowId)
      setSel(null)
      await refresh()
    },
    deletePage: async (pi) => {
      if (!confirm('Delete this page and everything in it? Client answers on its fields will be removed.')) return
      await supabase.from('request_pages').delete().eq('id', pid(pi))
      setActivePage(0); setSel(null)
      await refresh()
    },
    addSection: async () => {
      const count = maps.sectionIds[activePage]?.length ?? 0
      await supabase.from('request_sections').insert({ page_id: pid(activePage), name: 'Untitled section', position: count })
      await refresh()
    },
    renameSection: (si, v) => {
      local((s) => { s.pages[activePage].sections[si].name = v })
      const rowId = sid(si)
      write(`sec-${rowId}`, () => supabase.from('request_sections').update({ name: v }).eq('id', rowId))
    },
    patchSection: (si, patch) => {
      local((s) => { Object.assign(s.pages[activePage].sections[si], patch) })
      const rowId = sid(si)
      write(`secp-${rowId}`, () => supabase.from('request_sections').update(patch).eq('id', rowId))
    },
    deleteSection: async (si) => {
      if (!confirm('Delete this section and its fields? Client answers on them will be removed.')) return
      await supabase.from('request_sections').delete().eq('id', sid(si))
      setSel(null)
      await refresh()
    },
    deleteField: async (si, fi) => {
      const warn = hasAnswer(si, fi) ? 'This field already has a client answer — deleting it removes the answer too. Delete?' : 'Delete this field?'
      if (!confirm(warn)) return
      await supabase.from('request_fields').delete().eq('id', fid(si, fi))
      setSel(null)
      await refresh()
    },
    patchField: (si, fi, patch) => {
      local((s) => { Object.assign(s.pages[activePage].sections[si].fields[fi], patch) })
      const rowId = fid(si, fi)
      const upd: { label?: string; tag?: string | null } = {}
      if (patch.label !== undefined) upd.label = patch.label
      if (patch.tag !== undefined) upd.tag = patch.tag ?? null
      write(`fld-${rowId}`, () => supabase.from('request_fields').update(upd).eq('id', rowId))
    },
    patchConfig: (si, fi, patch) => {
      let nextCfg: FieldConfig = {}
      local((s) => {
        const f = s.pages[activePage].sections[si].fields[fi]
        const merged: FieldConfig = { ...(f.config ?? {}), ...patch }
        const cleaned: FieldConfig = {}
        for (const [k, v] of Object.entries(merged)) if (v !== undefined) cleaned[k] = v
        f.config = cleaned
        nextCfg = cleaned
      })
      const rowId = fid(si, fi)
      write(`cfg-${rowId}`, () => supabase.from('request_fields').update({ config: nextCfg }).eq('id', rowId))
    },
    changeType: (si, fi, type: FieldType) => {
      let nextCfg: FieldConfig = {}
      local((s) => {
        const f = s.pages[activePage].sections[si].fields[fi]
        f.type = type
        if (needsOptions(type) && !(f.config?.options?.length)) f.config = { ...(f.config ?? {}), options: ['Option 1', 'Option 2'] }
        nextCfg = f.config ?? {}
      })
      const rowId = fid(si, fi)
      write(`typ-${rowId}`, () => supabase.from('request_fields').update({ type, config: nextCfg }).eq('id', rowId))
    },
    bulkAddFields: async (pageIndices, fields) => {
      for (const pi of pageIndices) {
        let sectionRow = maps.sectionIds[pi]?.[maps.sectionIds[pi].length - 1]
        if (!sectionRow) {
          const { data: sec } = await supabase.from('request_sections').insert({ page_id: pid(pi), name: 'Page content', position: 0 }).select('id').single()
          sectionRow = sec!.id
        }
        const count = data.fields.filter((f) => f.section_id === sectionRow).length
        const inserts = fields.map((f, i) => ({
          section_id: sectionRow, type: f.type, label: f.label, tag: f.tag ?? null,
          config: { ...(f.config ?? {}), key: newFieldKey() }, position: count + i,
        }))
        const { error } = await supabase.from('request_fields').insert(inserts)
        if (error) { alert(`Could not add fields: ${error.message}`); return }
      }
      await refresh()
    },
    bulkRenameFields: async (targets, name) => {
      const ids = targets.map((t) => maps.fieldIds[t.pi]?.[t.si]?.[t.fi]).filter(Boolean)
      if (ids.length) {
        const { error } = await supabase.from('request_fields').update({ label: name }).in('id', ids as string[])
        if (error) { alert(`Could not rename: ${error.message}`); return }
      }
      await refresh()
    },
  }

  const addField = async (type: FieldType, label: string) => {
    const secCount = maps.sectionIds[activePage]?.length ?? 0
    let sectionRow = sel ? sid(Math.min(sel.si, secCount - 1)) : maps.sectionIds[activePage]?.[secCount - 1]
    if (!sectionRow) {
      const { data: sec } = await supabase
        .from('request_sections')
        .insert({ page_id: pid(activePage), name: 'Untitled section', position: 0 })
        .select('id')
        .single()
      sectionRow = sec!.id
    }
    const count = data.fields.filter((f) => f.section_id === sectionRow).length
    const config: FieldConfig = { key: newFieldKey(), ...(needsOptions(type) ? { options: ['Option 1', 'Option 2'] } : {}) }
    await supabase.from('request_fields').insert({ section_id: sectionRow, type, label, config, position: count })
    await refresh()
  }

  const doSaveTemplate = async () => {
    const tplName = prompt('Template name', data.request.name)
    if (!tplName) return
    await saveTemplate.mutateAsync({ requestId: id, name: tplName })
    alert('Saved as template — it now appears in Templates and the wizard.')
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: C.panel }}>
      <div style={{ background: '#fff', borderBottom: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', padding: '14px 26px', gap: 16, flex: 'none' }}>
        <div onClick={() => navigate(`/requests/${id}`)} style={{ width: 44, height: 44, borderRadius: '50%', background: '#fff', border: '1px solid #e1e0e7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6f6a7a', fontSize: 19, cursor: 'pointer', flex: 'none', boxShadow: '0 2px 5px rgba(0,0,0,.05)' }}>‹</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 20, color: C.inkDark }}>Edit structure — {data.request.name}</div>
          <div style={{ color: C.muted2, fontSize: 13 }}>{savedAt ? `Changes saved automatically · last saved ${savedAt}` : 'Changes save automatically'}</div>
        </div>
        <div style={{ flex: 1 }} />
        <div onClick={doSaveTemplate} style={{ border: `1.5px solid ${C.navy2}`, color: C.navy2, fontWeight: 800, fontSize: 13, letterSpacing: '0.5px', padding: '12px 20px', borderRadius: 24, cursor: 'pointer' }}>SAVE AS TEMPLATE</div>
        <div onClick={() => navigate(`/requests/${id}`)} style={{ background: C.navy2, color: '#fff', fontWeight: 800, fontSize: 13, letterSpacing: '0.5px', padding: '13px 22px', borderRadius: 26, cursor: 'pointer' }}>DONE</div>
      </div>

      <StructureBuilder
        structure={structure}
        name={data.request.name}
        activePage={activePage}
        setActivePage={(i) => { setActivePage(i); setSel(null) }}
        sel={sel}
        setSel={setSel}
        api={api}
        openFieldModal={() => setFieldModal(true)}
      />

      {fieldModal && <FieldModal onClose={() => setFieldModal(false)} onPick={(t, l) => { addField(t, l); setFieldModal(false) }} />}
    </div>
  )
}
