// core/_requests.ts
import axios from 'axios'
import type { AxiosError } from 'axios'

import {
  DocumentItem,
  Vessel,
  ManualPlanDto,
  Certificate,
  CertificateRevision,
  CreateInspectionPayload,
  CreatePlansPayload,
  InspectionDto,
  InspectionPlanDto,
  InspectionRecord,
  QhseInspectionKind,
  Port,
  QHSEDefectDto,
  DefectRecord,
  DefectCategory,
  TpiSubCategory,
  SmsCode,
  DefectDepartment,
  DefectStatus,
  DefectClosureResult,
  QHSEInspectionFindingDto,
  QHSEAuditFindingDto,
  InspectionFindingAttachmentInfo,
  FindingStatus,
  AuditPlanDto,
  AuditDto,
  AuditRecord,
  QhseAuditKind,
  CreateAuditPayload,
  CreateAuditPlansPayload,
  QHSENearMissReportDto,
  NearMissRecord,
  NearMissStatus,
  NearMissClosureResult,
  NearMissOccurrenceType,
  NearMissLocationOfOccurrence,
  NearMissSubstandardAct,
  NearMissSubstandardCondition,
  AuditFindingAttachmentInfo,
    RiskAssessmentDto,
  RiskAssessmentRecord,
  RiskAssessmentRevision,
} from './_models'

// ===============================
// API CONFIG – BASE URLS
// ===============================
const API_URL = process.env.REACT_APP_API_URL

// Documents & Manuals
const DOCUMENTS_API_URL = `${API_URL}/qhse/documents`
const MP_API_URL = `${API_URL}/qhse/manuals-plans`

// Findings
const INSPECTION_FINDING_API_URL = `${API_URL}/qhse/inspection-findings`
const AUDIT_FINDING_API_URL = `${API_URL}/qhse/audit-findings`

// Certificates
const CERT_API_URL = `${API_URL}/qhse/certificates`
// Risk Assessment
const RISK_API_URL = `${API_URL}/qhse/risk-assessments`

// Inspection / Audit Core
const INS_API_URL = `${API_URL}/qhse`
const INS_KIND_API = `${INS_API_URL}/inspection-kinds`
const INS_PLAN_API = `${INS_API_URL}/inspection-plans`
const INS_INDEX_API = `${INS_API_URL}/inspections`
const VESSEL_API_URL = `${API_URL}/vessels`
const PORT_API_URL = `${API_URL}/ports`

const AUD_API_URL = `${API_URL}/qhse`
const AUD_KIND_API = `${AUD_API_URL}/audit-kinds`
const AUD_PLAN_API = `${AUD_API_URL}/audit-plans`
const AUD_INDEX_API = `${AUD_API_URL}/audits`

// Shared QHSE base
const QHSE_API = `${API_URL}/qhse`

// Defects
const DEFECT_API_URL = `${API_URL}/qhse/defects`

// Near Miss
const NEAR_MISS_API_URL = `${API_URL}/qhse/near-miss-reports`

// ===============================
// HELPERS
// ===============================

/** util: convert "2.1 MB" -> bytes (rough) */
const sizeToBytes = (s?: string | null) => {
  if (!s) return 0
  const [numStr, unit] = s.trim().split(/\s+/)
  const n = parseFloat(numStr)
  if (!isFinite(n)) return 0
  const u = (unit || '').toUpperCase()
  if (u.startsWith('KB')) return Math.round(n * 1024)
  if (u.startsWith('MB')) return Math.round(n * 1024 * 1024)
  if (u.startsWith('GB')) return Math.round(n * 1024 * 1024 * 1024)
  if (u.startsWith('B')) return Math.round(n)
  return 0
}

// Small helper to surface server error messages nicely
const pickAxiosMessage = (err: unknown, fallback: string) => {
  const ae = err as AxiosError<any>
  return (
    ae?.response?.data?.message ??
    ae?.response?.data?.error ??
    ae?.message ??
    fallback
  )
}

// ===============================
// LOOKUPS / LITE LISTS
// ===============================

// Minimal "lite" list for QHSE usage
export async function listCrewsLite() {
  const { data } = await axios.get(`${process.env.REACT_APP_API_URL}/crew/all`)

  return (Array.isArray(data) ? data : [])
    .map((c: any) => {
      const rankId =
        Number(
          c?.rankInfo?.id ??
          c?.rankId ??
          c?.rank?.id
        )

      return {
        id: Number(c.id ?? c.userId ?? c.crewId),
        fullName: String(
          c.fullName ??
          c.name ??
          [c.firstName, c.lastName].filter(Boolean).join(' ') ??
          `User #${c.id}`
        ),
        rankName:
          c?.rankName ??
          c?.rank?.rank ??
          c?.rankInfo?.rank ??
          undefined,
        rankId: Number.isFinite(rankId) ? rankId : undefined,

        vesselId:
          c?.vessel?.id != null
            ? Number(c.vessel.id)
            : (c?.vesselId != null ? Number(c.vesselId) : undefined),

        companyGroupAdminId: (() => {
          const v =
            c.companyGroupAdminId ??
            c.companyGroupId ??
            c.cgaid?.id ??
            c.cga?.id ??
            c.vessel?.companyGroupAdminId ??
            c.vessel?.companyGroupAdmin?.id
          return Number.isFinite(Number(v)) ? Number(v) : undefined
        })(),
        companyAdminId: (() => {
          const v =
            c.companyAdminId ??
            c.companyId ??
            c.companyAdmin?.id ??
            c.vessel?.companyAdminId ??
            c.vessel?.companyAdmin?.id
          return Number.isFinite(Number(v)) ? Number(v) : undefined
        })(),

        active: Boolean(c?.active),     // 👈 include active flag
      }
    })
    .filter((c: any) => Number.isFinite(c.id))
}

// --- lookups ---
export async function listInspectionKinds(): Promise<QhseInspectionKind[]> {
  const { data } = await axios.get(`${INS_KIND_API}`)
  return data
}

// Use base endpoints like the rest of the app
export async function listPorts(): Promise<Port[]> {
  const { data } = await axios.get(`${API_URL}/ports`)
  // API returns: { id, latitude, longitude, main_port }
  return (Array.isArray(data) ? data : []).map((p: any) => ({
    id: Number(p.id),
    name: String(p.main_port ?? ''),   // <- normalize to "name"
    latitude: p.latitude,
    longitude: p.longitude,
  }))
}

// --- Audit kinds (mirror inspection kinds) ---
export async function listAuditKinds(): Promise<QhseAuditKind[]> {
  const { data } = await axios.get(`${AUD_KIND_API}`)
  return data
}

// export const getVesselList = async (): Promise<Vessel[]> => {
//   try {
//     const response = await axios.get(VESSEL_API_URL, {
//       headers: {
//       },
//     });

//     return response.data;

//   } catch (error: any) {
//     console.error('Error fetching vessel list:', error);
//     throw new Error(error.response?.data?.message || 'Error fetching vessel list');
//   }
// };

// ===============================
// DOCUMENT APIS
// ===============================

// 1. View document (PDF / URL / Blob)
export async function viewPdfDocumentRequest(token: string, documentId: number) {
  const response = await fetch(
    `${DOCUMENTS_API_URL}/view/${documentId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to load PDF: ${response.status} ${response.statusText}`)
  }

  const contentType = response.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    // server gives us a JSON with download URL
    const data = await response.json()
    return {
      type: 'url',
      url:
        data.url ||
        data.downloadUrl ||
        data.fileUrl ||
        (data.data && data.data.url) ||
        null,
    }
  } else if (contentType.includes('application/pdf')) {
    // server gives us PDF blob
    const blob = await response.blob()
    return {
      type: 'blob',
      blob,
    }
  } else {
    // unknown → try JSON fallback
    try {
      const data = await response.json()
      return {
        type: 'url',
        url:
          data.url ||
          data.downloadUrl ||
          data.fileUrl ||
          (data.data && data.data.url) ||
          null,
      }
    } catch {
      const blob = await response.blob()
      return {
        type: 'blob',
        blob,
      }
    }
  }
}

// 2. Download document (returns URL from JSON)
export async function downloadPdfDocumentRequest(token: string, documentId: number) {
  const response = await fetch(
    `${DOCUMENTS_API_URL}/download/${documentId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )

  if (!response.ok) {
    throw new Error(`Download failed: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  const url =
    data.url ||
    data.downloadUrl ||
    data.fileUrl ||
    (data.data && data.data.url) ||
    null

  return url
}

export async function fetchDocumentsRequest(
  compnayId: number,
  token: string
): Promise<DocumentItem[]> {
  const response = await fetch(`${DOCUMENTS_API_URL}/company-group/${compnayId}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch documents: ${response.status}`)
  }

  return response.json()
}

