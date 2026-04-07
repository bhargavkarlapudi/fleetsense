// PMS Models

// ============================================================================
// Enums
// ============================================================================

export type PmsWorkType =
  | 'CHECK'
  | 'OVERHAUL'
  | 'RENEW'
  | 'ADJUST'
  | 'INSPECT'
  | 'TEST'
  | 'CLEAN'

export type PmsScheduleType =
  | 'TIME'
  | 'RUNNING_HOURS'
  | 'HYBRID_WHICHEVER_FIRST'
  | 'HYBRID_BOTH_REQUIRED'
  | 'EVENT'
  | 'DOCK'
  | 'AS_REQUIRED'

export type PmsIntervalUnit = 'DAYS' | 'MONTHS' | 'YEARS' | 'HOURS'

export type PmsHierarchyLevel = 'COMPONENT' | 'SUB_COMPONENT'

export type PmsPlanStatus = 'DRAFT' | 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED'

export type PmsCriticality = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export type PmsJobState =
  | 'PLANNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'VERIFIED'
  | 'CLOSED'
  | 'DEFERRED'
  | 'CANCELLED'

export type RunningHourReadingSource = 'MANUAL' | 'BULK_UPLOAD'

export type RunningHourValidationStatus =
  | 'VALID'
  | 'INVALID_DECREASING'
  | 'INVALID_EXCEEDS_JUMP_LIMIT'
  | 'PENDING'

export type PmsJobAttachmentFileType =
  | 'PHOTO'
  | 'REPORT'
  | 'SIGNED_JOB_CARD'
  | 'PROCEDURE'

// ============================================================================
// DTOs
// ============================================================================

export interface PmsTemplateDto {
  id?: number
  name: string
  description?: string | null
  machineryType?: string | null
  maker?: string | null
  model?: string | null
  power?: string | null
  cylinders?: number | null
  active?: boolean | null
  createdAt?: string | null
  updatedAt?: string | null
}

