import React, { FC, useState } from 'react'
import { KTSVG } from '../../../../_metronic/helpers'

interface CrewMember {
  id: number
  name: string
  rank: string
  status: string
}

interface AddAppraisalModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: AppraisalFormData) => void
  crewMembers: CrewMember[]
}

interface AppraisalFormData {
  crewMember: string
  parameter: string
  remarks: string
  rating: number
}

interface AppraisalFormErrors {
  crewMember?: string
  parameter?: string
  remarks?: string
  rating?: string
}

const AddAppraisalModal: FC<AddAppraisalModalProps> = ({ isOpen, onClose, onSubmit, crewMembers }) => {
  const [formData, setFormData] = useState<AppraisalFormData>({
    crewMember: '',
    parameter: '',
    remarks: '',
    rating: 0,
  })

  const [errors, setErrors] = useState<AppraisalFormErrors>({})

  const handleInputChange = (field: keyof AppraisalFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }))
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined,
      }))
    }
  }

  const handleRatingClick = (rating: number) => {
    handleInputChange('rating', rating)
  }

  const validateForm = (): boolean => {
    const newErrors: AppraisalFormErrors = {}
    
    if (!formData.crewMember.trim()) {
      newErrors.crewMember = 'Please select a crew member'
      alert('Please select a crew member before proceeding with the appraisal.')
    }
    if (!formData.parameter.trim()) newErrors.parameter = 'Appraisal parameter is required'
    if (!formData.remarks.trim()) newErrors.remarks = 'Remarks are required'
    if (formData.rating === 0) newErrors.rating = 'Please select a rating'
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      onSubmit(formData)
      handleReset()
    }
  }

  const handleReset = () => {
    setFormData({
      crewMember: '',
      parameter: '',
      remarks: '',
      rating: 0,
    })
    setErrors({})
  }

  const handleCancel = () => {
    handleReset()
    onClose()
  }

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
      <div className="modal-dialog modal-xl" style={{ maxWidth: '900px' }}>
        <div className="modal-content">
          {/* Modal Header */}
          <div className="modal-header">
            {/* CHANGED: Added `text-dark` class to ensure the title text is black. */}
            <h5 className="modal-title fw-bold text-dark">Add Appraisal</h5>
            <button type="button" className="btn-close" onClick={handleCancel} aria-label="Close"></button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="row">

                {/* Crew Member Selection */}
                <div className="col-12 mb-4">
                  <label htmlFor="crewMember" className="form-label fw-semibold text-dark">
                    Select Crew Member <span className="text-danger">*</span>
                  </label>
                  <select
                    id="crewMember"
                    className={`form-select ${errors.crewMember ? 'is-invalid' : ''}`}
                    value={formData.crewMember}
                    onChange={(e) => handleInputChange('crewMember', e.target.value)}
                  >
                    <option value="">Select a crew member</option>
                    {crewMembers.map((crew) => (
                      <option key={crew.id} value={crew.name}>
                        {crew.name} - {crew.rank}
                      </option>
                    ))}
                  </select>
                  {errors.crewMember && (
                    <div className="invalid-feedback">{errors.crewMember}</div>
                  )}
                </div>

                {/* Appraisal Parameter */}
                <div className="col-12 mb-4">
                  {/* CHANGED: Added `text-dark` class to ensure the label text is black. */}
                  <label htmlFor="parameter" className="form-label fw-semibold text-dark">
                    Appraisal Parameter <span className="text-danger">*</span>
                  </label>
                  <select
                    id="parameter"
                    className={`form-select ${errors.parameter ? 'is-invalid' : ''}`}
                    value={formData.parameter}
                    onChange={(e) => handleInputChange('parameter', e.target.value)}
                  >
                    <option value="">Select Parameter</option>
                    {[
                      'Communication Skills',
                      'Technical Knowledge',
                      'Leadership',
                      'Problem Solving',
                      'Teamwork',
                      'Time Management',
                      'Adaptability',
                      'Safety Compliance',
                      'Customer Service',
                      'Documentation',
                      'Innovation',
                      'Reliability',
                    ].map((param) => (
                      <option key={param} value={param}>{param}</option>
                    ))}
                  </select>
                  {errors.parameter && <div className="invalid-feedback">{errors.parameter}</div>}
                </div>

                {/* Remarks */}
                <div className="col-12 mb-4">
                  {/* CHANGED: Added `text-dark` class to ensure the label text is black. */}
                  <label htmlFor="remarks" className="form-label fw-semibold text-dark">
                    Remarks <span className="text-danger">*</span>
                  </label>
                  <textarea
                    id="remarks"
                    className={`form-control ${errors.remarks ? 'is-invalid' : ''}`}
                    rows={4}
                    placeholder="Enter your remarks..."
                    value={formData.remarks}
                    onChange={(e) => handleInputChange('remarks', e.target.value)}
                  />
                  {errors.remarks && <div className="invalid-feedback">{errors.remarks}</div>}
                </div>

                {/* Rating */}
                <div className="col-12 mb-4">
                  <label className="form-label fw-semibold text-dark">
                    Rating <span className="text-danger">*</span>
                  </label>
                  <div className="d-flex align-items-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        className="btn p-0 me-1"
                        onClick={() => handleRatingClick(star)}
                        style={{ background: 'none', border: 'none' }}
                      >
                        <KTSVG
                          path={
                            star <= formData.rating
                              ? '/media/icons/duotune/general/gen029.svg' // Filled star
                              // FIX: Use the standard Metronic path for an empty star
                              : '/media/icons/duotune/general/star-rating-svgrepo-com.svg' // Empty star
                          }
                          className="svg-icon-2 text-warning"
                        />
                      </button>
                    ))}
                    <span className="ms-3 fw-bold text-muted">
                      {formData.rating > 0 ? `${formData.rating}/5` : 'Click to rate'}
                    </span>
                  </div>
                  {errors.rating && <div className="text-danger small mt-1">{errors.rating}</div>}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={handleCancel}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                <KTSVG path="/media/icons/duotune/general/gen016.svg" className="svg-icon-2 me-1" />
                Submit Appraisal
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default AddAppraisalModal