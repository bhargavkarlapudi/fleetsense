// ManualPlanViewer.tsx
import React, {FC, useEffect, useMemo, useState} from 'react'
import {KTSVG} from '../../../../_metronic/helpers'
import {useAuth} from '../../auth'
import {manualPlanDownloadUrl, manualPlanViewUrl} from '../core/_requests'
import {toast} from 'react-toastify'

type ManualLike = {
  id: number
  name: string
  uploadedDate: string
  file: { name: string }
  remarks?: string
}

const formatUploadDate = (dateStr?: string) =>
  dateStr ? new Date(dateStr).toLocaleDateString() : '-'

type RenderMode =
  | 'pdf'
  | 'image'
  | 'text'
  | 'audio'
  | 'video'
  | 'generic'  // no inline preview (e.g., xlsx, docx, zip, etc.)
  | 'none'

const detectMode = (ctype: string): RenderMode => {
  const ct = (ctype || '').toLowerCase()
  if (ct.includes('application/pdf')) return 'pdf'
  if (ct.startsWith('image/')) return 'image'
  if (ct.startsWith('audio/')) return 'audio'
  if (ct.startsWith('video/')) return 'video'
  if (ct.startsWith('text/') || ct.includes('application/json') || ct.includes('text/csv')) return 'text'
  return 'generic'
}

type ManualPlanViewerProps = {
  manual: ManualLike
  onClose: () => void
  /** When provided, viewer will fetch from these URLs instead of manualPlanViewUrl/manualPlanDownloadUrl */
  viewUrlOverride?: string
  downloadUrlOverride?: string
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
  // doc/docx/xls/xlsx/ppt/pptx, zip, etc → generic (download only)
  return 'generic'
}