// ===============================
// MANUALS & PLANS
// ===============================

/** 1) List by Company Group (server-paged) */
export async function listManualsByCompany(companyGroupId: number): Promise<ManualPlanDto[]> {
  try {
    const { data } = await axios.get<ManualPlanDto[]>(
      `${MP_API_URL}/company-group/${companyGroupId}`
    )
    return data
  } catch (err) {
    const ae = err as AxiosError<any>
    throw new Error(
      ae?.response?.data?.message ??
      ae?.response?.data?.error ??
      ae?.message ??
      'Failed to load manuals'
    )
  }
}

/** 2) Get by id */
export async function getManualPlan(id: number): Promise<ManualPlanDto> {
  try {
    const { data } = await axios.get<ManualPlanDto>(`${MP_API_URL}/${id}`)
    return data
  } catch (err) {
    throw new Error(pickAxiosMessage(err, 'Failed to get manual/plan'))
  }
}

/** 3) Create (multipart) — SAME pattern as certificate upload */
export async function createManualPlan(payload: {
  companyGroupId: number
  name: string
  dateOfApproval?: string
  revisionNo?: string
  approvedBy?: string
  uploadedBy: string
  uploadedByName: string
  remarks?: string
  file: File
}) {
  const fd = new FormData()
  fd.append('companyGroupId', String(payload.companyGroupId))
  fd.append('name', payload.name)
  if (payload.dateOfApproval) fd.append('dateOfApproval', payload.dateOfApproval)
  if (payload.revisionNo) fd.append('revisionNo', payload.revisionNo)
  if (payload.approvedBy) fd.append('approvedBy', payload.approvedBy)
  fd.append('uploadedBy', payload.uploadedBy)
  fd.append('uploadedByName', payload.uploadedByName)
  if (payload.remarks) fd.append('remarks', payload.remarks)
  fd.append('file', payload.file)

  // IMPORTANT: force multipart and skip any data transformers
  const { data } = await axios.post(`${MP_API_URL}`, fd, {
    headers: {
      // force correct content-type (will add boundary automatically for FormData)
      'Content-Type': 'multipart/form-data',
      // optional but harmless:
      Accept: 'application/json',
    },
    transformRequest: (d) => d,        // don't serialize FormData
    maxBodyLength: Infinity,           // avoid size caps
  })
  return data
}

/** 4) Update metadata (PUT JSON) */
export async function updateManualPlan(
  id: number,
  partial: Partial<ManualPlanDto>
): Promise<ManualPlanDto> {
  try {
    const { data } = await axios.put<ManualPlanDto>(`${MP_API_URL}/${id}`, partial)
    return data
  } catch (err) {
    throw new Error(pickAxiosMessage(err, 'Update failed'))
  }
}

/** 5) Replace file only (PATCH multipart) */
export async function replaceManualPlanFile(id: number, file: File): Promise<ManualPlanDto> {
  const fd = new FormData()
  fd.append('file', file)

  const { data } = await axios.patch<ManualPlanDto>(`${MP_API_URL}/${id}/file`, fd, {
    headers: { 'Content-Type': 'multipart/form-data', Accept: 'application/json' },
    transformRequest: (d) => d,
    maxBodyLength: Infinity,
  })
  return data
}

/** 6) Soft delete */
export async function softDeleteManualPlan(id: number): Promise<void> {
  try {
    await axios.delete(`${MP_API_URL}/${id}`)
  } catch (err) {
    throw new Error(pickAxiosMessage(err, 'Delete failed'))
  }
}

/** 7) Download / View URLs (use directly in href/src) */
export const manualPlanDownloadUrl = (id: number) => `${MP_API_URL}/${id}/download`
export const manualPlanViewUrl = (id: number) => `${MP_API_URL}/${id}/view`

/** 8) Adapter: map DTO -> UI row for your table */
export function mapDtoToRow(d: ManualPlanDto) {
  const fileName = d.name || `manual_${d.id}`
  const size = sizeToBytes(d.fileSize)
  return {
    id: d.id,
    name: d.name,
    dateOfApproval: d.dateOfApproval || undefined,
    revisionCount: Number(d.revisionCount ?? 0),       // 👈 number now
    approvedBy: d.approvedBy || undefined,

    uploadedByName: d.uploadedByName || '',
    uploadedBy: d.uploadedBy != null ? String(d.uploadedBy) : '',
    uploadedDate: d.uploadedDate || '',

    companyGroupAdminId: d.companyGroupId,
    companyAdminId: null,
    vesselId: null,
    file: {
      name: fileName,
      url: manualPlanDownloadUrl(d.id),                // current/latest file
      type: d.fileMime || 'application/octet-stream',
      size,
    },
    remarks: d.remarks || undefined,
  } as const
}

export const manualPlanRevisionDownloadUrl = (revisionId: number) =>
  `${MP_API_URL}/revisions/${revisionId}/download`

export async function listManualPlanRevisions(id: number) {
  const { data } = await axios.get(`${MP_API_URL}/${id}/revisions`)
  return data as Array<{
    id: number
    revisionIndex: number
    filePath: string
    fileSize: string
    fileMime: string | null
    uploadedBy: number
    uploadedByName: string
    uploadedDate: string
    createdAt: string
  }>
}

export const manualPlanRevisionViewUrl = (revisionId: number) =>
  `${MP_API_URL}/revisions/${revisionId}/view`
// NOTE: If your backend path differs, mirror whatever you use for download
// (e.g., replace '/download' with '/view'). Keep auth headers same as others.

// ===============================
// CERTIFICATES (Vessel-scoped)
// ===============================

export const certificateViewUrl = (id: number) => `${CERT_API_URL}/view/${id}`
export const certificateDownloadUrl = (id: number) => `${CERT_API_URL}/download/${id}`

export const certificateRevisionViewUrl = (revisionId: number) =>
  `${CERT_API_URL}/revisions/${revisionId}/view`
export const certificateRevisionDownloadUrl = (revisionId: number) =>
  `${CERT_API_URL}/revisions/${revisionId}/download`

// get one
export async function getCertificate(id: number) {
  const { data } = await axios.get(`${CERT_API_URL}/${id}`)
  return data as Certificate
}

// update meta
export async function updateCertificate(id: number, partial: Partial<Certificate>) {
  const { data } = await axios.put(`${CERT_API_URL}/${id}`, partial)
  return data as Certificate
}

// replace file (creates new revision)
export async function replaceCertificateFile(id: number, file: File) {
  const fd = new FormData()
  fd.append('file', file)
  const { data } = await axios.patch(`${CERT_API_URL}/${id}/file`, fd, {
    headers: { 'Content-Type': 'multipart/form-data', Accept: 'application/json' },
    transformRequest: (d) => d,
    maxBodyLength: Infinity,
  })
  return data as Certificate
}

// list revisions
export async function listCertificateRevisions(id: number) {
  const { data } = await axios.get(`${CERT_API_URL}/${id}/revisions`)
  return data as CertificateRevision[]
}

// ===============================
// QHSE INSPECTION PLANS & INDEX
// ===============================

export type SearchInspectionsParams = {
  vesselId?: number
  /** Prefer this; we'll also accept kindId for backward compat */
  inspectionKindId?: number
  /** Back-compat alias (will be mapped to inspectionKindId) */
  kindId?: number
  fromDate?: string
  toDate?: string
  isFinalized?: boolean
  isVerified?: boolean
  companyGroupId?: number
  /** Subcompany/company (tenant) filter */
  companyId?: number
  /** Attachment/details; allow string to be lenient */
  inspectionType?: 'ATTACHMENT_TYPE' | 'DETAILS_TYPE' | string
  fromPortId?: number
  toPortId?: number
  /** Server-side filter for active ones only */
  activeOnly?: boolean
  page?: number
  size?: number
}

/** Optional server-side list endpoint already exists in your codebase */
export async function listInspectionPlans(params: {
  year?: number
  companyGroupId?: number
  vesselId?: number
  inspectionKindId?: number
}) {
  const res = await axios.get(`${QHSE_API}/inspection-plans`, { params })
  return res.data
}

// --- Unlinked Plans (client-side filter over listInspectionPlans) ---
export async function listUnlinkedPlans(params: {
  year?: number
  companyGroupId?: number
  vesselId?: number
  inspectionKindId?: number
}) {
  const res = await listInspectionPlans(params)
  const arr = Array.isArray(res) ? res : (Array.isArray(res?.content) ? res.content : [])
  return arr.filter((p: any) => !p?.inspectionId)
}

