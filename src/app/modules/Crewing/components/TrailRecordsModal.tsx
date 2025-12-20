import React, { FC, useEffect, useState } from 'react'
import axios from 'axios'
import { KTSVG } from '../../../../_metronic/helpers'
import { SignOnOffRecord } from '../core/_requests'
import { useAuth } from '../../auth'

interface Props {
  crewId: number
  crewName: string;
  onClose: () => void
}

export const TrailRecordsModal: FC<Props> = ({ crewId, crewName, onClose }) => {
  const [records, setRecords] = useState<SignOnOffRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // filters
  const [fromDate, setFromDate] = useState<string>('')
  const [toDate, setToDate] = useState<string>('')

  // pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(5)

  const [vesselFilter,   setVesselFilter]   = useState<string>('all')
  const [allVessels,     setAllVessels]     = useState<string[]>([])
  const { currentUser } = useAuth();
  const roleId = currentUser?.role?.id;
  const userVesselId = currentUser?.vessel?.id; 


  useEffect(() => {
    setLoading(true)
    axios
      .get<SignOnOffRecord[]>(
        `${process.env.REACT_APP_API_URL}/sign/crew/${crewId}/signon-signoff`
      )
      .then(res => {
        const sorted = res.data.sort((a, b) => {
          const da = new Date(b.signOnDate).getTime()
          const db = new Date(a.signOnDate).getTime()
          return da - db
        })
        setRecords(sorted)

        // extract unique, non-empty vessel names
        setAllVessels(Array.from(
          new Set(sorted.map(r => r.vesselName || '—'))
        ))
      })
      .catch(err => {
        console.error(err)
        setError('Failed to load trail records')
      })
      .finally(() => setLoading(false))
  }, [crewId])

  const fmt = (iso?: string | null) => {
    if (!iso) return '—'
    const d = new Date(iso)
    if (isNaN(d.getTime())) return '—'
    const dd = String(d.getDate()).padStart(2, '0')
    const mmm = d.toLocaleString('en-GB', { month: 'short' })
    const yyyy = d.getFullYear()
    return `${dd}-${mmm}-${yyyy}`
  }

  // apply date filter
  const filtered = records.filter(r => {
    if (roleId === 4 && r.vesselId !== userVesselId) return false;
    if (vesselFilter!=='all' && (r.vesselName||'—') !== vesselFilter) return false
    if (fromDate && new Date(r.signOnDate) < new Date(fromDate)) return false
    if (toDate && new Date(r.signOnDate) > new Date(toDate)) return false
    return true
  })

  const totalPages = Math.ceil(filtered.length / rowsPerPage)
  const pageData = filtered.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  )

  // Clear Filters: dynamic based on role
  const clearFilters = () => {
    setFromDate('');
    setToDate('');
    setCurrentPage(1);

    // Only clear vessel filter for non-role 4
    if (roleId !== 4) {
      setVesselFilter('all');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '60rem' }}
      >
        <div className="custom-modal-header d-flex justify-content-between align-items-center">
          <h5 className="m-0">
            Crew Assignment History ({crewName})
          </h5>
          <button className="close-btn" onClick={onClose}>
            <KTSVG path="/media/map/x.svg" className="svg-icon-2x" />
          </button>
        </div>

        <div className="custom-modal-body">
          {/* Date filters */}
          <div className="d-flex gap-3 mb-4">
             {/* 1) Vessel filter */}
            {roleId !== 4 && ( // Show vessel filter only if role is not 4
              <div>
                <label>Vessel:</label>
                <select
                  className="form-control"
                  value={vesselFilter}
                  onChange={e => { setVesselFilter(e.target.value); setCurrentPage(1); }}
                >
                  <option value="all">All Vessels</option>
                  {allVessels.map(v => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label>From:</label>
              <input
                type="date"
                className="form-control"
                value={fromDate}
                onChange={e => {
                  setFromDate(e.target.value)
                  setCurrentPage(1)
                }}
              />
            </div>
            <div>
              <label>To:</label>
              <input
                type="date"
                className="form-control"
                value={toDate}
                onChange={e => {
                  setToDate(e.target.value)
                  setCurrentPage(1)
                }}
              />
            </div>
           
            <button
              className="btn btn-sm clear btn-icon-secondary border border-secondary mt-6"
              disabled={vesselFilter === 'all' && !fromDate && !toDate}
              onClick={clearFilters}
            >
              Clear&nbsp;Filters
            </button>

          </div>

          {loading && <p>Loading…</p>}
          {error && <div className="alert alert-danger">{error}</div>}
          {!loading && !error && (
            <>
            <div className="report-table table-responsive" style={{ maxHeight: '50rem', overflowY: 'auto' }}>
              <table className="table table-striped table-bordered align-middle">
                <thead className="table-header py-5">
                  <tr>
                    <th>Vessel</th>
                    <th>Port Sign-On</th>
                    <th>Sign-On Date</th>
                    <th>Port Sign-Off</th>
                    <th>Sign-Off Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pageData.map(r => (
                    <tr key={r.id}>
                      <td>{r.vesselName || '—'}</td>
                      <td>{r.portSignOn || '—'}</td>
                      <td>{fmt(r.signOnDate)}</td>
                      <td>{r.portSignOff || '—'}</td>
                      <td>{fmt(r.signOffDate)}</td>
                      <td>
                        {r.status === 'SIGNED_ON' ? (
                            <span className="badge badge-light-success">SIGNED ON</span>
                        ) : r.status === 'SIGNED_OFF' ? (
                            <span className="badge badge-light-secondary">SIGNED OFF</span>
                        ) : r.status === 'PLANNED' ? (
                            <span className="badge badge-light-warning">PLANNED SIGNED ON</span>
                        ) : r.status === 'PLANNED_SIGN_OFF' ? (
                            <span className="badge badge-light-danger">PLANNED SIGNED OFF</span>
                        ) : (
                            <span className="badge bg-light-warning text-dark">Unknown</span>
                        )}
                        </td>

                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-4 text-muted">
                        No assignments found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              
              
                                        <div className="pagination-wrapper d-flex justify-content-between align-items-center">

              {/* Pagination controls */}

                <div>
                  Rows per page:&nbsp;
                  <select
                    className="form-select d-inline-block w-auto ms-2"
                    style={{ borderRadius: "20px" }}
                    value={rowsPerPage}
                    onChange={e => {
                      setRowsPerPage(+e.target.value)
                      setCurrentPage(1)
                    }}
                  >
                    {[5, 10, 20].map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
                <nav>
                  <ul className="pagination mb-0">
                    <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                      <button
                        className="page-link"
                        onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                      >
                        ‹
                      </button>
                    </li>
                    {Array.from({ length: totalPages }, (_, i) => (
                      <li
                        key={i}
                        className={`page-item ${currentPage === i + 1 ? 'active' : ''}`}
                      >
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
                        onClick={() =>
                          setCurrentPage(p => Math.min(p + 1, totalPages))
                        }
                      >
                        ›
                      </button>
                    </li>
                  </ul>
                </nav>
              </div>
              </div>

            </>
          )}
        </div>
      </div>
    </div>
  )
}
