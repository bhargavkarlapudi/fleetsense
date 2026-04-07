import { FC, useState, useEffect, useMemo, type CSSProperties } from 'react'
import {
  createCargoOperation,
  uploadCargoFinalAttachment,
  uploadCargoDetailAttachment,
} from '../core/_requests'
import { CargoOperationDetail, CargoBreakupType, Vessel, CargoFinalAttachment } from '../core/_models'
import { toast } from 'react-toastify'

interface AddCargoModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  companies: { id: number; name: string }[]
  subcompanies: { id: number; name: string; companyId: number }[]
  vessels: Vessel[]
  isCrew?: boolean
  userVesselId?: number | null
  showCompanyFilter?: boolean
  showSubcompanyFilter?: boolean
  effectiveCompanyId?: number | null
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
  isCrew = false,
  userVesselId = null,
  showCompanyFilter = true,
  showSubcompanyFilter = true,
  effectiveCompanyId = null,
}) => {
  const [loading, setLoading] = useState(false)
  const [companyId, setCompanyId] = useState<string>('')
  const [subcompanyId, setSubcompanyId] = useState<string>('')

  const [formData, setFormData] = useState({
    vesselId: null as number | null,
    remarks: '',
    cargoName: '',
    totalCargoQtyMt: '' as string | number,
    shipperAsPerBl: '',
    receiverAsPerBl: '',
    loadPorts: '',
    dischargePorts: '',
    heatingRequirements: '',
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
      currentDraughtMtrs: null,
      cargoGrade: '',
      attachmentUrl: null,
      orderIndex: 0,
    },
  ])

  const [rowFiles, setRowFiles] = useState<(File | null)[]>([null])

  type CargoFinalAttachmentWithFile = CargoFinalAttachment & { file: File | null }

  const FINAL_ATTACHMENT_DOC_NAMES: string[] = [
    'Final Cargo Plan',
    'Quality Certificates',
    'Bill of Lading',
    'Satement of Facts',
    'Letter of Protest',
    'Final Loading Condition(Loadicator)',
    'Agreed Loading Plan',
    'Agreed Discharge Plan',
    'MSDS Sheets of all grades',
    'Others',
  ]

  const [finalAttachments, setFinalAttachments] = useState<CargoFinalAttachmentWithFile[]>(
    FINAL_ATTACHMENT_DOC_NAMES.map((name) => ({
      documentName: name,
      remarks: '',
      attachmentUrl: null,
      file: null,
    }))
  )

  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    if (!isOpen) {
      setCompanyId('')
      setSubcompanyId('')
      return
    }
    if (isCrew && userVesselId != null) {
      setFormData((prev) => ({ ...prev, vesselId: userVesselId }))
    }
    if (!showCompanyFilter && effectiveCompanyId != null) {
      setCompanyId(String(effectiveCompanyId))
    }
  }, [isOpen, isCrew, userVesselId, showCompanyFilter, effectiveCompanyId])

  const effectiveCompanyForModal = showCompanyFilter ? companyId : (effectiveCompanyId != null ? String(effectiveCompanyId) : '')

  const vesselsForModal = useMemo(() => {
    if (isCrew && userVesselId != null) {
      return vessels.filter((v: any) => v.id === userVesselId)
    }
    let list = vessels
    if (effectiveCompanyForModal) {
      const cid = Number(effectiveCompanyForModal)
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
  }, [vessels, effectiveCompanyForModal, subcompanyId, isCrew, userVesselId])

  const derivedBreakupType: CargoBreakupType = useMemo(() => {
    if (!formData.vesselId) {
      return 'HOLD'
    }
    const selectedVessel = vesselsForModal.find((v) => v.id === formData.vesselId)
    const typeStr = selectedVessel?.vesselType ?? ''
    return typeStr.toLowerCase().includes('tanker') ? 'TANK' : 'HOLD'
  }, [formData.vesselId, vesselsForModal])

  const subcompaniesForCompany = useMemo(() => {
    if (!effectiveCompanyForModal) return []
    const cid = Number(effectiveCompanyForModal)
    return subcompanies.filter((sc) => sc.companyId === cid)
  }, [subcompanies, effectiveCompanyForModal])

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
          derivedBreakupType === 'TANK' ? 'tanks' : 'holds'
        } allowed`,
        { position: 'top-center' }
      )
      return
    }
    setDetails((prev) => [
      ...prev,
      {
        cargoName: '',
        cargoGrade: '',
        quantityMt: null,
        noOfLoadersOrDischarge: null,
        ballastPumpingRateM3PerHr: null,
        dockWaterDensity: null,
        maxDraughtAvailableHw: null,
        loadDischargeRateM3PerHr: null,
        currentDraughtMtrs: null,
        attachmentUrl: null,
        orderIndex: prev.length,
      },
    ])
    setRowFiles((prev) => [...prev, null])
  }

  const handleRemoveDetail = (index: number) => {
    if (details.length <= 1) {
      toast.error('At least one detail entry is required', { position: 'top-center' })
      return
    }
    setDetails((prev) =>
      prev.filter((_, i) => i !== index).map((d, i) => ({ ...d, orderIndex: i }))
    )
    setRowFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    if (!formData.vesselId) newErrors.vesselId = 'Vessel is required'

    if (details.length === 0) {
      newErrors.details = 'At least one detail entry is required'
    }

    details.forEach((detail, index) => {
      if (!detail.cargoName || !detail.cargoName.trim()) {
        newErrors[`detail_${index}_cargoName`] = 'Tank/Hold name is required'
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
      const created = await createCargoOperation({
        vesselId: formData.vesselId,
        breakupType: derivedBreakupType,
        remarks: formData.remarks || null,
        cargoName: formData.cargoName || null,
        totalCargoQtyMt:
          formData.totalCargoQtyMt !== '' && formData.totalCargoQtyMt !== null
            ? Number(formData.totalCargoQtyMt)
            : null,
        shipperAsPerBl: formData.shipperAsPerBl || null,
        receiverAsPerBl: formData.receiverAsPerBl || null,
        loadPorts: formData.loadPorts || null,
        dischargePorts: formData.dischargePorts || null,
        heatingRequirements: formData.heatingRequirements || null,
        details: details.map((d, i) => ({ ...d, orderIndex: i })),
      })
      if (created?.id) {
        const uploads: Promise<any>[] = []
        
        // Upload detail attachments
        rowFiles.forEach((file, index) => {
          if (file) {
            uploads.push(
              uploadCargoDetailAttachment(created.id as number, index, file).catch((e: any) => {
                console.error(`Error uploading detail attachment for row ${index}:`, e)
                toast.error(`Failed to upload attachment for row ${index + 1}`, {
                  position: 'top-center',
                })
                throw e
              })
            )
          }
        })
        
        // Upload final attachments
        finalAttachments.forEach((fa) => {
          if (fa.file) {
            uploads.push(
              uploadCargoFinalAttachment(
                created.id as number,
                fa.documentName,
                fa.remarks ?? null,
                fa.file
              )
            )
          }
        })
        
        if (uploads.length > 0) {
          await Promise.all(uploads)
        }
      }
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
      remarks: '',
      cargoName: '',
      totalCargoQtyMt: '',
      shipperAsPerBl: '',
      receiverAsPerBl: '',
      loadPorts: '',
      dischargePorts: '',
      heatingRequirements: '',
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
    setRowFiles([null])
    setFinalAttachments(
      FINAL_ATTACHMENT_DOC_NAMES.map((name) => ({
        documentName: name,
        remarks: '',
        attachmentUrl: null,
        file: null,
      }))
    )
    setErrors({})
    onClose()
  }

  const addButtonLabel =
    derivedBreakupType === 'TANK' ? 'Add Another Tank' : 'Add Another Hold'
  const canAddMore = details.length < MAX_DETAILS

  const cumulativeTotals = useMemo(() => {
    const totals: number[] = []
    let running = 0
    details.forEach((d, idx) => {
      const qty = d.quantityMt ?? 0
      running += qty
      totals[idx] = running
    })
    return totals
  }, [details])

  if (!isOpen) return null

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
            {/* Company — only for top-level */}
            {showCompanyFilter && (
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
            )}

            {/* Subcompany — hidden for Subcompany (role 2) */}
            {showSubcompanyFilter && subcompaniesForCompany.length > 0 && (
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

            {/* Vessel — hidden for crew (set in background); dropdown for others */}
            {!isCrew && (
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
            )}

            {/* Cargo Name */}
            <div className='col-md-4'>
              <label className='form-label fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>
                Cargo Name
              </label>
              <input
                type='text'
                className='form-control'
                name='cargoName'
                value={formData.cargoName}
                onChange={handleInputChange}
                placeholder='Enter cargo name'
              />
            </div>

            {/* Total Cargo QTY (MT) */}
            <div className='col-md-4'>
              <label className='form-label fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>
                Total Cargo QTY (MT)
              </label>
              <input
                type='number'
                step='0.001'
                className='form-control'
                name='totalCargoQtyMt'
                value={formData.totalCargoQtyMt}
                onChange={handleInputChange}
                placeholder='Enter total cargo quantity'
              />
            </div>

            {/* Shipper as per B/L */}
            <div className='col-md-4'>
              <label className='form-label fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>
                Shipper as per B/L
              </label>
              <input
                type='text'
                className='form-control'
                name='shipperAsPerBl'
                value={formData.shipperAsPerBl}
                onChange={handleInputChange}
                placeholder='Enter shipper as per B/L'
              />
            </div>

            {/* Receiver as per B/L */}
            <div className='col-md-4'>
              <label className='form-label fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>
                Receiver as per B/L
              </label>
              <input
                type='text'
                className='form-control'
                name='receiverAsPerBl'
                value={formData.receiverAsPerBl}
                onChange={handleInputChange}
                placeholder='Enter receiver as per B/L'
              />
            </div>

            {/* Load Ports */}
            <div className='col-md-4'>
              <label className='form-label fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>
                Load Ports
              </label>
              <textarea
                className='form-control'
                name='loadPorts'
                value={formData.loadPorts}
                onChange={handleInputChange}
                rows={2}
                placeholder='Enter load ports'
                style={{ color: '#000' }}
              />
            </div>

            {/* Discharge Ports */}
            <div className='col-md-4'>
              <label className='form-label fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>
                Discharge Ports
              </label>
              <textarea
                className='form-control'
                name='dischargePorts'
                value={formData.dischargePorts}
                onChange={handleInputChange}
                rows={2}
                placeholder='Enter discharge ports'
                style={{ color: '#000' }}
              />
            </div>

            {/* Heating Requirements */}
            <div className='col-md-4'>
              <label className='form-label fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>
                Heating Requirements
              </label>
              <textarea
                className='form-control'
                name='heatingRequirements'
                value={formData.heatingRequirements}
                onChange={handleInputChange}
                rows={2}
                placeholder='Enter heating requirements'
                style={{ color: '#000' }}
              />
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
                        derivedBreakupType === 'TANK' ? 'tanks' : 'holds'
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
                {derivedBreakupType === 'TANK' ? 'tanks' : 'holds'} reached.
              </div>
            )}

            <div className='table-responsive'>
              <table className='table table-bordered'>
                <thead>
                  <tr>
                    <th className='text-nowrap' style={{ width: '60px' }}>
                      Sr No
                    </th>
                    <th className='text-nowrap' style={{ width: '16%' }}>
                      Cargo Grade
                    </th>
                    <th className='text-nowrap' style={{ width: '16%' }}>
                      {derivedBreakupType === 'TANK' ? 'Tank Name' : 'Hold Name'}
                    </th>
                    <th className='text-nowrap'>Quantity (MT)</th>
                    <th className='text-nowrap'>No. of Loaders/Discharge</th>
                    <th className='text-nowrap'>Load/Discharge Rate (m³/hr)</th>
                    <th className='text-nowrap'>Ballast/Deballast Rate (m³/hr)</th>
                    <th className='text-nowrap'>Dock Water Density</th>
                    <th className='text-nowrap'>Max Draught Available (MTRS)</th>
                    <th className='text-nowrap'>Current Draught (MTRS)</th>
                    <th className='text-nowrap' style={{ minWidth: '220px' }}>
                      Attachment
                    </th>
                    <th className='text-nowrap'>Total Cargo onboard</th>
                    <th className='text-nowrap' style={{ width: '80px' }}>
                      Actions
                    </th>
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
                            errors[`detail_${index}_cargoGrade`] ? 'is-invalid' : ''
                          }`}
                          value={detail.cargoGrade ?? ''}
                          onChange={(e) =>
                            handleDetailChange(index, 'cargoGrade', e.target.value)
                          }
                          placeholder='Enter cargo grade'
                        />
                        {errors[`detail_${index}_cargoGrade`] && (
                          <div className='invalid-feedback'>
                            {errors[`detail_${index}_cargoGrade`]}
                          </div>
                        )}
                      </td>
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
                            derivedBreakupType === 'TANK' ? 'tank' : 'hold'
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
                          value={detail.currentDraughtMtrs || ''}
                          onChange={(e) =>
                            handleDetailChange(
                              index,
                              'currentDraughtMtrs',
                              e.target.value ? parseFloat(e.target.value) : null
                            )
                          }
                        />
                      </td>
                      <td style={{ minWidth: '220px' }}>
                        <input
                          type='file'
                          className='form-control form-control-sm'
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null
                            setRowFiles((prev) => {
                              const next = [...prev]
                              next[index] = file
                              return next
                            })
                          }}
                        />
                        {rowFiles[index]?.name && (
                          <div className='mt-1 small text-muted'>{rowFiles[index]?.name}</div>
                        )}
                      </td>
                      <td className='text-end align-middle'>
                        {Number.isFinite(cumulativeTotals[index])
                          ? cumulativeTotals[index].toFixed(3)
                          : ''}
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

          {/* Final Attachments */}
          <div className='mb-3'>
            <h6 className='fw-bold mb-3'>Final Attachments</h6>
            <div className='table-responsive'>
              <table className='table table-bordered'>
                <thead>
                  <tr>
                    <th className='text-nowrap' style={{ width: '60px' }}>
                      Sr No
                    </th>
                    <th className='text-nowrap'>Document Name</th>
                    <th className='text-nowrap' style={{ minWidth: '220px' }}>
                      Attachment
                    </th>
                    <th className='text-nowrap'>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {finalAttachments.map((row, index) => (
                    <tr key={row.documentName}>
                      <td className='text-center align-middle'>{index + 1}</td>
                      <td className='align-middle'>{row.documentName}</td>
                      <td style={{ minWidth: '220px' }}>
                        <input
                          type='file'
                          className='form-control form-control-sm'
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null
                            setFinalAttachments((prev) =>
                              prev.map((r, i) =>
                                i === index ? { ...r, file } : r
                              )
                            )
                          }}
                        />
                        {row.file?.name && (
                          <div className='mt-1 small text-muted'>{row.file.name}</div>
                        )}
                      </td>
                      <td>
                        <input
                          type='text'
                          className='form-control form-control-sm'
                          value={row.remarks ?? ''}
                          onChange={(e) =>
                            setFinalAttachments((prev) =>
                              prev.map((r, i) =>
                                i === index ? { ...r, remarks: e.target.value } : r
                              )
                            )
                          }
                          placeholder='Enter remarks'
                        />
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