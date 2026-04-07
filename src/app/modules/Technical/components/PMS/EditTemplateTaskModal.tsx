import React, { FC, useState, useEffect } from 'react'
import { KTSVG } from '../../../../../_metronic/helpers'
import { updatePmsTemplateTask } from '../../core/pms/_requests'
import { getEquipmentList, getEquipmentComponentsByEquipment, getSubcomponentsByComponent } from '../../core/_requests'
import { toast } from 'react-toastify'
import type { PmsTemplateTaskDto, PmsWorkType, PmsScheduleType, PmsIntervalUnit, PmsHierarchyLevel } from '../../core/pms/_models'
import type { EquipmentDto, EquipmentComponentDto, SubcomponentDto } from '../../core/_models'

interface Props {
  visible: boolean
  templateId: number
  templateName: string
  task: PmsTemplateTaskDto
  onClose: () => void
  onSuccess: () => void
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

const WORK_TYPES: { value: PmsWorkType; label: string }[] = [
  { value: 'CHECK', label: 'Check' },
  { value: 'OVERHAUL', label: 'Overhaul' },
  { value: 'RENEW', label: 'Renew' },
  { value: 'ADJUST', label: 'Adjust' },
  { value: 'INSPECT', label: 'Inspect' },
  { value: 'TEST', label: 'Test' },
  { value: 'CLEAN', label: 'Clean' },
]

const SCHEDULE_TYPES: { value: PmsScheduleType; label: string }[] = [
  { value: 'TIME', label: 'Time-based' },
  { value: 'RUNNING_HOURS', label: 'Running Hours' },
  { value: 'HYBRID_WHICHEVER_FIRST', label: 'Hybrid (Whichever First)' },
  { value: 'HYBRID_BOTH_REQUIRED', label: 'Hybrid (Both Required)' },
  { value: 'EVENT', label: 'Event-based' },
  { value: 'DOCK', label: 'Dock' },
  { value: 'AS_REQUIRED', label: 'As Required' },
]

const INTERVAL_UNITS: { value: PmsIntervalUnit; label: string }[] = [
  { value: 'DAYS', label: 'Days' },
  { value: 'MONTHS', label: 'Months' },
  { value: 'YEARS', label: 'Years' },
]

const HIERARCHY_LEVELS: { value: PmsHierarchyLevel; label: string }[] = [
  { value: 'COMPONENT', label: 'Component' },
  { value: 'SUB_COMPONENT', label: 'Sub-Component' },
]

export const EditTemplateTaskModal: FC<Props> = ({
  visible,
  templateId,
  templateName,
  task,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<Partial<PmsTemplateTaskDto>>(task)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [submitting, setSubmitting] = useState(false)

  // For hierarchy reference selection (optional)
  const [equipment, setEquipment] = useState<EquipmentDto[]>([])
  const [components, setComponents] = useState<EquipmentComponentDto[]>([])
  const [subcomponents, setSubcomponents] = useState<SubcomponentDto[]>([])
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<number | undefined>()
  const [selectedComponentId, setSelectedComponentId] = useState<number | undefined>()

  useEffect(() => {
    if (visible) {
      loadEquipment()
      // Pre-fill form with task data
      setFormData(task)
      setErrors({})
      
      // Try to determine equipment/component from referenceId
      // This is a simplified approach - in a real app, you might need to fetch the hierarchy
      if (task.referenceId) {
        // For now, we'll just set the referenceId and let user adjust if needed
        setSelectedEquipmentId(undefined)
        setSelectedComponentId(undefined)
        setComponents([])
        setSubcomponents([])
      }
    }
  }, [visible, task])

  useEffect(() => {
    if (selectedEquipmentId) {
      loadComponents(selectedEquipmentId)
    } else {
      setComponents([])
      setSubcomponents([])
      setSelectedComponentId(undefined)
    }
  }, [selectedEquipmentId])

  useEffect(() => {
    if (selectedComponentId && formData.hierarchyLevel === 'SUB_COMPONENT') {
      loadSubcomponents(selectedComponentId)
    } else {
      setSubcomponents([])
    }
  }, [selectedComponentId, formData.hierarchyLevel])

  const loadEquipment = async () => {
    try {
      const data = await getEquipmentList()
      setEquipment(data)
    } catch (error) {
      console.error('Error loading equipment:', error)
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
    if (!task.id) {
      toast.error('Task ID is missing', { position: 'top-center' })
      return
    }

    const newErrors: { [key: string]: string } = {}

    if (!formData.itemTitle?.trim()) {
      newErrors.itemTitle = 'Item title is required'
    }
    // Note: Templates no longer validate intervalValue/intervalUnit - periodicities are set when creating plan lines

    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    setSubmitting(true)
    try {
      const payload: PmsTemplateTaskDto = {
        templateId,
        hierarchyLevel: formData.hierarchyLevel!,
        referenceId: formData.referenceId || undefined,
        groupTitle: formData.groupTitle || undefined,
        itemTitle: formData.itemTitle!,
        workType: formData.workType!,
        scheduleType: formData.scheduleType!,
        oemCode: formData.oemCode || undefined,
        remarks: formData.remarks || undefined,
        checklist: formData.checklist || undefined,
        requiredRank: formData.requiredRank || undefined,
        estimatedManHours: formData.estimatedManHours || undefined,
        safetyNotes: formData.safetyNotes || undefined,
        permitRequired: formData.permitRequired !== undefined ? formData.permitRequired : false,
        expectedSparesList: formData.expectedSparesList || undefined,
      }

      await updatePmsTemplateTask(task.id, payload)
      toast.success('Template task updated successfully', { position: 'top-center' })
      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('Error updating template task:', error)
      toast.error(error.message || 'Failed to update template task', { position: 'top-center' })
    } finally {
      setSubmitting(false)
    }
  }

  if (!visible) return null

  return (
    <div style={WRAP_STYLE} tabIndex={-1} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className='bg-white text-dark rounded shadow-lg d-flex flex-column'
        style={{
          width: '900px',
          maxWidth: '90vw',
          maxHeight: '90vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className='d-flex align-items-center justify-content-between border-bottom px-4 py-3 flex-shrink-0'>
          <h5 className='modal-title text-dark m-0'>Edit Task in Template: {templateName}</h5>
          <button type='button' className='btn-close' onClick={onClose}></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className='flex-grow-1 overflow-auto px-4 py-3'>
            <div className='row g-3'>
              {/* Hierarchy Level */}
              <div className='col-md-6'>
                <label className={LABEL}>
                  Hierarchy Level <span className='text-danger'>*</span>
                </label>
                <select
                  className='form-select text-dark'
                  value={formData.hierarchyLevel || 'COMPONENT'}
                  onChange={(e) => {
                    const level = e.target.value as PmsHierarchyLevel
                    setFormData({ ...formData, hierarchyLevel: level, referenceId: undefined })
                    setSelectedComponentId(undefined)
                    setSubcomponents([])
                  }}
                >
                  {HIERARCHY_LEVELS.map(hl => (
                    <option key={hl.value} value={hl.value}>{hl.label}</option>
                  ))}
                </select>
              </div>

              {/* Reference ID (optional - can be selected from dropdown or entered manually) */}
              <div className='col-md-6'>
                <label className={LABEL}>Reference (Optional)</label>
                {formData.hierarchyLevel === 'COMPONENT' ? (
                  <>
                    <select
                      className='form-select text-dark'
                      value={selectedEquipmentId || ''}
                      onChange={(e) => {
                        const eqId = e.target.value ? Number(e.target.value) : undefined
                        setSelectedEquipmentId(eqId)
                        setFormData({ ...formData, referenceId: undefined })
                      }}
                    >
                      <option value=''>Select Equipment (Optional)</option>
                      {equipment.map(eq => (
                        <option key={eq.id} value={eq.id}>
                          {eq.name} {eq.code && `(${eq.code})`}
                        </option>
                      ))}
                    </select>
                    {selectedEquipmentId && (
                      <select
                        className='form-select text-dark mt-2'
                        value={selectedComponentId || ''}
                        onChange={(e) => {
                          const compId = e.target.value ? Number(e.target.value) : undefined
                          setSelectedComponentId(compId)
                          setFormData({ ...formData, referenceId: compId })
                        }}
                      >
                        <option value=''>Select Component (Optional)</option>
                        {components.map(comp => (
                          <option key={comp.id} value={comp.id}>
                            {comp.name} {comp.code && `(${comp.code})`}
                          </option>
                        ))}
                      </select>
                    )}
                  </>
                ) : (
                  <>
                    {selectedEquipmentId && (
                      <select
                        className='form-select text-dark mb-2'
                        value={selectedComponentId || ''}
                        onChange={(e) => {
                          const compId = e.target.value ? Number(e.target.value) : undefined
                          setSelectedComponentId(compId)
                        }}
                      >
                        <option value=''>Select Component First</option>
                        {components.map(comp => (
                          <option key={comp.id} value={comp.id}>
                            {comp.name} {comp.code && `(${comp.code})`}
                          </option>
                        ))}
                      </select>
                    )}
                    {selectedComponentId && (
                      <select
                        className='form-select text-dark'
                        value={formData.referenceId || ''}
                        onChange={(e) => {
                          const subId = e.target.value ? Number(e.target.value) : undefined
                          setFormData({ ...formData, referenceId: subId })
                        }}
                      >
                        <option value=''>Select Sub-Component (Optional)</option>
                        {subcomponents.map(sub => (
                          <option key={sub.id} value={sub.id}>
                            {sub.name}
                          </option>
                        ))}
                      </select>
                    )}
                    {!selectedEquipmentId && (
                      <select
                        className='form-select text-dark'
                        value={selectedEquipmentId || ''}
                        onChange={(e) => {
                          const eqId = e.target.value ? Number(e.target.value) : undefined
                          setSelectedEquipmentId(eqId)
                        }}
                      >
                        <option value=''>Select Equipment First</option>
                        {equipment.map(eq => (
                          <option key={eq.id} value={eq.id}>
                            {eq.name} {eq.code && `(${eq.code})`}
                          </option>
                        ))}
                      </select>
                    )}
                  </>
                )}
                <div className='form-text text-muted'>
                  Or enter reference ID manually: <input
                    type='number'
                    className='form-control form-control-sm d-inline-block'
                    style={{ width: '100px' }}
                    value={formData.referenceId || ''}
                    onChange={(e) => setFormData({ ...formData, referenceId: e.target.value ? Number(e.target.value) : undefined })}
                    placeholder='ID'
                  />
                </div>
              </div>

              {/* Group Title */}
              <div className='col-md-12'>
                <label className={LABEL}>Group Title</label>
                <input
                  type='text'
                  className='form-control text-dark'
                  value={formData.groupTitle || ''}
                  onChange={(e) => setFormData({ ...formData, groupTitle: e.target.value })}
                  placeholder='e.g., MAIN ENGINE CYLINDER COVER'
                />
              </div>

              {/* Item Title */}
              <div className='col-md-12'>
                <label className={LABEL}>
                  Item Title <span className='text-danger'>*</span>
                </label>
                <input
                  type='text'
                  className={`form-control text-dark ${errors.itemTitle ? 'is-invalid' : ''}`}
                  value={formData.itemTitle || ''}
                  onChange={(e) => {
                    setFormData({ ...formData, itemTitle: e.target.value })
                    if (errors.itemTitle) setErrors({ ...errors, itemTitle: '' })
                  }}
                  placeholder='e.g., Fuel valve (No.1 cylinder)'
                />
                {errors.itemTitle && <div className='invalid-feedback'>{errors.itemTitle}</div>}
              </div>

              {/* Work Type */}
              <div className='col-md-6'>
                <label className={LABEL}>Work Type</label>
                <select
                  className='form-select text-dark'
                  value={formData.workType || 'CHECK'}
                  onChange={(e) => setFormData({ ...formData, workType: e.target.value as PmsWorkType })}
                >
                  {WORK_TYPES.map(wt => (
                    <option key={wt.value} value={wt.value}>{wt.label}</option>
                  ))}
                </select>
              </div>

              {/* Schedule Type */}
              <div className='col-md-6'>
                <label className={LABEL}>Schedule Type</label>
                <select
                  className='form-select text-dark'
                  value={formData.scheduleType || 'TIME'}
                  onChange={(e) => {
                    const st = e.target.value as PmsScheduleType
                    setFormData({
                      ...formData,
                      scheduleType: st,
                    })
                  }}
                >
                  {SCHEDULE_TYPES.map(st => (
                    <option key={st.value} value={st.value}>{st.label}</option>
                  ))}
                </select>
              </div>

              {/* Note: Templates no longer use intervalValue/intervalUnit - periodicities are set when creating plan lines from templates */}

              {/* OEM Code */}
              <div className='col-md-6'>
                <label className={LABEL}>OEM Code</label>
                <input
                  type='text'
                  className='form-control text-dark'
                  value={formData.oemCode || ''}
                  onChange={(e) => setFormData({ ...formData, oemCode: e.target.value })}
                  placeholder='e.g., 901-1, 902-1'
                />
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

              {/* Checklist */}
              <div className='col-md-12'>
                <label className={LABEL}>Checklist</label>
                <textarea
                  className='form-control text-dark'
                  rows={5}
                  value={formData.checklist || ''}
                  onChange={(e) => setFormData({ ...formData, checklist: e.target.value })}
                  placeholder='Enter checklist steps (one per line or JSON format)'
                />
                <div className='form-text text-muted'>Enter checklist steps, one per line, or use JSON format for structured data</div>
              </div>

              {/* Required Rank */}
              <div className='col-md-6'>
                <label className={LABEL}>Required Rank</label>
                <input
                  type='text'
                  className='form-control text-dark'
                  value={formData.requiredRank || ''}
                  onChange={(e) => setFormData({ ...formData, requiredRank: e.target.value })}
                  placeholder='e.g., C/E, 2/E, 4/E'
                />
              </div>

              {/* Estimated Man-Hours */}
              <div className='col-md-6'>
                <label className={LABEL}>Estimated Man-Hours</label>
                <input
                  type='number'
                  className='form-control text-dark'
                  min={0}
                  step={0.5}
                  value={formData.estimatedManHours ?? ''}
                  onChange={(e) => setFormData({ ...formData, estimatedManHours: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder='e.g., 4.5'
                />
              </div>

              {/* Safety Notes */}
              <div className='col-md-12'>
                <label className={LABEL}>Safety Notes</label>
                <textarea
                  className='form-control text-dark'
                  rows={3}
                  value={formData.safetyNotes || ''}
                  onChange={(e) => setFormData({ ...formData, safetyNotes: e.target.value })}
                  placeholder='Safety precautions and notes'
                />
              </div>

              {/* Permit Required */}
              <div className='col-md-6'>
                <label className={LABEL}>Permit Required</label>
                <div className='d-flex align-items-center gap-4 mt-1'>
                  <div className='form-check form-check-inline'>
                    <input
                      className='form-check-input'
                      type='radio'
                      name='permitRequired'
                      id='permitRequiredYes'
                      value='yes'
                      checked={!!formData.permitRequired}
                      onChange={() => setFormData((prev) => ({ ...prev, permitRequired: true }))}
                    />
                    <label className='form-check-label' htmlFor='permitRequiredYes'>Yes</label>
                  </div>
                  <div className='form-check form-check-inline'>
                    <input
                      className='form-check-input'
                      type='radio'
                      name='permitRequired'
                      id='permitRequiredNo'
                      value='no'
                      checked={!formData.permitRequired}
                      onChange={() => setFormData((prev) => ({ ...prev, permitRequired: false }))}
                    />
                    <label className='form-check-label' htmlFor='permitRequiredNo'>No</label>
                  </div>
                </div>
              </div>

              {/* Expected Spares List */}
              <div className='col-md-12'>
                <label className={LABEL}>Expected Spares List</label>
                <textarea
                  className='form-control text-dark'
                  rows={3}
                  value={formData.expectedSparesList || ''}
                  onChange={(e) => setFormData({ ...formData, expectedSparesList: e.target.value })}
                  placeholder='List expected spare parts (one per line or JSON format)'
                />
                <div className='form-text text-muted'>Enter expected spare parts, one per line, or use JSON format</div>
              </div>
            </div>
          </div>
          <div className='border-top d-flex justify-content-end gap-2 px-4 py-3 flex-shrink-0'>
            <button type='button' className='btn btn-light btn-sm' onClick={onClose}>
              Cancel
            </button>
            <button type='submit' className='btn btn-primary btn-sm' disabled={submitting}>
              {submitting ? 'Saving...' : 'Update Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

