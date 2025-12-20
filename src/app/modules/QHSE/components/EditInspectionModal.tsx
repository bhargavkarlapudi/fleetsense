// EditInspectionModal.tsx
import React, {FC, useEffect, useMemo, useState} from 'react'
import type {
  QhseInspectionKind,
  Port,
  VesselLite,
  CrewLite,
  InspectionDto,
} from '../core/_models'
import RichTextEditor from '../components/RichTextEditor'

export type PlanOption = {id: number; label: string}
export type SubmitShape = {
  vessel: string
  inspection: string
  inspectionType: string
  inspectionDate: string
  internalInspectorId?: string
  externalInspector?: string
  fromPort?: string
  toPort?: string
  hoursOnboard?: number
  linkToPlan?: string
  inspectionRemarks?: string
}

export const EditInspectionModal: FC<{
  visible: boolean
  onClose: () => void
  record: InspectionDto | null
  onSubmit: (data: SubmitShape) => void
  vessels: VesselLite[]
  kinds: QhseInspectionKind[]
  ports: Port[]
  planOptions?: PlanOption[]
  crews: CrewLite[]
  companies: Array<{id: number; name: string}>
  subcompanies: Array<{id: number; name: string; companyId: number}>
  rankMap?: Record<number, string>

  /** NEW role-aware flags */
  showCompanyFilters?: boolean
  isCrew?: boolean
  disableVesselChange?: boolean
}> = ({
  visible,
  onClose,
  record,
  onSubmit,
  vessels,
  kinds,
  ports,
  planOptions = [],
  crews,
  companies,
  subcompanies,
  rankMap = {},
  showCompanyFilters = true,
  isCrew = false,
  disableVesselChange = false,
}) => {
  const LABEL_CLS = 'form-label fw-semibold fs-6 mb-2 text-dark'

  const WRAP_STYLE: React.CSSProperties = {
    background: 'rgba(0,0,0,0.5)',
    position: 'fixed',
    inset: 0,
    zIndex: 1050,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }

  const MODAL_DIALOG_STYLE: React.CSSProperties = {
    maxWidth: '95%',
    width: 'auto',
    margin: '0 auto',
  }

  const MODAL_CONTENT_STYLE: React.CSSProperties = {
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
  }

  const [companyId, setCompanyId] = useState<string>('') // CGA
  const [subcompanyId, setSubcompanyId] = useState<string>('') // Company

  const [formData, setFormData] = useState({
    vessel: '',
    inspection: '',
    inspectionType: '',
    inspectionDate: '',
    internalInspectorId: '',
    externalInspector: '',
    fromPort: '',
    toPort: '',
    hoursOnboard: '',
    linkToPlan: '',
    inspectionRemarks: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const vesselNameById = (id?: string | number) => {
    const n = Number(id)
    if (!n) return ''
    const v = vessels.find(v => Number(v.id) === n)
    return v?.name || ''
  }

  // prefill
  useEffect(() => {
    if (!record) return
    const v = vessels.find(vv => Number(vv.id) === Number(record.vesselId))
    const cga = v?.companyGroupAdminId ? String(v?.companyGroupAdminId) : ''
    const ca = v?.companyAdminId ? String(v?.companyAdminId) : ''
    setCompanyId(cga)
    setSubcompanyId(ca)

    setFormData({
      vessel: String(record.vesselId || ''),
      inspection: String(record.inspectionKindId || ''),
      inspectionType: String(record.inspectionType || 'DETAILS_TYPE'),
      inspectionDate: record.inspectionFromDate || '',
      internalInspectorId: '',
      externalInspector: record.externalInspectorName || '',
      fromPort: record.fromPortId != null ? String(record.fromPortId) : '',
      toPort: record.toPortId != null ? String(record.toPortId) : '',
      hoursOnboard: record.hoursOnboard != null ? String(record.hoursOnboard) : '',
      linkToPlan: '',
      inspectionRemarks: record.remarks || '',
    })
    setErrors({})
  }, [record, vessels])

  const vesselsForModal = useMemo(() => {
    let list = vessels
    if (companyId) {
      const cid = Number(companyId)
      list = list.filter(
        v =>
          Number(
            (v as any).companyGroupAdminId ?? (v as any).companyGroupId
          ) === cid
      )
    }
    if (subcompanyId) {
      const scid = Number(subcompanyId)
      list = list.filter(
        v =>
          Number(
            (v as any).companyAdminId ?? (v as any).companyId
          ) === scid
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

  const getRankText = (c: CrewLite) =>
    String(c.rankName || (c.rankId != null ? rankMap[c.rankId] : '') || '')

  const isMasterOrChief = (s: string) => {
    const x = s.toLowerCase()
    return x.includes('master') || x.includes('chief officer')
  }

  const crewsForModal = useMemo<CrewLite[]>(() => {
    const vid = Number(formData.vessel || 0)
    if (!vid) return []
    const byVessel = crews.filter(c => c.vesselId === vid)
    const activeOnly = byVessel.filter(c => c.active !== false)
    const filtered = activeOnly.filter(c => {
      const t = getRankText(c)
      return t && isMasterOrChief(t)
    })
    return filtered.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''))
  }, [crews, formData.vessel, rankMap])

  // keep vessel in sync when editable
  useEffect(() => {
    if (disableVesselChange) return
    const current = Number(formData.vessel || 0)
    const ids = new Set(vesselsForModal.map(v => Number(v.id)))
    if (!current || !ids.has(current)) {
      setFormData(prev => ({...prev, vessel: '', internalInspectorId: ''}))
    }
    if (vesselsForModal.length === 1) {
      const onlyId = String(vesselsForModal[0].id)
      setFormData(prev =>
        prev.vessel === onlyId
          ? prev
          : {...prev, vessel: onlyId, internalInspectorId: ''}
      )
    }
  }, [vesselsForModal, disableVesselChange]) // eslint-disable-line

  useEffect(() => {
    setFormData(prev => ({...prev, internalInspectorId: ''}))
  }, [formData.vessel])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const {name, value} = e.target
    setFormData(prev => ({...prev, [name]: value}))
    if (errors[name]) setErrors(prev => ({...prev, [name]: ''}))
  }

  const validate = () => {
    const er: Record<string, string> = {}
    if (!formData.vessel.trim()) er.vessel = 'Vessel is required'
    if (!formData.inspection.trim()) er.inspection = 'Inspection is required'
    if (!formData.inspectionType.trim()) er.inspectionType = 'Inspection Type is required'
    if (!formData.inspectionDate.trim()) er.inspectionDate = 'Inspection Date is required'
    if (
      formData.hoursOnboard &&
      (isNaN(Number(formData.hoursOnboard)) || Number(formData.hoursOnboard) < 0)
    ) {
      er.hoursOnboard = 'Hours Onboard must be a positive number'
    }
    setErrors(er)
    return Object.keys(er).length === 0
  }

  const submit = () => {
    if (!validate()) return
    onSubmit({
      vessel: formData.vessel,
      inspection: formData.inspection,
      inspectionType: formData.inspectionType,
      inspectionDate: formData.inspectionDate,
      internalInspectorId: formData.internalInspectorId || undefined,
      externalInspector: formData.externalInspector || undefined,
      fromPort: formData.fromPort || undefined,
      toPort: formData.toPort || undefined,
      hoursOnboard: formData.hoursOnboard
        ? Number(formData.hoursOnboard)
        : undefined,
      linkToPlan: formData.linkToPlan || undefined,
      inspectionRemarks: formData.inspectionRemarks || undefined,
    })
  }

  if (!visible || !record) return null

  const lockedVesselId = formData.vessel || String(record.vesselId || '')

  return (
    <div
      className='modal fade show d-flex align-items-center justify-content-center'
      tabIndex={-1}
      style={WRAP_STYLE}
    >
      <div
        className='modal-dialog modal-xl modal-dialog-centered'
        role='dialog'
        style={MODAL_DIALOG_STYLE}
      >
        <div
          className='modal-content bg-white text-dark'
          style={MODAL_CONTENT_STYLE}
        >
          <div className='modal-header'>
            <h5 className='modal-title text-dark'>Edit Inspection</h5>
            <button type='button' className='btn-close' onClick={onClose} />
          </div>

          <div className='modal-body' style={{overflowY: 'auto'}}>
            <div className='row g-3'>
              {/* Company (disabled like EditDefect) */}
              {showCompanyFilters && (
                <div className='col-md-6'>
                  <label className={LABEL_CLS}>Company</label>
                  <select
                    className='form-select text-dark'
                    value={companyId}
                    onChange={e => {
                      setCompanyId(e.target.value)
                      setSubcompanyId('')
                    }}
                    disabled={true}
                    style={{background: '#f8f9fa', cursor: 'not-allowed'}}
                  >
                    <option value=''>All Companies</option>
                    {companies.map(c => (
                      <option key={c.id} value={String(c.id)}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Subcompany (disabled) */}
              {showCompanyFilters && Boolean(companyId) && hasSubcompaniesForCompany && (
                <div className='col-md-6'>
                  <label className={LABEL_CLS}>Subcompany</label>
                  <select
                    className='form-select text-dark'
                    value={subcompanyId}
                    onChange={e => setSubcompanyId(e.target.value)}
                    disabled={true}
                    style={{background: '#f8f9fa', cursor: 'not-allowed'}}
                  >
                    <option value=''>All Subcompanies</option>
                    {subcompaniesForCompany.map(sc => (
                      <option key={sc.id} value={String(sc.id)}>
                        {sc.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Vessel */}
              <div className='col-md-6'>
                <label className={LABEL_CLS}>
                  Vessel <span className='text-danger'>*</span>
                </label>

                {isCrew || disableVesselChange ? (
                  <>
                    <div
                      className='form-control'
                      style={{background: '#f8f9fa'}}
                    >
                      {vesselNameById(lockedVesselId)}
                    </div>
                    <input type='hidden' name='vessel' value={lockedVesselId} />
                  </>
                ) : vesselsForModal.length === 1 ? (
                  <>
                    <input
                      type='hidden'
                      name='vessel'
                      value={formData.vessel || String(vesselsForModal[0].id)}
                    />
                    <div className='form-control' style={{background: '#f8f9fa'}}>
                      {vesselsForModal[0].name}
                    </div>
                  </>
                ) : (
                  <select
                    className={`form-select text-dark ${
                      errors.vessel ? 'is-invalid' : ''
                    }`}
                    name='vessel'
                    value={formData.vessel}
                    onChange={handleChange}
                  >
                    <option value=''>Select Vessel</option>
                    {vesselsForModal.map(v => (
                      <option key={v.id} value={String(v.id)}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                )}
                {errors.vessel && (
                  <div className='invalid-feedback'>{errors.vessel}</div>
                )}
              </div>

              {/* Inspection kind */}
              <div className='col-md-6'>
                <label className={LABEL_CLS}>
                  Inspection <span className='text-danger'>*</span>
                </label>
                <select
                  className={`form-select text-dark ${
                    errors.inspection ? 'is-invalid' : ''
                  }`}
                  name='inspection'
                  value={formData.inspection}
                  onChange={handleChange}
                >
                  <option value=''>Select Inspection</option>
                  {kinds.map(k => (
                    <option key={k.id} value={String(k.id)}>
                      {k.name}
                    </option>
                  ))}
                </select>
                {errors.inspection && (
                  <div className='invalid-feedback'>{errors.inspection}</div>
                )}
              </div>

              {/* Inspection Type */}
              <div className='col-md-6'>
                <label className={LABEL_CLS}>
                  Inspection Type <span className='text-danger'>*</span>
                </label>
                <select
                  className={`form-select text-dark ${
                    errors.inspectionType ? 'is-invalid' : ''
                  }`}
                  name='inspectionType'
                  value={formData.inspectionType}
                  onChange={handleChange}
                >
                  {(['ATTACHMENT_TYPE', 'DETAILS_TYPE'] as const).map(t => (
                    <option key={t} value={t}>
                      {t.replace('_', ' ')}
                    </option>
                  ))}
                </select>
                {errors.inspectionType && (
                  <div className='invalid-feedback'>
                    {errors.inspectionType}
                  </div>
                )}
              </div>

              {/* Inspection Date */}
              <div className='col-md-6'>
                <label className={LABEL_CLS}>
                  Inspection Date <span className='text-danger'>*</span>
                </label>
                <input
                  type='date'
                  className={`form-control text-dark ${
                    errors.inspectionDate ? 'is-invalid' : ''
                  }`}
                  name='inspectionDate'
                  value={formData.inspectionDate}
                  onChange={handleChange}
                />
                {errors.inspectionDate && (
                  <div className='invalid-feedback'>
                    {errors.inspectionDate}
                  </div>
                )}
              </div>

              {/* Internal Inspector */}
              <div className='col-md-6'>
                <label className={LABEL_CLS}>Internal Inspector</label>
                <select
                  className='form-select text-dark'
                  name='internalInspectorId'
                  value={formData.internalInspectorId}
                  onChange={handleChange}
                  disabled={!formData.vessel || crewsForModal.length === 0}
                >
                  <option value=''>
                    {formData.vessel
                      ? crewsForModal.length
                        ? 'Select Internal Inspector'
                        : 'No active Master/Chief Officer on this vessel'
                      : 'Select vessel first'}
                  </option>
                  {crewsForModal.map((c: CrewLite) => {
                    const rankLabel =
                      c.rankName ||
                      (c.rankId != null ? rankMap[c.rankId] : '') ||
                      ''
                    const label = rankLabel
                      ? `${c.fullName} (${rankLabel})`
                      : c.fullName
                    return (
                      <option key={c.id} value={String(c.id)}>
                        {label}
                      </option>
                    )
                  })}
                </select>
              </div>

              {/* External Inspector */}
              <div className='col-md-6'>
                <label className={LABEL_CLS}>External Inspector</label>
                <input
                  type='text'
                  className='form-control text-dark'
                  name='externalInspector'
                  value={formData.externalInspector}
                  onChange={handleChange}
                  placeholder='Enter external inspector name'
                />
              </div>

              {/* Ports */}
              <div className='col-md-6'>
                <label className={LABEL_CLS}>From Port</label>
                <select
                  className='form-select text-dark'
                  name='fromPort'
                  value={formData.fromPort}
                  onChange={handleChange}
                >
                  <option value=''>Select From Port</option>
                  {ports.map(p => (
                    <option key={p.id} value={String(p.id)}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className='col-md-6'>
                <label className={LABEL_CLS}>To Port</label>
                <select
                  className='form-select text-dark'
                  name='toPort'
                  value={formData.toPort}
                  onChange={handleChange}
                >
                  <option value=''>Select To Port</option>
                  {ports.map(p => (
                    <option key={p.id} value={String(p.id)}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Hours */}
              <div className='col-md-6'>
                <label className={LABEL_CLS}>Hours Onboard</label>
                <input
                  type='number'
                  className={`form-control text-dark ${
                    errors.hoursOnboard ? 'is-invalid' : ''
                  }`}
                  name='hoursOnboard'
                  value={formData.hoursOnboard}
                  onChange={handleChange}
                  min='0'
                  step='0.5'
                />
                {errors.hoursOnboard && (
                  <div className='invalid-feedback'>{errors.hoursOnboard}</div>
                )}
              </div>

              {/* Link to Plan */}
              <div className='col-md-6'>
                <label className={LABEL_CLS}>Link to Plan</label>
                <select
                  className='form-select text-dark'
                  name='linkToPlan'
                  value={formData.linkToPlan}
                  onChange={handleChange}
                >
                  <option value=''>Select Plan</option>
                  {planOptions.map(plan => (
                    <option key={plan.id} value={String(plan.id)}>
                      {plan.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Remarks */}
              <div className='col-12'>
                <label className={LABEL_CLS}>Inspection Remarks</label>
                <RichTextEditor
                  value={formData.inspectionRemarks}
                  onChange={html => {
                    setFormData(prev => ({...prev, inspectionRemarks: html}))
                    if (errors.inspectionRemarks) {
                      setErrors(prev => ({...prev, inspectionRemarks: ''}))
                    }
                  }}
                  placeholder='Update notes, bullets, links…'
                  invalid={Boolean(errors.inspectionRemarks)}
                  height={220}
                />
                {errors.inspectionRemarks && (
                  <div className='invalid-feedback d-block'>
                    {errors.inspectionRemarks}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className='modal-footer'>
            <button
              type='button'
              className='btn btn-light btn-sm'
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type='button'
              className='btn btn_primary'
              onClick={submit}
            >
              Update
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
