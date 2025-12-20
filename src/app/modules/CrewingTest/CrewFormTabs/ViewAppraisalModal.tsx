import React, { FC } from 'react'

interface ViewAppraisalModalProps {
  isOpen: boolean
  onClose: () => void
  appraisalData: any // Replace with a proper interface later
}

const ViewAppraisalModal: FC<ViewAppraisalModalProps> = ({ isOpen, onClose, appraisalData }) => {
  if (!isOpen) return null

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
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title fw-bold text-dark">View Appraisal</h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              aria-label="Close"
            ></button>
          </div>

          <div className="modal-body">
            {appraisalData ? (
              <div>
                {/* Appraisal Information Card */}
                <div className="card border-0 bg-light mb-4">
                  <div className="card-body">
                    <h6 className="card-title text-primary fw-bold mb-3">Appraisal Details</h6>
                    
                    {/* Horizontal Layout */}
                    <div className="row g-4">
                      {/* Crew Member */}
                      <div className="col-md-6">
                        <div className="d-flex flex-column">
                          <label className="form-label fw-bold text-dark mb-1">Crew Member</label>
                          <p className="mb-0 text-muted">{appraisalData.crewMember}</p>
                        </div>
                      </div>
                      
                      {/* Appraisal Parameter */}
                      <div className="col-md-6">
                        <div className="d-flex flex-column">
                          <label className="form-label fw-bold text-dark mb-1">Appraisal Parameter</label>
                          <p className="mb-0 text-muted">{appraisalData.parameter}</p>
                        </div>
                      </div>
                      
                      {/* Rating */}
                      <div className="col-md-6">
                        <div className="d-flex flex-column">
                          <label className="form-label fw-bold text-dark mb-1">Rating</label>
                          <div className="d-flex align-items-center">
                            <div className="star-rating me-2">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <span
                                  key={star}
                                  className={`star ${star <= appraisalData.rating ? 'filled' : 'empty'}`}
                                  style={{
                                    fontSize: '18px',
                                    color: star <= appraisalData.rating ? '#ffc107' : '#e4e5e7',
                                    marginRight: '2px'
                                  }}
                                >
                                  ★
                                </span>
                              ))}
                            </div>
                            <span className="text-muted small">({appraisalData.rating}/5)</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Remarks - Full Width */}
                      <div className="col-12">
                        <div className="d-flex flex-column">
                          <label className="form-label fw-bold text-dark mb-1">Remarks</label>
                          <div className="bg-white p-3 rounded border">
                            <p className="mb-0 text-muted">{appraisalData.remarks}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Summary Section */}
                <div className="alert alert-info d-flex align-items-center" role="alert">
                  <i className="fas fa-info-circle me-2"></i>
                  <small className="mb-0">
                    This is the most recent appraisal for <strong>{appraisalData.crewMember}</strong>
                  </small>
                </div>
              </div>
            ) : (
              <div className="text-center py-5">
                <div className="mb-3">
                  <i className="fas fa-exclamation-triangle text-warning" style={{fontSize: '48px'}}></i>
                </div>
                <h6 className="text-muted mb-2">No Appraisal Data Available</h6>
                <p className="text-muted mb-0 small">This crew member doesn't have any appraisal records yet.</p>
              </div>
            )}
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

export default ViewAppraisalModal
