// EditAuditModal.tsx
import React, {FC, useEffect, useMemo, useState} from 'react'
import type {QhseAuditKind, Port, VesselLite, CrewLite, AuditDto} from '../core/_models'
import RichTextEditor from '../components/RichTextEditor'

export type PlanOption = {id: number; label: string}
export type SubmitShape = {
  vessel: string
  audit: string
  auditType: string
  auditDate: string
  internalAuditorId?: string
  externalAuditor?: string
  fromPort?: string
  toPort?: string
  hoursOnboard?: number
  linkToPlan?: string
  auditRemarks?: string
}

export const EditAuditModal: FC<{
  visible: boolean
  onClose: () => void
  record: AuditDto | null
  onSubmit: (data: SubmitShape) => void
  vessels: VesselLite[]
  kinds: QhseAuditKind[]
  ports: Port[]
  planOptions?: PlanOption[]
  crews: CrewLite[]
  companies: Array<{id: number; name: string}>
  subcompanies: Array<{id: number; name: string; companyId: number}>
  rankMap?: Record<number, string>

  /** NEW: role-aware like Defect */
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
    audit: '',
    auditType: '',
    auditDate: '',
    internalAuditorId: '',
    externalAuditor: '',
    fromPort: '',
    toPort: '',
    hoursOnboard: '',
    linkToPlan: '',
    auditRemarks: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const vesselNameById = (id?: string | number) => {
    const n = Number(id)
    if (!n) return ''
    const v = vessels.find(v => Number(v.id) === n)
    return v?.name || ''
  }

  // prefill when record changes/opens
  useEffect(() => {
    if (!record) return
    const v = vessels.find(vv => Number(vv.id) === Number(record.vesselId))
    const cga = v?.companyGroupAdminId ? String(v?.companyGroupAdminId) : ''
    const ca = v?.companyAdminId ? String(v?.companyAdminId) : ''
    setCompanyId(cga)
    setSubcompanyId(ca)

    setFormData({
      vessel: String(record.vesselId || ''),
      audit: String(record.auditKindId || ''),
      auditType: String(record.auditType || 'DETAILS_TYPE'),
      auditDate: record.auditFromDate || '',
      internalAuditorId: '',
      externalAuditor: record.externalAuditorName || '',
      fromPort: record.fromPortId != null ? String(record.fromPortId) : '',
      toPort: record.toPortId != null ? String(record.toPortId) : '',
      hoursOnboard: record.hoursOnboard != null ? String(record.hoursOnboard) : '',
      linkToPlan: '',
      auditRemarks: record.remarks || '',
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

  // keep vessel in sync with filtered list (when editable)
  useEffect(() => {
    if (disableVesselChange) return
    const current = Number(formData.vessel || 0)
    const ids = new Set(vesselsForModal.map(v => Number(v.id)))
    if (!current || !ids.has(current)) {
      setFormData(prev => ({...prev, vessel: '', internalAuditorId: ''}))
    }
    if (vesselsForModal.length === 1) {
      const onlyId = String(vesselsForModal[0].id)
      setFormData(prev =>
        prev.vessel === onlyId
          ? prev
          : {...prev, vessel: onlyId, internalAuditorId: ''}
      )
    }
  }, [vesselsForModal, disableVesselChange]) // eslint-disable-line

  useEffect(() => {
    setFormData(prev => ({...prev, internalAuditorId: ''}))
  }, [formData.vessel])

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const {name, value} = e.target
    setFormData(prev => ({...prev, [name]: value}))
    if (errors[name]) setErrors(prev => ({...prev, [name]: ''}))
  }

  const validate = () => {
    const er: Record<string, string> = {}
    if (!formData.vessel.trim()) er.vessel = 'Vessel is required'
    if (!formData.audit.trim()) er.audit = 'Audit is required'
    if (!formData.auditType.trim()) er.auditType = 'Audit Type is required'
    if (!formData.auditDate.trim()) er.auditDate = 'Audit Date is required'
    if (
      formData.hoursOnboard &&
      (isNaN(Number(formData.hoursOnboard)) ||
        Number(formData.hoursOnboard) < 0)
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
      audit: formData.audit,
      auditType: formData.auditType,
      auditDate: formData.auditDate,
      internalAuditorId: formData.internalAuditorId || undefined,
      externalAuditor: formData.externalAuditor || undefined,
      fromPort: formData.fromPort || undefined,
      toPort: formData.toPort || undefined,
      hoursOnboard: formData.hoursOnboard
        ? Number(formData.hoursOnboard)
        : undefined,
      linkToPlan: formData.linkToPlan || undefined,
      auditRemarks: formData.auditRemarks || undefined,
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
            <h5 className='modal-title text-dark'>Edit Audit</h5>
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

              {/* Vessel – crew: read-only; others optionally locked */}
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

              {/* Audit kind */}
              <div className='col-md-6'>
                <label className={LABEL_CLS}>
                  Audit <span className='text-danger'>*</span>
                </label>
                <select
                  className={`form-select text-dark ${
                    errors.audit ? 'is-invalid' : ''
                  }`}
                  name='audit'
                  value={formData.audit}
                  onChange={handleChange}
                >
                  <option value=''>Select Audit</option>
                  {kinds.map(k => (
                    <option key={k.id} value={String(k.id)}>
                      {k.name}
                    </option>
                  ))}
                </select>
                {errors.audit && (
                  <div className='invalid-feedback'>{errors.audit}</div>
                )}
              </div>

              {/* Audit Type */}
              <div className='col-md-6'>
                <label className={LABEL_CLS}>
                  Audit Type <span className='text-danger'>*</span>
                </label>
                <select
                  className={`form-select text-dark ${
                    errors.auditType ? 'is-invalid' : ''
                  }`}
                  name='auditType'
                  value={formData.auditType}
                  onChange={handleChange}
                >
                  {(['ATTACHMENT_TYPE', 'DETAILS_TYPE'] as const).map(t => (
                    <option key={t} value={t}>
                      {t.replace('_', ' ')}
                    </option>
                  ))}
                </select>
                {errors.auditType && (
                  <div className='invalid-feedback'>
                    {errors.auditType}
                  </div>
                )}
              </div>

              {/* Audit Date */}
              <div className='col-md-6'>
                <label className={LABEL_CLS}>
                  Audit Date <span className='text-danger'>*</span>
                </label>
                <input
                  type='date'
                  className={`form-control text-dark ${
                    errors.auditDate ? 'is-invalid' : ''
                  }`}
                  name='auditDate'
                  value={formData.auditDate}
                  onChange={handleChange}
                />
                {errors.auditDate && (
                  <div className='invalid-feedback'>
                    {errors.auditDate}
                  </div>
                )}
              </div>

              {/* Internal Auditor */}
              <div className='col-md-6'>
                <label className={LABEL_CLS}>Internal Auditor</label>
                <select
                  className='form-select text-dark'
                  name='internalAuditorId'
                  value={formData.internalAuditorId}
                  onChange={handleChange}
                  disabled={!formData.vessel || crewsForModal.length === 0}
                >
                  <option value=''>
                    {formData.vessel
                      ? crewsForModal.length
                        ? 'Select Internal Auditor'
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

              {/* External Auditor */}
              <div className='col-md-6'>
                <label className={LABEL_CLS}>External Auditor</label>
                <input
                  type='text'
                  className='form-control text-dark'
                  name='externalAuditor'
                  value={formData.externalAuditor}
                  onChange={handleChange}
                  placeholder='Enter external auditor name'
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
                <label className={LABEL_CLS}>Audit Remarks</label>
                <RichTextEditor
                  value={formData.auditRemarks}
                  onChange={html => {
                    setFormData(prev => ({...prev, auditRemarks: html}))
                    if (errors.auditRemarks) {
                      setErrors(prev => ({...prev, auditRemarks: ''}))
                    }
                  }}
                  placeholder='Update audit notes, bullets, links…'
                  invalid={Boolean(errors.auditRemarks)}
                  height={220}
                />
                {errors.auditRemarks && (
                  <div className='invalid-feedback d-block'>
                    {errors.auditRemarks}
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
