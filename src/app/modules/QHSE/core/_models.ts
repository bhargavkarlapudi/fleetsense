// models.ts

// ============================================================================
// Core: Vessel, Crew, User, Generic API
// ============================================================================

// ----------------------
// Vessel
// ----------------------
export interface Vessel {
  id: string
  name: string
  imoNumber?: string
  flag?: string
  builtYear?: number
  ownerCompany?: string
  createdAt?: string
  updatedAt?: string
}

// Lite vessel used in many dropdowns / indexes
// add near the other exports
export type VesselLite = {
  id: number
  name: string
  vesselType?: string
  companyGroupAdminId?: number
  companyAdminId?: number
}

// If you prefer to import from Crewing/_models, skip this local type.
// This 'lite' is enough for the dropdown.
export type CrewLite = {
  id: number
  fullName: string
  rankName?: string
  vesselId?: number
  companyGroupAdminId?: number
  companyAdminId?: number
  // 🔧 ADD:
  rankId?: number
  active?: boolean
}

// ----------------------
// User Details (Uploader / Auth User)
// ----------------------
export interface UserDetails {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
  createdAt?: string
  updatedAt?: string
}

// ----------------------
// API Generic Response
// ----------------------
export interface ApiResponse<T> {
  success: boolean
  message?: string
  data: T
}

// ----------------------
// Error Model
// ----------------------
export interface ApiError {
  message: string
  statusCode?: number
  errors?: Record<string, string[]>
}

// ============================================================================
// Documents / Certificates / Library
// ============================================================================

export interface Certificate {
  id: string
  certificateName: string
  dateOfIssue?: string
  dateOfExpiry?: string
  uploadedDate?: string
  uploadedBy?: string
  uploadedByName?: string
  vesselId?: string
  fileUrl?: string
  fileSize?: string
  filePath?: string
  fileMime?: string          // NEW
  remarks?: string

  // NEW (revisions)
  revisionCount?: number
  currentFileRevisionId?: number
}

export type CertificateRevision = {
  id: number
  revisionIndex: number
  filePath: string
  fileSize: string
  fileMime: string | null
  uploadedBy: number
  uploadedByName: string
  uploadedDate: string
  createdAt: string
}

export interface DocumentItem {
  id: number
  title: string
  type: 'folder' | 'document'
  category: string
  filePath?: string | null
  fileSize?: string | null
  dateUploaded?: string | null
  parentId?: number | null
  createdBy?: string
  lastModified?: string
  children?: DocumentItem[]
  fileUrl?: string
}

export interface BreadcrumbItem {
  id: string
  title: string
  path?: string
}

// ============================================================================
// Manuals & Plans (Company Group level)
// ============================================================================

export interface ManualPlanDto {
  id: number
  name: string
  dateOfApproval?: string | null

  /** legacy text, still may come but ignore for counting */
  revisionNo?: string | null

  approvedBy?: string | null

  uploadedBy?: number | null
  uploadedByName?: string | null
  uploadedDate?: string | null

  companyGroupId: number

  /** current/latest file only */
  filePath?: string | null
  fileSize?: string | null
  fileMime?: string | null

  remarks?: string | null
  active?: boolean
  lastModified?: string | null

  /** NEW */
  revisionCount?: number | null
  currentFileRevisionId?: number | null
}

// UI Row (keeps your table happy)
export type ManualPlanRecord = {
  id: number
  name: string
  dateOfApproval?: string
  revisionCount: number                    // <-- number now
  approvedBy?: string
  uploadedByName: string
  uploadedDate: string
  companyGroupAdminId?: number | null
  companyAdminId?: number | null
  vesselId?: number | null
  file: { name: string; url: string; type: string; size: number }
  remarks?: string
}

// ============================================================================
// QHSE: Inspection & Audit Planning / Index
// ============================================================================

