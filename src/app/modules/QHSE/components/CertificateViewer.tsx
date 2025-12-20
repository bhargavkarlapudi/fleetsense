import React, {FC, useEffect, useState} from 'react'
import {KTSVG} from '../../../../_metronic/helpers'
import {useAuth} from '../../auth'
import { toast } from 'react-toastify'

interface ViewerCertificate {
  id: string
  certificateName: string
  dateOfExpiry?: string   // ⬅️ optional to match table type
  uploadedDate: string
  uploadedBy: string
  uploadedByName: string
  fileName: string
  fileUrl: string
  fileSize: string
  remarks?: string        // optional; not required by the viewer
}


const formatFileSize = (size: string | null | undefined): string => {
  if (size === null || size === undefined) return 'Unknown size'
  return size
}
function formatUploadDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString()
}

const API_URL = process.env.REACT_APP_API_URL
const CERTIFICATE_API_URL = `${API_URL}/qhse/certificates`

const CertificateViewer: FC<{certificate: ViewerCertificate; onClose: () => void}> = ({
  certificate,
  onClose,
}) => {

  const {auth} = useAuth()
  const token = auth?.auth.jwt
  console.log(certificate)

  const [certificateUrl, setcertificateUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    const fetchPdf = async () => {
      try {
        setLoading(true)
        const res = await fetch(
          `${CERTIFICATE_API_URL}/view/${certificate.id}`,
          {headers: {Authorization: `Bearer ${token}`}}
        )
        if (!res.ok) throw new Error(`Failed: ${res.status}`)
        const blob = await res.blob()
        setcertificateUrl(URL.createObjectURL(blob))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load PDF')
      } finally {
        setLoading(false)
      }
    }

    if (certificate.id && token) fetchPdf()
    return () => {
      if (certificateUrl) URL.revokeObjectURL(certificateUrl)
    }
  }, [certificate.id, token])

const handleDownload = async () => {
  try {
    setDownloading(true)
    const res = await fetch(
      `${CERTIFICATE_API_URL}/download/${certificate.id}`,
      { headers: token ? { Authorization: `Bearer ${token}` } : undefined }
    )
    if (!res.ok) throw new Error(`Download failed: ${res.status}`)
    const cd = res.headers.get('content-disposition')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = (() => {
      const m1 = /filename\*\s*=\s*[^']*'[^']*'([^;]+)/i.exec(cd || '')
      if (m1?.[1]) return decodeURIComponent(m1[1])
      const m2 = /filename\s*=\s*"([^"]+)"/i.exec(cd || '')
      if (m2?.[1]) return m2[1]
      const m3 = /filename\s*=\s*([^;]+)/i.exec(cd || '')
      if (m3?.[1]) return m3[1]
      return `${certificate.certificateName || 'certificate'}.pdf`
    })()
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (err: any) {
    console.error('Download error:', err)
    toast.error(err?.message || 'Download failed')
  } finally {
    setDownloading(false)
  }
}


  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#fff',
        zIndex: 1055,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div className='bg-light border-bottom px-3 py-2 d-flex justify-content-between align-items-center'>
        <div className='d-flex align-items-center'>
          <KTSVG
            path='/media/icons/duotune/files/fil021.svg'
            className='svg-icon-2 text-primary me-2'
          />
          <div>
            <h6 className='mb-0 fw-bold fs-7 text-truncate'>{certificate.certificateName}</h6>
            <span className='text-muted fs-8 d-none d-sm-inline'>PDF Document</span>
          </div>
        </div>
        <div className='d-flex align-items-center gap-1 gap-md-2 flex-shrink-0'>
          <span className='text-muted fs-8'>
            {formatFileSize(certificate.fileSize)} • {formatUploadDate(certificate.uploadedDate)}
          </span>
          <button
            className='btn btn-sm btn-primary d-none d-sm-flex'
            onClick={handleDownload}
            disabled={downloading}
          >
            {downloading ? (
              <>
                <div className='spinner-border spinner-border-sm me-2' role='status'>
                  <span className='visually-hidden'>Loading...</span>
                </div>
                <span className='d-none d-md-inline'>Downloading...</span>
              </>
            ) : (
              <>
                <KTSVG
                  path='/media/icons/duotune/arrows/arr091.svg'
                  className='svg-icon-4 me-1 me-md-2'
                />
                <span className='d-none d-md-inline'>Download</span>
              </>
            )}
          </button>
          <button className='btn btn-sm btn-secondary' onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{flex: 1, overflow: 'hidden'}}>
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
              <button className='btn btn-primary' onClick={handleDownload}>
                Download Instead
              </button>
              <button className='btn btn-secondary' onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        ) : certificateUrl ? (
          <>
            {/* Desktop */}
            <iframe
              src={certificateUrl}
              title={certificate.certificateName}
              style={{width: '100%', height: '100%', border: 'none'}}
              className='d-none d-md-block'
            />
            {/* Mobile */}
            <iframe
              src={`${certificateUrl}#toolbar=0`}
              title={certificate.certificateName}
              style={{width: '100%', height: '100%', border: 'none'}}
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
  )
}

export {CertificateViewer}
