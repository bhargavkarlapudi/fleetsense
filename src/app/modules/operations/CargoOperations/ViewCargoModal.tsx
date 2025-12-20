import { FC, useState, useEffect } from 'react'
import { getCargoOperationById } from '../core/_requests'
import { CargoOperation } from '../core/_models'
import { toast } from 'react-toastify'

interface ViewCargoModalProps { 
  isOpen: boolean
  onClose: () => void
  cargo: CargoOperation
}

const ViewCargoModal: FC<ViewCargoModalProps> = ({ isOpen, onClose, cargo }) => {
  const [cargoData, setCargoData] = useState<CargoOperation | null>(null)
  const [loading, setLoading] = useState(true)

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

  if (!isOpen) return null

  const displayData = cargoData || cargo

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
                  <div className='col-md-4'>
                    <label className='form-label fw-semibold fs-6 mb-2' style={{ color: '#A1A5B7' }}>
                      Vessel
                    </label>
                    <div className='text-dark fs-6'>{displayData.vesselName || 'N/A'}</div>
                  </div>

                  <div className='col-md-4'>
                    <label className='form-label fw-semibold fs-6 mb-2' style={{ color: '#A1A5B7' }}>
                      Voyage
                    </label>
                    <div className='text-dark fs-6'>{displayData.voyageNumber || 'N/A'}</div>
                  </div>

                  <div className='col-md-4'>
                    <label className='form-label fw-semibold fs-6 mb-2' style={{ color: '#A1A5B7' }}>
                      Breakup Type
                    </label>
                    <div className='text-dark fs-6'>{displayData.breakupType}</div>
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
                    <div className='text-dark fs-6'>
                      {displayData.createdDateTime ? new Date(displayData.createdDateTime).toLocaleString() : '-'}
                    </div>
                  </div>

                  <div className='col-md-6'>
                    <label className='form-label fw-semibold fs-6 mb-2' style={{ color: '#A1A5B7' }}>
                      Updated Date
                    </label>
                    <div className='text-dark fs-6'>
                      {displayData.updatedDateTime ? new Date(displayData.updatedDateTime).toLocaleString() : '-'}
                    </div>
                  </div>
                </div>

                <div className='mb-3'>
                  <h6 className='fw-bold mb-3'>Cargo Details ({displayData.details?.length || 0})</h6>
                  {displayData.details && displayData.details.length > 0 ? (
                    <div className='table-responsive'>
                      <table className='table table-bordered'>
                        <thead>
                          <tr>
                            <th>Cargo Name ({displayData.breakupType})</th>
                            <th>Quantity (MT)</th>
                            <th>No. of Loaders/Discharge</th>
                            <th>Ballast Pumping Rate (m³/hr)</th>
                            <th>Dock Water Density</th>
                            <th>Max Draught Available (HW)</th>
                            <th>Load/Discharge Rate (m³/hr)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {displayData.details.map((detail, index) => (
                            <tr key={index}>
                              <td>{detail.cargoName}</td>
                              <td>{detail.quantityMt ?? '-'}</td>
                              <td>{detail.noOfLoadersOrDischarge ?? '-'}</td>
                              <td>{detail.ballastPumpingRateM3PerHr ?? '-'}</td>
                              <td>{detail.dockWaterDensity ?? '-'}</td>
                              <td>{detail.maxDraughtAvailableHw ?? '-'}</td>
                              <td>{detail.loadDischargeRateM3PerHr ?? '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className='text-muted'>No details available</div>
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
    </div>
  )
}

export default ViewCargoModal