const ManualPlanViewer: FC<ManualPlanViewerProps> = ({
  manual,
  onClose,
  viewUrlOverride,
  downloadUrlOverride,
}) => {
  const {auth} = useAuth()
  const token = auth?.auth?.jwt

  const [srcUrl, setSrcUrl] = useState<string | null>(null)
  const [textPreview, setTextPreview] = useState<string | null>(null)
  const [contentType, setContentType] = useState<string>('application/octet-stream')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)

  const mode: RenderMode = useMemo(() => {
  const byCT = detectMode(contentType)
  if (byCT !== 'generic') return byCT
  const ext = getExt(manual?.file?.name || manual?.name)
  return detectModeByExt(ext)
}, [contentType, manual?.file?.name, manual?.name])

  useEffect(() => {
    let revoke: string | null = null

    const loadBlob = async () => {
      try {
        setLoading(true)
        setError(null)
        setTextPreview(null)
        setSrcUrl(null)

        const viewUrl = viewUrlOverride ?? manualPlanViewUrl(manual.id)
const res = await fetch(viewUrl, {
  headers: token ? { Authorization: `Bearer ${token}` } : undefined,
})

        if (!res.ok) throw new Error(`Failed: ${res.status}`)

        const ct = res.headers.get('content-type') || 'application/octet-stream'
        setContentType(ct)

        const blob = await res.blob()
        // For text previews, read as text; else create object URL
        const currentMode = detectMode(ct)
        if (currentMode === 'text') {
          const text = await blob.text()
          setTextPreview(text)
        } else {
          const url = URL.createObjectURL(blob)
          revoke = url
          setSrcUrl(url)
        }
      } catch (e: any) {
        setError(e?.message || 'Failed to load file')
      } finally {
        setLoading(false)
      }
    }

    loadBlob()
    return () => {
      if (revoke) URL.revokeObjectURL(revoke)
    }
  }, [manual.id, token, viewUrlOverride])

  const handleOpenNewTab = () => {
    if (!srcUrl) return
    window.open(srcUrl, '_blank', 'noopener,noreferrer')
  }

  const filenameFromDisposition = (header?: string | null): string | null => {
    if (!header) return null
    // Try RFC 5987 format: filename*=
    const star = /filename\*\s*=\s*([^']*)'[^']*'([^;]+)/i.exec(header)
    if (star?.[2]) return decodeURIComponent(star[2])
    // Try simple filename=""
    const simple = /filename\s*=\s*"([^"]+)"/i.exec(header)
    if (simple?.[1]) return simple[1]
    // Try filename= without quotes
    const bare = /filename\s*=\s*([^;]+)/i.exec(header)
    if (bare?.[1]) return bare[1]
    return null
  }

  const handleDownload = async () => {
    try {
      setDownloading(true)
      const dlUrl = downloadUrlOverride ?? manualPlanDownloadUrl(manual.id)
const res = await fetch(dlUrl, {
  headers: token ? { Authorization: `Bearer ${token}` } : undefined,
})
      if (!res.ok) throw new Error(`Download failed: ${res.status}`)
      const ct = res.headers.get('content-type') || 'application/octet-stream'
      const cd = res.headers.get('content-disposition')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      // Prefer server-provided filename, else fall back to record/file name
      a.download = filenameFromDisposition(cd) || manual.file?.name || manual.name || 'download'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err: any) {
      toast.error(err?.message || 'Download failed')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#fff',
        zIndex: 2000,  // always above any modal/overlay
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div className='bg-light border-bottom px-3 py-2 d-flex justify-content-between align-items-center'>
        <div className='d-flex align-items-center'>
          <KTSVG path='/media/icons/duotune/files/fil021.svg' className='svg-icon-2 text-primary me-2' />
          <div>
            <h6 className='mb-0 fw-bold fs-7 text-truncate'>{manual.name}</h6>
            <span className='text-muted fs-8 d-none d-sm-inline'>
              {manual.file?.name || 'File'} • {formatUploadDate(manual.uploadedDate)}
            </span>
          </div>
        </div>
        <div className='d-flex align-items-center gap-2'>
          <button className='btn btn-sm btn-primary d-none d-sm-flex' onClick={handleDownload} disabled={downloading}>
            {downloading ? (
              <>
                <span className='spinner-border spinner-border-sm me-2' />
                Downloading...
              </>
            ) : (
              <>
                <KTSVG path='/media/icons/duotune/arrows/arr091.svg' className='svg-icon-4 me-1' />
                Download
              </>
            )}
          </button>
          <button className='btn btn-sm btn-secondary' onClick={onClose}>Close</button>
        </div>
      </div>

      {/* Content */}
      <div style={{flex: 1, overflow: 'hidden'}}>
        {loading ? (
          <div className='d-flex justify-content-center align-items-center h-100'>
            <div className='spinner-border text-primary' role='status'><span className='visually-hidden'>Loading...</span></div>
          </div>
        ) : error ? (
          <div className='d-flex flex-column justify-content-center align-items-center h-100 text-center px-3'>
            <KTSVG path='/media/icons/duotune/general/gen040.svg' className='svg-icon-4x text-danger mb-3' />
            <h5 className='text-danger mb-2'>Failed to load file</h5>
            <p className='text-muted mb-4'>{error}</p>
            <div className='d-flex gap-2'>
              <button className='btn btn-primary' onClick={handleDownload}>Download</button>
              {/* <button className='btn btn-light' onClick={handleOpenNewTab} disabled={!srcUrl}>Open in new tab</button> */}
              <button className='btn btn-secondary' onClick={onClose}>Close</button>
            </div>
          </div>
        ) : (
          <>
            {mode === 'pdf' && srcUrl && (
              <>
                {/* Desktop */}
                <iframe src={srcUrl} title={manual.name} style={{width: '100%', height: '100%', border: 'none'}} className='d-none d-md-block' />
                {/* Mobile */}
                <iframe src={`${srcUrl}#toolbar=0`} title={manual.name} style={{width: '100%', height: '100%', border: 'none'}} className='d-block d-md-none' />
              </>
            )}

            {mode === 'image' && srcUrl && (
              <div className='h-100 w-100 d-flex justify-content-center align-items-center p-3'>
                <img src={srcUrl} alt={manual.name} style={{maxWidth: '100%', maxHeight: '100%', objectFit: 'contain'}} />
              </div>
            )}

            {mode === 'audio' && srcUrl && (
              <div className='h-100 w-100 d-flex justify-content-center align-items-center p-3'>
                <audio controls src={srcUrl} style={{width: '100%'}} />
              </div>
            )}

            {mode === 'video' && srcUrl && (
              <div className='h-100 w-100 d-flex justify-content-center align-items-center p-3'>
                <video controls src={srcUrl} style={{maxWidth: '100%', maxHeight: '100%'}} />
              </div>
            )}

            {mode === 'text' && (
              <div className='h-100 w-100 p-3' style={{overflow: 'auto', whiteSpace: 'pre-wrap', fontFamily: 'monospace'}}>
                <pre className='mb-0'>{textPreview}</pre>
              </div>
            )}

            {mode === 'generic' && (
              <div className='d-flex flex-column justify-content-center align-items-center h-100 text-center px-3'>
                <KTSVG path='/media/icons/duotune/files/fil003.svg' className='svg-icon-4x text-primary mb-3' />
                <h5 className='mb-2'>Preview not available</h5>
                <p className='text-muted mb-4'>
                  We can’t preview this file type in the browser. You can download it.
                </p>
                <div className='d-flex gap-2'>
                  <button className='btn btn-primary' onClick={handleDownload}>Download</button>
                  {/* <button className='btn btn-light' onClick={handleOpenNewTab} disabled={!srcUrl}>Open in new tab</button> */}
                  <button className='btn btn-secondary' onClick={onClose}>Close</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export {ManualPlanViewer}
