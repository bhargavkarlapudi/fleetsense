import { FC, useState, useEffect, useMemo } from 'react'
import {
  cargoDetailAttachmentDownloadUrl,
  cargoDetailAttachmentViewUrl,
  cargoFinalAttachmentDownloadUrl,
  cargoFinalAttachmentViewUrl,
  getCargoOperationById,
} from '../core/_requests'
import { CargoOperation } from '../core/_models'
import { toast } from 'react-toastify'
import { FileViewerModal } from '../../QHSE/components/FileViewerModal'

interface ViewCargoModalProps { 
  isOpen: boolean
  onClose: () => void
  cargo: CargoOperation
  isCrew?: boolean
}

const ViewCargoModal: FC<ViewCargoModalProps> = ({ isOpen, onClose, cargo, isCrew = false }) => {
  const [cargoData, setCargoData] = useState<CargoOperation | null>(null)
  const [loading, setLoading] = useState(true)
  const [isViewerOpen, setIsViewerOpen] = useState(false)
  const [viewerUrl, setViewerUrl] = useState<string | null>(null)
  const [viewerDownloadUrl, setViewerDownloadUrl] = useState<string | null>(null)
  const [viewerTitle, setViewerTitle] = useState<string | undefined>(undefined)
  const [viewerFileName, setViewerFileName] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (isOpen && cargo.id) {
      loadData()
    }
  }, [isOpen, cargo.id])

  const loadData = async () => {
    if (!cargo.id) return
    setLoading(true)
    try {
      const data = await getCargoOperationById(cargo.id)
      setCargoData(data)
    } catch (error: any) {
      toast.error(error.message || 'Error loading cargo operation', { position: 'top-center' })
    } finally {
      setLoading(false)
    }
  }

  const displayData = cargoData || cargo

  const formatDate = (iso?: string | null) => {
    if (!iso) return '-'
    try {
      return new Date(iso).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    } catch {
      return '-'
    }
  }

  const cumulativeTotals = useMemo(() => {
    const totals: number[] = []
    let running = 0
    const details = displayData.details || []
    details.forEach((d, idx) => {
      const qty = d.quantityMt ?? 0
      running += qty
      totals[idx] = running
    })
    return totals
  }, [displayData])

  if (!isOpen) return null

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
      <div className='modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable' role='document'>
        <div className='modal-content bg-white' style={{ color: '#181C32', maxHeight: '90vh' }}>
          <div className='modal-header'>
            <h5 className='modal-title'>View Cargo</h5>
            <button type='button' className='btn-close' onClick={onClose}></button>
          </div>

          <div className='modal-body' style={{ maxHeight: 'calc(90vh - 200px)', overflowY: 'auto' }}>
            {loading ? (
              <div className='text-center py-5'>
                <div className='spinner-border' role='status'>
                  <span className='visually-hidden'>Loading...</span>
                </div>
              </div>
            ) : (
              <>
                <div className='row g-3 mb-4'>
                  {!isCrew && (
                    <div className='col-md-4'>
                      <label className='form-label fw-semibold fs-6 mb-2' style={{ color: '#A1A5B7' }}>
                        Vessel
                      </label>
                      <div className='text-dark fs-6'>{displayData.vesselName || 'N/A'}</div>
                    </div>
                  )}
                  <div className='col-md-4'>
                    <label className='form-label fw-semibold fs-6 mb-2' style={{ color: '#A1A5B7' }}>
                      Breakup Type
                    </label>
                    <div className='text-dark fs-6'>{displayData.breakupType}</div>
                  </div>
                  <div className='col-md-4'>
                    <label className='form-label fw-semibold fs-6 mb-2' style={{ color: '#A1A5B7' }}>
                      Cargo Name
                    </label>
                    <div className='text-dark fs-6'>{displayData.cargoName || '-'}</div>
                  </div>

                  <div className='col-md-4'>
                    <label className='form-label fw-semibold fs-6 mb-2' style={{ color: '#A1A5B7' }}>
                      Total Cargo QTY (MT)
                    </label>
                    <div className='text-dark fs-6'>
                      {displayData.totalCargoQtyMt !== undefined && displayData.totalCargoQtyMt !== null
                        ? Number(displayData.totalCargoQtyMt).toFixed(3)
                        : '-'}
                    </div>
                  </div>
                  <div className='col-md-4'>
                    <label className='form-label fw-semibold fs-6 mb-2' style={{ color: '#A1A5B7' }}>
                      Shipper as per B/L
                    </label>
                    <div className='text-dark fs-6'>{displayData.shipperAsPerBl || '-'}</div>
                  </div>
                  <div className='col-md-4'>
                    <label className='form-label fw-semibold fs-6 mb-2' style={{ color: '#A1A5B7' }}>
                      Receiver as per B/L
                    </label>
                    <div className='text-dark fs-6'>{displayData.receiverAsPerBl || '-'}</div>
                  </div>

                  <div className='col-md-4'>
                    <label className='form-label fw-semibold fs-6 mb-2' style={{ color: '#A1A5B7' }}>
                      Load Ports
                    </label>
                    <div className='text-dark fs-6' style={{ whiteSpace: 'pre-wrap' }}>
                      {displayData.loadPorts || '-'}
                    </div>
                  </div>
                  <div className='col-md-4'>
                    <label className='form-label fw-semibold fs-6 mb-2' style={{ color: '#A1A5B7' }}>
                      Discharge Ports
                    </label>
                    <div className='text-dark fs-6' style={{ whiteSpace: 'pre-wrap' }}>
                      {displayData.dischargePorts || '-'}
                    </div>
                  </div>
                  <div className='col-md-4'>
                    <label className='form-label fw-semibold fs-6 mb-2' style={{ color: '#A1A5B7' }}>
                      Heating Requirements
                    </label>
                    <div className='text-dark fs-6' style={{ whiteSpace: 'pre-wrap' }}>
                      {displayData.heatingRequirements || '-'}
                    </div>
                  </div>

                  <div className='col-md-12'>
                    <label className='form-label fw-semibold fs-6 mb-2' style={{ color: '#A1A5B7' }}>
                      Remarks
                    </label>
                    <div className='text-dark fs-6'>{displayData.remarks || '-'}</div>
                  </div>

                  <div className='col-md-6'>
                    <label className='form-label fw-semibold fs-6 mb-2' style={{ color: '#A1A5B7' }}>
                      Created Date
                    </label>
                    <div className='text-dark fs-6'>{formatDate(displayData.createdDateTime)}</div>
                  </div>

                  <div className='col-md-6'>
                    <label className='form-label fw-semibold fs-6 mb-2' style={{ color: '#A1A5B7' }}>
                      Updated Date
                    </label>
                    <div className='text-dark fs-6'>{formatDate(displayData.updatedDateTime)}</div>
                  </div>
                </div>

                <div className='mb-3'>
                  <h6 className='fw-bold mb-3'>Cargo Details ({displayData.details?.length || 0})</h6>
                  {displayData.details && displayData.details.length > 0 ? (
                    <div className='table-responsive'>
                      <table className='table table-bordered'>
                        <thead>
                          <tr>
                            <th className='text-nowrap'>Cargo Grade</th>
                            <th className='text-nowrap'>
                              {displayData.breakupType === 'TANK' ? 'Tank Name' : 'Hold Name'}
                            </th>
                            <th className='text-nowrap'>Quantity (MT)</th>
                            <th className='text-nowrap'>No. of Loaders/Discharge</th>
                            <th className='text-nowrap'>Load/Discharge Rate (m³/hr)</th>
                            <th className='text-nowrap'>Ballast/Deballast Rate (m³/hr)</th>
                            <th className='text-nowrap'>Dock Water Density</th>
                            <th className='text-nowrap'>Max Draught Available (MTRS)</th>
                            <th className='text-nowrap'>Current Draught (MTRS)</th>
                            <th className='text-nowrap'>Attachment</th>
                            <th className='text-nowrap'>Total Cargo onboard</th>
                          </tr>
                        </thead>
                        <tbody>
                          {displayData.details.map((detail, index) => (
                            <tr key={index}>
                              <td>{detail.cargoGrade ?? '-'}</td>
                              <td>{detail.cargoName}</td>
                              <td>{detail.quantityMt ?? '-'}</td>
                              <td>{detail.noOfLoadersOrDischarge ?? '-'}</td>
                              <td>{detail.loadDischargeRateM3PerHr ?? '-'}</td>
                              <td>{detail.ballastPumpingRateM3PerHr ?? '-'}</td>
                              <td>{detail.dockWaterDensity ?? '-'}</td>
                              <td>{detail.maxDraughtAvailableHw ?? '-'}</td>
                              <td>{detail.currentDraughtMtrs ?? '-'}</td>
                              <td>
                                {detail.attachmentUrl && displayData.id && detail.orderIndex !== undefined ? (
                                  <button
                                    type='button'
                                    className='btn btn-sm btn-light-primary'
                                    onClick={() => {
                                      setViewerUrl(cargoDetailAttachmentViewUrl(displayData.id!, detail.orderIndex!))
                                      setViewerDownloadUrl(cargoDetailAttachmentDownloadUrl(displayData.id!, detail.orderIndex!))
                                      setViewerTitle('Cargo Detail Attachment')
                                      setViewerFileName(detail.cargoName || 'attachment')
                                      setIsViewerOpen(true)
                                    }}
                                  >
                                    View
                                  </button>
                                ) : (
                                  '-'
                                )}
                              </td>
                              <td>
                                {Number.isFinite(cumulativeTotals[index])
                                  ? cumulativeTotals[index].toFixed(3)
                                  : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className='text-muted'>No details available</div>
                  )}
                </div>

                <div className='mb-3'>
                  <h6 className='fw-bold mb-3'>Final Attachments</h6>
                  {displayData.finalAttachments && displayData.finalAttachments.length > 0 ? (
                    <div className='table-responsive'>
                      <table className='table table-bordered'>
                        <thead>
                          <tr>
                            <th className='text-nowrap' style={{ width: '60px' }}>
                              Sr No
                            </th>
                            <th className='text-nowrap'>Document Name</th>
                            <th className='text-nowrap'>Attachment</th>
                            <th className='text-nowrap'>Remarks</th>
                          </tr>
                        </thead>
                        <tbody>
                          {displayData.finalAttachments.map((att, index) => (
                            <tr key={att.id ?? index}>
                              <td className='text-center align-middle'>{index + 1}</td>
                              <td className='align-middle'>{att.documentName}</td>
                              <td className='align-middle'>
                                {att.attachmentUrl && att.id && displayData.id ? (
                                  <button
                                    type='button'
                                    className='btn btn-sm btn-light-primary'
                                    onClick={() => {
                                      setViewerUrl(cargoFinalAttachmentViewUrl(displayData.id!, att.id!))
                                      setViewerDownloadUrl(
                                        cargoFinalAttachmentDownloadUrl(displayData.id!, att.id!)
                                      )
                                      setViewerTitle(`Final Attachment – ${att.documentName}`)
                                      setViewerFileName(att.documentName || 'attachment')
                                      setIsViewerOpen(true)
                                    }}
                                  >
                                    View
                                  </button>
                                ) : (
                                  '-'
                                )}
                              </td>
                              <td className='align-middle'>{att.remarks || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className='text-muted'>No final attachments available</div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className='modal-footer'>
            <button type='button' className='btn btn-light btn-sm' onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>

      <FileViewerModal
        visible={isViewerOpen && !!viewerUrl}
        onClose={() => {
          setIsViewerOpen(false)
          setViewerUrl(null)
          setViewerDownloadUrl(null)
          setViewerTitle(undefined)
          setViewerFileName(undefined)
        }}
        title={viewerTitle}
        fileName={viewerFileName}
        viewUrl={viewerUrl || undefined}
        downloadUrl={viewerDownloadUrl || undefined}
      />
    </div>
  )
}

export default ViewCargoModal

