import React, { FC, useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { useAuth } from '../../auth'
import {
  listCertificateRevisions,
  certificateRevisionDownloadUrl,
  certificateRevisionViewUrl,
} from '../core/_requests'
import { ManualPlanViewer as Viewer } from '../components/ManualPlanViewer' // reuse full-screen viewer

type Row = {
  id: number
  revisionIndex?: number | string
  uploadedByName?: string
  uploadedDate?: string
  fileName?: string
  fileSize?: number | string
  fileMime?: string | null
}

export const CertificateRevisionsModal: FC<{
  certificateId: number
  name: string
  visible: boolean
  onClose: () => void
}> = ({ certificateId, name, visible, onClose }) => {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // pagination (same UX as Manuals)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [page, setPage] = useState(1)

  // view revision in full-screen viewer
  const [viewing, setViewing] = useState<Row | null>(null)

  const { auth } = useAuth()
  const token = auth?.auth?.jwt

  useEffect(() => {
    if (!visible) return
    ;(async () => {
      setLoading(true); setErr(null)
      try {
        const list = await listCertificateRevisions(certificateId)
        const mapped: Row[] = (list || []).map((r: any) => ({
          id: r.id,
          revisionIndex: r.revisionIndex ?? r.revisionNo ?? '-',
          uploadedByName: r.uploadedByName,
          uploadedDate: r.uploadedDate,
          fileName: r.fileName || name,
          fileSize: r.fileSize,
          fileMime: r.fileMime,
        }))
        // sort: latest uploadedDate desc, then revisionIndex desc
        mapped.sort((a, b) => {
          const ad = a?.uploadedDate ? new Date(a.uploadedDate).getTime() : 0
          const bd = b?.uploadedDate ? new Date(b.uploadedDate).getTime() : 0
          if (ad !== bd) return bd - ad
          const ai = Number(a?.revisionIndex ?? 0)
          const bi = Number(b?.revisionIndex ?? 0)
          return bi - ai
        })
        setRows(mapped)
        setPage(1) // reset when opened/reloaded
      } catch (e: any) {
        setErr(e?.message || 'Failed to load revisions')
      } finally {
        setLoading(false)
      }
    })()
  }, [certificateId, visible, name])

  const totalPages = Math.max(1, Math.ceil(rows.length / rowsPerPage))
  const pageSafe = Math.min(page, totalPages)

  const currentRows = useMemo(() => {
    const start = (pageSafe - 1) * rowsPerPage
    const end = start + rowsPerPage
    return rows.slice(start, end)
  }, [rows, pageSafe, rowsPerPage])

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    const d = new Date(dateString)
    return isNaN(d.getTime()) ? '-' : d.toLocaleString()
  }

  const formatSize = (val: any) => {
    if (typeof val === 'string' && /\d/.test(val)) return val // already formatted like "1.2 MB"
    const n = Number(val)
    if (!Number.isFinite(n) || n <= 0) return '-'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(n) / Math.log(k))
    return `${parseFloat((n / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  const filenameFromDisposition = (header?: string | null): string | null => {
    if (!header) return null
    const star = /filename\*\s*=\s*([^']*)'[^']*'([^;]+)/i.exec(header)
    if (star?.[2]) return decodeURIComponent(star[2])
    const quoted = /filename\s*=\s*"([^"]+)"/i.exec(header)
    if (quoted?.[1]) return quoted[1]
    const bare = /filename\s*=\s*([^;]+)/i.exec(header)
    if (bare?.[1]) return bare[1]
    return null
  }

  const handleDownload = async (rev: Row) => {
    try {
      const res = await fetch(certificateRevisionDownloadUrl(rev.id), {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      if (!res.ok) throw new Error(`Download failed: ${res.status}`)
      const cd = res.headers.get('content-disposition')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filenameFromDisposition(cd) || (rev.fileName || `revision-${rev.id}`)
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e: any) {
      toast.error(e?.message || 'Download failed')
    }
  }

  if (!visible) return null

  return (
    <>
      {/* Overlay with table (hidden while viewing full-screen) */}
      {!viewing && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,.5)',
            zIndex: 1060,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2vh 2vw',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: 8,
              width: '60vw',
              maxWidth: 1200,
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
            }}
          >
            {/* Header */}
            <div className="d-flex align-items-center justify-content-between border-bottom bg-white"
                 style={{ padding: '12px 16px', flexShrink: 0 }}>
              <h5 className="m-0">Revision History — {name}</h5>
              <button className="btn btn-sm btn-light" onClick={onClose}>Close</button>
            </div>

            {/* Body */}
            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto' }}>
              {loading ? (
                <div className="text-center py-5"><div className="spinner-border" /></div>
              ) : err ? (
                <div className="text-danger">{err}</div>
              ) : rows.length === 0 ? (
                <div className="text-muted">No revisions.</div>
              ) : (
                <>
                  {/* ===== Table aligned with Manuals modal (SR/NO, REVISION, DATE, ACTIONS) ===== */}
                  <div className="report-table table-responsive">
                    <table className="table table-bordered align-middle m-0">
                      <thead className="table-header text-start">
                        <tr>
                          <th className="text-center" style={{ minWidth: 80 }}>SR/NO</th>
                          <th className="text-nowrap" style={{ minWidth: 120 }}>REVISION NO</th>
                          <th className="text-nowrap" style={{ minWidth: 200 }}>UPLOADED DATE</th>
                          {/* Uncomment if you want these extra columns like Manuals */}
                          {/* <th className="text-nowrap" style={{ minWidth: 160 }}>UPLOADED BY</th> */}
                          {/* <th className="text-nowrap" style={{ minWidth: 220 }}>FILE NAME</th> */}
                          {/* <th className="text-nowrap" style={{ minWidth: 120 }}>FILE SIZE</th> */}
                          <th className="text-center" style={{ minWidth: 180 }}>ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody className="table-body text-start">
                        {currentRows.map((r, idx) => (
                          <tr key={r.id}>
                            <td className="text-center">{(pageSafe - 1) * rowsPerPage + idx + 1}</td>
                            <td className="text-dark fs-6 text-nowrap">#{r.revisionIndex ?? '-'}</td>
                            <td className="text-dark fs-6 text-nowrap">{formatDate(r.uploadedDate)}</td>
                            {/* <td className="text-dark fs-6 text-nowrap">{r.uploadedByName || '-'}</td> */}
                            {/* <td className="text-dark fs-6 text-truncate" title={r.fileName || ''}>{r.fileName || '-'}</td> */}
                            {/* <td className="text-dark fs-6 text-nowrap">{formatSize(r.fileSize)}</td> */}
                            <td className="text-center">
                              <div className="d-flex align-items-center justify-content-center">
                                <button
                                  className="btn btn-primary btn-sm me-2"
                                  onClick={() => setViewing(r)}
                                  title="View"
                                >
                                  View
                                </button>
                                <button
                                  className="btn btn-light btn-sm"
                                  onClick={() => handleDownload(r)}
                                  title="Download"
                                >
                                  Download
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* ===== Pagination (same style/logic as Manuals) ===== */}
                  {totalPages > 1 && (
                    <div className="pagination-wrapper d-flex justify-content-between align-items-center py-3">
                      <div className="d-flex align-items-center">
                        <span className="text-muted me-2">Rows per page</span>
                        <select
                          className="form-select"
                          style={{ borderRadius: 20, width: 70, border: '1px solid #dee2e6', fontSize: 14, padding: '4px 8px' }}
                          value={rowsPerPage}
                          onChange={(e) => { setRowsPerPage(parseInt(e.target.value)); setPage(1) }}
                        >
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                          <option value={50}>50</option>
                        </select>
                      </div>

                      <div className="d-flex align-items-center">
                        <span className="text-muted me-3" style={{ fontSize: 14 }}>
                          Showing <strong>{((pageSafe - 1) * rowsPerPage) + 1}-{Math.min(pageSafe * rowsPerPage, rows.length)}</strong> of <strong>{rows.length}</strong>
                        </span>

                        <nav>
                          <ul className="pagination pagination-sm mb-0" style={{ gap: 2 }}>
                            <li className={`page-item ${pageSafe === 1 ? 'disabled' : ''}`}>
                              <button
                                className="page-link text-muted"
                                style={{ backgroundColor: '#f8f9fa', border: '1px solid #dee2e6', padding: '8px 12px', fontSize: 14, borderRadius: 6 }}
                                onClick={() => setPage(Math.max(1, pageSafe - 1))}
                                disabled={pageSafe === 1}
                              >‹</button>
                            </li>

                            {(() => {
                              const pages: JSX.Element[] = []
                              const showPages = 5
                              let startPage = Math.max(1, pageSafe - 2)
                              let endPage = Math.min(totalPages, startPage + showPages - 1)
                              if (endPage - startPage < showPages - 1) startPage = Math.max(1, endPage - showPages + 1)

                              if (startPage > 1) {
                                pages.push(
                                  <li key={1} className="page-item">
                                    <button className="page-link text-muted"
                                            style={{ backgroundColor: '#f8f9fa', border: '1px solid #dee2e6', padding: '8px 12px', fontSize: 14, minWidth: 40, borderRadius: 6 }}
                                            onClick={() => setPage(1)}>1</button>
                                  </li>
                                )
                                if (startPage > 2) {
                                  pages.push(<li key="ellipsis1" className="page-item disabled">
                                    <span className="page-link border-0 text-muted" style={{ backgroundColor: 'transparent', padding: '4px 8px' }}>...</span>
                                  </li>)
                                }
                              }

                              for (let i = startPage; i <= endPage; i++) {
                                pages.push(
                                  <li key={i} className={`page-item ${pageSafe === i ? 'active' : ''}`}>
                                    <button className="page-link text-muted"
                                            style={{ backgroundColor: pageSafe === i ? '#F4F9FF' : 'transparent', border: '1px solid #dee2e6', padding: '8px 12px', fontSize: 14, minWidth: 40, borderRadius: 6 }}
                                            onClick={() => setPage(i)}>{i}</button>
                                  </li>
                                )
                              }

                              if (endPage < totalPages) {
                                if (endPage < totalPages - 1) {
                                  pages.push(<li key="ellipsis2" className="page-item disabled">
                                    <span className="page-link border-0 text-muted" style={{ backgroundColor: 'transparent', padding: '4px 8px' }}>...</span>
                                  </li>)
                                }
                                pages.push(
                                  <li key={totalPages} className="page-item">
                                    <button className="page-link text-muted"
                                            style={{ backgroundColor: '#f8f9fa', border: '1px solid #dee2e6', padding: '8px 12px', fontSize: 14, minWidth: 40, borderRadius: 6 }}
                                            onClick={() => setPage(totalPages)}>{totalPages}</button>
                                  </li>
                                )
                              }

                              return pages
                            })()}

                            <li className={`page-item ${pageSafe === totalPages ? 'disabled' : ''}`}>
                              <button
                                className="page-link text-muted"
                                style={{ backgroundColor: '#f8f9fa', border: '1px solid #dee2e6', padding: '8px 12px', fontSize: 14, borderRadius: 6 }}
                                onClick={() => setPage(Math.min(totalPages, pageSafe + 1))}
                                disabled={pageSafe === totalPages}
                              >›</button>
                            </li>
                          </ul>
                        </nav>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Full-screen viewer for a selected revision */}
      {viewing && (
        <Viewer
          manual={{
            id: viewing.id,
            name: `${name} (Rev #${viewing.revisionIndex ?? viewing.id})`,
            uploadedDate: viewing.uploadedDate || '',
            file: { name: viewing.fileName || `${name}.file` },
          }}
          viewUrlOverride={certificateRevisionViewUrl(viewing.id)}
          downloadUrlOverride={certificateRevisionDownloadUrl(viewing.id)}
          onClose={() => setViewing(null)}
        />
      )}
    </>
  )
}
