import React, { FC, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { KTSVG } from '../../../../../_metronic/helpers'
import { PmsJobRecord } from '../../core/pms/_models'
import { listJobAttachments, listJobSpareUsages, reassignPmsJob } from '../../core/pms/_requests'
import { PmsJobAttachmentDto, PmsJobSpareUsageDto } from '../../core/pms/_models'
import { JobAttachmentsModal } from './JobAttachmentsModal'
import { PrintJobCardModal } from './PrintJobCardModal'
import { getPartsBySubcomponent, getSubcomponentsByComponent } from '../../core/_requests'
import { PartDto } from '../../core/_models'
import { toast } from 'react-toastify'

interface Props {
  visible: boolean
  onClose: () => void
  record: PmsJobRecord
  onRefresh: () => void
}

const WRAP_STYLE: React.CSSProperties = {
  background: 'rgba(0,0,0,0.5)',
  position: 'fixed',
  inset: 0,
  zIndex: 2100,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const getStateBadgeClass = (state: string) => {
  switch (state) {
    case 'PLANNED':
      return 'badge-light-info'
    case 'IN_PROGRESS':
      return 'badge-light-warning'
    case 'COMPLETED':
      return 'badge-light-primary'
    case 'VERIFIED':
      return 'badge-light-success'
    case 'CLOSED':
      return 'badge-light-success'
    case 'DEFERRED':
      return 'badge-light-danger'
    case 'CANCELLED':
      return 'badge-light-danger'
    default:
      return 'badge-light'
  }
}

const niceEnum = (s?: string | null) =>
  s ? s.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '-'

export const PmsJobDetailModal: FC<Props> = ({ visible, onClose, record, onRefresh }) => {
  const navigate = useNavigate()
  const [attachments, setAttachments] = useState<PmsJobAttachmentDto[]>([])
  const [spareUsages, setSpareUsages] = useState<PmsJobSpareUsageDto[]>([])
  const [parts, setParts] = useState<PartDto[]>([])
  const [subcomponentsWithParts, setSubcomponentsWithParts] = useState<Array<{ subcomponent: any; parts: PartDto[] }>>([])
  const [expandedSubcomponents, setExpandedSubcomponents] = useState<Set<number>>(new Set())
  const [loadingAttachments, setLoadingAttachments] = useState(false)
  const [loadingSpares, setLoadingSpares] = useState(false)
  const [loadingParts, setLoadingParts] = useState(false)
  const [attachmentsModalOpen, setAttachmentsModalOpen] = useState(false)
  const [printCardOpen, setPrintCardOpen] = useState(false)
  const [showReassign, setShowReassign] = useState(false)
  const [newAssigneeUserId, setNewAssigneeUserId] = useState<string>('')
  const [reassignReason, setReassignReason] = useState<string>('')
  const [reassigning, setReassigning] = useState(false)

  const handleViewDefect = () => {
    if (record.defectId) {
      // Navigate to defect list page - the defect detail can be opened from there
      navigate(`/qhse/defects-list`, { state: { defectId: record.defectId } })
      onClose()
    }
  }

  const handleReassign = async () => {
    if (!record.id || !newAssigneeUserId?.trim()) {
      toast.error('Please enter crew/team name', { position: 'top-center' })
      return
    }
    setReassigning(true)
    try {
      await reassignPmsJob(record.id, newAssigneeUserId.trim(), reassignReason || undefined)
      toast.success('Job reassigned successfully', { position: 'top-center' })
      setShowReassign(false)
      setNewAssigneeUserId('')
      setReassignReason('')
      onRefresh()
    } catch (error: any) {
      console.error('Error reassigning job:', error)
      toast.error(error.message || 'Failed to reassign job', { position: 'top-center' })
    } finally {
      setReassigning(false)
    }
  }

  const loadAttachments = useCallback(async () => {
    if (!record.id) return
    setLoadingAttachments(true)
    try {
      const data = await listJobAttachments(record.id)
      setAttachments(data)
    } catch (error) {
      console.error('Error loading attachments:', error)
    } finally {
      setLoadingAttachments(false)
    }
  }, [record.id])

  const loadSpareUsages = useCallback(async () => {
    if (!record.id) return
    setLoadingSpares(true)
    try {
      const data = await listJobSpareUsages(record.id)
      setSpareUsages(data)
    } catch (error) {
      console.error('Error loading spare usages:', error)
    } finally {
      setLoadingSpares(false)
    }
  }, [record.id])

  const loadParts = useCallback(async () => {
    setLoadingParts(true)
    try {
      if (record.subComponentId) {
        // If job is for subcomponent, fetch parts for that subcomponent
        const data = await getPartsBySubcomponent(record.subComponentId)
        setParts(data)
        setSubcomponentsWithParts([])
      } else if (record.componentId) {
        // If job is for component, fetch all subcomponents and their parts in tree structure
        const subcomponents = await getSubcomponentsByComponent(record.componentId)
        const subcomponentsWithPartsData: Array<{ subcomponent: any; parts: PartDto[] }> = []
        for (const sub of subcomponents) {
          if (sub.id) {
            const subParts = await getPartsBySubcomponent(sub.id)
            subcomponentsWithPartsData.push({
              subcomponent: sub,
              parts: subParts
            })
          }
        }
        setSubcomponentsWithParts(subcomponentsWithPartsData)
        // Also set flat parts list for backward compatibility
        const allParts: PartDto[] = subcomponentsWithPartsData.flatMap(item => item.parts)
        setParts(allParts)
        // Expand all subcomponents by default
        setExpandedSubcomponents(new Set(subcomponentsWithPartsData.map(item => item.subcomponent.id).filter((id): id is number => id !== undefined)))
      } else {
        setParts([])
        setSubcomponentsWithParts([])
      }
    } catch (error) {
      console.error('Error loading parts:', error)
      setParts([])
      setSubcomponentsWithParts([])
    } finally {
      setLoadingParts(false)
    }
  }, [record.subComponentId, record.componentId])

  const toggleSubcomponent = (subcomponentId: number) => {
    setExpandedSubcomponents(prev => {
      const newSet = new Set(prev)
      if (newSet.has(subcomponentId)) {
        newSet.delete(subcomponentId)
      } else {
        newSet.add(subcomponentId)
      }
      return newSet
    })
  }

  useEffect(() => {
    if (visible && record.id) {
      loadAttachments()
      loadSpareUsages()
      loadParts()
    }
  }, [visible, record.id, loadAttachments, loadSpareUsages, loadParts])

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '-'
    try {
      const date = new Date(dateStr)
      const day = date.getDate()
      const month = date.toLocaleString('en-US', { month: 'short' })
      const year = date.getFullYear()
      return `${day} ${month} ${year}`
    } catch {
      return dateStr
    }
  }

  const formatCurrency = (amount?: number | null) => {
    if (amount == null) return '-'
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
  }

  const totalSpareCost = spareUsages.reduce((sum, su) => sum + (su.totalCost || 0), 0)

  if (!visible) return null

  return (
    <>
      <div style={WRAP_STYLE} tabIndex={-1} onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div
          className='bg-white text-dark rounded shadow-lg d-flex flex-column'
          style={{
            width: '90vw',
            maxWidth: '1200px',
            maxHeight: '90vh',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className='d-flex align-items-center justify-content-between border-bottom px-4 py-3 flex-shrink-0'>
            <h5 className='modal-title text-dark m-0'>Job Details</h5>
            <div className='d-flex align-items-center gap-2'>
              {record.id && (
                <button
                  type='button'
                  className='btn btn-sm btn-primary'
                  onClick={() => setPrintCardOpen(true)}
                  title='Print Job Card'
                >
                  <KTSVG path='/media/icons/duotune/general/gen005.svg' className='svg-icon-2' />
                  Print Job Card
                </button>
              )}
              <button type='button' className='btn-close' onClick={onClose}></button>
            </div>
          </div>

          <div className='flex-grow-1 overflow-auto px-4 py-3'>
            {/* Job For Section - Prominent Display */}
            <div className='card bg-light-primary mb-4'>
              <div className='card-body'>
                <h6 className='fw-bold mb-3'>Job For</h6>
                <div className='d-flex flex-wrap align-items-center gap-2 mb-2'>
                  {record.equipmentName && (
                    <span className='badge badge-light-primary fs-6'>
                      <KTSVG path='/media/icons/duotune/general/gen025.svg' className='svg-icon-4 me-1' />
                      Equipment: {record.equipmentName}
                    </span>
                  )}
                  {record.componentName && (
                    <span className={`badge ${record.subComponentName ? 'badge-light-info' : 'badge-light-warning'} fs-6`}>
                      <KTSVG path='/media/icons/duotune/general/gen024.svg' className='svg-icon-4 me-1' />
                      Component: {record.componentName}
                    </span>
                  )}
                  {record.subComponentName && (
                    <span className='badge badge-light-success fs-6'>
                      <KTSVG path='/media/icons/duotune/general/gen023.svg' className='svg-icon-4 me-1' />
                      SubComponent: {record.subComponentName}
                    </span>
                  )}
                </div>
                <div className='text-muted fs-7'>
                  This job is for: <strong>{record.subComponentName || record.componentName || record.equipmentName || 'N/A'}</strong>
                </div>
              </div>
            </div>

            {/* Job Info */}
            <div className='row g-3 mb-4'>
              <div className='col-md-6'>
                <div className='fw-semibold text-muted fs-7 mb-1'>Job Code</div>
                <div className='fw-bold'>{record.jobCode || '-'}</div>
              </div>
              <div className='col-md-6'>
                <div className='fw-semibold text-muted fs-7 mb-1'>State</div>
                <div>
                  <span className={`badge ${getStateBadgeClass(record.state)}`}>{niceEnum(record.state)}</span>
                </div>
              </div>
              <div className='col-md-6'>
                <div className='fw-semibold text-muted fs-7 mb-1'>Job Type</div>
                <div>
                  {record.jobType ? (
                    <span className='badge badge-light-info'>{record.jobType}</span>
                  ) : (
                    '-'
                  )}
                </div>
              </div>
              <div className='col-md-6'>
                <div className='fw-semibold text-muted fs-7 mb-1'>Vessel</div>
                <div className='fw-bold'>{record.vesselName || '-'}</div>
              </div>
              <div className='col-12'>
                <div className='fw-semibold text-muted fs-7 mb-1'>Task Description</div>
                <div className='fw-bold'>{record.jobDescription || record.title || '-'}</div>
              </div>
              <div className='col-md-6'>
                <div className='fw-semibold text-muted fs-7 mb-1'>Due Date</div>
                <div>{formatDate(record.dueDate)}</div>
              </div>
              <div className='col-md-6'>
                <div className='fw-semibold text-muted fs-7 mb-1'>Due Counter</div>
                <div>{record.dueCounter ? `${record.dueCounter} hrs` : '-'}</div>
              </div>
              {record.defectNumber && record.defectId && (
                <div className='col-md-6'>
                  <div className='fw-semibold text-muted fs-7 mb-1'>Linked Defect</div>
                  <div className='d-flex align-items-center gap-2'>
                    <span 
                      className='badge badge-light-primary cursor-pointer'
                      onClick={handleViewDefect}
                      style={{ cursor: 'pointer' }}
                      title='Click to view defect'
                    >
                      {record.defectNumber}
                    </span>
                    <button
                      className='btn btn-sm btn-light-primary'
                      onClick={handleViewDefect}
                      title='View Defect'
                    >
                      <KTSVG path='/media/icons/duotune/general/gen057.svg' className='svg-icon-3' />
                      View Defect
                    </button>
                  </div>
                </div>
              )}
              <div className='col-md-6'>
                <div className='fw-semibold text-muted fs-7 mb-1'>Assigned To</div>
                <div className='d-flex align-items-center gap-2'>
                  <span>{record.crewUndertaking || '-'}</span>
                  {(record.state === 'PLANNED' || record.state === 'IN_PROGRESS') && (
                    <>
                      {!showReassign ? (
                        <button
                          className='btn btn-sm btn-light-primary'
                          onClick={() => {
                            setShowReassign(true)
                            setNewAssigneeUserId(record.crewUndertaking || '')
                          }}
                          title='Reassign Job'
                        >
                          <KTSVG path='/media/icons/duotune/general/gen055.svg' className='svg-icon-3' />
                          Reassign
                        </button>
                      ) : (
                        <div className='d-flex flex-column gap-2' style={{ minWidth: '200px' }}>
                          <input
                            type='text'
                            className='form-control form-control-sm'
                            placeholder='Crew/Team Name'
                            value={newAssigneeUserId}
                            onChange={(e) => setNewAssigneeUserId(e.target.value)}
                          />
                          <input
                            type='text'
                            className='form-control form-control-sm'
                            placeholder='Reason (optional)'
                            value={reassignReason}
                            onChange={(e) => setReassignReason(e.target.value)}
                          />
                          <div className='d-flex gap-1'>
                            <button
                              className='btn btn-sm btn-primary'
                              onClick={handleReassign}
                              disabled={reassigning || !newAssigneeUserId?.trim()}
                            >
                              {reassigning ? 'Reassigning...' : 'Confirm'}
                            </button>
                            <button
                              className='btn btn-sm btn-light'
                              onClick={() => {
                                setShowReassign(false)
                                setNewAssigneeUserId('')
                                setReassignReason('')
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
              <div className='col-md-6'>
                <div className='fw-semibold text-muted fs-7 mb-1'>Responsible Rank</div>
                <div>{record.responsibleRank || '-'}</div>
              </div>
              <div className='col-md-6'>
                <div className='fw-semibold text-muted fs-7 mb-1'>Actual Start Date</div>
                <div>{formatDate(record.actualStartDate)}</div>
              </div>
              <div className='col-md-6'>
                <div className='fw-semibold text-muted fs-7 mb-1'>Actual Completion Date</div>
                <div>{formatDate(record.actualCompletionDate)}</div>
              </div>
              {record.actualCounterAtCompletion && (
                <div className='col-md-6'>
                  <div className='fw-semibold text-muted fs-7 mb-1'>Counter at Completion</div>
                  <div>{record.actualCounterAtCompletion} hrs</div>
                </div>
              )}
              {record.remarks && (
                <div className='col-12'>
                  <div className='fw-semibold text-muted fs-7 mb-1'>Remarks</div>
                  <div className='border rounded p-2 bg-light-subtle' style={{ minHeight: '60px' }}>
                    {record.remarks}
                  </div>
                </div>
              )}
              {record.findings && (
                <div className='col-12'>
                  <div className='fw-semibold text-muted fs-7 mb-1'>Findings</div>
                  <div className='border rounded p-2 bg-light-subtle' style={{ minHeight: '60px' }}>
                    {record.findings}
                  </div>
                </div>
              )}
              {record.checklist && (
                <div className='col-12'>
                  <div className='fw-semibold text-muted fs-7 mb-2'>Checklist</div>
                  <div className='card bg-light p-3'>
                    <div className='form-check-list'>
                      {record.checklist.split('\n').filter(line => line.trim().length > 0).map((line, idx) => (
                        <div key={idx} className='form-check mb-2'>
                          <input
                            className='form-check-input'
                            type='checkbox'
                            id={`checklist-${idx}`}
                            disabled
                            readOnly
                          />
                          <label className='form-check-label' htmlFor={`checklist-${idx}`}>
                            {line.trim()}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {record.procedureFileRef && (
                <div className='col-12'>
                  <div className='fw-semibold text-muted fs-7 mb-1'>OEM Manual Reference</div>
                  <div>
                    <a href={record.procedureFileRef} target='_blank' rel='noopener noreferrer' className='text-primary'>
                      {record.procedureFileRef}
                    </a>
                  </div>
                </div>
              )}
              {record.safetyPrecautions && (
                <div className='col-12'>
                  <div className='fw-semibold text-muted fs-7 mb-1'>Safety Precautions</div>
                  <div className='alert alert-warning mb-0'>{record.safetyPrecautions}</div>
                </div>
              )}
              {record.riskPermitRequired && (
                <div className='col-12'>
                  <div className='fw-semibold text-muted fs-7 mb-1'>Permit Required</div>
                  <div>
                    <span className='badge badge-light-warning'>Yes</span>
                    {record.permitType && (
                      <span className='badge badge-light-info ms-2'>{record.permitType}</span>
                    )}
                  </div>
                </div>
              )}
              {record.measuredValues && (
                <div className='col-12'>
                  <div className='fw-semibold text-muted fs-7 mb-1'>Measured Values</div>
                  <div className='border rounded p-2 bg-light-subtle' style={{ minHeight: '60px' }}>
                    {record.measuredValues}
                  </div>
                </div>
              )}
            </div>

            {/* Parts Under Component/SubComponent */}
            {(record.componentId || record.subComponentId) && (
              <div className='mb-5'>
                <div className='d-flex justify-content-between align-items-center mb-3'>
                  <h6 className='fw-bold m-0'>
                    Parts Under {record.subComponentName ? 'SubComponent' : 'Component'}
                  </h6>
                </div>
                {loadingParts ? (
                  <div className='text-center py-3'>
                    <div className='spinner-border spinner-border-sm' role='status'>
                      <span className='visually-hidden'>Loading...</span>
                    </div>
                  </div>
                ) : record.componentId && !record.subComponentId && subcomponentsWithParts.length > 0 ? (
                  // Tree structure for component jobs
                  <div className='card'>
                    <div className='card-body p-0'>
                      {subcomponentsWithParts.map((item) => {
                        const isExpanded = item.subcomponent.id && expandedSubcomponents.has(item.subcomponent.id)
                        return (
                          <div key={item.subcomponent.id} className='border-bottom'>
                            <div
                              className='d-flex align-items-center justify-content-between p-3 cursor-pointer'
                              style={{ cursor: 'pointer', backgroundColor: isExpanded ? '#f8f9fa' : 'white' }}
                              onClick={() => item.subcomponent.id && toggleSubcomponent(item.subcomponent.id)}
                            >
                              <div className='d-flex align-items-center gap-2'>
                                <KTSVG
                                  path={isExpanded ? '/media/icons/duotune/arrows/arr074.svg' : '/media/icons/duotune/arrows/arr071.svg'}
                                  className='svg-icon-3'
                                />
                                <div>
                                  <div className='fw-bold'>
                                    {item.subcomponent.name || 'Unnamed SubComponent'}
                                  </div>
                                  {item.subcomponent.subComponentCode && (
                                    <div className='text-muted fs-7'>({item.subcomponent.subComponentCode})</div>
                                  )}
                                </div>
                              </div>
                              <span className='badge badge-light-info'>
                                {item.parts.length} {item.parts.length === 1 ? 'part' : 'parts'}
                              </span>
                            </div>
                            {isExpanded && item.parts.length > 0 && (
                              <div className='px-3 pb-3'>
                                <div className='table-responsive'>
                                  <table className='table table-bordered table-sm align-middle mb-0'>
                                    <thead>
                                      <tr>
                                        <th>Part Name</th>
                                        <th>Part Code</th>
                                        <th>Location</th>
                                        <th>Maker</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {item.parts.map((part) => (
                                        <tr key={part.id}>
                                          <td>{part.name || '-'}</td>
                                          <td>{part.code || '-'}</td>
                                          <td>{part.location || '-'}</td>
                                          <td>{part.maker || part.manufacturer || '-'}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                            {isExpanded && item.parts.length === 0 && (
                              <div className='px-3 pb-3 text-muted fs-7'>
                                No parts found for this subcomponent.
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : parts.length === 0 ? (
                  <div className='text-muted text-center py-3'>
                    No parts found for this {record.subComponentName ? 'subcomponent' : 'component'}.
                  </div>
                ) : (
                  // Flat table for subcomponent jobs
                  <div className='table-responsive'>
                    <table className='table table-bordered table-sm align-middle'>
                      <thead>
                        <tr>
                          <th>Part Name</th>
                          <th>Part Code</th>
                          <th>Location</th>
                          <th>Maker</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parts.map((part) => (
                          <tr key={part.id}>
                            <td>{part.name || '-'}</td>
                            <td>{part.code || '-'}</td>
                            <td>{part.location || '-'}</td>
                            <td>{part.maker || part.manufacturer || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Spare Usages */}
            <div className='mb-5'>
              <div className='d-flex justify-content-between align-items-center mb-3'>
                <h6 className='fw-bold m-0'>Spare Usages</h6>
                {totalSpareCost > 0 && (
                  <div className='alert alert-light-primary mb-0 py-2 px-3'>
                    <strong>Total Spare Cost: {formatCurrency(totalSpareCost)}</strong>
                  </div>
                )}
              </div>
              {loadingSpares ? (
                <div className='text-center py-3'>
                  <div className='spinner-border spinner-border-sm' role='status'>
                    <span className='visually-hidden'>Loading...</span>
                  </div>
                </div>
              ) : spareUsages.length === 0 ? (
                <div className='text-muted text-center py-3'>No spare usages recorded for this job.</div>
              ) : (
                <div className='table-responsive'>
                  <table className='table table-bordered table-sm align-middle'>
                    <thead>
                      <tr>
                        <th>Item Name</th>
                        <th>Part Number</th>
                        <th>Quantity</th>
                        <th>Unit Cost</th>
                        <th>Total Cost</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {spareUsages.map((su) => (
                        <tr key={su.id}>
                          <td>
                            {su.inventoryItemName || su.inventoryItemPartName || `Item #${su.inventoryItemId}`}
                          </td>
                          <td>
                            {su.inventoryItemPartName || '-'}
                          </td>
                          <td>{su.quantity}</td>
                          <td>{formatCurrency(su.unitCost)}</td>
                          <td className='fw-bold'>{formatCurrency(su.totalCost)}</td>
                          <td>
                            {su.inventoryItemId && (
                              <button
                                className='btn btn-sm btn-light-primary'
                                onClick={() => {
                                  // Navigate to inventory page - you may need to adjust the route
                                  window.open(`/procurement/inventory?itemId=${su.inventoryItemId}`, '_blank')
                                }}
                                title='View in Inventory'
                              >
                                <KTSVG path='/media/icons/duotune/general/gen057.svg' className='svg-icon-3' />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className='table-light'>
                        <td colSpan={4} className='text-end fw-bold'>
                          Grand Total:
                        </td>
                        <td className='fw-bold fs-5'>{formatCurrency(totalSpareCost)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* Attachments */}
            <div className='mb-5'>
              <div className='d-flex justify-content-between align-items-center mb-3'>
                <h6 className='fw-bold m-0'>Attachments ({attachments.length})</h6>
                <button
                  type='button'
                  className='btn btn-sm btn-primary'
                  onClick={() => setAttachmentsModalOpen(true)}
                >
                  <KTSVG path='/media/icons/duotune/files/fil003.svg' className='svg-icon-2' />
                  Manage Attachments
                </button>
              </div>
              {loadingAttachments ? (
                <div className='text-center py-3'>
                  <div className='spinner-border spinner-border-sm' role='status'>
                    <span className='visually-hidden'>Loading...</span>
                  </div>
                </div>
              ) : attachments.length === 0 ? (
                <div className='text-muted text-center py-3'>No attachments</div>
              ) : (
                <div className='d-flex flex-wrap gap-2'>
                  {attachments.slice(0, 5).map((att) => (
                    <div key={att.id} className='badge badge-light-primary p-2'>
                      {att.fileName}
                    </div>
                  ))}
                  {attachments.length > 5 && (
                    <div className='badge badge-light p-2'>+{attachments.length - 5} more</div>
                  )}
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
      </div>

      {/* Attachments Modal */}
      {attachmentsModalOpen && record.id && (
        <JobAttachmentsModal
          visible={true}
          jobId={record.id}
          onClose={() => {
            setAttachmentsModalOpen(false)
            loadAttachments()
            onRefresh()
          }}
          onSuccess={() => {
            loadAttachments()
            onRefresh()
          }}
        />
      )}

      {/* Print Job Card Modal */}
      {printCardOpen && record.id && (
        <PrintJobCardModal
          visible={printCardOpen}
          jobId={record.id}
          onClose={() => setPrintCardOpen(false)}
        />
      )}
    </>
  )
}
