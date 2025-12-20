import React, {FC, useEffect, useMemo, useState} from 'react'
import {KTSVG} from '../../../../_metronic/helpers'
import {useAuth} from '../../auth'
import {toast} from 'react-toastify'

type RenderMode =
  | 'pdf'
  | 'image'
  | 'text'
  | 'audio'
  | 'video'
  | 'generic'
  | 'none'

const WRAP_STYLE: React.CSSProperties = {
  background: 'rgba(0,0,0,0.5)',
  position: 'fixed',
  inset: 0,
  zIndex: 2200,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const MODAL_CONTENT_STYLE: React.CSSProperties = {
  width: '75vw',
  height: '75vh',
  maxWidth: '1400px',
  maxHeight: '900px',
  display: 'flex',
  flexDirection: 'column',
}

const MODAL_BODY_STYLE: React.CSSProperties = {
  flex: '1 1 auto',
  overflowY: 'auto',
}


const detectModeByContentType = (ctype: string): RenderMode => {
  const ct = (ctype || '').toLowerCase()
  if (ct.includes('application/pdf')) return 'pdf'
  if (ct.startsWith('image/')) return 'image'
  if (ct.startsWith('audio/')) return 'audio'
  if (ct.startsWith('video/')) return 'video'
  if (ct.startsWith('text/') || ct.includes('application/json') || ct.includes('text/csv')) return 'text'
  return 'generic'
}

const getExt = (name?: string) => {
  if (!name) return ''
  const m = name.toLowerCase().match(/\.([a-z0-9]+)(?:\?|#|$)/)
  return m?.[1] || ''
}

const detectModeByExt = (ext: string): RenderMode => {
  if (!ext) return 'generic'
  if (ext === 'pdf') return 'pdf'
  if (['png','jpg','jpeg','gif','webp','bmp','svg'].includes(ext)) return 'image'
  if (['mp3','wav','ogg','m4a','aac','flac'].includes(ext)) return 'audio'
  if (['mp4','webm','ogg','mov','m4v','avi','mkv'].includes(ext)) return 'video'
  if (['txt','csv','json','log','md'].includes(ext)) return 'text'
  return 'generic'
}

export type FileViewerModalProps = {
  visible: boolean
  onClose: () => void
  title?: string
  fileName?: string

  /** Local file (from <input type="file">) */
  file?: File | null

  /** Remote view/download URLs (like manuals / defects) */
  viewUrl?: string
  downloadUrl?: string
}

export const FileViewerModal: FC<FileViewerModalProps> = ({
  visible,
  onClose,
  title,
  fileName,
  file,
  viewUrl,
  downloadUrl,
}) => {
  const {auth} = useAuth()
  const token = auth?.auth?.jwt

  const [srcUrl, setSrcUrl] = useState<string | null>(null)
  const [textPreview, setTextPreview] = useState<string | null>(null)
  const [contentType, setContentType] = useState<string>('application/octet-stream')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)

  const mode: RenderMode = useMemo(() => {
    if (file) {
      const ct = file.type || 'application/octet-stream'
      const byCT = detectModeByContentType(ct)
      if (byCT !== 'generic') return byCT
      const ext = getExt(file.name)
      return detectModeByExt(ext)
    }

    const byCT = detectModeByContentType(contentType)
    if (byCT !== 'generic') return byCT

    const ext = getExt(fileName)
    return detectModeByExt(ext)
  }, [file, contentType, fileName])

  useEffect(() => {
    let revokeUrl: string | null = null

    if (!visible) {
      setSrcUrl(null)
      setTextPreview(null)
      setError(null)
      return
    }

    const loadLocalFile = async () => {
      if (!file) return
      try {
        setLoading(true)
        setError(null)
        setTextPreview(null)
        setSrcUrl(null)

        // decide by file.type / extension if we should read as text
        const ext = getExt(file.name)
        const byExt = detectModeByExt(ext)
        const byCT = detectModeByContentType(file.type || 'application/octet-stream')
        const m = byCT !== 'generic' ? byCT : byExt

        if (m === 'text') {
          const txt = await file.text()
          setContentType(file.type || 'text/plain')
          setTextPreview(txt)
        } else {
          const url = URL.createObjectURL(file)
          revokeUrl = url
          setContentType(file.type || 'application/octet-stream')
          setSrcUrl(url)
        }
      } catch (e: any) {
        setError(e?.message || 'Failed to preview file')
      } finally {
        setLoading(false)
      }
    }

    const loadRemote = async () => {
      if (!viewUrl) return
      try {
        setLoading(true)
        setError(null)
        setTextPreview(null)
        setSrcUrl(null)

        const res = await fetch(viewUrl, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
        if (!res.ok) {
          throw new Error(`Failed to load file: ${res.status}`)
        }

        const ct = res.headers.get('content-type') || 'application/octet-stream'
        setContentType(ct)

        const blob = await res.blob()
        const m = detectModeByContentType(ct)
        if (m === 'text') {
          const txt = await blob.text()
          setTextPreview(txt)
        } else {
          const url = URL.createObjectURL(blob)
          revokeUrl = url
          setSrcUrl(url)
        }
      } catch (e: any) {
        setError(e?.message || 'Failed to load file')
      } finally {
        setLoading(false)
      }
    }

    if (file) {
      loadLocalFile()
    } else if (viewUrl) {
      loadRemote()
    } else {
      setError('No file to preview')
    }

    return () => {
      if (revokeUrl) URL.revokeObjectURL(revokeUrl)
    }
  }, [visible, file, viewUrl, token])

  const handleDownload = async () => {
    try {
      if (file) {
        // For local file, just trigger a browser download
        const url = URL.createObjectURL(file)
        const a = document.createElement('a')
        a.href = url
        a.download = file.name || fileName || 'download'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        return
      }

      if (!downloadUrl) return
      setDownloading(true)
      const res = await fetch(downloadUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      if (!res.ok) throw new Error(`Download failed: ${res.status}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName || 'download'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e: any) {
      toast.error(e?.message || 'Download failed')
    } finally {
      setDownloading(false)
    }
  }

    if (!visible) return null

  return (
    <div style={WRAP_STYLE} tabIndex={-1}>
      {/* Custom 75% wide / tall modal */}
      <div
        className='bg-white text-dark rounded shadow-lg d-flex flex-column '
        style={MODAL_CONTENT_STYLE}
      >
        {/* Header */}
        <div className='d-flex align-items-center justify-content-between border-bottom px-4 py-3 flex-shrink-0 mx-6 mt-6'>
          <div className='d-flex align-items-center'>
            <KTSVG
              path='/media/icons/duotune/files/fil003.svg'
              className='svg-icon-2 text-primary me-2'
            />
            <div>
              <h5 className='modal-title text-dark mb-0'>
                {title || 'File Viewer'}
              </h5>
              {/* You can uncomment if you want filename under title */}
              {/* {fileName && (
                <div className='text-muted fs-8 text-truncate'>{fileName}</div>
              )} */}
            </div>
          </div>
          <button type='button' className='btn-close mx-6' onClick={onClose} />
        </div>

        {/* Scrollable body */}
        <div
          className='flex-grow-1 overflow-auto px-4 py-3'
          style={MODAL_BODY_STYLE}
        >
          {loading && (
            <div
              className='d-flex justify-content-center align-items-center'
              style={{minHeight: '200px'}}
            >
              <div className='spinner-border' role='status'>
                <span className='visually-hidden'>Loading...</span>
              </div>
            </div>
          )}

          {!loading && error && (
            <div className='alert alert-danger mb-0'>
              {error}
            </div>
          )}

          {!loading && !error && (
            <>
              {mode === 'pdf' && srcUrl && (
                <iframe
                  src={srcUrl}
                  title='PDF Preview'
                  style={{width: '100%', height: '70vh', border: 'none'}}
                />
              )}

              {mode === 'image' && srcUrl && (
                <div className='d-flex justify-content-center'>
                  <img
                    src={srcUrl}
                    alt='Preview'
                    style={{maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain'}}
                  />
                </div>
              )}

              {mode === 'audio' && srcUrl && (
                <div className='d-flex justify-content-center'>
                  <audio controls src={srcUrl} style={{width: '100%'}} />
                </div>
              )}

              {mode === 'video' && srcUrl && (
                <div className='d-flex justify-content-center'>
                  <video
                    controls
                    src={srcUrl}
                    style={{width: '100%', maxHeight: '70vh'}}
                  />
                </div>
              )}

              {mode === 'text' && (textPreview || srcUrl) && (
                <div
                  className='border rounded p-2 bg-light'
                  style={{
                    maxHeight: '70vh',
                    overflow: 'auto',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {textPreview || 'Text preview not available.'}
                </div>
              )}

              {mode === 'generic' && (
                <div className='alert alert-info mb-0'>
                  Inline preview is not available for this file type.{' '}
                  Please use the <strong>Download</strong> button.
                </div>
              )}
            </>
          )}
        </div>

               {/* Footer */}
        <div className='border-top d-flex justify-content-end gap-2 px-4 py-3 flex-shrink-0'>
          <button
            type='button'
            className='btn btn-light btn-sm'
            onClick={onClose}
          >
            Close
          </button>
          {(file || downloadUrl) && (
            <button
              type='button'
              className='btn btn-primary btn-sm'
              onClick={handleDownload}
              disabled={downloading}
            >
              {downloading ? 'Downloading...' : 'Download'}
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
