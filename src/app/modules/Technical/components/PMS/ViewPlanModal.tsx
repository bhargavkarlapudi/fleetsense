import React, { FC, useState, useEffect, useMemo } from 'react'
import { KTSVG } from '../../../../../_metronic/helpers'
import { PmsPlanDto, PmsPlanLineDto } from '../../core/pms/_models'
import { getPmsPlanLines, deletePmsPlanLine } from '../../core/pms/_requests'
import { toast } from 'react-toastify'
import { AddPlanLineModal } from './AddPlanLineModal'
import { EditPlanLineModal } from './EditPlanLineModal'

interface Props {
  visible: boolean
  onClose: () => void
  plan: PmsPlanDto
}

const WRAP_STYLE: React.CSSProperties = {
  background: 'rgba(0,0,0,0.5)',
  position: 'fixed',
  inset: 0,
  zIndex: 1050,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

export const ViewPlanModal: FC<Props> = ({ visible, onClose, plan }) => {
  const [planLines, setPlanLines] = useState<PmsPlanLineDto[]>([])
  const [loadingLines, setLoadingLines] = useState(false)
  const [addLineOpen, setAddLineOpen] = useState(false)
  const [editLineOpen, setEditLineOpen] = useState(false)
  const [editingLine, setEditingLine] = useState<PmsPlanLineDto | null>(null)
  
  // View mode: 'table' or 'tree'
  const [viewMode, setViewMode] = useState<'table' | 'tree'>('table')
  const [expandedEquipment, setExpandedEquipment] = useState<Set<number>>(new Set())
  const [expandedComponents, setExpandedComponents] = useState<Set<number>>(new Set())
  
  // Filters
  const [filterCriticality, setFilterCriticality] = useState<string>('')
  const [filterScheduleType, setFilterScheduleType] = useState<string>('')
  const [filterOverdue, setFilterOverdue] = useState<boolean | null>(null)
  const [filterHierarchyLevel, setFilterHierarchyLevel] = useState<string>('') // 'component' | 'subcomponent' | ''
  
  // Sorting
  const [sortColumn, setSortColumn] = useState<'dueDate' | 'criticality' | ''>('')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)

  useEffect(() => {
    if (visible && plan.id) {
      loadPlanLines()
    }
  }, [visible, plan.id])

  const loadPlanLines = async () => {
    if (!plan.id) return
    setLoadingLines(true)
    try {
      const lines = await getPmsPlanLines(plan.id)
      setPlanLines(lines)
    } catch (error) {
      console.error('Error loading plan lines:', error)
      toast.error('Failed to load plan lines', { position: 'top-center' })
    } finally {
      setLoadingLines(false)
    }
  }

  const handleDeleteLine = async (lineId: number) => {
    if (!window.confirm('Are you sure you want to delete this plan line?')) {
      return
    }
    try {
      await deletePmsPlanLine(lineId)
      toast.success('Plan line deleted successfully', { position: 'top-center' })
      loadPlanLines()
    } catch (error: any) {
      console.error('Error deleting plan line:', error)
      toast.error(error.message || 'Failed to delete plan line', { position: 'top-center' })
    }
  }

  const handleEditLine = (line: PmsPlanLineDto) => {
    setEditingLine(line)
    setEditLineOpen(true)
  }

  const isOverdue = (line: PmsPlanLineDto): boolean => {
    if (!line.active) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    if (line.nextDueDate) {
      const dueDate = new Date(line.nextDueDate)
      return dueDate < today
    }
    // For running hours, we'd need current counter value - simplified check
    return false
  }

  // Helper to format periodicity (e.g., "6 M" = "6 Months", "1000 H" = "1000 Hours")
  const formatPeriodicity = (value: number | null | undefined, type: string | null | undefined): string => {
    if (!value || !type) return ''
    const upperType = type.toUpperCase()
    const typeLabel = upperType === 'M' ? 'Months' : upperType === 'H' ? 'Hours' : upperType
    return `${value} ${typeLabel}`
  }

  // Helper to format interval display - shows both periodicities for hybrid schedules
  const formatIntervalDisplay = (line: PmsPlanLineDto): string => {
    const isHybrid = line.scheduleType === 'HYBRID_WHICHEVER_FIRST' || line.scheduleType === 'HYBRID_BOTH_REQUIRED'
    
    if (isHybrid && (line.jobPeriodicity || line.jobPeriodicity2)) {
      // Show both periodicities for hybrid schedules
      const periodicity1 = formatPeriodicity(line.jobPeriodicity, line.periodicityId)
      const periodicity2 = formatPeriodicity(line.jobPeriodicity2, line.periodicityId2)
      
      if (periodicity1 && periodicity2) {
        return `${periodicity1} / ${periodicity2}`
      } else if (periodicity1) {
        return periodicity1
      } else if (periodicity2) {
        return periodicity2
      }
    }
    
    // For non-hybrid schedules, show periodicity if available
    if (line.jobPeriodicity && line.periodicityId) {
      return formatPeriodicity(line.jobPeriodicity, line.periodicityId)
    }
    
    return '-'
  }

  const getCriticalityBadgeClass = (criticality: string) => {
    switch (criticality) {
      case 'CRITICAL': return 'badge-light-danger'
      case 'HIGH': return 'badge-light-warning'
      case 'MEDIUM': return 'badge-light-info'
      case 'LOW': return 'badge-light-secondary'
      default: return 'badge-light'
    }
  }

  const getScheduleTypeBadgeClass = (scheduleType: string) => {
    switch (scheduleType) {
      case 'TIME': return 'badge-light-primary'
      case 'RUNNING_HOURS': return 'badge-light-success'
      case 'EVENT': return 'badge-light-warning'
      case 'DOCK': return 'badge-light-info'
      case 'AS_REQUIRED': return 'badge-light-secondary'
      default: return 'badge-light'
    }
  }

  const getScheduleTypeLabel = (scheduleType: string) => {
    const labels: { [key: string]: string } = {
      TIME: 'Time',
      RUNNING_HOURS: 'Running Hours',
      EVENT: 'Event',
      DOCK: 'Dock',
      AS_REQUIRED: 'As Required',
    }
    return labels[scheduleType] || scheduleType
  }

  const filteredAndSortedLines = useMemo(() => {
    let filtered = planLines.filter(line => {
      if (filterCriticality && line.criticality !== filterCriticality) return false
      if (filterScheduleType && line.scheduleType !== filterScheduleType) return false
      if (filterOverdue !== null) {
        const overdue = isOverdue(line)
        if (filterOverdue && !overdue) return false
        if (!filterOverdue && overdue) return false
      }
      // Filter by hierarchy level
      if (filterHierarchyLevel === 'component') {
        if (line.subComponentId) return false // Exclude subcomponent-level tasks
      } else if (filterHierarchyLevel === 'subcomponent') {
        if (!line.subComponentId) return false // Only show subcomponent-level tasks
      }
      return true
    })
    
    return filtered.sort((a, b) => {
      if (!sortColumn) return 0
      
      let comparison = 0
      if (sortColumn === 'dueDate') {
        const aDate = a.nextDueDate ? new Date(a.nextDueDate).getTime() : 0
        const bDate = b.nextDueDate ? new Date(b.nextDueDate).getTime() : 0
        comparison = aDate - bDate
      } else if (sortColumn === 'criticality') {
        const order = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }
        comparison = (order[a.criticality as keyof typeof order] || 0) - (order[b.criticality as keyof typeof order] || 0)
      }
      
      return sortOrder === 'asc' ? comparison : -comparison
    })
  }, [planLines, filterCriticality, filterScheduleType, filterOverdue, filterHierarchyLevel, sortColumn, sortOrder])

  // Pagination calculations
  const totalPages = Math.ceil(filteredAndSortedLines.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedLines = filteredAndSortedLines.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filterCriticality, filterScheduleType, filterOverdue, filterHierarchyLevel])

  const handleSort = (column: 'dueDate' | 'criticality') => {
    if (sortColumn === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortOrder('asc')
    }
  }

  // Group plan lines by equipment → component → subcomponent for tree view (using paginated lines)
  const groupedPlanLines = useMemo(() => {
    const groups: Map<number, Map<number, Map<number | 'component', PmsPlanLineDto[]>>> = new Map()
    
    paginatedLines.forEach(line => {
      if (!line.equipmentId) return
      
      const equipmentId = line.equipmentId
      const componentId = line.componentId || 0
      const subComponentId = line.subComponentId || 'component'
      
      if (!groups.has(equipmentId)) {
        groups.set(equipmentId, new Map())
      }
      const equipmentGroup = groups.get(equipmentId)!
      
      if (!equipmentGroup.has(componentId)) {
        equipmentGroup.set(componentId, new Map())
      }
      const componentGroup = equipmentGroup.get(componentId)!
      
      if (!componentGroup.has(subComponentId)) {
        componentGroup.set(subComponentId, [])
      }
      componentGroup.get(subComponentId)!.push(line)
    })
    
    return groups
  }, [paginatedLines])

  const toggleEquipment = (equipmentId: number) => {
    setExpandedEquipment(prev => {
      const next = new Set(prev)
      if (next.has(equipmentId)) {
        next.delete(equipmentId)
      } else {
        next.add(equipmentId)
      }
      return next
    })
  }

  const toggleComponent = (componentId: number) => {
    setExpandedComponents(prev => {
      const next = new Set(prev)
      if (next.has(componentId)) {
        next.delete(componentId)
      } else {
        next.add(componentId)
      }
      return next
    })
  }

  if (!visible) return null

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'badge-light-success'
      case 'DRAFT': return 'badge-light-warning'
      case 'SUSPENDED': return 'badge-light-danger'
      case 'ARCHIVED': return 'badge-light-secondary'
      default: return 'badge-light'
    }
  }

  return (
    <div style={WRAP_STYLE} tabIndex={-1} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className='bg-white text-dark rounded shadow-lg d-flex flex-column'
        style={{
          width: '90vw',
          maxWidth: '1400px',
          height: '85vh',
          maxHeight: '900px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className='d-flex align-items-center justify-content-between border-bottom px-4 py-3 flex-shrink-0'>
          <h5 className='modal-title text-dark m-0'>View PMS Plan</h5>
          <button type='button' className='btn-close' onClick={onClose}></button>
        </div>
        <div className='flex-grow-1 overflow-auto px-4 py-3'>
          <div className='row g-3 mb-5'>
            <div className='col-md-6'>
              <div className='fw-semibold text-muted fs-7 mb-1'>Plan Name</div>
              <div className='fw-bold'>{plan.name}</div>
            </div>
            <div className='col-md-6'>
              <div className='fw-semibold text-muted fs-7 mb-1'>Vessel</div>
              <div className='fw-bold'>{plan.vesselName || '-'}</div>
            </div>
            <div className='col-md-6'>
              <div className='fw-semibold text-muted fs-7 mb-1'>Status</div>
              <div>
                <span className={`badge ${getStatusBadgeClass(plan.status)}`}>
                  {plan.status}
                </span>
              </div>
            </div>
            <div className='col-md-6'>
              <div className='fw-semibold text-muted fs-7 mb-1'>Version</div>
              <div className='fw-bold'>{plan.version || 1}</div>
            </div>
            {plan.description && (
              <div className='col-12'>
                <div className='fw-semibold text-muted fs-7 mb-1'>Description</div>
                <div className='border rounded p-2 bg-light-subtle' style={{ minHeight: '60px' }}>
                  {plan.description}
                </div>
              </div>
            )}
          </div>

          {/* Plan Lines */}
          <div className='mt-5'>
            <div className='d-flex justify-content-between align-items-center mb-3'>
              <h6 className='fw-bold m-0'>Plan Lines ({filteredAndSortedLines.length})</h6>
              <button
                type='button'
                className='btn btn-sm btn-primary'
                onClick={() => setAddLineOpen(true)}
              >
                <KTSVG path='/media/icons/duotune/arrows/arr075.svg' className='svg-icon-2' />
                Add Plan Line
              </button>
            </div>

            {/* Filters */}
            <div className='row g-3 mb-4'>
              <div className='col-md-2'>
                <label className='form-label fs-7 text-muted'>
                  <KTSVG path='/media/icons/duotune/general/gen024.svg' className='svg-icon-3 me-1' />
                  Hierarchy Level
                </label>
                <select
                  className='form-select form-select-sm'
                  value={filterHierarchyLevel}
                  onChange={(e) => setFilterHierarchyLevel(e.target.value)}
                >
                  <option value=''>All Levels</option>
                  <option value='component'>Component Level</option>
                  <option value='subcomponent'>Subcomponent Level</option>
                </select>
              </div>
              <div className='col-md-2'>
                <label className='form-label fs-7 text-muted'>Filter by Criticality</label>
                <select
                  className='form-select form-select-sm'
                  value={filterCriticality}
                  onChange={(e) => setFilterCriticality(e.target.value)}
                >
                  <option value=''>All</option>
                  <option value='CRITICAL'>Critical</option>
                  <option value='HIGH'>High</option>
                  <option value='MEDIUM'>Medium</option>
                  <option value='LOW'>Low</option>
                </select>
              </div>
              <div className='col-md-2'>
                <label className='form-label fs-7 text-muted'>Filter by Schedule Type</label>
                <select
                  className='form-select form-select-sm'
                  value={filterScheduleType}
                  onChange={(e) => setFilterScheduleType(e.target.value)}
                >
                  <option value=''>All</option>
                  <option value='TIME'>Time</option>
                  <option value='RUNNING_HOURS'>Running Hours</option>
                  <option value='EVENT'>Event</option>
                  <option value='DOCK'>Dock</option>
                  <option value='AS_REQUIRED'>As Required</option>
                </select>
              </div>
              <div className='col-md-2'>
                <label className='form-label fs-7 text-muted'>Filter by Status</label>
                <select
                  className='form-select form-select-sm'
                  value={filterOverdue === null ? '' : filterOverdue ? 'overdue' : 'not-overdue'}
                  onChange={(e) => {
                    if (e.target.value === '') setFilterOverdue(null)
                    else setFilterOverdue(e.target.value === 'overdue')
                  }}
                >
                  <option value=''>All</option>
                  <option value='overdue'>Overdue</option>
                  <option value='not-overdue'>Not Overdue</option>
                </select>
              </div>
              <div className='col-md-4 d-flex align-items-end gap-2'>
                <button
                  className='btn btn-sm btn-light'
                  onClick={() => {
                    setFilterHierarchyLevel('')
                    setFilterCriticality('')
                    setFilterScheduleType('')
                    setFilterOverdue(null)
                    setSortColumn('')
                    setSortOrder('asc')
                  }}
                >
                  Clear Filters
                </button>
              </div>
            </div>
            {loadingLines ? (
              <div className='text-center py-5'>
                <div className='spinner-border' role='status'>
                  <span className='visually-hidden'>Loading...</span>
                </div>
              </div>
            ) : planLines.length === 0 ? (
              <div className='text-muted text-center py-4'>
                No plan lines found. Add plan lines to define maintenance tasks.
              </div>
            ) : viewMode === 'tree' ? (
              <div className='border rounded p-3' style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                {Array.from(groupedPlanLines.entries()).map(([equipmentId, components]) => {
                  const equipmentLines = Array.from(components.values()).flatMap(c => Array.from(c.values()).flat())
                  const equipmentName = equipmentLines[0]?.equipmentName || `Equipment #${equipmentId}`
                  const equipmentCode = equipmentLines[0]?.equipmentCode
                  const isExpanded = expandedEquipment.has(equipmentId)
                  
                  return (
                    <div key={equipmentId} className='mb-3'>
                      <div
                        className='d-flex align-items-center p-2 bg-light rounded cursor-pointer'
                        onClick={() => toggleEquipment(equipmentId)}
                        style={{ cursor: 'pointer' }}
                      >
                        <KTSVG
                          path={`/media/icons/duotune/arrows/arr${isExpanded ? '072' : '071'}.svg`}
                          className='svg-icon-3 me-2'
                        />
                        <span className='fw-bold text-primary'>
                          {equipmentCode ? `${equipmentCode} - ` : ''}{equipmentName}
                        </span>
                        <span className='badge badge-light-info ms-2'>
                          {equipmentLines.length} plan line{equipmentLines.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      {isExpanded && (
                        <div className='ms-4 mt-2'>
                          {Array.from(components.entries()).map(([componentId, subcomponents]) => {
                            const componentLines = Array.from(subcomponents.values()).flat()
                            const componentName = componentLines[0]?.componentName || `Component #${componentId}`
                            const componentCode = componentLines[0]?.componentCode
                            const isComponentExpanded = expandedComponents.has(componentId)
                            
                            return (
                              <div key={componentId} className='mb-2'>
                                <div
                                  className='d-flex align-items-center p-2 bg-light-subtle rounded cursor-pointer'
                                  onClick={() => toggleComponent(componentId)}
                                  style={{ cursor: 'pointer' }}
                                >
                                  <KTSVG
                                    path={`/media/icons/duotune/arrows/arr${isComponentExpanded ? '072' : '071'}.svg`}
                                    className='svg-icon-2 me-2'
                                  />
                                  <span className='fw-semibold text-info'>
                                    {componentCode ? `${componentCode} - ` : ''}{componentName}
                                  </span>
                                  <span className='badge badge-light-warning ms-2'>
                                    {componentLines.length} plan line{componentLines.length !== 1 ? 's' : ''}
                                  </span>
                                </div>
                                {isComponentExpanded && (
                                  <div className='ms-4 mt-2'>
                                    {Array.from(subcomponents.entries()).map(([subComponentId, lines]) => {
                                      const subComponentName = lines[0]?.subComponentName
                                      const subComponentCode = lines[0]?.subComponentCode
                                      
                                      if (subComponentId === 'component') {
                                        // Component-level plan lines
                                        return (
                                          <div key='component-level' className='mb-3'>
                                            <div className='d-flex align-items-center gap-2 mb-2 p-2 bg-light-info rounded'>
                                              <KTSVG path='/media/icons/duotune/general/gen024.svg' className='svg-icon-3 text-info' />
                                              <span className='fw-bold text-info'>Component-Level PM Tasks</span>
                                              <span className='badge badge-light-info'>{lines.length} task{lines.length !== 1 ? 's' : ''}</span>
                                            </div>
                                            {lines.map(line => {
                                              const overdue = isOverdue(line)
                                              return (
                                                <div key={line.id} className='ms-4 mb-2 p-3 border rounded bg-white shadow-sm'>
                                                  <div className='d-flex justify-content-between align-items-start'>
                                                    <div className='flex-grow-1'>
                                                      <div className='d-flex align-items-center gap-2 mb-2'>
                                                        <span className='badge badge-light-info'>
                                                          <KTSVG path='/media/icons/duotune/general/gen024.svg' className='svg-icon-2 me-1' />
                                                          Component Level
                                                        </span>
                                                        <span className={`badge ${getScheduleTypeBadgeClass(line.scheduleType)}`}>
                                                          {getScheduleTypeLabel(line.scheduleType)}
                                                        </span>
                                                        <span className={`badge ${getCriticalityBadgeClass(line.criticality)}`}>
                                                          {line.criticality}
                                                        </span>
                                                        {overdue && <span className='badge badge-light-danger'>Overdue</span>}
                                                      </div>
                                                      <div className='fw-semibold mb-1'>
                                                        {line.componentName ? `${line.componentName} - ` : ''}
                                                        {line.jobType ? `${line.jobType} - ` : ''}
                                                        {line.taskDescription}
                                                      </div>
                                                      {line.jobCode && (
                                                        <div className='text-muted fs-7 mb-1'>
                                                          <span className="badge badge-light-primary">Job Code: {line.jobCode}</span>
                                                        </div>
                                                      )}
                                                      <div className='text-muted fs-7'>
                                                        {line.equipmentName && (
                                                          <div className='mb-1'>
                                                            <span className='text-primary'>Equipment:</span> {line.equipmentCode ? `${line.equipmentCode} - ` : ''}{line.equipmentName}
                                                          </div>
                                                        )}
                                                        {line.componentName && (
                                                          <div className='mb-1'>
                                                            <span className='text-info'>Component:</span> {line.componentCode ? `${line.componentCode} - ` : ''}{line.componentName}
                                                          </div>
                                                        )}
                                                        {formatIntervalDisplay(line) !== '-' && (
                                                          <div className='mb-1'>
                                                            <span className='text-muted'>Interval:</span> {formatIntervalDisplay(line)}
                                                          </div>
                                                        )}
                                                        {line.hasOpenJob ? (
                                                          <div className='mb-1'>
                                                            <span className="badge badge-light-warning">
                                                              <KTSVG path='/media/icons/duotune/general/gen044.svg' className='svg-icon-3 me-1' />
                                                              Job in Progress
                                                            </span>
                                                          </div>
                                                        ) : (
                                                          <>
                                                            {line.nextDueDate && (
                                                              <div className={overdue ? 'text-danger fw-semibold' : ''}>
                                                                <span className='text-muted'>Next Due:</span> {new Date(line.nextDueDate).toLocaleDateString()}
                                                              </div>
                                                            )}
                                                            {line.nextDueCounter && (
                                                              <div className={overdue ? 'text-danger fw-semibold' : ''}>
                                                                <span className='text-muted'>Next Due Counter:</span> {line.nextDueCounter.toLocaleString()} hrs
                                                              </div>
                                                            )}
                                                          </>
                                                        )}
                                                      </div>
                                                    </div>
                                                    <div className='d-flex gap-1 ms-3'>
                                                      <button
                                                        className='btn btn-sm btn-light'
                                                        onClick={() => handleEditLine(line)}
                                                        title='Edit'
                                                      >
                                                        <KTSVG path='/media/icons/duotune/general/gen055.svg' className='svg-icon-2' />
                                                      </button>
                                                      <button
                                                        className='btn btn-sm btn-light-danger'
                                                        onClick={() => handleDeleteLine(line.id!)}
                                                        title='Delete'
                                                      >
                                                        <KTSVG path='/media/icons/duotune/general/gen027.svg' className='svg-icon-2' />
                                                      </button>
                                                    </div>
                                                  </div>
                                                </div>
                                              )
                                            })}
                                          </div>
                                        )
                                      } else {
                                        // Subcomponent-level plan lines
                                        return (
                                          <div key={subComponentId} className='mb-3'>
                                            <div className='d-flex align-items-center gap-2 mb-2 p-2 bg-light-success rounded'>
                                              <KTSVG path='/media/icons/duotune/general/gen023.svg' className='svg-icon-3 text-success' />
                                              <span className='fw-bold text-success'>
                                                {subComponentCode ? `${subComponentCode} - ` : ''}{subComponentName || `SubComponent #${subComponentId}`}
                                              </span>
                                              <span className='badge badge-light-success'>{lines.length} task{lines.length !== 1 ? 's' : ''}</span>
                                            </div>
                                            {lines.map(line => {
                                              const overdue = isOverdue(line)
                                              return (
                                                <div key={line.id} className='ms-4 mb-2 p-3 border rounded bg-white shadow-sm border-success border-2'>
                                                  <div className='d-flex justify-content-between align-items-start'>
                                                    <div className='flex-grow-1'>
                                                      <div className='d-flex align-items-center gap-2 mb-2'>
                                                        <span className='badge badge-light-success'>
                                                          <KTSVG path='/media/icons/duotune/general/gen023.svg' className='svg-icon-2 me-1' />
                                                          Subcomponent Level
                                                        </span>
                                                        <span className={`badge ${getScheduleTypeBadgeClass(line.scheduleType)}`}>
                                                          {getScheduleTypeLabel(line.scheduleType)}
                                                        </span>
                                                        <span className={`badge ${getCriticalityBadgeClass(line.criticality)}`}>
                                                          {line.criticality}
                                                        </span>
                                                        {overdue && <span className='badge badge-light-danger'>Overdue</span>}
                                                      </div>
                                                      <div className='fw-semibold mb-1'>
                                                        {line.componentName ? `${line.componentName} - ` : ''}
                                                        {line.jobType ? `${line.jobType} - ` : ''}
                                                        {line.taskDescription}
                                                      </div>
                                                      {line.jobCode && (
                                                        <div className='text-muted fs-7 mb-1'>
                                                          <span className="badge badge-light-primary">Job Code: {line.jobCode}</span>
                                                        </div>
                                                      )}
                                                      <div className='text-muted fs-7'>
                                                        {line.equipmentName && (
                                                          <div className='mb-1'>
                                                            <span className='text-primary'>Equipment:</span> {line.equipmentCode ? `${line.equipmentCode} - ` : ''}{line.equipmentName}
                                                          </div>
                                                        )}
                                                        {line.componentName && (
                                                          <div className='mb-1'>
                                                            <span className='text-info'>Component:</span> {line.componentCode ? `${line.componentCode} - ` : ''}{line.componentName}
                                                          </div>
                                                        )}
                                                        {line.subComponentName && (
                                                          <div className='mb-1'>
                                                            <span className='text-success fw-semibold'>Subcomponent:</span> {line.subComponentCode ? `${line.subComponentCode} - ` : ''}{line.subComponentName}
                                                          </div>
                                                        )}
                                                        {formatIntervalDisplay(line) !== '-' && (
                                                          <div className='mb-1'>
                                                            <span className='text-muted'>Interval:</span> {formatIntervalDisplay(line)}
                                                          </div>
                                                        )}
                                                        {line.hasOpenJob ? (
                                                          <div className='mb-1'>
                                                            <span className="badge badge-light-warning">
                                                              <KTSVG path='/media/icons/duotune/general/gen044.svg' className='svg-icon-3 me-1' />
                                                              Job in Progress
                                                            </span>
                                                          </div>
                                                        ) : (
                                                          <>
                                                            {line.nextDueDate && (
                                                              <div className={overdue ? 'text-danger fw-semibold' : ''}>
                                                                <span className='text-muted'>Next Due:</span> {new Date(line.nextDueDate).toLocaleDateString()}
                                                              </div>
                                                            )}
                                                            {line.nextDueCounter && (
                                                              <div className={overdue ? 'text-danger fw-semibold' : ''}>
                                                                <span className='text-muted'>Next Due Counter:</span> {line.nextDueCounter.toLocaleString()} hrs
                                                              </div>
                                                            )}
                                                          </>
                                                        )}
                                                      </div>
                                                    </div>
                                                    <div className='d-flex gap-1 ms-3'>
                                                      <button
                                                        className='btn btn-sm btn-light'
                                                        onClick={() => handleEditLine(line)}
                                                        title='Edit'
                                                      >
                                                        <KTSVG path='/media/icons/duotune/general/gen055.svg' className='svg-icon-2' />
                                                      </button>
                                                      <button
                                                        className='btn btn-sm btn-light-danger'
                                                        onClick={() => handleDeleteLine(line.id!)}
                                                        title='Delete'
                                                      >
                                                        <KTSVG path='/media/icons/duotune/general/gen027.svg' className='svg-icon-2' />
                                                      </button>
                                                    </div>
                                                  </div>
                                                </div>
                                              )
                                            })}
                                          </div>
                                        )
                                      }
                                    })}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className='table-responsive'>
                <table className='table table-bordered align-middle'>
                  <thead className='table-header'>
                    <tr>
                      <th style={{ minWidth: '60px' }}>Sr. No.</th>
                      <th style={{ minWidth: '300px' }}>Task Description</th>
                      <th style={{ minWidth: '300px' }}>Hierarchy Path</th>
                      <th style={{ minWidth: '100px' }}>Level</th>
                      <th style={{ minWidth: '120px' }}>Schedule Type</th>
                      <th style={{ minWidth: '120px' }}>Interval</th>
                      <th 
                        style={{ minWidth: '200px', cursor: 'pointer' }}
                        onClick={() => handleSort('dueDate')}
                      >
                        Next Due
                        {sortColumn === 'dueDate' && (
                          <span className='ms-1'>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </th>
                      <th style={{ minWidth: '120px' }}>Last Done</th>
                      <th 
                        style={{ minWidth: '100px', cursor: 'pointer' }}
                        onClick={() => handleSort('criticality')}
                      >
                        Criticality
                        {sortColumn === 'criticality' && (
                          <span className='ms-1'>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </th>
                      <th style={{ minWidth: '100px' }}>Status</th>
                      <th style={{ minWidth: '120px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedLines.map((line, index) => {
                      const overdue = isOverdue(line)
                      const isSubcomponentLevel = !!line.subComponentId && !!line.subComponentName
                      const hierarchyPath = []
                      if (line.equipmentName) {
                        hierarchyPath.push(
                          <span key="eq" className="text-primary fw-semibold">
                            <KTSVG path='/media/icons/duotune/general/gen025.svg' className='svg-icon-4 me-1' />
                            {line.equipmentCode ? `${line.equipmentCode} - ` : ''}{line.equipmentName}
                          </span>
                        )
                      }
                      if (line.componentName) {
                        hierarchyPath.push(
                          <span key="comp" className="text-info fw-semibold">
                            <KTSVG path='/media/icons/duotune/general/gen024.svg' className='svg-icon-4 me-1' />
                            {line.componentCode ? `${line.componentCode} - ` : ''}{line.componentName}
                          </span>
                        )
                      }
                      if (line.subComponentName) {
                        hierarchyPath.push(
                          <span key="sub" className="text-success fw-semibold">
                            <KTSVG path='/media/icons/duotune/general/gen023.svg' className='svg-icon-4 me-1' />
                            {line.subComponentCode ? `${line.subComponentCode} - ` : ''}{line.subComponentName}
                          </span>
                        )
                      }
                      
                      // Format task description: Component/SubComponent Name - Job Type - Task Description
                      const formatTaskDescription = (line: PmsPlanLineDto): string => {
                        const parts: string[] = []
                        
                        // Add component or subcomponent name
                        if (line.subComponentName) {
                          parts.push(line.subComponentName)
                        } else if (line.componentName) {
                          parts.push(line.componentName)
                        }
                        
                        // Add job type
                        if (line.jobType) {
                          parts.push(line.jobType)
                        }
                        
                        // Add task description
                        if (line.taskDescription) {
                          parts.push(line.taskDescription)
                        }
                        
                        return parts.join(' - ')
                      }
                      
                      // Format next due display - show both periodicities for hybrid schedules
                      const formatNextDueDisplay = (line: PmsPlanLineDto): React.ReactNode => {
                        // Check if job is in progress first
                        if (line.hasOpenJob) {
                          return (
                            <span className="badge badge-light-warning">
                              <KTSVG path='/media/icons/duotune/general/gen044.svg' className='svg-icon-3 me-1' />
                              Job in Progress
                            </span>
                          )
                        }
                        
                        const isHybrid = line.scheduleType === 'HYBRID_WHICHEVER_FIRST' || line.scheduleType === 'HYBRID_BOTH_REQUIRED'
                        
                        if (isHybrid) {
                          // For hybrid schedules, show both date and counter in "A OR B" format
                          const datePart = line.nextDueDate ? new Date(line.nextDueDate).toLocaleDateString() : null
                          const counterPart = line.nextDueCounter ? `${line.nextDueCounter.toLocaleString()} hrs` : null
                          
                          if (datePart && counterPart) {
                            return (
                              <div>
                                <span>{datePart} <span className="text-muted">OR</span> {counterPart}</span>
                                {overdue && (
                                  <span className='badge badge-light-danger ms-2'>Overdue</span>
                                )}
                              </div>
                            )
                          } else if (datePart) {
                            return (
                              <div>
                                <span>{datePart}</span>
                                {overdue && (
                                  <span className='badge badge-light-danger ms-2'>Overdue</span>
                                )}
                              </div>
                            )
                          } else if (counterPart) {
                            return (
                              <div>
                                <span>{counterPart}</span>
                                {overdue && (
                                  <span className='badge badge-light-danger ms-2'>Overdue</span>
                                )}
                              </div>
                            )
                          }
                          return '-'
                        } else {
                          // For non-hybrid schedules (TIME, RUNNING_HOURS, etc.), show date or counter
                          // TIME-based schedules should have nextDueDate
                          // RUNNING_HOURS schedules should have nextDueCounter
                          if (line.scheduleType === 'TIME' && line.nextDueDate) {
                            return (
                              <div>
                                {new Date(line.nextDueDate).toLocaleDateString()}
                                {overdue && (
                                  <span className='badge badge-light-danger ms-2'>Overdue</span>
                                )}
                              </div>
                            )
                          } else if (line.scheduleType === 'RUNNING_HOURS' && line.nextDueCounter) {
                            return (
                              <div>
                                {line.nextDueCounter.toLocaleString()} hrs
                                {overdue && (
                                  <span className='badge badge-light-danger ms-2'>Overdue</span>
                                )}
                              </div>
                            )
                          } else {
                            // Fallback: show whichever is available
                            if (line.nextDueDate) {
                              return (
                                <div>
                                  {new Date(line.nextDueDate).toLocaleDateString()}
                                  {overdue && (
                                    <span className='badge badge-light-danger ms-2'>Overdue</span>
                                  )}
                                </div>
                              )
                            } else if (line.nextDueCounter) {
                              return (
                                <div>
                                  {line.nextDueCounter.toLocaleString()} hrs
                                  {overdue && (
                                    <span className='badge badge-light-danger ms-2'>Overdue</span>
                                  )}
                                </div>
                              )
                            } else {
                              return '-'
                            }
                          }
                        }
                      }
                      
                      return (
                        <tr key={line.id} className={overdue ? 'table-danger' : ''}>
                          <td className="text-center">
                            <span className="text-muted fw-semibold">{startIndex + index + 1}</span>
                          </td>
                          <td>
                            <div className="fw-semibold">{formatTaskDescription(line)}</div>
                            {line.jobCode && (
                              <div className="text-muted fs-7 mt-1">
                                <span className="badge badge-light-primary">Job Code: {line.jobCode}</span>
                              </div>
                            )}
                          </td>
                          <td>
                            {hierarchyPath.length > 0 ? (
                              <div className="d-flex flex-column gap-1">
                                {hierarchyPath.map((item, idx) => (
                                  <div key={idx} className="d-flex align-items-center">
                                    {idx > 0 && <span className="text-muted me-2">→</span>}
                                    {item}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                          <td>
                            {isSubcomponentLevel ? (
                              <span className="badge badge-light-success d-flex align-items-center gap-1" style={{width: 'fit-content'}}>
                                <KTSVG path='/media/icons/duotune/general/gen023.svg' className='svg-icon-3' />
                                Subcomponent
                              </span>
                            ) : line.componentId ? (
                              <span className="badge badge-light-info d-flex align-items-center gap-1" style={{width: 'fit-content'}}>
                                <KTSVG path='/media/icons/duotune/general/gen024.svg' className='svg-icon-3' />
                                Component
                              </span>
                            ) : (
                              <span className="badge badge-light-secondary">-</span>
                            )}
                          </td>
                          <td>
                            <span className={`badge ${getScheduleTypeBadgeClass(line.scheduleType)}`}>
                              {getScheduleTypeLabel(line.scheduleType)}
                            </span>
                          </td>
                          <td>
                            {formatIntervalDisplay(line)}
                          </td>
                          <td>
                            {formatNextDueDisplay(line)}
                          </td>
                          <td>
                            {line.lastDoneDate ? (
                              <div>
                                <div>{new Date(line.lastDoneDate).toLocaleDateString()}</div>
                                {line.lastDoneCounter && (
                                  <div className='text-muted fs-7'>{line.lastDoneCounter.toLocaleString()} hrs</div>
                                )}
                              </div>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td>
                            <span className={`badge ${getCriticalityBadgeClass(line.criticality)}`}>
                              {line.criticality}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${line.active ? 'badge-light-success' : 'badge-light-secondary'}`}>
                              {line.active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td>
                            <div className='d-flex gap-1'>
                              <button
                                className='btn btn-sm btn-light'
                                onClick={() => handleEditLine(line)}
                                title='Edit'
                              >
                                <KTSVG path='/media/icons/duotune/general/gen055.svg' className='svg-icon-2' />
                              </button>
                              <button
                                className='btn btn-sm btn-light-danger'
                                onClick={() => handleDeleteLine(line.id!)}
                                title='Delete'
                              >
                                <KTSVG path='/media/icons/duotune/general/gen027.svg' className='svg-icon-2' />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {filteredAndSortedLines.length > 0 && (
              <div className='d-flex justify-content-between align-items-center mt-4 pt-3 border-top'>
                <div className='d-flex align-items-center gap-3'>
                  <span className='text-muted fs-7'>
                    Showing {startIndex + 1} to {Math.min(endIndex, filteredAndSortedLines.length)} of {filteredAndSortedLines.length} plan lines
                  </span>
                  <div className='d-flex align-items-center gap-2'>
                    <label className='form-label fs-7 text-muted mb-0'>Items per page:</label>
                    <select
                      className='form-select form-select-sm'
                      style={{ width: '80px' }}
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value))
                        setCurrentPage(1)
                      }}
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>
                <div className='d-flex align-items-center gap-2'>
                  <button
                    className='btn btn-sm btn-light'
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    <KTSVG path='/media/icons/duotune/arrows/arr061.svg' className='svg-icon-2' />
                    First
                  </button>
                  <button
                    className='btn btn-sm btn-light'
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    <KTSVG path='/media/icons/duotune/arrows/arr063.svg' className='svg-icon-2' />
                    Previous
                  </button>
                  <span className='text-muted fs-7 px-2'>
                    Page {currentPage} of {totalPages || 1}
                  </span>
                  <button
                    className='btn btn-sm btn-light'
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage >= totalPages}
                  >
                    Next
                    <KTSVG path='/media/icons/duotune/arrows/arr064.svg' className='svg-icon-2' />
                  </button>
                  <button
                    className='btn btn-sm btn-light'
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage >= totalPages}
                  >
                    Last
                    <KTSVG path='/media/icons/duotune/arrows/arr062.svg' className='svg-icon-2' />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className='border-top d-flex justify-content-end gap-2 px-4 py-3 flex-shrink-0'>
          <button type='button' className='btn btn-light btn-sm' onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      {/* Add Plan Line Modal */}
      {addLineOpen && plan.id && (
        <AddPlanLineModal
          visible={true}
          planId={plan.id}
          vesselId={plan.vesselId}
          onClose={() => setAddLineOpen(false)}
          onSuccess={() => {
            loadPlanLines()
            setAddLineOpen(false)
          }}
        />
      )}

      {/* Edit Plan Line Modal */}
      {editLineOpen && editingLine && plan.id && (
        <EditPlanLineModal
          visible={true}
          planLine={editingLine}
          vesselId={plan.vesselId}
          onClose={() => {
            setEditLineOpen(false)
            setEditingLine(null)
          }}
          onSuccess={() => {
            loadPlanLines()
            setEditLineOpen(false)
            setEditingLine(null)
          }}
        />
      )}
    </div>
  )
}

