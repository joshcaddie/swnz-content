import { useNavigate } from 'react-router-dom'
import { useTemplates, useDeleteTemplate } from '../api/templates'
import { C, formatDate } from '../theme'
import { FullScreenMessage } from '../App'

export function TemplatesPage() {
  const navigate = useNavigate()
  const { data: templates, isLoading } = useTemplates()
  const del = useDeleteTemplate()

  if (isLoading) return <FullScreenMessage text="Loading templates…" />

  const fieldCount = (structure: { pages?: { sections?: { fields?: unknown[] }[] }[] }) =>
    (structure.pages ?? []).reduce(
      (n, p) => n + (p.sections ?? []).reduce((m, s) => m + (s.fields?.length ?? 0), 0),
      0,
    )

  return (
    <div className="swnz-scroll" style={{ flex: 1, overflowY: 'auto', padding: '28px 36px 60px' }}>
      <div style={{ display: 'flex', alignItems: 'center', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ fontWeight: 800, fontSize: 30, color: C.inkDark, flex: 1 }}>Templates</div>
        <div onClick={() => navigate('/requests/new')} style={{ background: C.navy2, color: '#fff', fontWeight: 800, fontSize: 13, letterSpacing: '0.5px', padding: '13px 22px', borderRadius: 26, cursor: 'pointer' }}>NEW REQUEST</div>
      </div>
      <div style={{ color: C.muted, fontSize: 15, maxWidth: 1100, margin: '6px auto 0' }}>
        Reusable request structures. Use one to start a new request, or save any request as a template from its builder.
      </div>

      <div style={{ maxWidth: 1100, margin: '24px auto 0', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 22 }}>
        {(templates ?? []).map((t) => (
          <div key={t.id} style={{ background: '#fff', border: '1px solid #e9e8ee', borderRadius: 14, padding: 24, minHeight: 200, display: 'flex', flexDirection: 'column', boxShadow: '0 2px 8px rgba(40,30,60,.05)' }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <div style={{ width: 56, height: 56, borderRadius: 12, background: '#e7f5f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flex: 'none' }}>🏠</div>
              <div style={{ fontWeight: 800, fontSize: 19, color: C.inkDark, lineHeight: 1.3 }}>{t.name}</div>
            </div>
            <div style={{ color: C.muted2, fontSize: 15, marginTop: 14, flex: 1 }}>{t.description || 'No description provided.'}</div>
            <div style={{ color: '#b5b1bd', fontSize: 13, marginBottom: 12 }}>
              {fieldCount(t.structure)} fields · Updated {formatDate(t.updated_at)}
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <span onClick={() => navigate(`/requests/new?template=${t.id}`)} style={{ color: C.cyan, fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>Use template</span>
              <span onClick={() => { if (confirm(`Delete template "${t.name}"?`)) del.mutate(t.id) }} style={{ color: '#c9491f', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Delete</span>
            </div>
          </div>
        ))}
        {(templates ?? []).length === 0 && (
          <div style={{ color: C.muted, fontSize: 16 }}>No templates yet.</div>
        )}
      </div>
    </div>
  )
}
