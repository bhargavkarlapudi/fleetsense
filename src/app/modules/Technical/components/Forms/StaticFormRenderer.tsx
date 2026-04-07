import React, { useEffect, useMemo, useState } from 'react'
import { STATIC_FORMS, StaticFormConfig, StaticField } from './staticFormsConfig'
import { useAuth } from '../../../auth/core/Auth'
import { getVesselList } from '../../core/_requests'
import { getVoyageList } from '../../../operations/core/_requests'
import { Vessel } from '../../core/_models'
import { Voyage } from '../../../operations/core/_models'
import {
  TechnicalFormTemplate,
  uploadTechnicalFormSubmission,
  createTechnicalFormTemplate,
} from '../../core/forms_requests'
import { downloadOfflineExcel, buildOfflineExcelFile } from './offlineTemplate'

type ChecklistOption = 'yes' | 'no' | 'na'
type ChecklistValue = Record<string, ChecklistOption>

type FieldValue = string | ChecklistValue

const initValues = (form: StaticFormConfig): Record<string, FieldValue> => {
  const values: Record<string, FieldValue> = {}
  form.fields.forEach((f) => {
    if (f.type === 'checklist' && f.items) {
      const entry: ChecklistValue = {}
      f.items.forEach((item) => {
        entry[item] = 'no'
      })
      values[f.name] = entry
    } else {
      values[f.name] = ''
    }
  })
  return values
}

interface Props {
  templates: TechnicalFormTemplate[]
  refreshTemplates?: () => Promise<TechnicalFormTemplate[] | null | undefined>
  onTemplateCreated?: (template: TechnicalFormTemplate) => void
  onSubmissionUploaded?: () => void
  submissionContext?: {
    crewId?: number
    vesselId?: number
    companyId?: number
  }
  canSubmit?: boolean
}