/**
 * Plans that match vessel + kind + month(forDate) and are NOT linked yet.
 * Server should return [{id, planDate, ...}] of unlinked plans only.
 */
export async function listAvailablePlans(params: {
  vesselId: number
  inspectionKindId: number
  forDate: string            // any date in the target month (YYYY-MM-DD)
}) {
  const { vesselId, inspectionKindId, forDate } = params
  const res = await axios.get(`${QHSE_API}/inspection-plans/available`, {
    params: { vesselId, inspectionKindId, forDate },
  })
  return res.data
}

/**
 * Candidate inspections for a given plan’s month/vessel/kind that are NOT linked yet
 * (Use this for "Link Existing Inspection" in the plan actions).
 */
// Shim: keep the same name used by UI, but route to an existing endpoint
export async function listUnlinkedInspections(params: {
  vesselId: number
  inspectionKindId: number
  forDate: string // any date in the target month (YYYY-MM-DD)
}) {
  const { vesselId, inspectionKindId, forDate } = params

  // Compute month [from, to] for server filtering
  const d = new Date(forDate)
  const yyyy = d.getFullYear()
  const mm = d.getMonth()
  const from = new Date(yyyy, mm, 1).toISOString().slice(0, 10)          // YYYY-MM-01
  const to = new Date(yyyy, mm + 1, 0).toISOString().slice(0, 10)        // YYYY-MM-last

  // Use the already-present "available" endpoint
  const { data } = await axios.get(`${INS_INDEX_API}/available`, {
    params: { vesselId, inspectionKindId, from, to },
  })

  // Normalize and ensure UNLINKED only (inspectionPlanId == null)
  const arr = Array.isArray(data) ? data : (Array.isArray(data?.content) ? data.content : [])
  return arr
    .filter((x: any) => x?.inspectionPlanId == null)
    .map((x: any) => ({
      ...x,
      internalInspectorName: x.internalInspectorName ?? x?.internalInspector?.fullName ?? null,
    }))
}

/** Link plan<->inspection (writes both sides: plan.inspectionId & inspection.inspectionPlanId) */
// match backend controller paths (path params, no JSON body)
export async function linkPlanToInspection(planId: number, inspectionId: number) {
  const res = await axios.post(
    `${QHSE_API}/inspection-plans/${planId}/attach-inspection/${inspectionId}`
  )
  return res.data
}

export async function unlinkPlan(planId: number) {
  const res = await axios.post(`${QHSE_API}/inspection-plans/${planId}/detach-inspection`)
  return res.data
}

export async function getPlanByInspection(inspectionId: number) {
  const res = await axios.get(`${QHSE_API}/inspection-plans/by-inspection/${inspectionId}`)
  return res.data as InspectionPlanDto | null
}

/** Get single plan (with inspectionId if linked) */
export async function getInspectionPlan(planId: number) {
  const res = await axios.get(`${QHSE_API}/inspection-plans/${planId}`)
  return res.data
}

export async function updatePlan(id: number, partial: Partial<InspectionPlanDto>) {
  const { data } = await axios.put(`${INS_PLAN_API}/${id}`, partial)
  return data as InspectionPlanDto
}

export async function deletePlan(id: number) {
  await axios.delete(`${INS_PLAN_API}/${id}`)
}

// BULK create plans
export async function bulkCreatePlans(body: CreatePlansPayload): Promise<InspectionPlanDto[]> {
  try {
    const { data } = await axios.post<InspectionPlanDto[]>(`${INS_PLAN_API}/bulk`, body)
    return data
  } catch (err) {
    throw new Error(pickAxiosMessage(err, 'Bulk create failed'))
  }
}

// Available inspections (unassigned) for vessel+kind (+ optional range)
export async function listAvailableInspections(params: {
  vesselId: number
  inspectionKindId: number
  from?: string
  to?: string
}) {
  try {
    const { data } = await axios.get(`${INS_INDEX_API}/available`, { params })
    return data as Array<InspectionDto> | any[] // keep lenient if backend returns a lightweight shape
  } catch (err) {
    throw new Error(pickAxiosMessage(err, 'Failed to list available inspections'))
  }
}

// --- index (inspections) ---
export async function searchInspections(params: SearchInspectionsParams) {
  const qp = { ...params, inspectionKindId: params.inspectionKindId ?? params.kindId }
  const { data } = await axios.get(INS_INDEX_API, { params: qp })
  return data // server may return array or pageable; component handles both
}

export async function createInspection(payload: CreateInspectionPayload): Promise<InspectionDto> {
  const { data } = await axios.post(INS_INDEX_API, payload)
  return data
}

export async function getInspection(id: number): Promise<InspectionDto> {
  const { data } = await axios.get(`${INS_INDEX_API}/${id}`)
  return data
}

export async function updateInspection(
  id: number,
  partial: Partial<InspectionDto>
): Promise<InspectionDto> {
  const { data } = await axios.put(`${INS_INDEX_API}/${id}`, partial)
  return data
}

export async function deleteInspection(id: number) {
  await axios.delete(`${INS_INDEX_API}/${id}`)
}

// --- mappers -> UI table rows ---
export function mapInspectionToRow(d: InspectionDto): InspectionRecord {
  return {
    id: d.id,
    vesselManager: '-',                                 // fill if you return it
    vessel: d.vesselName,
    vesselType: d.vesselType || '-',
    inspection: d.inspectionKindName,
    inspectionType: d.inspectionType?.replace('_', ' ') || '-',
    inspectionDate: d.inspectionFromDate,
    internalInspector: d.internalInspectorName || undefined,
    externalInspector: d.externalInspectorName || undefined,
    fromPort: d.fromPortName || undefined,
    toPort: d.toPortName || undefined,
    hoursOnboard: d.hoursOnboard ?? undefined,
    isFinalized: d.isFinalized ? 'Yes' : 'No',
    isVerified: d.isVerified ? 'Yes' : 'No',
    countNCRsObservations: d.ncrCount ?? 0,
    countNCRsObservationsCompleted: d.ncrCompleted ?? 0,
    score: d.score ?? undefined,
    linkToPlan: d.id ? `/qhse/insplanning?inspectionId=${d.id}` : undefined,
    inspectionRemarks: d.remarks || undefined,
  }
}

// ===============================
// QHSE AUDIT INDEX (mirror inspections)
// ===============================

export type SearchAuditsParams = {
  vesselId?: number
  /** Prefer this; we'll also accept kindId for backward compat */
  auditKindId?: number
  /** Back-compat alias (will be mapped to inspectionKindId) */
  kindId?: number
  fromDate?: string
  toDate?: string
  isFinalized?: boolean
  isVerified?: boolean
  companyGroupId?: number
  /** Subcompany/company (tenant) filter */
  companyId?: number
  /** Attachment/details; allow string to be lenient */
  auditType?: 'ATTACHMENT_TYPE' | 'DETAILS_TYPE' | string
  fromPortId?: number
  toPortId?: number
  /** Server-side filter for active ones only */
  activeOnly?: boolean
  page?: number
  size?: number
}

export async function searchAudits(params: SearchAuditsParams) {
  const qp = { ...params, inspectionKindId: params.auditKindId ?? (params as any).kindId }
  const { data } = await axios.get(AUD_INDEX_API, { params: qp })
  // server may return array or pageable; component handles both
  return data
}

export async function createAudit(
  payload: CreateAuditPayload
): Promise<AuditDto> {
  const { data } = await axios.post(AUD_INDEX_API, payload)
  return data
}

export async function getAudit(id: number): Promise<AuditDto> {
  const { data } = await axios.get(`${AUD_INDEX_API}/${id}`)
  return data
}

export async function updateAudit(
  id: number,
  partial: Partial<AuditDto>
): Promise<AuditDto> {
  const { data } = await axios.put(`${AUD_INDEX_API}/${id}`, partial)
  return data
}

export async function deleteAudit(id: number) {
  await axios.delete(`${AUD_INDEX_API}/${id}`)
}

