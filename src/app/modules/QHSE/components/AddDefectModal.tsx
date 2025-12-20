import React, {FC, useEffect, useMemo, useState} from 'react'
import type {
  DefectCategory,
  TpiSubCategory,
  SmsCode,
  DefectDepartment,
} from '../core/_models'
import {KTSVG} from '../../../../_metronic/helpers'
import {FileViewerModal} from '../components/FileViewerModal'
import { searchInspections, searchAudits } from '../core/_requests'

type VesselLiteLocal = {
  id: number
  name: string
  fleet_name?: string
  companyGroupAdminId?: number
  companyAdminId?: number
}

type CompanyGroup = {id: number; name: string}
type Subcompany = {id: number; name: string; companyId: number}

export type DefectSubmitShape = {
  vesselId: string
  category: DefectCategory | ''
  tpiSubCategory?: TpiSubCategory | ''

  dacCode: string
  dacActionName?: string
  smsCode?: SmsCode | ''

  description?: string
  dateObserved?: string
  dateDefect?: string
  applicableRequisitionNumber?: string

  department?: DefectDepartment | ''

  correctiveAction?: string
  preventiveAction?: string

  remarks?: string

  attachmentFiles?: File[] | null

  /**
   * ''          → nothing selected yet
   * INSPECTION  → linked to inspection
   * AUDIT       → linked to audit
   * NONE        → general (no link)
   */
  linkType: '' | 'INSPECTION' | 'AUDIT' | 'NONE'
  linkId: string
}

type LinkType = '' | 'INSPECTION' | 'AUDIT' | 'NONE'



interface AddDefectModalProps {
  visible: boolean
  onClose: () => void
  onSubmit: (data: DefectSubmitShape) => void
  vessels: VesselLiteLocal[]          // ← use local type that has fleet_name
  companies: CompanyGroup[]
  subcompanies: Subcompany[]
  showCompanyFilters?: boolean

