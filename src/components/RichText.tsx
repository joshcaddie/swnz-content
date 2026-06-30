import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import { useEffect } from 'react'
import { C } from '../theme'

const toolBtn = (active: boolean): React.CSSProperties => ({
  cursor: 'pointer',
  color: active ? C.navy2 : '#9b95a5',
  fontWeight: 700,
  padding: '2px 6px',
  borderRadius: 5,
  background: active ? '#e9f5fc' : 'transparent',
  userSelect: 'none',
})

export function RichTextEditor({ value, onChange, placeholder }: { value: string; onChange: (html: string) => void; placeholder?: string }) {
  const editor = useEditor({
    extensions: [StarterKit, Link.configure({ openOnClick: false })],
    content: value || '',
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  })

  // Keep editor in sync if the value is replaced externally (e.g. loaded async).
  useEffect(() => {
    if (editor && value !== editor.getHTML()) editor.commands.setContent(value || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  if (!editor) return null

  return (
    <div style={{ border: '1px solid #e3e2e8', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 16px', borderBottom: '1px solid #ececf0', background: '#fbfbfc', fontSize: 16 }}>
        <div style={{ border: '1px solid #d8d6df', borderRadius: 6, padding: '6px 12px', color: '#4b4556', fontWeight: 600, fontSize: 15 }}>Normal ▾</div>
        <span style={{ ...toolBtn(editor.isActive('bold')), fontWeight: 800 }} onClick={() => editor.chain().focus().toggleBold().run()}>B</span>
        <span style={{ ...toolBtn(editor.isActive('italic')), fontStyle: 'italic' }} onClick={() => editor.chain().focus().toggleItalic().run()}>I</span>
        <span style={{ ...toolBtn(editor.isActive('strike')), textDecoration: 'line-through' }} onClick={() => editor.chain().focus().toggleStrike().run()}>S</span>
        <span style={toolBtn(editor.isActive('bulletList'))} onClick={() => editor.chain().focus().toggleBulletList().run()}>☰</span>
        <span style={toolBtn(editor.isActive('orderedList'))} onClick={() => editor.chain().focus().toggleOrderedList().run()}>≣</span>
        <span style={toolBtn(editor.isActive('heading', { level: 2 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H</span>
        <span style={toolBtn(false)} onClick={() => {
          const url = prompt('Link URL')
          if (url) editor.chain().focus().setLink({ href: url }).run()
        }}>🔗</span>
      </div>
      <EditorContent editor={editor} className="swnz-prose" />
      {!value && placeholder && (
        <div style={{ marginTop: -36, padding: '0 26px', color: '#a8a4b0', fontSize: 18, pointerEvents: 'none' }}>{placeholder}</div>
      )}
    </div>
  )
}

export function RichTextView({ html }: { html: string }) {
  return <div className="swnz-prose" dangerouslySetInnerHTML={{ __html: html || '<p style="color:#a8a4b0">No answer yet.</p>' }} />
}