// ----------------------
// Master: Inspection Kind & Ports
// ----------------------
export interface QhseInspectionKind {
  id: number
  name: string
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

// Ports used by Inspections (maps main_port -> name at request layer)
export interface Port {
  id: number
  name: string        // mapped from main_port
  latitude?: number
  longitude?: number
}

// ----------------------
// Inspection Planning DTOs
// ----------------------
export interface InspectionPlanDto {
  id: number
  vesselId: number
  /** Backend not send names; we fill them on the frontend */
  vesselName?: string
  planDate: string               // ISO yyyy-MM-dd (use first day of month)
  inspectionKindId: number
  /** Backend not send names; we fill them on the frontend */
  inspectionKindName?: string
  isActive: boolean
  inspectionId?: number | null
  createdAt?: string
  updatedAt?: string
}

// ----------------------
// Audit Planning DTOs
// ----------------------
export interface AuditPlanDto {
  id: number
  vesselId: number
  /** Backend may not send names; we fill on frontend */
  vesselName?: string
  planDate: string               // ISO yyyy-MM-dd (use first day of month)
  auditKindId: number
  /** Backend may not send names; we fill on frontend */
  auditKindName?: string
  isActive: boolean
  /** Linked audit id if any */
  auditId?: number | null
  createdAt?: string
  updatedAt?: string
}

export type CreatePlansPayload = {
  year: number
  inspectionKindId: number
  vesselIds: number[]
  months: number[]               // 1..12
}

export type CreateAuditPlansPayload = {
  year: number
  auditKindId: number
  vesselIds: number[]
  months: number[]               // 1..12
}

// ----------------------
// Inspection Index DTOs
// ----------------------
export interface InspectionDto {
  id: number
  vesselId: number
  vesselName: string
  vesselType?: string
  inspectionKindId: number
  inspectionKindName: string
  inspectionType: 'ATTACHMENT_TYPE' | 'DETAILS_TYPE'
  /** free-text internal inspector name (no FK) */
  internalInspectorName?: string | null
  /** free-text external inspector name */
  externalInspectorName?: string | null
  inspectionFromDate: string      // ISO yyyy-MM-dd
  inspectionToDate: string        // ISO yyyy-MM-dd
  fromPortId?: number | null
  fromPortName?: string | null
  toPortId?: number | null
  toPortName?: string | null
  hoursOnboard?: number | null
  isFinalized?: boolean
  isVerified?: boolean
  ncrCount?: number
  ncrCompleted?: number
  score?: number | null
  remarks?: string | null
  inspectionPlanId?: number | null
  createdAt?: string
  updatedAt?: string
}

export type CreateInspectionPayload = {
  vesselId: number
  inspectionKindId: number
  inspectionType: 'ATTACHMENT_TYPE' | 'DETAILS_TYPE'
  inspectionFromDate: string
  inspectionToDate: string
  /** free-text internal inspector name (no FK) */
  internalInspectorName?: string
  /** free-text external inspector name */
  externalInspectorName?: string
  fromPortId?: number
  toPortId?: number
  hoursOnboard?: number
  linkToPlanId?: number
  remarks?: string
}

// UI record used by your table (stays close to your current columns)
export type InspectionRecord = {
  id: number
  vesselManager: string
  vessel: string
  vesselType: string
  inspection: string               // kind name
  inspectionType: string
  inspectionDate: string           // single date shown (we’ll show “from”)
  internalInspector?: string
  externalInspector?: string
  fromPort?: string
  toPort?: string
  hoursOnboard?: number
  isFinalized: string              // Yes/No
  isVerified: string               // Yes/No
  countNCRsObservations: number
  countNCRsObservationsCompleted: number
  score?: number
  linkToPlan?: string
  inspectionRemarks?: string

  /** Hidden/raw ids for client-side filtering only (not rendered) */
  vesselId?: number
  inspectionKindId?: number
  fromPortId?: number
  toPortId?: number
  companyGroupAdminId?: number | null
  companyAdminId?: number | null
}

// ----------------------
// Audit Index DTOs (mirror Inspection)
// ----------------------
export interface QhseAuditKind {
  id: number
  name: string
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

export interface AuditDto {
  id: number
  vesselId: number
  vesselName: string
  vesselType?: string
  auditKindId: number
  auditKindName: string
  auditType: 'ATTACHMENT_TYPE' | 'DETAILS_TYPE'
  /** free-text internal inspector name (no FK) */
  internalAuditorName?: string | null
  /** free-text external inspector name */
  externalAuditorName?: string | null
  auditFromDate: string      // ISO yyyy-MM-dd
  auditToDate: string        // ISO yyyy-MM-dd
  fromPortId?: number | null
  fromPortName?: string | null
  toPortId?: number | null
  toPortName?: string | null
  hoursOnboard?: number | null
  isFinalized?: boolean
  isVerified?: boolean
  ncrCount?: number
  ncrCompleted?: number
  score?: number | null
  remarks?: string | null
  auditPlanId?: number | null
  createdAt?: string
  updatedAt?: string
}

export type CreateAuditPayload = {
  vesselId: number
  auditKindId: number        // audit kind id
  auditType: 'ATTACHMENT_TYPE' | 'DETAILS_TYPE'
  auditFromDate: string
  auditToDate: string

  /** free-text internal auditor name (no FK) */
  internalAuditorName?: string
  /** free-text external auditor name */
  externalAuditorName?: string

  fromPortId?: number
  toPortId?: number
  hoursOnboard?: number
  linkToPlanId?: number
  remarks?: string
}

// UI row for Audit table = same as InspectionRecord
export type AuditRecord = {
  id: number
  vesselManager: string
  vessel: string
  vesselType: string
  audit: string               // kind name
  auditType: string
  auditDate: string           // single date shown (we’ll show “from”)
  internalAuditor?: string
  externalAuditor?: string
  fromPort?: string
  toPort?: string
  hoursOnboard?: number
  isFinalized: string              // Yes/No
  isVerified: string               // Yes/No
  countNCRsObservations: number
  countNCRsObservationsCompleted: number
  score?: number
  linkToPlan?: string
  auditRemarks?: string

  /** Hidden/raw ids for client-side filtering only (not rendered) */
  vesselId?: number
  auditKindId?: number
  fromPortId?: number
  toPortId?: number
  companyGroupAdminId?: number | null
  companyAdminId?: number | null
}

// ============================================================================
// QHSE Defect models
// ============================================================================

export type DefectCategory =
  | 'THIRD_PARTY_INSPECTION'
  | 'SHIP_OBSERVATION'
  | 'OFFICE_INSPECTION'

export type TpiSubCategory =
  | 'EXT_AUDIT'
  | 'SIRE'
  | 'PSC_INSPECTION'
  | 'FSI_INSPECTION'
  | 'OTHER'

export type SmsCode =
  | 'SMS_OTHER_30_DAYS'
  | 'SMS_OTHER_45_DAYS'
  | 'SMS_OTHER_90_DAYS'

export type DefectDepartment =
  | 'DECK'
  | 'MACHINERY'
  | 'LSA_FFA_SAFETY'
  | 'NAVIGATION'
  | 'MLC_OCCUPATIONAL_HEALTH'
  | 'EMS_ENVIRONMENT_MANAGEMENT_SYSTEM'
  | 'ENGINE'
  | 'FSM_FOOD_SAFETY_MANAGEMENT'
  | 'CERTIFICATION_AND_DOCUMENTATION'
  | 'OTHERS'

export type DefectStatus = 'SAVE' | 'SUBMIT' | 'CLOSE'

export type DefectClosureResult =
  | 'SATISFACTORY'
  | 'TO_BE_REVIEWED_NEXT_INSPECTION'

// export type ResponsibilityType =
//   | 'SHORE_ASSISTANT'
//   | 'SHIP_CREW'

export interface QHSEDefectDto {
  id?: number

