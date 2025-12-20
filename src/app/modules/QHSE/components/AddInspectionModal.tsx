// AddInspectionModal.tsx
import React, {FC, useEffect, useState} from 'react'
import type {QhseInspectionKind, Port, VesselLite, CrewLite} from '../core/_models'
import RichTextEditor from '../components/RichTextEditor'
import {listAvailablePlans, listUnlinkedPlans} from '../core/_requests'

export type PlanOption = {id: number; label: string}

export type SubmitShape = {
  vessel: string
  inspection: string
  inspectionType: string
  inspectionDate: string
  /** free-text internal inspector name (no FK) */
  internalInspectorName?: string
  externalInspector?: string
  fromPort?: string
  toPort?: string
  hoursOnboard?: number
  linkToPlan?: string
  inspectionRemarks?: string
}

interface AddInspectionModalProps {
  visible: boolean
  onClose: () => void
  onSubmit: (data: SubmitShape, saveAndAddNew: boolean) => void
  vessels: VesselLite[]
  kinds: QhseInspectionKind[]
  ports: Port[]
  planOptions?: PlanOption[]
  crews: CrewLite[]
  companies: Array<{id: number; name: string}>
  subcompanies: Array<{id: number; name: string; companyId: number}>
  rankMap?: Record<number, string>

  /** When opened from a Plan cell */
  prefill?: {
    vesselId?: number
    inspectionKindId?: number
    planId?: number
    /** any date in the target month (YYYY-MM-DD) */
    planMonthDate?: string
  }

  /** lock Company/Subcompany/Vessel/Kind & Plan fields */
  lockPlanContext?: boolean

