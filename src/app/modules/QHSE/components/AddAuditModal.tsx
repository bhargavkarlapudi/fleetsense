// AddAuditModal.tsx
import React, {FC, useEffect, useState} from 'react'
import type {QhseAuditKind, Port, VesselLite, CrewLite} from '../core/_models'
import RichTextEditor from '../components/RichTextEditor'
import {listAvailableAuditPlans, listUnlinkedPlans} from '../core/_requests'

export type PlanOption = {id: number; label: string}

export type SubmitShape = {
  vessel: string
  audit: string
  auditType: string
  auditDate: string
  /** free-text internal auditor name (no FK) */
  internalAuditorName?: string
  externalAuditorName?: string
  fromPort?: string
  toPort?: string
  hoursOnboard?: number
  linkToPlan?: string
  auditRemarks?: string
}

interface AddAuditModalProps {
  visible: boolean
  onClose: () => void
  onSubmit: (data: SubmitShape, saveAndAddNew: boolean) => void
  vessels: VesselLite[]
  kinds: QhseAuditKind[]
  ports: Port[]
  planOptions?: PlanOption[]
  crews: CrewLite[]
  companies: Array<{id: number; name: string}>
  subcompanies: Array<{id: number; name: string; companyId: number}>
  rankMap?: Record<number, string>

  /** When opened from a Plan cell */
  prefill?: {
    vesselId?: number
    auditKindId?: number
    planId?: number
    /** any date in the target month (YYYY-MM-DD) */
    planMonthDate?: string
  }

  /** lock Company/Subcompany/Vessel/Kind & Plan fields (from Plan view) */
  lockPlanContext?: boolean

  /** NEW: role-based behaviour just like Defect */
  showCompanyFilters?: boolean
  isCrew?: boolean              // role 4
  defaultVesselId?: number      // auto-select for crew
}

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
  maxHeight: '85vh',
  display: 'flex',
  flexDirection: 'column',
}

const MODAL_BODY_STYLE: React.CSSProperties = {
  flex: '1 1 auto',
  overflowY: 'auto',
}

