import React, {FC, useEffect, useMemo, useState} from 'react'
import {toast} from 'react-toastify'
import {updatePmsPlanLine, getRunningHourCounters} from '../../core/pms/_requests'
import {
  getEquipmentByVessel,
  getEquipmentComponentsByEquipment,
  getSubcomponentsByComponent,
} from '../../core/_requests'
import type {
  PmsPlanLineDto,
  PmsWorkType,
  PmsScheduleType,
  PmsIntervalUnit,
  PmsCriticality,
  RunningHourCounterDto,
} from '../../core/pms/_models'
import type {EquipmentDto, EquipmentComponentDto, SubcomponentDto} from '../../core/_models'
import { KTSVG } from '../../../../../_metronic/helpers'

interface Props {
  visible: boolean
  planLine: PmsPlanLineDto
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

// Helper to get job type from work type (for initial load)
const getJobTypeFromWorkType = (workType: PmsWorkType | null | undefined): string => {
  if (!workType) return 'I'
  const found = JOB_TYPES.find(jt => jt.workType === workType)
  return found ? found.value : 'I'
}

const SCHEDULE_TYPES: {value: PmsScheduleType; label: string}[] = [
  {value: 'TIME', label: 'Time-based'},
  {value: 'RUNNING_HOURS', label: 'Running Hours'},
  {value: 'HYBRID_WHICHEVER_FIRST', label: 'Hybrid (Whichever First)'},
  {value: 'HYBRID_BOTH_REQUIRED', label: 'Hybrid (Both Required)'},
]

const INTERVAL_UNITS: {value: PmsIntervalUnit; label: string}[] = [
  {value: 'DAYS', label: 'Days'},
  {value: 'MONTHS', label: 'Months'},
  {value: 'YEARS', label: 'Years'},
  {value: 'HOURS', label: 'Hours'},
]

const PERIODICITY_TYPES: {value: string; label: string}[] = [
  {value: 'M', label: 'Months'},
  {value: 'H', label: 'Hours'},
]

const CRITICALITY_LEVELS: {value: PmsCriticality; label: string}[] = [
  {value: 'LOW', label: 'Low'},
  {value: 'MEDIUM', label: 'Medium'},
  {value: 'HIGH', label: 'High'},
  {value: 'CRITICAL', label: 'Critical'},
]

const normalizePlanLine = (p: PmsPlanLineDto): PmsPlanLineDto => {
  const scheduleType = (p.scheduleType ?? 'TIME') as PmsScheduleType
  // Get job type from plan line, or derive from workType, or default to 'I'
  const jobType = p.jobType || getJobTypeFromWorkType(p.workType) || 'I'
  return {
    ...p,
    jobType,
    workType: (p.workType ?? getWorkTypeFromJobType(jobType)) as PmsWorkType,
    scheduleType,
    criticality: (p.criticality ?? 'MEDIUM') as PmsCriticality,
    active: p.active ?? true,

    // Normalize rules based on scheduleType
    runningHourCounterId: scheduleType === 'RUNNING_HOURS' ? (p.runningHourCounterId ?? null) : null,
  }
}

export const EditPlanLineModal: FC<Props> = ({visible, planLine, vesselId, onClose, onSuccess}) => {
  const [formData, setFormData] = useState<PmsPlanLineDto>(() => normalizePlanLine(planLine))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  // Hierarchy
  const [equipment, setEquipment] = useState<EquipmentDto[]>([])
  const [components, setComponents] = useState<EquipmentComponentDto[]>([])
  const [subcomponents, setSubcomponents] = useState<SubcomponentDto[]>([])
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<number | undefined>()
  const [selectedComponentId, setSelectedComponentId] = useState<number | undefined>()
  const [hierarchyType, setHierarchyType] = useState<'component' | 'subcomponent'>(
    planLine.subComponentId ? 'subcomponent' : 'component'
  )

  // Counters
  const [runningHourCounters, setRunningHourCounters] = useState<RunningHourCounterDto[]>([])
  const [loadingCounters, setLoadingCounters] = useState(false)

  const isRunningHours = formData.scheduleType === 'RUNNING_HOURS' || 
                         formData.scheduleType === 'HYBRID_WHICHEVER_FIRST' || 
                         formData.scheduleType === 'HYBRID_BOTH_REQUIRED'
  const isTimeSchedule = formData.scheduleType === 'TIME' || 
                         formData.scheduleType === 'HYBRID_WHICHEVER_FIRST' || 
                         formData.scheduleType === 'HYBRID_BOTH_REQUIRED'

  // ---------- loaders ----------
  const loadEquipment = async () => {
    const data = await getEquipmentByVessel(vesselId)
    const list = Array.isArray(data) ? data : []
    setEquipment(list)
    return list
  }

  const loadComponents = async (equipmentId: number) => {
    const data = await getEquipmentComponentsByEquipment(equipmentId)
    const list = Array.isArray(data) ? data : []
    setComponents(list)
    return list
  }

  const loadSubcomponents = async (componentId: number) => {
    const data = await getSubcomponentsByComponent(componentId)
    const list = Array.isArray(data) ? data : []
    setSubcomponents(list)
    return list
  }

  const loadRunningHourCounters = async () => {
    if (!vesselId || !selectedEquipmentId) return
    setLoadingCounters(true)
    try {
      const counters = await getRunningHourCounters(vesselId)
      const filtered = (Array.isArray(counters) ? counters : []).filter(
        (c) => c.equipmentId === selectedEquipmentId
      )
      setRunningHourCounters(filtered)
      
      // If we have an existing counter ID from the plan line, verify it's in the filtered list
      // If not, it might belong to a different equipment - preserve it but warn user
      if (formData.runningHourCounterId) {
        const existingCounter = filtered.find(c => c.id === formData.runningHourCounterId)
        if (!existingCounter) {
          // Counter exists but doesn't match current equipment - might be from different equipment
          // Keep the ID but user will see it's not in the dropdown
          console.warn(`Running hour counter ${formData.runningHourCounterId} not found in filtered list for equipment ${selectedEquipmentId}`)
        }
      }
    } catch (e) {
      console.error(e)
      setRunningHourCounters([])
      toast.error('Failed to load running hour counters', {position: 'top-center'})
    } finally {
      setLoadingCounters(false)
    }
  }

  // ---------- init on open ----------
  useEffect(() => {
    if (!visible) return
    let cancelled = false

    ;(async () => {
      try {
        setErrors({})
        setFormData(normalizePlanLine(planLine))
        setHierarchyType(planLine.subComponentId ? 'subcomponent' : 'component')
        setComponents([])
        setSubcomponents([])
        setRunningHourCounters([])
        setSelectedEquipmentId(undefined)
        setSelectedComponentId(undefined)

        const eqList = await loadEquipment()
        if (cancelled) return

        // Find equipmentId from componentId by scanning equipment -> components
        let foundEquipmentId: number | undefined = undefined
        if (planLine.componentId) {
          for (const eq of eqList) {
            if (!eq?.id) continue
            const comps = await getEquipmentComponentsByEquipment(eq.id)
            const all = Array.isArray(comps) ? comps : []
            const hit = all.find((c) => c.id === planLine.componentId)
            if (hit) {
              if (cancelled) return
              foundEquipmentId = eq.id
              setSelectedEquipmentId(eq.id)
              setSelectedComponentId(hit.id)
              setComponents(all)
              break
            }
          }
        }

        // If subcomponent mode, load subs for selected component
        if (planLine.subComponentId && planLine.componentId) {
          const subs = await loadSubcomponents(planLine.componentId)
          if (cancelled) return
          setSubcomponents(subs)
          // Ensure subcomponent is set in formData (it should already be from normalizePlanLine, but ensure it's set)
          if (planLine.subComponentId) {
            setFormData((p) => ({...p, subComponentId: planLine.subComponentId ?? null}))
          }
        }
        
        // After equipment is determined, load counters if this is a running hours schedule
        // This ensures the existing counter ID is preserved and can be selected
        if (planLine.runningHourCounterId && 
            (planLine.scheduleType === 'RUNNING_HOURS' || 
             planLine.scheduleType === 'HYBRID_WHICHEVER_FIRST' || 
             planLine.scheduleType === 'HYBRID_BOTH_REQUIRED') &&
            foundEquipmentId) {
          // Load counters so the existing one can be pre-selected
          const counters = await getRunningHourCounters(vesselId)
          if (!cancelled) {
            const filtered = (Array.isArray(counters) ? counters : []).filter(
              (c) => c.equipmentId === foundEquipmentId
            )
            setRunningHourCounters(filtered)
          }
        }
      } catch (e) {
        console.error(e)
        toast.error('Failed to initialize edit modal', {position: 'top-center'})
      }
    })()

    return () => {
      cancelled = true
    }
  }, [visible, vesselId, planLine])

  // When equipment changes -> reload components
  useEffect(() => {
    if (!visible) return
    if (!selectedEquipmentId) {
      setComponents([])
      setSelectedComponentId(undefined)
      setSubcomponents([])
      setFormData((p) => ({...p, componentId: null, subComponentId: null}))
      return
    }

    ;(async () => {
      try {
        const comps = await loadComponents(selectedEquipmentId)
        if (selectedComponentId && !comps.some((c) => c.id === selectedComponentId)) {
          setSelectedComponentId(undefined)
          setFormData((p) => ({...p, componentId: null, subComponentId: null}))
        }
      } catch (e) {
        console.error(e)
      }
    })()
  }, [selectedEquipmentId, selectedComponentId, visible])

  // When component changes -> set componentId & maybe reload subcomponents
  useEffect(() => {
    if (!visible) return

    setFormData((p) => ({
      ...p,
      componentId: selectedComponentId ?? null,
      subComponentId: hierarchyType === 'subcomponent' ? p.subComponentId ?? null : null,
    }))

    if (hierarchyType === 'subcomponent' && selectedComponentId) {
      loadSubcomponents(selectedComponentId).catch(console.error)
    } else {
      setSubcomponents([])
      setFormData((p) => ({...p, subComponentId: null}))
    }
  }, [selectedComponentId, hierarchyType, visible])

  // Load counters if RUNNING_HOURS
  useEffect(() => {
    if (!visible) return
    if (isRunningHours && selectedEquipmentId && vesselId) {
      loadRunningHourCounters()
    } else if (!isRunningHours) {
      // Only clear counter if schedule type is NOT running hours/hybrid
      setRunningHourCounters([])
      setFormData((p) => ({...p, runningHourCounterId: null}))
    } else {
      // If running hours but no equipment selected yet, just clear the list but preserve the counter ID
      setRunningHourCounters([])
    }
  }, [isRunningHours, selectedEquipmentId, vesselId, visible])

  // ---------- helpers ----------
  const selectedEquipmentName = useMemo(() => {
    if (!selectedEquipmentId) return null
    return equipment.find((e) => e.id === selectedEquipmentId)?.name ?? null
  }, [equipment, selectedEquipmentId])

  const selectedComponentName = useMemo(() => {
    if (!selectedComponentId) return null
    return components.find((c) => c.id === selectedComponentId)?.name ?? null
  }, [components, selectedComponentId])

  const selectedSubcomponentName = useMemo(() => {
    if (!formData.subComponentId) return null
    return subcomponents.find((s) => s.id === formData.subComponentId)?.name ?? null
  }, [subcomponents, formData.subComponentId])

  // ---------- submit ----------
  const validate = () => {
    const e: Record<string, string> = {}

    if (!formData.taskDescription?.trim()) e.taskDescription = 'Task description is required'
    if (!formData.jobType) e.jobType = 'Job type is required'
    if (!formData.scheduleType) e.scheduleType = 'Schedule type is required'
    if (!selectedEquipmentId) e.equipmentId = 'Equipment is required'
    if (!formData.componentId) e.componentId = 'Component is required'

    if (hierarchyType === 'subcomponent' && !formData.subComponentId) {
      e.subComponentId = 'Sub-component is required'
    }

    const isHybrid = formData.scheduleType === 'HYBRID_WHICHEVER_FIRST' || formData.scheduleType === 'HYBRID_BOTH_REQUIRED'
    const needsTime = formData.scheduleType === 'TIME' || isHybrid
    const needsHours = formData.scheduleType === 'RUNNING_HOURS' || isHybrid

    if (needsTime) {
      if (!formData.jobPeriodicity || formData.jobPeriodicity <= 0) e.jobPeriodicity = 'Periodicity value is required'
      if (!formData.periodicityId || (formData.periodicityId !== 'M' && formData.periodicityId !== 'H')) {
        e.periodicityId = 'Periodicity type must be M (Months) or H (Hours)'
      }
    }

    if (needsHours) {
      if (!formData.jobPeriodicity || formData.jobPeriodicity <= 0) e.jobPeriodicity = 'Periodicity value is required'
      if (formData.periodicityId !== 'H') {
        e.periodicityId = 'Periodicity type must be H (Hours) for running hours schedule'
      }
      if (!formData.runningHourCounterId) e.runningHourCounterId = 'Counter is required'
    }

    if (isHybrid && formData.jobPeriodicity2 && formData.periodicityId2) {
      if (formData.jobPeriodicity2 <= 0) e.jobPeriodicity2 = 'Second periodicity value must be greater than 0'
      if (formData.periodicityId2 !== 'M' && formData.periodicityId2 !== 'H') {
        e.periodicityId2 = 'Second periodicity type must be M (Months) or H (Hours)'
      }
    }

    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    try {
      const dto: PmsPlanLineDto = {
        ...formData,
        jobType: formData.jobType || 'I',
        workType: getWorkTypeFromJobType(formData.jobType),
        componentId: formData.componentId ?? null,
        subComponentId: hierarchyType === 'subcomponent' ? (formData.subComponentId ?? null) : null,
        runningHourCounterId: isRunningHours ? (formData.runningHourCounterId ?? null) : null,
        jobPeriodicity: formData.jobPeriodicity ?? null,
        periodicityId: formData.periodicityId ?? null,
        jobPeriodicity2: formData.jobPeriodicity2 ?? null,
        periodicityId2: formData.periodicityId2 ?? null,
        preAlertDays: formData.preAlertDays ?? null,
        preAlertHoursThreshold: formData.preAlertHoursThreshold ?? null,
        earlyTolerancePercent: formData.earlyTolerancePercent ?? null,
        earlyToleranceDays: formData.earlyToleranceDays ?? null,
        lateTolerancePercent: formData.lateTolerancePercent ?? null,
        lateToleranceDays: formData.lateToleranceDays ?? null,
        lateToleranceHours: formData.lateToleranceHours ?? null,
        active: formData.active ?? true,
      }

      await updatePmsPlanLine(formData.id!, dto)
      toast.success('Plan line updated successfully', {position: 'top-center'})
      onSuccess()
      onClose()
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || 'Failed to update plan line', {position: 'top-center'})
    } finally {
      setSubmitting(false)
    }
  }