  /** NEW: role-based behaviour */
  showCompanyFilters?: boolean
  isCrew?: boolean
  defaultVesselId?: number
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

const AddInspectionModal: FC<AddInspectionModalProps> = ({
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
    inspection: '',
    inspectionType: '',
    inspectionDate: '',
    internalInspectorName: '',
    externalInspector: '',
    fromPort: '',
    toPort: '',
    hoursOnboard: '',
    linkToPlan: '',
    inspectionRemarks: '',
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
      inspection: prefill.inspectionKindId ? String(prefill.inspectionKindId) : prev.inspection,
      inspectionDate: month01 || prev.inspectionDate,
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

  // Crew: auto-set vesselId from default
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

  // Load unlinked plans
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

  // Plan consistency
  useEffect(() => {
    const pid = formData.linkToPlan
    if (!pid) return
    const chosen = unlinkedPlans.find(p => String(p.id) === String(pid))
    if (!chosen) {
      setFormData(prev => ({...prev, linkToPlan: ''}))
      return
    }

    const vOk = String(formData.vessel || '') === String(chosen.vesselId)
    const kOk = String(formData.inspection || '') === String(chosen.inspectionKindId)
    const monthOk =
      !!formData.inspectionDate &&
      sameMonth(firstDayOfMonth(formData.inspectionDate), firstDayOfMonth(chosen.planDate))

    if (!vOk || !kOk || !monthOk) {
      setFormData(prev => ({...prev, linkToPlan: ''}))
    }
  }, [
    formData.vessel,
    formData.inspection,
    formData.inspectionDate,
    formData.linkToPlan,
    unlinkedPlans,
  ])

  // Derive plan dropdown options
  useEffect(() => {
    const v = Number(formData.vessel || 0)
    const k = Number(formData.inspection || 0)
    const iso = formData.inspectionDate

    if (v && k && iso) {
      const forDate = firstDayOfMonth(iso)
      ;(async () => {
        try {
          const res = await listAvailablePlans({vesselId: v, inspectionKindId: k, forDate})
          const opts = (Array.isArray(res) ? res : []).map((p: any) => ({
            id: Number(p.id),
            label: `${p.planDate} • ${vesselNameById(p.vesselId)} • ${kindNameById(
              p.inspectionKindId
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
    if (k) pool = pool.filter((p: any) => Number(p.inspectionKindId) === k)
    if (iso) {
      const month01 = firstDayOfMonth(iso)
      pool = pool.filter((p: any) => sameMonth(p.planDate, month01))
    }

    const opts = pool.map((p: any) => ({
      id: Number(p.id),
      label: `${p.planDate} • ${vesselNameById(p.vesselId)} • ${kindNameById(
        p.inspectionKindId
      )}`,
    }))
    setAvailablePlans(opts)
  }, [unlinkedPlans, vessels, kinds, formData.vessel, formData.inspection, formData.inspectionDate])

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

  // Non-crew: keep vessel in sync with filters & prefill
  useEffect(() => {
    if (isCrew) return

    const ids = new Set(vesselsForModal.map(v => Number(v.id)))
    const current = Number(formData.vessel || 0)

    if (!current || !ids.has(current)) {
      setFormData(prev => ({...prev, vessel: '', internalInspectorName: ''}))
    }

    if (!formData.vessel && vesselsForModal.length === 1) {
      const onlyId = String(vesselsForModal[0].id)
      setFormData(prev => ({...prev, vessel: onlyId, internalInspectorName: ''}))
    }

    if (!formData.vessel && prefill?.vesselId && ids.has(Number(prefill.vesselId))) {
      setFormData(prev => ({
        ...prev,
        vessel: String(prefill.vesselId),
        internalInspectorName: '',
      }))
    }
  }, [vesselsForModal, prefill, isCrew, formData.vessel])

  // Clear internal inspector name on vessel change
  useEffect(() => {
    setFormData(prev => ({...prev, internalInspectorName: ''}))
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
          inspection: String(chosen.inspectionKindId ?? prev.inspection),
          inspectionDate: month01 || prev.inspectionDate,
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

  const submit = (saveAndAddNew = false) => {
    if (!validateForm()) return
    onSubmit(
      {
        vessel: formData.vessel,
        inspection: formData.inspection,
        inspectionType: formData.inspectionType,
        inspectionDate: formData.inspectionDate,
        internalInspectorName: formData.internalInspectorName || undefined,
        externalInspector: formData.externalInspector || undefined,
        fromPort: formData.fromPort || undefined,
        toPort: formData.toPort || undefined,
        hoursOnboard: formData.hoursOnboard ? Number(formData.hoursOnboard) : undefined,
        linkToPlan: formData.linkToPlan || undefined,
        inspectionRemarks: formData.inspectionRemarks || undefined,
      },
      saveAndAddNew
    )

    if (saveAndAddNew) {
      setFormData({
        vessel: isCrew && defaultVesselId ? String(defaultVesselId) : '',
        inspection: '',
        inspectionType: '',
        inspectionDate: '',
        internalInspectorName: '',
        externalInspector: '',
        fromPort: '',
        toPort: '',
        hoursOnboard: '',
        linkToPlan: '',
        inspectionRemarks: '',
      })
      setErrors({})
    } else {
      onClose()
    }
  }

  const close = () => {
    setFormData({
      vessel: isCrew && defaultVesselId ? String(defaultVesselId) : '',
      inspection: '',
      inspectionType: '',
      inspectionDate: '',
      internalInspectorName: '',
      externalInspector: '',
      fromPort: '',
      toPort: '',
      hoursOnboard: '',
      linkToPlan: '',
      inspectionRemarks: '',
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
            <h5 className='modal-title text-dark'>Add New Inspection Details</h5>
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

              {/* Inspection Kind */}
              <div className='col-md-6'>
                <label className={LABEL_CLS}>
                  Inspection <span className='text-danger'>*</span>
                </label>
                {lockPlanContext ? (
                  <>
                    <div
                      className='form-control'
                      style={{background: '#f8f9fa'}}
                      title='Locked by selected Plan'
                    >
                      {kindNameById(Number(formData.inspection))}
                    </div>
                    <input type='hidden' name='inspection' value={formData.inspection} />
                  </>
                ) : (
                  <select
                    className={`form-select text-dark ${
                      errors.inspection ? 'is-invalid' : ''
                    }`}
                    name='inspection'
                    value={formData.inspection}
                    onChange={handleInputChange}
                  >
                    <option value=''>Select Inspection</option>
                    {kinds.map(k => (
                      <option key={k.id} value={String(k.id)}>
                        {k.name}
                      </option>
                    ))}
                  </select>
                )}
                {errors.inspection && (
                  <div className='invalid-feedback'>{errors.inspection}</div>
                )}
              </div>

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
                  onChange={handleInputChange}
                >
                  <option value=''>Select Inspection Type</option>
                  {(['ATTACHMENT_TYPE', 'DETAILS_TYPE'] as const).map(t => (
                    <option key={t} value={t}>
                      {t.replace('_', ' ')}
                    </option>
                  ))}
                </select>
                {errors.inspectionType && (
                  <div className='invalid-feedback'>{errors.inspectionType}</div>
                )}
              </div>

              {planMonthIso &&
                formData.inspectionDate &&
                !sameMonth(formData.inspectionDate, planMonthIso) && (
                  <div className='col-12'>
                    <div className='alert alert-warning py-2 px-3'>
                      <strong>Heads up:</strong> You picked{' '}
                      <code>{formData.inspectionDate}</code> but this plan is for{' '}
                      <code>{planMonthIso}</code> (month/year). If this is not
                      intentional, select the 1st of that month to match the plan.
                    </div>
                  </div>
                )}

              <div className='col-md-6'>
                <label className={LABEL_CLS}>
                  Inspection Date <span className='text-danger'>*</span>
                  {planMonthIso && (
                    <span className='ms-2 text-muted'>(Plan month: {planMonthIso})</span>
                  )}
                </label>
                <input
                  type='date'
                  className={`form-control text-dark ${
                    errors.inspectionDate ? 'is-invalid' : ''
                  }`}
                  name='inspectionDate'
                  value={formData.inspectionDate}
                  onChange={handleInputChange}
                />
                {errors.inspectionDate && (
                  <div className='invalid-feedback'>{errors.inspectionDate}</div>
                )}
              </div>

              {/* Internal Inspector (free-text) */}
              <div className='col-md-6'>
                <label className={LABEL_CLS}>Internal Inspector</label>
                <input
                  type='text'
                  className='form-control text-dark'
                  name='internalInspectorName'
                  value={formData.internalInspectorName}
                  onChange={handleInputChange}
                  placeholder='Enter internal inspector name'
                />
              </div>

              <div className='col-md-6'>
                <label className={LABEL_CLS}>External Inspector</label>
                <input
                  type='text'
                  className='form-control text-dark'
                  name='externalInspector'
                  value={formData.externalInspector}
                  onChange={handleInputChange}
                  placeholder='Enter external inspector name'
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
                          )} • ${kindNameById(raw.inspectionKindId)}`
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
                <label className={LABEL_CLS}>Inspection Remarks</label>
                <RichTextEditor
                  value={formData.inspectionRemarks}
                  onChange={html => {
                    setFormData(prev => ({...prev, inspectionRemarks: html}))
                    if (errors.inspectionRemarks) {
                      setErrors(prev => ({...prev, inspectionRemarks: ''}))
                    }
                  }}
                  placeholder='Add notes, bullets, links…'
                  invalid={Boolean(errors.inspectionRemarks)}
                  height={220}
                />
                {errors.inspectionRemarks && (
                  <div className='invalid-feedback d-block'>
                    {errors.inspectionRemarks}
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

export default AddInspectionModal
