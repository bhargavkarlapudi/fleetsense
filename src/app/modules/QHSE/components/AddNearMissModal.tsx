// src/app/modules/QHSE/components/AddNearMissModal.tsx
import React, {FC, useEffect, useMemo, useState} from 'react'
import {KTSVG} from '../../../../_metronic/helpers'
import type {Vessel} from '../../Management/core/_models'
import type {
  NearMissOccurrenceType,
  NearMissLocationOfOccurrence,
  NearMissSubstandardAct,
  NearMissSubstandardCondition,
} from '../core/_models'
import {toast} from 'react-toastify'

export type NearMissSubmitShape = {
  vesselId: string
  locationPosition: string
  reportIssuedBy: string
  dateIssued: string

  dateOfOccurrence: string
  timeOfOccurrence: string

  reportedBy: string
  reportedTo: string
  dateReported: string
  timeReported: string

  occurrenceTypes: NearMissOccurrenceType[]
  personalInjuryFormCompleted: boolean | null
  anyStatementsAttached: boolean | null

  locationOfOccurrence: NearMissLocationOfOccurrence[]

  descriptionOfOccurrence: string

  substandardActs: NearMissSubstandardAct[]
  substandardConditions: NearMissSubstandardCondition[]

  personsInjured: string
  personsInvolved: string
  personsWitness: string
  typeOfInjury: string

  immediateBasicCause: string
  rootCause: string
  correctiveActionsProposed: string
  preventativeActionsProposed: string

  objectiveEvidence: string
  dpaConclusionsAndRecommendations: string

  supportingFiles: File[]
}

type CompanyGroup = {id: number; name: string}
type Subcompany = {id: number; name: string; companyId: number}

type Props = {
  visible: boolean
  isCrew: boolean
  vessels: Vessel[]
  companies: CompanyGroup[]
  subcompanies: Subcompany[]
  isTopLevel: boolean
  /** For non–top-level users, this is the fixed company (like defect list) */
  effectiveCompanyId?: number | null
  defaultVesselId?: number
  onCancel: () => void
  onSubmit: (form: NearMissSubmitShape) => Promise<void> | void
}

const occurrenceOptions: {value: NearMissOccurrenceType; label: string}[] = [
  {value: 'ACCIDENT', label: 'Accident'},
  {value: 'INCIDENT', label: 'Incident'},
  {value: 'NEAR_MISS', label: 'Near miss'},
  {value: 'HIGH_SEVERITY_NEAR_MISS', label: 'High severity near miss'},
]

const locationOptions: {value: NearMissLocationOfOccurrence; label: string}[] = [
  {value: 'ACCOMMODATION', label: 'Accommodation'},
  {value: 'BRIDGE', label: 'Bridge'},
  {value: 'ASHORE', label: 'Ashore'},
  {value: 'ENGINE_ROOM_MACHINERY_SPACES', label: 'Engine Room / Machinery Spaces'},
  {value: 'DECK', label: 'Deck'},
  {value: 'ALOFT_OVERBOARD', label: 'Aloft / Overboard'},
  {value: 'ENCLOSED_SPACES', label: 'Enclosed Spaces'},
  {value: 'ENCLOSED_SPACES_MACHINERY', label: 'Enclosed Spaces (Machinery)'},
  {value: 'OFFICE', label: 'Office'},
  {value: 'STORE', label: 'Store'},
  {value: 'TRAFFIC_ROAD', label: 'Traffic Road'},
  {value: 'OTHER', label: 'Other'},
]