  defectNumber?: string | null

  vesselId: number
  vesselName?: string

  inspectionId?: number | null
  auditId?: number | null

  /**
   * Optional display names sent by backend (recommended):
   * - For inspection-linked defects
   * - For audit-linked defects
   *
   * Suggested backend labels:
   *   "Vessel Name - Inspection Kind - FromDate"
   *   "Vessel Name - Audit Kind - FromDate"
   */
  inspectionDisplayName?: string | null
  auditDisplayName?: string | null

  category: DefectCategory
  tpiSubCategory?: TpiSubCategory | null

  dacCode: number
  dacActionName?: string | null

  smsCode?: SmsCode | null

  description?: string | null

  dateObserved?: string | null      // ISO yyyy-MM-dd
  dateDefect?: string | null        // ISO yyyy-MM-dd

  applicableRequisitionNumber?: string | null

  department?: DefectDepartment | null

  attachmentPath?: string | null
  closureEvidencePath?: string | null

  correctiveAction?: string | null
  preventiveAction?: string | null

  remarks?: string | null
  closureRemark?: string

  closureResult?: DefectClosureResult | null

  status?: DefectStatus | null

  active?: boolean | null

  createdAt?: string | null
  updatedAt?: string | null

  displayTitle?: string | null
}

// UI row for table
export type DefectRecord = {
  id: number
  vesselId: number
  vesselName: string

  defectNumber?: string | null

  // --- NEW: raw link ids for view modal or future actions ---
  inspectionId?: number | null
  auditId?: number | null

  // --- NEW: normalized link info for list/filter ---
  /**
   * INSPECTION → linked to QHSEVesselInspection
   * AUDIT      → linked to QHSEVesselAudit
   * null       → (should not happen with current backend rules, but kept safe)
   */
  linkedType?: 'INSPECTION' | 'AUDIT' | null
  /**
   * Prebuilt display text like:
   *   "MT Demo Vessel - Internal Inspection - 2025-01-10"
   *   "MT Demo Vessel - Internal Audit - 2025-02-05"
   */
  linkedLabel?: string | null

  category: DefectCategory
  categoryLabel: string

  tpiSubCategory?: TpiSubCategory | null
  tpiSubCategoryLabel?: string | null

  dacCode: number
  dacActionName?: string | null

  smsCode?: SmsCode | null
  smsCodeLabel?: string | null

  description?: string | null

  dateObserved?: string | null
  dateDefect?: string | null

  applicableRequisitionNumber?: string | null

  department?: DefectDepartment | null
  departmentLabel?: string | null

  attachmentPath?: string | null
  closureEvidencePath?: string | null

  correctiveAction?: string | null
  preventiveAction?: string | null

  remarks?: string | null
  closureRemark?: string | null   // 🔹 NEW: keep saved closure remark

  status?: DefectStatus | null
  statusLabel?: string | null

  closureResult?: DefectClosureResult | null
  // optional convenience label if needed later
  closureResultLabel?: string | null

  displayTitle?: string | null

  // hidden ids for filters
  companyGroupAdminId?: number | null
  companyAdminId?: number | null
}

// ============================================================================
// QHSE Inspection & Audit Findings
// ============================================================================

// MUST match backend enum QHSEInspectionFinding.FindingStatus
export type FindingStatus =
  | 'SATISFACTORY'
  | 'NON_CRITICAL'
  | 'CRITICAL'
  | 'OBSERVATION'
  | 'OPPORTUNITY_FOR_IMPROVEMENT'

export type FindingType =
  | 'NON_CONFORMITY_REPORT'
  | 'OBSERVATION_NOTE'
  | 'FAILURE_NOTE'
  | 'DEVIATION_NOTE'

// ----------------------
// Inspection Finding DTOs
// ----------------------
export interface QHSEInspectionFindingDto {
  id: number
  inspectionId: number