/** Map Audit DTO -> UI row (shares same shape as InspectionRecord) */
export function mapAuditToRow(d: AuditDto): AuditRecord {
  return {
    id: d.id,
    vesselManager: '-',
    vessel: d.vesselName,
    vesselType: d.vesselType || '-',
    audit: d.auditKindName,
    auditType: d.auditType?.replace('_', ' ') || '-',
    auditDate: d.auditFromDate,
    // show internalAuditorName in the "Internal Inspector" column
    internalAuditor: d.internalAuditorName || undefined,
    // show externalAuditorName in the "External Inspector" column
    externalAuditor: d.externalAuditorName || undefined,
    fromPort: d.fromPortName || undefined,
    toPort: d.toPortName || undefined,
    hoursOnboard: d.hoursOnboard ?? undefined,
    isFinalized: d.isFinalized ? 'Yes' : 'No',
    isVerified: d.isVerified ? 'Yes' : 'No',
    countNCRsObservations: d.ncrCount ?? 0,
    countNCRsObservationsCompleted: d.ncrCompleted ?? 0,
    score: d.score ?? undefined,
    linkToPlan: d.id ? `/qhse/audit-planning?auditId=${d.id}` : undefined,
    auditRemarks: d.remarks || undefined,
  }
}

/** Available audits for vessel+kind (+ optional range) */
export async function listAvailableAudits(params: {
  vesselId: number
  auditKindId: number
  from?: string
  to?: string
}) {
  try {
    const { data } = await axios.get(`${AUD_INDEX_API}/available`, { params })
    return data as AuditDto[] | any[]
  } catch (err) {
    throw new Error(pickAxiosMessage(err, 'Failed to list available audits'))
  }
}

/**
 * Candidate audits for a given plan’s month/vessel/kind that are NOT linked yet.
 * This is used by AuditPlanActionsModal to show "Link Existing Audit".
 */
export async function listUnlinkedAudits(params: {
  vesselId: number
  auditKindId: number
  forDate: string // any date in the target month (YYYY-MM-DD)
}) {
  const { vesselId, auditKindId, forDate } = params

  const d = new Date(forDate)
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid forDate "${forDate}" passed to listUnlinkedAudits`)
  }

  const yyyy = d.getFullYear()
  const mm = d.getMonth()
  const from = new Date(yyyy, mm, 1).toISOString().slice(0, 10)      // YYYY-MM-01
  const to = new Date(yyyy, mm + 1, 0).toISOString().slice(0, 10)    // YYYY-MM-last

  // Pure audit endpoint – no inspection URLs here
  const { data } = await axios.get(`${AUD_INDEX_API}/available`, {
    params: { vesselId, auditKindId, from, to },
  })

  const arr = Array.isArray(data)
    ? data
    : Array.isArray((data as any)?.content)
      ? (data as any).content
      : []

  return arr
    // support both auditPlanId and legacy inspectionPlanId, but we don't *show* that anywhere
    .filter((x: any) => x?.auditPlanId == null && x?.auditPlanId == null)
    .map((x: any) => ({
      ...x,
      // normalize to new free-text audit field
      internalAuditorName:
        x.internalAuditorName ??
        x.internalAuditorName ??
        x?.internalAuditor?.fullName ??
        null,
    }))
}

// ===============================
// QHSE AUDIT PLANS (mirror inspection plans)
// ===============================

export async function listAuditPlans(params: {
  year?: number
  companyGroupId?: number
  vesselId?: number
  auditKindId?: number
}) {
  const res = await axios.get(`${AUD_PLAN_API}`, { params })
  return res.data as AuditPlanDto[] | any[]
}

export async function bulkCreateAuditPlans(
  body: CreateAuditPlansPayload
): Promise<AuditPlanDto[]> {
  try {
    const { data } = await axios.post<AuditPlanDto[]>(`${AUD_PLAN_API}/bulk`, body)
    return data
  } catch (err) {
    throw new Error(pickAxiosMessage(err, 'Bulk create audit plans failed'))
  }
}

/** Plans that match vessel + kind + month(forDate) and are NOT linked yet. */
export async function listAvailableAuditPlans(params: {
  vesselId: number
  auditKindId: number
  forDate: string // YYYY-MM-DD in target month
}) {
  const { vesselId, auditKindId, forDate } = params
  const res = await axios.get(`${AUD_PLAN_API}/available`, {
    params: { vesselId, auditKindId, forDate },
  })
  return res.data
}

/** Link auditPlan <-> audit */
export async function linkAuditPlanToAudit(planId: number, auditId: number) {
  const res = await axios.post(
    `${AUD_PLAN_API}/${planId}/attach-audit/${auditId}`
  )
  return res.data
}

/** Unlink auditPlan from audit */
export async function unlinkAuditPlan(planId: number) {
  const res = await axios.post(`${AUD_PLAN_API}/${planId}/detach-audit`)
  return res.data
}

/** Get plan mapped by audit id (reverse lookup) */
export async function getAuditPlanByAudit(auditId: number) {
  const res = await axios.get(`${AUD_PLAN_API}/by-audit/${auditId}`)
  return res.data as AuditPlanDto | null
}

/** Get single Audit plan */
export async function getAuditPlan(planId: number) {
  const res = await axios.get(`${AUD_PLAN_API}/${planId}`)
  return res.data as AuditPlanDto
}

export async function updateAuditPlan(
  id: number,
  partial: Partial<AuditPlanDto>
) {
  const { data } = await axios.put(`${AUD_PLAN_API}/${id}`, partial)
  return data as AuditPlanDto
}

export async function deleteAuditPlan(id: number) {
  await axios.delete(`${AUD_PLAN_API}/${id}`)
}

// ===============================
// QHSE DEFECT APIs
// ===============================

export type SearchDefectsParams = {
  companyGroupId?: number
  companyId?: number
  vesselId?: number
  category?: DefectCategory
  dacCode?: number
  fromDate?: string   // yyyy-MM-dd
  toDate?: string     // yyyy-MM-dd
  activeOnly?: boolean
}

const categoryLabel = (c?: DefectCategory | null) => {
  switch (c) {
    case 'THIRD_PARTY_INSPECTION': return 'Third party inspection'
    case 'SHIP_OBSERVATION': return 'Ship observation'
    case 'OFFICE_INSPECTION': return 'Office inspection'
    default: return '-'
  }
}

const tpiSubCategoryLabel = (t?: TpiSubCategory | null) => {
  switch (t) {
    case 'EXT_AUDIT': return 'Ext. Audit (external Audit)'
    case 'SIRE': return 'SIRE'
    case 'PSC_INSPECTION': return 'PSC Inspection (port state control)'
    case 'FSI_INSPECTION': return 'FSI Inspection (Flag State Inspection)'
    case 'OTHER': return 'Others'
    default: return undefined
  }
}

const smsCodeLabel = (s?: SmsCode | null) => {
  switch (s) {
    case 'SMS_OTHER_30_DAYS': return 'Others 1: close in 30 days'
    case 'SMS_OTHER_45_DAYS': return 'Others 2: close in 45 days'
    case 'SMS_OTHER_90_DAYS': return 'Others 3: close in 90 days'
    default: return undefined
  }
}

/** NEW: Department label */
const departmentLabel = (d?: DefectDepartment | null) => {
  switch (d) {
    case 'DECK': return 'Deck'
    case 'MACHINERY': return 'Machinery'
    case 'LSA_FFA_SAFETY': return 'LSA/FFA (safety)'
    case 'NAVIGATION': return 'Navigation'
    case 'MLC_OCCUPATIONAL_HEALTH': return 'MLC (occupational health)'
    case 'EMS_ENVIRONMENT_MANAGEMENT_SYSTEM': return 'EMS (environment management system)'
    case 'ENGINE': return 'Engine'
    case 'FSM_FOOD_SAFETY_MANAGEMENT': return 'FSM (food safety management)'
    case 'CERTIFICATION_AND_DOCUMENTATION': return 'Certification and documentation'
    case 'OTHERS': return 'Others'
    default: return undefined
  }
}

/** NEW: Status label */
const statusLabel = (s?: DefectStatus | null) => {
  switch (s) {
    case 'SAVE': return 'Saved'
    case 'SUBMIT': return 'Submitted'
    case 'CLOSE': return 'Closed'
    default: return '-'
  }
}

const closureResultStatusLabel = (
  status?: DefectStatus | null,
  closureResult?: DefectClosureResult | null
) => {
  if (status !== 'CLOSE') return undefined

  switch (closureResult) {
    case 'TO_BE_REVIEWED_NEXT_INSPECTION':
      return 'Closed and TBR'
    case 'SATISFACTORY':
    default:
      return 'Closed Satisfactorily'
  }
}

/** Raw list from server */
export async function searchDefects(params: SearchDefectsParams): Promise<QHSEDefectDto[]> {
  const { data } = await axios.get<QHSEDefectDto[]>(DEFECT_API_URL, { params })
  return Array.isArray(data) ? data : []
}

/** Map DTO -> UI row for table */
export function mapDefectToRow(
  d: QHSEDefectDto,
  vesselMeta?: { companyGroupAdminId?: number | null; companyAdminId?: number | null }
): DefectRecord {
  const status: DefectStatus | undefined = (d.status as DefectStatus | undefined) ?? 'SAVE'

  // --- NEW: normalize inspection/audit link ---
  const isInspection = d.inspectionId != null && Number(d.inspectionId) > 0
  const isAudit = d.auditId != null && Number(d.auditId) > 0

  let linkedType: 'INSPECTION' | 'AUDIT' | null = null
  let linkedLabel: string | null = null

  if (isInspection && !isAudit) {
    linkedType = 'INSPECTION'
    linkedLabel =
      d.inspectionDisplayName ||
      d.displayTitle ||
      (d.dateDefect
        ? `Inspection #${d.inspectionId} (${d.dateDefect})`
        : `Inspection #${d.inspectionId}`)
  } else if (isAudit && !isInspection) {
    linkedType = 'AUDIT'
    linkedLabel =
      d.auditDisplayName ||
      d.displayTitle ||
      (d.dateDefect
        ? `Audit #${d.auditId} (${d.dateDefect})`
        : `Audit #${d.auditId}`)
  }

  return {
    id: Number(d.id),
    vesselId: Number(d.vesselId),
    vesselName: d.vesselName || '-',

    defectNumber: d.defectNumber ?? null,

    inspectionId: d.inspectionId ?? null,
    auditId: d.auditId ?? null,
    linkedType,
    linkedLabel,

    category: d.category,
    categoryLabel: categoryLabel(d.category),

    tpiSubCategory: d.tpiSubCategory ?? null,
    tpiSubCategoryLabel: tpiSubCategoryLabel(d.tpiSubCategory),

    dacCode: d.dacCode,
    dacActionName: d.dacActionName ?? null,

    smsCode: d.smsCode ?? null,
    smsCodeLabel: smsCodeLabel(d.smsCode),

    description: d.description ?? null,
    dateObserved: d.dateObserved ?? null,
    dateDefect: d.dateDefect ?? null,

    applicableRequisitionNumber: d.applicableRequisitionNumber ?? null,

    department: d.department ?? null,
    departmentLabel: departmentLabel(d.department),

    attachmentPath: d.attachmentPath ?? null,
    closureEvidencePath: d.closureEvidencePath ?? null,

    correctiveAction: d.correctiveAction ?? null,
    preventiveAction: d.preventiveAction ?? null,

    remarks: d.remarks ?? null,
    closureRemark: d.closureRemark ?? null,

    status,
    statusLabel: statusLabel(status),

    closureResult: d.closureResult ?? null,
    closureResultLabel: closureResultStatusLabel(status, d.closureResult ?? null),

    displayTitle: d.displayTitle ?? null,

    companyGroupAdminId: vesselMeta?.companyGroupAdminId ?? null,
    companyAdminId: vesselMeta?.companyAdminId ?? null,
  }
}

