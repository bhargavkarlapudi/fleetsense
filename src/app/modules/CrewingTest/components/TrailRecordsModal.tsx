import React, { FC, useEffect, useState } from 'react'
import axios from 'axios'
import { KTSVG } from '../../../../_metronic/helpers'
import { SignOnOffRecord } from '../core/_requests'
import { useAuth } from '../../auth'

interface Props {
  crewId: number
  crewName: string
  onClose: () => void
}

export const TrailRecordsModal: FC<Props> = ({ crewId, crewName, onClose }) => {
  const [records, setRecords] = useState<SignOnOffRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [fromDate, setFromDate] = useState<string>('')
  const [toDate, setToDate] = useState<string>('')

  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(5)

  const [vesselFilter, setVesselFilter] = useState<string>('all')
  const [allVessels, setAllVessels] = useState<string[]>([])

  const { currentUser } = useAuth()
  const roleId = currentUser?.role?.id
  const userVesselId = currentUser?.vessel?.id

  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;

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
        setAllVessels(Array.from(new Set(sorted.map(r => r.vesselName || '—'))))
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

  const calculateExperience = (signOn?: string | null, signOff?: string | null): string => {
    if (!signOn) return '—'

    const startDate = new Date(signOn)
    const endDate = signOff ? new Date(signOff) : new Date() // Use current date if not signed off

    if (isNaN(startDate.getTime())) return '—'

    let years = endDate.getFullYear() - startDate.getFullYear()
    let months = endDate.getMonth() - startDate.getMonth()
    let days = endDate.getDate() - startDate.getDate()

    if (days < 0) {
      months--
      const prevMonthLastDay = new Date(endDate.getFullYear(), endDate.getMonth(), 0).getDate()
      days += prevMonthLastDay
    }

    if (months < 0) {
      years--
      months += 12
    }

    const totalMonths = years * 12 + months;

    let result = ''
    if (totalMonths > 0) {
      result += `${totalMonths} mo`
    }
    if (days > 0) {
      if (result) result += ' ';
      result += `${days} d`
    }

    return result || '0 d'
  }

  const filtered = records.filter(r => {
    if (roleId === 4 && r.vesselId !== userVesselId) return false
    if (vesselFilter !== 'all' && (r.vesselName || '—') !== vesselFilter) return false
    if (fromDate && new Date(r.signOnDate) < new Date(fromDate)) return false
    if (toDate && new Date(r.signOnDate) > new Date(toDate)) return false
    return true
  })

  const totalPages = Math.ceil(filtered.length / rowsPerPage)
  const currentPageData = filtered.slice(indexOfFirstRow, indexOfLastRow);

  const clearFilters = () => {
    setFromDate('')
    setToDate('')
    setCurrentPage(1)
    if (roleId !== 4) {
      setVesselFilter('all')
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '80rem' }} // Increased width for more columns
      >
        <div className="custom-modal-header d-flex justify-content-between align-items-center">
          <h5 className="m-0">{crewName} – Work Experience</h5>
          <button className="close-btn" onClick={onClose}>
            <KTSVG path="/media/map/x.svg" className="svg-icon-2x" />
          </button>
        </div>

        {<div className="custom-modal-body" style={{paddingBottom:'0px'}}>
          {/* Filters */}
          {/* <div className="d-flex gap-3 mb-4">
            {roleId !== 4 && (
              <div>
                <label>Vessel:</label>
                <select
                  className="form-control"
                  value={vesselFilter}
                  onChange={e => {
                    setVesselFilter(e.target.value)
                    setCurrentPage(1)
                  }}
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
              Clear Filters
            </button>
          </div> */}

          {/* Merged Table */}
          {loading && <p>Loading…</p>}
          {error && <div className="alert alert-danger">{error}</div>}
          {!loading && !error && (
            <>
              <div
                className="report-table table-responsive"
                style={{ maxHeight: "50rem", overflowY: "auto" }}
              >
                <table className="table table-striped table-bordered align-middle">
                  <thead>
                    <tr>
                      <th>Vessel</th>
                      <th>Rank</th>
                      <th>IMO</th>
                      <th>Vessel Type</th>
                      <th>Experience</th>
                      <th>Port Sign-On</th>
                      <th>Sign-On Date</th>
                      <th>Port Sign-Off</th>
                      <th>Sign-Off Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentPageData.map((r: any) => ( // Using 'any' to accommodate assumed new properties
                      <tr key={r.id}>
                        <td>{r.vesselName || "—"}</td>
                        <td>{r.rankName || "—"}</td>
                        <td>{r.imoNumber || "—"}</td>
                        <td>{r.vesselType || "—"}</td>
                        <td>{calculateExperience(r.signOnDate, r.signOffDate)}</td>
                        <td>{r.portSignOn || "—"}</td>
                        <td>{fmt(r.signOnDate)}</td>
                        <td>{r.portSignOff || "—"}</td>
                        <td>{fmt(r.signOffDate)}</td>
                        <td>
                          {r.status === "SIGNED_ON" ? (
                            <span className="badge badge-light-success">SIGNED ON</span>
                          ) : r.status === "SIGNED_OFF" ? (
                            <span className="badge badge-light-secondary">SIGNED OFF</span>
                          ) : r.status === "PLANNED" ? (
                            <span className="badge badge-light-warning">PLANNED SIGNED ON</span>
                          ) : r.status === "PLANNED_SIGN_OFF" ? (
                            <span className="badge badge-light-danger">PLANNED SIGNED OFF</span>
                          ) : (
                            <span className="badge bg-light-warning text-dark">Unknown</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={10} className="text-center py-4 text-muted">
                          No assignments found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {/* Pagination Controls */}
              <div className="d-flex justify-content-between align-items-center mt-3">
                <div style={{ paddingLeft: '10px', paddingBottom: '10px' }}>
                  Rows per page:&nbsp;
                  <select
                    className="form-select d-inline-block w-auto ms-2"
                    style={{ borderRadius: "20px" }}
                    value={rowsPerPage}
                    onChange={(e) => {
                      setRowsPerPage(+e.target.value);
                      setCurrentPage(1);
                    }}
                  >
                    {[5, 10, 20].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>

                <nav>
                  <ul className="pagination mb-0">
                    <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
                      <button
                        className="page-link"
                        onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                      >
                        ‹
                      </button>
                    </li>
                    {Array.from({ length: totalPages }, (_, i) => (
                      <li
                        key={i}
                        className={`page-item ${currentPage === i + 1 ? "active" : ""}`}
                      >
                        <button
                          className="page-link"
                          onClick={() => setCurrentPage(i + 1)}
                        >
                          {i + 1}
                        </button>
                      </li>
                    ))}
                    <li
                      className={`page-item ${currentPage === totalPages ? "disabled" : ""
                        }`}
                    >
                      <button
                        className="page-link"
                        onClick={() =>
                          setCurrentPage((p) => Math.min(p + 1, totalPages))
                        }
                      >
                        ›
                      </button>
                    </li>
                  </ul>
                </nav>
              </div>
            </>
          )}
        </div>}
      </div>
    </div>
  )
}