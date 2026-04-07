import {FC, useEffect, useMemo, useRef, useState, CSSProperties} from 'react'
import {FaChevronRight} from 'react-icons/fa'
import {KTSVG} from '../../../../_metronic/helpers'
import {Link, useLocation, useNavigate, useParams} from 'react-router-dom'
import ReportStep, {ReportStepRef} from './ReportStep'
import {useAuth} from '../../auth'
import {
  getAssignmentById,
  submitReport,
  updatedSubmittedReport,
  submitConsumptionROB,
} from '../core/_requests'
import {CreatedReports, Fields, Reports, ReportStatus, Submenu, Voyage, WarningLevel} from '../core/_models'
import CloseReportModal from './CloseReportModal'
import {validateField} from '../core/validationUtils'
import {toast, ToastContainer} from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import ConfirmOverwriteModal from './ConfirmOverwriteModal'
import AddConsumptionROB, {AddConsumptionROBRef, ConsumptionRequestDTO} from './AddConsumptionROB'

const CreateReport: FC = () => {
  const {assignmentId} = useParams<{assignmentId: string}>()

  const [selectedReport, setSelectedReport] = useState<Partial<Reports> | null>(null)
  const [tabs, setTabs] = useState<Submenu[]>([])
  const [fields, setFields] = useState<Fields[]>([])
  const [isCloseReportModalOpen, setIsCloseReportModalOpen] = useState<boolean>(false)
  const [isConfirmOverWriteModalOpen, setIsConfirmOverWriteModalOpen] = useState<boolean>(false)

  const stepRefs = useRef<ReportStepRef[]>([])
  const [stepCompletionStatus, setStepCompletionStatus] = useState<boolean[]>([])

  const [hasWarnings, setHasWarnings] = useState<boolean>(false)
  const [totalWarnings, setTotalWarnings] = useState<number>(0)
  const [warningsByStep, setWarningsByStep] = useState<Record<number, number>>({})
  const [hasWarningsByStep, setHasWarningsByStep] = useState<Record<number, boolean>>({})
  const [modalActionType, setModalActionType] = useState<'draft' | 'submit'>('draft')
  const [warningFields, setWarningFields] = useState<{stepId: number; fieldId: number; message: string}[]>([])

  const navigate = useNavigate()
  const [reportDate, setReportDate] = useState<string>(() => {
    const today = new Date()
    const day = String(today.getDate()).padStart(2, '0')
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const year = today.getFullYear()
    return `${day}/${month}/${year}`
  })
  const [currentStep, setCurrentStep] = useState(0)
  const [isLoadingFields, setIsLoadingFields] = useState(false)
  const location = useLocation()

  const consumptionRobRef = useRef<AddConsumptionROBRef>(null)

  const authCtx: any = useAuth()
  const {currentUser} = authCtx
  const roleId = currentUser?.role?.id
  const rankId = currentUser?.rank?.id

  const token =
    authCtx?.auth?.auth?.jwt ||
    authCtx?.auth?.jwt ||
    sessionStorage.getItem('jwt') ||
    sessionStorage.getItem('token') ||
    ''

  interface LocationState {
    selectedTabId?: number
    selectedVoyage?: Voyage
    formData?: {
      [tabId: number]: {
        [id: number]: {
          label: string
          value: any
        }
      }
    }
    draftReport?: CreatedReports
    isEditMode?: boolean
  }

  const state = (location.state || {}) as LocationState

  const {selectedTabId, selectedVoyage, draftReport, formData: passedFormData, isEditMode: initialIsEditMode} = state

  const [voyage, setVoyage] = useState<Voyage | null>(selectedVoyage ?? null)
  const [isEditMode, setIsEditMode] = useState<boolean>(initialIsEditMode ?? false)
  const [draftReportData, setDraftReportData] = useState<CreatedReports | null>(draftReport ?? null)

  const [formData, setFormData] = useState<{[tabId: number]: {[fieldId: string]: any}}>({})
  const [consumptionRefreshFlag, setConsumptionRefreshFlag] = useState(0)

  const shimmerKeyframes = `
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
  `

  const shimmerBaseStyle: CSSProperties = {
    background: 'linear-gradient(90deg, #f5f7fb 0%, #eef1f6 50%, #f5f7fb 100%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.3s ease-in-out infinite',
    borderRadius: '8px',
  }

  useEffect(() => {
    if (passedFormData) setFormData(passedFormData as any)
  }, [])

  useEffect(() => {
    if (selectedTabId && tabs.length > 0) {
      const index = tabs.findIndex(tab => tab.id === selectedTabId)
      if (index !== -1) {
        setCurrentStep(index)
        fetchFieldsforStep(selectedTabId)
      }
    }
  }, [tabs])

  useEffect(() => {
    if (tabs.length > 0 && currentStep >= 0) {
      const tab = tabs[currentStep]
      fetchFieldsforStep(tab.id)
    }
  }, [currentStep, tabs])

  useEffect(() => {
    if (draftReportData) {
      setReportDate(new Date(draftReportData.submittedDateTime).toLocaleDateString('en-GB'))
    }
  }, [draftReportData])

  const consumptionTab = useMemo(() => tabs.find(t => t.name === 'Consumption & ROB'), [tabs])
  const consumptionTabId = consumptionTab?.id

  const handleFieldChange = (tabId: number, label: string, id: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [tabId]: {
        ...(prev as any)[tabId],
        [id]: {label, value},
      },
    }))
  }

  // ---------- robust parsing helpers ----------
  const smartParse = <T,>(raw: any, fallback: T): T => {
    if (raw === undefined || raw === null || raw === '') return fallback
    if (typeof raw !== 'string') return raw as T
    try {
      return JSON.parse(raw) as T
    } catch {
      return raw as unknown as T
    }
  }

  const asStringArray = (v: any): string[] => {
    if (v === undefined || v === null || v === '') return []
    if (Array.isArray(v)) return v.map(x => String(x))
    return [String(v)]
  }

  const asString2DArray = (v: any): string[][] => {
    if (!Array.isArray(v)) return []
    return v.map((row: any) => (Array.isArray(row) ? row.map(String) : [String(row)]))
  }

  // ---------- dynamic field id resolver ----------
  const getConsumptionFieldIds = () => {
    if (!consumptionTabId) return null
    const submenu = selectedReport?.submenus?.find(sm => sm.id === consumptionTabId)
    if (!submenu?.fields?.length) return null

    const norm = (s: any) => String(s ?? '').trim().toLowerCase()
    const byLabel = (label: string) => submenu.fields.filter(f => norm(f.label).includes(norm(label)))

    const fuel = byLabel('Fuel Type')[0]
    const initial = byLabel('Initial ROB')[0]
    const robs = byLabel('ROB')
    const outerRob = robs[0]
    const innerRob = robs[1]
    const machinery = byLabel('Machinery')[0]
    const consumed = byLabel('Consumed')[0]

    if (!fuel?.id || !outerRob?.id || !innerRob?.id || !machinery?.id || !consumed?.id) return null

    return {
      fuelId: fuel.id,
      initialId: initial?.id,
      outerRobId: outerRob.id,
      innerRobId: innerRob.id,
      machineryId: machinery.id,
      consumedId: consumed.id,
    }
  }

  // ---------- build dto from formData ----------
  const buildConsumptionDtoFromFormData = (): ConsumptionRequestDTO | null => {
    if (!voyage?.id) return null
    if (!consumptionTabId) return null

    const ids = getConsumptionFieldIds()
    if (!ids) return null

    const tabData = (formData as any)[consumptionTabId]
    if (!tabData) return null

    const fuelTypes = asStringArray(smartParse<any>(tabData[ids.fuelId]?.value, []))
    const initialRobs = ids.initialId ? asStringArray(smartParse<any>(tabData[ids.initialId]?.value, [])) : []
    const outerRobs = asStringArray(smartParse<any>(tabData[ids.outerRobId]?.value, []))
    const machineries = asString2DArray(smartParse<any>(tabData[ids.machineryId]?.value, []))
    const consumed = asString2DArray(smartParse<any>(tabData[ids.consumedId]?.value, []))
    const innerRobs = asString2DArray(smartParse<any>(tabData[ids.innerRobId]?.value, []))

    const outerCount = Math.max(fuelTypes.length, initialRobs.length, outerRobs.length, machineries.length, 0)
    if (outerCount === 0) return null

    const userId = Number(currentUser?.id ?? 0)
    const companyId = Number(
      currentUser?.company?.id ??
        (currentUser as any)?.companyId ??
        (currentUser as any)?.companyAdminId ??
        (currentUser as any)?.companyGroupAdminId ??
        0
    )

    const rows = Array.from({length: outerCount})
      .map((_, i) => {
        const ft = (fuelTypes[i] ?? '').trim()
        if (!ft) return null

        const rawInit = initialRobs[i]
        const rawLast = outerRobs[i]

        // Fallback: if initial ROB not provided (auto-populated), use outer ROB value
        const init = rawInit === undefined || rawInit === null || rawInit === ''
          ? Number(rawLast ?? 0)
          : Number(rawInit)
        const last = Number(rawLast ?? 0)

        const mArr = machineries[i] ?? []
        const cArr = consumed[i] ?? []
        const rArr = innerRobs[i] ?? []

        const machs = mArr
          .map((m, j) => {
            const machinery = String(m ?? '').trim()
            if (!machinery) return null

            const cons = Number(cArr[j] ?? 0)
            const rob = Number(rArr[j] ?? 0)

            return {
              machinery,
              consumed: isNaN(cons) ? 0 : cons,
              rob: isNaN(rob) ? 0 : rob,
            }
          })
          .filter(Boolean) as {machinery?: string; consumed?: number; rob?: number}[]

        return {
          fieldType: ft,
          initialRob: isNaN(init) ? 0 : init,
          lastRob: isNaN(last) ? 0 : last,
          machineries: machs,
        }
      })
      .filter(Boolean) as ConsumptionRequestDTO['rows']

    if (!rows || rows.length === 0) return null

    return {
      reportId: undefined, // will be set in persistConsumption(reportId)
      userId,
      companyId,
      voyageId: Number(voyage.id),
      rows,
    }
  }

  // ✅ submit consumption snapshot for a specific reportId
  const persistConsumption = async (reportId: number) => {
    // Prefer live DTO from the consumption component; fallback to formData-derived DTO
    const refDto = consumptionRobRef.current?.getDto?.()
    const dto = refDto || buildConsumptionDtoFromFormData()
    if (!dto) return

    // Normalize report id defensively (API sometimes returns nested/array responses)
    const toNumber = (v: any) => {
      const n = Number(v)
      return Number.isFinite(n) ? n : undefined
    }

    const normalizedReportId =
      toNumber(reportId) ??
      toNumber((dto as any)?.reportId) ??
      toNumber(draftReportData?.id)

    if (normalizedReportId === undefined) {
      console.warn('Consumption submit missing reportId; check submitReport response.', {
        reportIdParam: reportId,
        dtoReportId: (dto as any)?.reportId,
        draftId: draftReportData?.id,
      })
    }

    const normalized = {
      ...dto,
      reportId: normalizedReportId,
      voyageId: Number(voyage?.id ?? dto.voyageId ?? 0),
      userId: Number(dto.userId ?? currentUser?.id ?? 0),
      companyId: Number(
        dto.companyId ??
        currentUser?.company?.id ??
        (currentUser as any)?.companyId ??
        (currentUser as any)?.companyAdminId ??
        (currentUser as any)?.companyGroupAdminId ??
        0
      ),
    }

    await submitConsumptionROB(token, normalized)
  }

  // ---------- validations ----------
  const runValidationForAllSteps = (
    customFormData?: typeof formData
  ): {
    isValid: boolean
    totalWarnings: number
    stepWarnings: Record<number, number>
    warningFields: {stepId: number; fieldId: number; message: string}[]
  } => {
    let isValid = true
    let totalWarnings = 0
    const stepWarnings: Record<number, number> = {}
    const warningFieldList: {stepId: number; fieldId: number; message: string}[] = []
    const dataToValidate = customFormData || formData

    for (const tab of tabs) {
      if (tab.name === 'Consumption & ROB') {
        stepWarnings[tab.id] = 0
        continue
      }

      const submenu = selectedReport?.submenus?.find(sm => sm.id === tab.id)
      const tabFields = submenu?.fields?.filter(f => f.isActive) || []
      const tabValues = (dataToValidate as any)[tab.id] || {}

      for (const field of tabFields) {
        const value = tabValues[field.id]?.value
        const error = validateField(field, value)
        if (error) {
          const isSoft = field.warningOnly === WarningLevel.SOFT
          const isNumber = field.fieldType.toLowerCase() === 'number'
          if (isSoft && isNumber) {
            stepWarnings[tab.id] = (stepWarnings[tab.id] || 0) + 1
            warningFieldList.push({stepId: tab.id, fieldId: field.id, message: error})
            totalWarnings++
          } else {
            isValid = false
          }
        }
      }
    }

    return {isValid, totalWarnings, stepWarnings, warningFields: warningFieldList}
  }

  const mapCreatedValuesToFormData = (values: CreatedReports['values'], menus: any[]) => {
    const result: any = {}
    for (const entry of values) {
      const fieldId = entry.field
      const fieldValue = entry.valueText

      for (const menu of menus) {
        for (const submenu of menu.submenus) {
          const matchingField = submenu.fields?.find((field: any) => field.id === fieldId)
          if (matchingField) {
            const submenuId = submenu.id
            const isCheckbox = matchingField.fieldType === 'checkbox'
            if (!result[submenuId]) result[submenuId] = {}
            if (!result[submenuId][fieldId]) {
              result[submenuId][fieldId] = {
                label: matchingField.label,
                value: isCheckbox ? [fieldValue] : fieldValue,
              }
            } else if (isCheckbox) {
              result[submenuId][fieldId].value.push(fieldValue)
            }
          }
        }
      }
    }
    return result
  }

  const buildValuesFromTabData = (tabData: any): {field: number; valueText: string}[] => {
    const out: {field: number; valueText: string}[] = []
    if (!tabData) return out
    Object.entries(tabData).forEach(([fieldId, entry]: any) => {
      if (Array.isArray(entry?.value)) {
        entry.value.forEach((val: any) => out.push({field: Number(fieldId), valueText: String(val)}))
      } else {
        out.push({field: Number(fieldId), valueText: String(entry?.value ?? '')})
      }
    })
    return out
  }

  const buildFinalReportValues = (): {field: number; valueText: string}[] => {
    const merged = new Map<number, string>()
    Object.entries(formData).forEach(([_, tabData]) => {
      buildValuesFromTabData(tabData).forEach(v => merged.set(v.field, v.valueText))
    })
    return Array.from(merged.entries()).map(([field, valueText]) => ({field, valueText}))
  }

  // Extract report id from API response (handles varied shapes from backend)
  const extractReportId = (created: any): number | null => {
    if (!created) return null
    const visited = new WeakSet<any>()

    const walk = (node: any): number | null => {
      if (node === null || node === undefined) return null
      if (typeof node !== 'object') return null
      if (visited.has(node)) return null
      visited.add(node)

      for (const key of ['reportId', 'id']) {
        const n = Number((node as any)?.[key])
        if (Number.isFinite(n)) return n
      }

      if (Array.isArray(node)) {
        for (const item of node) {
          const found = walk(item)
          if (found !== null) return found
        }
      }

      for (const value of Object.values(node)) {
        const found = walk(value)
        if (found !== null) return found
      }

      return null
    }

    return walk(created)
  }

  const renderFieldLoader = () => (
    <div className="d-flex flex-column gap-3">
      {Array.from({length: 3}).map((_, idx) => (
        <div key={idx} className="border rounded-3 p-4 bg-white shadow-sm">
          <div style={{...shimmerBaseStyle, height: '14px', width: '40%', marginBottom: '12px'}} />
          <div className="d-flex flex-column gap-2">
            <div style={{...shimmerBaseStyle, height: '12px', width: '100%'}} />
            <div style={{...shimmerBaseStyle, height: '12px', width: '85%'}} />
            <div style={{...shimmerBaseStyle, height: '12px', width: '70%'}} />
          </div>
        </div>
      ))}
    </div>
  )

  // ✅ DRAFT: save report first -> then consumption(reportId)
  const handleSaveDraft = async () => {
    if (roleId === 1) {
      setIsConfirmOverWriteModalOpen(true)
      setModalActionType('draft')
      return
    }

    const {totalWarnings, stepWarnings, warningFields: fieldWarnings} = runValidationForAllSteps()
    setWarningsByStep(stepWarnings)
    setHasWarningsByStep(Object.fromEntries(tabs.map(tab => [tab.id, (stepWarnings[tab.id] || 0) > 0])))
    setWarningFields(fieldWarnings)
    setTotalWarnings(totalWarnings)
    setHasWarnings(totalWarnings > 0)

    const hasAnyWarnings = totalWarnings > 0
    const finalValues = buildFinalReportValues()
    const vesselId = currentUser?.vessel?.id

    try {
      if (isEditMode) {
        // update report first
        await updatedSubmittedReport(
          draftReportData!.id,
          selectedReport?.name ?? 'Unnamed Report',
          ReportStatus.DRAFT,
          hasAnyWarnings,
          voyage!.id,
          Number(assignmentId),
          finalValues,
          Number(vesselId),
          totalWarnings
        )

        // then submit consumption snapshot for THIS report id
        try {
          await persistConsumption(draftReportData!.id)
        } catch (e) {
          console.warn('❌ consumption submit failed', e)
        }

        toast.success('Draft updated successfully.')
      } else {
        // create report first (must return created report with id)
        const created: any = await submitReport(
          selectedReport?.name ?? 'Unnamed Report',
          ReportStatus.DRAFT,
          hasAnyWarnings,
          voyage?.id ?? 0,
          Number(assignmentId),
          finalValues,
          Number(vesselId),
          totalWarnings
        )

        const createdId = extractReportId(created)
        if (!createdId) {
          toast.error('Report saved but report id not returned from API. Update backend to return created report id.')
          return
        }

        // then submit consumption snapshot for THIS report id
        try {
          await persistConsumption(createdId)
        } catch (e) {
          console.warn('❌ consumption submit failed', e)
        }

        toast.success('Draft saved successfully.')
      }

      setTimeout(() => navigate('/operations/overview'), 1500)
    } catch (err) {
      console.error('Failed to save draft:', err)
      toast.error('Failed to save draft. Please try again.')
    }
  }

  // ✅ SUBMIT: save report first -> then consumption(reportId)
  const handleSubmit = async () => {
    if (roleId === 1) {
      setIsConfirmOverWriteModalOpen(true)
      setModalActionType('submit')
      return
    }

    const {isValid, totalWarnings, stepWarnings, warningFields: fieldWarnings} = runValidationForAllSteps()
    setWarningsByStep(stepWarnings)
    setHasWarningsByStep(Object.fromEntries(tabs.map(tab => [tab.id, (stepWarnings[tab.id] || 0) > 0])))
    setWarningFields(fieldWarnings)
    setTotalWarnings(totalWarnings)
    setHasWarnings(totalWarnings > 0)

    if (!isValid) {
      toast.error('Fix errors before submitting.')
      return
    }

    if (totalWarnings > 0 && !window.confirm(`${totalWarnings} warnings found. Submit anyway?`)) return

    const finalValues = buildFinalReportValues()
    const vesselId = currentUser?.vessel?.id
    const statusToSend = rankId === 1 ? ReportStatus.SUBMITTED : ReportStatus.DRAFT

    try {
      if (isEditMode) {
        await updatedSubmittedReport(
          draftReportData!.id,
          selectedReport?.name ?? 'Unnamed Report',
          statusToSend,
          totalWarnings > 0,
          voyage!.id,
          Number(assignmentId),
          finalValues,
          Number(vesselId),
          totalWarnings,
          false,
          ''
        )

        try {
          await persistConsumption(draftReportData!.id)
        } catch (e) {
          console.warn('❌ consumption submit failed', e)
        }

        toast.success(rankId === 1 ? 'Report updated successfully.' : 'Draft updated successfully.')
      } else {
        const created: any = await submitReport(
          selectedReport?.name ?? 'Unnamed Report',
          statusToSend,
          totalWarnings > 0,
          voyage?.id ?? 0,
          Number(assignmentId),
          finalValues,
          Number(vesselId),
          totalWarnings
        )

        const createdId = extractReportId(created)
        if (!createdId) {
          toast.error('Report saved but report id not returned from API. Update backend to return created report id.')
          return
        }

        try {
          await persistConsumption(createdId)
        } catch (e) {
          console.warn('❌ consumption submit failed', e)
        }

        toast.success(rankId === 1 ? 'Report submitted successfully.' : 'Draft saved successfully.')
      }

      setTimeout(() => navigate('/operations/overview'), 1500)
    } catch (err) {
      console.error('Failed to submit report:', err)
      toast.error('Failed to submit the report. Please try again.')
    }
  }

  useEffect(() => {
    if (!assignmentId) return

    const fetchAssignmentDetails = async () => {
      try {
        const assignment = await getAssignmentById(Number(assignmentId))
        if (!assignment) return

        const reportData = assignment.template ?? assignment.customTemplate
        if (!reportData || !reportData.menus) {
          setTabs([])
          return
        }

        const name = assignment.customTemplate?.menus?.[0]?.name || assignment.template?.name || 'Unnamed Report'
        const flattenedSubmenus = reportData.menus.flatMap((menu: any) => menu.submenus)

        setSelectedReport({
          id: assignment.id,
          name,
          templateId: reportData.id,
          order: 0,
          isActive: true,
          submenus: flattenedSubmenus,
        })

        const activeSubmenus = reportData.menus
          .filter((menu: any) => menu.isActive)
          .flatMap((menu: any) => menu.submenus.filter((submenu: any) => submenu.isActive))

        setTabs(activeSubmenus)

        if (draftReportData && (draftReportData as any).values) {
          const formDataFromReport = mapCreatedValuesToFormData((draftReportData as any).values, reportData.menus)
          setFormData(formDataFromReport)
        }
      } catch (err) {
        console.error('Failed to fetch assignment details:', err)
      }
    }

    fetchAssignmentDetails()
  }, [assignmentId])

  const fetchFieldsforStep = async (tabId: number) => {
    try {
      setIsLoadingFields(true)
      const allSubmenus = selectedReport?.submenus ?? []
      const targetTab = allSubmenus?.find(submenu => submenu.id === tabId)

      if (targetTab) {
        const activeFields = targetTab.fields?.filter(field => field.isActive)
        setFields(activeFields || [])
      } else {
        setFields([])
      }
    } catch (err) {
      console.error('Failed to fetch fields list:', err)
      setFields([])
    } finally {
      setIsLoadingFields(false)
    }
  }

  const nextStep = () => {
    const currentTabName = tabs[currentStep]?.name
    const skipValidation = currentTabName === 'Consumption & ROB'

    const isValid = skipValidation || stepRefs.current[currentStep]?.validateStep()
    if (!isValid) return

    setStepCompletionStatus(prev => {
      const updated = [...prev]
      updated[currentStep] = true
      return updated
    })

    setCurrentStep(prev => Math.min(prev + 1, tabs.length - 1))
  }

  const isStepCompleted = (index: number) => stepCompletionStatus[index] === true
  const goToStep = (step: number) => setCurrentStep(step)

  const step = tabs[currentStep]
  useEffect(() => {
    if (step?.name === 'Consumption & ROB') {
      setConsumptionRefreshFlag(prev => prev + 1)
    }
  }, [step?.id, step?.name])
  if (!tabs.length || !tabs[currentStep]) {
    return <div className="p-5 fw-500 text-center">No tabs available for this report</div>
  }

  return (
    <>
      <style>{shimmerKeyframes}</style>
      <div className="app-main flex-column flex-row-fluid" id="kt_app_main">
        <div className="d-flex flex-column flex-column-fluid border-top" style={{height: '90vh'}}>
          <div id="kt_app_content" className="app-content flex-column-fluid d-flex flex-column bg-white" style={{flex: 1}}>
            <div className="card d-flex flex-column bg-white" style={{flex: 1}}>
              <div className="card-header align-items-center justify-content-between py-4 gap-2 gap-md-12 px-5 bg-white">
              <div>
                <div className="d-flex align-items-center gap-1 mb-4">
                  <Link to="" onClick={() => setIsCloseReportModalOpen(true)}>
                    <KTSVG path="/media/icons/duotune/arrows/ArrowLeft.svg" className="svg-icon-2" />
                  </Link>
                  <h3 className="card-title fw-bold text-dark m-0 p-0" style={{fontSize: '1.5rem'}}>
                    Create Report
                  </h3>
                </div>
                <div className="d-flex gap-12">
                  <p>Vessel name: <strong>{voyage?.vessel?.fleet_name}</strong></p>
                  <p>IMO number: <strong>{voyage?.vessel?.imoNumber}</strong></p>
                  <p>Vessel type: <strong>{voyage?.vessel?.vesselType}</strong></p>
                </div>
              </div>

              <div className="mb-4">
                <div className="mb-2">
                  <strong style={{fontSize: '1.5rem'}}>{selectedReport?.name}</strong> {reportDate}
                </div>
                <div className="d-flex justify-content-end">
                  <button onClick={handleSaveDraft} className="btn p-0 pt-1 d-flex align-items-center gap-1">
                    Save as draft
                  </button>
                </div>
              </div>
            </div>

            {draftReportData?.remark && (
              <div className="d-flex justify-content-between align-items-center py-4 px-5 border-bottom">
                <div className="text-muted">{draftReportData.remark}</div>
              </div>
            )}

            <div className="d-flex px-5">
              <div className="pe-3 border-end py-3" style={{flex: 0.82, overflowY: 'auto', maxHeight: 'calc(100vh - 240px)'}}>
                <div className="p-3 list-group-item" style={{backgroundColor: '#F4F9FF'}}>
                  <div className="title pb-1">
                    {voyage?.voyageNumber || 'VM009'}: {voyage?.departurePort || 'Mumbai'} - {selectedVoyage?.arrivalPort || 'Singapore'}
                  </div>
                  {voyage?.startDate && voyage?.endDate && (
                    <div className="details pb-1">
                      {new Date(voyage?.startDate).toLocaleDateString('en-GB')} - {new Date(voyage?.endDate).toLocaleDateString('en-GB')}
                    </div>
                  )}
                  <div className="d-flex justify-content-between py-4 pe-2 gap-1">
                    <span className="badge" style={{backgroundColor: '#FDF6B2', fontSize: '13px', padding: '4px 8px', borderRadius: '4px', fontWeight: 500}}>
                      Current
                    </span>
                    {hasWarnings && (
                      <div className="d-flex gap-1 align-items-center">
                        <KTSVG path="/media/map/Incomplete.svg" className="svg-icon-3" />
                        <span className="text-muted">{totalWarnings}</span>
                      </div>
                    )}
                  </div>
                </div>

                {tabs.map((s, index) => (
                  <div
                    key={s.id}
                    className={`d-flex justify-content-between mt-5 py-5 px-5 border rounded-1 fw-bold
                    ${index === currentStep ? 'current' : isStepCompleted(index) ? 'completed-step' : 'form-step'}`}
                    onClick={() => {
                      goToStep(index)
                      fetchFieldsforStep(s.id)
                    }}
                    style={{cursor: 'pointer'}}
                  >
                    <div className="fs-5">
                      {index + 1}. {s.name}
                    </div>
                    {index === currentStep ? (
                      <KTSVG path="/media/map/arrow-right.svg" className="svg-icon svg-icon-2" />
                    ) : isStepCompleted(index) ? (
                      <KTSVG path="/media/map/check.svg" className="svg-icon svg-icon-2 text-success" />
                    ) : null}
                  </div>
                ))}
              </div>

              <div className="py-3 px-5" style={{flex: 3}}>
                {isLoadingFields ? (
                  renderFieldLoader()
                ) : step.name === 'Consumption & ROB' ? (
                  <AddConsumptionROB
                    ref={consumptionRobRef}
                    sectionTitle={step.name}
                    voyage={voyage}
                    fields={fields}
                    refreshFlag={consumptionRefreshFlag}
                    values={(formData as any)[step.id] || {}}
                    onChange={(label, id, value) => {
                      handleFieldChange(step.id, label, id.toString(), value)
                      setStepCompletionStatus(prev => {
                        const updated = [...prev]
                        updated[currentStep] = true
                        return updated
                      })
                    }}
                  />
                ) : (
                  <ReportStep
                    ref={ref => (stepRefs.current[currentStep] = ref!)}
                    sectionTitle={step.name}
                    formSections={fields}
                    values={(formData as any)[step.id] || {}}
                    voyage={voyage}
                    selectedReport={selectedReport}
                    onChange={(label, id, value) => {
                      handleFieldChange(step.id, label, id, value)
                      const isValid = stepRefs.current[currentStep]?.validateStep?.()
                      setStepCompletionStatus(prev => {
                        const updated = [...prev]
                        updated[currentStep] = !!isValid
                        return updated
                      })
                    }}
                  />
                )}

                {currentStep < tabs.length - 1 && (
                  <button className="btn btn_primary mt-4" onClick={nextStep}>
                    Next: {tabs[currentStep + 1].name} <FaChevronRight className="ms-2" />
                  </button>
                )}

                {currentStep === tabs.length - 1 && (
                  <div className="d-flex align-items-center mt-5">
                    <button className="btn btn_primary" onClick={handleSubmit}>
                      {rankId === 1 ? 'Submit' : 'Save as draft'}
                    </button>
                    {reportDate && (
                      <Link
                        to="/operations/report-preview"
                        state={{
                          formData,
                          tabs,
                          assignmentId,
                          selectedVoyage,
                          stepCompletionStatus,
                          selectedReport,
                          reportDate,
                        }}
                        className="btn p-0 ps-3"
                      >
                        Preview report
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>

            {isCloseReportModalOpen && (
              <CloseReportModal
                isOpen={isCloseReportModalOpen}
                onClose={() => setIsCloseReportModalOpen(false)}
                formData={formData}
                assignmentId={Number(assignmentId)}
                selectedReport={selectedReport}
                selectedVoyage={voyage ? voyage : null}
                onSaveDraft={handleSaveDraft}
              />
            )}

            {isConfirmOverWriteModalOpen && (
              <ConfirmOverwriteModal
                isOpen={isConfirmOverWriteModalOpen}
                onClose={() => setIsConfirmOverWriteModalOpen(false)}
                formData={formData}
                assignmentId={Number(assignmentId)}
                selectedReport={selectedReport}
                selectedVoyage={voyage ? voyage : null}
                onSaveDraft={handleSaveDraft}
                onSubmitReport={handleSubmit}
                actionType={modalActionType}
              />
            )}

            <ToastContainer position="top-center" autoClose={3000} style={{top: '5rem'}} />
          </div>
        </div>
      </div>
    </div>
    </>
  )
}

export {CreateReport}
