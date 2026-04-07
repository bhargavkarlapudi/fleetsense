import React, { FC, useRef, useState, useEffect } from 'react'
import { KTSVG } from '../../../../../_metronic/helpers'
import { useAuth } from '../../../auth'

interface Props {
  visible: boolean
  jobId: number
  onClose: () => void
}

const WRAP_STYLE: React.CSSProperties = {
  background: 'rgba(0,0,0,0.7)',
  position: 'fixed',
  inset: 0,
  zIndex: 2200,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

export const PrintJobCardModal: FC<Props> = ({ visible, jobId, onClose }) => {
  const { auth } = useAuth()
  const token = auth?.auth?.jwt
  const iframeRef = useRef<HTMLIFrameElement>(null)
  
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    let objectUrl: string | null = null

    const loadPdf = async () => {
      if (!visible || !jobId) return
      
      try {
        setLoading(true)
        setError(null)
        setPdfUrl(null)

        const url = `${process.env.REACT_APP_API_URL}/pms/jobs/${jobId}/job-card.pdf`
        const response = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })

        if (!response.ok) {
          throw new Error(`Failed to load PDF: ${response.status} ${response.statusText}`)
        }

        const blob = await response.blob()
        if (blob.size === 0) {
          throw new Error('PDF file is empty')
        }

        objectUrl = URL.createObjectURL(blob)
        setPdfUrl(objectUrl)
      } catch (err: any) {
        console.error('Error loading job card PDF:', err)
        setError(err?.message || 'Failed to load PDF')
      } finally {
        setLoading(false)
      }
    }

    loadPdf()

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [visible, jobId, token])

  const handlePrint = () => {
    if (iframeRef.current?.contentWindow && pdfUrl) {
      iframeRef.current.contentWindow.print()
    }
  }

  const handleDownload = async () => {
    if (!pdfUrl) return
    
    try {
      setDownloading(true)
      const url = `${process.env.REACT_APP_API_URL}/pms/jobs/${jobId}/job-card.pdf`
      const response = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`)
      }
      
      const blob = await response.blob()
      const downloadUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = `job-card-${jobId}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(downloadUrl)
    } catch (err: any) {
      console.error('Error downloading job card:', err)
      alert(err?.message || 'Failed to download PDF')
    } finally {
      setDownloading(false)
    }
  }

  if (!visible) return null

  return (
    <div style={WRAP_STYLE} tabIndex={-1} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className='bg-white text-dark rounded shadow-lg d-flex flex-column'
        style={{
          width: '90vw',
          maxWidth: '1200px',
          height: '90vh',
          maxHeight: '900px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className='d-flex align-items-center justify-content-between border-bottom px-4 py-3 flex-shrink-0'>
          <h5 className='modal-title text-dark m-0'>Job Card</h5>
          <div className='d-flex align-items-center gap-2'>
            <button
              type='button'
              className='btn btn-sm btn-primary'
              onClick={handlePrint}
              title='Print'
            >
              <KTSVG path='/media/icons/duotune/general/gen005.svg' className='svg-icon-2' />
              Print
            </button>
            <button
              type='button'
              className='btn btn-sm btn-success'
              onClick={handleDownload}
              title='Download'
            >
              <KTSVG path='/media/icons/duotune/files/fil021.svg' className='svg-icon-2' />
              Download
            </button>
            <button type='button' className='btn-close' onClick={onClose}></button>
          </div>
        </div>

        <div className='flex-grow-1 overflow-hidden p-3'>
          {loading ? (
            <div className='d-flex justify-content-center align-items-center h-100'>
              <div className='spinner-border text-primary' role='status'>
                <span className='visually-hidden'>Loading...</span>
              </div>
            </div>
          ) : error ? (
            <div className='d-flex flex-column justify-content-center align-items-center h-100 text-center px-3'>
              <KTSVG
                path='/media/icons/duotune/general/gen040.svg'
                className='svg-icon-4x text-danger mb-3'
              />
              <h5 className='text-danger mb-2'>Failed to Load PDF</h5>
              <p className='text-muted mb-4'>{error}</p>
              <div className='d-flex gap-2'>
                <button
                  className='btn btn-primary'
                  onClick={handleDownload}
                  disabled={downloading}
                >
                  {downloading ? 'Downloading...' : 'Download Instead'}
                </button>
                <button className='btn btn-secondary' onClick={onClose}>
                  Close
                </button>
              </div>
            </div>
          ) : pdfUrl ? (
            <>
              {/* Desktop */}
              <iframe
                ref={iframeRef}
                src={pdfUrl}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                }}
                title='Job Card PDF'
                className='d-none d-md-block'
              />
              {/* Mobile */}
              <iframe
                src={`${pdfUrl}#toolbar=0`}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                }}
                title='Job Card PDF'
                className='d-block d-md-none'
              />
            </>
          ) : (
            <div className='d-flex justify-content-center align-items-center h-100'>
              <p className='text-muted'>No PDF available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
