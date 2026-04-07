import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { toast } from 'react-toastify'
import {
  fetchTechnicalFormSubmissions,
  fetchTechnicalFormTemplates,
  TechnicalFormSubmission,
  TechnicalFormTemplate,
  uploadTechnicalFormSubmission,
  deleteTechnicalFormSubmission,
} from '../../core/forms_requests'
import { getCrewList, getVesselList } from '../../core/_requests'
import { Crew, Vessel } from '../../core/_models'
import { useAuth } from '../../../auth/core/Auth'
import { STATIC_FORMS } from './staticFormsConfig'
import StaticFormRenderer from './StaticFormRenderer'

type SubmissionWithLookups = TechnicalFormSubmission & {
  vesselName?: string
  crewName?: string
  submittedByName?: string
  vessel?: { id?: number; fleet_name?: string }
  crew?: { id?: number; name?: string }
  submittedBy?: { id?: number; name?: string; username?: string }
}

const TechnicalFormsPage: React.FC = () => {
  const { currentUser } = useAuth()

  const [templates, setTemplates] = useState<TechnicalFormTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<TechnicalFormTemplate | null>(null)
  const [submissions, setSubmissions] = useState<TechnicalFormSubmission[]>([])
  const [vessels, setVessels] = useState<Vessel[]>([])
  const [crewList, setCrewList] = useState<Crew[]>([])

  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [loadingSubmissions, setLoadingSubmissions] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const [file, setFile] = useState<File | null>(null)
  const [remarks, setRemarks] = useState('')

  const [statusFilter, setStatusFilter] = useState('all')
  const [formatFilter, setFormatFilter] = useState('all')
  const [vesselFilter, setVesselFilter] = useState('all')
  const [submittedByFilter, setSubmittedByFilter] = useState('all')
  const [submissionTemplateId, setSubmissionTemplateId] = useState<number | null>(null)

  const [showFormModal, setShowFormModal] = useState(false)

  const [viewSubmission, setViewSubmission] = useState<TechnicalFormSubmission | null>(null)
  const [viewPayload, setViewPayload] = useState<any | null>(null)
  const [viewError, setViewError] = useState<string | null>(null)
  const [pdfSubmission, setPdfSubmission] = useState<TechnicalFormSubmission | null>(null)
  const [pdfPayload, setPdfPayload] = useState<any | null>(null)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [pdfBusy, setPdfBusy] = useState(false)
  const [pdfMode, setPdfMode] = useState(false)
  const pdfRef = useRef<HTMLDivElement | null>(null)

  const roleType = currentUser?.role?.roleType || (currentUser as any)?.role?.roleName
  const isCrew = roleType === 'CREW'
  const isSuperAdmin = roleType === 'SUPER_ADMIN' || roleType === 'SUPERADMIN'
  const companyAdminId = currentUser?.companyAdminId
  const companyGroupAdminId = currentUser?.companyGroupAdminId

  const normalizeCode = useMemo(
    () => (code?: string) => (code ? code.toLowerCase().match(/[a-z0-9]+/g)?.[0] || '' : ''),
    []
  )

  const submissionContext = useMemo(() => {
    const isCrewRole = roleType === 'CREW'
    return {
      crewId: isCrewRole ? currentUser?.roleEntityId ?? undefined : undefined,
      vesselId: currentUser?.vessel?.id,
      companyId:
        currentUser?.companyAdminId ??
        currentUser?.companyGroupAdminId ??
        currentUser?.vessel?.companyAdminId ??
        currentUser?.vessel?.companyGroupAdminId,
    }
  }, [currentUser, roleType])

  const submissionFilterParams = useMemo(() => {
    const params: { companyId?: number; crewId?: number; vesselId?: number } = {}
    if (submissionContext.companyId) params.companyId = submissionContext.companyId
    if (submissionContext.vesselId) params.vesselId = submissionContext.vesselId
    if (isCrew && submissionContext.crewId) params.crewId = submissionContext.crewId
    return params
  }, [isCrew, submissionContext.companyId, submissionContext.crewId, submissionContext.vesselId])

  const scopeSubmissions = useCallback(
    (list: TechnicalFormSubmission[]) => {
      return list.filter((submission) => {
        if (submissionFilterParams.companyId && submission.companyId !== submissionFilterParams.companyId) {
          return false
        }
        if (submissionFilterParams.vesselId && submission.vesselId !== submissionFilterParams.vesselId) {
          return false
        }
        if (submissionFilterParams.crewId && submission.crewId !== submissionFilterParams.crewId) {
          return false
        }
        return true
      })
    },
    [submissionFilterParams.companyId, submissionFilterParams.crewId, submissionFilterParams.vesselId]
  )

  const staticFormMap = useMemo(() => {
    const map = new Map<string, (typeof STATIC_FORMS)[number]>()
    STATIC_FORMS.forEach((form) => map.set(normalizeCode(form.code), form))
    return map
  }, [normalizeCode])

  const templateById = useMemo(() => {
    const map = new Map<number, TechnicalFormTemplate>()
    templates.forEach((template) => map.set(template.id, template))
    return map
  }, [templates])

  const loadTemplates = useCallback(async () => {
    try {
      setLoadingTemplates(true)
      const data = await fetchTechnicalFormTemplates(
        submissionContext.companyId ? { companyId: submissionContext.companyId } : undefined
      )
      setTemplates(data)
      setSelectedTemplate((prev) => prev || (data.length ? data[0] : null))
      return data
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Unable to load forms')
      return null
    } finally {
      setLoadingTemplates(false)
    }
  }, [submissionContext.companyId])

  useEffect(() => {
    loadTemplates()
  }, [loadTemplates])

  const loadAllSubmissions = useCallback(async () => {
    if (!templates.length) {
      setSubmissions([])
      return
    }
    try {
      setLoadingSubmissions(true)
      const results = await Promise.all(
        templates.map((template) =>
          fetchTechnicalFormSubmissions(template.id, submissionFilterParams).catch(() => [])
        )
      )
      const merged = results.flat()
      setSubmissions(scopeSubmissions(merged))
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Unable to load submissions')
    } finally {
      setLoadingSubmissions(false)
    }
  }, [scopeSubmissions, submissionFilterParams, templates])

  useEffect(() => {
    loadAllSubmissions()
  }, [loadAllSubmissions])

  useEffect(() => {
    if (isCrew) return
    let active = true
    const tasks: Promise<void>[] = []

    if (!vessels.length) {
      tasks.push(
        getVesselList()
          .then((list) => {
            if (!active) return
            setVessels(list)
          })
          .catch((err: any) => {
            if (!active) return
            toast.error(err?.response?.data?.message || err?.message || 'Unable to load vessels')
          })
      )
    }

    if (!crewList.length) {
      tasks.push(
        getCrewList()
          .then((list) => {
            if (!active) return
            setCrewList(list)
          })
          .catch((err: any) => {
            if (!active) return
            toast.error(err?.response?.data?.message || err?.message || 'Unable to load crew list')
          })
      )
    }

    if (!tasks.length) return
    Promise.all(tasks)
      .catch(() => undefined)
      .finally(() => {
        if (!active) return
      })

    return () => {
      active = false
    }
  }, [crewList.length, isCrew, vessels.length])

  const submissionStatuses = useMemo(() => {
    const unique = new Set<string>()
    submissions.forEach((s) => s.status && unique.add(s.status))
    return Array.from(unique)
  }, [submissions])

  const submissionTemplate = useMemo(() => {
    if (!submissionTemplateId) return null
    return templates.find((template) => template.id === submissionTemplateId) || null
  }, [submissionTemplateId, templates])

  const formatOptions = useMemo(() => {
    if (submissionTemplate?.allowedFormats?.length) return submissionTemplate.allowedFormats
    const unique = new Set<string>()
    submissions.forEach((s) => s.uploadedFormat && unique.add(s.uploadedFormat))
    return Array.from(unique)
  }, [submissionTemplate?.allowedFormats, submissions])

  const scopedVessels = useMemo(() => {
    if (isCrew) {
      const crewVessel = currentUser?.vessel as Vessel | null | undefined
      return crewVessel ? [crewVessel] : []
    }
    if (isSuperAdmin) return vessels
    if (companyAdminId) {
      return vessels.filter((vessel) => vessel.companyAdmin?.id === companyAdminId)
    }
    if (companyGroupAdminId) {
      return vessels.filter((vessel) => vessel.companyGroupAdmin?.id === companyGroupAdminId)
    }
    return vessels
  }, [companyAdminId, companyGroupAdminId, currentUser?.vessel, isCrew, isSuperAdmin, vessels])

  const crewNameById = useMemo(() => {
    const map = new Map<number, string>()
    crewList.forEach((crew) => {
      if (companyAdminId && crew.companyAdminId !== companyAdminId) return
      if (!companyAdminId && companyGroupAdminId && crew.companyGroupAdminId !== companyGroupAdminId) return
      map.set(crew.id, crew.name)
    })
    const currentCrewId = currentUser?.roleEntityId
    const currentCrewName = currentUser?.roleEntityName || currentUser?.username
    if (isCrew && currentCrewId && currentCrewName && !map.has(currentCrewId)) {
      map.set(currentCrewId, currentCrewName)
    }
    return map
  }, [
    companyAdminId,
    companyGroupAdminId,
    crewList,
    currentUser?.roleEntityId,
    currentUser?.roleEntityName,
    currentUser?.username,
    isCrew,
  ])

  const vesselNameById = useMemo(() => {
    const map = new Map<number, string>()
    scopedVessels.forEach((vessel) => {
      if (!vessel?.id) return
      map.set(vessel.id, vessel.fleet_name)
    })
    const currentVesselId = currentUser?.vessel?.id
    const currentVesselName = currentUser?.vessel?.fleet_name
    if (currentVesselId && currentVesselName && !map.has(currentVesselId)) {
      map.set(currentVesselId, currentVesselName)
    }
    return map
  }, [currentUser?.vessel?.fleet_name, currentUser?.vessel?.id, scopedVessels])

  const getVesselId = (submission: TechnicalFormSubmission) => {
    const withLookups = submission as SubmissionWithLookups
    return submission.vesselId ?? withLookups.vessel?.id
  }

  const getSubmitterKey = (submission: TechnicalFormSubmission) => {
    const withLookups = submission as SubmissionWithLookups
    const crewId = submission.crewId ?? withLookups.crew?.id
    if (crewId) return `crew:${crewId}`
    const userId = submission.submittedByUserId ?? withLookups.submittedBy?.id
    if (userId) return `user:${userId}`
    return ''
  }

  const resolveVesselLabel = (submission: TechnicalFormSubmission) => {
    const withLookups = submission as SubmissionWithLookups
    const vesselId = getVesselId(submission)
    if (!vesselId) return '-'
    return (
      withLookups.vesselName ||
      withLookups.vessel?.fleet_name ||
      vesselNameById.get(vesselId) ||
      `Vessel #${vesselId}`
    )
  }

  const resolveSubmitterLabel = (submission: TechnicalFormSubmission) => {
    const withLookups = submission as SubmissionWithLookups
    const crewId = submission.crewId ?? withLookups.crew?.id
    if (crewId) {
      return (
        crewNameById.get(crewId) || withLookups.crewName || withLookups.crew?.name || `Crew #${crewId}`
      )
    }
    const userId = submission.submittedByUserId ?? withLookups.submittedBy?.id
    if (userId) {
      return (
        withLookups.submittedByName ||
        withLookups.submittedBy?.username ||
        withLookups.submittedBy?.name ||
        `User #${userId}`
      )
    }
    return '-'
  }

  const vesselOptions = useMemo(() => {
    const unique = new Map<string, string>()
    submissions.forEach((submission) => {
      const vesselId = getVesselId(submission)
      if (!vesselId) return
      const label = resolveVesselLabel(submission)
      unique.set(String(vesselId), label)
    })
    return Array.from(unique.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [submissions, vesselNameById])

  const submitterOptions = useMemo(() => {
    const unique = new Map<string, string>()
    submissions.forEach((submission) => {
      const key = getSubmitterKey(submission)
      if (!key) return
      const label = resolveSubmitterLabel(submission)
      unique.set(key, label)
    })
    return Array.from(unique.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [crewNameById, submissions])

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((s) => {
      const statusOk = statusFilter === 'all' || (s.status || '').toLowerCase() === statusFilter
      const formatOk = formatFilter === 'all' || (s.uploadedFormat || '').toLowerCase() === formatFilter
      const templateOk = !submissionTemplateId || s.templateId === submissionTemplateId
      const vesselId = getVesselId(s)
      const vesselOk = vesselFilter === 'all' || (vesselId ? String(vesselId) === vesselFilter : false)
      const submitterKey = getSubmitterKey(s)
      const submitterOk = submittedByFilter === 'all' || (submitterKey ? submitterKey === submittedByFilter : false)
      return statusOk && formatOk && templateOk && vesselOk && submitterOk
    })
  }, [
    formatFilter,
    statusFilter,
    submissionTemplateId,
    submissions,
    submittedByFilter,
    vesselFilter,
  ])

  const allowedFormatsText = useMemo(() => {
    if (!selectedTemplate?.allowedFormats?.length) return 'Any'
    return selectedTemplate.allowedFormats.join(', ')
  }, [selectedTemplate])

  const refreshSubmissions = async () => {
    await loadAllSubmissions()
  }

  const resolveFileUrl = (url?: string | null) => {
    if (!url) return ''
    if (/^https?:\/\//i.test(url)) return url
    const normalized = url.startsWith('/') ? url : `/${url}`
    return `${window.location.origin}${normalized}`
  }

  const handleTemplateCreated = (tpl: TechnicalFormTemplate) => {
    setTemplates((prev) => (prev.find((t) => t.id === tpl.id) ? prev : [...prev, tpl]))
    setSelectedTemplate((prev) => prev || tpl)
    toast.success('Template created')
  }

  const handleUpload = async () => {
    if (!selectedTemplate) return toast.error('Select a template first')
    if (!isCrew) return toast.error('Only crew can upload filled forms.')
    if (!file) return toast.error('Choose a file to upload')

    try {
      setUploading(true)
      await uploadTechnicalFormSubmission(selectedTemplate.id, { file, remarks, ...submissionContext })
      toast.success('Submission uploaded')
      setFile(null)
      setRemarks('')
      await refreshSubmissions()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (submissionId: number) => {
    if (!selectedTemplate) return
    const confirmed = window.confirm('Delete this submission? This cannot be undone.')
    if (!confirmed) return

    try {
      setDeletingId(submissionId)
      await deleteTechnicalFormSubmission(submissionId, { userId: currentUser?.id })
      toast.success('Submission deleted')
      await refreshSubmissions()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Unable to delete submission')
    } finally {
      setDeletingId(null)
    }
  }

  const openView = (submission: TechnicalFormSubmission) => {
    setViewSubmission(submission)
    setViewError(null)

    if (!submission.submissionData) {
      setViewError('No inline data stored for this submission. Download the file to view it.')
      setViewPayload(null)
      return
    }

    try {
      setViewPayload(JSON.parse(submission.submissionData))
    } catch {
      setViewPayload(null)
      setViewError('Unable to read saved form data. Please download the file instead.')
    }
  }

  const closeView = () => {
    setViewSubmission(null)
    setViewPayload(null)
    setViewError(null)
  }

  const viewStaticForm = useMemo(() => {
    if (!viewPayload?.formCode) return null
    return staticFormMap.get(normalizeCode(viewPayload.formCode)) || null
  }, [normalizeCode, staticFormMap, viewPayload?.formCode])

  const viewTemplate = useMemo(() => {
    if (!viewSubmission) return null
    return templateById.get(viewSubmission.templateId) || null
  }, [templateById, viewSubmission])

  const pdfStaticForm = useMemo(() => {
    if (!pdfPayload?.formCode) return null
    return staticFormMap.get(normalizeCode(pdfPayload.formCode)) || null
  }, [normalizeCode, pdfPayload?.formCode, staticFormMap])

  const pdfTemplate = useMemo(() => {
    if (!pdfSubmission) return null
    return templateById.get(pdfSubmission.templateId) || null
  }, [pdfSubmission, templateById])

  const formatChecklistAnswer = (value: unknown) => {
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase()
      if (normalized === 'na' || normalized === 'n/a') return 'NA'
      if (normalized === 'yes' || normalized === 'y') return 'Yes'
      if (normalized === 'no' || normalized === 'n') return 'No'
    }
    if (typeof value === 'boolean') return value ? 'Yes' : 'No'
    if (value == null) return 'No'
    return String(value)
  }

  const renderPdfFieldValue = (
    field: (typeof STATIC_FORMS)[number]['fields'][number],
    payload: any
  ): React.ReactNode => {
    if (!payload?.data) return '-'
    const val = payload.data[field.name]

    if (field.type === 'checklist' && field.items) {
      const checklist = (val as Record<string, unknown>) || {}
      return (
        <div style={{ display: 'grid', gap: '6px' }}>
          {field.items.map((item) => (
            <div
              key={item}
              style={{
                fontSize: '11px',
                lineHeight: 1.4,
                whiteSpace: 'normal',
                overflowWrap: 'anywhere',
                wordBreak: 'break-word',
                breakInside: 'avoid',
                pageBreakInside: 'avoid',
              }}
            >
              <span style={{ color: '#1e1e2d' }}>{item}: </span>
              <span style={{ fontWeight: 600 }}>{formatChecklistAnswer(checklist[item])}</span>
            </div>
          ))}
        </div>
      )
    }

    const text = (val as string) || '-'
    return (
      <div
        style={{
          whiteSpace: 'pre-wrap',
          overflowWrap: 'anywhere',
          wordBreak: 'break-word',
        }}
      >
        {text}
      </div>
    )
  }

  const buildPdfResponseRows = (fields: (typeof STATIC_FORMS)[number]['fields'], payload: any) => {
    const rows: React.ReactNode[] = []
    const buffer: (typeof STATIC_FORMS)[number]['fields'] = []
    const pushPair = (left?: (typeof STATIC_FORMS)[number]['fields'][number], right?: (typeof STATIC_FORMS)[number]['fields'][number]) => {
      rows.push(
        <tr
          key={`${left?.name || 'empty'}-${right?.name || 'empty'}`}
          style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
        >
          <td style={{ padding: '6px', verticalAlign: 'top', width: '50%' }}>
            {left ? (
              <div
                className='pdf-avoid'
                style={{
                  border: '1px solid #e4e6ef',
                  borderRadius: '6px',
                  padding: '10px',
                  breakInside: 'avoid',
                  pageBreakInside: 'avoid',
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: '4px', fontSize: '12px' }}>{left.label}</div>
                <div
                  style={{
                    color: '#7e8299',
                    fontSize: '11px',
                    whiteSpace: 'normal',
                    overflowWrap: 'anywhere',
                    wordBreak: 'break-word',
                  }}
                >
                  {renderPdfFieldValue(left, payload)}
                </div>
              </div>
            ) : null}
          </td>
          <td style={{ padding: '6px', verticalAlign: 'top', width: '50%' }}>
            {right ? (
              <div
                className='pdf-avoid'
                style={{
                  border: '1px solid #e4e6ef',
                  borderRadius: '6px',
                  padding: '10px',
                  breakInside: 'avoid',
                  pageBreakInside: 'avoid',
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: '4px', fontSize: '12px' }}>{right.label}</div>
                <div
                  style={{
                    color: '#7e8299',
                    fontSize: '11px',
                    whiteSpace: 'normal',
                    overflowWrap: 'anywhere',
                    wordBreak: 'break-word',
                  }}
                >
                  {renderPdfFieldValue(right, payload)}
                </div>
              </div>
            ) : null}
          </td>
        </tr>
      )
    }

    fields.forEach((field) => {
      if (field.type === 'checklist') {
        if (buffer.length) {
          pushPair(buffer[0], buffer[1])
          buffer.length = 0
        }
        rows.push(
          <tr key={field.name} style={{ breakInside: 'auto', pageBreakInside: 'auto' }}>
            <td colSpan={2} style={{ padding: '6px', verticalAlign: 'top' }}>
              <div
                style={{
                  border: '1px solid #e4e6ef',
                  borderRadius: '6px',
                  padding: '10px',
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: '6px', fontSize: '12px' }}>{field.label}</div>
                <div style={{ color: '#7e8299', fontSize: '11px' }}>{renderPdfFieldValue(field, payload)}</div>
              </div>
            </td>
          </tr>
        )
      } else {
        buffer.push(field)
        if (buffer.length === 2) {
          pushPair(buffer[0], buffer[1])
          buffer.length = 0
        }
      }
    })

    if (buffer.length) {
      pushPair(buffer[0], undefined)
    }

    return rows
  }

  const renderFieldValue = (
    field: (typeof STATIC_FORMS)[number]['fields'][number],
    payload?: any
  ) => {
    const source = payload || viewPayload
    if (!source?.data) return '-'
    const val = source.data[field.name]
    if (field.type === 'checklist' && field.items) {
      const checklist = (val as Record<string, unknown>) || {}
      return (
        <ul className='mb-0 ps-3'>
          {field.items.map((item) => (
            <li key={item}>
              {item}: <span className='fw-semibold'>{formatChecklistAnswer(checklist[item])}</span>
            </li>
          ))}
        </ul>
      )
    }
    return (val as string) || '-'
  }

  const badgeForStatus = (st?: string) => {
    const v = (st || '').toLowerCase()
    if (!v) return <span className='badge badge-light'>-</span>
    if (v.includes('approved')) return <span className='badge badge-light-success'>{st}</span>
    if (v.includes('rejected')) return <span className='badge badge-light-danger'>{st}</span>
    if (v.includes('pending')) return <span className='badge badge-light-warning'>{st}</span>
    return <span className='badge badge-light-primary'>{st}</span>
  }

  const parseSubmissionPayload = (submission: TechnicalFormSubmission) => {
    if (!submission.submissionData) {
      return { payload: null, error: 'No inline data stored for this submission.' }
    }
    try {
      return { payload: JSON.parse(submission.submissionData), error: null }
    } catch {
      return { payload: null, error: 'Unable to read saved form data.' }
    }
  }

  const buildPdfFileName = (submission: TechnicalFormSubmission, payload?: any) => {
    const template = templateById.get(submission.templateId)
    const raw = payload?.formCode || template?.code || `submission_${submission.id}`
    const safe = String(raw).replace(/[^a-z0-9_-]+/gi, '_')
    return `${safe}_${submission.id}.pdf`
  }

  const downloadSubmissionPdf = async (submission: TechnicalFormSubmission) => {
    if (pdfBusy) return
    const { payload, error } = parseSubmissionPayload(submission)
    if (!payload) {
      toast.error(error || 'Unable to generate PDF for this submission.')
      return
    }
    setPdfSubmission(submission)
    setPdfPayload(payload)
    setPdfError(null)
    setPdfBusy(true)

    setTimeout(async () => {
      try {
        const element = pdfRef.current
        if (!element) return

        if (document?.fonts?.ready) await document.fonts.ready
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
        )

        const html2pdf = (await import('html2pdf.js')).default

        await html2pdf()
          .from(element)
          .set({
            filename: buildPdfFileName(submission, payload),
            jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' },
            html2canvas: {
              scale: 2,
              useCORS: true,
              backgroundColor: '#ffffff',
              windowWidth: element.scrollWidth,
            },
            margin: [28, 28, 28, 28],
            pagebreak: { mode: ['css', 'legacy'], avoid: ['.pdf-avoid', '.pdf-card', 'tr'] },
          })
          .save()
      } catch {
        toast.error('Unable to generate PDF for this submission.')
      } finally {
        setPdfBusy(false)
      }
    }, 250)
  }

  return (
    <>
      <div className='app-main flex-column flex-row-fluid' id='kt_app_main'>
        <div className='d-flex flex-column flex-column-fluid'>
          <div id='kt_app_content' className='app-content flex-column-fluid bg-white'>
            <div className='card mb-5'>
              <div className='card-header border-0 pt-6 d-flex justify-content-between align-items-center bg-white'>
                <div>
                  <h3 className='card-label text-dark fw-bold'>Forms &amp; Checklists</h3>
                  <p className='text-muted mb-0'>Manage company forms, fill online, and review submissions.</p>
                </div>
                <div className='card-toolbar d-flex gap-2'>
                  <button
                    type='button'
                    className='btn btn_primary'
                    onClick={() => setShowFormModal(true)}
                  >
                    Form Fillup
                  </button>
                  <button
                    type='button'
                    className='btn btn_primary'
                    disabled={loadingTemplates || loadingSubmissions}
                    onClick={async () => {
                      await loadTemplates()
                      await refreshSubmissions()
                    }}
                  >
                    {loadingTemplates || loadingSubmissions ? 'Refreshing...' : 'Refresh'}
                  </button>
                </div>
              </div>

              <div className='card-body py-4 bg-white border-top'>
                <div className='row gy-4'>
                  <div className='col-12'>
                    <div className='card shadow-none border'>
                      <div className='card-header d-flex flex-wrap justify-content-between align-items-center gap-3'>
                        <div>
                          <h5 className='mb-0' style={{ color: '#181C32' }}>
                            Submissions
                          </h5>
                          <div className='text-muted small'>All submissions loaded by default. Use filters to refine.</div>
                        </div>

                        <div
                          className='d-flex flex-wrap align-items-center justify-content-end gap-2'
                          style={{ maxWidth: 980 }}
                        >
                          <select
                            className='form-select form-select-sm'
                            value={submissionTemplateId ?? 'all'}
                            onChange={(e) => {
                              const raw = e.target.value
                              if (raw === 'all' || raw === '') {
                                setSubmissionTemplateId(null)
                                return
                              }
                              const nextId = Number(raw)
                              if (Number.isNaN(nextId)) {
                                setSubmissionTemplateId(null)
                                return
                              }
                              setSubmissionTemplateId(nextId)
                              const nextTemplate = templates.find((template) => template.id === nextId) || null
                              if (nextTemplate) setSelectedTemplate(nextTemplate)
                            }}
                            style={{ minWidth: 240, flex: '0 0 240px' }}
                          >
                            <option value='all'>All templates</option>
                            {templates.map((t) => (
                              <option key={t.id} value={t.id}>
                                {(t.code || '').toUpperCase()} - {t.title}
                              </option>
                            ))}
                          </select>
                          <select
                            className='form-select form-select-sm'
                            value={vesselFilter}
                            onChange={(e) => setVesselFilter(e.target.value)}
                            style={{ minWidth: 180, flex: '0 0 180px' }}
                          >
                            <option value='all'>All vessels</option>
                            {vesselOptions.map((vessel) => (
                              <option key={vessel.value} value={vessel.value}>
                                {vessel.label}
                              </option>
                            ))}
                          </select>
                          <select
                            className='form-select form-select-sm'
                            value={submittedByFilter}
                            onChange={(e) => setSubmittedByFilter(e.target.value)}
                            style={{ minWidth: 180, flex: '0 0 180px' }}
                          >
                            <option value='all'>All submitters</option>
                            {submitterOptions.map((submitter) => (
                              <option key={submitter.value} value={submitter.value}>
                                {submitter.label}
                              </option>
                            ))}
                          </select>
                          <select
                            className='form-select form-select-sm'
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value.toLowerCase())}
                            style={{ minWidth: 160, flex: '0 0 160px' }}
                          >
                            <option value='all'>All statuses</option>
                            {submissionStatuses.map((st) => (
                              <option key={st} value={(st || '').toLowerCase()}>
                                {st}
                              </option>
                            ))}
                          </select>

                          <select
                            className='form-select form-select-sm'
                            value={formatFilter}
                            onChange={(e) => setFormatFilter(e.target.value.toLowerCase())}
                            style={{ minWidth: 160, flex: '0 0 160px' }}
                          >
                            <option value='all'>All formats</option>
                            {formatOptions.map((fmt) => (
                              <option key={fmt} value={(fmt || '').toLowerCase()}>
                                {fmt}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className='card-body p-0'>
                        {loadingSubmissions ? (
                          <div className='p-4 d-flex align-items-center gap-2 text-muted'>
                            <span className='spinner-border spinner-border-sm' />
                            Loading submissions...
                          </div>
                        ) : filteredSubmissions.length === 0 ? (
                          <div className='p-4'>
                            <div className='alert alert-light mb-0'>
                              <i className='fas fa-info-circle me-2' />
                              No submissions match these filters.
                            </div>
                          </div>
                        ) : (
                          <div className='table-responsive'>
                            <table
                              className='table table-bordered align-middle mb-0'
                              style={{ tableLayout: 'fixed', width: '100%' }}
                            >
                              <thead className='bg-light'>
                                <tr className='text-muted fw-semibold'>
                                  <th style={{ width: 80 }}>ID</th>
                                  <th style={{ width: 240 }}>Template</th>
                                  <th style={{ width: 180 }}>Vessel</th>
                                  <th style={{ width: 200 }}>Submitted By</th>
                                  <th style={{ width: 150 }}>Status</th>
                                  <th style={{ width: 120 }}>Format</th>
                                  <th style={{ width: 180 }}>Submitted</th>
                                  <th className='text-end' style={{ width: 260 }}>
                                    Actions
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {filteredSubmissions.map((s) => (
                                  <tr key={s.id}>
                                    <td className='fw-semibold' style={{ color: '#181C32' }}>
                                      #{s.id}
                                    </td>
                                    <td>
                                      <div className='fw-semibold' style={{ color: '#181C32' }}>
                                        {(templateById.get(s.templateId)?.code || '-').toUpperCase()}
                                      </div>
                                      <div className='text-muted small'>
                                        {templateById.get(s.templateId)?.title || 'Unknown template'}
                                      </div>
                                    </td>
                                    <td className='text-muted'>{resolveVesselLabel(s)}</td>
                                    <td className='text-muted'>{resolveSubmitterLabel(s)}</td>
                                    <td>{badgeForStatus(s.status)}</td>
                                    <td className='text-muted'>{s.uploadedFormat || '-'}</td>
                                    <td className='text-muted'>
                                      {s.createdAt ? new Date(s.createdAt).toLocaleString() : '-'}
                                    </td>
                                    <td className='text-end'>
                                      <div className='d-flex justify-content-end gap-2'>
                                        <button
                                          className='btn btn-light btn-sm'
                                          type='button'
                                          onClick={() => openView(s)}
                                        >
                                          View
                                        </button>
                                        <button
                                          className='btn btn-light btn-sm'
                                          type='button'
                                          onClick={() => downloadSubmissionPdf(s)}
                                          disabled={pdfBusy}
                                        >
                                          {pdfBusy ? 'Preparing...' : 'Download PDF'}
                                        </button>
                                        <button
                                          className='btn btn-danger btn-sm'
                                          type='button'
                                          onClick={() => handleDelete(s.id)}
                                          disabled={deletingId === s.id}
                                        >
                                          {deletingId === s.id ? 'Deleting...' : 'Delete'}
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className='col-12'>
                    <div className='card shadow-none border'>
                      <div className='card-header d-flex justify-content-between align-items-center'>
                        <div>
                          <h5 className='mb-0' style={{ color: '#181C32' }}>
                            Upload Filled Form
                          </h5>
                          <div className='text-muted small'>
                            Selected:{' '}
                            <span className='fw-semibold'>
                              {selectedTemplate ? selectedTemplate.title : 'None'}
                            </span>
                          </div>
                        </div>
                        <div>
                          {selectedTemplate?.code ? (
                            <span className='badge badge-light-primary'>
                              {selectedTemplate.code.toUpperCase()}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className='card-body'>
                        {!selectedTemplate ? (
                          <div className='alert alert-light mb-0'>
                            <i className='fas fa-info-circle me-2' />
                            Select a form first from <span className='fw-semibold'>Form Fillup</span>.
                          </div>
                        ) : (
                          <>
                            <div className='mb-3'>
                              <div className='text-muted small'>
                                Allowed formats: <span className='fw-semibold'>{allowedFormatsText}</span> | Version:{' '}
                                <span className='fw-semibold'>{selectedTemplate.version || 'N/A'}</span>
                              </div>
                            </div>

                            {!isCrew ? (
                              <div className='alert alert-warning mb-0'>
                                <i className='fas fa-lock me-2' />
                                Only crew can upload filled forms.
                              </div>
                            ) : (
                              <div className='row g-3'>
                                <div className='col-12'>
                                  <label
                                    className='form-label required fw-semibold fs-6 mb-2'
                                    style={{ color: '#181C32' }}
                                  >
                                    File
                                  </label>
                                  <input
                                    type='file'
                                    className='form-control'
                                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                                  />
                                  <div className='text-muted small mt-1'>Upload the filled offline form.</div>
                                </div>

                                <div className='col-12'>
                                  <label className='form-label fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>
                                    Remarks (optional)
                                  </label>
                                  <textarea
                                    className='form-control'
                                    rows={3}
                                    value={remarks}
                                    onChange={(e) => setRemarks(e.target.value)}
                                    placeholder='Add any notes for the office / reviewer...'
                                  />
                                </div>

                                <div className='col-12 d-flex gap-2'>
                                  <button className='btn btn_primary' onClick={handleUpload} disabled={uploading}>
                                    {uploading ? 'Uploading...' : 'Upload'}
                                  </button>
                                  <button
                                    className='btn btn-light'
                                    type='button'
                                    onClick={() => {
                                      setFile(null)
                                      setRemarks('')
                                    }}
                                    disabled={uploading}
                                  >
                                    Clear
                                  </button>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
      </div>
    </div>
  </div>
</div>

      {pdfSubmission && pdfPayload && (
        <div
          style={{
            position: 'fixed',
            left: '-10000px',
            top: 0,
            width: '210mm',
            background: '#fff',
            visibility: 'hidden',
            zIndex: -1,
          }}
        >
          <div
            ref={pdfRef}
            className='pdf-content'
            style={{
              width: '210mm',
              padding: '10mm',
              backgroundColor: '#ffffff',
              color: '#181C32',
              fontFamily: 'Arial, sans-serif',
              boxSizing: 'border-box',
            }}
          >
            <style>
              {`
                .pdf-content, .pdf-content * {
                  box-sizing: border-box;
                }
                .pdf-content {
                  font-size: 12px;
                }
                .pdf-card {
                  break-inside: avoid;
                  page-break-inside: avoid;
                }
                table {
                  width: 100%;
                  border-collapse: collapse;
                }
                td, th {
                  vertical-align: top;
                  word-break: break-word;
                  overflow-wrap: anywhere;
                }
              `}
            </style>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 700 }}>Submission #{pdfSubmission.id}</div>
                <div style={{ color: '#7e8299', fontSize: '12px' }}>
                  {pdfPayload?.formTitle || pdfTemplate?.title || 'Form Submission'}
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '12px', color: '#7e8299' }}>
                <div>{pdfPayload?.formCode || pdfTemplate?.code || '-'}</div>
                <div>{pdfSubmission.createdAt ? new Date(pdfSubmission.createdAt).toLocaleString() : '-'}</div>
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '6px', width: '50%' }}>
                    <div
                      className='pdf-card pdf-avoid'
                      style={{ border: '1px solid #e4e6ef', borderRadius: '8px', padding: '12px' }}
                    >
                      <div style={{ fontWeight: 600, marginBottom: '8px' }}>Submission Details</div>
                      <div style={{ fontSize: '12px', color: '#7e8299' }}>
                        <div>
                          Template Code: <strong>{pdfPayload?.formCode || pdfTemplate?.code || '-'}</strong>
                        </div>
                        <div>
                          Version: <strong>{pdfSubmission.templateVersion || '-'}</strong>
                        </div>
                        <div>
                          Format: <strong>{pdfSubmission.uploadedFormat || '-'}</strong>
                        </div>
                        <div>
                          Status: <strong>{pdfSubmission.status || '-'}</strong>
                        </div>
                      </div>
                    </div>
                  </td>

                  <td style={{ padding: '6px', width: '50%' }}>
                    <div
                      className='pdf-card pdf-avoid'
                      style={{ border: '1px solid #e4e6ef', borderRadius: '8px', padding: '12px' }}
                    >
                      <div style={{ fontWeight: 600, marginBottom: '8px' }}>Form Summary</div>
                      <div style={{ fontSize: '12px', color: '#7e8299' }}>
                        <div>
                          Form Title: <strong>{pdfPayload?.formTitle || pdfTemplate?.title || '-'}</strong>
                        </div>
                        <div>
                          Crew ID: <strong>{pdfSubmission.crewId ?? '-'}</strong>
                        </div>
                        <div>
                          Vessel ID: <strong>{pdfSubmission.vesselId ?? '-'}</strong>
                        </div>
                        <div>
                          Remarks: <strong>{pdfPayload?.remarks || pdfSubmission.remarks || '-'}</strong>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            <div className='pdf-card' style={{ border: '1px solid #e4e6ef', borderRadius: '8px', padding: '12px' }}>
              <div style={{ fontWeight: 600, marginBottom: '12px' }}>Form Responses</div>

              {pdfError ? (
                <div style={{ color: '#f1416c', fontSize: '12px' }}>{pdfError}</div>
              ) : pdfStaticForm ? (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>{buildPdfResponseRows(pdfStaticForm.fields, pdfPayload)}</tbody>
                </table>
              ) : (
                <pre style={{ fontSize: '11px', margin: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                  {pdfSubmission.submissionData}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}

      {showFormModal && (
  <div
    className='ff-overlay'
    onMouseDown={(e) => {
      // close only when clicking outside the panel
      if (e.target === e.currentTarget) setShowFormModal(false)
    }}
  >
    <div className='ff-panel' role='dialog' aria-modal='true' onMouseDown={(e) => e.stopPropagation()}>
      <div className='ff-header'>
        <div>
          <div className='ff-title'>Form Fillup</div>
          <div className='ff-subtitle'>Fill and submit technical forms.</div>
        </div>

        <button className='ff-close' type='button' onClick={() => setShowFormModal(false)} aria-label='Close'>
          ✕
        </button>
      </div>

      <div className='ff-body'>
        <StaticFormRenderer
          templates={templates}
          refreshTemplates={loadTemplates as any}
          onTemplateCreated={handleTemplateCreated as any}
          onSubmissionUploaded={refreshSubmissions}
          submissionContext={submissionContext as any}
          canSubmit={isCrew as any}
        />
      </div>
    </div>

    {/* ✅ Modal CSS */}
    <style>{`
      .ff-overlay {
        position: fixed;
        inset: 0;
        z-index: 1050;
        background: rgba(0,0,0,0.55);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 18px;
      }

      .ff-panel {
        width: min(1400px, calc(100vw - 36px));   /* ✅ actually wide */
        height: min(88vh, 900px);                /* ✅ good height */
        background: #fff;
        border-radius: 14px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.25);
        display: flex;
        flex-direction: column;
        overflow: hidden;                         /* ✅ prevents weird scroll edges */
      }

      .ff-header {
        padding: 18px 20px 10px 20px;
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        border-bottom: 1px solid #eef0f5;
      }

      .ff-title {
        font-size: 18px;
        font-weight: 700;
        color: #181C32;
        line-height: 1.2;
      }

      .ff-subtitle {
        font-size: 12px;
        color: #7e8299;
        margin-top: 4px;
      }

      .ff-close {
        border: none;
        background: #f5f8fa;
        color: #181C32;
        width: 36px;
        height: 36px;
        border-radius: 10px;
        cursor: pointer;
        font-size: 18px;
        line-height: 1;
        display: grid;
        place-items: center;
      }

      .ff-close:hover {
        background: #eef2f7;
      }

      .ff-body {
        padding: 14px 20px 20px 20px;
        overflow: auto;                          /* ✅ scroll inside modal */
      }

      /* Mobile tuning */
      @media (max-width: 768px) {
        .ff-overlay { padding: 10px; }
        .ff-panel {
          width: calc(100vw - 20px);
          height: calc(100vh - 20px);
          border-radius: 12px;
        }
        .ff-body { padding: 12px; }
      }
    `}</style>
  </div>
)}


      {/* View modal (CategoryModal style) */}
      {viewSubmission && (
        <div
          className='modal fade show d-flex align-items-center justify-content-center'
          tabIndex={-1}
          style={{
            backgroundColor: 'rgba(0,0,0,0.5)',
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1050,
          }}
        >
          <div
            className='modal-dialog modal-xxl modal-dialog-centered mx-auto'
            role='document'
            style={{
              maxWidth: '100%',
              width: '60%',
              margin: '0 auto',
              position: 'relative',
              left: '50%',
              transform: 'translateX(-50%)',
            }}
          >
            <div className='modal-content bg-white w-100' style={{ color: '#181C32' }}>
              <div className='modal-header border-0 pb-0'>
                <div>
                  <h3 className='modal-title fw-bold text-dark mb-1'>Submission #{viewSubmission.id}</h3>
                  <p className='text-muted mb-0 fs-7'>Review the submitted form details and responses.</p>
                </div>
                <button type='button' className='btn-close' onClick={closeView}></button>
              </div>

              <div className='modal-body pt-3' style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                <div
                  className='mb-4'
                  style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}
                >
                  <div>
                    <div
                      className='h-100 rounded-3 p-4 shadow-sm border'
                      style={{ background: 'linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 80%)' }}
                    >
                      <div className='d-flex align-items-center justify-content-between mb-3'>
                        <h6 className='fw-bold text-primary mb-0'>Submission Details</h6>
                        <span className='badge bg-light-primary text-primary'>Record</span>
                      </div>
                      <div className='mb-3'>
                        <label className='form-label fw-semibold text-muted fs-8 mb-1'>Template Code</label>
                        <div className='fw-bold text-dark'>{viewPayload?.formCode || viewTemplate?.code || '-'}</div>
                      </div>
                      <div className='row g-3 mb-3'>
                        <div className='col-sm-6'>
                          <label className='form-label fw-semibold text-muted fs-8 mb-1'>Version</label>
                          <div className='fw-bold text-dark'>{viewSubmission.templateVersion || '-'}</div>
                        </div>
                        <div className='col-sm-6'>
                          <label className='form-label fw-semibold text-muted fs-8 mb-1'>Format</label>
                          <div className='fw-bold text-dark'>{viewSubmission.uploadedFormat || '-'}</div>
                        </div>
                      </div>
                      <div className='row g-3'>
                        <div className='col-sm-6'>
                          <label className='form-label fw-semibold text-muted fs-8 mb-1'>Status</label>
                          <div>{badgeForStatus(viewSubmission.status)}</div>
                        </div>
                        <div className='col-sm-6'>
                          <label className='form-label fw-semibold text-muted fs-8 mb-1'>Submitted</label>
                          <div className='fw-bold text-dark'>
                            {viewSubmission.createdAt ? new Date(viewSubmission.createdAt).toLocaleString() : '-'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div
                      className='h-100 rounded-3 p-4 shadow-sm border'
                      style={{ background: 'linear-gradient(180deg, #FDF9FF 0%, #FFFFFF 80%)' }}
                    >
                      <div className='d-flex align-items-center justify-content-between mb-3'>
                        <h6 className='fw-bold text-primary mb-0'>Form Summary</h6>
                        <span className='badge bg-light text-primary border'>Overview</span>
                      </div>
                      <div className='mb-3'>
                        <label className='form-label fw-semibold text-muted fs-8 mb-1'>Form Title</label>
                        <div className='fw-bold text-dark'>{viewPayload?.formTitle || viewTemplate?.title || 'N/A'}</div>
                      </div>
                      <div className='row g-3 mb-3'>
                        <div className='col-sm-6'>
                          <label className='form-label fw-semibold text-muted fs-8 mb-1'>Crew ID</label>
                          <div className='fw-bold text-dark'>{viewSubmission.crewId ?? '-'}</div>
                        </div>
                        <div className='col-sm-6'>
                          <label className='form-label fw-semibold text-muted fs-8 mb-1'>Vessel ID</label>
                          <div className='fw-bold text-dark'>{viewSubmission.vesselId ?? '-'}</div>
                        </div>
                      </div>
                      <div className='mb-0'>
                        <label className='form-label fw-semibold text-muted fs-8 mb-1'>Remarks</label>
                        <div className='fw-bold text-dark'>
                          {viewPayload?.remarks || viewSubmission.remarks || '-'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className='card border shadow-sm'>
                  <div className='card-header border-0 pb-0'>
                    <div>
                      <h6 className='fw-bold text-primary mb-1'>Form Responses</h6>
                      <p className='text-muted mb-0 fs-7'>Captured answers from the submission.</p>
                    </div>
                  </div>
                  <div className='card-body pt-3'>
                    {viewError ? (
                      <div className='alert alert-danger mb-0'>
                        <i className='fas fa-exclamation-triangle me-2' />
                        {viewError}
                      </div>
                    ) : !viewPayload ? (
                      <div className='alert alert-light mb-0'>
                        <i className='fas fa-info-circle me-2' />
                        No inline data. Download the file to view this submission.
                      </div>
                    ) : viewStaticForm ? (
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                          gap: '12px',
                          width: '100%',
                        }}
                      >
                        {viewStaticForm.fields.map((field) => (
                          <div
                            key={field.name}
                            style={{
                              gridColumn: field.type === 'checklist' ? '1 / -1' : 'auto',
                              minWidth: 0,
                            }}
                          >
                            <div className='border rounded-3 p-3 h-100'>
                              <div className='fw-semibold text-dark mb-1'>{field.label}</div>
                              <div className='text-muted small'>{renderFieldValue(field)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <pre className='bg-light p-3 rounded small mb-0' style={{ whiteSpace: 'pre-wrap' }}>
                        {viewSubmission.submissionData}
                      </pre>
                    )}
                  </div>
                </div>
              </div>

              <div className='modal-footer border-0'>
                <button
                  className='btn btn-light btn-sm'
                  type='button'
                  onClick={() => downloadSubmissionPdf(viewSubmission)}
                  disabled={pdfBusy}
                >
                  {pdfBusy ? 'Preparing...' : 'Download PDF'}
                </button>
                <button className='btn btn_primary btn-sm' type='button' onClick={closeView}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default TechnicalFormsPage