/** Create defect (JSON, no files yet) */
export async function createDefect(
  payload: Omit<QHSEDefectDto,
    'id' | 'createdAt' | 'updatedAt' | 'vesselName' | 'displayTitle' | 'defectNumber' | 'status'>
): Promise<QHSEDefectDto> {
  const { data } = await axios.post<QHSEDefectDto>(DEFECT_API_URL, payload)
  return data
}

/** Get one defect */
export async function getDefect(id: number): Promise<QHSEDefectDto> {
  const { data } = await axios.get<QHSEDefectDto>(`${DEFECT_API_URL}/${id}`)
  return data
}

/** Update defect */
export async function updateDefect(
  id: number,
  partial: Partial<Omit<QHSEDefectDto,
    'id' | 'createdAt' | 'updatedAt' | 'vesselName' | 'defectNumber' | 'status'>>
): Promise<QHSEDefectDto> {
  const { data } = await axios.put<QHSEDefectDto>(`${DEFECT_API_URL}/${id}`, partial)
  return data
}

/** Submit (SAVE -> SUBMIT) */
export async function submitDefect(id: number): Promise<QHSEDefectDto> {
  const { data } = await axios.post<QHSEDefectDto>(`${DEFECT_API_URL}/${id}/submit`)
  return data
}

/** Close (SUBMIT -> CLOSE) with closure result */
export async function closeDefect(
  id: number,
  result?: DefectClosureResult
): Promise<QHSEDefectDto> {
  const { data } = await axios.post<QHSEDefectDto>(
    `${DEFECT_API_URL}/${id}/close`,
    null,
    {
      params: result ? { result } : undefined,
    }
  )
  return data
}

/** Hard delete (if you later add button) */
export async function deleteDefect(id: number): Promise<void> {
  await axios.delete(`${DEFECT_API_URL}/${id}`)
}

/** Soft delete wrapper if you use /{id}/soft-delete */
export async function softDeleteDefect(id: number): Promise<void> {
  await axios.post(`${DEFECT_API_URL}/${id}/soft-delete`)
}

/** Upload / replace main attachment document (multi-file) */
export async function uploadDefectAttachment(
  id: number,
  files: File | File[]
): Promise<QHSEDefectDto> {
  const fd = new FormData()
  const arr = Array.isArray(files) ? files : [files]
  arr.forEach((file) => {
    fd.append('files', file)
  })

  const { data } = await axios.post<QHSEDefectDto>(
    `${DEFECT_API_URL}/${id}/attachment`,
    fd,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      transformRequest: (d) => d,
      maxBodyLength: Infinity,
    }
  )
  return data
}

/** Upload / replace closure evidence document */
export async function uploadDefectClosureEvidence(
  id: number,
  file: File
): Promise<QHSEDefectDto> {
  const fd = new FormData()
  fd.append('file', file)

  const { data } = await axios.post<QHSEDefectDto>(
    `${DEFECT_API_URL}/${id}/closure-evidence`,
    fd,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  )
  return data
}

// ---- Defect File View / Download URLs ----

export const defectAttachmentViewUrl = (id: number) =>
  `${DEFECT_API_URL}/${id}/attachment/view`

export const defectAttachmentDownloadUrl = (id: number) =>
  `${DEFECT_API_URL}/${id}/attachment/download`

export const defectClosureViewUrl = (id: number) =>
  `${DEFECT_API_URL}/${id}/closure-evidence/view`

export const defectClosureDownloadUrl = (id: number) =>
  `${DEFECT_API_URL}/${id}/closure-evidence/download`

/** Delete closure evidence file */
export async function deleteDefectClosureEvidence(id: number): Promise<void> {
  await axios.delete(`${DEFECT_API_URL}/${id}/closure-evidence`)
}

// Multi-attachment helpers

export const defectAttachmentFileViewUrl = (id: number, fileName: string) =>
  `${DEFECT_API_URL}/${id}/attachment/view?file=${encodeURIComponent(fileName)}`

export const defectAttachmentFileDownloadUrl = (id: number, fileName: string) =>
  `${DEFECT_API_URL}/${id}/attachment/download?file=${encodeURIComponent(fileName)}`

export type DefectAttachmentInfo = {
  fileName: string
  webPath: string
  sizeBytes: number
  mimeType?: string | null
}

/** List all attachment files of a defect */
export async function listDefectAttachments(
  id: number
): Promise<DefectAttachmentInfo[]> {
  const { data } = await axios.get(`${DEFECT_API_URL}/${id}/attachments`)
  return Array.isArray(data) ? data : []
}

/** Delete a specific attachment by fileName */
export async function deleteDefectAttachment(
  id: number,
  fileName: string
): Promise<void> {
  await axios.delete(`${DEFECT_API_URL}/${id}/attachment`, {
    params: { file: fileName },
  })
}

// =====================
// QHSE – Inspection Findings
// =====================

export type SearchInspectionFindingParams = {
  companyGroupId?: number
  companyId?: number
  vesselId?: number
  inspectionId?: number
  status?: FindingStatus
  fromDate?: string
  toDate?: string
  activeOnly?: boolean
}

/**
 * Search / list inspection findings
 */
export async function searchInspectionFindings(
  params: SearchInspectionFindingParams
): Promise<QHSEInspectionFindingDto[]> {
  const { data } = await axios.get<QHSEInspectionFindingDto[]>(INSPECTION_FINDING_API_URL, {
    params,
  })
  return data
}

/**
 * Get single finding
 */
export async function getInspectionFinding(id: number): Promise<QHSEInspectionFindingDto> {
  const { data } = await axios.get<QHSEInspectionFindingDto>(
    `${INSPECTION_FINDING_API_URL}/${id}`
  )
  return data
}

/**
 * Create finding – you MUST at least send: inspectionId, findingName, status.
 */
