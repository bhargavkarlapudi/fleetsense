import React, {FC, useState, useEffect} from 'react'
import {toast} from 'react-toastify'
import {KTSVG} from '../../../../_metronic/helpers'
import {useAuth} from '../../auth'
import {getVesselList} from '../../Management/core/_requests'
import {Vessel} from '../../Management/core/_models'

interface UploadCertificate {
  certificateName: string
  dateOfIssue: string
  dateOfExpiry?: string   // ⬅️ optional
  fileName: string
  fileSize: string
}

const API_URL = process.env.REACT_APP_API_URL
const CERTIFICATE_API_URL = `${API_URL}/qhse/certificates`

const CertificateUploadModal: FC<{
  isOpen: boolean
  onClose: () => void
  onSubmit: (
    certificate: Omit<UploadCertificate, 'id' | 'uploadedDate' | 'uploadedBy' | 'fileUrl'>
  ) => void
  selectedVesselId?: string
}> = ({isOpen, onClose, onSubmit, selectedVesselId}) => {


  // const {auth} = useAuth()

  // // Temporary type assertions - replace with actual property names
  //   const {currentUser} = useAuth()
  
  // const userId = (auth?.userDetails as any)?.id 
  // const roleId = (auth?.userDetails as any)?.roleId 
  // const username = (auth?.userDetails as any)?.username
  // const companyGroupAdminId = currentUser?.companyGroupAdminId
  // const companyAdminId = currentUser?.companyAdminId

  const {auth, currentUser} = useAuth()
const roleId = (auth?.userDetails as any)?.roleId
const isCrew = roleId === 4
const userId = (auth?.userDetails as any)?.id 
const username = (auth?.userDetails as any)?.username
const companyGroupAdminId = currentUser?.companyGroupAdminId
const companyAdminId = currentUser?.companyAdminId

// Operator flavors for roleId===6
// - No companyGroupAdminId  -> acts like Superadmin
// - Has companyGroupAdminId -> acts like Company Group Admin
const isOperator = roleId === 6
const operatorActsLikeSuperadmin = isOperator && !currentUser?.companyGroupAdminId
const operatorActsLikeGroupAdmin = isOperator && !!currentUser?.companyGroupAdminId
  
  const [formData, setFormData] = useState<{
    certificateName: string
    dateOfIssue: string
    dateOfExpiry: string
    file: File | null
    vesselId: string
    remark: string
  }>({
    certificateName: '',
    dateOfIssue: '',
    dateOfExpiry: '',
    file: null,
    vesselId: '',
    remark: '',
  })
  const [vessels, setVessels] = useState<Vessel[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingVessels, setIsLoadingVessels] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Fetch vessels when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchVessels()
    }
  }, [isOpen])

  useEffect(() => {
  if (isOpen && isCrew && currentUser?.vessel?.id) {
    setFormData(prev => ({...prev, vesselId: currentUser.vessel!.id.toString()}))
  } else if (isOpen && isCrew) {
    toast.error('No vessel assigned to this crew member')
    setFormData(prev => ({ ...prev, vesselId: '' }))
  }
}, [isOpen, isCrew, currentUser])

  const fetchVessels = async () => {

    if (isCrew) {
  setVessels([]) // No need to fetch list for crews
  setIsLoadingVessels(false)
  return
}

    setIsLoadingVessels(true)
    try {
      const vesselList = await getVesselList()
      

      const vesselsForCompany = vesselList.filter((vessel) => {
        const isActive = vessel.active

  // Superadmin OR Operator acting like Superadmin → all active
  if (roleId === 1 || operatorActsLikeSuperadmin) {
    return isActive
  }

  // Company Group Admin OR Operator acting like Group Admin → by company group
  if (roleId === 5 || operatorActsLikeGroupAdmin) {
    return isActive && vessel.companyGroupAdmin?.id === companyGroupAdminId
  }

  // Company Admin → by subcompany
  if (roleId === 2) {
    return isActive && vessel.companyAdmin?.id === companyAdminId
  }

  return false // default: no access for other roles (crew handled above)
})


      setVessels(vesselsForCompany)
    } catch (error) {
      console.error('Failed to fetch vessel list:', error)
      toast.error('Failed to load vessels')
    } finally {
      setIsLoadingVessels(false)
    }
  }

  const resetForm = () => {
    setFormData({
      certificateName: '',
      dateOfIssue: '',
      dateOfExpiry: '',
      file: null,
      vesselId: '',
      remark: '',
    })
    setErrors({})
  }

  const validateForm = () => {
  const newErrors: Record<string, string> = {}

  if (!formData.certificateName.trim()) {
    newErrors.certificateName = 'Certificate name is required'
  }
  if (!isCrew && !formData.vesselId) {
  newErrors.vesselId = 'Please select a vessel'
}
  if (!formData.dateOfIssue) {
    newErrors.dateOfIssue = 'Issue date is required'
  }

  // ⬇️ dateOfExpiry is OPTIONAL — validate only if provided
  if (formData.dateOfExpiry) {
    const expiryDate = new Date(formData.dateOfExpiry)
    const today = new Date()
    if (expiryDate <= today) {
      newErrors.dateOfExpiry = 'Expiry date must be in the future'
    }
    if (formData.dateOfIssue) {
      const issueDate = new Date(formData.dateOfIssue)
      if (issueDate >= expiryDate) {
        newErrors.dateOfExpiry = 'Expiry date must be after issue date'
      }
    }
  }

  if (!formData.file) {
    newErrors.file = 'PDF file is required'
  } else if (formData.file.type !== 'application/pdf') {
    newErrors.file = 'Only PDF files are allowed'
  }

  setErrors(newErrors)
  return Object.keys(newErrors).length === 0
}


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsSubmitting(true)
  }

  useEffect(() => {

    const uploadCertificate = async () => {
      if (!isSubmitting) return
      if (!formData.file) return
      const token = auth?.auth.jwt

      const form = new FormData()
      form.append('certificateName', formData.certificateName)
      form.append('dateOfIssue', formData.dateOfIssue)
      if (formData.dateOfExpiry) {
  form.append('dateOfExpiry', formData.dateOfExpiry)
}
      form.append('uploadedBy', userId)
      form.append('uploadedByName', username)
      form.append('vesselId', formData.vesselId)
      form.append('remarks', formData.remark)
      form.append('file', formData.file)
      

      try {
        const response = await fetch(`${CERTIFICATE_API_URL}/upload`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: form,
        })
        console.log(response)

        if (!response.ok) throw new Error('Upload failed')
        toast.success('Certificate uploaded successfully!')
        resetForm()
        onClose()
      } catch (error) {
        console.log(error)
        toast.error('Failed to upload certificate')
      } finally {
        setIsSubmitting(false)
      }
    }

    if (isSubmitting) {
      uploadCertificate()
    }
  }, [isSubmitting])

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm()
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div
      className='modal fade show d-block'
      tabIndex={-1}
      style={{backgroundColor: 'rgba(0,0,0,0.5)'}}
    >
      <div className='modal-dialog modal-dialog-centered'>
        <div className='modal-content'>
          <form onSubmit={handleSubmit}>
            <div className='modal-header'>
              <h5 className='modal-title'>
                <KTSVG path='/media/icons/duotune/files/fil003.svg' className='svg-icon-3 me-3' />
                Upload Certificate
              </h5>
              <button
                type='button'
                className='btn-close'
                onClick={handleClose}
                disabled={isSubmitting}
              />
            </div>

            <div className='modal-body'>
              {/* Vessel Selection */}
              {!isCrew && (
              <div className='mb-6'>
                <label className='required fw-semibold fs-6 mb-2'>Select Vessel</label>
                <select
                  className={`form-select form-select-solid ${errors.vesselId ? 'is-invalid' : ''}`}
                  value={formData.vesselId}
                  onChange={(e) => setFormData((prev) => ({...prev, vesselId: e.target.value}))}
                  disabled={isSubmitting || isLoadingVessels || isCrew}
                >
                  <option value=''>
                    {isLoadingVessels ? 'Loading vessels...' : 'Choose a vessel'}
                  </option>
                  {vessels.map((vessel) => (
                    <option key={vessel.id} value={vessel.id}>
                      {(vessel as any).fleet_name}
                    </option>
                  ))}
                </select>
                {errors.vesselId && <div className='invalid-feedback'>{errors.vesselId}</div>}
              </div>
              )}

              {/* Certificate Name */}
              <div className='mb-6'>
                <label className='required fw-semibold fs-6 mb-2'>Certificate Name</label>
                <input
                  type='text'
                  className={`form-control form-control-solid ${
                    errors.certificateName ? 'is-invalid' : ''
                  }`}
                  placeholder='Enter certificate name'
                  value={formData.certificateName}
                  onChange={(e) =>
                    setFormData((prev) => ({...prev, certificateName: e.target.value}))
                  }
                  disabled={isSubmitting}
                />
                {errors.certificateName && (
                  <div className='invalid-feedback'>{errors.certificateName}</div>
                )}
              </div>

              {/* Date of Issue */}
              <div className='mb-6'>
                <label className='required fw-semibold fs-6 mb-2'>Date of Issue</label>
                <input
                  type='date'
                  className={`form-control form-control-solid ${
                    errors.dateOfIssue ? 'is-invalid' : ''
                  }`}
                  value={formData.dateOfIssue}
                  onChange={(e) => setFormData((prev) => ({...prev, dateOfIssue: e.target.value}))}
                  disabled={isSubmitting}
                />
                {errors.dateOfIssue && (
                  <div className='invalid-feedback'>{errors.dateOfIssue}</div>
                )}
              </div>

              {/* Date of Expiry */}
              <div className='mb-6'>
                <label className='fw-semibold fs-6 mb-2'>Date of Expiry</label>
                <input
    type='date'
    className={`form-control form-control-solid ${errors.dateOfExpiry ? 'is-invalid' : ''}`}
    value={formData.dateOfExpiry}
    onChange={(e) => setFormData((prev) => ({...prev, dateOfExpiry: e.target.value}))}
    disabled={isSubmitting}
    min={new Date().toISOString().split('T')[0]}
  />
  {errors.dateOfExpiry && <div className='invalid-feedback'>{errors.dateOfExpiry}</div>}