  if (!visible) return null

  return (
    <div style={WRAP_STYLE} tabIndex={-1} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className='bg-white text-dark rounded shadow-lg d-flex flex-column'
        style={{width: '700px', maxWidth: '90vw', maxHeight: '90vh', height: '90vh'}}
        onClick={(e) => e.stopPropagation()}
      >
        <div className='d-flex align-items-center justify-content-between border-bottom px-4 py-3 flex-shrink-0'>
          <h5 className='modal-title text-dark m-0'>Edit Plan Line</h5>
          <button type='button' className='btn-close' onClick={onClose}></button>
        </div>

        <form onSubmit={handleSubmit} className='d-flex flex-column flex-grow-1' style={{minHeight: 0}}>
          <div className='flex-grow-1 overflow-auto px-4 py-3' style={{maxHeight: 'calc(90vh - 120px)'}}>
            {/* Hierarchy Information (Read-Only) */}
            <div className='mb-5'>
              <label className={LABEL}>Hierarchy (Read-Only)</label>
              <div className='border rounded p-3 bg-light-subtle'>
                <div className='d-flex flex-column gap-2'>
                  {selectedEquipmentName && (
                    <div className='d-flex align-items-center'>
                      <KTSVG path='/media/icons/duotune/general/gen025.svg' className='svg-icon-3 text-primary me-2' />
                      <span className='text-muted me-2'>Equipment:</span>
                      <span className='fw-semibold text-primary'>{selectedEquipmentName}</span>
                    </div>
                  )}
                  {selectedComponentName && (
                    <div className='d-flex align-items-center'>
                      <KTSVG path='/media/icons/duotune/general/gen024.svg' className='svg-icon-3 text-info me-2' />
                      <span className='text-muted me-2'>Component:</span>
                      <span className='fw-semibold text-info'>{selectedComponentName}</span>
                    </div>
                  )}
                  {selectedSubcomponentName && (
                    <div className='d-flex align-items-center'>
                      <KTSVG path='/media/icons/duotune/general/gen023.svg' className='svg-icon-3 text-success me-2' />
                      <span className='text-muted me-2'>Sub-Component:</span>
                      <span className='fw-semibold text-success'>{selectedSubcomponentName}</span>
                    </div>
                  )}
                  {hierarchyType === 'component' && (
                    <div className='mt-2'>
                      <span className='badge badge-light-info'>
                        <KTSVG path='/media/icons/duotune/general/gen024.svg' className='svg-icon-2 me-1' />
                        Component-Level Plan Line
                      </span>
                    </div>
                  )}
                  {hierarchyType === 'subcomponent' && (
                    <div className='mt-2'>
                      <span className='badge badge-light-success'>
                        <KTSVG path='/media/icons/duotune/general/gen023.svg' className='svg-icon-2 me-1' />
                        Subcomponent-Level Plan Line
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className='text-muted fs-7 mt-2'>
                <i className='bi bi-info-circle me-1'></i>
                The hierarchy cannot be changed after a plan line is created. To change the hierarchy, create a new plan line.
              </div>
            </div>

            {/* Task Description */}
            <div className='mb-5'>
              <label className={`${LABEL} required`}>Task Description</label>
              <textarea
                className={`form-control ${errors.taskDescription ? 'is-invalid' : ''}`}
                rows={3}
                value={formData.taskDescription || ''}
                onChange={(e) => setFormData((p) => ({...p, taskDescription: e.target.value}))}
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
                  setFormData((p) => ({...p, jobType, workType}))
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
                value={formData.scheduleType as any}
                onChange={(e) => {
                  const st = e.target.value as PmsScheduleType
                  const isHybrid = st === 'HYBRID_WHICHEVER_FIRST' || st === 'HYBRID_BOTH_REQUIRED'
                  const needsTime = st === 'TIME' || isHybrid
                  const needsHours = st === 'RUNNING_HOURS' || isHybrid
                  setFormData((p) => ({
                    ...p,
                    scheduleType: st,
                    runningHourCounterId: needsHours ? (p.runningHourCounterId ?? null) : null,
                  }))
                  if (!needsHours) setErrors((prev) => ({...prev, runningHourCounterId: ''}))
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

            {/* RUNNING HOURS Counter */}
            {isRunningHours && selectedEquipmentId && (
              <div className='mb-5'>
                <label className={LABEL}>
                  Running Hour Counter <span className='text-danger'>*</span>
                </label>

                {loadingCounters ? (
                  <div className='text-muted'>Loading counters...</div>
                ) : runningHourCounters.length > 0 ? (
                  <>
                    <select
                      className={`form-select ${errors.runningHourCounterId ? 'is-invalid' : ''}`}
                      value={formData.runningHourCounterId ?? ''}
                      onChange={(e) => {
                        const v = e.target.value ? Number(e.target.value) : null
                        setFormData((p) => ({...p, runningHourCounterId: v}))
                        setErrors((p) => ({...p, runningHourCounterId: ''}))
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
                  </>
                ) : (
                  <div className='border rounded p-2 bg-light-warning'>
                    <span className='text-warning'>No running hour counters found for this equipment.</span>
                    <div className='text-muted fs-7 mt-1'>Create a counter in Running Hours first.</div>
                  </div>
                )}
              </div>
            )}

            {/* Periodicities */}
            {(isTimeSchedule || isRunningHours || formData.scheduleType === 'HYBRID_WHICHEVER_FIRST' || formData.scheduleType === 'HYBRID_BOTH_REQUIRED') && (
              <div className='mb-5'>
                <label className={LABEL}>Periodicities</label>
                <div className='border rounded p-3 bg-light'>
                  <div className='row mb-3'>
                    <div className='col-md-6'>
                      <label className='form-label fs-7 text-muted mb-1'>
                        Periodicity 1
                        {formData.periodicityId && (
                          <span className={`badge badge-sm ms-2 ${
                            formData.periodicityId === 'H' ? 'badge-light-success' : 'badge-light-primary'
                          }`}>
                            {formData.periodicityId === 'H' ? 'Running Hours' : formData.periodicityId === 'M' ? 'Time-based (Months)' : formData.periodicityId}
                          </span>
                        )}
                      </label>
                      <div className='row g-2'>
                        <div className='col-8'>
                          <input
                            type='number'
                            className='form-control form-control-sm'
                            placeholder='Value'
                            min={1}
                            value={formData.jobPeriodicity ?? ''}
                            onChange={(e) =>
                              setFormData((p) => ({
                                ...p,
                                jobPeriodicity: e.target.value ? Number(e.target.value) : null,
                              }))
                            }
                          />
                        </div>
                        <div className='col-4'>
                          <select
                            className='form-select form-select-sm'
                            value={formData.periodicityId || ''}
                            onChange={(e) =>
                              setFormData((p) => ({
                                ...p,
                                periodicityId: e.target.value || null,
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
                        </div>
                      </div>
                      {formData.jobPeriodicity && formData.periodicityId && (
                        <div className='text-muted fs-8 mt-1'>
                          Current: {formData.jobPeriodicity} {formData.periodicityId === 'H' ? 'Hours' : formData.periodicityId === 'M' ? 'Months' : formData.periodicityId}
                        </div>
                      )}
                    </div>
                    <div className='col-md-6'>
                      <label className='form-label fs-7 text-muted mb-1'>
                        Periodicity 2
                        {formData.periodicityId2 && (
                          <span className={`badge badge-sm ms-2 ${
                            formData.periodicityId2 === 'H' ? 'badge-light-success' : 'badge-light-primary'
                          }`}>
                            {formData.periodicityId2 === 'H' ? 'Running Hours' : formData.periodicityId2 === 'M' ? 'Time-based (Months)' : formData.periodicityId2}
                          </span>
                        )}
                      </label>
                      <div className='row g-2'>
                        <div className='col-8'>
                          <input
                            type='number'
                            className='form-control form-control-sm'
                            placeholder='Value'
                            min={1}
                            value={formData.jobPeriodicity2 ?? ''}
                            onChange={(e) =>
                              setFormData((p) => ({
                                ...p,
                                jobPeriodicity2: e.target.value ? Number(e.target.value) : null,
                              }))
                            }
                          />
                        </div>
                        <div className='col-4'>
                          <select
                            className='form-select form-select-sm'
                            value={formData.periodicityId2 || ''}
                            onChange={(e) =>
                              setFormData((p) => ({
                                ...p,
                                periodicityId2: e.target.value || null,
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
                        </div>
                      </div>
                      {formData.jobPeriodicity2 && formData.periodicityId2 && (
                        <div className='text-muted fs-8 mt-1'>
                          Current: {formData.jobPeriodicity2} {formData.periodicityId2 === 'H' ? 'Hours' : formData.periodicityId2 === 'M' ? 'Months' : formData.periodicityId2}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className='text-muted fs-7'>
                    <i className='bi bi-info-circle me-1'></i>
                    For hybrid schedules, specify both periodicities. The system will use whichever comes first (or both if required).
                    <br />
                    <strong>H = Running Hours</strong> (based on equipment running hour counter) | <strong>M = Time-based (Months)</strong> (based on calendar date)
                  </div>
                </div>
              </div>
            )}

            {/* Criticality */}
            <div className='mb-5'>
              <label className={LABEL}>Criticality</label>
              <select
                className='form-select'
                value={formData.criticality as any}
                onChange={(e) => setFormData((p) => ({...p, criticality: e.target.value as PmsCriticality}))}
              >
                {CRITICALITY_LEVELS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Pre-alerts */}
            <div className='mb-5'>
              <label className={LABEL}>Pre-Alert Days</label>
              <input
                type='number'
                className='form-control'
                min={0}
                value={formData.preAlertDays ?? ''}
                onChange={(e) => setFormData((p) => ({...p, preAlertDays: e.target.value ? Number(e.target.value) : null}))}
                title='Number of days before due date to create the job'
              />
              <div className='text-muted fs-7 mt-1'>
                <i className='bi bi-info-circle me-1'></i>
                Creates jobs X days before the due date to give advance notice. Example: If due date is Jan 15 and Pre-Alert Days is 7, the job will be created on Jan 8.
              </div>
            </div>

            <div className='mb-5'>
              <label className={LABEL}>Pre-Alert Hours Threshold</label>
              <input
                type='number'
                className='form-control'
                min={0}
                value={formData.preAlertHoursThreshold ?? ''}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    preAlertHoursThreshold: e.target.value ? Number(e.target.value) : null,
                  }))
                }
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
                        setFormData((p) => ({
                          ...p,
                          earlyTolerancePercent: e.target.value ? Number(e.target.value) : null,
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
                        setFormData((p) => ({
                          ...p,
                          earlyToleranceDays: e.target.value ? Number(e.target.value) : null,
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
                        setFormData((p) => ({
                          ...p,
                          lateTolerancePercent: e.target.value ? Number(e.target.value) : null,
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
                        setFormData((p) => ({
                          ...p,
                          lateToleranceDays: e.target.value ? Number(e.target.value) : null,
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
                        setFormData((p) => ({
                          ...p,
                          lateToleranceHours: e.target.value ? Number(e.target.value) : null,
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
                  onChange={(e) => setFormData((p) => ({...p, active: e.target.checked}))}
                  id='activeCheckEdit'
                />
                <label className='form-check-label' htmlFor='activeCheckEdit'>
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
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
