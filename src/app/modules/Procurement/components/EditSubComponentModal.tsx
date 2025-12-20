import { FC, useState, useEffect } from "react"
import { toast } from 'react-toastify'
import { SubComponent, CreateSubComponentRequest } from "../core/_models"
import { updateSubComponent } from "../core/_requests"

interface EditSubComponentModalProps {
  visible: boolean
  onClose: () => void
  onSubmit: () => void
  subComponent: SubComponent | null
}

const EditSubComponentModal: FC<EditSubComponentModalProps> = ({ visible, onClose, onSubmit, subComponent }) => {
  const [formData, setFormData] = useState({
    name: ''
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Populate form when subComponent changes
  useEffect(() => {
    if (visible && subComponent) {
      setFormData({
        name: subComponent.name || ''
      })
    }
  }, [visible, subComponent])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}
    if (!formData.name.trim()) newErrors.name = 'Sub Component Name is required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm() || !subComponent) return
    
    setIsSubmitting(true)
    try {
      const payload: CreateSubComponentRequest = {
        part: { id: subComponent.part.id },
        name: formData.name
      }
      
      await updateSubComponent(subComponent.id, payload)
      toast.success('Sub Component updated successfully!')
      onSubmit()
      handleClose()
    } catch (error: any) {
      console.error('Error updating sub component:', error)
      toast.error(error.message || 'Failed to update sub component')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setFormData({
      name: ''
    })
    setErrors({})
    onClose()
  }

  if (!visible || !subComponent) return null

  return (
    <div
      className="modal fade show d-flex align-items-center justify-content-center"
      tabIndex={-1}
      style={{
        backgroundColor: 'rgba(0,0,0,0.5)',
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 1050,
      }}
    >
      <div className='modal-dialog modal-dialog-centered' role='document'>
        <div className='modal-content bg-white' style={{ color: '#181C32' }}>
          <div className='modal-header'>
            <h5 className='modal-title'>Edit Sub Component</h5>
            <button type='button' className='btn-close' onClick={handleClose}></button>
          </div>
          <div className='modal-body'>
            <div className='row g-3'>
              <div className='col-12'>
                <label className='form-label fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Part</label>
                <input
                  type='text'
                  className='form-control'
                  value={`${subComponent.part.name} (${subComponent.part.code})`}
                  disabled
                  style={{ color: '#7E8299', backgroundColor: '#F5F8FA' }}
                />
                <small className='text-muted'>Part cannot be changed</small>
              </div>

              <div className='col-12'>
                <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Sub Component Name</label>
                <input
                  type='text'
                  className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                  name='name'
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder='e.g., Fuel Pump Assembly'
                  style={{ color: '#000' }}
                />
                {errors.name && <div className='invalid-feedback'>{errors.name}</div>}
              </div>
            </div>
          </div>
          <div className='modal-footer'>
            <button type='button' className='btn btn-light btn-sm' onClick={handleClose} disabled={isSubmitting}>Cancel</button>
            <button type='button' className='btn btn_primary' onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update Sub Component'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EditSubComponentModal
