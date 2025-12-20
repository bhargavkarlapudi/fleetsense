import { FC, useState, useEffect, useMemo, type CSSProperties } from 'react'
import { createCargoOperation } from '../core/_requests'
import { CargoOperationDetail, CargoBreakupType, Vessel } from '../core/_models'
import { toast } from 'react-toastify'

interface AddCargoModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  companies: { id: number; name: string }[]
  subcompanies: { id: number; name: string; companyId: number }[]
  vessels: Vessel[]
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

const AddCargoModal: FC<AddCargoModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  companies,
  subcompanies,
  vessels,
}) => {
  const [loading, setLoading] = useState(false)
  const [companyId, setCompanyId] = useState<string>('')
  const [subcompanyId, setSubcompanyId] = useState<string>('')

  const [formData, setFormData] = useState({
    vesselId: null as number | null,
    breakupType: 'TANK' as CargoBreakupType,
    remarks: '',
  })

  const [details, setDetails] = useState<CargoOperationDetail[]>([
    {
      cargoName: '',
      quantityMt: null,
      noOfLoadersOrDischarge: null,
      ballastPumpingRateM3PerHr: null,
      dockWaterDensity: null,
      maxDraughtAvailableHw: null,
      loadDischargeRateM3PerHr: null,
      orderIndex: 0,
    },
  ])

  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    if (!isOpen) {
      setCompanyId('')
      setSubcompanyId('')
    }
  }, [isOpen])

  const vesselsForModal = useMemo(() => {
    let list = vessels
    if (companyId) {
      const cid = Number(companyId)
      list = list.filter((v: any) =>
        Number(v.companyGroupAdmin?.id ?? v.companyGroupId) === cid
      )
    }
    if (subcompanyId) {
      const scid = Number(subcompanyId)
      list = list.filter((v: any) =>
        Number(v.companyAdmin?.id ?? v.companyId) === scid
      )
    }
    return list
  }, [vessels, companyId, subcompanyId])

  const subcompaniesForCompany = useMemo(() => {
    if (!companyId) return []
    const cid = Number(companyId)
    return subcompanies.filter((sc) => sc.companyId === cid)
  }, [subcompanies, companyId])

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
    if (!validateForm()) {
      toast.error('Please fix validation errors', { position: 'top-center' })
      return
    }

    setLoading(true)
    try {
      await createCargoOperation({
        vesselId: formData.vesselId,
        breakupType: formData.breakupType,
        remarks: formData.remarks || null,
        details: details.map((d, i) => ({ ...d, orderIndex: i })),
      })
      onSuccess()
      handleClose()
    } catch (error: any) {
      toast.error(error.message || 'Error creating cargo operation', {
        position: 'top-center',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({
      vesselId: null,
      breakupType: 'TANK',
      remarks: '',
    })
    setDetails([
      {
        cargoName: '',
        quantityMt: null,
        noOfLoadersOrDischarge: null,
        ballastPumpingRateM3PerHr: null,
        dockWaterDensity: null,
        maxDraughtAvailableHw: null,
        loadDischargeRateM3PerHr: null,
        orderIndex: 0,
      },
    ])
    setErrors({})
    onClose()
  }

  if (!isOpen) return null

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
          <h5 className='modal-title text-dark mx-6 mt-6'>Add Cargo</h5>
          <button type='button' className='btn-close mx-6 mt-6' onClick={handleClose} />
        </div>

        {/* Body */}
        <div className='flex-grow-1 overflow-auto px-4 py-3 mx-6'>
          <div className='row g-3 mb-4'>
            {/* Company */}
            <div className='col-md-4'>
              <label className='form-label fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>
                Company
              </label>
              <select
                className='form-select'
                value={companyId}
                onChange={(e) => {
                  setCompanyId(e.target.value)
                  setSubcompanyId('')
                  setFormData((prev) => ({ ...prev, vesselId: null }))
                  if (errors.vesselId) {
                    setErrors((prev) => ({ ...prev, vesselId: '' }))
                  }
                }}
              >
                <option value=''>All Companies</option>
                {companies.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Subcompany */}
            {subcompaniesForCompany.length > 0 && (
              <div className='col-md-4'>
                <label className='form-label fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>
                  Subcompany
                </label>
                <select
                  className='form-select'
                  value={subcompanyId}
                  onChange={(e) => {
                    setSubcompanyId(e.target.value)
                    setFormData((prev) => ({ ...prev, vesselId: null }))
                    if (errors.vesselId) {
                      setErrors((prev) => ({ ...prev, vesselId: '' }))
                    }
                  }}
                >
                  <option value=''>All Subcompanies</option>
                  {subcompaniesForCompany.map((sc) => (
                    <option key={sc.id} value={String(sc.id)}>
                      {sc.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Vessel */}
            <div className='col-md-4'>
              <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>
                Vessel
              </label>
              <select
                className={`form-select ${errors.vesselId ? 'is-invalid' : ''}`}
                name='vesselId'
                value={formData.vesselId || ''}
                onChange={handleInputChange}
              >
                <option value=''>Select Vessel</option>
                {vesselsForModal.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.fleet_name}
                  </option>
                ))}
              </select>
              {errors.vesselId && <div className='invalid-feedback'>{errors.vesselId}</div>}
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
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AddCargoModal