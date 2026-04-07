import { FC, useState, useEffect, useMemo, type CSSProperties } from 'react'
import {
  updateCargoOperation,
  getVesselList,
  getCargoOperationById,
  uploadCargoFinalAttachment,
  uploadCargoDetailAttachment,
  deleteCargoFinalAttachment,
  updateCargoFinalAttachmentRemarks,
  cargoDetailAttachmentViewUrl,
  cargoDetailAttachmentDownloadUrl,
  cargoFinalAttachmentViewUrl,
  cargoFinalAttachmentDownloadUrl,
} from '../core/_requests'
import { CargoOperation, CargoOperationDetail, CargoBreakupType, Vessel, CargoFinalAttachment } from '../core/_models'
import { toast } from 'react-toastify'
import { FileViewerModal } from '../../QHSE/components/FileViewerModal'

interface EditCargoModalProps {
  isOpen: boolean
  onClose: () => void
  cargo: CargoOperation
  onSuccess: () => void
  isCrew?: boolean
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

type EditableFinalAttachment = CargoFinalAttachment & {
  file?: File | null
  markedForDelete?: boolean
  tempRemarks?: string
}

const EditCargoModal: FC<EditCargoModalProps> = ({ isOpen, onClose, cargo, onSuccess, isCrew = false }) => {
  const [vessels, setVessels] = useState<Vessel[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)

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

  const [details, setDetails] = useState<CargoOperationDetail[]>([])
  const [rowFiles, setRowFiles] = useState<(File | null)[]>([])
  const [finalAttachments, setFinalAttachments] = useState<EditableFinalAttachment[]>([])
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  const [isViewerOpen, setIsViewerOpen] = useState(false)
  const [viewerUrl, setViewerUrl] = useState<string | null>(null)
  const [viewerDownloadUrl, setViewerDownloadUrl] = useState<string | null>(null)
  const [viewerTitle, setViewerTitle] = useState<string | undefined>(undefined)
  const [viewerFileName, setViewerFileName] = useState<string | undefined>(undefined)

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
        remarks: data.remarks || '',
        cargoName: data.cargoName || '',
        totalCargoQtyMt:
          data.totalCargoQtyMt !== undefined && data.totalCargoQtyMt !== null
            ? data.totalCargoQtyMt
            : '',
        shipperAsPerBl: data.shipperAsPerBl || '',
        receiverAsPerBl: data.receiverAsPerBl || '',
        loadPorts: data.loadPorts || '',
        dischargePorts: data.dischargePorts || '',
        heatingRequirements: data.heatingRequirements || '',
      })
      setDetails(data.details || [])
      setRowFiles(new Array(data.details?.length || 0).fill(null))
      setFinalAttachments(
        (data.finalAttachments || []).map((att) => ({
          ...att,
          file: null,
          markedForDelete: false,
          tempRemarks: att.remarks ?? '',
        }))
      )
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
        quantityMt: null,
        noOfLoadersOrDischarge: null,
        ballastPumpingRateM3PerHr: null,
        dockWaterDensity: null,
        maxDraughtAvailableHw: null,
        loadDischargeRateM3PerHr: null,
        currentDraughtMtrs: null,
        cargoGrade: '',
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
        newErrors[`detail_${index}_cargoName`] = 'Cargo name is required'
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const derivedBreakupType: CargoBreakupType = useMemo(() => {
    if (!formData.vesselId) {
      return 'HOLD'
    }
    const selectedVessel = vessels.find((v) => v.id === formData.vesselId)
    const typeStr = selectedVessel?.vesselType ?? ''
    return typeStr.toLowerCase().includes('tanker') ? 'TANK' : 'HOLD'
  }, [formData.vesselId, vessels])

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

      const cargoOperationId = cargo.id

      // Upload detail attachments (replacements)
      const detailUploads: Promise<any>[] = []
      rowFiles.forEach((file, index) => {
        if (file) {
          detailUploads.push(
            uploadCargoDetailAttachment(cargoOperationId, index, file).catch((e: any) => {
              console.error(`Error uploading detail attachment for row ${index}:`, e)
              toast.error(`Failed to upload attachment for row ${index + 1}`, {
                position: 'top-center',
              })
              throw e
            })
          )
        }
      })
      if (detailUploads.length > 0) {
        await Promise.all(detailUploads)
      }

      // Sync final attachments (delete, upload, remarks-only)
      // 1) Deletions
      for (const att of finalAttachments) {
        if (att.markedForDelete && att.id) {
          try {
            await deleteCargoFinalAttachment(cargoOperationId, att.id)
          } catch (e: any) {
            console.error('Error deleting final attachment', e)
            toast.error(
              (e as any)?.message || 'Failed to delete final attachment',
              { position: 'top-center' }
            )
          }
        }
      }

      // 2) Uploads / replacements (upsert by documentName)
      for (const att of finalAttachments) {
        if (att.file) {
          try {
            await uploadCargoFinalAttachment(
              cargoOperationId,
              att.documentName,
              att.tempRemarks ?? att.remarks ?? null,
              att.file
            )
          } catch (e: any) {
            console.error('Error uploading final attachment', e)
            toast.error(
              (e as any)?.message || 'Failed to upload final attachment',
              { position: 'top-center' }
            )
          }
        }
      }

      // 3) Remarks-only updates (no new file, not deleted, remarks changed)
      for (const att of finalAttachments) {
        if (
          !att.file &&
          !att.markedForDelete &&
          att.id &&
          att.tempRemarks !== undefined &&
          att.tempRemarks !== att.remarks
        ) {
          try {
            await updateCargoFinalAttachmentRemarks(
              cargoOperationId,
              att.id,
              att.tempRemarks || ''
            )
          } catch (e: any) {
            console.error('Error updating final attachment remarks', e)
            toast.error(
              (e as any)?.message || 'Failed to update attachment remarks',
              { position: 'top-center' }
            )
          }
        }
      }

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

  const addButtonLabel =
    derivedBreakupType === 'TANK' ? 'Add Another Tank' : 'Add Another Hold'
  const canAddMore = details.length < MAX_DETAILS
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
            {/* Vessel — hidden for crew (logic in background) */}
            {!isCrew && (
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
                      Sr/No
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
                    <th className='text-nowrap' style={{ minWidth: '150px' }}>Existing Attachment</th>
                    <th className='text-nowrap' style={{ minWidth: '200px' }}>New Attachment</th>
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
                      <td className='align-middle'>
                        {detail.attachmentUrl && cargo.id && detail.orderIndex !== undefined ? (
                          <button
                            type='button'
                            className='btn btn-sm btn-light-primary'
                            onClick={() => {
                              setViewerUrl(cargoDetailAttachmentViewUrl(cargo.id!, detail.orderIndex!))
                              setViewerDownloadUrl(cargoDetailAttachmentDownloadUrl(cargo.id!, detail.orderIndex!))
                              setViewerTitle('Cargo Detail Attachment')
                              setViewerFileName(detail.cargoName || 'attachment')
                              setIsViewerOpen(true)
                            }}
                          >
                            View
                          </button>
                        ) : (
                          <span className='text-muted'>-</span>
                        )}
                      </td>
                      <td className='align-middle'>
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
                          <div className='small text-muted mt-1'>{rowFiles[index]?.name}</div>
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

          {/* Final Attachments (editable) */}
          <div className='mb-3'>
            <h6 className='fw-bold mb-3'>Final Attachments</h6>
            {finalAttachments && finalAttachments.length > 0 ? (
              <div className='table-responsive'>
                <table className='table table-bordered'>
                  <thead>
                    <tr>
                      <th className='text-nowrap' style={{ width: '60px' }}>
                        Sr No
                      </th>
                      <th className='text-nowrap'>Document Name</th>
                      <th className='text-nowrap' style={{ minWidth: '150px' }}>
                        Existing Attachment
                      </th>
                      <th className='text-nowrap' style={{ minWidth: '200px' }}>
                        New Attachment
                      </th>
                      <th className='text-nowrap'>Remarks</th>
                      <th className='text-nowrap' style={{ width: '120px' }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {finalAttachments.map((att, index) => (
                      <tr key={att.id ?? index}>
                        <td className='text-center align-middle'>{index + 1}</td>
                        <td className='align-middle'>{att.documentName}</td>
                        <td className='align-middle'>
                          {att.attachmentUrl && att.id && cargo.id ? (
                            <button
                              type='button'
                              className='btn btn-sm btn-light-primary'
                              onClick={() => {
                                setViewerUrl(cargoFinalAttachmentViewUrl(cargo.id!, att.id!))
                                setViewerDownloadUrl(cargoFinalAttachmentDownloadUrl(cargo.id!, att.id!))
                                setViewerTitle(`Final Attachment – ${att.documentName}`)
                                setViewerFileName(att.documentName || 'attachment')
                                setIsViewerOpen(true)
                              }}
                            >
                              View
                            </button>
                          ) : (
                            <span className='text-muted'>-</span>
                          )}
                        </td>
                        <td className='align-middle'>
                          <input
                            type='file'
                            className='form-control form-control-sm'
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null
                              setFinalAttachments((prev) =>
                                prev.map((row, i) =>
                                  i === index
                                    ? {
                                        ...row,
                                        file,
                                        markedForDelete: file ? false : row.markedForDelete,
                                      }
                                    : row
                                )
                              )
                            }}
                          />
                        </td>
                        <td className='align-middle' style={{ minWidth: 200 }}>
                          <input
                            type='text'
                            className='form-control form-control-sm'
                            value={att.tempRemarks ?? ''}
                            onChange={(e) => {
                              const value = e.target.value
                              setFinalAttachments((prev) =>
                                prev.map((row, i) =>
                                  i === index ? { ...row, tempRemarks: value } : row
                                )
                              )
                            }}
                            placeholder='Enter remarks'
                          />
                        </td>
                        <td className='align-middle text-center'>
                          <button
                            type='button'
                            className={`btn btn-sm ${
                              att.markedForDelete ? 'btn-light-danger' : 'btn-light'
                            }`}
                            onClick={() => {
                              setFinalAttachments((prev) =>
                                prev.map((row, i) =>
                                  i === index
                                    ? { ...row, markedForDelete: !row.markedForDelete }
                                    : row
                                )
                              )
                            }}
                          >
                            {att.markedForDelete ? 'Undo Remove' : 'Remove'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className='text-muted'>No final attachments available</div>
            )}
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

export default EditCargoModal