export interface PmsTemplateTaskDto {
  id?: number
  templateId?: number | null
  templateName?: string | null
  hierarchyLevel: PmsHierarchyLevel
  referenceId?: number | null
  groupTitle?: string | null
  itemTitle?: string | null
  workType: PmsWorkType
  scheduleType: PmsScheduleType
  oemCode?: string | null
  remarks?: string | null
  procedureFileRef?: string | null
  checklist?: string | null
  requiredRank?: string | null
  estimatedManHours?: number | null
  safetyNotes?: string | null
  permitRequired?: boolean | null
  expectedSparesList?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

export interface PmsPlanDto {
  id?: number
  vesselId: number
  vesselName?: string | null
  name: string
  description?: string | null
  fromTemplateId?: number | null
  fromTemplateName?: string | null
  status: PmsPlanStatus
  version?: number | null
  revisedFromPlanId?: number | null
  createdBy?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

export interface PmsPlanLineDto {
  id?: number
  planId: number
  planName?: string | null
  equipmentId?: number | null
  equipmentName?: string | null
  equipmentCode?: string | null
  componentId?: number | null
  componentName?: string | null
  componentCode?: string | null
  subComponentId?: number | null
  subComponentName?: string | null
  subComponentCode?: string | null
  componentInstanceId?: number | null
  componentInstanceNumber?: number | null
  subComponentInstanceId?: number | null
  subComponentInstanceNumber?: number | null
  jobCode?: string | null
  jobPeriodicity?: number | null
  periodicityId?: string | null
  jobPeriodicity2?: number | null
  periodicityId2?: string | null
  crewUndertaking?: string | null
  jobInstructions?: string | null
  jobType?: string | null
  taskDescription: string
  workType: PmsWorkType
  scheduleType: PmsScheduleType
  criticality: PmsCriticality
  lastDoneDate?: string | null
  lastDoneCounter?: number | null
  lastDoneBy?: string | null
  nextDueDate?: string | null
  nextDueCounter?: number | null
  preAlertDays?: number | null
  preAlertHoursThreshold?: number | null
  earlyTolerancePercent?: number | null
  earlyToleranceDays?: number | null
  lateTolerancePercent?: number | null
  lateToleranceDays?: number | null
  lateToleranceHours?: number | null
  runningHourCounterId?: number | null
  runningHourCounterName?: string | null
  runningHourCounterValue?: number | null
  active?: boolean | null
  hasOpenJob?: boolean | null
  createdAt?: string | null
  updatedAt?: string | null
}

export interface RunningHourCounterDto {
  id?: number
  vesselId: number
  vesselName?: string | null
  equipmentId: number
  equipmentName?: string | null
  equipmentCode?: string | null
  name: string
  currentValue: number
  lastUpdatedAt?: string | null
  maxDailyJumpLimit?: number | null
}

export interface RunningHourReadingDto {
  id?: number
  counterId: number
  counterName?: string | null
  readingDate: string
  value: number
  source: RunningHourReadingSource
  createdBy?: string | null
  validationStatus?: RunningHourValidationStatus | null
  createdAt?: string | null
}

export interface PmsJobDto {
  id?: number
  planLineId?: number | null
  vesselId: number
  vesselName?: string | null
  equipmentId?: number | null
  equipmentName?: string | null
  componentId?: number | null
  componentName?: string | null
  subComponentId?: number | null
  subComponentName?: string | null
  defectId?: number | null
  defectNumber?: string | null
  jobCode?: string | null
  jobType?: string | null // I, G, C, O, A, S
  jobDescription?: string | null
  jobPeriodicity?: number | null
  periodicityId?: string | null // M, H, C
  jobPeriodicity2?: number | null
  periodicityId2?: string | null // M, H, C
  crewUndertaking?: string | null
  jobInstructions?: string | null
  componentInstanceId?: number | null
  subComponentInstanceId?: number | null
  title: string
  scheduleType?: PmsScheduleType | null
  criticality?: PmsCriticality | null
  lastDoneDate?: string | null
  dueDate?: string | null
  dueCounter?: number | null
  state: PmsJobState
  createdBy?: string | null
  assignedToUserId?: number | null
  assignedToUserName?: string | null
  responsibleRank?: string | null
  actualStartDate?: string | null
  actualCompletionDate?: string | null
  actualCounterAtCompletion?: number | null
  remarks?: string | null
  findings?: string | null
  measuredValues?: string | null
  deferReason?: string | null
  cancelReason?: string | null
  newDueDate?: string | null
  newDueCounter?: number | null
  timeTaken?: number | null
  personsInvolved?: number | null
  manHours?: number | null
  performerUserId?: number | null
  performerUserName?: string | null
  verifierUserId?: number | null
  verifierUserName?: string | null
  plannedExecutionDate?: string | null
  requiredTools?: string | null
  riskPermitRequired?: boolean | null
  checklist?: string | null
  procedureFileRef?: string | null
  safetyPrecautions?: string | null
  permitType?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

export interface PmsJobSpareUsageDto {
  id?: number
  jobId: number
  inventoryItemId: number
  inventoryItemName?: string | null
  inventoryItemPartName?: string | null
  quantity: number
  unitCost?: number | null
  totalCost?: number | null
  createdAt?: string | null
}

export interface PmsJobAttachmentDto {
  id?: number
  jobId: number
  fileType: PmsJobAttachmentFileType
  filePath: string
  fileName: string
  fileSize?: number | null
  uploadedAt?: string | null
  uploadedBy?: string | null
}

export type PmsPostponementReasonCategory =
  | 'WEATHER'
  | 'PORT_OPS'
  | 'SPARES_NOT_AVAILABLE'
  | 'MANPOWER'
  | 'EQUIPMENT_UNAVAILABLE'
  | 'SAFETY_CONCERN'
  | 'OTHER'

export type PmsPostponementRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface PmsPostponementRequestDto {
  id?: number
  jobId: number
  jobCode?: string | null
  jobTitle?: string | null
  reasonCategory: PmsPostponementReasonCategory
  reasonDetails?: string | null
  proposedDueDate?: string | null
  proposedDueCounter?: number | null
  evidenceAttachmentId?: number | null
  requestedById?: number | null
  requestedByName?: string | null
  requestedAt?: string | null
  status: PmsPostponementRequestStatus
  approvedById?: number | null
  approvedByName?: string | null
  approvedAt?: string | null
  rejectionReason?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

export interface PmsJobCompletionDto {
  actualCompletionDate?: string | null
  actualCounterAtCompletion?: number | null
  remarks?: string | null
  findings?: string | null
  measuredValues?: string | null
  timeTaken?: number | null
  personsInvolved?: number | null
  performerUserId?: number | null
  verifierUserId?: number | null
  spareUsages?: SpareUsageItem[] | null
}

export interface SpareUsageItem {
  inventoryItemId: number
  quantity: number
}

// ============================================================================
// UI Records (for list displays)
// ============================================================================

export type PmsJobRecord = PmsJobDto & {
  overdueDays?: number | null
  overdueHours?: number | null
  criticality?: PmsCriticality | null
}

export type PmsPlanLineRecord = PmsPlanLineDto & {
  overdue?: boolean
  upcoming?: boolean
}

// ============================================================================
// Bulk Operations
// ============================================================================

export interface BulkJobOperationResult {
  total: number
  successful: number[]
  failed: { [jobId: number]: string }
}

// ============================================================================
// Reports
// ============================================================================

export interface ComplianceReportDto {
  vesselId?: number | null
  fromDate?: string | null
  toDate?: string | null
  totalPlanLines: number
  completedPlanLines: number
  compliancePercent: number
  totalJobs: number
  completedJobs: number
  overdueJobs: number
}

export interface JobHistoryReportDto {
  jobId?: number | null
  jobCode?: string | null
  vesselName?: string | null
  title?: string | null
  state?: string | null
  dueDate?: string | null
  actualCompletionDate?: string | null
  equipmentName?: string | null
  componentName?: string | null
}

export interface OverhaulHistoryReportDto {
  jobId?: number | null
  jobCode?: string | null
  vesselName?: string | null
  title?: string | null
  equipmentName?: string | null
  componentName?: string | null
  completionDate?: string | null
  runningHoursAtCompletion?: number | null
}

export interface SparesConsumptionReportDto {
  inventoryItemId: number
  inventoryItemName?: string | null
  partNumber?: string | null
  totalQuantity: number
  totalCost: number
  jobCount: number
  vesselName?: string | null
  equipmentName?: string | null
  componentName?: string | null
}

export interface DefectsIntegrationReportDto {
  vesselId?: number | null
  fromDate?: string | null
  toDate?: string | null
  totalJobs: number
  jobsCreatedFromDefects: number
  jobsFromDefectsPercent: number
  defectsResolvedViaPms: number
  averageResolutionDays: number
}

