import React, {FC, useEffect, useState} from 'react'
import {toast} from 'react-toastify'
import {useAuth} from '../../auth'
import {FileViewerModal} from './FileViewerModal' // 👈 adjust path if needed

type AttachmentItem = {
  fileName: string
  viewUrl: string
  downloadUrl: string
}

type NearMissAttachmentsModalProps = {
  visible: boolean
  reportNumber: string | null
  loading: boolean
  items: AttachmentItem[]
  onClose: () => void
  /** Optional: if parent still wants to know which file was opened */
  onViewFile?: (item: AttachmentItem) => void
}

const NEAR_MISS_ATTACH_WRAP_STYLE: React.CSSProperties = {
  background: 'rgba(0,0,0,0.5)',
  position: 'fixed',
  inset: 0,
  zIndex: 2100,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const NearMissAttachmentsModal: FC<NearMissAttachmentsModalProps> = ({
  visible,
  reportNumber,
  loading,
  items,
  onClose,
  onViewFile,
}) => {
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  // 👉 state for inline file viewer
  const [viewerItem, setViewerItem] = useState<AttachmentItem | null>(null)

  // 👉 downloading state (per file)
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null)

  const {auth} = useAuth()
  const token = auth?.auth?.jwt

  // Reset pagination when modal opens or items list changes
  useEffect(() => {
    if (visible) {
      setCurrentPage(1)
    }
  }, [visible, items.length])

  // When attachments modal is closed, also close viewer
  useEffect(() => {
    if (!visible) {
      setViewerItem(null)
      setDownloadingFile(null)
    }
  }, [visible])

  if (!visible) return null

  const totalItems = items.length
  const totalPages = Math.max(1, Math.ceil(totalItems / rowsPerPage))

  const indexOfLast = currentPage * rowsPerPage
  const indexOfFirst = indexOfLast - rowsPerPage
  const pageItems = items.slice(indexOfFirst, indexOfLast)

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  const spinner = (
    <div className='text-center py-5'>
      <div className='spinner-border' role='status' aria-label='Loading'>
        <span className='visually-hidden'>Loading...</span>
      </div>
    </div>
  )

  const handleBackdropClick: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (e.target === e.currentTarget) {
      setViewerItem(null)
      onClose()
    }
  }

  const handleViewClick = (item: AttachmentItem) => {
    setViewerItem(item)
    onViewFile?.(item)
  }

  const handleCloseAttachments = () => {
    setViewerItem(null)
    onClose()
  }

  // 🔽 Same behaviour as FileViewerModal.handleDownload, but per item
  const handleDownloadClick = async (item: AttachmentItem) => {
    try {
      if (!item.downloadUrl) return
      setDownloadingFile(item.fileName)

      const res = await fetch(item.downloadUrl, {
        headers: token ? {Authorization: `Bearer ${token}`} : undefined,
      })

      if (!res.ok) {
        throw new Error(`Download failed: ${res.status}`)
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = item.fileName || 'download'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e: any) {
      console.error(e)
      toast.error(e?.message || 'Download failed', {position: 'top-center'})
    } finally {
      setDownloadingFile(null)
    }
  }

  return (
    <div style={NEAR_MISS_ATTACH_WRAP_STYLE} onClick={handleBackdropClick}>
      <div
        className='bg-white rounded shadow-lg d-flex flex-column'
        style={{
          width: '100%',
          maxWidth: '800px',
          maxHeight: '90vh',
        }}
      >
        {/* Header */}
        <div className='d-flex justify-content-between align-items-center border-bottom px-4 py-3'>
          <div>
            <h5 className='mx-6 mt-6'>Near Miss Attachments</h5>

            <div className='d-flex align-items-center gap-4 mx-6'>
              {reportNumber && (
                <small className='text-muted'>
                  Near Miss Report No: <strong>{reportNumber}</strong>
                </small>
              )}

              <small className='text-muted'>
                | &nbsp; Total attachments: <strong>{totalItems}</strong>
              </small>
            </div>
          </div>

          <button
            type='button'
            className='btn-close m-6'
            onClick={handleCloseAttachments}
          />
        </div>

        {/* Body with inner scroll */}
        <div
          className='px-4 py-3 flex-grow-1 m-6'
          style={{overflowY: 'auto', minHeight: '150px'}}
        >
          {loading ? (
            spinner
          ) : totalItems === 0 ? (
            <div className='text-muted text-center py-4'>
              No attachments found.
            </div>
          ) : (
            <div className='table-responsive'>
              <table className='table table-sm align-middle mb-0'>
                <thead>
                  <tr className='bg-light-primary'>
                    <th style={{width: '60px'}}>Sr/No</th>
                    <th>File Name</th>
                    <th className='text-end pe-6' style={{width: '220px'}}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((it, idx) => (
                    <tr key={it.fileName + idx}>
                      <td>{indexOfFirst + idx + 1}</td>
                      <td>
                        <div
                          className='text-truncate'
                          style={{maxWidth: '360px'}}
                          title={it.fileName}
                        >
                          {it.fileName}
                        </div>
                      </td>
                      <td className='text-end'>
                        <button
                          type='button'
                          className='btn btn-sm btn-light-primary me-2'
                          onClick={() => handleViewClick(it)}
                        >
                          View
                        </button>
                        <button
                          type='button'
                          className='btn btn-sm btn-light-info'
                          onClick={() => handleDownloadClick(it)}
                          disabled={downloadingFile === it.fileName}
                        >
                          {downloadingFile === it.fileName
                            ? 'Downloading...'
                            : 'Download'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer: rows per page + showing + pagination */}
        {!loading && totalItems > 0 && (
          <div className='border-top px-4 py-2 d-flex flex-wrap align-items-center justify-content-between gap-2 m-6'>
            <div className='d-flex flex-wrap align-items-center gap-3'>
              <div className='d-flex align-items-center gap-2'>
                <span className='text-muted'>Rows per page</span>
                <select
                  className='form-select form-select-sm'
                  style={{width: '80px'}}
                  value={rowsPerPage}
                  onChange={(e) => {
                    const value = parseInt(e.target.value, 10)
                    setRowsPerPage(value)
                    setCurrentPage(1)
                  }}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                </select>
              </div>

              <div className='text-muted' style={{fontSize: '0.85rem'}}>
                Showing{' '}
                <strong>
                  {totalItems === 0 ? 0 : indexOfFirst + 1}-
                  {Math.min(indexOfLast, totalItems)}
                </strong>{' '}
                of <strong>{totalItems}</strong>
              </div>
            </div>

            <nav>
              <ul className='pagination pagination-sm mb-0'>
                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                  <button
                    className='page-link'
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    ‹
                  </button>
                </li>

                {(() => {
                  const pages = []
                  const maxButtons = 5
                  let start = Math.max(1, currentPage - 2)
                  let end = Math.min(totalPages, start + maxButtons - 1)

                  if (end - start < maxButtons - 1) {
                    start = Math.max(1, end - maxButtons + 1)
                  }

                  for (let p = start; p <= end; p++) {
                    pages.push(
                      <li
                        key={p}
                        className={`page-item ${p === currentPage ? 'active' : ''}`}
                      >
                        <button
                          className='page-link'
                          onClick={() => handlePageChange(p)}
                        >
                          {p}
                        </button>
                      </li>
                    )
                  }

                  return pages
                })()}

                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                  <button
                    className='page-link'
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    ›
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        )}
      </div>

      {/* 🔍 Inline File Viewer – uses the shared FileViewerModal */}
      {viewerItem && (
        <FileViewerModal
          visible={!!viewerItem}
          onClose={() => setViewerItem(null)}
          title={
            reportNumber
              ? `Near Miss Attachment – ${reportNumber}`
              : 'Near Miss Attachment'
          }
          fileName={viewerItem.fileName}
          viewUrl={viewerItem.viewUrl}
          downloadUrl={viewerItem.downloadUrl}
        />
      )}
    </div>
  )
}

export default NearMissAttachmentsModal