</div>

              {/* Remark Field */}
              <div className='mb-6'>
                <label className='fw-semibold fs-6 mb-2'>Remark</label>
                <textarea
                  className='form-control form-control-solid'
                  placeholder='Enter any remarks or notes (optional)'
                  rows={3}
                  value={formData.remark}
                  onChange={(e) =>
                    setFormData((prev) => ({...prev, remark: e.target.value}))
                  }
                  disabled={isSubmitting}
                />
              </div>

              {/* File Upload */}
              <div className='mb-6'>
                <label className='required fw-semibold fs-6 mb-2'>
                  Certificate File (PDF only)
                </label>
                <input
                  type='file'
                  className={`form-control form-control-solid ${errors.file ? 'is-invalid' : ''}`}
                  accept='.pdf'
                  onChange={(e) =>
                    setFormData((prev) => ({...prev, file: e.target.files?.[0] || null}))
                  }
                  disabled={isSubmitting}
                />
                {errors.file && <div className='invalid-feedback'>{errors.file}</div>}
                {formData.file && (
                  <div className='form-text text-muted mt-2'>
                    Selected: {formData.file.name} (
                    {(formData.file.size / (1024 * 1024)).toFixed(1)} MB)
                  </div>
                )}
              </div>
            </div>

            <div className='modal-footer'>
              <button
                type='button'
                className='btn btn-light'
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button type='submit' className='btn btn-primary' disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <span className='spinner-border spinner-border-sm me-2' />
                    Uploading...
                  </>
                ) : (
                  <>
                    <KTSVG
                      path='/media/icons/duotune/arrows/arr075.svg'
                      className='svg-icon-4 me-2'
                    />
                    Upload Certificate
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export {CertificateUploadModal}