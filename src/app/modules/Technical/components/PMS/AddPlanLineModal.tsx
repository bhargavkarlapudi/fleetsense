import React, { FC, useState, useEffect } from 'react'
import { KTSVG } from '../../../../../_metronic/helpers'
import { createPmsPlanLine } from '../../core/pms/_requests'
import { getEquipmentByVessel, getEquipmentComponentsByEquipment, getSubcomponentsByComponent } from '../../core/_requests'
import { getRunningHourCounters } from '../../core/pms/_requests'
import { toast } from 'react-toastify'
import type { PmsPlanLineDto, PmsWorkType, PmsScheduleType, PmsIntervalUnit, PmsCriticality, RunningHourCounterDto } from '../../core/pms/_models'
import type { EquipmentDto, EquipmentComponentDto, SubcomponentDto } from '../../core/_models'

interface Props {
  visible: boolean
  planId: number
  vesselId: number
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

// Job Types - single letters only
const JOB_TYPES: {value: string; label: string; workType: PmsWorkType}[] = [
  {value: 'I', label: 'I', workType: 'INSPECT'},
  {value: 'G', label: 'G', workType: 'CHECK'},
  {value: 'O', label: 'O', workType: 'OVERHAUL'},
  {value: 'C', label: 'C', workType: 'CLEAN'},
  {value: 'A', label: 'A', workType: 'ADJUST'},
  {value: 'R', label: 'R', workType: 'RENEW'},
  {value: 'S', label: 'S', workType: 'CHECK'},
  {value: 'T', label: 'T', workType: 'TEST'},
  {value: 'M', label: 'M', workType: 'CHECK'},
  {value: 'D', label: 'D', workType: 'CHECK'},
  {value: 'L', label: 'L', workType: 'CHECK'},
]

// Helper to map job type letter to work type enum
const getWorkTypeFromJobType = (jobType: string | null | undefined): PmsWorkType => {
  if (!jobType) return 'INSPECT'
  const found = JOB_TYPES.find(jt => jt.value === jobType.toUpperCase())
  return found ? found.workType : 'INSPECT'
}

const SCHEDULE_TYPES: { value: PmsScheduleType; label: string }[] = [
  { value: 'TIME', label: 'Time-based' },
  { value: 'RUNNING_HOURS', label: 'Running Hours' },
  { value: 'HYBRID_WHICHEVER_FIRST', label: 'Hybrid (Whichever First)' },
  { value: 'HYBRID_BOTH_REQUIRED', label: 'Hybrid (Both Required)' },
]

const PERIODICITY_TYPES: {value: string; label: string}[] = [
  {value: 'M', label: 'Months'},
  {value: 'H', label: 'Hours'},
]

const CRITICALITY_LEVELS: { value: PmsCriticality; label: string }[] = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
]