  // NEW
  isCrew?: boolean                    // role 4
  defaultVesselId?: number            // auto-select vessel for crew
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

const AddDefectModal: FC<AddDefectModalProps> = ({
  visible,
  onClose,
  onSubmit,
  vessels,
  companies,
  subcompanies,
  showCompanyFilters = true,
  isCrew = false,
  defaultVesselId,
}) => {
  const [companyId, setCompanyId] = useState<string>('')
  const [subcompanyId, setSubcompanyId] = useState<string>('')
    const [fileView, setFileView] = useState<{
    visible: boolean
    title: string
    file: File | null
  }>({
    visible: false,
    title: '',
    file: null,
  })


      const [form, setForm] = useState<DefectSubmitShape>({
    vesselId: isCrew && defaultVesselId ? String(defaultVesselId) : '',
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
    // closureFile: null,
    linkType: '',
linkId: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  type LinkType = 'INSPECTION' | 'AUDIT' | ''

type LinkOption = {
  value: string
  label: string
}

const [inspectionOptions, setInspectionOptions] = useState<LinkOption[]>([])
const [auditOptions, setAuditOptions] = useState<LinkOption[]>([])
const [linkOptionsLoading, setLinkOptionsLoading] = useState(false)

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

    // For crew: once defaultVesselId is known, auto-set vesselId (even if component
  // was mounted earlier with undefined defaultVesselId)
  useEffect(() => {
    if (isCrew && defaultVesselId && !form.vesselId) {
      setForm(prev => ({
        ...prev,
        vesselId: String(defaultVesselId),
      }))
    }
  }, [isCrew, defaultVesselId, form.vesselId])

  // auto-select vessel if only one
  useEffect(() => {
    if (!form.vesselId && vesselsForModal.length === 1) {
      setForm(prev => ({...prev, vesselId: String(vesselsForModal[0].id)}))
    }
  }, [vesselsForModal]) // eslint-disable-line react-hooks/exhaustive-deps

// Load Inspections / Audits for selected vessel + link type
useEffect(() => {
  if (!visible) return

  // reset when nothing selected or linkType is NONE
  if (!form.vesselId || !form.linkType || form.linkType === 'NONE') {
    setInspectionOptions([])
    setAuditOptions([])
    return
  }

  const load = async () => {
    setLinkOptionsLoading(true)
    try {
      const vesselIdNum = Number(form.vesselId)
      if (!Number.isFinite(vesselIdNum)) {
        setInspectionOptions([])
        setAuditOptions([])
        return
      }

      if (form.linkType === 'INSPECTION') {
        const res = await searchInspections({ vesselId: vesselIdNum, activeOnly: true })

        // server may return array OR pageable { content: [...] }
        const arrRaw = Array.isArray(res)
          ? res
          : Array.isArray((res as any).content)
          ? (res as any).content
          : []

        // 🔴 HARD FILTER: only keep inspections of the selected vessel
        const arr = arrRaw.filter((ins: any) => Number(ins.vesselId) === vesselIdNum)

        const opts: LinkOption[] = arr.map((ins: any) => {
          const vName =
            ins.vesselName ||
            vesselNameById(ins.vesselId) ||
            'Vessel'

          const date =
            ins.inspectionFromDate ||
            ins.inspectionDate ||
            ''

          const kind =
            ins.inspectionKindName ||
            'Inspection'

          return {
            value: String(ins.id),
            label: [vName, kind, date].filter(Boolean).join(' - '),
          }
        })

        setInspectionOptions(opts)
        setAuditOptions([])
      } else if (form.linkType === 'AUDIT') {
        const res = await searchAudits({ vesselId: vesselIdNum, activeOnly: true })

        const arrRaw = Array.isArray(res)
          ? res
          : Array.isArray((res as any).content)
          ? (res as any).content
          : []

        // 🔴 HARD FILTER: only keep audits of the selected vessel
        const arr = arrRaw.filter((a: any) => Number(a.vesselId) === vesselIdNum)

        const opts: LinkOption[] = arr.map((a: any) => {
          const vName =
            a.vesselName ||
            vesselNameById(a.vesselId) ||
            'Vessel'

          const date =
            a.auditFromDate ||
            a.auditDate ||
            a.inspectionFromDate ||   // just in case backend reuses fields
            a.inspectionDate ||
            ''

          const kind =
            a.auditKindName ||
            a.inspectionKindName ||
            'Audit'

          return {
            value: String(a.id),
            label: [vName, kind, date].filter(Boolean).join(' - '),
          }
        })

        setAuditOptions(opts)
        setInspectionOptions([])
      }
    } catch (err) {
      console.error('Failed to load inspections/audits for defect linking', err)
      setInspectionOptions([])
      setAuditOptions([])
    } finally {
      setLinkOptionsLoading(false)
    }
  }

  load()
}, [visible, form.vesselId, form.linkType]) // <- keep deps same


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
        // for non-99, auto set name; for 99 start with empty
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

    // optional: clear the input so user can re-select same file again
    e.target.value = ''
  }

    const handleRemoveSelectedFile = (index: number) => {
    setForm(prev => {
      const current = prev.attachmentFiles || []
      const next = current.filter((_, i) => i !== index)
      return {
        ...prev,
        attachmentFiles: next.length > 0 ? next : null,
      }
    })
  }

  const handlePreviewSelectedFile = (file: File) => {
    setFileView({
      visible: true,
      title: file.name,
      file,
    })
  }


const validate = () => {
  const er: Record<string, string> = {}

  if (!form.vesselId.trim() && !isCrew) {
    er.vesselId = 'Vessel is required'
  }

  // Only validate link fields if a vessel is selected
  if (form.vesselId) {
    if (!form.linkType) {
      er.linkType = 'Select "Inspection", "Audit" or "None (general)"'
    } else if (form.linkType !== 'NONE' && !form.linkId) {
      er.linkId = 'Please choose one Inspection / Audit'
    }
  }

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
  setForm({
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
    linkType: '',
    linkId: '',
  })
  setErrors({})
  setCompanyId('')
  setSubcompanyId('')
  onClose()
}


  // computed display title
  const displayTitle = React.useMemo(() => {
    const vName = vesselNameById(form.vesselId) || 'Vessel'
    const now = new Date()
    const year = now.getFullYear()
    const month = now.toLocaleString('en-US', {month: 'short'})
    const day = now.getDate()

    let suffix = ''
    if (form.category === 'THIRD_PARTY_INSPECTION') suffix = 'TPI'
    else if (form.category === 'SHIP_OBSERVATION') suffix = 'Raised By Ship'
    else if (form.category === 'OFFICE_INSPECTION') suffix = 'Office Inspection'

    return `${vName} - ${year} - ${month} - ${day} - ${suffix || ''}`.trim()
  }, [form.vesselId, form.category, vessels])

    if (!visible) return null

  return (
    <div style={WRAP_STYLE} tabIndex={-1}>
      {/* Custom modal window – NOT using Bootstrap .modal-dialog/.modal-content */}
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
          <h5 className='modal-title text-dark m-6'>Add New Defect</h5>
          <button type='button' className='btn-close m-6' onClick={close} />
        </div>

        {/* Body with inner scroll */}
        <div className='flex-grow-1 overflow-auto px-4 py-3 m-6'>
          <div className='row g-3'>
                        {/* Company */}
            {showCompanyFilters && (
              <div className='col-md-4'>
                <label className={LABEL}>Company</label>
                <select
                  className='form-select text-dark'
                  value={companyId}
                  onChange={(e) => {
                    setCompanyId(e.target.value)
                    setSubcompanyId('')
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

                        {/* Subcompany */}
            {showCompanyFilters &&
              Boolean(companyId) &&
              hasSubcompaniesForCompany && (
                <div className='col-md-4'>
                  <label className={LABEL}>Subcompany</label>
                  <select
                    className='form-select text-dark'
                    value={subcompanyId}
                    onChange={(e) => setSubcompanyId(e.target.value)}
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

{/* Link to Inspection / Audit – only after vessel selected */}
{form.vesselId && (
  <div className='row mb-5'>
    <div className='col-md-4'>
      <label className='form-label fw-semibold fs-7 text-muted'>
        Linked To <span className='text-danger'>*</span>
      </label>
      <select
        className={`form-select ${errors.linkType ? 'is-invalid' : ''}`}
        value={form.linkType}
        onChange={e => {
          const value = e.target.value as LinkType
          setForm(prev => ({
            ...prev,
            linkType: value,
            linkId: '',        // reset selection when type changes
          }))
          if (errors.linkType || errors.linkId) {
            setErrors(prev => ({...prev, linkType: '', linkId: ''}))
          }
        }}
      >
        <option value=''>Select</option>
        <option value='INSPECTION'>Inspection</option>
        <option value='AUDIT'>Audit</option>
        <option value='NONE'>None (general)</option>
      </select>
      {errors.linkType && (
        <div className='invalid-feedback'>{errors.linkType}</div>
      )}
    </div>

    {/* Only show Inspection / Audit dropdown if we are actually linking */}
    {(form.linkType === 'INSPECTION' || form.linkType === 'AUDIT') && (
      <div className='col-md-8'>
        <label className='form-label fw-semibold fs-7 text-muted'>
          Inspection / Audit <span className='text-danger'>*</span>
        </label>
        <select
          className={`form-select ${errors.linkId ? 'is-invalid' : ''}`}
          value={form.linkId}
          onChange={e =>
            setForm(prev => ({
              ...prev,
              linkId: e.target.value,
            }))
          }
          disabled={!form.linkType || !form.vesselId}
        >
          <option value=''>Select</option>

          {form.linkType === 'INSPECTION' &&
            inspectionOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}

          {form.linkType === 'AUDIT' &&
            auditOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
        </select>

        {errors.linkId && (
          <div className='invalid-feedback d-block'>{errors.linkId}</div>
        )}

        <div className='form-text'>
          {linkOptionsLoading
            ? 'Loading inspections / audits for selected vessel…'
            : 'Options shown as: Vessel - Type - Date'}
        </div>
      </div>
    )}
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

            {/* TPI subcategory (only for TPI) */}
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

            {/* Display title */}
            <div className='col-md-12'>
              <label className={LABEL}>Auto Title Preview</label>
              <div className='form-control' style={{background: '#f8f9fa'}}>
                {displayTitle}
              </div>
              <div className='form-text text-muted'>
                Format: vessel - year - month - day - TPI/Raised By Ship/Office
                Inspection
              </div>
            </div>

            {/* DAC Code */}
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
                placeholder='Will auto-fill from selected DAC; override or specify when using "Other (Specify)"'
              />
              {errors.dacActionName && (
                <div className='invalid-feedback'>{errors.dacActionName}</div>
              )}
            </div>

            {/* SMS code (only when DAC=99) */}
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
                placeholder='e.g. Anchor not holding or Breakdown of lifeboat'
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

            {/* Requisition no */}
            <div className='col-md-4'>
              <label className={LABEL}>Applicable Requisition Number</label>
              <input
                type='text'
                className={`form-control text-dark ${
                  errors.applicableRequisitionNumber ? 'is-invalid' : ''
                }`}
                name='applicableRequisitionNumber'
                value={form.applicableRequisitionNumber}
                onChange={handleChange}
                placeholder='Enter requisition number if any'
              />
              {errors.applicableRequisitionNumber && (
                <div className='invalid-feedback'>{errors.applicableRequisitionNumber}</div>
              )}
            </div>

                        {/* Department */}
            <div className='col-md-4'>
              <label className={LABEL}>
                Department <span className='text-danger'>*</span>
              </label>
              <select
                className={`form-select text-dark ${
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
                <option value='CERTIFICATION_AND_DOCUMENTATION'>Certification and documentation</option>
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
                className={`form-select text-dark ${
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
                className={`form-select text-dark ${
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

                         {/* Attach document (multi-file) */}
            <div className='col-md-6'>
              <label className={LABEL}>Attach Documents</label>
              <input
                type='file'
                multiple
                className='form-control text-dark'
                name='attachmentFiles'
                onChange={handleFileChange}
              />
              <div className='form-text text-muted'>
                You can select multiple files. Selecting again will <strong>add</strong> to the list, not replace it.
              </div>

              {form.attachmentFiles && form.attachmentFiles.length > 0 && (
                <div className='mt-3'>
                  <div className='fw-semibold mb-2'>Selected files</div>
                  <ul className='mb-0' style={{ listStyle: 'none', paddingLeft: 0 }}>
                    {form.attachmentFiles.map((f, idx) => (
                      <li
                        key={idx}
                        className='d-flex align-items-center justify-content-between mb-1'
                      >
                        <span className='text-muted small text-truncate' style={{ maxWidth: '260px' }}>
                          {f.name}
                        </span>
                        <div className='d-flex align-items-center gap-1'>
                          <button
                            type='button'
                            className='btn btn-icon btn-sm'
                            title='Preview'
                            onClick={() => handlePreviewSelectedFile(f)}
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
                            onClick={() => handleRemoveSelectedFile(idx)}
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

            {/* Remarks */}
            <div className='col-md-12'>
              <label className={LABEL}>Remarks <span className='text-danger'>*</span></label>
              <textarea
                className={`form-select text-dark ${
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
            Save Defect
          </button>
        </div>
      </div>

      {/* Local file viewer for selected files */}
      <FileViewerModal
        visible={fileView.visible}
        onClose={() =>
          setFileView((prev) => ({...prev, visible: false, file: null}))
        }
        title={fileView.title}
        fileName={fileView.file?.name}
        file={fileView.file || undefined}
      />
    </div>
  )
}

export default AddDefectModal