export async function createInspectionFinding(
  payload: Partial<QHSEInspectionFindingDto> & {
    inspectionId: number
    findingName: string
    status: FindingStatus
  }
): Promise<QHSEInspectionFindingDto> {
  const { data } = await axios.post<QHSEInspectionFindingDto>(
    INSPECTION_FINDING_API_URL,
    payload
  )
  return data
}

/**
 * Update finding
 */
export async function updateInspectionFinding(
  id: number,
  payload: Partial<QHSEInspectionFindingDto>
): Promise<QHSEInspectionFindingDto> {
  const { data } = await axios.put<QHSEInspectionFindingDto>(
    `${INSPECTION_FINDING_API_URL}/${id}`,
    payload
  )
  return data
}

/**
 * Hard delete
 */
export async function deleteInspectionFinding(id: number): Promise<void> {
  await axios.delete(`${INSPECTION_FINDING_API_URL}/${id}`)
}

/**
 * Soft delete (mark inactive)
 */
export async function softDeleteInspectionFinding(id: number): Promise<void> {
  await axios.post(`${INSPECTION_FINDING_API_URL}/${id}/soft-delete`)
}

// ---------------------
// Attachments
// ---------------------

export async function uploadInspectionFindingAttachments(
  id: number,
  files: File[]
): Promise<QHSEInspectionFindingDto> {
  const form = new FormData()
  files.forEach((f) => form.append('files', f))

  const { data } = await axios.post<QHSEInspectionFindingDto>(
    `${INSPECTION_FINDING_API_URL}/${id}/attachments`,
    form,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    }
  )
  return data
}

export async function listInspectionFindingAttachments(
  id: number
): Promise<InspectionFindingAttachmentInfo[]> {
  const { data } = await axios.get<InspectionFindingAttachmentInfo[]>(
    `${INSPECTION_FINDING_API_URL}/${id}/attachments`
  )
  return data
}

// View / download single "main" attachment
export const inspectionFindingAttachmentViewUrl = (id: number) =>
  `${INSPECTION_FINDING_API_URL}/${id}/attachment/view`

export const inspectionFindingAttachmentDownloadUrl = (id: number) =>
  `${INSPECTION_FINDING_API_URL}/${id}/attachment/download`

// View / download a specific file by fileName
export const inspectionFindingAttachmentFileViewUrl = (id: number, fileName: string) =>
  `${INSPECTION_FINDING_API_URL}/${id}/attachment/view?file=${encodeURIComponent(fileName)}`

export const inspectionFindingAttachmentFileDownloadUrl = (id: number, fileName: string) =>
  `${INSPECTION_FINDING_API_URL}/${id}/attachment/download?file=${encodeURIComponent(fileName)}`

/** Delete a specific inspection finding attachment by fileName */
export async function deleteInspectionFindingAttachment(
  id: number,
  fileName: string
): Promise<void> {
  await axios.delete(`${INSPECTION_FINDING_API_URL}/${id}/attachment`, {
    params: { file: fileName },
  })
}

// =====================
// QHSE – Audit Findings
// =====================

export type SearchAuditFindingParams = {
  companyGroupId?: number
  companyId?: number
  vesselId?: number
  auditId?: number
  status?: FindingStatus
  fromDate?: string
  toDate?: string
  activeOnly?: boolean
}

/**
 * Search / list inspection findings
 */
export async function searchAuditFindings(
  params: SearchAuditFindingParams
): Promise<QHSEAuditFindingDto[]> {
  const { data } = await axios.get<QHSEAuditFindingDto[]>(AUDIT_FINDING_API_URL, {
    params,
  })
  return data
}

/**
 * Get single finding
 */
export async function getAuditFinding(id: number): Promise<QHSEAuditFindingDto> {
  const { data } = await axios.get<QHSEAuditFindingDto>(`${AUDIT_FINDING_API_URL}/${id}`)
  return data
}

/**
 * Create finding – you MUST at least send: inspectionId, findingName, status.
 */
export async function createAuditFinding(
  payload: Partial<QHSEAuditFindingDto> & {
    auditId: number
    findingName: string
    status: FindingStatus
  }
): Promise<QHSEAuditFindingDto> {
  const { data } = await axios.post<QHSEAuditFindingDto>(
    AUDIT_FINDING_API_URL,
    payload
  )
  return data
}

/**
 * Update finding
 */
export async function updateAuditFinding(
  id: number,
  payload: Partial<QHSEAuditFindingDto>
): Promise<QHSEAuditFindingDto> {
  const { data } = await axios.put<QHSEAuditFindingDto>(
    `${AUDIT_FINDING_API_URL}/${id}`,
    payload
  )
  return data
}

/**
 * Hard delete
 */
export async function deleteAuditFinding(id: number): Promise<void> {
  await axios.delete(`${AUDIT_FINDING_API_URL}/${id}`)
}

/**
 * Soft delete (mark inactive)
 */
export async function softDeleteAuditFinding(id: number): Promise<void> {
  await axios.post(`${AUDIT_FINDING_API_URL}/${id}/soft-delete`)
}

export async function uploadAuditFindingAttachments(
  id: number,
  files: File[]
): Promise<QHSEAuditFindingDto> {
  const form = new FormData()
  files.forEach((f) => form.append('files', f))

  const { data } = await axios.post<QHSEAuditFindingDto>(
    `${AUDIT_FINDING_API_URL}/${id}/attachments`,
    form,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    }
  )
  return data
}

export async function listAuditFindingAttachments(
  id: number
): Promise<AuditFindingAttachmentInfo[]> {
  const { data } = await axios.get<AuditFindingAttachmentInfo[]>(
    `${AUDIT_FINDING_API_URL}/${id}/attachments`
  )
  return data
}

// View / download single "main" attachment
export const AuditFindingAttachmentViewUrl = (id: number) =>
  `${AUDIT_FINDING_API_URL}/${id}/attachment/view`

export const AuditFindingAttachmentDownloadUrl = (id: number) =>
  `${AUDIT_FINDING_API_URL}/${id}/attachment/download`

// View / download a specific file by fileName
export const AuditFindingAttachmentFileViewUrl = (id: number, fileName: string) =>
  `${AUDIT_FINDING_API_URL}/${id}/attachment/view?file=${encodeURIComponent(fileName)}`

export const AuditFindingAttachmentFileDownloadUrl = (id: number, fileName: string) =>
  `${AUDIT_FINDING_API_URL}/${id}/attachment/download?file=${encodeURIComponent(fileName)}`

/** Delete a specific inspection finding attachment by fileName */
export async function deleteAuditFindingAttachment(
  id: number,
  fileName: string
): Promise<void> {
  await axios.delete(`${AUDIT_FINDING_API_URL}/${id}/attachment`, {
    params: { file: fileName },
  })
}

// ===============================
// QHSE NEAR MISS REPORT APIs
// ===============================

export type SearchNearMissParams = {
  companyGroupId?: number
  companyId?: number
  vesselId?: number
  occurrenceType?: NearMissOccurrenceType
  status?: NearMissStatus
  fromDate?: string    // yyyy-MM-dd
  toDate?: string      // yyyy-MM-dd
  activeOnly?: boolean
}

const occurrenceTypeLabel = (t?: NearMissOccurrenceType | null) => {
  switch (t) {
    case 'ACCIDENT': return 'Accident'
    case 'INCIDENT': return 'Incident'
    case 'NEAR_MISS': return 'Near miss'
    case 'HIGH_SEVERITY_NEAR_MISS': return 'High severity near miss'
    default: return '-'
  }
}

const locationOfOccurrenceLabel = (locs?: NearMissLocationOfOccurrence[] | null) => {
  if (!locs || !locs.length) return '-'
  const mapOne = (l: NearMissLocationOfOccurrence) => {
    switch (l) {
      case 'ACCOMMODATION': return 'Accommodation'
      case 'BRIDGE': return 'Bridge'
      case 'ASHORE': return 'Ashore'
      case 'ENGINE_ROOM_MACHINERY_SPACES': return 'Engine Room / Machinery Spaces'
      case 'DECK': return 'Deck'
      case 'ALOFT_OVERBOARD': return 'Aloft / Overboard'
      case 'ENCLOSED_SPACES': return 'Enclosed Spaces'
      case 'ENCLOSED_SPACES_MACHINERY': return 'Enclosed Spaces (Machinery)'
      case 'OFFICE': return 'Office'
      case 'STORE': return 'Store'
      case 'TRAFFIC_ROAD': return 'Traffic Road'
      case 'OTHER': return 'Other'
      default: return l
    }
  }
  return locs.map(mapOne).join(', ')
}

