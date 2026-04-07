import React, { FC, useEffect, useState, useMemo } from 'react'
import { KTSVG } from '../../../../../_metronic/helpers'
import { useAuth } from '../../../auth'
import { createPmsJob } from '../../core/pms/_requests'
import { getEquipmentByVessel, getEquipmentComponentsByEquipment, getSubcomponentsByComponent } from '../../core/_requests'
import { searchDefects } from '../../../QHSE/core/_requests'
import { toast } from 'react-toastify'
import type { PmsJobDto } from '../../core/pms/_models'
import type { EquipmentDto, EquipmentComponentDto, SubcomponentDto } from '../../core/_models'
import type { Vessel } from '../../../Management/core/_models'
import type { QHSEDefectDto } from '../../../QHSE/core/_models'

type CompanyGroup = { id: number; name: string }
type Subcompany = { id: number; name: string; companyId: number }

interface Props {
  visible: boolean
  onClose: () => void
  onSuccess: () => void
  vessels: Vessel[]
  companies: CompanyGroup[]
  subcompanies: Subcompany[]
  showCompanyFilters?: boolean
  isCrew?: boolean
  initialDefectId?: number
  initialVesselId?: number
  initialEquipmentId?: number
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

// Removed WORK_TYPES, SCHEDULE_TYPES, and INTERVAL_UNITS - unplanned jobs are always EVENT-based

export const CreateUnplannedJobModal: FC<Props> = ({
  visible,
  onClose,
  onSuccess,
  vessels,
  companies,
  subcompanies,
  showCompanyFilters = true,
  isCrew = false,
  initialDefectId,
  initialVesselId,
  initialEquipmentId,
}) => {
  const { currentUser } = useAuth()
  const [companyId, setCompanyId] = useState<string>('')
  const [subcompanyId, setSubcompanyId] = useState<string>('')
  const [formData, setFormData] = useState<Partial<PmsJobDto>>({
    vesselId: initialVesselId || undefined,
    equipmentId: initialEquipmentId || undefined,
    componentId: undefined,
    subComponentId: undefined,
    componentInstanceId: undefined,
    subComponentInstanceId: undefined,
    title: '',
    scheduleType: 'EVENT', // Unplanned jobs are always EVENT-based
    defectId: initialDefectId || undefined,
    dueDate: undefined, // Optional target date for EVENT jobs
    remarks: '',
    state: 'PLANNED',
    jobType: undefined,
    jobDescription: undefined,
    crewUndertaking: undefined,
    jobInstructions: undefined,
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [equipment, setEquipment] = useState<EquipmentDto[]>([])
  const [components, setComponents] = useState<EquipmentComponentDto[]>([])
  const [subcomponents, setSubcomponents] = useState<SubcomponentDto[]>([])
  const [loadingEquipment, setLoadingEquipment] = useState(false)
  const [defects, setDefects] = useState<QHSEDefectDto[]>([])
  const [loadingDefects, setLoadingDefects] = useState(false)

  const vesselsForModal = useMemo(() => {
    let list = vessels
    if (companyId) {
      const cid = Number(companyId)
      list = list.filter((v: any) =>
        Number(v.companyGroupAdmin?.id ?? v.companyGroupId) === cid
      )
    }
    if (subcompanyId) {
      const scid = Number(subcompanyId)
      list = list.filter((v: any) =>
        Number(v.companyAdmin?.id ?? v.companyId) === scid
      )
    }
    return list
  }, [vessels, companyId, subcompanyId])

  const subcompaniesForCompany = useMemo(() => {
    if (!companyId) return []
    const cid = Number(companyId)
    return subcompanies.filter(sc => sc.companyId === cid)
  }, [subcompanies, companyId])

  useEffect(() => {
    if (visible) {
      // Pre-fill form when opened from defect
      if (initialDefectId || initialVesselId) {
        setFormData(prev => ({
          ...prev,
          vesselId: initialVesselId || prev.vesselId || undefined,
          equipmentId: initialEquipmentId || prev.equipmentId || undefined,
          defectId: initialDefectId || prev.defectId || undefined,
        }))
        if (initialVesselId) {
          loadEquipment(initialVesselId)
        }
      }
    } else {
      // Reset form when modal closes
      setFormData({
        vesselId: initialVesselId || undefined,
        equipmentId: initialEquipmentId || undefined,
        componentId: undefined,
        subComponentId: undefined,
        title: '',
        scheduleType: 'EVENT',
        dueDate: undefined,
        remarks: '',
        state: 'PLANNED',
        defectId: initialDefectId || undefined,
      })
      if (!initialVesselId) {
        setCompanyId('')
        setSubcompanyId('')
      }
      setEquipment([])
      setComponents([])
      setSubcomponents([])
      setErrors({})
    }
  }, [visible])

  useEffect(() => {
    if (formData.vesselId && formData.vesselId > 0) {
      loadEquipment(formData.vesselId)
      loadDefects()
    } else {
      setEquipment([])
      setComponents([])
      setSubcomponents([])
      setDefects([])
    }
  }, [formData.vesselId])

  const loadDefects = async () => {
    if (!formData.vesselId) return
    setLoadingDefects(true)
    try {
      const defectList = await searchDefects({
        vesselId: formData.vesselId,
        activeOnly: true,
      })
      setDefects(defectList)
    } catch (error) {
      console.error('Error loading defects:', error)
    } finally {
      setLoadingDefects(false)
    }
  }

  useEffect(() => {
    if (formData.equipmentId && formData.equipmentId > 0) {
      loadComponents(formData.equipmentId)
    } else {
      setComponents([])
      setSubcomponents([])
    }
    // Reset component/subcomponent when equipment changes
    setFormData(prev => ({ ...prev, componentId: undefined, subComponentId: undefined }))
  }, [formData.equipmentId])

  useEffect(() => {
    if (formData.componentId && formData.componentId > 0) {
      loadSubcomponents(formData.componentId)
    } else {
      setSubcomponents([])
    }
    // Reset subcomponent when component changes
    setFormData(prev => ({ ...prev, subComponentId: undefined }))
  }, [formData.componentId])

  const loadEquipment = async (vesselId: number) => {
    setLoadingEquipment(true)
    try {
      const data = await getEquipmentByVessel(vesselId)
      setEquipment(data)
    } catch (error) {
      console.error('Error loading equipment:', error)
      toast.error('Failed to load equipment', { position: 'top-center' })
    } finally {
      setLoadingEquipment(false)
    }
  }

  const loadComponents = async (equipmentId: number) => {
    try {
      const data = await getEquipmentComponentsByEquipment(equipmentId)
      setComponents(data)
    } catch (error) {
      console.error('Error loading components:', error)
    }
  }

  const loadSubcomponents = async (componentId: number) => {
    try {
      const data = await getSubcomponentsByComponent(componentId)
      setSubcomponents(data)
    } catch (error) {
      console.error('Error loading subcomponents:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: { [key: string]: string } = {}

    if (!formData.vesselId) {
      newErrors.vesselId = 'Vessel is required'
    }
    if (!formData.title?.trim()) {
      newErrors.title = 'Job title is required'
    }
    // Due date is optional for EVENT-based unplanned jobs

    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    try {
      const payload: PmsJobDto = {
        vesselId: formData.vesselId!,
        equipmentId: formData.equipmentId || undefined,
        componentId: formData.componentId || undefined,
        subComponentId: formData.subComponentId || undefined,
        componentInstanceId: formData.componentInstanceId || undefined,
        subComponentInstanceId: formData.subComponentInstanceId || undefined,
        title: formData.title!,
        scheduleType: 'EVENT', // Unplanned jobs are always EVENT-based
        dueDate: formData.dueDate || undefined, // Optional target date
        remarks: formData.remarks || undefined,
        state: 'PLANNED',
        jobType: formData.jobType || undefined,
        jobDescription: formData.jobDescription || undefined,
        crewUndertaking: formData.crewUndertaking || undefined,
        jobInstructions: formData.jobInstructions || undefined,
      }

      await createPmsJob(payload)
      toast.success('Job created successfully', { position: 'top-center' })
      onSuccess()
    } catch (error: any) {
      console.error('Error creating job:', error)
      toast.error(error.message || 'Failed to create job', { position: 'top-center' })
    }
  }

  if (!visible) return null

  return (
    <div style={WRAP_STYLE} tabIndex={-1} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className='bg-white text-dark rounded shadow-lg d-flex flex-column'
        style={{
          width: '800px',
          maxWidth: '90vw',
          maxHeight: '90vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className='d-flex align-items-center justify-content-between border-bottom px-4 py-3 flex-shrink-0'>
          <h5 className='modal-title text-dark m-0'>Create Unplanned Job</h5>
          <button type='button' className='btn-close' onClick={onClose}></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className='flex-grow-1 overflow-auto px-4 py-3' style={{ maxHeight: 'calc(90vh - 140px)' }}>
            <div className='row g-3'>
              {/* Company filter */}
              {showCompanyFilters && (
                <div className='col-md-6'>
                  <label className={LABEL}>Company</label>
                  <select
                    className='form-select text-dark'
                    value={companyId}
                    onChange={(e) => {
                      setCompanyId(e.target.value)
                      setSubcompanyId('')
                      setFormData(prev => ({ ...prev, vesselId: undefined }))
                    }}
                  >
                    <option value=''>All Companies</option>
                    {companies.map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Subcompany filter */}
              {showCompanyFilters && Boolean(companyId) && subcompaniesForCompany.length > 0 && (
                <div className='col-md-6'>
                  <label className={LABEL}>Subcompany</label>
                  <select
                    className='form-select text-dark'
                    value={subcompanyId}
                    onChange={(e) => {
                      setSubcompanyId(e.target.value)
                      setFormData(prev => ({ ...prev, vesselId: undefined }))
                    }}
                  >
                    <option value=''>All Subcompanies</option>
                    {subcompaniesForCompany.map((sc) => (
                      <option key={sc.id} value={String(sc.id)}>
                        {sc.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Vessel */}
              <div className='col-md-12'>
                <label className={LABEL}>
                  Vessel <span className='text-danger'>*</span>
                </label>
                {isCrew ? (
                  <input
                    type='text'
                    className='form-control text-dark'
                    value={currentUser?.vessel?.fleet_name || 'Vessel'}
                    disabled
                  />
                ) : (
                  <select
                    className={`form-select text-dark ${errors.vesselId ? 'is-invalid' : ''}`}
                    value={formData.vesselId || ''}
                    onChange={(e) => {
                      const vId = Number(e.target.value)
                      setFormData({ ...formData, vesselId: vId })
                      if (errors.vesselId) setErrors({ ...errors, vesselId: '' })
                    }}
                    disabled={!!initialVesselId}
                  >
                    <option value=''>Select Vessel</option>
                    {vesselsForModal.map(v => (
                      <option key={v.id} value={v.id}>
                        {(v as any).fleet_name || `Vessel ${v.id}`}
                      </option>
                    ))}
                  </select>
                )}
                {errors.vesselId && <div className='invalid-feedback'>{errors.vesselId}</div>}
              </div>

              {/* Equipment */}
              {formData.vesselId && formData.vesselId > 0 && (
                <div className='col-md-12'>
                  <label className={LABEL}>Equipment (Optional)</label>
                  {loadingEquipment ? (
                    <div className='text-muted'>Loading equipment...</div>
                  ) : (
                    <select
                      className='form-select text-dark'
                      value={formData.equipmentId || ''}
                      onChange={(e) => {
                        const eqId = e.target.value ? Number(e.target.value) : undefined
                        setFormData({ ...formData, equipmentId: eqId })
                      }}
                    >
                      <option value=''>Select Equipment (Optional)</option>
                      {equipment.map(eq => (
                        <option key={eq.id} value={eq.id}>
                          {eq.name} {eq.code && `(${eq.code})`}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Component */}
              {formData.equipmentId && formData.equipmentId > 0 && (
                <div className='col-md-6'>
                  <label className={LABEL}>Component (Optional)</label>
                  <select
                    className='form-select text-dark'
                    value={formData.componentId || ''}
                    onChange={(e) => {
                      const compId = e.target.value ? Number(e.target.value) : undefined
                      setFormData({ ...formData, componentId: compId })
                    }}
                  >
                    <option value=''>Select Component (Optional)</option>
                    {components.map(comp => (
                      <option key={comp.id} value={comp.id}>
                        {comp.name} {comp.code && `(${comp.code})`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* SubComponent */}
              {formData.componentId && formData.componentId > 0 && (
                <div className='col-md-6'>
                  <label className={LABEL}>Sub-Component (Optional)</label>
                  <select
                    className='form-select text-dark'
                    value={formData.subComponentId || ''}
                    onChange={(e) => {
                      const subId = e.target.value ? Number(e.target.value) : undefined
                      setFormData({ ...formData, subComponentId: subId })
                    }}
                  >
                    <option value=''>Select Sub-Component (Optional)</option>
                    {subcomponents.map(sub => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Job Title */}
              <div className='col-md-12'>
                <label className={LABEL}>
                  Job Title <span className='text-danger'>*</span>
                </label>
                <input
                  type='text'
                  className={`form-control text-dark ${errors.title ? 'is-invalid' : ''}`}
                  value={formData.title || ''}
                  onChange={(e) => {
                    setFormData({ ...formData, title: e.target.value })
                    if (errors.title) setErrors({ ...errors, title: '' })
                  }}
                  placeholder='e.g., Main Engine Oil Change'
                />
                {errors.title && <div className='invalid-feedback'>{errors.title}</div>}
              </div>

              {/* Info about unplanned jobs */}
              <div className='col-md-12'>
                <div className='alert alert-info d-flex align-items-center mb-0'>
                  <KTSVG path='/media/icons/duotune/general/gen044.svg' className='svg-icon-2 me-2' />
                  <div>
                    <strong>Unplanned Jobs</strong> are for one-off event-based maintenance tasks (breakdowns, advance work, defect repairs). 
                    For recurring scheduled maintenance, create plan lines instead.
                  </div>
                </div>
              </div>

              {/* Target Date (optional for EVENT jobs) */}
              <div className='col-md-6'>
                <label className={LABEL}>
                  Target Date (Optional)
                </label>
                <input
                  type='date'
                  className='form-control text-dark'
                  value={formData.dueDate || ''}
                  onChange={(e) => {
                    setFormData({ ...formData, dueDate: e.target.value || undefined })
                  }}
                />
                <div className='form-text text-muted'>Optional: When you plan to complete this job</div>
              </div>

              {/* Link to Defect */}
              {formData.vesselId && formData.vesselId > 0 && (
                <div className='col-md-12'>
                  <label className={LABEL}>Link to Defect {initialDefectId ? '(Pre-filled from defect)' : '(Optional)'}</label>
                  {loadingDefects ? (
                    <div className='text-muted'>Loading defects...</div>
                  ) : (
                    <select
                      className='form-select text-dark'
                      value={formData.defectId || ''}
                      onChange={(e) => {
                        const defectId = e.target.value ? Number(e.target.value) : undefined
                        setFormData({ ...formData, defectId })
                      }}
                      disabled={!!initialDefectId}
                    >
                      <option value=''>No Defect Link</option>
                      {defects.map(defect => (
                        <option key={defect.id} value={defect.id}>
                          {defect.defectNumber || `Defect #${defect.id}`} - {defect.description?.substring(0, 50) || 'No description'}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Job Type */}
              <div className='col-md-6'>
                <label className={LABEL}>Job Type</label>
                <select
                  className='form-select text-dark'
                  value={formData.jobType || ''}
                  onChange={(e) => setFormData({ ...formData, jobType: e.target.value || undefined })}
                >
                  <option value=''>Select Job Type</option>
                  <option value='I'>I</option>
                  <option value='G'>G</option>
                  <option value='O'>O</option>
                  <option value='C'>C</option>
                  <option value='A'>A</option>
                  <option value='R'>R</option>
                  <option value='S'>S</option>
                  <option value='T'>T</option>
                  <option value='M'>M</option>
                  <option value='D'>D</option>
                  <option value='L'>L</option>
                </select>
              </div>

              {/* Job Description */}
              <div className='col-md-6'>
                <label className={LABEL}>Job Description</label>
                <input
                  type='text'
                  className='form-control text-dark'
                  value={formData.jobDescription || ''}
                  onChange={(e) => {
                    const value = e.target.value.slice(0, 40) // Max 40 chars
                    setFormData({ ...formData, jobDescription: value || undefined })
                  }}
                  placeholder='Job description'
                  maxLength={40}
                />
                <div className='form-text text-muted'>Max 40 characters</div>
              </div>


              {/* Crew Undertaking */}
              <div className='col-md-6'>
                <label className={LABEL}>Crew Undertaking Job</label>
                <input
                  type='text'
                  className='form-control text-dark'
                  value={formData.crewUndertaking || ''}
                  onChange={(e) => {
                    const value = e.target.value.slice(0, 128) // Max 128 chars
                    setFormData({ ...formData, crewUndertaking: value || undefined })
                  }}
                  placeholder='Crew member or rank'
                  maxLength={128}
                />
                <div className='form-text text-muted'>Max 128 characters</div>
              </div>

              {/* Job Instructions */}
              <div className='col-md-12'>
                <label className={LABEL}>Job Instructions</label>
                <textarea
                  className='form-control text-dark'
                  rows={4}
                  value={formData.jobInstructions || ''}
                  onChange={(e) => setFormData({ ...formData, jobInstructions: e.target.value || undefined })}
                  placeholder='Detailed job instructions'
                />
                <div className='form-text text-muted'>Max 2000 characters</div>
              </div>

              {/* Remarks */}
              <div className='col-md-12'>
                <label className={LABEL}>Remarks</label>
                <textarea
                  className='form-control text-dark'
                  rows={3}
                  value={formData.remarks || ''}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder='Additional notes or instructions'
                />
              </div>
            </div>
          </div>
          <div className='border-top d-flex justify-content-end gap-2 px-4 py-3 flex-shrink-0'>
            <button type='button' className='btn btn-light btn-sm' onClick={onClose}>
              Cancel
            </button>
            <button type='submit' className='btn btn-primary btn-sm'>
              Create Job
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

