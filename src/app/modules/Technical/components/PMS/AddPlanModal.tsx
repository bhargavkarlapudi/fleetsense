import React, { FC, useState, useEffect } from 'react'
import { KTSVG } from '../../../../../_metronic/helpers'
import { PmsPlanDto, PmsPlanStatus } from '../../core/pms/_models'
import { getPmsTemplates } from '../../core/pms/_requests'
import { derivePlanFromTemplate } from '../../core/pms/_requests'
import { toast } from 'react-toastify'
import type { Vessel } from '../../../Management/core/_models'
import type { PmsTemplateDto } from '../../core/pms/_models'

interface Props {
  visible: boolean
  onClose: () => void
  onSubmit: (data: PmsPlanDto) => Promise<PmsPlanDto>
  vessels: Vessel[]
}

const LABEL = 'form-label fw-semibold fs-6 mb-2 text-dark'
const WRAP_STYLE: React.CSSProperties = {
  background: 'rgba(0,0,0,0.5)',
  position: 'fixed',
  inset: 0,
  zIndex: 1050,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

export const AddPlanModal: FC<Props> = ({ visible, onClose, onSubmit, vessels }) => {
  const [formData, setFormData] = useState<PmsPlanDto>({
    vesselId: vessels[0]?.id || 0,
    name: '',
    description: '',
    status: 'DRAFT',
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [templates, setTemplates] = useState<PmsTemplateDto[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [showDeriveModal, setShowDeriveModal] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState<number>(0)
  const [replaceDerived, setReplaceDerived] = useState<boolean>(false)


  useEffect(() => {
    if (vessels.length > 0 && !formData.vesselId) {
      setFormData(prev => ({ ...prev, vesselId: vessels[0].id }))
    }
  }, [vessels])

  useEffect(() => {
    if (visible) {
      loadTemplates()
    }
  }, [visible])

  const loadTemplates = async () => {
    setLoadingTemplates(true)
    try {
      const data = await getPmsTemplates()
      setTemplates(data)
    } catch (error) {
      console.error('Error loading templates:', error)
    } finally {
      setLoadingTemplates(false)
    }
  }

  const handleDeriveFromTemplate = async () => {
    if (!selectedTemplateId || !formData.id) {
      toast.error('Please select a template and save the plan first')
      return
    }
    try {
      const result = await derivePlanFromTemplate(formData.id, selectedTemplateId, replaceDerived)
      toast.success(`Derived ${result.linesCreated} plan lines from template`)
      setShowDeriveModal(false)
      onClose() // Close modal after derivation
    } catch (error: any) {
      toast.error(error.message || 'Failed to derive plan from template')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: { [key: string]: string } = {}
    if (!formData.name.trim()) {
      newErrors.name = 'Plan name is required'
    }
    if (!formData.vesselId) {
      newErrors.vesselId = 'Vessel is required'
    }
    setErrors(newErrors)
        if (Object.keys(newErrors).length === 0) {
      try {
        const result = await onSubmit(formData)
        // After plan is created, show derive modal if templates exist
        if (result && typeof result === 'object' && result !== null && 'id' in result && result.id && templates.length > 0) {
          setFormData(result as PmsPlanDto)
          setShowDeriveModal(true)
        } else {
          onClose()
        }
      } catch (error) {
        // Error handling in parent
      }
    }
  }

  if (!visible) return null

  return (
    <div style={WRAP_STYLE} tabIndex={-1} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className='bg-white text-dark rounded shadow-lg d-flex flex-column'
        style={{
          width: '700px',
          maxWidth: '90vw',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className='d-flex align-items-center justify-content-between border-bottom px-4 py-3 flex-shrink-0'>
          <h5 className='modal-title text-dark m-0'>Add New PMS Plan</h5>
          <button type='button' className='btn-close' onClick={onClose}></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className='flex-grow-1 overflow-auto px-4 py-3'>
            <div className='mb-5'>
              <label className={LABEL}>
                Vessel <span className='text-danger'>*</span>
              </label>
              <select
                className={`form-select text-dark ${errors.vesselId ? 'is-invalid' : ''}`}
                value={formData.vesselId}
                onChange={(e) => {
                  setFormData({ ...formData, vesselId: Number(e.target.value) })
                  if (errors.vesselId) setErrors({ ...errors, vesselId: '' })
                }}
              >
                <option value=''>Select Vessel</option>
                {vessels.map(v => (
                  <option key={v.id} value={v.id}>
                    {(v as any).fleet_name || v.name || `Vessel ${v.id}`}
                  </option>
                ))}
              </select>
              {errors.vesselId && <div className='invalid-feedback'>{errors.vesselId}</div>}
            </div>
            <div className='mb-5'>
              <label className={LABEL}>
                Plan Name <span className='text-danger'>*</span>
              </label>
              <input
                type='text'
                className={`form-control text-dark ${errors.name ? 'is-invalid' : ''}`}
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value })
                  if (errors.name) setErrors({ ...errors, name: '' })
                }}
                placeholder='e.g., Main Engine Maintenance Plan'
              />
              {errors.name && <div className='invalid-feedback'>{errors.name}</div>}
            </div>
            <div className='mb-5'>
              <label className={LABEL}>Description</label>
              <textarea
                className='form-control text-dark'
                rows={3}
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder='Plan description (optional)'
              />
            </div>
            <div className='mb-5'>
              <label className={LABEL}>Status</label>
              <select
                className='form-select text-dark'
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as PmsPlanStatus })}
              >
                <option value='DRAFT'>Draft</option>
                <option value='ACTIVE'>Active</option>
                <option value='SUSPENDED'>Suspended</option>
                <option value='ARCHIVED'>Archived</option>
              </select>
            </div>
          </div>
          <div className='border-top d-flex justify-content-end gap-2 px-4 py-3 flex-shrink-0'>
            <button type='button' className='btn btn-light btn-sm' onClick={onClose}>
              Cancel
            </button>
            <button type='submit' className='btn btn-primary btn-sm'>
              Save Plan
            </button>
          </div>
        </form>

        {/* Derive from Template Modal */}
        {showDeriveModal && (
          <div className='position-fixed' style={WRAP_STYLE} onClick={(e) => e.target === e.currentTarget && setShowDeriveModal(false)}>
            <div className='bg-white rounded shadow-lg p-4' style={{ width: '500px', maxWidth: '90vw' }} onClick={(e) => e.stopPropagation()}>
              <h6 className='fw-bold mb-3'>Derive Plan Lines from Template</h6>
              <div className='mb-3'>
                <label className='form-label fw-semibold fs-6 mb-2 text-dark'>Select Template</label>
                {loadingTemplates ? (
                  <div className='text-muted'>Loading templates...</div>
                ) : (
                  <select
                    className='form-select'
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(Number(e.target.value))}
                  >
                    <option value='0'>Select Template</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} {t.machineryType && `(${t.machineryType})`}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className='form-check mb-3'>
  <input
    className='form-check-input'
    type='checkbox'
    id='replaceDerived'
    checked={replaceDerived}
    onChange={(e) => setReplaceDerived(e.target.checked)}
  />
  <label className='form-check-label' htmlFor='replaceDerived'>
    Replace previously derived lines
  </label>
</div>

              <div className='d-flex justify-content-end gap-2'>
                <button type='button' className='btn btn-light btn-sm' onClick={() => { setShowDeriveModal(false); onClose() }}>
                  Skip
                </button>
                <button
                  type='button'
                  className='btn btn-primary btn-sm'
                  onClick={handleDeriveFromTemplate}
                  disabled={!selectedTemplateId}
                >
                  Derive Lines
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

