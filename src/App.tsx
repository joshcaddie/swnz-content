import { useState, useCallback } from 'react'
import type { AppState, Detail, OptKey } from './types'
import { TopChrome } from './components/TopChrome'
import { Board } from './components/Board'
import { OrangaDetail } from './components/OrangaDetail'
import { RossDetail } from './components/RossDetail'
import { Wizard } from './components/Wizard'
import { FieldModal } from './components/FieldModal'

const initialState: AppState = {
  screen: 'board',
  detail: 'oranga',
  qaOpen: false,
  step: 1,
  activePage: 0,
  activeSection: 0,
  fieldModal: false,
  opts: { instructions: false, repeatable: false, conditions: false },
  pages: [
    {
      name: 'Home',
      sections: [
        {
          name: 'Homepage welcome text',
          fields: [
            { label: 'Text for this page', icon: '✎' },
            { label: 'Images for this page', icon: '🖼', tag: 'Multi Answer: 9' },
          ],
        },
      ],
    },
    { name: 'Our School/About Us', sections: [] },
    { name: 'News & Events', sections: [] },
    { name: 'Contact', sections: [] },
  ],
}

export default function App() {
  const [state, setState] = useState<AppState>(initialState)

  const goBoard = useCallback(() => {
    setState((s) => ({ ...s, screen: 'board', qaOpen: false, fieldModal: false }))
  }, [])

  const openDetail = useCallback((detail: Detail) => {
    setState((s) => ({ ...s, screen: 'detail', detail }))
  }, [])

  const toggleQA = useCallback(() => {
    setState((s) => ({ ...s, qaOpen: !s.qaOpen }))
  }, [])

  const startWizard = useCallback(() => {
    setState((s) => ({ ...s, screen: 'wizard', step: 1, qaOpen: false }))
  }, [])

  const gotoStep = useCallback((n: number) => {
    setState((s) => ({ ...s, step: n }))
  }, [])

  const back = useCallback(() => {
    setState((s) => (s.step > 1 ? { ...s, step: s.step - 1 } : { ...s, screen: 'board' }))
  }, [])

  const selectPage = useCallback((i: number) => {
    setState((s) => ({ ...s, activePage: i, activeSection: 0 }))
  }, [])

  const addPage = useCallback(() => {
    setState((s) => ({ ...s, pages: [...s.pages, { name: 'Untitled page', sections: [] }] }))
  }, [])

  const addSection = useCallback(() => {
    setState((s) => ({
      ...s,
      pages: s.pages.map((p, i) =>
        i === s.activePage
          ? { ...p, sections: [...p.sections, { name: 'Untitled section', fields: [] }] }
          : p,
      ),
    }))
  }, [])

  const openFieldModal = useCallback(() => setState((s) => ({ ...s, fieldModal: true })), [])
  const closeFieldModal = useCallback(() => setState((s) => ({ ...s, fieldModal: false })), [])

  const addField = useCallback((label: string, icon: string) => {
    setState((s) => {
      const pages = s.pages.map((p, pi) => {
        if (pi !== s.activePage) return p
        const sections = p.sections.length ? [...p.sections] : [{ name: 'Untitled section', fields: [] }]
        const idx = Math.min(s.activeSection, sections.length - 1)
        sections[idx] = { ...sections[idx], fields: [...sections[idx].fields, { label, icon }] }
        return { ...p, sections }
      })
      return { ...s, pages, fieldModal: false }
    })
  }, [])

  const toggleOpt = useCallback((k: OptKey) => {
    setState((s) => ({ ...s, opts: { ...s.opts, [k]: !s.opts[k] } }))
  }, [])

  const isDetail = state.screen === 'detail'

  return (
    <div style={{ minHeight: '100vh', background: '#eef0f3', display: 'flex', flexDirection: 'column' }}>
      <TopChrome qaOpen={state.qaOpen} onLogo={goBoard} onToggleQA={toggleQA} onAddRequest={startWizard} />

      {state.screen === 'board' && <Board onOpen={openDetail} />}

      {isDetail && state.detail === 'oranga' && <OrangaDetail onBack={goBoard} />}
      {isDetail && state.detail === 'ross' && <RossDetail onBack={goBoard} />}

      {state.screen === 'wizard' && (
        <Wizard
          state={state}
          onBack={back}
          onGotoStep={gotoStep}
          onGoBoard={goBoard}
          onSelectPage={selectPage}
          onAddPage={addPage}
          onAddSection={addSection}
          onOpenFieldModal={openFieldModal}
          onToggleOpt={toggleOpt}
        />
      )}

      {state.fieldModal && <FieldModal onClose={closeFieldModal} onPick={addField} />}
    </div>
  )
}
