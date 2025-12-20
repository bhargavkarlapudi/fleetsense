import React, {FC, useEffect, useMemo, useState} from 'react'
import {FileViewerModal} from '../components/FileViewerModal'
import {
  defectClosureViewUrl,
  defectClosureDownloadUrl,
  listDefectAttachments,
  defectAttachmentFileViewUrl,
  defectAttachmentFileDownloadUrl,
  deleteDefectAttachment,
} from '../core/_requests'
import {KTSVG} from '../../../../_metronic/helpers'
import {toast} from 'react-toastify'

import type {
  QHSEDefectDto,
  DefectCategory,
  TpiSubCategory,
  SmsCode,
  DefectDepartment,
} from '../core/_models'
import type {DefectSubmitShape} from './AddDefectModal'

type VesselLiteLocal = {
  id: number
  name: string
  fleet_name?: string
  companyGroupAdminId?: number
  companyAdminId?: number
}

type CompanyGroup = {id: number; name: string}
type Subcompany = {id: number; name: string; companyId: number}

interface Props {
  visible: boolean
  onClose: () => void
  record: QHSEDefectDto | null
  onSubmit: (data: DefectSubmitShape) => void
  vessels: VesselLiteLocal[]
  companies: CompanyGroup[]
  subcompanies: Subcompany[]
  showCompanyFilters?: boolean

  // NEW
  isCrew?: boolean               // role 4
  disableVesselChange?: boolean  // for non-crew: show vessel but disable editing

  onOpenAttachments?: (record: QHSEDefectDto) => void
}