const substandardActsOptions: {value: NearMissSubstandardAct; label: string}[] = [
  {value: 'FAILURE_TO_FOLLOW_RULES', label: 'Failure To Follow Rules'},
  {value: 'FAILURE_TO_USE_PPE_PROPERLY', label: 'Failure To Use PPE Properly'},
  {value: 'OPERATING_EQUIPMENT_WITHOUT_AUTHORITY', label: 'Operating Equipment Without Authority'},
  {value: 'INCORRECT_USE_OF_EQUIPMENT_OR_MACHINERY', label: 'Incorrect Use of Equipment / Machinery'},
  {value: 'USE_OF_DEFECTIVE_EQUIPMENT_OR_MACHINERY', label: 'Use Of Defective Equipment / Machinery'},
  {value: 'FAILURE_TO_FOLLOW_REPAIR_OR_MAINTENANCE_INSTRUCTIONS', label: 'Failure To Follow Repair /Maintenance Instructions'},
  {value: 'FAILURE_TO_WARN', label: 'Failure To Warn'},
  {value: 'FAILURE_TO_SECURE', label: 'Failure To Secure'},
  {value: 'BY_PASSING_SAFETY_DEVICE', label: 'By-Passing Safety Device'},
  {value: 'IMPROPER_POSITION_FOR_TASK', label: 'Improper Position for Task'},
  {value: 'IMPROPER_LIFTING_HANDLING_OR_STORAGE', label: 'Improper Lifting, Handling or Storage'},
  {value: 'HORSEPLAY_OR_INAPPROPRIATE_BEHAVIOUR', label: 'Horseplay / Inappropriate Behaviour'},
  {value: 'UNDER_INFLUENCE_OF_ALCOHOL_OR_DRUGS', label: 'Under Influence of Alcohol or Drugs'},
]

const substandardConditionsOptions: {value: NearMissSubstandardCondition; label: string}[] = [
  {value: 'INADEQUATE_GUARDS_OR_BARRIERS', label: 'Inadequate Guards or Barriers'},
  {value: 'INADEQUATE_OR_DEFECTIVE_PPE', label: 'Inadequate Or Defective PPE'},
  {value: 'DEFECTIVE_EQUIPMENT_OR_MACHINERY', label: 'Defective Equipment / Machinery'},
  {value: 'UNFAVOURABLE_HULL_OR_STRUCTURE_CONDITION', label: 'Unfavourable Hull or Structure Condition'},
  {value: 'POOR_HOUSEKEEPING', label: 'Poor Housekeeping'},
  {value: 'CONGESTION_OR_RESTRICTED_ACTION', label: 'Congestion or Restricted Action'},
  {value: 'INADEQUATE_OR_EXCESS_ILLUMINATION', label: 'Inadequate or Excess Illumination'},
  {value: 'INADEQUATE_VENTILATION', label: 'Inadequate Ventilation'},
  {value: 'OTHER_FACTORS', label: 'Other Factors'},
]

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

