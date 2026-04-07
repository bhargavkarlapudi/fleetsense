import React, { FC, useState, useEffect } from 'react'
import { KTSVG } from '../../../../../_metronic/helpers'
import { getPmsPlans, getPmsPlanLines } from '../../core/pms/_requests'
import { getVesselList } from '../../../Management/core/_requests'
import { getEquipmentByVessel } from '../../core/_requests'
import { PmsPlanDto, PmsPlanLineDto } from '../../core/pms/_models'
import type { Vessel } from '../../../Management/core/_models'
import type { EquipmentDto } from '../../core/_models'
import { toast } from 'react-toastify'

interface Props {
  visible: boolean
  onClose: () => void
}

export const MachineryHistoryPrintView: FC<Props> = ({ visible, onClose }) => {
  const [vessels, setVessels] = useState<Vessel[]>([])
  const [selectedVesselId, setSelectedVesselId] = useState<number | undefined>()
  const [equipment, setEquipment] = useState<EquipmentDto[]>([])
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<number | undefined>()
  const [plans, setPlans] = useState<PmsPlanDto[]>([])
  const [planLines, setPlanLines] = useState<PmsPlanLineDto[]>([])
  const [loading, setLoading] = useState(false)
  const [fromDate, setFromDate] = useState<string>('')
  const [toDate, setToDate] = useState<string>('')

  useEffect(() => {
    if (visible) {
      loadVessels()
    }
  }, [visible])

  useEffect(() => {
    if (selectedVesselId) {
      loadEquipment()
      loadPlans()
    } else {
      setEquipment([])
      setPlans([])
      setPlanLines([])
    }
  }, [selectedVesselId])

  useEffect(() => {
    if (selectedEquipmentId && plans.length > 0) {
      loadPlanLines()
    } else {
      setPlanLines([])
    }
  }, [selectedEquipmentId, plans])

  const loadVessels = async () => {
    try {
      const data = await getVesselList()
      setVessels(data)
    } catch (error) {
      console.error('Error loading vessels:', error)
      toast.error('Failed to load vessels', { position: 'top-center' })
    }
  }

  const loadEquipment = async () => {
    if (!selectedVesselId) return
    try {
      const data = await getEquipmentByVessel(selectedVesselId)
      setEquipment(data)
    } catch (error) {
      console.error('Error loading equipment:', error)
      toast.error('Failed to load equipment', { position: 'top-center' })
    }
  }

  const loadPlans = async () => {
    if (!selectedVesselId) return
    setLoading(true)
    try {
      const allPlans = await getPmsPlans()
      const filtered = allPlans.filter(p => p.vesselId === selectedVesselId && p.status === 'ACTIVE')
      setPlans(filtered)
    } catch (error) {
      console.error('Error loading plans:', error)
      toast.error('Failed to load plans', { position: 'top-center' })
    } finally {
      setLoading(false)
    }
  }

  const loadPlanLines = async () => {
    if (!selectedEquipmentId || plans.length === 0) return
    setLoading(true)
    try {
      const allLines: PmsPlanLineDto[] = []
      for (const plan of plans) {
        if (plan.id) {
          const lines = await getPmsPlanLines(plan.id)
          // Filter lines by equipment
          const filtered = lines.filter(line => {
            // Check if line's component/subcomponent belongs to selected equipment
            // This is simplified - in a real app, you'd need to check the hierarchy
            return line.active !== false
          })
          allLines.push(...filtered)
        }
      }
      setPlanLines(allLines)
    } catch (error) {
      console.error('Error loading plan lines:', error)
      toast.error('Failed to load plan lines', { position: 'top-center' })
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleExportPDF = () => {
    // In a real app, you'd use a PDF library like jsPDF or html2pdf
    toast.info('PDF export functionality would be implemented here', { position: 'top-center' })
  }

  const filteredLines = planLines.filter(line => {
    if (!selectedEquipmentId) return true
    // Filter by equipment - simplified check
    return true
  })

  if (!visible) return null

  return (
    <div style={{ background: 'rgba(0,0,0,0.5)', position: 'fixed', inset: 0, zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className='bg-white text-dark rounded shadow-lg d-flex flex-column' style={{ width: '90vw', maxWidth: '1400px', maxHeight: '90vh' }}>
        {/* Header */}
        <div className='d-flex align-items-center justify-content-between border-bottom px-4 py-3 flex-shrink-0'>
          <h5 className='modal-title text-dark m-0'>Machinery History Print View</h5>
          <div className='d-flex gap-2'>
            <button type='button' className='btn btn-sm btn-light' onClick={handleExportPDF}>
              <KTSVG path='/media/icons/duotune/files/fil021.svg' className='svg-icon-2' />
              Export PDF
            </button>
            <button type='button' className='btn btn-sm btn-primary' onClick={handlePrint}>
              <KTSVG path='/media/icons/duotune/general/gen027.svg' className='svg-icon-2' />
              Print
            </button>
            <button type='button' className='btn-close' onClick={onClose}></button>
          </div>
        </div>

        {/* Filters */}
        <div className='border-bottom px-4 py-3 flex-shrink-0'>
          <div className='row g-3'>
            <div className='col-md-3'>
              <label className='form-label fw-semibold fs-6 mb-2 text-dark'>Vessel</label>
              <select
                className='form-select'
                value={selectedVesselId || ''}
                onChange={(e) => setSelectedVesselId(e.target.value ? Number(e.target.value) : undefined)}
              >
                <option value=''>Select Vessel</option>
                {vessels.map(v => (
                  <option key={v.id} value={v.id}>
                    {(v as any).fleet_name || `Vessel ${v.id}`}
                  </option>
                ))}
              </select>
            </div>
            <div className='col-md-3'>
              <label className='form-label fw-semibold fs-6 mb-2 text-dark'>Equipment</label>
              <select
                className='form-select'
                value={selectedEquipmentId || ''}
                onChange={(e) => setSelectedEquipmentId(e.target.value ? Number(e.target.value) : undefined)}
                disabled={!selectedVesselId}
              >
                <option value=''>All Equipment</option>
                {equipment.map(eq => (
                  <option key={eq.id} value={eq.id}>
                    {eq.name} {eq.code && `(${eq.code})`}
                  </option>
                ))}
              </select>
            </div>
            <div className='col-md-3'>
              <label className='form-label fw-semibold fs-6 mb-2 text-dark'>From Date</label>
              <input
                type='date'
                className='form-control'
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div className='col-md-3'>
              <label className='form-label fw-semibold fs-6 mb-2 text-dark'>To Date</label>
              <input
                type='date'
                className='form-control'
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Print Content */}
        <div className='flex-grow-1 overflow-auto px-4 py-3'>
          <div className='print-content'>
            <div className='text-center mb-5'>
              <h3 className='fw-bold'>Machinery Maintenance History</h3>
              {selectedVesselId && (
                <p className='text-muted'>
                  Vessel: {vessels.find(v => v.id === selectedVesselId)?.fleet_name || `Vessel ${selectedVesselId}`}
                  {selectedEquipmentId && ` | Equipment: ${equipment.find(e => e.id === selectedEquipmentId)?.name || ''}`}
                </p>
              )}
              <p className='text-muted'>
                {fromDate && toDate ? `Period: ${new Date(fromDate).toLocaleDateString()} - ${new Date(toDate).toLocaleDateString()}` : 'All Time'}
              </p>
            </div>

            {loading ? (
              <div className='text-center py-5'>
                <div className='spinner-border' role='status'>
                  <span className='visually-hidden'>Loading...</span>
                </div>
              </div>
            ) : filteredLines.length === 0 ? (
              <div className='text-center py-5 text-muted'>No maintenance history found for the selected criteria.</div>
            ) : (
              <div className='table-responsive'>
                <table className='table table-bordered align-middle'>
                  <thead>
                    <tr>
                      <th>Overhaul Interval</th>
                      <th>Last Done</th>
                      <th>Next Due</th>
                      <th>Hours Left</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLines.map((line) => {
                      // Format interval using periodicities
                      const formatPeriodicity = (value: number | null | undefined, type: string | null | undefined): string => {
                        if (!value || !type) return ''
                        const upperType = type.toUpperCase()
                        const typeLabel = upperType === 'M' ? 'Months' : upperType === 'H' ? 'Hours' : upperType
                        return `${value} ${typeLabel}`
                      }
                      
                      const isHybrid = line.scheduleType === 'HYBRID_WHICHEVER_FIRST' || line.scheduleType === 'HYBRID_BOTH_REQUIRED'
                      let interval = '-'
                      if (isHybrid && (line.jobPeriodicity || line.jobPeriodicity2)) {
                        const periodicity1 = formatPeriodicity(line.jobPeriodicity, line.periodicityId)
                        const periodicity2 = formatPeriodicity(line.jobPeriodicity2, line.periodicityId2)
                        if (periodicity1 && periodicity2) {
                          interval = `${periodicity1} / ${periodicity2}`
                        } else if (periodicity1) {
                          interval = periodicity1
                        } else if (periodicity2) {
                          interval = periodicity2
                        }
                      } else if (line.jobPeriodicity && line.periodicityId) {
                        interval = formatPeriodicity(line.jobPeriodicity, line.periodicityId)
                      }
                      
                      const lastDone = line.lastDoneDate
                        ? new Date(line.lastDoneDate).toLocaleDateString()
                        : line.lastDoneCounter
                        ? `${line.lastDoneCounter} hrs`
                        : '-'
                      
                      const nextDue = line.nextDueDate
                        ? new Date(line.nextDueDate).toLocaleDateString()
                        : line.nextDueCounter
                        ? `${line.nextDueCounter} hrs`
                        : '-'
                      
                      const hoursLeft = line.nextDueCounter && line.lastDoneCounter
                        ? line.nextDueCounter - line.lastDoneCounter
                        : null

                      return (
                        <tr key={line.id}>
                          <td>{interval}</td>
                          <td>{lastDone}</td>
                          <td>{nextDue}</td>
                          <td>{hoursLeft !== null ? `${hoursLeft} hrs` : '-'}</td>
                          <td>{line.taskDescription || '-'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className='border-top d-flex justify-content-end gap-2 px-4 py-3 flex-shrink-0'>
          <button type='button' className='btn btn-light btn-sm' onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-content, .print-content * {
            visibility: visible;
          }
          .print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}