  // finding core
  /** Short title / label (maps to finding_name, VARCHAR(300)) */
  findingName: string

  /** Long rich-text HTML (maps to description LONGTEXT) */
  description?: string | null

  /** Optional UI alias; we’ll map it from findingName for table */
  findingLabel?: string | null

  /** Stored in backend as isPositive (boolean) */
  isPositive?: boolean | null
  /** UI convenience for table/modals */
  critical?: boolean | null

  status: FindingStatus
  findingType: FindingType | null
  findingDate?: string | null
  remarks?: string | null

  // attachment
  attachmentPath?: string | null
  active?: boolean

  // inspection meta (filled by backend mapper)
  vesselId?: number | null
  vesselName?: string | null
  inspectionKindName?: string | null
  inspectionType?: string | null
  inspectionDate?: string | null
  internalInspectorName?: string | null
  externalInspectorName?: string | null

  // tenant scoping
  companyGroupAdminId?: number | null
  companyAdminId?: number | null
}

export interface InspectionFindingRecord {
  id: number

  // table columns
  vesselName?: string
  inspectionName?: string
  findingLabel?: string
  /** Plain-text summary used in the table */
  findingName: string
  critical?: boolean | null
  status?: FindingStatus
  findingType: FindingType | null
  findingDate?: string | null