export const AddPlanLineModal: FC<Props> = ({
  visible,
  planId,
  vesselId,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<Partial<PmsPlanLineDto>>({
    planId,
    taskDescription: '',
    jobType: 'I',
    workType: 'INSPECT',
    scheduleType: 'TIME',
    jobPeriodicity: undefined,
    periodicityId: undefined,
    jobPeriodicity2: undefined,
    periodicityId2: undefined,
    criticality: 'MEDIUM',
    preAlertDays: undefined,
    preAlertHoursThreshold: undefined,
    earlyTolerancePercent: undefined,
    earlyToleranceDays: undefined,
    lateTolerancePercent: undefined,
    lateToleranceDays: undefined,
    lateToleranceHours: undefined,
    active: true,
    componentId: undefined,
    subComponentId: undefined,
    runningHourCounterId: undefined,
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [submitting, setSubmitting] = useState(false)

  // For hierarchy selection
  const [equipment, setEquipment] = useState<EquipmentDto[]>([])
  const [components, setComponents] = useState<EquipmentComponentDto[]>([])
  const [subcomponents, setSubcomponents] = useState<SubcomponentDto[]>([])
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<number | undefined>()
  const [selectedComponentId, setSelectedComponentId] = useState<number | undefined>()
  const [hierarchyType, setHierarchyType] = useState<'component' | 'subcomponent'>('component')
  
  // For running hour counters
  const [runningHourCounters, setRunningHourCounters] = useState<RunningHourCounterDto[]>([])
  const [loadingCounters, setLoadingCounters] = useState(false)

  useEffect(() => {
    if (visible && vesselId) {
      loadEquipment()
      // Reset form
      setFormData({
        planId,
        taskDescription: '',
        jobType: 'I',
        workType: 'INSPECT',
        scheduleType: 'TIME',
        jobPeriodicity: undefined,
        periodicityId: undefined,
        jobPeriodicity2: undefined,
        periodicityId2: undefined,
        criticality: 'MEDIUM',
        preAlertDays: undefined,
        preAlertHoursThreshold: undefined,
        active: true,
        componentId: undefined,
        subComponentId: undefined,
        runningHourCounterId: undefined,
      })
      setErrors({})
      setSelectedEquipmentId(undefined)
      setSelectedComponentId(undefined)
      setComponents([])
      setSubcomponents([])
      setHierarchyType('component')
    }
  }, [visible, planId, vesselId])

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
    if (selectedComponentId && hierarchyType === 'subcomponent') {
      loadSubcomponents(selectedComponentId)
    } else {
      setSubcomponents([])
    }
  }, [selectedComponentId, hierarchyType])

  useEffect(() => {
    const needsCounter = formData.scheduleType === 'RUNNING_HOURS' || 
                         formData.scheduleType === 'HYBRID_WHICHEVER_FIRST' || 
                         formData.scheduleType === 'HYBRID_BOTH_REQUIRED'
    if (needsCounter && selectedEquipmentId && vesselId) {
      loadRunningHourCounters()
    } else {
      setRunningHourCounters([])
    }
  }, [formData.scheduleType, selectedEquipmentId, vesselId])

  const loadEquipment = async () => {
    try {
      const data = await getEquipmentByVessel(vesselId)
      setEquipment(data)
    } catch (error) {
      console.error('Error loading equipment:', error)
      toast.error('Failed to load equipment')
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

  const loadRunningHourCounters = async () => {
    if (!vesselId || !selectedEquipmentId) return
    setLoadingCounters(true)
    try {
      const counters = await getRunningHourCounters(vesselId)
      // Filter counters by selected equipment
      const filtered = counters.filter(c => c.equipmentId === selectedEquipmentId)
      setRunningHourCounters(filtered)
    } catch (error) {
      console.error('Error loading running hour counters:', error)
      toast.error('Failed to load running hour counters', { position: 'top-center' })
    } finally {
      setLoadingCounters(false)
    }
  }

  const getSelectedEquipmentName = () => {
    if (!selectedEquipmentId) return null
    const eq = equipment.find(e => e.id === selectedEquipmentId)
    return eq ? eq.name : null
  }

  const getSelectedComponentName = () => {
    if (!selectedComponentId) return null
    const comp = components.find(c => c.id === selectedComponentId)
    return comp ? comp.name : null
  }

  const getSelectedSubcomponentName = () => {
    if (!formData.subComponentId) return null
    const sub = subcomponents.find(s => s.id === formData.subComponentId)
    return sub ? sub.name : null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: { [key: string]: string } = {}

    if (!formData.taskDescription?.trim()) {
      newErrors.taskDescription = 'Task description is required'
    }
    if (!formData.jobType) {
      newErrors.jobType = 'Job type is required'
    }
    if (!formData.scheduleType) {
      newErrors.scheduleType = 'Schedule type is required'
    }
    const isHybrid = formData.scheduleType === 'HYBRID_WHICHEVER_FIRST' || formData.scheduleType === 'HYBRID_BOTH_REQUIRED'
    const needsTime = formData.scheduleType === 'TIME' || isHybrid
    const needsHours = formData.scheduleType === 'RUNNING_HOURS' || isHybrid

    if (needsTime) {
      if (!formData.jobPeriodicity || formData.jobPeriodicity <= 0) {
        newErrors.jobPeriodicity = 'Periodicity value is required'
      }
      if (!formData.periodicityId || (formData.periodicityId !== 'M' && formData.periodicityId !== 'H')) {
        newErrors.periodicityId = 'Periodicity type must be M (Months) or H (Hours)'
      }
    }

    if (needsHours) {
      if (!formData.jobPeriodicity || formData.jobPeriodicity <= 0) {
        newErrors.jobPeriodicity = 'Periodicity value is required'
      }
      if (formData.periodicityId !== 'H') {
        newErrors.periodicityId = 'Periodicity type must be H (Hours) for running hours schedule'
      }
    }

    if (isHybrid && formData.jobPeriodicity2 && formData.periodicityId2) {
      if (formData.jobPeriodicity2 <= 0) {
        newErrors.jobPeriodicity2 = 'Second periodicity value must be greater than 0'
      }
      if (formData.periodicityId2 !== 'M' && formData.periodicityId2 !== 'H') {
        newErrors.periodicityId2 = 'Second periodicity type must be M (Months) or H (Hours)'
      }
    }
    if ((formData.scheduleType === 'RUNNING_HOURS' || 
         formData.scheduleType === 'HYBRID_WHICHEVER_FIRST' || 
         formData.scheduleType === 'HYBRID_BOTH_REQUIRED') && !formData.runningHourCounterId) {
      newErrors.runningHourCounterId = 'Counter is required for running-hours schedules'
    }    
    if (!formData.componentId) {
      newErrors.componentId = 'Component is required'
    }
    if (hierarchyType === 'subcomponent' && !formData.subComponentId) {
      newErrors.subComponentId = 'Sub-component is required'
    }    
    if (hierarchyType === 'component' && formData.subComponentId) {
      newErrors.hierarchy = 'Cannot select both component and sub-component'
    }
    if (hierarchyType === 'subcomponent' && formData.componentId && !formData.subComponentId) {
      newErrors.hierarchy = 'Sub-component requires a component'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setSubmitting(true)
    try {
      const dto: PmsPlanLineDto = {
        planId,
        taskDescription: formData.taskDescription!,
        jobType: formData.jobType || 'I',
        workType: getWorkTypeFromJobType(formData.jobType),
        scheduleType: formData.scheduleType!,
        jobPeriodicity: formData.jobPeriodicity ?? null,
        periodicityId: formData.periodicityId ?? null,
        jobPeriodicity2: formData.jobPeriodicity2 ?? null,
        periodicityId2: formData.periodicityId2 ?? null,
        criticality: formData.criticality || 'MEDIUM',
        preAlertDays: formData.preAlertDays ?? null,
        preAlertHoursThreshold: formData.preAlertHoursThreshold ?? null,
        earlyTolerancePercent: formData.earlyTolerancePercent ?? null,
        earlyToleranceDays: formData.earlyToleranceDays ?? null,
        lateTolerancePercent: formData.lateTolerancePercent ?? null,
        lateToleranceDays: formData.lateToleranceDays ?? null,
        lateToleranceHours: formData.lateToleranceHours ?? null,
        active: formData.active ?? true,
        componentId: formData.componentId ?? null, // ✅ always send componentId (required for subcomponent too)
subComponentId: hierarchyType === 'subcomponent' ? (formData.subComponentId ?? null) : null,
        runningHourCounterId: (formData.scheduleType === 'RUNNING_HOURS' || 
                                formData.scheduleType === 'HYBRID_WHICHEVER_FIRST' || 
                                formData.scheduleType === 'HYBRID_BOTH_REQUIRED') 
                                ? (formData.runningHourCounterId ?? null) : null,
      }
      await createPmsPlanLine(planId, dto)
      toast.success('Plan line created successfully', { position: 'top-center' })
      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('Error creating plan line:', error)
      toast.error(error.message || 'Failed to create plan line', { position: 'top-center' })
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
          width: '700px',
          maxWidth: '90vw',
          maxHeight: '90vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className='d-flex align-items-center justify-content-between border-bottom px-4 py-3 flex-shrink-0'>
          <h5 className='modal-title text-dark m-0'>Add Plan Line</h5>
          <button type='button' className='btn-close' onClick={onClose}></button>
        </div>
        <form onSubmit={handleSubmit} className='d-flex flex-column flex-grow-1' style={{ minHeight: 0 }}>
          <div className='flex-grow-1 overflow-auto px-4 py-3' style={{ maxHeight: 'calc(90vh - 140px)' }}>
            {/* Hierarchy Type */}
            <div className='mb-5'>
              <label className={LABEL}>Attach To</label>
              <div className='btn-group w-100' role='group'>
                <button
                  type='button'
                  className={`btn ${hierarchyType === 'component' ? 'btn-primary' : 'btn-light'}`}
                  onClick={() => {
                    setHierarchyType('component')
                    // Switching to component: clear only subComponentId (keep componentId)
                    setFormData((prev) => ({ ...prev, subComponentId: undefined }))
                    setSubcomponents([])
                  }}                  
                >
                  Component
                </button>
                <button
                  type='button'
                  className={`btn ${hierarchyType === 'subcomponent' ? 'btn-primary' : 'btn-light'}`}
                  onClick={() => {
                    setHierarchyType('subcomponent')
                    // Switching to subcomponent: keep componentId, just clear subComponentId
                    setFormData((prev) => ({ ...prev, subComponentId: undefined }))
                  }}                  
                >
                  Sub-Component
                </button>
              </div>
            </div>

            {/* Equipment Selection */}
            <div className='mb-5'>
              <label className={LABEL}>Equipment</label>
              <select
                className={`form-select ${errors.equipmentId ? 'is-invalid' : ''}`}
                value={selectedEquipmentId || ''}
                onChange={(e) => {
                  const eqId = e.target.value ? Number(e.target.value) : undefined
                  setSelectedEquipmentId(eqId)
                  setFormData({ ...formData, componentId: undefined, subComponentId: undefined })
                  setSelectedComponentId(undefined)
                }}
              >
                <option value=''>Select Equipment</option>
                {equipment.map((eq) => (
                  <option key={eq.id} value={eq.id}>
                    {eq.name} {eq.code && `(${eq.code})`}
                  </option>
                ))}
              </select>
              {errors.equipmentId && <div className='invalid-feedback'>{errors.equipmentId}</div>}
            </div>

            {/* Component Selection */}
            {selectedEquipmentId && (
              <div className='mb-5'>
                <label className={LABEL}>Component</label>
                <select
                  className={`form-select ${errors.componentId ? 'is-invalid' : ''}`}
                  value={formData.componentId || ''}
                  onChange={(e) => {
                    const compId = e.target.value ? Number(e.target.value) : undefined
                    setSelectedComponentId(compId)
                  
                    // IMPORTANT: Always keep componentId selected.
                    // For subcomponent mode we still need componentId for hierarchy + derivation.
                    setFormData((prev) => ({
                      ...prev,
                      componentId: compId ?? undefined,
                      subComponentId: undefined,
                    }))
                  }}                  
                >
                  <option value=''>Select Component</option>
                  {components.map((comp) => (
                    <option key={comp.id} value={comp.id}>
                      {comp.name} {comp.code && `(${comp.code})`}
                    </option>
                  ))}
                </select>
                {errors.componentId && <div className='invalid-feedback'>{errors.componentId}</div>}
              </div>
            )}

            {/* Sub-Component Selection */}
            {hierarchyType === 'subcomponent' && selectedComponentId && (
              <div className='mb-5'>
                <label className={LABEL}>Sub-Component</label>
                <select
                  className={`form-select ${errors.subComponentId ? 'is-invalid' : ''}`}
                  value={formData.subComponentId || ''}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      subComponentId: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }}
                >
                  <option value=''>Select Sub-Component</option>
                  {subcomponents.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
                {errors.subComponentId && <div className='invalid-feedback'>{errors.subComponentId}</div>}
              </div>
            )}

            {/* Hierarchy Path Display */}
            {(selectedEquipmentId || selectedComponentId || formData.subComponentId) && (
              <div className='mb-5'>
                <label className={LABEL}>Hierarchy Path</label>
                <div className='border rounded p-2 bg-light-subtle'>
                  <span className='text-muted'>Equipment</span>: <strong>{getSelectedEquipmentName() || 'Not selected'}</strong>
                  {selectedComponentId && (
                    <>
                      {' > '}
                      <span className='text-muted'>Component</span>: <strong>{getSelectedComponentName() || 'Not selected'}</strong>
                    </>
                  )}
                  {formData.subComponentId && (
                    <>
                      {' > '}
                      <span className='text-muted'>Sub-Component</span>: <strong>{getSelectedSubcomponentName() || 'Not selected'}</strong>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Running Hour Counter Selector */}
            {(formData.scheduleType === 'RUNNING_HOURS' || 
              formData.scheduleType === 'HYBRID_WHICHEVER_FIRST' || 
              formData.scheduleType === 'HYBRID_BOTH_REQUIRED') && selectedEquipmentId && (
  <div className='mb-5'>
    <label className={LABEL}>Running Hour Counter <span className='text-danger'>*</span></label>

    {loadingCounters ? (
      <div className='text-muted'>Loading counters...</div>
    ) : runningHourCounters.length > 0 ? (
      <>
        <select
          className={`form-select ${errors.runningHourCounterId ? 'is-invalid' : ''}`}
          value={formData.runningHourCounterId ?? ''}
          onChange={(e) => {
            const v = e.target.value ? Number(e.target.value) : undefined
            setFormData((prev) => ({ ...prev, runningHourCounterId: v }))
            setErrors((prev) => ({ ...prev, runningHourCounterId: '' }))
          }}
        >
          <option value=''>Select Counter</option>
          {runningHourCounters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} (Current: {c.currentValue})
            </option>
          ))}
        </select>
        {errors.runningHourCounterId && <div className='invalid-feedback'>{errors.runningHourCounterId}</div>}

        <div className='text-muted fs-7 mt-2'>
          This counter will be used for due calculations and job generation.
        </div>
      </>
    ) : (
      <div className='border rounded p-2 bg-light-warning'>
        <span className='text-warning'>No running hour counters found for this equipment.</span>
        <div className='text-muted fs-7 mt-1'>Create a counter in Running Hours first.</div>
      </div>
    )}
  </div>
)}

            {/* Task Description */}
            <div className='mb-5'>
              <label className={`${LABEL} required`}>Task Description</label>
              <textarea
                className={`form-control ${errors.taskDescription ? 'is-invalid' : ''}`}
                rows={3}
                value={formData.taskDescription || ''}
                onChange={(e) => setFormData({ ...formData, taskDescription: e.target.value })}
                placeholder='Enter task description...'
              />
              {errors.taskDescription && <div className='invalid-feedback'>{errors.taskDescription}</div>}
            </div>

            {/* Job Type */}
            <div className='mb-5'>
              <label className={`${LABEL} required`}>Job Type</label>
              <select
                className={`form-select ${errors.jobType ? 'is-invalid' : ''}`}
                value={formData.jobType || 'I'}
                onChange={(e) => {
                  const jobType = e.target.value
                  const workType = getWorkTypeFromJobType(jobType)
                  setFormData({ ...formData, jobType, workType })
                }}
              >
                {JOB_TYPES.map((jt) => (
                  <option key={jt.value} value={jt.value}>
                    {jt.label}
                  </option>
                ))}
              </select>
              {errors.jobType && <div className='invalid-feedback'>{errors.jobType}</div>}
            </div>

            {/* Schedule Type */}
            <div className='mb-5'>
              <label className={`${LABEL} required`}>Schedule Type</label>
              <select
                className={`form-select ${errors.scheduleType ? 'is-invalid' : ''}`}
                value={formData.scheduleType || ''}
                onChange={(e) => {
                  const st = e.target.value as PmsScheduleType
                  const isHybrid = st === 'HYBRID_WHICHEVER_FIRST' || st === 'HYBRID_BOTH_REQUIRED'
                  const needsTime = st === 'TIME' || isHybrid
                  const needsHours = st === 'RUNNING_HOURS' || isHybrid
                  setFormData((prev) => ({
                    ...prev,
                    scheduleType: st,
                    runningHourCounterId: needsHours ? prev.runningHourCounterId : undefined,
                  }))
                  if (!needsHours) {
                    setErrors((prev) => ({ ...prev, runningHourCounterId: '' }))
                  }
                }}
              >
                {SCHEDULE_TYPES.map((st) => (
                  <option key={st.value} value={st.value}>
                    {st.label}
                  </option>
                ))}
              </select>
              {errors.scheduleType && <div className='invalid-feedback'>{errors.scheduleType}</div>}
            </div>

            {/* Periodicities */}
            {(formData.scheduleType === 'TIME' || 
              formData.scheduleType === 'RUNNING_HOURS' || 
              formData.scheduleType === 'HYBRID_WHICHEVER_FIRST' || 
              formData.scheduleType === 'HYBRID_BOTH_REQUIRED') && (
              <div className='mb-5'>
                <label className={`${LABEL} ${(formData.scheduleType === 'TIME' || formData.scheduleType === 'RUNNING_HOURS') ? 'required' : ''}`}>Periodicities</label>
                <div className='border rounded p-3 bg-light'>
                  <div className='row mb-3'>
                    <div className={`${(formData.scheduleType === 'HYBRID_WHICHEVER_FIRST' || formData.scheduleType === 'HYBRID_BOTH_REQUIRED') ? 'col-md-6' : 'col-md-12'}`}>
                      <label className='form-label fs-7 text-muted mb-1'>
                        Periodicity 1 {(formData.scheduleType === 'TIME' || formData.scheduleType === 'RUNNING_HOURS') && <span className='text-danger'>*</span>}
                      </label>
                      <div className='row g-2'>
                        <div className='col-8'>
                          <input
                            type='number'
                            className={`form-control form-control-sm ${errors.jobPeriodicity ? 'is-invalid' : ''}`}
                            placeholder='Value'
                            min={1}
                            value={formData.jobPeriodicity ?? ''}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                jobPeriodicity: e.target.value ? Number(e.target.value) : undefined,
                              }))
                            }
                          />
                          {errors.jobPeriodicity && <div className='invalid-feedback'>{errors.jobPeriodicity}</div>}
                        </div>
                        <div className='col-4'>
                          <select
                            className={`form-select form-select-sm ${errors.periodicityId ? 'is-invalid' : ''}`}
                            value={formData.periodicityId || ''}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                periodicityId: e.target.value || undefined,
                              }))
                            }
                          >
                            <option value=''>Type</option>
                            {PERIODICITY_TYPES.map((pt) => (
                              <option key={pt.value} value={pt.value}>
                                {pt.label}
                              </option>
                            ))}
                          </select>
                          {errors.periodicityId && <div className='invalid-feedback'>{errors.periodicityId}</div>}
                        </div>
                      </div>
                    </div>
                    {(formData.scheduleType === 'HYBRID_WHICHEVER_FIRST' || formData.scheduleType === 'HYBRID_BOTH_REQUIRED') && (
                      <div className='col-md-6'>
                        <label className='form-label fs-7 text-muted mb-1'>Periodicity 2</label>
                        <div className='row g-2'>
                          <div className='col-8'>
                            <input
                              type='number'
                              className={`form-control form-control-sm ${errors.jobPeriodicity2 ? 'is-invalid' : ''}`}
                              placeholder='Value'
                              min={1}
                              value={formData.jobPeriodicity2 ?? ''}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  jobPeriodicity2: e.target.value ? Number(e.target.value) : undefined,
                                }))
                              }
                            />
                            {errors.jobPeriodicity2 && <div className='invalid-feedback'>{errors.jobPeriodicity2}</div>}
                          </div>
                          <div className='col-4'>
                            <select
                              className={`form-select form-select-sm ${errors.periodicityId2 ? 'is-invalid' : ''}`}
                              value={formData.periodicityId2 || ''}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  periodicityId2: e.target.value || undefined,
                                }))
                              }
                            >
                              <option value=''>Type</option>
                              {PERIODICITY_TYPES.map((pt) => (
                                <option key={pt.value} value={pt.value}>
                                  {pt.label}
                                </option>
                              ))}
                            </select>
                            {errors.periodicityId2 && <div className='invalid-feedback'>{errors.periodicityId2}</div>}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className='text-muted fs-7'>
                    <i className='bi bi-info-circle me-1'></i>
                    {formData.scheduleType === 'TIME' && 'Specify periodicity in Months (M) for time-based scheduling.'}
                    {formData.scheduleType === 'RUNNING_HOURS' && 'Specify periodicity in Hours (H) for running hours-based scheduling.'}
                    {(formData.scheduleType === 'HYBRID_WHICHEVER_FIRST' || formData.scheduleType === 'HYBRID_BOTH_REQUIRED') && 
                      'For hybrid schedules, specify both periodicities. The system will use whichever comes first (or both if required).'}
                  </div>
                </div>
              </div>
            )}

            {/* Criticality */}
            <div className='mb-5'>
              <label className={LABEL}>Criticality</label>
              <select
                className='form-select'
                value={formData.criticality || 'MEDIUM'}
                onChange={(e) => setFormData({ ...formData, criticality: e.target.value as PmsCriticality })}
              >
                {CRITICALITY_LEVELS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Pre-Alert Days */}
            <div className='mb-5'>
              <label className={LABEL}>Pre-Alert Days</label>
              <input
                type='number'
                className='form-control'
                min='0'
                value={formData.preAlertDays || ''}
                onChange={(e) =>
                  setFormData({ ...formData, preAlertDays: e.target.value ? Number(e.target.value) : undefined })
                }
                placeholder='Days before due date to alert'
                title='Number of days before due date to create the job'
              />
              <div className='text-muted fs-7 mt-1'>
                <i className='bi bi-info-circle me-1'></i>
                Creates jobs X days before the due date to give advance notice. Example: If due date is Jan 15 and Pre-Alert Days is 7, the job will be created on Jan 8.
              </div>
            </div>

            {/* Pre-Alert Hours Threshold */}
            <div className='mb-5'>
              <label className={LABEL}>Pre-Alert Hours Threshold</label>
              <input
                type='number'
                className='form-control'
                min={0}
                value={formData.preAlertHoursThreshold ?? ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    preAlertHoursThreshold: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
                placeholder='Hours before due counter to alert'
                title='Number of hours before due counter to create the job'
              />
              <div className='text-muted fs-7 mt-1'>
                <i className='bi bi-info-circle me-1'></i>
                Creates jobs when the running hour counter is within X hours of the due counter. Example: If due counter is 1000 hours and threshold is 50, job is created when counter reaches 950 hours.
              </div>
            </div>

            {/* Tolerance Windows */}
            <div className='mb-5'>
              <label className={LABEL}>Tolerance Windows</label>
              
              {/* Early Tolerance Section */}
              <div className='border rounded p-3 bg-light mb-3'>
                <h6 className='fw-semibold mb-2'>
                  <i className='bi bi-clock-history me-1'></i>
                  Early Tolerance (Prevents completing too early)
                </h6>
                <div className='text-muted fs-7 mb-3'>
                  Prevents jobs from being completed too early. If set, the system will block job completion if attempted before the tolerance window.
                </div>
                <div className='row'>
                  <div className='col-md-6 mb-3'>
                    <label className='form-label fs-7 text-muted'>Early Tolerance (%)</label>
                    <input
                      type='number'
                      className='form-control'
                      min={0}
                      max={100}
                      value={formData.earlyTolerancePercent ?? ''}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          earlyTolerancePercent: e.target.value ? Number(e.target.value) : undefined,
                        }))
                      }
                      placeholder='%'
                      title='Cannot complete job more than X% of the interval period before due date'
                    />
                    <div className='text-muted fs-8 mt-1'>Cannot complete job more than X% of the interval period before due date</div>
                  </div>
                  <div className='col-md-6 mb-3'>
                    <label className='form-label fs-7 text-muted'>Early Tolerance (Days)</label>
                    <input
                      type='number'
                      className='form-control'
                      min={0}
                      value={formData.earlyToleranceDays ?? ''}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          earlyToleranceDays: e.target.value ? Number(e.target.value) : undefined,
                        }))
                      }
                      placeholder='Days'
                      title='Cannot complete job more than X days before due date'
                    />
                    <div className='text-muted fs-8 mt-1'>Cannot complete job more than X days before due date</div>
                  </div>
                </div>
              </div>

              {/* Late Tolerance Section */}
              <div className='border rounded p-3 bg-light'>
                <h6 className='fw-semibold mb-2'>
                  <i className='bi bi-calendar-check me-1'></i>
                  Late Tolerance (Extends overdue threshold)
                </h6>
                <div className='text-muted fs-7 mb-3'>
                  Extends the time window before a job is marked as overdue. Jobs completed within the tolerance window are still considered on-time.
                </div>
                <div className='row'>
                  <div className='col-md-6 mb-3'>
                    <label className='form-label fs-7 text-muted'>Late Tolerance (%)</label>
                    <input
                      type='number'
                      className='form-control'
                      min={0}
                      max={100}
                      value={formData.lateTolerancePercent ?? ''}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          lateTolerancePercent: e.target.value ? Number(e.target.value) : undefined,
                        }))
                      }
                      placeholder='%'
                      title='Job not marked overdue until X% of interval after due date'
                    />
                    <div className='text-muted fs-8 mt-1'>Job not marked overdue until X% of interval after due date</div>
                  </div>
                  <div className='col-md-6 mb-3'>
                    <label className='form-label fs-7 text-muted'>Late Tolerance (Days)</label>
                    <input
                      type='number'
                      className='form-control'
                      min={0}
                      value={formData.lateToleranceDays ?? ''}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          lateToleranceDays: e.target.value ? Number(e.target.value) : undefined,
                        }))
                      }
                      placeholder='Days'
                      title='Job not marked overdue until X days after due date'
                    />
                    <div className='text-muted fs-8 mt-1'>Job not marked overdue until X days after due date</div>
                  </div>
                  <div className='col-md-12'>
                    <label className='form-label fs-7 text-muted'>Late Tolerance (Hours)</label>
                    <input
                      type='number'
                      className='form-control'
                      min={0}
                      value={formData.lateToleranceHours ?? ''}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          lateToleranceHours: e.target.value ? Number(e.target.value) : undefined,
                        }))
                      }
                      placeholder='Hours'
                      title='Job not marked overdue until X hours after due counter'
                    />
                    <div className='text-muted fs-8 mt-1'>Job not marked overdue until X hours after due counter</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Active */}
            <div className='mb-5'>
              <div className='form-check'>
                <input
                  className='form-check-input'
                  type='checkbox'
                  checked={formData.active ?? true}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  id='activeCheck'
                />
                <label className='form-check-label' htmlFor='activeCheck'>
                  Active
                </label>
              </div>
            </div>
          </div>
          <div className='border-top d-flex justify-content-end gap-2 px-4 py-3 flex-shrink-0'>
            <button type='button' className='btn btn-light btn-sm' onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type='submit' className='btn btn-primary btn-sm' disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Plan Line'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