const AddAuditModal: FC<AddAuditModalProps> = ({
  visible,
  onClose,
  onSubmit,
  vessels,
  kinds,
  ports,
  planOptions = [],
  crews,
  companies,
  subcompanies,
  rankMap = {},
  prefill,
  lockPlanContext,
  showCompanyFilters = true,
  isCrew = false,
  defaultVesselId,
}) => {
  const [formData, setFormData] = useState({
    vessel: isCrew && defaultVesselId ? String(defaultVesselId) : '',
    audit: '',
    auditType: '',
    auditDate: '',
    internalAuditorName: '',
    externalAuditorName: '',
    fromPort: '',
    toPort: '',
    hoursOnboard: '',
    linkToPlan: '',
    auditRemarks: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [planMonthIso, setPlanMonthIso] = useState<string | null>(null)

  const sameMonth = (isoA?: string, isoB?: string) => {
    if (!isoA || !isoB) return false
    const a = new Date(isoA)
    const b = new Date(isoB)
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
  }

  const firstDayOfMonth = (iso: string) => {
    const d = new Date(iso)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    return `${yyyy}-${mm}-01`
  }

  const vesselNameById = (id?: number) =>
    (id != null && vessels.find(v => Number(v.id) === Number(id))?.name) || '—'

  const kindNameById = (id?: number) =>
    (id != null && kinds.find(k => Number(k.id) === Number(id))?.name) || '—'

  // Prefill when opened from Plan Actions
  useEffect(() => {
    if (!prefill) return

    const month01 = prefill.planMonthDate ? firstDayOfMonth(prefill.planMonthDate) : ''
    if (month01) setPlanMonthIso(month01)

    setFormData(prev => ({
      ...prev,
      vessel: prefill.vesselId ? String(prefill.vesselId) : prev.vessel,
      audit: prefill.auditKindId ? String(prefill.auditKindId) : prev.audit,
      auditDate: month01 || prev.auditDate,
      linkToPlan: prefill.planId ? String(prefill.planId) : prev.linkToPlan,
    }))

    if (prefill.vesselId) {
      const v = vessels.find(vv => Number(vv.id) === Number(prefill.vesselId))
      if (v) {
        setCompanyId(v.companyGroupAdminId ? String(v.companyGroupAdminId) : '')
        setSubcompanyId(v.companyAdminId ? String(v.companyAdminId) : '')
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill])

  // Crew: auto-set vesselId from default if not already set
  useEffect(() => {
    if (!isCrew || !defaultVesselId) return
    setFormData(prev =>
      prev.vessel
        ? prev
        : {
            ...prev,
            vessel: String(defaultVesselId),
          }
    )
  }, [isCrew, defaultVesselId])

  // local cascade
  const [companyId, setCompanyId] = useState<string>('') // CGA
  const [subcompanyId, setSubcompanyId] = useState<string>('') // Company

  const [unlinkedPlans, setUnlinkedPlans] = useState<any[]>([])
  const [availablePlans, setAvailablePlans] = useState<Array<{id: number; label: string}>>([])

  // Load unlinked plans for current year
  useEffect(() => {
    if (!visible) return
    ;(async () => {
      try {
        const year = new Date().getFullYear()
        const list = await listUnlinkedPlans({year})
        setUnlinkedPlans(Array.isArray(list) ? list : [])
      } catch {
        setUnlinkedPlans([])
      }
    })()
  }, [visible])

  // If a plan is selected, keep it ONLY if vessel+kind+month stay consistent.
  useEffect(() => {
    const pid = formData.linkToPlan
    if (!pid) return
    const chosen = unlinkedPlans.find(p => String(p.id) === String(pid))
    if (!chosen) {
      setFormData(prev => ({...prev, linkToPlan: ''}))
      return
    }

    const vOk = String(formData.vessel || '') === String(chosen.vesselId)
    const kOk = String(formData.audit || '') === String(chosen.auditKindId)
    const monthOk =
      !!formData.auditDate &&
      sameMonth(firstDayOfMonth(formData.auditDate), firstDayOfMonth(chosen.planDate))

    if (!vOk || !kOk || !monthOk) {
      setFormData(prev => ({...prev, linkToPlan: ''}))
    }
  }, [formData.vessel, formData.audit, formData.auditDate, formData.linkToPlan, unlinkedPlans])

  // Derive plan dropdown options
  useEffect(() => {
    const v = Number(formData.vessel || 0)
    const k = Number(formData.audit || 0)
    const iso = formData.auditDate

    if (v && k && iso) {
      const forDate = firstDayOfMonth(iso)
      ;(async () => {
        try {
          const res = await listAvailableAuditPlans({vesselId: v, auditKindId: k, forDate})
          const opts = (Array.isArray(res) ? res : []).map((p: any) => ({
            id: Number(p.id),
            label: `${p.planDate} • ${vesselNameById(p.vesselId)} • ${kindNameById(
              p.auditKindId
            )}`,
          }))
          setAvailablePlans(opts)
        } catch {
          setAvailablePlans([])
        }
      })()
      return
    }

    let pool = [...unlinkedPlans]
    if (v) pool = pool.filter((p: any) => Number(p.vesselId) === v)
    if (k) pool = pool.filter((p: any) => Number(p.auditKindId) === k)
    if (iso) {
      const month01 = firstDayOfMonth(iso)
      pool = pool.filter((p: any) => sameMonth(p.planDate, month01))
    }

    const opts = pool.map((p: any) => ({
      id: Number(p.id),
      label: `${p.planDate} • ${vesselNameById(p.vesselId)} • ${kindNameById(p.auditKindId)}`,
    }))
    setAvailablePlans(opts)
  }, [unlinkedPlans, vessels, kinds, formData.vessel, formData.audit, formData.auditDate])

  const vesselsForModal = React.useMemo(() => {
    let list = vessels
    if (companyId) {
      const cid = Number(companyId)
      list = list.filter(
        v => Number((v as any).companyGroupAdminId ?? (v as any).companyGroupId) === cid
      )
    }
    if (subcompanyId) {
      const scid = Number(subcompanyId)
      list = list.filter(
        v => Number((v as any).companyAdminId ?? (v as any).companyId) === scid
      )
    }
    return list
  }, [vessels, companyId, subcompanyId])

  const subcompaniesForCompany = React.useMemo(() => {
    if (!companyId) return []
    const cid = Number(companyId)
    return subcompanies.filter(sc => sc.companyId === cid)
  }, [subcompanies, companyId])

  const hasSubcompaniesForCompany = subcompaniesForCompany.length > 0

  // For non-crew: keep vessel in sync with filters & prefill
  useEffect(() => {
    if (isCrew) return

    const ids = new Set(vesselsForModal.map(v => Number(v.id)))
    const current = Number(formData.vessel || 0)

    if (!current || !ids.has(current)) {
      setFormData(prev => ({...prev, vessel: ''}))
    }

    if (!formData.vessel && vesselsForModal.length === 1) {
      const onlyId = String(vesselsForModal[0].id)
      setFormData(prev => ({...prev, vessel: onlyId}))
    }

    if (!formData.vessel && prefill?.vesselId && ids.has(Number(prefill.vesselId))) {
      setFormData(prev => ({...prev, vessel: String(prefill.vesselId)}))
    }
  }, [vesselsForModal, prefill, isCrew, formData.vessel])

  // Clear internal auditor when vessel changes
  useEffect(() => {
    setFormData(prev => ({...prev, internalAuditorName: ''}))
  }, [formData.vessel])

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const {name, value} = e.target

    if (name === 'linkToPlan') {
      if (!value) {
        setFormData(prev => ({...prev, linkToPlan: ''}))
        return
      }
      const chosen = unlinkedPlans.find(p => String(p.id) === String(value))
      if (chosen) {
        const month01 = firstDayOfMonth(chosen.planDate)
        setFormData(prev => ({
          ...prev,
          linkToPlan: String(chosen.id),
          vessel: String(chosen.vesselId ?? prev.vessel),
          audit: String(chosen.auditKindId ?? prev.audit),
          auditDate: month01 || prev.auditDate,
        }))
        if (errors.linkToPlan) setErrors(prev => ({...prev, linkToPlan: ''}))
        return
      }
    }

    setFormData(prev => ({...prev, [name]: value}))
    if (errors[name]) setErrors(prev => ({...prev, [name]: ''}))
  }

  const validateForm = () => {
    const er: Record<string, string> = {}
    if (!formData.vessel.trim()) er.vessel = 'Vessel is required'
    if (!formData.audit.trim()) er.audit = 'Audit is required'
    if (!formData.auditType.trim()) er.auditType = 'Audit Type is required'
    if (!formData.auditDate.trim()) er.auditDate = 'Audit Date is required'
    if (
      formData.hoursOnboard &&
      (isNaN(Number(formData.hoursOnboard)) || Number(formData.hoursOnboard) < 0)
    ) {
      er.hoursOnboard = 'Hours Onboard must be a positive number'
    }

    setErrors(er)
    return Object.keys(er).length === 0
  }

  const submit = (saveAndAddNew = false) => {
    if (!validateForm()) return
    onSubmit(
      {
        vessel: formData.vessel,
        audit: formData.audit,
        auditType: formData.auditType,
        auditDate: formData.auditDate,
        internalAuditorName: formData.internalAuditorName || undefined,
        externalAuditorName: formData.externalAuditorName || undefined,
        fromPort: formData.fromPort || undefined,
        toPort: formData.toPort || undefined,
        hoursOnboard: formData.hoursOnboard ? Number(formData.hoursOnboard) : undefined,
        linkToPlan: formData.linkToPlan || undefined,
        auditRemarks: formData.auditRemarks || undefined,
      },
      saveAndAddNew
    )

    if (saveAndAddNew) {
      setFormData({
        vessel: isCrew && defaultVesselId ? String(defaultVesselId) : '',
        audit: '',
        auditType: '',
        auditDate: '',
        internalAuditorName: '',
        externalAuditorName: '',
        fromPort: '',
        toPort: '',
        hoursOnboard: '',
        linkToPlan: '',
        auditRemarks: '',
      })
      setErrors({})
    } else {
      onClose()
    }
  }

  const close = () => {
    setFormData({
      vessel: isCrew && defaultVesselId ? String(defaultVesselId) : '',
      audit: '',
      auditType: '',
      auditDate: '',
      internalAuditorName: '',
      externalAuditorName: '',
      fromPort: '',
      toPort: '',
      hoursOnboard: '',
      linkToPlan: '',
      auditRemarks: '',
    })
    setErrors({})
    onClose()
  }

  if (!visible) return null

  const crewVesselDisplayId =
    formData.vessel || (defaultVesselId ? String(defaultVesselId) : '')

  return (
    <div className='modal fade show' tabIndex={-1} style={WRAP_STYLE}>
      <div
        className='modal-dialog modal-xl modal-dialog-centered'
        role='dialog'
        style={MODAL_DIALOG_STYLE}
      >
        <div className='modal-content bg-white text-dark' style={MODAL_CONTENT_STYLE}>
          <div className='modal-header'>
            <h5 className='modal-title text-dark'>Add New Audit Details</h5>
            <button type='button' className='btn-close' onClick={close} />
          </div>

          <div className='modal-body' style={MODAL_BODY_STYLE}>
            <div className='row g-3'>
              {/* Company */}
              {showCompanyFilters && (
                <div className='col-md-6'>
                  <label className={LABEL_CLS}>Company</label>
                  {lockPlanContext ? (
                    <>
                      <div
                        className='form-control'
                        style={{background: '#f8f9fa'}}
                        title='Locked by selected Plan'
                      >
                        {(() => {
                          const id = Number(companyId || 0)
                          const name = companies.find(c => c.id === id)?.name || '—'
                          return name
                        })()}
                      </div>
                      <input type='hidden' name='companyId' value={companyId} />
                    </>
                  ) : (
                    <select
                      className='form-select text-dark'
                      value={companyId}
                      onChange={e => {
                        setCompanyId(e.target.value)
                        setSubcompanyId('')
                      }}
                    >
                      <option value=''>All Companies</option>
                      {companies.map(c => (
                        <option key={c.id} value={String(c.id)}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Subcompany */}
              {showCompanyFilters && Boolean(companyId) && hasSubcompaniesForCompany && (
                <div className='col-md-6'>
                  <label className={LABEL_CLS}>Subcompany</label>
                  {lockPlanContext ? (
                    <>
                      <div
                        className='form-control'
                        style={{background: '#f8f9fa'}}
                        title='Locked by selected Plan'
                      >
                        {(() => {
                          const id = Number(subcompanyId || 0)
                          const name =
                            subcompaniesForCompany.find(sc => sc.id === id)?.name || '—'
                          return name
                        })()}
                      </div>
                      <input type='hidden' name='subcompanyId' value={subcompanyId} />
                    </>
                  ) : (
                    <select
                      className='form-select text-dark'
                      value={subcompanyId}
                      onChange={e => setSubcompanyId(e.target.value)}
                    >
                      <option value=''>All Subcompanies</option>
                      {subcompaniesForCompany.map(sc => (
                        <option key={sc.id} value={String(sc.id)}>
                          {sc.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Vessel */}
              <div className='col-md-6'>
                <label className={LABEL_CLS}>
                  Vessel <span className='text-danger'>*</span>
                </label>

                {isCrew ? (
                  <>
                    <div
                      className='form-control'
                      style={{background: '#f8f9fa'}}
                      title='Auto-selected from your profile'
                    >
                      {crewVesselDisplayId
                        ? vesselNameById(Number(crewVesselDisplayId))
                        : '—'}
                    </div>
                    <input
                      type='hidden'
                      name='vessel'
                      value={crewVesselDisplayId}
                    />
                  </>
                ) : lockPlanContext ? (
                  <>
                    <div
                      className='form-control'
                      style={{background: '#f8f9fa'}}
                      title='Locked by selected Plan'
                    >
                      {vesselNameById(Number(formData.vessel))}
                    </div>
                    <input type='hidden' name='vessel' value={formData.vessel} />
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
                    onChange={handleInputChange}
                  >
                    <option value=''>Select Vessel</option>
                    {vesselsForModal.map(v => (
                      <option key={v.id} value={String(v.id)}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                )}
                {errors.vessel && <div className='invalid-feedback'>{errors.vessel}</div>}
              </div>

              {/* Audit Kind */}
              <div className='col-md-6'>
                <label className={LABEL_CLS}>
                  Audit <span className='text-danger'>*</span>
                </label>
                {lockPlanContext ? (
                  <>
                    <div
                      className='form-control'
                      style={{background: '#f8f9fa'}}
                      title='Locked by selected Plan'
                    >
                      {kindNameById(Number(formData.audit))}
                    </div>
                    <input type='hidden' name='audit' value={formData.audit} />
                  </>
                ) : (
                  <select
                    className={`form-select text-dark ${
                      errors.audit ? 'is-invalid' : ''
                    }`}
                    name='audit'
                    value={formData.audit}
                    onChange={handleInputChange}
                  >
                    <option value=''>Select Audit</option>
                    {kinds.map(k => (
                      <option key={k.id} value={String(k.id)}>
                        {k.name}
                      </option>
                    ))}
                  </select>
                )}
                {errors.audit && <div className='invalid-feedback'>{errors.audit}</div>}
              </div>

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
                  onChange={handleInputChange}
                >
                  <option value=''>Select Audit Type</option>
                  {(['ATTACHMENT_TYPE', 'DETAILS_TYPE'] as const).map(t => (
                    <option key={t} value={t}>
                      {t.replace('_', ' ')}
                    </option>
                  ))}
                </select>
                {errors.auditType && (
                  <div className='invalid-feedback'>{errors.auditType}</div>
                )}
              </div>

              {planMonthIso &&
                formData.auditDate &&
                !sameMonth(formData.auditDate, planMonthIso) && (
                  <div className='col-12'>
                    <div className='alert alert-warning py-2 px-3'>
                      <strong>Heads up:</strong> You picked <code>{formData.auditDate}</code>{' '}
                      but this plan is for <code>{planMonthIso}</code> (month/year). If
                      this is not intentional, select the 1st of that month to match the
                      plan.
                    </div>
                  </div>
                )}

              <div className='col-md-6'>
                <label className={LABEL_CLS}>
                  Audit Date <span className='text-danger'>*</span>
                  {planMonthIso && (
                    <span className='ms-2 text-muted'>(Plan month: {planMonthIso})</span>
                  )}
                </label>
                <input
                  type='date'
                  className={`form-control text-dark ${
                    errors.auditDate ? 'is-invalid' : ''
                  }`}
                  name='auditDate'
                  value={formData.auditDate}
                  onChange={handleInputChange}
                />
                {errors.auditDate && (
                  <div className='invalid-feedback'>{errors.auditDate}</div>
                )}
              </div>

              {/* Internal Auditor (free text) */}
              <div className='col-md-6'>
                <label className={LABEL_CLS}>Internal Auditor</label>
                <input
                  type='text'
                  className='form-control text-dark'
                  name='internalAuditorName'
                  value={formData.internalAuditorName}
                  onChange={handleInputChange}
                  placeholder='Enter internal auditor name'
                />
              </div>

              <div className='col-md-6'>
                <label className={LABEL_CLS}>External Auditor</label>
                <input
                  type='text'
                  className='form-control text-dark'
                  name='externalAuditorName'
                  value={formData.externalAuditorName}
                  onChange={handleInputChange}
                  placeholder='Enter external auditor name'
                />
              </div>

              <div className='col-md-6'>
                <label className={LABEL_CLS}>From Port</label>
                <select
                  className='form-select text-dark'
                  name='fromPort'
                  value={formData.fromPort}
                  onChange={handleInputChange}
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
                  onChange={handleInputChange}
                >
                  <option value=''>Select To Port</option>
                  {ports.map(p => (
                    <option key={p.id} value={String(p.id)}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className='col-md-6'>
                <label className={LABEL_CLS}>Hours Onboard</label>
                <input
                  type='number'
                  className={`form-control text-dark ${
                    errors.hoursOnboard ? 'is-invalid' : ''
                  }`}
                  name='hoursOnboard'
                  value={formData.hoursOnboard}
                  onChange={handleInputChange}
                  min='0'
                  step='0.5'
                />
                {errors.hoursOnboard && (
                  <div className='invalid-feedback'>{errors.hoursOnboard}</div>
                )}
              </div>

              <div className='col-md-6'>
                <label className={LABEL_CLS}>Link to Plan</label>
                {lockPlanContext && formData.linkToPlan ? (
                  <>
                    <div
                      className='form-control'
                      style={{background: '#f8f9fa'}}
                      title='Locked by selected Plan'
                    >
                      {(() => {
                        const chosen = availablePlans.find(
                          p => String(p.id) === String(formData.linkToPlan)
                        )
                        if (chosen) return chosen.label
                        const raw = (unlinkedPlans || []).find(
                          p => String(p.id) === String(formData.linkToPlan)
                        )
                        if (raw)
                          return `${raw.planDate} • ${vesselNameById(
                            raw.vesselId
                          )} • ${kindNameById(raw.auditKindId)}`
                        return '—'
                      })()}
                    </div>
                    <input type='hidden' name='linkToPlan' value={formData.linkToPlan} />
                  </>
                ) : (
                  <select
                    className='form-select text-dark'
                    name='linkToPlan'
                    value={formData.linkToPlan}
                    onChange={handleInputChange}
                  >
                    <option value=''>Select Plan</option>
                    {availablePlans.map(plan => (
                      <option key={plan.id} value={String(plan.id)}>
                        {plan.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>

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
                  placeholder='Add notes, bullets, links…'
                  invalid={Boolean(errors.auditRemarks)}
                  height={220}
                />
                {errors.auditRemarks && (
                  <div className='invalid-feedback d-block'>
                    {errors.auditRemarks}
                  </div>
                )}
                <div className='form-text text-muted'>
                  You can format text, add lists, links, and quotes.
                </div>
              </div>
            </div>
          </div>

          <div className='modal-footer'>
            <button type='button' className='btn btn-light btn-sm' onClick={close}>
              Cancel
            </button>
            <button
              type='button'
              className='btn btn-secondary btn-sm me-2'
              onClick={() => submit(true)}
            >
              Save & Add New
            </button>
            <button
              type='button'
              className='btn btn_primary'
              onClick={() => submit(false)}
            >
              Save & Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AddAuditModal
