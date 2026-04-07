import React, { FC, useState, useEffect, useMemo } from 'react'
import { KTSVG } from '../../../../../_metronic/helpers'
import { useAuth } from '../../../auth'
import { getVesselList } from '../../../Management/core/_requests'
import { toast } from 'react-toastify'
import type { Vessel } from '../../../Management/core/_models'
import type { PmsJobRecord } from '../../core/pms/_models'
import { searchPmsJobs } from '../../core/pms/_requests'
import { PmsJobDetailModal } from './PmsJobDetailModal'

const WeeklyPlanningBoard: FC = () => {
  const { currentUser, auth } = useAuth()
  const roleId = Number((auth?.userDetails as any)?.roleId ?? (currentUser?.role?.id ?? 0)) || 0
  const isCrew = roleId === 4

  const [selectedVesselId, setSelectedVesselId] = useState<string>('')
  const [vessels, setVessels] = useState<Vessel[]>([])
  const [jobs, setJobs] = useState<PmsJobRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [viewing, setViewing] = useState<PmsJobRecord | null>(null)

  // Week navigation
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date()
    const day = today.getDay()
    const diff = today.getDate() - day + (day === 0 ? -6 : 1) // Monday
    const monday = new Date(today.setDate(diff))
    monday.setHours(0, 0, 0, 0)
    return monday
  })

  const weekDays = useMemo(() => {
    const days: Date[] = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart)
      date.setDate(date.getDate() + i)
      days.push(date)
    }
    return days
  }, [currentWeekStart])

  useEffect(() => {
    loadVessels()
  }, [])

  useEffect(() => {
    if (selectedVesselId || isCrew) {
      loadJobs()
    }
  }, [selectedVesselId, currentWeekStart, isCrew])

  const loadVessels = async () => {
    try {
      const vesselsData = await getVesselList()
      let vesselsForUser: Vessel[] = []
      
      if (roleId === 4) {
        const vId = currentUser?.vessel?.id
        vesselsForUser = vId ? vesselsData.filter((v: any) => v.id === vId) : []
      } else {
        const operatorActsLikeSuperadmin = roleId === 6 && !currentUser?.companyGroupAdminId
        const operatorActsLikeGroupAdmin = roleId === 6 && !!currentUser?.companyGroupAdminId

        vesselsForUser = vesselsData.filter((v: any) => {
          const isActive = v?.active ?? true
          if (roleId === 1 || operatorActsLikeSuperadmin) return isActive
          if (roleId === 5 || operatorActsLikeGroupAdmin) {
            const cgaId = currentUser?.companyGroupAdminId ?? currentUser?.companyGroupAdmin?.id
            return isActive && (v?.companyGroupAdmin?.id === cgaId || v?.companyGroupId === cgaId)
          }
          if (roleId === 2) {
            const caId = currentUser?.companyAdminId ?? currentUser?.companyAdmin?.id
            return isActive && (v?.companyAdmin?.id === caId || v?.companyId === caId)
          }
          return false
        })
      }
      
      setVessels(vesselsForUser)
      if (vesselsForUser.length === 1 && !selectedVesselId) {
        setSelectedVesselId(String(vesselsForUser[0].id))
      } else if (isCrew && currentUser?.vessel?.id) {
        setSelectedVesselId(String(currentUser.vessel.id))
      }
    } catch (error) {
      console.error('Error loading vessels:', error)
    }
  }

  const loadJobs = async () => {
    const vesselId = selectedVesselId ? Number(selectedVesselId) : (isCrew ? currentUser?.vessel?.id : undefined)
    if (!vesselId) return

    setLoading(true)
    try {
      const weekEnd = new Date(currentWeekStart)
      weekEnd.setDate(weekEnd.getDate() + 7)
      
      const jobsData = await searchPmsJobs(
        vesselId,
        undefined, // state
        currentWeekStart.toISOString().split('T')[0],
        weekEnd.toISOString().split('T')[0]
      )
      
      setJobs(Array.isArray(jobsData) ? jobsData : [])
    } catch (error: any) {
      console.error('Error loading jobs:', error)
      toast.error(error?.message || 'Failed to load jobs', { position: 'top-center' })
    } finally {
      setLoading(false)
    }
  }

  const getJobsForDay = (date: Date): PmsJobRecord[] => {
    const dateStr = date.toISOString().split('T')[0]
    return jobs.filter(job => {
      const jobDate = job.dueDate || job.plannedExecutionDate
      if (!jobDate) return false
      const jobDateStr = new Date(jobDate).toISOString().split('T')[0]
      return jobDateStr === dateStr
    })
  }

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentWeekStart)
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7))
    setCurrentWeekStart(newDate)
  }

  const goToToday = () => {
    const today = new Date()
    const day = today.getDay()
    const diff = today.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(today.setDate(diff))
    monday.setHours(0, 0, 0, 0)
    setCurrentWeekStart(monday)
  }

  const getStateBadgeClass = (state: string) => {
    switch (state) {
      case 'PLANNED': return 'badge-light-info'
      case 'IN_PROGRESS': return 'badge-light-warning'
      case 'COMPLETED': return 'badge-light-primary'
      case 'VERIFIED': return 'badge-light-success'
      case 'CLOSED': return 'badge-light-success'
      case 'DEFERRED': return 'badge-light-danger'
      case 'CANCELLED': return 'badge-light-secondary'
      default: return 'badge-light'
    }
  }

  const isOverdue = (job: PmsJobRecord): boolean => {
    if (!job.dueDate) return false
    const dueDate = new Date(job.dueDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return dueDate < today && job.state !== 'COMPLETED' && job.state !== 'VERIFIED' && job.state !== 'CLOSED'
  }

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  return (
    <div className='card'>
      <div className='card-header border-0 pt-6'>
        <div className='card-title'>
          <h3 className='fw-bold m-0'>Weekly Planning Board</h3>
        </div>
        <div className='card-toolbar'>
          <div className='d-flex align-items-center gap-2'>
            {/* Vessel Filter */}
            {!isCrew && (
              <select
                className='form-select form-select-sm w-150px'
                value={selectedVesselId}
                onChange={(e) => setSelectedVesselId(e.target.value)}
              >
                <option value=''>All Vessels</option>
                {vessels.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.fleet_name || `Vessel #${v.id}`}
                  </option>
                ))}
              </select>
            )}

            {/* Week Navigation */}
            <button
              className='btn btn-sm btn-light'
              onClick={() => navigateWeek('prev')}
              title='Previous Week'
            >
              <KTSVG path='/media/icons/duotune/arrows/arr063.svg' className='svg-icon-2' />
            </button>
            <button
              className='btn btn-sm btn-light'
              onClick={goToToday}
              title='Go to Current Week'
            >
              Today
            </button>
            <button
              className='btn btn-sm btn-light'
              onClick={() => navigateWeek('next')}
              title='Next Week'
            >
              <KTSVG path='/media/icons/duotune/arrows/arr064.svg' className='svg-icon-2' />
            </button>
          </div>
        </div>
      </div>

      <div className='card-body'>
        {loading ? (
          <div className='text-center py-10'>
            <div className='spinner-border text-primary' role='status'>
              <span className='visually-hidden'>Loading...</span>
            </div>
          </div>
        ) : (
          <div className='table-responsive'>
            <table className='table table-bordered align-middle'>
              <thead>
                <tr>
                  <th className='text-center' style={{ width: '14%' }}>
                    <div className='fw-bold'>Monday</div>
                    <div className='text-muted fs-7'>{formatDate(weekDays[0])}</div>
                  </th>
                  <th className='text-center' style={{ width: '14%' }}>
                    <div className='fw-bold'>Tuesday</div>
                    <div className='text-muted fs-7'>{formatDate(weekDays[1])}</div>
                  </th>
                  <th className='text-center' style={{ width: '14%' }}>
                    <div className='fw-bold'>Wednesday</div>
                    <div className='text-muted fs-7'>{formatDate(weekDays[2])}</div>
                  </th>
                  <th className='text-center' style={{ width: '14%' }}>
                    <div className='fw-bold'>Thursday</div>
                    <div className='text-muted fs-7'>{formatDate(weekDays[3])}</div>
                  </th>
                  <th className='text-center' style={{ width: '14%' }}>
                    <div className='fw-bold'>Friday</div>
                    <div className='text-muted fs-7'>{formatDate(weekDays[4])}</div>
                  </th>
                  <th className='text-center' style={{ width: '14%' }}>
                    <div className='fw-bold'>Saturday</div>
                    <div className='text-muted fs-7'>{formatDate(weekDays[5])}</div>
                  </th>
                  <th className='text-center' style={{ width: '14%' }}>
                    <div className='fw-bold'>Sunday</div>
                    <div className='text-muted fs-7'>{formatDate(weekDays[6])}</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  {weekDays.map((day, dayIndex) => {
                    const dayJobs = getJobsForDay(day)
                    const isToday = day.toDateString() === new Date().toDateString()
                    
                    return (
                      <td
                        key={dayIndex}
                        className={`align-top ${isToday ? 'bg-light-warning' : ''}`}
                        style={{ minHeight: '400px', verticalAlign: 'top' }}
                      >
                        <div className='d-flex flex-column gap-2 p-2'>
                          {dayJobs.length === 0 ? (
                            <div className='text-muted text-center py-5 fs-7'>No jobs scheduled</div>
                          ) : (
                            dayJobs.map(job => (
                              <div
                                key={job.id}
                                className={`card card-sm cursor-pointer ${isOverdue(job) ? 'border-danger' : ''}`}
                                onClick={() => {
                                  setViewing(job)
                                  setViewOpen(true)
                                }}
                                style={{ 
                                  borderLeft: job.criticality === 'HIGH' ? '4px solid #F1416C' : 
                                            job.criticality === 'MEDIUM' ? '4px solid #FFC700' : 
                                            '4px solid #50CD89'
                                }}
                              >
                                <div className='card-body p-2'>
                                  <div className='d-flex justify-content-between align-items-start mb-1'>
                                    <div className='fw-bold fs-7'>{job.jobCode || `Job #${job.id}`}</div>
                                    <span className={`badge ${getStateBadgeClass(job.state)}`}>
                                      {job.state}
                                    </span>
                                  </div>
                                  <div className='text-muted fs-8 mb-1' style={{ 
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}>
                                    {job.title}
                                  </div>
                                  {job.equipmentName && (
                                    <div className='text-muted fs-8'>
                                      <KTSVG path='/media/icons/duotune/general/gen025.svg' className='svg-icon-4' />
                                      {job.equipmentName}
                                    </div>
                                  )}
                                  {isOverdue(job) && (
                                    <div className='badge badge-light-danger mt-1'>
                                      Overdue
                                    </div>
                                  )}
                                  {job.criticality && (
                                    <div className='mt-1'>
                                      <span className={`badge ${
                                        job.criticality === 'HIGH' || job.criticality === 'CRITICAL' ? 'badge-light-danger' :
                                        job.criticality === 'MEDIUM' ? 'badge-light-warning' :
                                        'badge-light-success'
                                      }`}>
                                        {job.criticality}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Summary */}
        <div className='row mt-5'>
          <div className='col-md-12'>
            <div className='card bg-light'>
              <div className='card-body'>
                <h5 className='card-title'>Week Summary</h5>
                <div className='row'>
                  <div className='col-md-3'>
                    <div className='d-flex align-items-center'>
                      <div className='symbol symbol-30px me-3'>
                        <div className='symbol-label bg-light-info'>
                          <KTSVG path='/media/icons/duotune/general/gen025.svg' className='svg-icon-2 svg-icon-info' />
                        </div>
                      </div>
                      <div>
                        <div className='fs-6 fw-bold text-gray-800'>{jobs.filter(j => j.state === 'PLANNED').length}</div>
                        <div className='fs-7 text-muted'>Planned</div>
                      </div>
                    </div>
                  </div>
                  <div className='col-md-3'>
                    <div className='d-flex align-items-center'>
                      <div className='symbol symbol-30px me-3'>
                        <div className='symbol-label bg-light-warning'>
                          <KTSVG path='/media/icons/duotune/arrows/arr075.svg' className='svg-icon-2 svg-icon-warning' />
                        </div>
                      </div>
                      <div>
                        <div className='fs-6 fw-bold text-gray-800'>{jobs.filter(j => j.state === 'IN_PROGRESS').length}</div>
                        <div className='fs-7 text-muted'>In Progress</div>
                      </div>
                    </div>
                  </div>
                  <div className='col-md-3'>
                    <div className='d-flex align-items-center'>
                      <div className='symbol symbol-30px me-3'>
                        <div className='symbol-label bg-light-danger'>
                          <KTSVG path='/media/icons/duotune/general/gen044.svg' className='svg-icon-2 svg-icon-danger' />
                        </div>
                      </div>
                      <div>
                        <div className='fs-6 fw-bold text-gray-800'>{jobs.filter(j => isOverdue(j)).length}</div>
                        <div className='fs-7 text-muted'>Overdue</div>
                      </div>
                    </div>
                  </div>
                  <div className='col-md-3'>
                    <div className='d-flex align-items-center'>
                      <div className='symbol symbol-30px me-3'>
                        <div className='symbol-label bg-light-success'>
                          <KTSVG path='/media/icons/duotune/general/gen048.svg' className='svg-icon-2 svg-icon-success' />
                        </div>
                      </div>
                      <div>
                        <div className='fs-6 fw-bold text-gray-800'>{jobs.filter(j => j.state === 'COMPLETED' || j.state === 'VERIFIED' || j.state === 'CLOSED').length}</div>
                        <div className='fs-7 text-muted'>Completed</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {viewOpen && viewing && (
        <PmsJobDetailModal
          visible={viewOpen}
          onClose={() => {
            setViewOpen(false)
            setViewing(null)
          }}
          record={viewing}
          onRefresh={loadJobs}
        />
      )}
    </div>
  )
}

export default WeeklyPlanningBoard

