// src/app/assignments/HistoryModal.tsx
import React, { FC, useEffect, useState } from 'react'
import { KTSVG } from '../../../../_metronic/helpers'
import { getHistory } from '../core/_requests'
import { HistoryRecord } from '../core/_models'

interface Props {
  recordId: number
  crewName: string
  isOpen: boolean
  onClose: () => void
}

const HistoryModal: FC<Props> = ({ recordId, crewName, isOpen, onClose }) => {
  const [records, setRecords] = useState<HistoryRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // date filters for updated_at
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

    // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10); // Default 10 records per page

  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    setError(null)
    getHistory(recordId)
      .then(data => {
        // sort newest first by revision number
        const sorted = [...data].sort((a, b) => b.rev - a.rev)

        // For the oldest entry (last in sorted), use its created_at as updated_at
        if (sorted.length > 0) {
          const oldest = sorted[sorted.length - 1]
          if (oldest.created_at) {
            oldest.updated_at = oldest.created_at
          }
        }

        setRecords(sorted)
      })
      .catch(() => setError('Failed to load history'))
      .finally(() => setLoading(false))
  }, [isOpen, recordId])

  // apply updated_at date filters
  const filtered = records.filter(r => {
    if (fromDate && (!r.updated_at || new Date(r.updated_at) < new Date(fromDate))) return false
    if (toDate   && (!r.updated_at || new Date(r.updated_at) > new Date(toDate)))   return false
    return true
  })

  // Get the current page's records
  const totalPages = Math.ceil(filtered.length / rowsPerPage);
  const currentRecords = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '60rem' }}>
        <div className="custom-modal-header d-flex justify-content-between">
          <h5>Change History ({crewName})</h5>
          <button className="btn btn-sm btn-icon" onClick={onClose}>
            <KTSVG path="/media/map/x.svg" className="svg-icon-2x" />
          </button>
        </div>

        <div className="custom-modal-body">
          <div className="d-flex gap-3 mb-4">
            <div>
              <label>Updated From:</label>
              <input
                type="date"
                className="form-control"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
              />
            </div>
            <div>
              <label>Updated To:</label>
              <input
                type="date"
                className="form-control"
                value={toDate}
                onChange={e => setToDate(e.target.value)}
              />
            </div>
            <button
              className="btn btn-sm btn-outline-secondary align-self-end"
              onClick={() => {
                setFromDate('')
                setToDate('')
              }}
              disabled={!fromDate && !toDate}
            >
              Clear Filters
            </button>
          </div>

          {loading && <p>Loading…</p>}
          {error && <div className="alert alert-danger">{error}</div>}

          {!loading && !error && (
            <div className="table-responsive" style={{ maxHeight: '40rem', overflowY: 'auto' }}>
              <table className="table table-striped table-bordered">
                <thead>
                  <tr>
                    <th>Sign-On Date</th>
                    <th>Sign-Off Date</th>
                    <th>Sign-On Port</th>
                    <th>Sign-Off Port</th>
                    <th>Status</th>
                    <th>Updated By</th>
                    <th>Updated Date</th>
                    <th>Updated Time</th>
                  </tr>
                </thead>
                <tbody>
                  {currentRecords.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center">
                        No history found
                      </td>
                    </tr>
                  ) : (
                    currentRecords.map(r => {
                      // safe-split updated_at into date and time
                      let datePart = '—'
                      let timePart = '—'
                      if (r.updated_at) {
                        const [d, t] = r.updated_at.split('T')
                        datePart = d
                        timePart = t?.split('.')[0] ?? '—'
                      }
                      return (
                        <tr key={`${r.id}-${r.rev}`}>
                          <td>{r.sign_on_date}</td>
                          <td>{r.sign_off_date || '—'}</td>
                          <td>{r.port_sign_on}</td>
                          <td>{r.port_sign_off || '—'}</td>
                          <td>{r.status}</td>
                          <td>{r.username}</td>
                          <td>{datePart}</td>
                          <td>{timePart}</td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
           {/* Pagination Controls */}
          <div className="pagination-wrapper d-flex justify-content-between align-items-center mt-4">
            <div>
              Rows per page:
              <select
                className="form-select d-inline-block w-auto ms-2"
                style={{ borderRadius: '20px' }}
                value={rowsPerPage}
                onChange={e => {
                  setRowsPerPage(parseInt(e.target.value));
                  setCurrentPage(1); // Reset to page 1 when changing rows per page
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            <nav>
              <ul className="pagination mb-0">
                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  >
                    ‹
                  </button>
                </li>
                {Array.from({ length: totalPages }, (_, i) => (
                  <li key={i} className={`page-item ${currentPage === i + 1 ? 'active' : ''}`}>
                    <button
                      className="page-link"
                      onClick={() => setCurrentPage(i + 1)}
                    >
                      {i + 1}
                    </button>
                  </li>
                ))}
                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  >
                    ›
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HistoryModal