const LABEL = 'form-label fw-semibold fs-6 mb-2 text-dark'
const WRAP_STYLE: React.CSSProperties = {
  background: 'rgba(0,0,0,0.5)',
  position: 'fixed',
  inset: 0,
  zIndex: 1050,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const DAC_CODES = [
  {code: 10, name: 'Deficiency rectified'},
  {code: 15, name: 'Rectify deficiency at next port'},
  {code: 16, name: 'Rectify deficiency within 14 days'},
  {code: 17, name: 'Rectify deficiency before departure'},
  {code: 18, name: 'Rectify deficiency within 3 months'},
  {code: 30, name: 'Detainable deficiency'},
  {code: 40, name: 'Next port informed'},
  {code: 45, name: 'Rectify detainable deficiency at next port'},
  {code: 50, name: 'Flag state / consul informed'},
  {code: 55, name: 'Flag state consulted'},
  {code: 70, name: 'Recognized organization informed'},
  {code: 85, name: 'Investigation of contravention of discharge provision (MARPOL)'},
  {code: 99, name: 'Other (Specify)'},
]

type ExistingAttachmentLocal = {
  fileName: string
  viewUrl: string
  downloadUrl: string
}

export const EditDefectModal: FC<Props> = ({
  visible,
  onClose,
  record,
  onSubmit,
  vessels,
  companies,
  subcompanies,
  showCompanyFilters = true,
  isCrew = false,
  disableVesselChange = false,
  onOpenAttachments,
}) => {
  const [companyId, setCompanyId] = useState<string>('')
  const [subcompanyId, setSubcompanyId] = useState<string>('')

  const [fileView, setFileView] = useState<{
    visible: boolean
    title: string
    file?: File | null
    viewUrl?: string
    downloadUrl?: string
  }>({
    visible: false,
    title: '',
    file: null,
    viewUrl: undefined,
    downloadUrl: undefined,
  })

   const [form, setForm] = useState<DefectSubmitShape>({
  vesselId: '',
  category: '' as any,
  tpiSubCategory: '' as any,
  dacCode: '',
  dacActionName: '',
  smsCode: '' as any,
  description: '',
  dateObserved: '',
  dateDefect: '',
  applicableRequisitionNumber: '',
  department: '' as any,
  correctiveAction: '',
  preventiveAction: '',
  remarks: '',
  attachmentFiles: null,
  linkType: '' as any, // '' | 'INSPECTION' | 'AUDIT'
  linkId: '',
  // closureFile: null,
})

  const [existingAttachments, setExistingAttachments] = useState<ExistingAttachmentLocal[]>([])
  const [existingLoading, setExistingLoading] = useState<boolean>(false)

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!record) return
           setForm({
      vesselId: String(record.vesselId),
      category: record.category as DefectCategory,
      tpiSubCategory: (record.tpiSubCategory as TpiSubCategory) || '' as any,
      dacCode: String(record.dacCode),
      dacActionName: record.dacActionName || '',
      smsCode: (record.smsCode as SmsCode) || '' as any,
      description: record.description || '',
      dateObserved: record.dateObserved || '',
      dateDefect: record.dateDefect || '',
      applicableRequisitionNumber: record.applicableRequisitionNumber || '',
      department: (record.department as any) || '' as any,
      correctiveAction: record.correctiveAction || '',
      preventiveAction: record.preventiveAction || '',
      remarks: record.remarks || '',
  attachmentFiles: null,
      // closureFile: null,
      linkType: record.inspectionId
      ? ('INSPECTION' as any)
      : record.auditId
      ? ('AUDIT' as any)
      : ('' as any),
    linkId: record.inspectionId
      ? String(record.inspectionId)
      : record.auditId
      ? String(record.auditId)
      : '',
    })

    // prefill company/subcompany from vessel if possible
    const v = vessels.find(v => Number(v.id) === Number(record.vesselId))
    if (v) {
      setCompanyId(
        v.companyGroupAdminId != null
          ? String(v.companyGroupAdminId)
          : ''
      )
      setSubcompanyId(
        v.companyAdminId != null
          ? String(v.companyAdminId)
          : ''
      )
    }
  }, [record, vessels])

    useEffect(() => {
    if (!record?.id) {
      setExistingAttachments([])
      return
    }

    const defectId = Number(record.id)
    setExistingLoading(true)

    ;(async () => {
      try {
        const list = await listDefectAttachments(defectId)
        const mapped: ExistingAttachmentLocal[] = list.map((it: any) => ({
          fileName: it.fileName,
          viewUrl: defectAttachmentFileViewUrl(defectId, it.fileName),
          downloadUrl: defectAttachmentFileDownloadUrl(defectId, it.fileName),
        }))
        setExistingAttachments(mapped)
      } catch (e) {
        console.error('Failed to load defect attachments for edit modal', e)
        toast.error('Failed to load existing attachments', {position: 'top-center'})
        setExistingAttachments([])
      } finally {
        setExistingLoading(false)
      }
    })()
  }, [record?.id])

  const vesselNameById = (id?: string | number) => {
    const n = Number(id)
    if (!n) return ''
    const v = vessels.find(v => Number(v.id) === n)
    return v?.fleet_name || v?.name || ''
  }

  const vesselsForModal = useMemo(() => {
    let list = vessels
    if (companyId) {
      const cid = Number(companyId)
      list = list.filter(v =>
        Number((v as any).companyGroupAdminId ?? (v as any).companyGroupId) === cid
      )
    }
    if (subcompanyId) {
      const scid = Number(subcompanyId)
      list = list.filter(v =>
        Number((v as any).companyAdminId ?? (v as any).companyId) === scid
      )
    }
    return list
  }, [vessels, companyId, subcompanyId])

  const subcompaniesForCompany = useMemo(() => {
    if (!companyId) return []
    const cid = Number(companyId)
    return subcompanies.filter(sc => sc.companyId === cid)
  }, [subcompanies, companyId])

  const hasSubcompaniesForCompany = subcompaniesForCompany.length > 0

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const {name, value} = e.target

        if (name === 'dacCode') {
      const code = value
      const found = DAC_CODES.find(d => String(d.code) === code)
      setForm(prev => ({
        ...prev,
        dacCode: code,
        dacActionName:
          code === '99'
            ? ''
            : (found?.name ?? ''),
      }))
      if (errors.dacCode) setErrors(prev => ({...prev, dacCode: ''}))
      return
    }

    setForm(prev => ({...prev, [name]: value}))
    if (errors[name]) setErrors(prev => ({...prev, [name]: ''}))
  }

      const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target
    const arr: File[] = files && files.length > 0 ? Array.from(files) : []

    setForm(prev => {
      const existing = (prev as any)[name] as File[] | null | undefined
      const merged = [...(existing || []), ...arr]

      return {
        ...prev,
        [name]: merged.length > 0 ? merged : null,
      }
    })

    // allow re-selecting same file later
    e.target.value = ''
  }

    const handlePreviewExistingFile = (att: ExistingAttachmentLocal) => {
    setFileView({
      visible: true,
      title: att.fileName,
      file: null,
      viewUrl: att.viewUrl,
      downloadUrl: att.downloadUrl,
    })
  }

  const handleDeleteExistingFile = async (fileName: string) => {
    if (!record?.id) return
    const ok = window.confirm(`Remove attachment "${fileName}" from this defect?`)
    if (!ok) return

    try {
      await deleteDefectAttachment(Number(record.id), fileName)
      setExistingAttachments(prev => prev.filter(a => a.fileName !== fileName))
      toast.success('Attachment removed', {position: 'top-center'})
    } catch (e: any) {
      console.error('Delete attachment failed', e)
      toast.error(
        e?.response?.data?.message || 'Failed to remove attachment',
        {position: 'top-center'}
      )
    }
  }

  const handleRemoveNewFile = (index: number) => {
    setForm(prev => {
      const current = prev.attachmentFiles || []
      const next = current.filter((_, i) => i !== index)
      return {
        ...prev,
        attachmentFiles: next.length > 0 ? next : null,
      }
    })
  }

  const handlePreviewNewFile = (file: File) => {
    setFileView({
      visible: true,
      title: file.name,
      file,
      viewUrl: undefined,
      downloadUrl: undefined,
    })
  }


    const validate = () => {
    const er: Record<string, string> = {}

    if (!form.vesselId.trim() && !isCrew) er.vesselId = 'Vessel is required'
    if (!form.category) er.category = 'Category is required'
    if (!form.dacCode) er.dacCode = 'DAC Code is required'

    if (form.category === 'THIRD_PARTY_INSPECTION' && !form.tpiSubCategory) {
      er.tpiSubCategory = 'TPI sub category is required'
    }

    if (form.dacCode === '99' && !form.dacActionName?.trim()) {
      er.dacActionName = 'Please specify DAC action for "Other (Specify)"'
    }

    if (form.dacCode === '99' && !form.smsCode) {
      er.smsCode = 'SMS option is required when DAC = 99'
    }

    if (!form.description?.trim()) {
      er.description = 'Description is required'
    }

    if (!form.dateObserved) {
      er.dateObserved = 'Date of observing is required'
    }

    if (!form.dateDefect) {
      er.dateDefect = 'Date of defect is required'
    }

    if (!form.department) {
      er.department = 'Department is required'
    }

    if (!form.correctiveAction?.trim()) {
      er.correctiveAction = 'Corrective action is required'
    }

    if (!form.preventiveAction?.trim()) {
      er.preventiveAction = 'Preventive action is required'
    }

    if (!form.remarks?.trim()) {
      er.remarks = 'Remarks are required'
    }

    setErrors(er)
    return Object.keys(er).length === 0
  }

  const submit = () => {
    if (!validate()) return
    onSubmit(form)
  }

  const close = () => {
    setErrors({})
    onClose()
  }

  const displayTitle = React.useMemo(() => {
    const vName = vesselNameById(form.vesselId) || (record?.vesselName ?? 'Vessel')
    const now = new Date()
    const year = now.getFullYear()
    const month = now.toLocaleString('en-US', {month: 'short'})
    const day = now.getDate()

    let suffix = ''
    if (form.category === 'THIRD_PARTY_INSPECTION') suffix = 'TPI'
    else if (form.category === 'SHIP_OBSERVATION') suffix = 'Raised By Ship'
    else if (form.category === 'OFFICE_INSPECTION') suffix = 'Office Inspection'

    return `${vName} - ${year} - ${month} - ${day} - ${suffix || ''}`.trim()
  }, [form.vesselId, form.category, vessels, record])

    if (!visible || !record) return null

  return (
    <div style={WRAP_STYLE} tabIndex={-1}>
      {/* Custom wide modal window – same shell as AddDefectModal */}
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
          <h5 className='modal-title text-dark m-6'>Edit Defect</h5>
          <button type='button' className='btn-close m-6' onClick={close} />
        </div>

        {/* Body with inner scroll */}
        <div className='flex-grow-1 overflow-auto px-4 py-3 m-6'>
          <div className='row g-3'>
            {/* Company (disabled in edit) */}
{showCompanyFilters && (
  <div className='col-md-4'>
    <label className={LABEL}>Company</label>
    <select
      className='form-select text-dark'
      value={companyId}
      onChange={(e) => {
        // still keep logic in case you ever enable later
        setCompanyId(e.target.value)
        setSubcompanyId('')
      }}
      disabled={true}
      style={{backgroundColor: '#f8f9fa', cursor: 'not-allowed'}}
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

            {/* Subcompany (disabled in edit) */}
{showCompanyFilters &&
  Boolean(companyId) &&
  hasSubcompaniesForCompany && (
    <div className='col-md-4'>
      <label className={LABEL}>Subcompany</label>
      <select
        className='form-select text-dark'
        value={subcompanyId}
        onChange={(e) => setSubcompanyId(e.target.value)}
        disabled={true}
        style={{backgroundColor: '#f8f9fa', cursor: 'not-allowed'}}
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

           {/* Vessel (not shown for crew; disabled for others) */}
{!isCrew && (
  <div className='col-md-4'>
    <label className={LABEL}>
      Vessel <span className='text-danger'>*</span>
    </label>
    <select
      className={`form-select text-dark ${errors.vesselId ? 'is-invalid' : ''}`}
      name='vesselId'
      value={form.vesselId}
      onChange={handleChange}
      disabled={disableVesselChange}
    >
      <option value=''>Select Vessel</option>
      {vesselsForModal.map(v => (
        <option key={v.id} value={String(v.id)}>
          {v.fleet_name || v.name || `Vessel ${v.id}`}
        </option>
      ))}
    </select>
    {errors.vesselId && <div className='invalid-feedback'>{errors.vesselId}</div>}
  </div>
)}

            {/* Category */}
            <div className='col-md-4'>
              <label className={LABEL}>
                Category (Defect Raised By) <span className='text-danger'>*</span>
              </label>
              <select
                className={`form-select text-dark ${
                  errors.category ? 'is-invalid' : ''
                }`}
                name='category'
                value={form.category}
                onChange={handleChange}
              >
                <option value=''>Select Category</option>
                <option value='THIRD_PARTY_INSPECTION'>
                  Third party inspection
                </option>
                <option value='SHIP_OBSERVATION'>Ship observation</option>
                <option value='OFFICE_INSPECTION'>Office inspection</option>
              </select>
              {errors.category && (
                <div className='invalid-feedback'>{errors.category}</div>
              )}
            </div>

            {/* TPI subcategory */}
            {form.category === 'THIRD_PARTY_INSPECTION' && (
              <div className='col-md-4'>
                <label className={LABEL}>
                  TPI Sub Category <span className='text-danger'>*</span>
                </label>
                <select
                  className={`form-select text-dark ${
                    errors.tpiSubCategory ? 'is-invalid' : ''
                  }`}
                  name='tpiSubCategory'
                  value={form.tpiSubCategory}
                  onChange={handleChange}
                >
                  <option value=''>Select Sub Category</option>
                  <option value='EXT_AUDIT'>Ext. Audit (external Audit)</option>
                  <option value='SIRE'>SIRE</option>
                  <option value='PSC_INSPECTION'>
                    PSC Inspection (port state control)
                  </option>
                  <option value='FSI_INSPECTION'>
                    FSI Inspection (Flag State Inspection)
                  </option>
                  <option value='OTHER'>Others</option>
                </select>
                {errors.tpiSubCategory && (
                  <div className='invalid-feedback'>
                    {errors.tpiSubCategory}
                  </div>
                )}
              </div>
            )}

            {/* Auto Title Preview */}
            <div className='col-md-12'>
              <label className={LABEL}>Auto Title Preview</label>
              <div className='form-control' style={{background: '#f8f9fa'}}>
                {displayTitle}
              </div>
            </div>

            {/* DAC code */}
            <div className='col-md-4'>
              <label className={LABEL}>
                TYPE (Deficiency Action Codes){' '}
                <span className='text-danger'>*</span>
              </label>
              <select
                className={`form-select text-dark ${
                  errors.dacCode ? 'is-invalid' : ''
                }`}
                name='dacCode'
                value={form.dacCode}
                onChange={handleChange}
              >
                <option value=''>Select DAC Code</option>
                {DAC_CODES.map((d) => (
                  <option key={d.code} value={String(d.code)}>
                    {d.code} — {d.name}
                  </option>
                ))}
              </select>
              {errors.dacCode && (
                <div className='invalid-feedback'>{errors.dacCode}</div>
              )}
            </div>

            {/* DAC Action Name */}
            <div className='col-md-8'>
              <label className={LABEL}>
                DAC Action Name{' '}
                {form.dacCode === '99' && (
                  <span className='text-danger'>*</span>
                )}
              </label>
              <input
                type='text'
                className={`form-control text-dark ${
                  errors.dacActionName ? 'is-invalid' : ''
                }`}
                name='dacActionName'
                value={form.dacActionName}
                onChange={handleChange}
              />
              {errors.dacActionName && (
                <div className='invalid-feedback'>{errors.dacActionName}</div>
              )}
            </div>

            {/* SMS code (when 99) */}
            {form.dacCode === '99' && (
              <div className='col-md-6'>
                <label className={LABEL}>
                  SMS (Safety Management System) Option
                </label>
                <select
                  className='form-select text-dark'
                  name='smsCode'
                  value={form.smsCode}
                  onChange={handleChange}
                >
                  <option value=''>Select SMS Option</option>
                  <option value='SMS_OTHER_30_DAYS'>
                    Others 1: close in 15 days
                  </option>
                  <option value='SMS_OTHER_45_DAYS'>
                    Others 2: close in 30 days
                  </option>
                  <option value='SMS_OTHER_90_DAYS'>
                    Others 3: close in 45 days
                  </option>

                </select>
              </div>
            )}

            {/* Description */}
                        <div className='col-md-12'>
              <label className={LABEL}>
                Description <span className='text-danger'>*</span>
              </label>
              <textarea
                className={`form-control text-dark ${
                  errors.description ? 'is-invalid' : ''
                }`}
                rows={3}
                name='description'
                value={form.description}
                onChange={handleChange}
              />
              {errors.description && (
                <div className='invalid-feedback'>{errors.description}</div>
              )}
            </div>


            {/* Dates */}
                        <div className='col-md-4'>
              <label className={LABEL}>
                Date of Observing <span className='text-danger'>*</span>
              </label>
              <input
                type='date'
                className={`form-control text-dark ${
                  errors.dateObserved ? 'is-invalid' : ''
                }`}
                name='dateObserved'
                value={form.dateObserved}
                onChange={handleChange}
              />
              {errors.dateObserved && (
                <div className='invalid-feedback'>{errors.dateObserved}</div>
              )}
            </div>

            <div className='col-md-4'>
              <label className={LABEL}>
                Date Defect Raised On <span className='text-danger'>*</span>
              </label>
              <input
                type='date'
                className={`form-control text-dark ${
                  errors.dateDefect ? 'is-invalid' : ''
                }`}
                name='dateDefect'
                value={form.dateDefect}
                onChange={handleChange}
              />
              {errors.dateDefect && (
                <div className='invalid-feedback'>{errors.dateDefect}</div>
              )}
            </div>

            {/* Req No */}
            <div className='col-md-4'>
              <label className={LABEL}>Applicable Requisition Number <span className='text-danger'>*</span></label>
              <input
                type='text'
                className={`form-control text-dark ${
                  errors.applicableRequisitionNumber ? 'is-invalid' : ''
                }`}
                name='applicableRequisitionNumber'
                value={form.applicableRequisitionNumber}
                onChange={handleChange}
              />
              {errors.applicableRequisitionNumber && (
                <div className='invalid-feedback'>{errors.applicableRequisitionNumber}</div>
              )}
            </div>

              {/* Department */}
            <div className='col-md-4'>
              <label className={LABEL}>Department <span className='text-danger'>*</span></label>
              <select
                className={`form-control text-dark ${
                  errors.department ? 'is-invalid' : ''
                }`}
                name='department'
                value={form.department || ''}
                onChange={handleChange}
              >
                <option value=''>Select Department</option>
                <option value='DECK'>Deck</option>
                <option value='MACHINERY'>Machinery</option>
                <option value='LSA_FFA_SAFETY'>LSA/FFA (safety)</option>
                <option value='NAVIGATION'>Navigation</option>
                <option value='MLC_OCCUPATIONAL_HEALTH'>MLC (occupational health)</option>
                <option value='EMS_ENVIRONMENT_MANAGEMENT_SYSTEM'>EMS (environment management system)</option>
                <option value='ENGINE'>Engine</option>
                <option value='FSM_FOOD_SAFETY_MANAGEMENT'>FSM (food safety management)</option>
                <option value='CERTIFICATION_AND_DOCUMENTATION'>
                  Certification and documentation
                </option>
                <option value='OTHERS'>Others</option>
              </select>
              {errors.department && (
                <div className='invalid-feedback'>{errors.department}</div>
              )}
            </div>

            {/* Corrective Action */}
            <div className='col-md-12'>
              <label className={LABEL}>Corrective Action <span className='text-danger'>*</span></label>
              <textarea
                className={`form-control text-dark ${
                  errors.correctiveAction ? 'is-invalid' : ''
                }`}
                rows={3}
                name='correctiveAction'
                value={form.correctiveAction}
                onChange={handleChange}
                placeholder='Describe the corrective action taken to address this defect'
              />
              {errors.correctiveAction && (
                <div className='invalid-feedback'>{errors.correctiveAction}</div>
              )}
            </div>

            {/* Preventive Action */}
            <div className='col-md-12'>
              <label className={LABEL}>Preventive Action <span className='text-danger'>*</span></label>
              <textarea
                className={`form-control text-dark ${
                  errors.preventiveAction ? 'is-invalid' : ''
                }`}
                rows={3}
                name='preventiveAction'
                value={form.preventiveAction}
                onChange={handleChange}
                placeholder='Describe the preventive action to avoid recurrence'
              />
              {errors.preventiveAction && (
                <div className='invalid-feedback'>{errors.preventiveAction}</div>
              )}
            </div>


                        {/* Attachments – existing + add new */}
            <div className='col-md-12 mt-3'>
              <label className={LABEL}>Attachments</label>

              {/* Existing attachments from server */}
              {record?.id && (
                <div className='mb-3'>
                  {existingLoading ? (
                    <div className='text-muted small'>Loading attachments...</div>
                  ) : existingAttachments.length === 0 ? (
                    <div className='text-muted small fst-italic'>
                      No attachments uploaded yet for this defect.
                    </div>
                  ) : (
                    <ul className='mb-0' style={{ listStyle: 'none', paddingLeft: 0 }}>
                      {existingAttachments.map((att, idx) => (
                        <li
                          key={idx}
                          className='d-flex align-items-center justify-content-between mb-1'
                        >
                          <span
                            className='text-muted small text-truncate'
                            style={{ maxWidth: '260px' }}
                            title={att.fileName}
                          >
                            {att.fileName}
                          </span>
                          <div className='d-flex align-items-center gap-1'>
                            <button
                              type='button'
                              className='btn btn-icon btn-sm'
                              title='View'
                              onClick={() => handlePreviewExistingFile(att)}
                            >
                              <KTSVG
                                path='/media/map/ph_eye.svg'
                                className='svg-icon-3 text-primary'
                              />
                            </button>
                            <button
                              type='button'
                              className='btn btn-icon btn-sm'
                              title='Delete'
                              onClick={() => handleDeleteExistingFile(att.fileName)}
                            >
                              <KTSVG
                                path='/media/icons/duotune/general/gen027.svg'
                                className='svg-icon-3 text-danger'
                              />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Add new attachments */}
              <div className='mt-2'>
                <label className='form-label fw-semibold fs-7 mb-1 text-dark'>
                  Add New Attachments
                </label>
                <input
                  type='file'
                  multiple
                  className='form-control text-dark'
                  name='attachmentFiles'
                  onChange={handleFileChange}
                />
                <div className='form-text text-muted'>
                  Selecting again will <strong>add</strong> more files to the list below (it does
                  not replace existing files; use the delete icon above to remove).
                </div>

                {form.attachmentFiles && form.attachmentFiles.length > 0 && (
                  <div className='mt-3'>
                    <div className='fw-semibold mb-2'>New files to upload</div>
                    <ul className='mb-0' style={{ listStyle: 'none', paddingLeft: 0 }}>
                      {form.attachmentFiles.map((f, idx) => (
                        <li
                          key={idx}
                          className='d-flex align-items-center justify-content-between mb-1'
                        >
                          <span
                            className='text-muted small text-truncate'
                            style={{ maxWidth: '260px' }}
                            title={f.name}
                          >
                            {f.name}
                          </span>
                          <div className='d-flex align-items-center gap-1'>
                            <button
                              type='button'
                              className='btn btn-icon btn-sm'
                              title='Preview'
                              onClick={() => handlePreviewNewFile(f)}
                            >
                              <KTSVG
                                path='/media/map/ph_eye.svg'
                                className='svg-icon-3 text-primary'
                              />
                            </button>
                            <button
                              type='button'
                              className='btn btn-icon btn-sm'
                              title='Remove'
                              onClick={() => handleRemoveNewFile(idx)}
                            >
                              <KTSVG
                                path='/media/icons/duotune/general/gen027.svg'
                                className='svg-icon-3 text-danger'
                              />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Remarks */}
            <div className='col-md-12'>
              <label className={LABEL}>Remarks <span className='text-danger'>*</span></label>
              <textarea
                className={`form-control text-dark ${
                  errors.remarks ? 'is-invalid' : ''
                }`}
                rows={3}
                name='remarks'
                value={form.remarks}
                onChange={handleChange}
              />
              {errors.remarks && (
                <div className='invalid-feedback'>{errors.remarks}</div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className='border-top d-flex justify-content-end gap-2 px-4 py-3 flex-shrink-0'>
          <button
            type='button'
            className='btn btn-light btn-sm'
            onClick={close}
          >
            Cancel
          </button>
          <button
            type='button'
            className='btn btn_primary btn-sm'
            onClick={submit}
          >
            Save Changes
          </button>
        </div>
      </div>

      {/* File viewer for current/selected files */}
      <FileViewerModal
        visible={fileView.visible}
        onClose={() =>
          setFileView((prev) => ({
            ...prev,
            visible: false,
            file: null,
            viewUrl: undefined,
            downloadUrl: undefined,
          }))
        }
        title={fileView.title}
        fileName={
          fileView.file?.name || (fileView.viewUrl ? fileView.title : undefined)
        }
        file={fileView.file}
        viewUrl={fileView.viewUrl}
        downloadUrl={fileView.downloadUrl}
      />
    </div>
  )
}

