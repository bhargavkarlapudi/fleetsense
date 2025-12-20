import { FC, useState, useEffect, type CSSProperties } from 'react'
import { updateCargoOperation, getVesselList, getCargoOperationById } from '../core/_requests'
import { CargoOperation, CargoOperationDetail, CargoBreakupType, Vessel } from '../core/_models'
import { toast } from 'react-toastify'

interface EditCargoModalProps {
  isOpen: boolean
  onClose: () => void
  cargo: CargoOperation
  onSuccess: () => void
}

const MAX_DETAILS = 20

const WRAP_STYLE: CSSProperties = {
  background: 'rgba(0,0,0,0.5)',
  position: 'fixed',
  inset: 0,
  zIndex: 1050,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const EditCargoModal: FC<EditCargoModalProps> = ({ isOpen, onClose, cargo, onSuccess }) => {
  const [vessels, setVessels] = useState<Vessel[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)

  const [formData, setFormData] = useState({
    vesselId: null as number | null,
    breakupType: 'TANK' as CargoBreakupType,
    remarks: '',
  })

  const [details, setDetails] = useState<CargoOperationDetail[]>([])
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    if (isOpen && cargo.id) {
      loadData()
      loadVessels()
    }
  }, [isOpen, cargo.id])

  const loadData = async () => {
    if (!cargo.id) return
    setLoadingData(true)
    try {
      const data = await getCargoOperationById(cargo.id)
      setFormData({
        vesselId: data.vesselId || null,
        breakupType: data.breakupType,
        remarks: data.remarks || '',
      })
      setDetails(data.details || [])
    } catch (error: any) {
      toast.error(error.message || 'Error loading cargo operation', {
        position: 'top-center',
      })
    } finally {
      setLoadingData(false)
    }
  }

  const loadVessels = async () => {
    try {
      const data = await getVesselList()
      setVessels(data)
    } catch (error) {
      console.error('Error loading vessels:', error)
    }
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'vesselId' ? (value ? Number(value) : null) : value,
    }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  const handleDetailChange = (
    index: number,
    field: keyof CargoOperationDetail,
    value: any
  ) => {
    setDetails((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
    const errorKey = `detail_${index}_${field}`
    if (errors[errorKey]) {
      setErrors((prev) => ({ ...prev, [errorKey]: '' }))
    }
  }

  const handleAddDetail = () => {
    if (details.length >= MAX_DETAILS) {
      toast.info(
        `Maximum ${MAX_DETAILS} ${
          formData.breakupType === 'TANK' ? 'tanks' : 'holds'
        } allowed`,
        { position: 'top-center' }
      )
      return
    }
    setDetails((prev) => [
      ...prev,
      {
        cargoName: '',
        quantityMt: null,
        noOfLoadersOrDischarge: null,
        ballastPumpingRateM3PerHr: null,
        dockWaterDensity: null,
        maxDraughtAvailableHw: null,
        loadDischargeRateM3PerHr: null,
        orderIndex: prev.length,
      },
    ])
  }

  const handleRemoveDetail = (index: number) => {
    if (details.length <= 1) {
      toast.error('At least one detail entry is required', { position: 'top-center' })
      return
    }
    setDetails((prev) =>
      prev.filter((_, i) => i !== index).map((d, i) => ({ ...d, orderIndex: i }))
    )
  }

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    if (!formData.vesselId) newErrors.vesselId = 'Vessel is required'
    if (!formData.breakupType) newErrors.breakupType = 'Breakup type is required'

    if (details.length === 0) {
      newErrors.details = 'At least one detail entry is required'
    }

    details.forEach((detail, index) => {
      if (!detail.cargoName || !detail.cargoName.trim()) {
        newErrors[`detail_${index}_cargoName`] = 'Cargo name is required'
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!cargo.id) return
    if (!validateForm()) {
      toast.error('Please fix validation errors', { position: 'top-center' })
      return
    }

    setLoading(true)
    try {
      await updateCargoOperation(cargo.id, {
        vesselId: formData.vesselId,
        breakupType: formData.breakupType,
        remarks: formData.remarks || null,
        details: details.map((d, i) => ({ ...d, orderIndex: i })),
      })
      onSuccess()
      handleClose()
    } catch (error: any) {
      toast.error(error.message || 'Error updating cargo operation', {
        position: 'top-center',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setErrors({})
    onClose()
  }

  if (!isOpen) return null

  if (loadingData) {
    return (
      <div style={WRAP_STYLE}>
        <div
          className='bg-white text-dark rounded shadow-lg d-flex flex-column align-items-center justify-content-center'
          style={{
            width: '400px',
            height: '200px',
          }}
        >
          <div className='text-center py-4'>
            <div className='spinner-border' role='status'>
              <span className='visually-hidden'>Loading...</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const addButtonLabel =
    formData.breakupType === 'TANK' ? 'Add Another Tank' : 'Add Another Hold'
  const canAddMore = details.length < MAX_DETAILS

  return (
    <div style={WRAP_STYLE} tabIndex={-1}>
      <div
        className='bg-white text-dark rounded shadow-lg d-flex flex-column'
        style={{
          width: '75vw',
          height: '75vh',
          maxWidth: '1400px',
          maxHeight: '900px',
        }}
      >
        {/* Header */}
        <div className='d-flex align-items-center justify-content-between border-bottom px-4 py-3 flex-shrink-0'>
          <h5 className='modal-title text-dark mx-6 mt-6'>Edit Cargo</h5>
          <button type='button' className='btn-close mx-6 mt-6' onClick={handleClose} />
        </div>

        {/* Body */}
        <div className='flex-grow-1 overflow-auto px-4 py-3 mx-6'>
          <div className='row g-3 mb-4'>
            {/* Vessel (read only, not editable) */}
            <div className='col-md-4'>
              <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>
                Vessel
              </label>
              <div className='form-control-plaintext fw-semibold' style={{ minHeight: '38px', color: '#181C32' }}>
                {(() => {
                  const vessel = vessels.find((v) => v.id === formData.vesselId)
                  return vessel ? vessel.fleet_name : 'Unknown Vessel'
                })()}
              </div>
            </div>

            {/* Breakup Type */}
            <div className='col-md-4'>
              <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>
                Breakup Type
              </label>
              <select
                className={`form-select ${errors.breakupType ? 'is-invalid' : ''}`}
                name='breakupType'
                value={formData.breakupType}
                onChange={handleInputChange}
              >
                <option value='TANK'>Tank</option>
                <option value='HOLD'>Hold</option>
              </select>
              {errors.breakupType && (
                <div className='invalid-feedback'>{errors.breakupType}</div>
              )}
            </div>

            {/* Remarks */}
            <div className='col-md-12'>
              <label className='form-label fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>
                Remarks
              </label>
              <textarea
                className='form-control'
                name='remarks'
                value={formData.remarks}
                onChange={handleInputChange}
                rows={3}
                placeholder='Enter remarks...'
                style={{ color: '#000' }}
              />
            </div>
          </div>

          {/* Details table */}
          <div className='mb-3'>
            <div className='d-flex justify-content-between align-items-center mb-3'>
              <h6 className='fw-bold'>
                Cargo Details ({details.length}/{MAX_DETAILS})
              </h6>
              <button
                type='button'
                className='btn btn-sm btn_primary'
                onClick={handleAddDetail}
                disabled={!canAddMore}
                title={
                  !canAddMore
                    ? `Maximum ${MAX_DETAILS} ${
                        formData.breakupType === 'TANK' ? 'tanks' : 'holds'
                      } allowed`
                    : ''
                }
              >
                {addButtonLabel}
              </button>
            </div>
            {!canAddMore && (
              <div className='alert alert-info'>
                Maximum {MAX_DETAILS}{' '}
                {formData.breakupType === 'TANK' ? 'tanks' : 'holds'} reached.
              </div>
            )}

            <div className='table-responsive'>
              <table className='table table-bordered'>
                <thead>
                  <tr>
                    <th style={{ width: '60px' }}>Sr/No</th>
                    <th style={{ width: '20%' }}>
                      Cargo Name ({formData.breakupType})
                    </th>
                    <th>Quantity (MT)</th>
                    <th>No. of Loaders/Discharge</th>
                    <th>Ballast Pumping Rate (m³/hr)</th>
                    <th>Dock Water Density</th>
                    <th>Max Draught Available (HW)</th>
                    <th>Load/Discharge Rate (m³/hr)</th>
                    <th style={{ width: '80px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {details.map((detail, index) => (
                    <tr key={index}>
                      <td className='text-center align-middle'>{index + 1}</td>
                      <td>
                        <input
                          type='text'
                          className={`form-control form-control-sm ${
                            errors[`detail_${index}_cargoName`] ? 'is-invalid' : ''
                          }`}
                          value={detail.cargoName}
                          onChange={(e) =>
                            handleDetailChange(index, 'cargoName', e.target.value)
                          }
                          placeholder={`Enter ${
                            formData.breakupType === 'TANK' ? 'tank' : 'hold'
                          } name`}
                        />
                        {errors[`detail_${index}_cargoName`] && (
                          <div className='invalid-feedback'>
                            {errors[`detail_${index}_cargoName`]}
                          </div>
                        )}
                      </td>
                      <td>
                        <input
                          type='number'
                          step='0.001'
                          className='form-control form-control-sm'
                          value={detail.quantityMt || ''}
                          onChange={(e) =>
                            handleDetailChange(
                              index,
                              'quantityMt',
                              e.target.value ? parseFloat(e.target.value) : null
                            )
                          }
                        />
                      </td>
                      <td>
                        <input
                          type='number'
                          step='0.01'
                          className='form-control form-control-sm'
                          value={detail.noOfLoadersOrDischarge || ''}
                          onChange={(e) =>
                            handleDetailChange(
                              index,
                              'noOfLoadersOrDischarge',
                              e.target.value ? parseFloat(e.target.value) : null
                            )
                          }
                        />
                      </td>
                      <td>
                        <input
                          type='number'
                          step='0.001'
                          className='form-control form-control-sm'
                          value={detail.ballastPumpingRateM3PerHr || ''}
                          onChange={(e) =>
                            handleDetailChange(
                              index,
                              'ballastPumpingRateM3PerHr',
                              e.target.value ? parseFloat(e.target.value) : null
                            )
                          }
                        />
                      </td>
                      <td>
                        <input
                          type='number'
                          step='0.001'
                          className='form-control form-control-sm'
                          value={detail.dockWaterDensity || ''}
                          onChange={(e) =>
                            handleDetailChange(
                              index,
                              'dockWaterDensity',
                              e.target.value ? parseFloat(e.target.value) : null
                            )
                          }
                        />
                      </td>
                      <td>
                        <input
                          type='number'
                          step='0.001'
                          className='form-control form-control-sm'
                          value={detail.maxDraughtAvailableHw || ''}
                          onChange={(e) =>
                            handleDetailChange(
                              index,
                              'maxDraughtAvailableHw',
                              e.target.value ? parseFloat(e.target.value) : null
                            )
                          }
                        />
                      </td>
                      <td>
                        <input
                          type='number'
                          step='0.001'
                          className='form-control form-control-sm'
                          value={detail.loadDischargeRateM3PerHr || ''}
                          onChange={(e) =>
                            handleDetailChange(
                              index,
                              'loadDischargeRateM3PerHr',
                              e.target.value ? parseFloat(e.target.value) : null
                            )
                          }
                        />
                      </td>
                      <td className='text-center align-middle'>
                        {details.length > 1 && (
                          <button
                            type='button'
                            className='btn btn-sm btn-icon btn-light'
                            onClick={() => handleRemoveDetail(index)}
                            title='Remove'
                          >
                            <i className='bi bi-trash' />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className='border-top d-flex justify-content-end gap-2 px-4 py-3 flex-shrink-0 mx-6 mb-6'>
          <button
            type='button'
            className='btn btn-light btn-sm'
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type='button'
            className='btn btn_primary btn-sm'
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Updating...' : 'Update'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default EditCargoModal