const StaticFormRenderer: React.FC<Props> = ({
  templates,
  refreshTemplates,
  onTemplateCreated,
  onSubmissionUploaded,
  submissionContext,
  canSubmit = true,
}) => {
  const { currentUser } = useAuth()

  const roleType = currentUser?.role?.roleType || (currentUser as any)?.role?.roleName
  const isCrew = roleType === 'CREW'
  const isSuperAdmin = roleType === 'SUPER_ADMIN' || roleType === 'SUPERADMIN'
  const crewVesselName = currentUser?.vessel?.fleet_name || ''
  const crewVesselId = currentUser?.vessel?.id
  const crewRank = currentUser?.rank?.rank || ''
  const crewName =
    currentUser?.roleEntityName ||
    currentUser?.username ||
    sessionStorage.getItem('roleEntityName') ||
    sessionStorage.getItem('userName') ||
    ''
  const companyAdminId = currentUser?.companyAdminId
  const companyGroupAdminId = currentUser?.companyGroupAdminId

  const [selectedCode, setSelectedCode] = useState(STATIC_FORMS[0]?.code || '')
  const [templateList, setTemplateList] = useState<TechnicalFormTemplate[]>(templates)
  const [values, setValues] = useState<Record<string, FieldValue>>(initValues(STATIC_FORMS[0]))
  const [remarks, setRemarks] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [provisioningTemplate, setProvisioningTemplate] = useState(false)
  const [offlineFile, setOfflineFile] = useState<File | null>(null)
  const [offlineUploading, setOfflineUploading] = useState(false)
  const [vessels, setVessels] = useState<Vessel[]>([])
  const [voyages, setVoyages] = useState<Voyage[]>([])
  const [selectedVesselId, setSelectedVesselId] = useState<number | null>(null)
  const [loadingVessels, setLoadingVessels] = useState(false)
  const [loadingVoyages, setLoadingVoyages] = useState(false)
  const [lookupError, setLookupError] = useState<string | null>(null)
  useEffect(() => {
    setTemplateList(templates)
  }, [templates])
  const normalizeCode = useMemo(
    () => (code?: string) => (code ? code.toLowerCase().match(/[a-z0-9]+/g)?.[0] || '' : ''),
    []
  )

  const selectedForm = useMemo(
    () => STATIC_FORMS.find((f) => f.code === selectedCode) || STATIC_FORMS[0],
    [selectedCode]
  )

  const findMatchingTemplate = (list = templateList) => {
    if (!list.length) return null
    const selectedCode = normalizeCode(selectedForm.code)
    const directMatch = list.find((t) => normalizeCode(t.code) === selectedCode)
    if (directMatch) return directMatch
    const rawCode = selectedForm.code.toLowerCase()
    return (
      list.find((t) => t.code?.toLowerCase().includes(rawCode)) ||
      list.find((t) => t.title?.toLowerCase().includes(rawCode)) ||
      null
    )
  }

  useEffect(() => {
    if (selectedForm) {
      const baseValues = initValues(selectedForm)
      if (isCrew && crewVesselName && Object.prototype.hasOwnProperty.call(baseValues, 'vesselName')) {
        baseValues.vesselName = crewVesselName
      }
      if (isCrew && crewRank && Object.prototype.hasOwnProperty.call(baseValues, 'rank')) {
        baseValues.rank = crewRank
      }
      if (isCrew && crewName && Object.prototype.hasOwnProperty.call(baseValues, 'masterName')) {
        baseValues.masterName = crewName
      }
      if (isCrew && crewName && Object.prototype.hasOwnProperty.call(baseValues, 'master')) {
        baseValues.master = crewName
      }
      setValues(baseValues)
      setRemarks('')
      setStatus(null)
      setError(null)
      setOfflineFile(null)
      if (isCrew) {
        setSelectedVesselId(crewVesselId ?? null)
      }
    }
  }, [crewName, crewRank, crewVesselId, crewVesselName, isCrew, selectedForm])

  useEffect(() => {
    if (isCrew) return
    let active = true
    setLoadingVessels(true)
    setLookupError(null)
    getVesselList()
      .then((list) => {
        if (!active) return
        setVessels(list)
      })
      .catch((err: any) => {
        if (!active) return
        setLookupError(err?.response?.data?.message || err?.message || 'Unable to load vessels.')
      })
      .finally(() => {
        if (!active) return
        setLoadingVessels(false)
      })
    return () => {
      active = false
    }
  }, [isCrew])

  useEffect(() => {
    if (isCrew) return
    let active = true
    setLoadingVoyages(true)
    setLookupError(null)
    getVoyageList()
      .then((list) => {
        if (!active) return
        setVoyages(list)
      })
      .catch((err: any) => {
        if (!active) return
        setLookupError(err?.response?.data?.message || err?.message || 'Unable to load voyages.')
      })
      .finally(() => {
        if (!active) return
        setLoadingVoyages(false)
      })
    return () => {
      active = false
    }
  }, [isCrew])

  const filteredVessels = useMemo(() => {
    if (isCrew) return []
    if (isSuperAdmin) return vessels
    if (companyAdminId) {
      return vessels.filter((vessel) => vessel.companyAdmin?.id === companyAdminId)
    }
    if (companyGroupAdminId) {
      return vessels.filter((vessel) => vessel.companyGroupAdmin?.id === companyGroupAdminId)
    }
    return vessels
  }, [companyAdminId, companyGroupAdminId, isCrew, isSuperAdmin, vessels])

  const filteredVoyages = useMemo(() => {
    if (isCrew) return []
    let list = voyages
    if (!isSuperAdmin) {
      if (companyAdminId) {
        list = list.filter((voyage) => voyage.companyAdminId === companyAdminId)
      } else if (companyGroupAdminId) {
        list = list.filter((voyage) => voyage.companyGroupAdminId === companyGroupAdminId)
      }
    }
    if (selectedVesselId) {
      list = list.filter((voyage) => voyage.vessel?.id === selectedVesselId)
    }
    return list
  }, [companyAdminId, companyGroupAdminId, isCrew, isSuperAdmin, selectedVesselId, voyages])
  const submitting = uploading || provisioningTemplate
  const offlineBusy = offlineUploading || provisioningTemplate

  const handleFieldChange = (field: StaticField, value: string) => {
    setValues((prev) => ({ ...prev, [field.name]: value }))
  }

  const setChecklistValue = (field: StaticField, item: string, next: ChecklistOption) => {
    setValues((prev) => {
      const current = (prev[field.name] as ChecklistValue) || {}
      const currentValue = current[item] || 'no'
      const resolved = currentValue === next ? 'no' : next
      return {
        ...prev,
        [field.name]: { ...current, [item]: resolved },
      }
    })
  }

  const handleVesselChange = (field: StaticField, value: string) => {
    const match = filteredVessels.find((vessel) => vessel.fleet_name === value)
    setSelectedVesselId(match?.id ?? null)
    setValues((prev) => ({
      ...prev,
      [field.name]: value,
      ...(selectedForm?.fields.some((f) => f.name === 'voyageNo') ? { voyageNo: '' } : {}),
    }))
  }

  const asPlainObject = () => {
    const output: Record<string, any> = {}
    selectedForm.fields.forEach((f) => {
      const val = values[f.name]
      output[f.name] = val
    })
    return output
  }

  const buildFile = () => {
    const payload = {
      formCode: selectedForm.code,
      formTitle: selectedForm.title,
      submittedAt: new Date().toISOString(),
      data: asPlainObject(),
      remarks,
    }
    const json = JSON.stringify(payload, null, 2)
    return new File([json], `${selectedForm.code}-submission.json`, { type: 'application/json' })
  }

  const downloadFilled = () => {
    const file = buildFile()
    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = url
    link.download = file.name
    link.click()
    URL.revokeObjectURL(url)
  }

  const ensureTemplateAvailable = async (): Promise<TechnicalFormTemplate | null> => {
    let template = findMatchingTemplate()
    if (template) return template

    if (refreshTemplates) {
      try {
        const refreshed = await refreshTemplates()
        if (refreshed?.length) {
          setTemplateList(refreshed)
          template = findMatchingTemplate(refreshed)
          if (template) return template
        }
      } catch (err: any) {
        setError(err?.response?.data?.message || err?.message || 'Unable to load templates from server.')
        return null
      }
    }

    try {
      setProvisioningTemplate(true)
      const offlineTemplateFile = buildOfflineExcelFile(selectedForm)
      const created = await createTechnicalFormTemplate({
        code: selectedForm.code,
        title: selectedForm.title,
        description: selectedForm.description,
        category: selectedForm.code.match(/[a-zA-Z]+/)?.[0],
        allowedFormats: ['json', 'xlsx', 'xls'],
        file: offlineTemplateFile,
        companyId: submissionContext?.companyId,
      })
      setTemplateList((prev) => [...prev, created])
      onTemplateCreated?.(created)
      return created
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Template not found on server. Please ask the office to upload the master template.'
      )
      return null
    } finally {
      setProvisioningTemplate(false)
    }
  }

  const submitToServer = async () => {
    setError(null)
    setStatus(null)
    const template = await ensureTemplateAvailable()
    if (!template) return
    try {
      setUploading(true)
      const file = buildFile()
      await uploadTechnicalFormSubmission(template.id, { file, remarks, ...submissionContext })
      setStatus('Submitted to server')
      if (onSubmissionUploaded) onSubmissionUploaded()
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const uploadOfflineFile = async () => {
    setError(null)
    setStatus(null)
    const template = await ensureTemplateAvailable()
    if (!template) return
    if (!offlineFile) {
      setError('Choose a filled Excel file to upload.')
      return
    }
    try {
      setOfflineUploading(true)
      await uploadTechnicalFormSubmission(template.id, { file: offlineFile, remarks, ...submissionContext })
      setStatus('Offline submission uploaded')
      setOfflineFile(null)
      if (onSubmissionUploaded) onSubmissionUploaded()
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Upload failed')
    } finally {
      setOfflineUploading(false)
    }
  }

  if (!selectedForm) return null

  return (
    <div className='card shadow-none border'>
      <div className='card-header border-0 py-4 d-flex justify-content-between align-items-center flex-wrap gap-3'>
        <div>
          <h3 className='card-title mb-1'>Static Digital Forms (first 5)</h3>
          <div className='text-muted small'>
            Fill directly in-app, or download a fillable Excel template for offline use.
          </div>
        </div>
        <select
          className='form-select w-auto'
          value={selectedForm.code}
          onChange={(e) => setSelectedCode(e.target.value)}
        >
          {STATIC_FORMS.map((f) => (
            <option key={f.code} value={f.code}>
              {f.code.toUpperCase()} - {f.title}
            </option>
          ))}
        </select>
      </div>
      <div className='card-body' style={{ position: 'relative' }}>
        {(uploading || offlineUploading || provisioningTemplate) && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(255, 255, 255, 0.75)',
              zIndex: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div className='d-flex align-items-center gap-2 text-muted'>
              <span className='spinner-border spinner-border-sm' />
              Processing submission...
            </div>
          </div>
        )}
        <div className='mb-3'>
          <div className='fw-semibold'>{selectedForm.title}</div>
          {selectedForm.description && <div className='text-muted small'>{selectedForm.description}</div>}
          {lookupError && <div className='text-danger small mt-1'>{lookupError}</div>}
        </div>

        <div className='row g-3'>
          {selectedForm.fields.map((field) => {
            const isVesselField = field.name === 'vesselName'
            const isVoyageField = field.name === 'voyageNo'
            const isCrewRankField = field.name === 'rank'
            const isMasterNameField = field.name === 'masterName' || field.name === 'master'
            if (field.type === 'checklist' && field.items) {
              const checklist = (values[field.name] as ChecklistValue) || {}
              return (
                <div className='col-12' key={field.name}>
<div className='fw-semibold mb-2 text-body'>{field.label}</div>
                  <div className='d-flex flex-column gap-2'>
                    {field.items.map((item) => {
                      const current = checklist[item] || 'no'
                      const isYes = current === 'yes'
                      const isNa = current === 'na'
                      return (
                        <div className='d-flex flex-column flex-md-row gap-2' key={item}>
                          <div className='text-body flex-grow-1'>{item}</div>
                          <div className='d-flex align-items-center gap-3'>
                            <label className='form-check form-check-sm'>
                              <input
                                type='checkbox'
                                className='form-check-input'
                                checked={isYes}
                                disabled={isNa}
                                onChange={() => setChecklistValue(field, item, 'yes')}
                              />
                              <span className='form-check-label text-body'>Yes</span>
                            </label>
                            <label className='form-check form-check-sm'>
                              <input
                                type='checkbox'
                                className='form-check-input'
                                checked={isNa}
                                disabled={isYes}
                                onChange={() => setChecklistValue(field, item, 'na')}
                              />
                              <span className='form-check-label text-body'>NA</span>
                            </label>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            }

            return (
              <div className='col-md-6' key={field.name}>
                <label className='form-label text-body'>
  {field.label} {field.required ? '*' : ''}
</label>
                {isVesselField && !isCrew ? (
                  <>
                    <select
                      className='form-select'
                      value={(values[field.name] as string) || ''}
                      onChange={(e) => handleVesselChange(field, e.target.value)}
                      disabled={loadingVessels}
                    >
                      <option value=''>Select vessel</option>
                      {filteredVessels.map((vessel) => (
                        <option key={vessel.id} value={vessel.fleet_name}>
                          {vessel.fleet_name}
                        </option>
                      ))}
                    </select>
                    {loadingVessels && <div className='text-muted small mt-1'>Loading vessels...</div>}
                    {!loadingVessels && filteredVessels.length === 0 && (
                      <div className='text-muted small mt-1'>No vessels available.</div>
                    )}
                  </>
                ) : isVesselField && isCrew ? (
                  <input
                    type='text'
                    className='form-control'
                    value={(values[field.name] as string) || ''}
                    readOnly
                  />
                ) : isVoyageField && !isCrew ? (
                  <>
                    <select
                      className='form-select'
                      value={(values[field.name] as string) || ''}
                      onChange={(e) => handleFieldChange(field, e.target.value)}
                      disabled={loadingVoyages}
                    >
                      <option value=''>Select voyage</option>
                      {filteredVoyages.map((voyage) => (
                        <option key={voyage.id} value={voyage.voyageNumber}>
                          {voyage.voyageNumber}
                          {voyage.departurePort && voyage.arrivalPort
                            ? ` - ${voyage.departurePort} to ${voyage.arrivalPort}`
                            : ''}
                        </option>
                      ))}
                    </select>
                    {loadingVoyages && <div className='text-muted small mt-1'>Loading voyages...</div>}
                    {!loadingVoyages && filteredVoyages.length === 0 && (
                      <div className='text-muted small mt-1'>No voyages available.</div>
                    )}
                  </>
                ) : isCrewRankField && isCrew ? (
                  <input
                    type='text'
                    className='form-control'
                    value={(values[field.name] as string) || ''}
                    readOnly
                  />
                ) : isMasterNameField && isCrew ? (
                  <input
                    type='text'
                    className='form-control'
                    value={(values[field.name] as string) || ''}
                    readOnly
                  />
                ) : field.type === 'textarea' ? (
                  <textarea
                    className='form-control'
                    rows={3}
                    value={(values[field.name] as string) || ''}
                    onChange={(e) => handleFieldChange(field, e.target.value)}
                  />
                ) : field.type === 'select' && field.options ? (
                  <select
                    className='form-select'
                    value={(values[field.name] as string) || ''}
                    onChange={(e) => handleFieldChange(field, e.target.value)}
                  >
                    <option value=''>Select...</option>
                    {field.options.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type === 'date' || field.type === 'time' ? field.type : 'text'}
                    className='form-control'
                    value={(values[field.name] as string) || ''}
                    onChange={(e) => handleFieldChange(field, e.target.value)}
                  />
                )}
                {field.helperText && <div className='text-muted small mt-1'>{field.helperText}</div>}
              </div>
            )
          })}
        </div>

        <div className='mt-4'>
<label className='form-label text-body'>Remarks (optional)</label>
          <textarea
            className='form-control'
            rows={3}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
          />
        </div>

        <div className='d-flex flex-wrap gap-2 mt-4'>
          <button className='btn btn-light' type='button' onClick={downloadFilled}>
            Download filled JSON
          </button>
          <button className='btn btn-light' type='button' onClick={() => downloadOfflineExcel(selectedForm)}>
            Download fillable Excel
          </button>
          {canSubmit ? (
            <button className='btn btn-primary' type='button' onClick={submitToServer} disabled={submitting}>
              {submitting ? (provisioningTemplate ? 'Preparing template...' : 'Submitting...') : 'Submit to server'}
            </button>
          ) : (
            <span className='text-muted align-self-center'>Only crew can submit forms.</span>
          )}
        </div>

        {canSubmit ? (
          <div className='mt-4'>
            <label className='form-label text-body'>Upload filled Excel (offline)</label>
            <input
              type='file'
              className='form-control'
              accept='.xlsx,.xls'
              onChange={(e) => setOfflineFile(e.target.files?.[0] || null)}
            />
            <button
              className='btn btn-secondary mt-3'
              type='button'
              onClick={uploadOfflineFile}
              disabled={offlineBusy}
            >
              {offlineBusy ? (provisioningTemplate ? 'Preparing template...' : 'Uploading...') : 'Upload Excel'}
            </button>
          </div>
        ) : null}

        {provisioningTemplate && <div className='text-muted mt-3'>Preparing template on server...</div>}
        {status && <div className='text-success mt-3'>{status}</div>}
        {error && <div className='text-danger mt-3'>{error}</div>}
      </div>
    </div>
  )
}

export default StaticFormRenderer