  // meta
  attachmentPath?: string | null

  // tenant scoping for filters
  vesselId?: number | null
  companyGroupAdminId?: number | null
  companyAdminId?: number | null
}

export interface InspectionFindingAttachmentInfo {
  fileName: string
  webPath: string
  sizeBytes: number
  mimeType?: string | null
}

// ----------------------
// Audit Finding DTOs
// ----------------------
export interface QHSEAuditFindingDto {
  id: number
  auditId: number

  // finding core
  /** Short title / label (maps to finding_name, VARCHAR(300)) */
  findingName: string

  /** Long rich-text HTML (maps to description LONGTEXT) */
  description?: string | null

  /** Optional UI alias; we’ll map it from findingName for table */
  findingLabel?: string | null

  /** Stored in backend as isPositive (boolean) */
  isPositive?: boolean | null
  /** UI convenience for table/modals */
  critical?: boolean | null

  status: FindingStatus
  findingType: FindingType | null
  findingDate?: string | null
  remarks?: string | null

  // attachment
  attachmentPath?: string | null
  active?: boolean

  // inspection meta (filled by backend mapper)
  vesselId?: number | null
  vesselName?: string | null
  auditKindName?: string | null
  auditType?: string | null
  auditDate?: string | null
  internalAuditorName?: string | null
  externalAuditorName?: string | null

  // tenant scoping
  companyGroupAdminId?: number | null
  companyAdminId?: number | null
}

// (duplicate kept intentionally – original file had both)
export interface QHSEAuditFindingDto {
  id: number
  auditId: number

  // finding core
  /** Short title / label (maps to finding_name, VARCHAR(300)) */
  findingName: string

  /** Long rich-text HTML (maps to description LONGTEXT) */
  description?: string | null

  /** Optional UI alias; we’ll map it from findingName for table */
  findingLabel?: string | null

  /** Stored in backend as isPositive (boolean) */
  isPositive?: boolean | null
  /** UI convenience for table/modals */
  critical?: boolean | null

  status: FindingStatus
  findingType: FindingType | null
  findingDate?: string | null
  remarks?: string | null

  // attachment
  attachmentPath?: string | null
  active?: boolean

  // inspection meta (filled by backend mapper)
  vesselId?: number | null
  vesselName?: string | null
  auditKindName?: string | null
  auditType?: string | null
  auditDate?: string | null
  internalAuditorName?: string | null
  externalAuditorName?: string | null

  // tenant scoping
  companyGroupAdminId?: number | null
  companyAdminId?: number | null
}

export interface AuditFindingRecord {
  id: number

  // table columns
  vesselName?: string
  auditName?: string
  findingLabel?: string
  /** Plain-text summary used in the table */
  findingName: string
  critical?: boolean | null
  status?: FindingStatus
  findingType: FindingType | null
  findingDate?: string | null

  // meta
  attachmentPath?: string | null

