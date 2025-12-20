import React, { FC, useState } from 'react'

interface CrewMember {
  id: number
  name: string
  rank: string
}

interface Appraisal {
  crewMember: string
  parameter: string
  remarks: string
  rating: number
  date: string
}

interface ViewPreviousAppraisalsModalProps {
  isOpen: boolean
  onClose: () => void
  crewMembers: CrewMember[]
  allAppraisals: { [key: string]: Appraisal[] }
}

const ViewPreviousAppraisalsModal: FC<ViewPreviousAppraisalsModalProps> = ({ 
  isOpen, 
  onClose, 
  crewMembers, 
  allAppraisals 
}) => {
  const [selectedCrewMember, setSelectedCrewMember] = useState('')

  if (!isOpen) return null

  const appraisals = selectedCrewMember ? allAppraisals[selectedCrewMember] || [] : []

  return (
    <div 
      className="modal fade show d-flex align-items-center justify-content-center" 
      tabIndex={-1} 
      style={{ 
        backgroundColor: 'rgba(0,0,0,0.5)',
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 1050
      }}
    >
      <div className="modal-dialog modal-xl">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title fw-bold text-dark">View Previous Appraisals</h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              aria-label="Close"
            ></button>
          </div>

          <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
            {/* Crew Member Selection */}
            <div className="mb-4">
              <label htmlFor="crewMemberSelect" className="form-label fw-bold text-dark">Select Crew Member</label>
              <select
                id="crewMemberSelect"
                className="form-select"
                value={selectedCrewMember}
                onChange={(e) => setSelectedCrewMember(e.target.value)}
              >
                <option value="">Select a crew member</option>
                {crewMembers.map((crew) => (
                  <option key={crew.id} value={crew.name}>
                    {crew.name} - {crew.rank}
                  </option>
                ))}
              </select>
            </div>

            {/* Appraisal History */}
            <div>
              {selectedCrewMember ? (
                appraisals.length > 0 ? (
                  <div className="d-grid gap-3">
                    {appraisals.map((appraisal, index) => (
                      <div key={index} className="card border-0 bg-light">
                        <div className="card-body">
                          <h6 className="card-title text-primary fw-bold mb-3">Appraisal Date: {appraisal.date}</h6>
                          <div className="row g-3">
                            <div className="col-md-6">
                              <label className="form-label fw-bold text-dark mb-1">Appraisal Parameter</label>
                              <p className="mb-0 text-muted">{appraisal.parameter}</p>
                            </div>
                            <div className="col-md-6">
                              <label className="form-label fw-bold text-dark mb-1">Rating</label>
                              <div className="d-flex align-items-center">
                                <div className="star-rating me-2">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <span
                                      key={star}
                                      className={`star ${star <= appraisal.rating ? 'filled' : 'empty'}`}
                                      style={{
                                        fontSize: '16px',
                                        color: star <= appraisal.rating ? '#ffc107' : '#e4e5e7',
                                        marginRight: '2px'
                                      }}
                                    >
                                      ★
                                    </span>
                                  ))}
                                </div>
                                <span className="text-muted small">({appraisal.rating}/5)</span>
                              </div>
                            </div>
                            <div className="col-12">
                              <label className="form-label fw-bold text-dark mb-1">Remarks</label>
                              <div className="bg-white p-3 rounded border">
                                <p className="mb-0 text-muted">{appraisal.remarks}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <h6 className="text-muted">No appraisal history for this crew member.</h6>
                  </div>
                )
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted">Please select a crew member to view their appraisal history.</p>
                </div>
              )}
            </div>

          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ViewPreviousAppraisalsModal