export const AddNearMissModal: FC<Props> = ({
  visible,
  isCrew,
  vessels,
  companies,
  subcompanies,
  isTopLevel,
  effectiveCompanyId,
  defaultVesselId,
  onCancel,
  onSubmit,
}) => {
  const [form, setForm] = useState<NearMissSubmitShape>({
    vesselId: '',
    locationPosition: '',
    reportIssuedBy: '',
    dateIssued: '',

    dateOfOccurrence: '',
    timeOfOccurrence: '',

    reportedBy: '',
    reportedTo: '',
    dateReported: '',
    timeReported: '',

    occurrenceTypes: [],
    personalInjuryFormCompleted: null,
    anyStatementsAttached: null,

    locationOfOccurrence: [],

    descriptionOfOccurrence: '',

    substandardActs: [],
    substandardConditions: [],

    personsInjured: '',
    personsInvolved: '',
    personsWitness: '',
    typeOfInjury: '',

    immediateBasicCause: '',
    rootCause: '',
    correctiveActionsProposed: '',
    preventativeActionsProposed: '',

    objectiveEvidence: '',
    dpaConclusionsAndRecommendations: '',

    supportingFiles: [],
  })

  // Company / subcompany filters inside modal (like Defect Add)
  const [companyId, setCompanyId] = useState<string>('')
  const [subcompanyId, setSubcompanyId] = useState<string>('')

  // Local list of new supporting files (for chips UI)
  const [supportingFiles, setSupportingFiles] = useState<File[]>([])

  // init company + vessel defaults when modal opens
  useEffect(() => {
    if (!visible) return

    setCompanyId(prev => {
      if (prev) return prev
      if (!isTopLevel && effectiveCompanyId) return String(effectiveCompanyId)
      return prev || ''
    })
    setSubcompanyId('')

    setForm(prev => ({
      ...prev,
      vesselId:
        prev.vesselId ||
        (defaultVesselId ? String(defaultVesselId) : prev.vesselId),
    }))
    setSupportingFiles([])
  }, [visible, isTopLevel, effectiveCompanyId, defaultVesselId])

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
    return subcompanies.filter(sc => sc.companyId === cid)
  }, [companyId, subcompanies])

  useEffect(() => {
    if (!visible) return
    // if current vesselId not in filtered vessels, clear it
    setForm(prev => {
      if (!prev.vesselId) return prev
      const exists = vesselsForModal.some(v => String(v.id) === prev.vesselId)
      return exists ? prev : {...prev, vesselId: ''}
    })
  }, [visible, vesselsForModal])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const {name, value} = e.target
    setForm(prev => ({...prev, [name]: value}))
  }

  const handleOccurrenceToggle = (value: NearMissOccurrenceType, checked: boolean) => {
    setForm(prev => {
      const set = new Set(prev.occurrenceTypes)
      if (checked) set.add(value)
      else set.delete(value)
      return {...prev, occurrenceTypes: Array.from(set)}
    })
  }

  const handleLocationToggle = (value: NearMissLocationOfOccurrence, checked: boolean) => {
    setForm(prev => {
      const set = new Set(prev.locationOfOccurrence)
      if (checked) set.add(value)
      else set.delete(value)
      return {...prev, locationOfOccurrence: Array.from(set)}
    })
  }

  const handleSubstandardActToggle = (value: NearMissSubstandardAct, checked: boolean) => {
    setForm(prev => {
      const set = new Set(prev.substandardActs)
      if (checked) set.add(value)
      else set.delete(value)
      return {...prev, substandardActs: Array.from(set)}
    })
  }

  const handleSubstandardConditionToggle = (
    value: NearMissSubstandardCondition,
    checked: boolean
  ) => {
    setForm(prev => {
      const set = new Set(prev.substandardConditions)
      if (checked) set.add(value)
      else set.delete(value)
      return {...prev, substandardConditions: Array.from(set)}
    })
  }

  const handleBooleanChange = (
    name: 'personalInjuryFormCompleted' | 'anyStatementsAttached',
    value: string
  ) => {
    setForm(prev => ({
      ...prev,
      [name]:
        value === ''
          ? null
          : value === 'yes',
    }))
  }

  // --- NEW: Defect-style multi-file add/remove with chips ---
  const handleSupportingFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return

    setSupportingFiles(prev => [...prev, ...files])
    toast.success(
      `${files.length} file${files.length > 1 ? 's' : ''} added`,
      {position: 'top-center'}
    )

    // allow selecting same file again
    e.target.value = ''
  }

  const handleRemoveSupportingFile = (index: number) => {
    setSupportingFiles(prev => {
      const next = [...prev]
      const [removed] = next.splice(index, 1)
      if (removed) {
        toast.info(`Removed ${removed.name}`, {position: 'top-center'})
      }
      return next
    })
  }

  // --- FIX: actually submit current form + files ---
  const handleSubmit = async () => {
    const payload: NearMissSubmitShape = {
      ...form,
      supportingFiles,
    }

    await onSubmit(payload)
  }

  if (!visible) return null

  const selectedVesselName =
    vesselsForModal.find(v => String(v.id) === form.vesselId)?.name ||
    vessels.find(v => String(v.id) === form.vesselId)?.name ||
    vessels[0]?.name

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
          <h5 className='modal-title text-dark m-6'>Add Near Miss Report</h5>
          <button
            type='button'
            className='btn-close m-6'
            aria-label='Close'
            onClick={onCancel}
          />
        </div>

        {/* Body with inner scroll */}
        <div className='flex-grow-1 overflow-auto px-4 py-3 m-6'>
          <div className='row g-3'>

            {/* Company / Subcompany / Vessel – same pattern as Defect Add */}
            {!isCrew && (
              <>
                {/* Company */}
                <div className='col-md-4'>
                  <label className={LABEL}>Company</label>
                  {isTopLevel ? (
                    <select
                      className='form-select'
                      value={companyId}
                      onChange={e => {
                        setCompanyId(e.target.value)
                        setSubcompanyId('')
                      }}
                    >
                      <option value=''>Select company</option>
                      {companies.map(c => (
                        <option key={c.id} value={String(c.id)}>{c.name}</option>
                      ))}
                    </select>
                  ) : (
                    <div className='form-control' style={{background:'#f8f9fa'}}>
                      {companies.find(c => c.id === (effectiveCompanyId ?? 0))?.name || '-'}
                    </div>
                  )}
                </div>

                {/* Subcompany – conditional like in Defects */}
                {!!companyId && subcompaniesForCompany.length > 0 && (
                  <div className='col-md-4'>
                    <label className={LABEL}>Subcompany</label>
                    <select
                      className='form-select'
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
                  </div>
                )}

                {/* Vessel */}
                <div className='col-md-4'>
                  <label className={LABEL}>
                    Vessel <span className='text-danger'>*</span>
                  </label>
                  <select
                    className='form-select'
                    name='vesselId'
                    value={form.vesselId}
                    onChange={e => setForm(prev => ({...prev, vesselId: e.target.value}))}
                  >
                    <option value=''>Select vessel</option>
                    {vesselsForModal.map(v => (
                      <option key={v.id} value={String(v.id)}>
                        {(v as any).fleet_name || v.name || `Vessel ${v.id}`}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* Crew – no company/subcompany/vessel selector; just fixed vessel */}
            {isCrew && (
              <div className='col-md-4'>
                <label className={LABEL}>
                  Vessel <span className='text-danger'>*</span>
                </label>
                <div className='form-control' style={{background:'#f8f9fa'}}>
                  {selectedVesselName || '-'}
                </div>
              </div>
            )}

            {/* Position / Location */}
            <div className='col-md-4'>
              <label className={LABEL}>
                Position / Location of Incident
              </label>
              <input
                type='text'
                className='form-control'
                name='locationPosition'
                value={form.locationPosition}
                onChange={handleChange}
                placeholder='e.g. Lat/Long or area description'
              />
            </div>

            {/* Report Issued By */}
            <div className='col-md-4'>
              <label className={LABEL}>
                Report Issued By
              </label>
              <input
                type='text'
                className='form-control'
                name='reportIssuedBy'
                value={form.reportIssuedBy}
                onChange={handleChange}
              />
            </div>

            {/* Date Issued */}
            <div className='col-md-4'>
              <label className={LABEL}>
                Date Issued
              </label>
              <input
                type='date'
                className='form-control'
                name='dateIssued'
                value={form.dateIssued}
                onChange={handleChange}
              />
            </div>

            {/* Date & Time of Occurrence */}
            <div className='col-md-4'>
              <label className={LABEL}>
                Date of Occurrence <span className='text-danger'>*</span>
              </label>
              <input
                type='date'
                className='form-control'
                name='dateOfOccurrence'
                value={form.dateOfOccurrence}
                onChange={handleChange}
              />
            </div>
            <div className='col-md-4'>
              <label className={LABEL}>
                Time of Occurrence
              </label>
              <input
                type='time'
                className='form-control'
                name='timeOfOccurrence'
                value={form.timeOfOccurrence}
                onChange={handleChange}
              />
            </div>

            {/* Reported By / To / Date / Time */}
            <div className='col-md-4'>
              <label className={LABEL}>Reported By</label>
              <input
                type='text'
                className='form-control'
                name='reportedBy'
                value={form.reportedBy}
                onChange={handleChange}
              />
            </div>
            <div className='col-md-4'>
              <label className={LABEL}>Reported To</label>
              <input
                type='text'
                className='form-control'
                name='reportedTo'
                value={form.reportedTo}
                onChange={handleChange}
              />
            </div>
            <div className='col-md-4'>
              <label className={LABEL}>Date Reported</label>
              <input
                type='date'
                className='form-control'
                name='dateReported'
                value={form.dateReported}
                onChange={handleChange}
              />
            </div>
            <div className='col-md-4'>
              <label className={LABEL}>Time Reported</label>
              <input
                type='time'
                className='form-control'
                name='timeReported'
                value={form.timeReported}
                onChange={handleChange}
              />
            </div>

            {/* Occurrence Types */}
            <div className='col-12'>
              <label className={LABEL}>
                Occurrence (Accident / Incident / Near Miss)
                <span className='text-danger'>*</span>
              </label>
              <div className='row'>
                {occurrenceOptions.map(opt => (
                  <div key={opt.value} className='col-md-3'>
                    <div className='form-check'>
                      <input
                        className='form-check-input'
                        type='checkbox'
                        id={`occ-${opt.value}`}
                        checked={form.occurrenceTypes.includes(opt.value)}
                        onChange={e => handleOccurrenceToggle(opt.value, e.target.checked)}
                      />
                      <label
                        className='form-check-label'
                        htmlFor={`occ-${opt.value}`}
                      >
                        {opt.label}
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Booleans */}
            <div className='col-md-4'>
              <label className={LABEL}>Personal Injury Form Completed</label>
              <select
                className='form-select'
                value={
                  form.personalInjuryFormCompleted === null
                    ? ''
                    : form.personalInjuryFormCompleted
                    ? 'yes'
                    : 'no'
                }
                onChange={e => handleBooleanChange('personalInjuryFormCompleted', e.target.value)}
              >
                <option value=''>Select</option>
                <option value='yes'>Yes</option>
                <option value='no'>No</option>
              </select>
            </div>

            <div className='col-md-4'>
              <label className={LABEL}>Any Statements Attached</label>
              <select
                className='form-select'
                value={
                  form.anyStatementsAttached === null
                    ? ''
                    : form.anyStatementsAttached
                    ? 'yes'
                    : 'no'
                }
                onChange={e => handleBooleanChange('anyStatementsAttached', e.target.value)}
              >
                <option value=''>Select</option>
                <option value='yes'>Yes</option>
                <option value='no'>No</option>
              </select>
            </div>

            {/* Location of Occurrence (multi) */}
            <div className='col-12'>
              <label className={LABEL}>
                Location of Occurrence
              </label>
              <div className='row'>
                {locationOptions.map(opt => (
                  <div key={opt.value} className='col-md-3'>
                    <div className='form-check'>
                      <input
                        className='form-check-input'
                        type='checkbox'
                        id={`loc-${opt.value}`}
                        checked={form.locationOfOccurrence.includes(opt.value)}
                        onChange={e => handleLocationToggle(opt.value, e.target.checked)}
                      />
                      <label
                        className='form-check-label'
                        htmlFor={`loc-${opt.value}`}
                      >
                        {opt.label}
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className='col-12'>
              <label className={LABEL}>
                Description of the Occurrence
              </label>
              <textarea
                className='form-control'
                rows={3}
                name='descriptionOfOccurrence'
                value={form.descriptionOfOccurrence}
                onChange={handleChange}
              />
            </div>

            {/* Analysis: Substandard Acts / Conditions */}
            <div className='col-12'>
              <h6 className='fw-bold mt-3 mb-2'>Analysis of the Occurrence</h6>
            </div>

            <div className='col-md-6'>
              <label className={LABEL}>Substandard Acts</label>
              <div className='row' style={{maxHeight: 260, overflowY: 'auto'}}>
                {substandardActsOptions.map(opt => (
                  <div key={opt.value} className='col-md-12'>
                    <div className='form-check'>
                      <input
                        className='form-check-input'
                        type='checkbox'
                        id={`act-${opt.value}`}
                        checked={form.substandardActs.includes(opt.value)}
                        onChange={e => handleSubstandardActToggle(opt.value, e.target.checked)}
                      />
                      <label className='form-check-label' htmlFor={`act-${opt.value}`}>
                        {opt.label}
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className='col-md-6'>
              <label className={LABEL}>Substandard Conditions</label>
              <div className='row' style={{maxHeight: 260, overflowY: 'auto'}}>
                {substandardConditionsOptions.map(opt => (
                  <div key={opt.value} className='col-md-12'>
                    <div className='form-check'>
                      <input
                        className='form-check-input'
                        type='checkbox'
                        id={`cond-${opt.value}`}
                        checked={form.substandardConditions.includes(opt.value)}
                        onChange={e => handleSubstandardConditionToggle(opt.value, e.target.checked)}
                      />
                      <label className='form-check-label' htmlFor={`cond-${opt.value}`}>
                        {opt.label}
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Persons involved */}
            <div className='col-md-6'>
              <label className={LABEL}>Persons – Injured</label>
              <textarea
                className='form-control'
                rows={2}
                name='personsInjured'
                value={form.personsInjured}
                onChange={handleChange}
              />
            </div>
            <div className='col-md-6'>
              <label className={LABEL}>Persons – Involved</label>
              <textarea
                className='form-control'
                rows={2}
                name='personsInvolved'
                value={form.personsInvolved}
                onChange={handleChange}
              />
            </div>
            <div className='col-md-6'>
              <label className={LABEL}>Persons – Witness</label>
              <textarea
                className='form-control'
                rows={2}
                name='personsWitness'
                value={form.personsWitness}
                onChange={handleChange}
              />
            </div>
            <div className='col-md-6'>
              <label className={LABEL}>Type of Injury</label>
              <textarea
                className='form-control'
                rows={2}
                name='typeOfInjury'
                value={form.typeOfInjury}
                onChange={handleChange}
              />
            </div>

            {/* Causes & Actions */}
            <div className='col-md-6'>
              <label className={LABEL}>Immediate / Basic Cause</label>
              <textarea
                className='form-control'
                rows={2}
                name='immediateBasicCause'
                value={form.immediateBasicCause}
                onChange={handleChange}
              />
            </div>
            <div className='col-md-6'>
              <label className={LABEL}>Root Cause</label>
              <textarea
                className='form-control'
                rows={2}
                name='rootCause'
                value={form.rootCause}
                onChange={handleChange}
              />
            </div>
            <div className='col-md-6'>
              <label className={LABEL}>Corrective Actions Proposed</label>
              <textarea
                className='form-control'
                rows={2}
                name='correctiveActionsProposed'
                value={form.correctiveActionsProposed}
                onChange={handleChange}
              />
            </div>
            <div className='col-md-6'>
              <label className={LABEL}>Preventative Actions Proposed</label>
              <textarea
                className='form-control'
                rows={2}
                name='preventativeActionsProposed'
                value={form.preventativeActionsProposed}
                onChange={handleChange}
              />
            </div>

            {/* Objective Evidence */}
            <div className='col-md-6'>
              <label className={LABEL}>Objective Evidence</label>
              <textarea
                className='form-control'
                rows={2}
                name='objectiveEvidence'
                value={form.objectiveEvidence}
                onChange={handleChange}
              />
            </div>

            {/* DPA Conclusions */}
            <div className='col-md-6'>
              <label className={LABEL}>DPA Conclusions &amp; Recommendations</label>
              <textarea
                className='form-control'
                rows={2}
                name='dpaConclusionsAndRecommendations'
                value={form.dpaConclusionsAndRecommendations}
                onChange={handleChange}
              />
            </div>

            {/* Supporting documents – Defect style */}
            <div className='col-12 mb-4'>
              <label className={LABEL}>Supporting documents</label>
              <input
                type='file'
                multiple
                className='form-control'
                onChange={handleSupportingFilesChange}
              />

              {supportingFiles.length > 0 && (
                <div className='mt-2 d-flex flex-wrap gap-2'>
                  {supportingFiles.map((file, idx) => (
                    <span
                      key={idx}
                      className='badge bg-light text-dark d-inline-flex align-items-center'
                    >
                      <span
                        className='me-2'
                        style={{
                          maxWidth: 160,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {file.name}
                      </span>
                      <button
                        type='button'
                        className='btn btn-xs btn-icon btn-light-danger p-0 border-0'
                        onClick={() => handleRemoveSupportingFile(idx)}
                        title='Remove file'
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className='border-top d-flex justify-content-end gap-2 px-4 py-3 flex-shrink-0 m-6'>
          <button
            type='button'
            className='btn btn-light btn-sm'
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type='button'
            className='btn btn-primary btn-sm'
            onClick={handleSubmit}
          >
            <KTSVG
              path='/media/icons/duotune/arrows/arr075.svg'
              className='svg-icon-3 me-1'
            />
            Save Near Miss
          </button>
        </div>
      </div>
    </div>
  )
}