  // tenant scoping for filters
  vesselId?: number | null
  companyGroupAdminId?: number | null
  companyAdminId?: number | null
}

export interface AuditFindingAttachmentInfo {
  fileName: string
  webPath: string
  sizeBytes: number
  mimeType?: string | null
}

// (duplicate kept intentionally – original file had both)
export interface AuditFindingAttachmentInfo {
  fileName: string
  webPath: string
  sizeBytes: number
  mimeType?: string | null
}

// ----------------------
// Finding Submit Shapes (UI forms)
// ----------------------
export type FindingSubmitShape = {
  inspectionId: string          // dropdown selection

  /** Short title / label – goes to findingName (varchar 300) */
  findingName: string

  /** Long rich-text HTML – goes to description (LONGTEXT) */
  description: string

  critical: 'YES' | 'NO' | ''
  status: FindingStatus | ''    // required in UI
  findingType: FindingType | ''
  remarks?: string

  attachmentFiles?: File[] | null
}

export type AuditFindingSubmitShape = {
  auditId: string          // dropdown selection

  /** Short title / label – goes to findingName (varchar 300) */
  findingName: string

  /** Long rich-text HTML – goes to description (LONGTEXT) */
  description: string

  critical: 'YES' | 'NO' | ''
  status: FindingStatus | ''    // required in UI
  findingType: FindingType | ''
  remarks?: string

  attachmentFiles?: File[] | null
}

// ============================================================================
// QHSE Near Miss models
// ============================================================================

export type NearMissStatus = 'SAVE' | 'SUBMIT' | 'CLOSE'

export type NearMissClosureResult =
  | 'SATISFACTORY'
  | 'TO_BE_REVIEWED_NEXT_INSPECTION'

export type NearMissOccurrenceType =
  | 'ACCIDENT'
  | 'INCIDENT'
  | 'NEAR_MISS'
  | 'HIGH_SEVERITY_NEAR_MISS'

export type NearMissLocationOfOccurrence =
  | 'ACCOMMODATION'
  | 'BRIDGE'
  | 'ASHORE'
  | 'ENGINE_ROOM_MACHINERY_SPACES'
  | 'DECK'
  | 'ALOFT_OVERBOARD'
  | 'ENCLOSED_SPACES'
  | 'ENCLOSED_SPACES_MACHINERY'
  | 'OFFICE'
  | 'STORE'
  | 'TRAFFIC_ROAD'
  | 'OTHER'

export type NearMissSubstandardAct =
  | 'FAILURE_TO_FOLLOW_RULES'
  | 'FAILURE_TO_USE_PPE_PROPERLY'
  | 'OPERATING_EQUIPMENT_WITHOUT_AUTHORITY'
  | 'INCORRECT_USE_OF_EQUIPMENT_OR_MACHINERY'
  | 'USE_OF_DEFECTIVE_EQUIPMENT_OR_MACHINERY'
  | 'FAILURE_TO_FOLLOW_REPAIR_OR_MAINTENANCE_INSTRUCTIONS'
  | 'FAILURE_TO_WARN'
  | 'FAILURE_TO_SECURE'
  | 'BY_PASSING_SAFETY_DEVICE'
  | 'IMPROPER_POSITION_FOR_TASK'
  | 'IMPROPER_LIFTING_HANDLING_OR_STORAGE'
  | 'HORSEPLAY_OR_INAPPROPRIATE_BEHAVIOUR'
  | 'UNDER_INFLUENCE_OF_ALCOHOL_OR_DRUGS'

export type NearMissSubstandardCondition =
  | 'INADEQUATE_GUARDS_OR_BARRIERS'
  | 'INADEQUATE_OR_DEFECTIVE_PPE'
  | 'DEFECTIVE_EQUIPMENT_OR_MACHINERY'
  | 'UNFAVOURABLE_HULL_OR_STRUCTURE_CONDITION'
  | 'POOR_HOUSEKEEPING'
  | 'CONGESTION_OR_RESTRICTED_ACTION'
  | 'INADEQUATE_OR_EXCESS_ILLUMINATION'
  | 'INADEQUATE_VENTILATION'
  | 'OTHER_FACTORS'

// Raw DTO from backend
export interface QHSENearMissReportDto {
  id?: number

