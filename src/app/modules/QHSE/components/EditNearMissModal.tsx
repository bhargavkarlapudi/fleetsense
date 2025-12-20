// src/app/modules/QHSE/components/EditNearMissModal.tsx
import React, {FC, useEffect, useState} from 'react'
import {KTSVG} from '../../../../_metronic/helpers'
import {FileViewerModal} from '../components/FileViewerModal'
import type {Vessel} from '../../Management/core/_models'
import type {
  QHSENearMissReportDto,
  NearMissOccurrenceType,
  NearMissLocationOfOccurrence,
  NearMissSubstandardAct,
  NearMissSubstandardCondition,
} from '../core/_models'
import type {NearMissSubmitShape} from './AddNearMissModal'
import {
  listNearMissAttachments,
  nearMissAttachmentFileViewUrl,
  nearMissAttachmentFileDownloadUrl,
  deleteNearMissAttachment,
} from '../core/_requests'
import {toast} from 'react-toastify' 

type Props = {
  visible: boolean
  isCrew: boolean
  vessels: Vessel[]
  record: QHSENearMissReportDto | null
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

type ExistingAttachmentLocal = {
  fileName: string
  viewUrl: string
  downloadUrl: string
}

export const EditNearMissModal: FC<Props> = ({
  visible,
  isCrew,        // kept for parity; behaviour is now "no vessel change for anyone"
  vessels,
  record,
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

  const [existingAttachments, setExistingAttachments] = useState<ExistingAttachmentLocal[]>([])
  const [existingLoading, setExistingLoading] = useState(false)

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

  // Populate form from record when opening
  useEffect(() => {
    if (!visible || !record) return

    setForm({
      vesselId: record.vesselId ? String(record.vesselId) : '',
      locationPosition: record.locationPosition || '',
      reportIssuedBy: record.reportIssuedBy || '',
      dateIssued: record.dateIssued || '',

      dateOfOccurrence: record.dateOfOccurrence || '',
      timeOfOccurrence: record.timeOfOccurrence || '',

      reportedBy: record.reportedBy || '',
      reportedTo: record.reportedTo || '',
      dateReported: record.dateReported || '',
      timeReported: record.timeReported || '',

      occurrenceTypes: (record.occurrenceTypes || []) as NearMissOccurrenceType[],
      personalInjuryFormCompleted:
        record.personalInjuryFormCompleted == null
          ? null
          : !!record.personalInjuryFormCompleted,
      anyStatementsAttached:
        record.anyStatementsAttached == null
          ? null
          : !!record.anyStatementsAttached,

      locationOfOccurrence: (record.locationOfOccurrence || []) as NearMissLocationOfOccurrence[],

      descriptionOfOccurrence: record.descriptionOfOccurrence || '',

      substandardActs: (record.substandardActs || []) as NearMissSubstandardAct[],
      substandardConditions: (record.substandardConditions || []) as NearMissSubstandardCondition[],

      personsInjured: record.personsInjured || '',
      personsInvolved: record.personsInvolved || '',
      personsWitness: record.personsWitness || '',
      typeOfInjury: record.typeOfInjury || '',

      immediateBasicCause: record.immediateBasicCause || '',
      rootCause: record.rootCause || '',
      correctiveActionsProposed: record.correctiveActionsProposed || '',
      preventativeActionsProposed: record.preventativeActionsProposed || '',

      objectiveEvidence: record.objectiveEvidence || '',
      dpaConclusionsAndRecommendations: record.dpaConclusionsAndRecommendations || '',

      supportingFiles: [],   // new files added in this editing session
    })
  }, [visible, record])

  // Load existing supporting documents (Defect-style)
  useEffect(() => {
    if (!record?.id || !visible) {
      setExistingAttachments([])
      return
    }

    const id = Number(record.id)
    setExistingLoading(true)

    ;(async () => {
      try {
        const list = await listNearMissAttachments(id)
        const mapped: ExistingAttachmentLocal[] = list.map((it: any) => ({
          fileName: it.fileName,
          viewUrl: nearMissAttachmentFileViewUrl(id, it.fileName),
          downloadUrl: nearMissAttachmentFileDownloadUrl(id, it.fileName),
        }))
        setExistingAttachments(mapped)
      } catch (e) {
        console.error('Failed to load near miss attachments for edit modal', e)
        setExistingAttachments([])
      } finally {
        setExistingLoading(false)
      }
    })()
  }, [record?.id, visible])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const {name, value} = e.target
    setForm(prev => ({...prev, [name]: value}))
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

  // new supporting files (added in this edit)
  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : []
    if (!files.length) return

    setForm(prev => ({
      ...prev,
      supportingFiles: [...(prev.supportingFiles || []), ...files],
    }))

    // ✅ Toast on add
    toast.success(
      `${files.length} file${files.length > 1 ? 's' : ''} added`,
      {position: 'top-center'}
    )

    e.target.value = ''
  }

  const handleSubmit = async () => {
    if (!record?.id) return
    await onSubmit(form)
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
    const ok = window.confirm(`Remove attachment "${fileName}" from this near miss?`)
    if (!ok) return

    try {
      await deleteNearMissAttachment(Number(record.id), fileName)
      setExistingAttachments(prev => prev.filter(a => a.fileName !== fileName))

      // ✅ Toast on successful delete
      toast.info(`Removed ${fileName}`, {position: 'top-center'})
    } catch (e) {
      console.error('Failed to delete supporting document', e)
      toast.error('Failed to delete attachment', {position: 'top-center'})
    }
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

    const handleRemoveNewFile = (index: number) => {
    setForm(prev => {
      const current = prev.supportingFiles || []
      const target = current[index]
      const next = current.filter((_, i) => i !== index)

      if (target) {
        toast.info(`Removed ${target.name}`, {position: 'top-center'})
      }

      return {...prev, supportingFiles: next}
    })
  }

  const closeAll = () => {
    onCancel()
  }

  if (!visible || !record) return null

  const vesselName =
    record.vesselName ||
    vessels.find(v => String(v.id) === form.vesselId)?.name ||
    vessels[0]?.name ||
    '-'

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
        {/* Header – same shell as Add modal */}
        <div className='d-flex align-items-center justify-content-between border-bottom px-4 py-3 flex-shrink-0'>
          <div className='d-flex flex-column'>
            <h5 className='modal-title text-dark m-6'>
              Edit Near Miss Report – {record.reportNumber || '-'}
            </h5>
            <div className='text-muted fs-7 mx-6'>
              Vessel: {vesselName}
            </div>
          </div>
          <button
            type='button'
            className='btn-close m-6'
            aria-label='Close'
            onClick={closeAll}
          />
        </div>

        {/* Body with scroll */}
        <div className='flex-grow-1 overflow-auto px-4 py-3 m-6'>
          <div className='row g-3'>
            {/* Vessel – READ-ONLY for everyone */}
            <div className='col-md-4'>
              <label className={LABEL}>
                Vessel <span className='text-danger'>*</span>
              </label>
              <div className='form-control' style={{background:'#f8f9fa'}}>
                {vesselName}
              </div>
            </div>

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

            {/* Reported By / To */}
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
                        id={`occ-edit-${opt.value}`}
                        checked={form.occurrenceTypes.includes(opt.value)}
                        onChange={e => handleOccurrenceToggle(opt.value, e.target.checked)}
                      />
                      <label
                        className='form-check-label'
                        htmlFor={`occ-edit-${opt.value}`}
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
              <label className={LABEL}>
                Personal Injury Form Completed
              </label>
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
              <label className={LABEL}>
                Any Statements Attached
              </label>
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

            {/* Location of Occurrence */}
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
                        id={`loc-edit-${opt.value}`}
                        checked={form.locationOfOccurrence.includes(opt.value)}
                        onChange={e => handleLocationToggle(opt.value, e.target.checked)}
                      />
                      <label
                        className='form-check-label'
                        htmlFor={`loc-edit-${opt.value}`}
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

            {/* Analysis */}
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
                        id={`act-edit-${opt.value}`}
                        checked={form.substandardActs.includes(opt.value)}
                        onChange={e =>
                          handleSubstandardActToggle(opt.value, e.target.checked)
                        }
                      />
                      <label
                        className='form-check-label'
                        htmlFor={`act-edit-${opt.value}`}
                      >
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
                        id={`cond-edit-${opt.value}`}
                        checked={form.substandardConditions.includes(opt.value)}
                        onChange={e =>
                          handleSubstandardConditionToggle(opt.value, e.target.checked)
                        }
                      />
                      <label
                        className='form-check-label'
                        htmlFor={`cond-edit-${opt.value}`}
                      >
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

            {/* Existing supporting docs */}
            <div className='col-12 mt-3'>
              <h6 className='fw-bold mb-2'>Existing Supporting Documents</h6>
              {existingLoading ? (
                <div className='d-flex justify-content-center py-3'>
                  <div className='spinner-border' role='status'>
                    <span className='visually-hidden'>Loading...</span>
                  </div>
                </div>
              ) : !existingAttachments.length ? (
                <div className='text-muted fst-italic'>
                  No supporting documents uploaded.
                </div>
              ) : (
                <div className='table-responsive border rounded'>
                  <table className='table table-sm align-middle mb-0'>
                    <thead>
                      <tr>
                        <th>File Name</th>
                        <th style={{width: '200px'}} className='text-end'>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {existingAttachments.map(att => (
                        <tr key={att.fileName}>
                          <td>{att.fileName}</td>
                          <td className='text-end'>
                            <button
                              type='button'
                              className='btn btn-light-primary btn-sm me-2'
                              onClick={() => handlePreviewExistingFile(att)}
                            >
                              View
                            </button>
                            <button
                              type='button'
                              className='btn btn-light-danger btn-sm'
                              onClick={() => handleDeleteExistingFile(att.fileName)}
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Add new supporting docs */}
            <div className='col-12 mt-3 mb-4'>
              <label className={LABEL}>Add Supporting Documents</label>
              <input
                type='file'
                multiple
                className='form-control'
                onChange={handleFilesChange}
              />

              {form.supportingFiles && form.supportingFiles.length > 0 && (
                <div className='mt-2 d-flex flex-wrap gap-2'>
                  {form.supportingFiles.map((file, idx) => (
                    <span
                      key={idx}
                      className='badge bg-light text-dark d-inline-flex align-items-center'
                    >
                      <button
                        type='button'
                        className='btn btn-link p-0 me-2 small'
                        onClick={() => handlePreviewNewFile(file)}
                        style={{
                          maxWidth: 180,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {file.name}
                      </button>
                      <button
                        type='button'
                        className='btn btn-xs btn-icon btn-light-danger p-0 border-0'
                        onClick={() => handleRemoveNewFile(idx)}
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
            onClick={closeAll}
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

        {/* File viewer modal shared for existing + new files */}
        <FileViewerModal
          visible={fileView.visible}
          title={fileView.title}
          fileName={fileView.file?.name}
          file={fileView.file || undefined}
          viewUrl={fileView.viewUrl}
          downloadUrl={fileView.downloadUrl}
          onClose={() =>
            setFileView(prev => ({
              ...prev,
              visible: false,
              file: null,
            }))
          }
        />
      </div>
    </div>
  )
}
