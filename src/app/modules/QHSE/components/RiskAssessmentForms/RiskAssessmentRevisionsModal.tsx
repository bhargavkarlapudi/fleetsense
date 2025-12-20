import React, { FC, useEffect, useMemo, useState } from 'react'
import { KTSVG } from '../../../../../_metronic/helpers'
import { toast } from 'react-toastify'
import {
  listRiskAssessmentRevisions,
  riskAssessmentRevisionViewUrl,
  riskAssessmentRevisionDownloadUrl,
} from '../../core/_requests'
import { ManualPlanViewer } from '../ManualPlanViewer'
import { useAuth } from '../../../auth'

type RevRow = {
  id: number
  revisionIndex?: number | string
  uploadedByName?: string
  uploadedDate?: string
  fileName?: string
  fileSize?: number | string
  remarks?: string
}

export const RiskAssessmentRevisionsModal: FC<{
  riskId: number
  name: string
  visible: boolean
  onClose: () => void
}> = ({ riskId, name, visible, onClose }) => {
  const [rows, setRows] = useState<RevRow[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // pagination
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [page, setPage] = useState(1)

  // view revision inside full-screen viewer
  const [viewingRev, setViewingRev] = useState<RevRow | null>(null)

  const { auth } = useAuth()
  const token = auth?.auth?.jwt

  useEffect(() => {
    if (!visible) return
    ;(async () => {
      setLoading(true)
      setErr(null)
      try {
        const data = await listRiskAssessmentRevisions(riskId)
        const sorted = [...(data || [])].sort((a: any, b: any) => {
          const ad = a?.uploadedDate ? new Date(a.uploadedDate).getTime() : 0
          const bd = b?.uploadedDate ? new Date(b.uploadedDate).getTime() : 0
          if (ad !== bd) return bd - ad
          const ai = Number(a?.revisionIndex ?? a?.revisionNo ?? 0)
          const bi = Number(b?.revisionIndex ?? b?.revisionNo ?? 0)
          return bi - ai
        })
        setRows(sorted)
        setPage(1) // reset page when reopened/loaded
      } catch (e: any) {
        setErr(e?.message || 'Failed to load revisions')
      } finally {
        setLoading(false)
      }
    })()
  }, [riskId, visible])

  const totalPages = Math.max(1, Math.ceil(rows.length / rowsPerPage))
  const pageSafe = Math.min(page, totalPages)

  const currentRows = useMemo(() => {
    const start = (pageSafe - 1) * rowsPerPage
    const end = start + rowsPerPage
    return rows.slice(start, end)
  }, [rows, pageSafe, rowsPerPage])

  const handleDownload = async (rev: RevRow) => {
    try {
      const res = await fetch(riskAssessmentRevisionDownloadUrl(rev.id), {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      if (!res.ok) throw new Error(`Download failed: ${res.status}`)
      const cd = res.headers.get('content-disposition')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const extFromName = (rev.fileName && /\.[a-z0-9]+$/i.test(rev.fileName)) ? '' : '' // keep original name
      a.href = url
      a.download = filenameFromDisposition(cd) || rev.fileName || `revision-${rev.id}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e: any) {
      toast.error(e?.message || 'Download failed')
    }
  }

  const filenameFromDisposition = (header?: string | null): string | null => {
    if (!header) return null
    const star = /filename\*\s*=\s*([^']*)'[^']*'([^;]+)/i.exec(header)
    if (star?.[2]) return decodeURIComponent(star[2])
    const simple = /filename\s*=\s*"([^"]+)"/i.exec(header)
    if (simple?.[1]) return simple[1]
    const bare = /filename\s*=\s*([^;]+)/i.exec(header)
    if (bare?.[1]) return bare[1]
    return null
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleString()
  }

  const formatSize = (bytes: any) => {
    const n = Number(bytes)
    if (!Number.isFinite(n) || n <= 0) return '-'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(n) / Math.log(k))
    return `${parseFloat((n / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  if (!visible) return null

  return (
    <>
      {/* Render the overlay ONLY when viewer is NOT open */}
      {!viewingRev && (
        /* Custom overlay (no BS modal classes) */
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 1060,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2vh 2vw',
          }}
        >
          {/* Custom container (very wide/tall, but still within viewport) */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: 8,
              width: '60vw',
              maxWidth: '1200px',
              maxHeight: '85vh', // <-- adaptive height
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
            }}
          >
            {/* Header */}
            <div
              className='d-flex align-items-center justify-content-between border-bottom bg-white'
              style={{ padding: '12px 16px', borderRadius: 8, flexShrink: 0 }}
            >
              <h5 className='m-0'>Revision History for {name} </h5>
              <button className='btn btn-sm btn-light' onClick={onClose}>
                <KTSVG path='/media/map/x.svg' className='svg-icon-3' />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto' }}>
              {loading ? (
                <div className='text-center py-5'>
                  <div className='spinner-border' />
                </div>
              ) : err ? (
                <div className='text-danger'>{err}</div>
              ) : rows.length === 0 ? (
                <div className='text-muted'>No revisions.</div>
              ) : (
                <>
                  {/* ====== START: Page-like table UI ====== */}
                  <div className='report-table table-responsive'>
                    <table className='table table-bordered align-middle m-0'>
                      <thead className='table-header text-start'>
                        <tr>
                          <th className='text-center' style={{ minWidth: '80px' }}>
                            SR/NO
                          </th>
                          <th className='text-nowrap' style={{ minWidth: '100px' }}>
                            REVISION NO
                          </th>
                          <th className='text-nowrap' style={{ minWidth: '180px' }}>
                            UPLOADED DATE
                          </th>
                          <th className='text-center' style={{ minWidth: '160px' }}>
                            ACTIONS
                          </th>
                        </tr>
                      </thead>

                      <tbody className='table-body text-start'>
                        {currentRows.length === 0 ? (
                          <tr>
                            <td colSpan={4} className='text-center text-muted py-5'>
                              No revisions found.
                            </td>
                          </tr>
                        ) : (
                          currentRows.map((r, idx) => (
                            <tr key={r.id}>
                              <td className='text-center'>
                                {(pageSafe - 1) * rowsPerPage + idx + 1}
                              </td>

                              <td className='text-dark fs-6 text-nowrap'>
                                #{r.revisionIndex ?? '-'}
                              </td>

                              <td className='text-dark fs-6 text-nowrap'>{formatDate(r.uploadedDate)}</td>

                              <td className='text-center'>
                                <div className='d-flex align-items-center justify-content-center'>
                                  <button
                                    className='btn btn-primary btn-sm me-1'
                                    title='View'
                                    onClick={() =>
                                      setViewingRev({ ...r, fileName: r.fileName || `${name}` })
                                    }
                                  >
                                    View
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  {/* ====== END: Page-like table UI ====== */}

                  {/* ====== START: Page-like pagination ====== */}
                  {totalPages > 1 && (
                    <div className='pagination-wrapper d-flex justify-content-between align-items-center py-3'>
                      <div className='d-flex align-items-center'>
                        <span className='text-muted me-2'>Rows per page</span>
                        <select
                          className='form-select'
                          style={{
                            borderRadius: '20px',
                            width: '70px',
                            border: '1px solid #dee2e6',
                            fontSize: '14px',
                            padding: '4px 8px',
                          }}
                          value={rowsPerPage}
                          onChange={(e) => {
                            setRowsPerPage(parseInt(e.target.value))
                            setPage(1)
                          }}
                        >
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                          <option value={50}>50</option>
                        </select>
                      </div>

                      <div className='d-flex align-items-center'>
                        <span className='text-muted me-3' style={{ fontSize: '14px' }}>
                          Showing{' '}
                          <strong>
                            {(pageSafe - 1) * rowsPerPage + 1}-
                            {Math.min(pageSafe * rowsPerPage, rows.length)}
                          </strong>{' '}
                          of <strong>{rows.length}</strong>
                        </span>

                        <nav>
                          <ul className='pagination pagination-sm mb-0' style={{ gap: '2px' }}>
                            <li className={`page-item ${pageSafe === 1 ? 'disabled' : ''}`}>
                              <button
                                className='page-link text-muted'
                                style={{
                                  backgroundColor: '#f8f9fa',
                                  border: '1px solid #dee2e6',
                                  padding: '8px 12px',
                                  fontSize: '14px',
                                  borderRadius: '6px',
                                }}
                                onClick={() => setPage(Math.max(1, pageSafe - 1))}
                                disabled={pageSafe === 1}
                              >
                                ‹
                              </button>
                            </li>

                            {(() => {
                              const pages: JSX.Element[] = []
                              const showPages = 5
                              let startPage = Math.max(1, pageSafe - 2)
                              let endPage = Math.min(totalPages, startPage + showPages - 1)

                              if (endPage - startPage < showPages - 1) {
                                startPage = Math.max(1, endPage - showPages + 1)
                              }

                              if (startPage > 1) {
                                pages.push(
                                  <li key={1} className='page-item'>
                                    <button
                                      className='page-link text-muted'
                                      style={{
                                        backgroundColor: '#f8f9fa',
                                        border: '1px solid #dee2e6',
                                        padding: '8px 12px',
                                        fontSize: '14px',
                                        minWidth: '40px',
                                        borderRadius: '6px',
                                      }}
                                      onClick={() => setPage(1)}
                                    >
                                      1
                                    </button>
                                  </li>
                                )
                                if (startPage > 2) {
                                  pages.push(
                                    <li key='ellipsis1' className='page-item disabled'>
                                      <span
                                        className='page-link border-0 text-muted'
                                        style={{ backgroundColor: 'transparent', padding: '4px 8px' }}
                                      >
                                        ...
                                      </span>
                                    </li>
                                  )
                                }
                              }

                              for (let i = startPage; i <= endPage; i++) {
                                pages.push(
                                  <li key={i} className={`page-item ${pageSafe === i ? 'active' : ''}`}>
                                    <button
                                      className='page-link text-muted'
                                      style={{
                                        backgroundColor: pageSafe === i ? '#F4F9FF' : 'transparent',
                                        border: '1px solid #dee2e6',
                                        padding: '8px 12px',
                                        fontSize: '14px',
                                        minWidth: '40px',
                                        borderRadius: '6px',
                                        outline: 'none',
                                        boxShadow: 'none',
                                      }}
                                      onClick={() => setPage(i)}
                                    >
                                      {i}
                                    </button>
                                  </li>
                                )
                              }

                              if (endPage < totalPages) {
                                if (endPage < totalPages - 1) {
                                  pages.push(
                                    <li key='ellipsis2' className='page-item disabled'>
                                      <span
                                        className='page-link border-0 text-muted'
                                        style={{ backgroundColor: 'transparent', padding: '4px 8px' }}
                                      >
                                        ...
                                      </span>
                                    </li>
                                  )
                                }
                                pages.push(
                                  <li key={totalPages} className='page-item'>
                                    <button
                                      className='page-link text-muted'
                                      style={{
                                        backgroundColor: '#f8f9fa',
                                        border: '1px solid #dee2e6',
                                        padding: '8px 12px',
                                        fontSize: '14px',
                                        minWidth: '40px',
                                        borderRadius: '6px',
                                      }}
                                      onClick={() => setPage(totalPages)}
                                    >
                                      {totalPages}
                                    </button>
                                  </li>
                                )
                              }

                              return pages
                            })()}

                            <li className={`page-item ${pageSafe === totalPages ? 'disabled' : ''}`}>
                              <button
                                className='page-link text-muted'
                                style={{
                                  backgroundColor: '#f8f9fa',
                                  border: '1px solid #dee2e6',
                                  padding: '8px 12px',
                                  fontSize: '14px',
                                  borderRadius: '6px',
                                }}
                                onClick={() => setPage(Math.min(totalPages, pageSafe + 1))}
                                disabled={pageSafe === totalPages}
                              >
                                ›
                              </button>
                            </li>
                          </ul>
                        </nav>
                      </div>
                    </div>
                  )}
                  {/* ====== END: Page-like pagination ====== */}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Full-screen viewer for a selected revision (uses override URLs) */}
      {viewingRev && (
        <ManualPlanViewer
          manual={{
            id: viewingRev.id,
            name: `${name} (Rev #${viewingRev.revisionIndex ?? viewingRev.id})`,
            uploadedDate: viewingRev.uploadedDate || '',
            file: { name: viewingRev.fileName || `${name}.file` },
            remarks: viewingRev.remarks,
          }}
          viewUrlOverride={riskAssessmentRevisionViewUrl(viewingRev.id)}
          downloadUrlOverride={riskAssessmentRevisionDownloadUrl(viewingRev.id)}
          onClose={() => setViewingRev(null)}
        />
      )}
    </>
  )
}
