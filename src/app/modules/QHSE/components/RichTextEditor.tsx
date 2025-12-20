import React, {FC, useMemo} from 'react'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'

type Props = {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  invalid?: boolean
  height?: number | string
}

/**
 * WYSIWYG editor that returns clean HTML (string).
 * Keeps toolbar simple for end users.
 */
export const RichTextEditor: FC<Props> = ({
  value,
  onChange,
  placeholder = 'Type remarks…',
  invalid = false,
  height = 220,
}) => {
  const modules = useMemo(() => ({
    toolbar: [
      [{ header: [false, 2, 3] }],
      ['bold', 'italic', 'underline'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link', 'blockquote'],
      ['clean'],
    ],
    clipboard: { matchVisual: true },
  }), [])

  const formats = useMemo(() => [
    'header',
    'bold', 'italic', 'underline',
    'list', 'bullet',
    'link', 'blockquote'
  ], [])

  return (
    <div className={`quill-wrapper ${invalid ? 'is-invalid' : ''}`}>
      <ReactQuill
        theme="snow"
        value={value || ''}
        onChange={onChange}
        placeholder={placeholder}
        modules={modules}
        formats={formats}
        style={{ height }}
      />
      {/* make it look like a bootstrap control */}
      <style>{`
        .quill-wrapper .ql-container {
          border-radius: .475rem;
          color: #1f1f1f;
          background: #fff;
        }
        .quill-wrapper.is-invalid .ql-container,
        .quill-wrapper.is-invalid .ql-toolbar {
          border-color: #dc3545 !important;
        }
        .quill-wrapper .ql-toolbar {
          border-radius: .475rem .475rem 0 0;
        }
        .quill-wrapper .ql-container {
          border-radius: 0 0 .475rem .475rem;
        }
      `}</style>
    </div>
  )
}

export default RichTextEditor