const substandardActsLabel = (acts?: NearMissSubstandardAct[] | null) => {
  if (!acts || !acts.length) return '-'
  const mapOne = (a: NearMissSubstandardAct) => {
    switch (a) {
      case 'FAILURE_TO_FOLLOW_RULES': return 'Failure To Follow Rules'
      case 'FAILURE_TO_USE_PPE_PROPERLY': return 'Failure To Use PPE Properly'
      case 'OPERATING_EQUIPMENT_WITHOUT_AUTHORITY': return 'Operating Equipment Without Authority'
      case 'INCORRECT_USE_OF_EQUIPMENT_OR_MACHINERY': return 'Incorrect Use of Equipment / Machinery'
      case 'USE_OF_DEFECTIVE_EQUIPMENT_OR_MACHINERY': return 'Use Of Defective Equipment / Machinery'
      case 'FAILURE_TO_FOLLOW_REPAIR_OR_MAINTENANCE_INSTRUCTIONS':
        return 'Failure To Follow Repair /Maintenance Instructions'
      case 'FAILURE_TO_WARN': return 'Failure To Warn'
      case 'FAILURE_TO_SECURE': return 'Failure To Secure'
      case 'BY_PASSING_SAFETY_DEVICE': return 'By-Passing Safety Device'
      case 'IMPROPER_POSITION_FOR_TASK': return 'Improper Position for Task'
      case 'IMPROPER_LIFTING_HANDLING_OR_STORAGE': return 'Improper Lifting, Handling or Storage'
      case 'HORSEPLAY_OR_INAPPROPRIATE_BEHAVIOUR': return 'Horseplay / Inappropriate Behaviour'
      case 'UNDER_INFLUENCE_OF_ALCOHOL_OR_DRUGS': return 'Under Influence of Alcohol or Drugs'
      default: return a
    }
  }
  return acts.map(mapOne).join(', ')
}

const substandardConditionsLabel = (conds?: NearMissSubstandardCondition[] | null) => {
  if (!conds || !conds.length) return '-'
  const mapOne = (c: NearMissSubstandardCondition) => {
    switch (c) {
      case 'INADEQUATE_GUARDS_OR_BARRIERS': return 'Inadequate Guards or Barriers'
      case 'INADEQUATE_OR_DEFECTIVE_PPE': return 'Inadequate Or Defective PPE'
      case 'DEFECTIVE_EQUIPMENT_OR_MACHINERY': return 'Defective Equipment / Machinery'
      case 'UNFAVOURABLE_HULL_OR_STRUCTURE_CONDITION': return 'Unfavourable Hull or Structure Condition'
      case 'POOR_HOUSEKEEPING': return 'Poor Housekeeping'
      case 'CONGESTION_OR_RESTRICTED_ACTION': return 'Congestion or Restricted Action'
      case 'INADEQUATE_OR_EXCESS_ILLUMINATION': return 'Inadequate or Excess Illumination'
      case 'INADEQUATE_VENTILATION': return 'Inadequate Ventilation'
      case 'OTHER_FACTORS': return 'Other Factors'
      default: return c
    }
  }
  return conds.map(mapOne).join(', ')
}

const nearMissStatusLabel = (s?: NearMissStatus | null) => {
  switch (s) {
    case 'SAVE': return 'Saved'
    case 'SUBMIT': return 'Submitted'
    case 'CLOSE': return 'Closed'
    default: return '-'
  }
}

const nearMissClosureResultLabel = (
  status?: NearMissStatus | null,
  closureResult?: NearMissClosureResult | null
) => {
  if (status !== 'CLOSE') return undefined

  switch (closureResult) {
    case 'TO_BE_REVIEWED_NEXT_INSPECTION':
      return 'Closed and TBR'
    case 'SATISFACTORY':
    default:
      return 'Closed Satisfactorily'
  }
}

/** Raw list from server */
export async function searchNearMissReports(
  params: SearchNearMissParams
): Promise<QHSENearMissReportDto[]> {
  const { data } = await axios.get<QHSENearMissReportDto[]>(NEAR_MISS_API_URL, { params })
  return Array.isArray(data) ? data : []
}

/** Map DTO -> UI row for table */
export function mapNearMissToRow(
  d: QHSENearMissReportDto,
  vesselMeta?: { companyGroupAdminId?: number | null; companyAdminId?: number | null }
): NearMissRecord {
  const status: NearMissStatus | undefined =
    (d.status as NearMissStatus | undefined) ?? 'SAVE'

  const occs = Array.isArray(d.occurrenceTypes) ? d.occurrenceTypes : []
  const occLabel = occs.length
    ? occs.map(occurrenceTypeLabel).join(', ')
    : '-'

  return {
    id: Number(d.id),
    vesselId: Number(d.vesselId),
    vesselName: d.vesselName || '-',

    reportNumber: d.reportNumber ?? null,
    locationPosition: d.locationPosition ?? null,

    reportIssuedBy: d.reportIssuedBy ?? null,
    dateIssued: d.dateIssued ?? null,

    dateOfOccurrence: d.dateOfOccurrence ?? null,
    timeOfOccurrence: d.timeOfOccurrence ?? null,

    reportedBy: d.reportedBy ?? null,
    reportedTo: d.reportedTo ?? null,
    dateReported: d.dateReported ?? null,
    timeReported: d.timeReported ?? null,

    occurrenceTypes: occs as NearMissOccurrenceType[],
    occurrenceTypesLabel: occLabel,

    personalInjuryFormCompleted: d.personalInjuryFormCompleted ?? null,
    anyStatementsAttached: d.anyStatementsAttached ?? null,

    locationOfOccurrence: d.locationOfOccurrence ?? null,
    locationOfOccurrenceLabel: locationOfOccurrenceLabel(d.locationOfOccurrence ?? undefined),

    descriptionOfOccurrence: d.descriptionOfOccurrence ?? null,

    substandardActs: d.substandardActs ?? null,
    substandardActsLabel: substandardActsLabel(d.substandardActs ?? undefined),

    substandardConditions: d.substandardConditions ?? null,
    substandardConditionsLabel: substandardConditionsLabel(
      d.substandardConditions ?? undefined
    ),

    status,
    statusLabel: nearMissStatusLabel(status),
    closureResult: d.closureResult ?? null,
    closureResultLabel: nearMissClosureResultLabel(status, d.closureResult ?? null),

    supportingDocsPrimaryPath: d.supportingDocsPrimaryPath ?? null,

    companyGroupAdminId: vesselMeta?.companyGroupAdminId ?? null,
    companyAdminId: vesselMeta?.companyAdminId ?? null,
  }
}

/** Create near miss (JSON, no files yet) */
export async function createNearMissReport(
  payload: Omit<QHSENearMissReportDto,
    'id' | 'createdAt' | 'updatedAt' | 'vesselName' | 'reportNumber' | 'status'>
): Promise<QHSENearMissReportDto> {
  const { data } = await axios.post<QHSENearMissReportDto>(NEAR_MISS_API_URL, payload)
  return data
}

/** Get one near miss */
export async function getNearMissReport(id: number): Promise<QHSENearMissReportDto> {
  const { data } = await axios.get<QHSENearMissReportDto>(`${NEAR_MISS_API_URL}/${id}`)
  return data
}

/** Update near miss */
export async function updateNearMissReport(
  id: number,
  partial: Partial<Omit<QHSENearMissReportDto,
    'id' | 'createdAt' | 'updatedAt' | 'vesselName' | 'reportNumber' | 'status'>>
): Promise<QHSENearMissReportDto> {
  const { data } = await axios.put<QHSENearMissReportDto>(
    `${NEAR_MISS_API_URL}/${id}`,
    partial
  )
  return data
}

/** Submit (SAVE -> SUBMIT) */
export async function submitNearMissReport(id: number): Promise<QHSENearMissReportDto> {
  const { data } = await axios.post<QHSENearMissReportDto>(`${NEAR_MISS_API_URL}/${id}/submit`)
  return data
}

/** Close (SUBMIT -> CLOSE) with closure result */
export async function closeNearMissReport(
  id: number,
  result?: NearMissClosureResult
): Promise<QHSENearMissReportDto> {
  const { data } = await axios.post<QHSENearMissReportDto>(
    `${NEAR_MISS_API_URL}/${id}/close`,
    null,
    { params: result ? { result } : undefined }
  )
  return data
}

/** Hard delete */
export async function deleteNearMissReport(id: number): Promise<void> {
  await axios.delete(`${NEAR_MISS_API_URL}/${id}`)
}