  reportNumber?: string | null

  vesselId: number
  vesselName?: string | null

  locationPosition?: string | null

  reportIssuedBy?: string | null
  dateIssued?: string | null

  dateOfOccurrence?: string | null
  timeOfOccurrence?: string | null

  reportedBy?: string | null
  reportedTo?: string | null
  dateReported?: string | null
  timeReported?: string | null

  occurrenceTypes: NearMissOccurrenceType[]

  personalInjuryFormCompleted?: boolean | null
  anyStatementsAttached?: boolean | null

  locationOfOccurrence?: NearMissLocationOfOccurrence[] | null

  descriptionOfOccurrence?: string | null

  substandardActs?: NearMissSubstandardAct[] | null
  substandardConditions?: NearMissSubstandardCondition[] | null

  personsInjured?: string | null
  personsInvolved?: string | null
  personsWitness?: string | null
  typeOfInjury?: string | null

  immediateBasicCause?: string | null
  rootCause?: string | null
  correctiveActionsProposed?: string | null
  preventativeActionsProposed?: string | null

  objectiveEvidence?: string | null

  supportingDocsPrimaryPath?: string | null

  dpaConclusionsAndRecommendations?: string | null

  status?: NearMissStatus | null
  closureResult?: NearMissClosureResult | null

  active?: boolean | null

  createdAt?: string | null
  updatedAt?: string | null
}

// UI row for table
export type NearMissRecord = {
  id: number
  vesselId: number
  vesselName: string

  reportNumber?: string | null

  locationPosition?: string | null

  reportIssuedBy?: string | null
  dateIssued?: string | null

  dateOfOccurrence?: string | null
  timeOfOccurrence?: string | null

  reportedBy?: string | null
  reportedTo?: string | null
  dateReported?: string | null
  timeReported?: string | null

  occurrenceTypes: NearMissOccurrenceType[]
  occurrenceTypesLabel: string

  personalInjuryFormCompleted?: boolean | null
  anyStatementsAttached?: boolean | null

  locationOfOccurrence?: NearMissLocationOfOccurrence[] | null
  locationOfOccurrenceLabel?: string | null

  descriptionOfOccurrence?: string | null

  substandardActs?: NearMissSubstandardAct[] | null
  substandardActsLabel?: string | null

  substandardConditions?: NearMissSubstandardCondition[] | null
  substandardConditionsLabel?: string | null

  status?: NearMissStatus | null
  statusLabel?: string | null
  closureResult?: NearMissClosureResult | null
  closureResultLabel?: string | null

  supportingDocsPrimaryPath?: string | null

  // for filters
  companyGroupAdminId?: number | null
  companyAdminId?: number | null
}

export type NearMissAttachmentInfo = {
  fileName: string
  webPath: string
  sizeBytes: number
  mimeType: string | null
}

// ----------------------
// Risk Assessment (Vessel-scoped)
// ----------------------
export interface RiskAssessmentDto {
  id: number
  vesselId: number
  vesselName?: string

  assessmentNumber: string
  dateOfIssue?: string | null
  dateOfExpiry?: string | null

  uploadedDate?: string | null
  uploadedBy?: number | null
  uploadedByName?: string | null

  filePath?: string | null
  fileSize?: string | null
  fileMime?: string | null

  remarks?: string | null
  active?: boolean
  lastModified?: string | null

  revisionCount?: number | null
  currentFileRevisionId?: number | null
}

export type RiskAssessmentRecord = {
  id: number
  vesselId: number
  vesselName?: string
  assessmentNumber: string
  dateOfIssue?: string
  dateOfExpiry?: string
  isExpired: boolean
  uploadedByName: string
  uploadedDate: string
  file: { name: string; url: string; type: string; size: number }
  remarks?: string
  revisionCount: number
}

export type RiskAssessmentRevision = {
  id: number
  revisionIndex: number
  filePath: string
  fileSize: string
  fileMime: string | null
  uploadedBy: number
  uploadedByName: string
  uploadedDate: string
  createdAt: string
}