/** Soft delete */
export async function softDeleteNearMissReport(id: number): Promise<void> {
  await axios.post(`${NEAR_MISS_API_URL}/${id}/soft-delete`)
}

// /** Upload / replace supporting documents (multi-file) */
// export async function uploadNearMissSupportingDocuments(
//   id: number,
//   files: File | File[]
// ): Promise<QHSENearMissReportDto> {
//   const fd = new FormData()
//   const arr = Array.isArray(files) ? files : [files]
//   arr.forEach((file) => {
//     fd.append('files', file)
//   })

//   const { data } = await axios.post<QHSENearMissReportDto>(
//     `${NEAR_MISS_API_URL}/${id}/supporting-documents`,
//     fd,
//     {
//       headers: { 'Content-Type': 'multipart/form-data' },
//       transformRequest: (d) => d,
//       maxBodyLength: Infinity,
//     }
//   )
//   return data
// }

/** View/download URLs */

export const nearMissSupportingViewUrl = (id: number) =>
  `${NEAR_MISS_API_URL}/${id}/supporting/view`

export const nearMissSupportingDownloadUrl = (id: number) =>
  `${NEAR_MISS_API_URL}/${id}/supporting/download`

export const nearMissSupportingFileViewUrl = (id: number, fileName: string) =>
  `${NEAR_MISS_API_URL}/${id}/supporting/view?file=${encodeURIComponent(fileName)}`

export const nearMissSupportingFileDownloadUrl = (id: number, fileName: string) =>
  `${NEAR_MISS_API_URL}/${id}/supporting/download?file=${encodeURIComponent(fileName)}`

export type NearMissAttachmentInfo = {
  fileName: string
  webPath: string
  sizeBytes: number
  mimeType?: string | null
}

/** List all supporting docs */
export async function listNearMissSupportingDocuments(
  id: number
): Promise<NearMissAttachmentInfo[]> {
  const { data } = await axios.get(`${NEAR_MISS_API_URL}/${id}/supporting-documents`)
  return Array.isArray(data) ? data : []
}

/** Delete a specific supporting doc */
export async function deleteNearMissSupportingDocument(
  id: number,
  fileName: string
): Promise<void> {
  await axios.delete(`${NEAR_MISS_API_URL}/${id}/supporting-document`, {
    params: { file: fileName },
  })
}

// Convenience variants which respect API_URL (same behaviour as “supporting*” helpers)

export const nearMissAttachmentFileViewUrl = (id: number, fileName: string) =>
  `${NEAR_MISS_API_URL}/${id}/supporting/view?file=${encodeURIComponent(fileName)}`

export const nearMissAttachmentFileDownloadUrl = (id: number, fileName: string) =>
  `${NEAR_MISS_API_URL}/${id}/supporting/download?file=${encodeURIComponent(fileName)}`

export const listNearMissAttachments = async (
  id: number
): Promise<NearMissAttachmentInfo[]> => {
  const { data } = await axios.get<NearMissAttachmentInfo[]>(
    `${NEAR_MISS_API_URL}/${id}/supporting-documents`
  )
  return Array.isArray(data) ? data : []
}

export const deleteNearMissAttachment = async (
  id: number,
  fileName: string
): Promise<void> => {
  await axios.delete(`${NEAR_MISS_API_URL}/${id}/supporting-document`, {
    params: { file: fileName },
  })
}

/** Upload supporting documents for a near miss.
 * Called from Add/Edit/Review flows.
 */
export const uploadNearMissSupportingDocuments = async (
  id: number,
  files: File[]
) => {
  const formData = new FormData()
  files.forEach((f) => formData.append('files', f))

  const { data } = await axios.post(
    `${NEAR_MISS_API_URL}/${id}/supporting-documents`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      transformRequest: (d) => d,
      maxBodyLength: Infinity,
    }
  )
  return data
}

// ===============================
// RISK ASSESSMENT FORMS (Vessel-scoped)
// ===============================

export const riskAssessmentViewUrl      = (id: number) => `${RISK_API_URL}/${id}/view`
export const riskAssessmentDownloadUrl  = (id: number) => `${RISK_API_URL}/${id}/download`

export const riskAssessmentRevisionViewUrl     = (revisionId: number) => `${RISK_API_URL}/revisions/${revisionId}/view`
export const riskAssessmentRevisionDownloadUrl = (revisionId: number) => `${RISK_API_URL}/revisions/${revisionId}/download`

/** list by vessel */
export async function listRiskAssessmentsByVessel(vesselId: number): Promise<RiskAssessmentDto[]> {
  try {
    const { data } = await axios.get<RiskAssessmentDto[]>(`${RISK_API_URL}/vessel/${vesselId}`)
    return data
  } catch (err) {
    throw new Error(pickAxiosMessage(err, 'Failed to load risk assessments'))
  }
}

/** get one */
export async function getRiskAssessment(id: number): Promise<RiskAssessmentDto> {
  try {
    const { data } = await axios.get<RiskAssessmentDto>(`${RISK_API_URL}/${id}`)
    return data
  } catch (err) {
    throw new Error(pickAxiosMessage(err, 'Failed to load risk assessment'))
  }
}

/** create (multipart) – number is auto-generated by backend */
export async function createRiskAssessment(payload: {
  vesselId: number
  dateOfIssue?: string
  uploadedBy: string
  uploadedByName: string
  remarks?: string
  file: File
}) {
  const fd = new FormData()
  fd.append('vesselId', String(payload.vesselId))
  if (payload.dateOfIssue) fd.append('dateOfIssue', payload.dateOfIssue)
  fd.append('uploadedBy', payload.uploadedBy)
  fd.append('uploadedByName', payload.uploadedByName)
  if (payload.remarks) fd.append('remarks', payload.remarks)
  fd.append('file', payload.file)

  const { data } = await axios.post(`${RISK_API_URL}`, fd, {
    headers: {
      'Content-Type': 'multipart/form-data',
      Accept: 'application/json',
    },
    transformRequest: (d) => d,
    maxBodyLength: Infinity,
  })
  return data as RiskAssessmentDto
}

/** update meta – we will NOT send assessmentNumber (kept immutable) */
export async function updateRiskAssessment(
  id: number,
  partial: Partial<RiskAssessmentDto>
): Promise<RiskAssessmentDto> {
  try {
    const { data } = await axios.put<RiskAssessmentDto>(`${RISK_API_URL}/${id}`, partial)
    return data
  } catch (err) {
    throw new Error(pickAxiosMessage(err, 'Failed to update risk assessment'))
  }
}

/** replace file (new revision) */
export async function replaceRiskAssessmentFile(id: number, file: File): Promise<RiskAssessmentDto> {
  const fd = new FormData()
  fd.append('file', file)

  const { data } = await axios.patch<RiskAssessmentDto>(`${RISK_API_URL}/${id}/file`, fd, {
    headers: {
      'Content-Type': 'multipart/form-data',
      Accept: 'application/json',
    },
    transformRequest: (d) => d,
    maxBodyLength: Infinity,
  })
  return data
}

/** soft delete */
export async function softDeleteRiskAssessment(id: number): Promise<void> {
  try {
    await axios.delete(`${RISK_API_URL}/${id}`)
  } catch (err) {
    throw new Error(pickAxiosMessage(err, 'Failed to delete risk assessment'))
  }
}

/** revisions */
export async function listRiskAssessmentRevisions(id: number): Promise<RiskAssessmentRevision[]> {
  const { data } = await axios.get(`${RISK_API_URL}/${id}/revisions`)
  return data as RiskAssessmentRevision[]
}

/** DTO -> table row */
export function mapRiskAssessmentDtoToRow(d: RiskAssessmentDto): RiskAssessmentRecord {
  const fileName = d.assessmentNumber || `risk_assessment_${d.id}`
  const size = sizeToBytes(d.fileSize)
  const expiryIso = d.dateOfExpiry || undefined

  const isExpired =
    expiryIso != null ? new Date(expiryIso).getTime() < Date.now() : false

  return {
    id: d.id,
    vesselId: d.vesselId,
    vesselName: d.vesselName,
    assessmentNumber: d.assessmentNumber,
    dateOfIssue: d.dateOfIssue || undefined,
    dateOfExpiry: d.dateOfExpiry || undefined,
    isExpired,
    uploadedByName: d.uploadedByName || '',
    uploadedDate: d.uploadedDate || '',
    file: {
      name: fileName,
      url: riskAssessmentDownloadUrl(d.id),
      type: d.fileMime || 'application/octet-stream',
      size,
    },
    remarks: d.remarks || undefined,
    revisionCount: Number(d.revisionCount ?? 0),
  }
}
