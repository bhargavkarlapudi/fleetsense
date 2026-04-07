import axios from 'axios'
import type { AxiosError } from 'axios'
import {
  PmsTemplateDto,
  PmsTemplateTaskDto,
  PmsPlanDto,
  PmsPlanLineDto,
  RunningHourCounterDto,
  RunningHourReadingDto,
  PmsJobDto,
  PmsJobSpareUsageDto,
  PmsJobAttachmentDto,
  PmsJobAttachmentFileType,
  PmsJobCompletionDto,
  PmsJobRecord,
  PmsPlanLineRecord,
  PmsJobState,
  ComplianceReportDto,
  JobHistoryReportDto,
  OverhaulHistoryReportDto,
  PmsPostponementRequestDto,
  SparesConsumptionReportDto,
  DefectsIntegrationReportDto,
  BulkJobOperationResult,
} from './_models'

const API_URL = process.env.REACT_APP_API_URL
const PMS_API_URL = `${API_URL}/pms`

// ===============================
// HELPERS
// ===============================

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
// TEMPLATES
// ===============================

export const getPmsTemplates = async (q?: string): Promise<PmsTemplateDto[]> => {
  try {
    const params = q ? { q } : {}
    const { data } = await axios.get(`${PMS_API_URL}/templates`, { params })
    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error('Error fetching PMS templates:', error)
    throw new Error(pickAxiosMessage(error, 'Error fetching PMS templates'))
  }
}

export const getPmsTemplate = async (id: number): Promise<PmsTemplateDto> => {
  try {
    const { data } = await axios.get(`${PMS_API_URL}/templates/${id}`)
    return data
  } catch (error) {
    console.error('Error fetching PMS template:', error)
    throw new Error(pickAxiosMessage(error, 'Error fetching PMS template'))
  }
}

export const createPmsTemplate = async (dto: PmsTemplateDto): Promise<PmsTemplateDto> => {
  try {
    const { data } = await axios.post(`${PMS_API_URL}/templates`, dto)
    return data
  } catch (error) {
    console.error('Error creating PMS template:', error)
    throw new Error(pickAxiosMessage(error, 'Error creating PMS template'))
  }
}

export const updatePmsTemplate = async (id: number, dto: PmsTemplateDto): Promise<PmsTemplateDto> => {
  try {
    const { data } = await axios.put(`${PMS_API_URL}/templates/${id}`, dto)
    return data
  } catch (error) {
    console.error('Error updating PMS template:', error)
    throw new Error(pickAxiosMessage(error, 'Error updating PMS template'))
  }
}

export const deletePmsTemplate = async (id: number): Promise<void> => {
  try {
    await axios.delete(`${PMS_API_URL}/templates/${id}`)
  } catch (error) {
    console.error('Error deleting PMS template:', error)
    throw new Error(pickAxiosMessage(error, 'Error deleting PMS template'))
  }
}

// ===============================
// TEMPLATE TASKS
// ===============================

export const getPmsTemplateTasks = async (templateId: number): Promise<PmsTemplateTaskDto[]> => {
  try {
    const { data } = await axios.get(`${PMS_API_URL}/templates/${templateId}/tasks`)
    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error('Error fetching template tasks:', error)
    throw new Error(pickAxiosMessage(error, 'Error fetching template tasks'))
  }
}

export const getPmsTemplateTask = async (taskId: number): Promise<PmsTemplateTaskDto> => {
  try {
    const { data } = await axios.get(`${PMS_API_URL}/templates/tasks/${taskId}`)
    return data
  } catch (error) {
    console.error('Error fetching template task:', error)
    throw new Error(pickAxiosMessage(error, 'Error fetching template task'))
  }
}

export const createPmsTemplateTask = async (templateId: number, dto: PmsTemplateTaskDto): Promise<PmsTemplateTaskDto> => {
  try {
    const { data } = await axios.post(`${PMS_API_URL}/templates/${templateId}/tasks`, dto)
    return data
  } catch (error) {
    console.error('Error creating template task:', error)
    throw new Error(pickAxiosMessage(error, 'Error creating template task'))
  }
}

export const updatePmsTemplateTask = async (taskId: number, dto: PmsTemplateTaskDto): Promise<PmsTemplateTaskDto> => {
  try {
    const { data } = await axios.put(`${PMS_API_URL}/templates/tasks/${taskId}`, dto)
    return data
  } catch (error) {
    console.error('Error updating template task:', error)
    throw new Error(pickAxiosMessage(error, 'Error updating template task'))
  }
}

export const deletePmsTemplateTask = async (taskId: number): Promise<void> => {
  try {
    await axios.delete(`${PMS_API_URL}/templates/tasks/${taskId}`)
  } catch (error) {
    console.error('Error deleting template task:', error)
    throw new Error(pickAxiosMessage(error, 'Error deleting template task'))
  }
}

// ===============================
// PLANS
// ===============================

export const getPmsPlans = async (vesselId?: number): Promise<PmsPlanDto[]> => {
  try {
    const params = vesselId ? { vesselId } : {}
    const { data } = await axios.get(`${PMS_API_URL}/plans`, { params })
    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error('Error fetching PMS plans:', error)
    throw new Error(pickAxiosMessage(error, 'Error fetching PMS plans'))
  }
}

export const getPmsPlan = async (id: number): Promise<PmsPlanDto> => {
  try {
    const { data } = await axios.get(`${PMS_API_URL}/plans/${id}`)
    return data
  } catch (error) {
    console.error('Error fetching PMS plan:', error)
    throw new Error(pickAxiosMessage(error, 'Error fetching PMS plan'))
  }
}

export const createPmsPlan = async (dto: PmsPlanDto): Promise<PmsPlanDto> => {
  try {
    const { data } = await axios.post(`${PMS_API_URL}/plans`, dto)
    return data
  } catch (error) {
    console.error('Error creating PMS plan:', error)
    throw new Error(pickAxiosMessage(error, 'Error creating PMS plan'))
  }
}

export const updatePmsPlan = async (id: number, dto: PmsPlanDto): Promise<PmsPlanDto> => {
  try {
    const { data } = await axios.put(`${PMS_API_URL}/plans/${id}`, dto)
    return data
  } catch (error) {
    console.error('Error updating PMS plan:', error)
    throw new Error(pickAxiosMessage(error, 'Error updating PMS plan'))
  }
}

export const deletePmsPlan = async (id: number): Promise<void> => {
  try {
    await axios.delete(`${PMS_API_URL}/plans/${id}`)
  } catch (error) {
    console.error('Error deleting PMS plan:', error)
    throw new Error(pickAxiosMessage(error, 'Error deleting PMS plan'))
  }
}

export const derivePlanFromTemplate = async (
  planId: number,
  templateId: number,
  replace: boolean = false
): Promise<{ planId: number; templateId: number; linesCreated: number; replace: boolean }> => {
  try {
    const { data } = await axios.post(
      `${PMS_API_URL}/plans/${planId}/derive-from-template`,
      null,
      { params: { templateId, replace } }
    )
    return data
  } catch (error) {
    console.error('Error deriving plan from template:', error)
    throw new Error(pickAxiosMessage(error, 'Error deriving plan from template'))
  }
}

// ===============================
// PLAN LINES
// ===============================

export const getPmsPlanLines = async (planId: number): Promise<PmsPlanLineDto[]> => {
  try {
    const { data } = await axios.get(`${PMS_API_URL}/plans/${planId}/lines`)
    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error('Error fetching plan lines:', error)
    throw new Error(pickAxiosMessage(error, 'Error fetching plan lines'))
  }
}

export const createPmsPlanLine = async (planId: number, dto: PmsPlanLineDto): Promise<PmsPlanLineDto> => {
  try {
    const { data } = await axios.post(`${PMS_API_URL}/plans/${planId}/lines`, dto)
    return data
  } catch (error) {
    console.error('Error creating plan line:', error)
    throw new Error(pickAxiosMessage(error, 'Error creating plan line'))
  }
}

export const updatePmsPlanLine = async (id: number, dto: PmsPlanLineDto): Promise<PmsPlanLineDto> => {
  try {
    const { data } = await axios.put(`${PMS_API_URL}/plans/lines/${id}`, dto)
    return data
  } catch (error) {
    console.error('Error updating plan line:', error)
    throw new Error(pickAxiosMessage(error, 'Error updating plan line'))
  }
}

export const deletePmsPlanLine = async (lineId: number): Promise<void> => {
  try {
    await axios.delete(`${PMS_API_URL}/plans/lines/${lineId}`)
  } catch (error) {
    console.error('Error deleting plan line:', error)
    throw new Error(pickAxiosMessage(error, 'Error deleting plan line'))
  }
}

// ===============================
// JOBS
// ===============================

export const searchPmsJobs = async (
  vesselId?: number,
  state?: PmsJobState,
  fromDate?: string,
  toDate?: string,
  defectId?: number
): Promise<PmsJobDto[]> => {
  try {
    const params: any = {}
    if (vesselId) params.vesselId = vesselId
    if (state) params.state = state
    if (fromDate) params.fromDate = fromDate
    if (defectId) params.defectId = defectId
    if (toDate) params.toDate = toDate
    const { data } = await axios.get(`${PMS_API_URL}/jobs`, { params })
    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error('Error searching PMS jobs:', error)
    throw new Error(pickAxiosMessage(error, 'Error searching PMS jobs'))
  }
}

export const getPmsJob = async (id: number): Promise<PmsJobDto> => {
  try {
    const { data } = await axios.get(`${PMS_API_URL}/jobs/${id}`)
    return data
  } catch (error) {
    console.error('Error fetching PMS job:', error)
    throw new Error(pickAxiosMessage(error, 'Error fetching PMS job'))
  }
}

export const createPmsJob = async (dto: PmsJobDto): Promise<PmsJobDto> => {
  try {
    const { data } = await axios.post(`${PMS_API_URL}/jobs`, dto)
    return data
  } catch (error) {
    console.error('Error creating PMS job:', error)
    throw new Error(pickAxiosMessage(error, 'Error creating PMS job'))
  }
}

export const updatePmsJob = async (id: number, dto: PmsJobDto): Promise<PmsJobDto> => {
  try {
    const { data } = await axios.put(`${PMS_API_URL}/jobs/${id}`, dto)
    return data
  } catch (error) {
    console.error('Error updating PMS job:', error)
    throw new Error(pickAxiosMessage(error, 'Error updating PMS job'))
  }
}

export const reassignPmsJob = async (id: number, crewUndertaking: string, reason?: string): Promise<PmsJobDto> => {
  try {
    const params: any = { crewUndertaking }
    if (reason) params.reason = reason
    const { data } = await axios.post(`${PMS_API_URL}/jobs/${id}/reassign`, null, { params })
    return data
  } catch (error) {
    console.error('Error reassigning PMS job:', error)
    throw new Error(pickAxiosMessage(error, 'Error reassigning PMS job'))
  }
}

export const startPmsJob = async (id: number): Promise<PmsJobDto> => {
  try {
    const { data } = await axios.post(`${PMS_API_URL}/jobs/${id}/start`)
    return data
  } catch (error) {
    console.error('Error starting PMS job:', error)
    throw new Error(pickAxiosMessage(error, 'Error starting PMS job'))
  }
}

export const completePmsJob = async (id: number, dto: PmsJobCompletionDto): Promise<PmsJobDto> => {
  try {
    const { data } = await axios.post(`${PMS_API_URL}/jobs/${id}/complete`, dto)
    return data
  } catch (error) {
    console.error('Error completing PMS job:', error)
    throw new Error(pickAxiosMessage(error, 'Error completing PMS job'))
  }
}

export const verifyPmsJob = async (id: number, remarks?: string): Promise<PmsJobDto> => {
  try {
    const params = remarks ? { remarks } : {}
    const { data } = await axios.post(`${PMS_API_URL}/jobs/${id}/verify`, null, { params })
    return data
  } catch (error) {
    console.error('Error verifying PMS job:', error)
    throw new Error(pickAxiosMessage(error, 'Error verifying PMS job'))
  }
}

export const deferPmsJob = async (
  id: number,
  reason: string,
  newDueDate?: string,
  newDueCounter?: number
): Promise<PmsJobDto> => {
  try {
    const params: any = { reason }
    if (newDueDate) params.newDueDate = newDueDate
    if (newDueCounter) params.newDueCounter = newDueCounter
    const { data } = await axios.post(`${PMS_API_URL}/jobs/${id}/defer`, null, { params })
    return data
  } catch (error) {
    console.error('Error deferring PMS job:', error)
    throw new Error(pickAxiosMessage(error, 'Error deferring PMS job'))
  }
}

export const cancelPmsJob = async (id: number, reason: string): Promise<PmsJobDto> => {
  try {
    const { data } = await axios.post(`${PMS_API_URL}/jobs/${id}/cancel`, null, { params: { reason } })
    return data
  } catch (error) {
    console.error('Error cancelling PMS job:', error)
    throw new Error(pickAxiosMessage(error, 'Error cancelling PMS job'))
  }
}

// Batch Operations
export const bulkStartJobs = async (jobIds: number[]): Promise<BulkJobOperationResult> => {
  try {
    const { data } = await axios.post(`${PMS_API_URL}/jobs/batch/start`, { jobIds })
    return data
  } catch (error) {
    console.error('Error starting jobs in bulk:', error)
    throw new Error(pickAxiosMessage(error, 'Error starting jobs in bulk'))
  }
}

export const bulkDeferJobs = async (
  jobIds: number[],
  reason: string,
  newDueDate?: string,
  newDueCounter?: number
): Promise<BulkJobOperationResult> => {
  try {
    const { data } = await axios.post(`${PMS_API_URL}/jobs/batch/defer`, {
      jobIds,
      reason,
      newDueDate,
      newDueCounter,
    })
    return data
  } catch (error) {
    console.error('Error deferring jobs in bulk:', error)
    throw new Error(pickAxiosMessage(error, 'Error deferring jobs in bulk'))
  }
}

export const bulkCancelJobs = async (jobIds: number[], reason: string): Promise<BulkJobOperationResult> => {
  try {
    const { data } = await axios.post(`${PMS_API_URL}/jobs/batch/cancel`, { jobIds, reason })
    return data
  } catch (error) {
    console.error('Error cancelling jobs in bulk:', error)
    throw new Error(pickAxiosMessage(error, 'Error cancelling jobs in bulk'))
  }
}

// Postponement Requests
export const createPostponementRequest = async (
  dto: Partial<PmsPostponementRequestDto>
): Promise<PmsPostponementRequestDto> => {
  try {
    const { data } = await axios.post(`${PMS_API_URL}/postponements`, dto)
    return data
  } catch (error) {
    console.error('Error creating postponement request:', error)
    throw new Error(pickAxiosMessage(error, 'Error creating postponement request'))
  }
}

export const approvePostponementRequest = async (
  id: number,
  remarks?: string
): Promise<PmsPostponementRequestDto> => {
  try {
    const { data } = await axios.post(`${PMS_API_URL}/postponements/${id}/approve`, null, {
      params: remarks ? { remarks } : {},
    })
    return data
  } catch (error) {
    console.error('Error approving postponement request:', error)
    throw new Error(pickAxiosMessage(error, 'Error approving postponement request'))
  }
}

export const rejectPostponementRequest = async (
  id: number,
  rejectionReason: string
): Promise<PmsPostponementRequestDto> => {
  try {
    const { data } = await axios.post(`${PMS_API_URL}/postponements/${id}/reject`, null, {
      params: { rejectionReason },
    })
    return data
  } catch (error) {
    console.error('Error rejecting postponement request:', error)
    throw new Error(pickAxiosMessage(error, 'Error rejecting postponement request'))
  }
}

export const getPendingPostponementRequests = async (): Promise<PmsPostponementRequestDto[]> => {
  try {
    const { data } = await axios.get(`${PMS_API_URL}/postponements/pending`)
    return data
  } catch (error) {
    console.error('Error fetching pending postponement requests:', error)
    throw new Error(pickAxiosMessage(error, 'Error fetching pending postponement requests'))
  }
}

export const getPostponementRequestsByJob = async (jobId: number): Promise<PmsPostponementRequestDto[]> => {
  try {
    const { data } = await axios.get(`${PMS_API_URL}/postponements/job/${jobId}`)
    return data
  } catch (error) {
    console.error('Error fetching postponement requests:', error)
    throw new Error(pickAxiosMessage(error, 'Error fetching postponement requests'))
  }
}

export const generateDueJobs = async (): Promise<{ generated: number; message: string }> => {
  try {
    const { data } = await axios.post(`${PMS_API_URL}/jobs/generate-due-jobs`)
    return data
  } catch (error) {
    console.error('Error generating due jobs:', error)
    throw new Error(pickAxiosMessage(error, 'Error generating due jobs'))
  }
}

// ===============================
// JOB ATTACHMENTS
// ===============================

export const listJobAttachments = async (jobId: number): Promise<PmsJobAttachmentDto[]> => {
  try {
    const { data } = await axios.get(`${PMS_API_URL}/jobs/${jobId}/attachments`)
    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error('Error listing job attachments:', error)
    throw new Error(pickAxiosMessage(error, 'Error listing job attachments'))
  }
}

export const getJobAttachment = async (attachmentId: number): Promise<PmsJobAttachmentDto> => {
  try {
    const { data } = await axios.get(`${PMS_API_URL}/jobs/attachments/${attachmentId}`)
    return data
  } catch (error) {
    console.error('Error fetching job attachment:', error)
    throw new Error(pickAxiosMessage(error, 'Error fetching job attachment'))
  }
}

export const uploadJobAttachments = async (
  jobId: number,
  files: File[],
  fileType: PmsJobAttachmentFileType,
  uploadedBy?: string
): Promise<PmsJobAttachmentDto[]> => {
  try {
    const formData = new FormData()
    files.forEach((file) => formData.append('files', file))
    formData.append('fileType', fileType)
    if (uploadedBy) formData.append('uploadedBy', uploadedBy)
    const { data } = await axios.post(`${PMS_API_URL}/jobs/${jobId}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error('Error uploading job attachments:', error)
    throw new Error(pickAxiosMessage(error, 'Error uploading job attachments'))
  }
}

export const deleteJobAttachment = async (jobId: number, attachmentId: number): Promise<void> => {
  try {
    await axios.delete(`${PMS_API_URL}/jobs/${jobId}/attachments/${attachmentId}`)
  } catch (error) {
    console.error('Error deleting job attachment:', error)
    throw new Error(pickAxiosMessage(error, 'Error deleting job attachment'))
  }
}

export const jobAttachmentViewUrl = (attachment: PmsJobAttachmentDto): string => {
  const API_URL = process.env.REACT_APP_API_URL
  return `${API_URL}${attachment.filePath}`
}

export const jobAttachmentDownloadUrl = (attachment: PmsJobAttachmentDto): string => {
  return jobAttachmentViewUrl(attachment)
}

// ===============================
// JOB SPARE USAGES
// ===============================

export const listJobSpareUsages = async (jobId: number): Promise<PmsJobSpareUsageDto[]> => {
  try {
    const { data } = await axios.get(`${PMS_API_URL}/jobs/${jobId}/spare-usages`)
    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error('Error listing job spare usages:', error)
    throw new Error(pickAxiosMessage(error, 'Error listing job spare usages'))
  }
}

// ===============================
// REPORTS
// ===============================

export const getComplianceReport = async (
  vesselId?: number,
  fromDate?: string,
  toDate?: string
): Promise<ComplianceReportDto> => {
  try {
    const params: any = {}
    if (vesselId) params.vesselId = vesselId
    if (fromDate) params.fromDate = fromDate
    if (toDate) params.toDate = toDate
    const { data } = await axios.get(`${PMS_API_URL}/reports/compliance`, { params })
    return data
  } catch (error) {
    console.error('Error fetching compliance report:', error)
    throw new Error(pickAxiosMessage(error, 'Error fetching compliance report'))
  }
}

export const getJobHistoryReport = async (
  vesselId?: number,
  fromDate?: string,
  toDate?: string,
  state?: PmsJobState
): Promise<JobHistoryReportDto[]> => {
  try {
    const params: any = {}
    if (vesselId) params.vesselId = vesselId
    if (fromDate) params.fromDate = fromDate
    if (toDate) params.toDate = toDate
    if (state) params.state = state
    const { data } = await axios.get(`${PMS_API_URL}/reports/job-history`, { params })
    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error('Error fetching job history report:', error)
    throw new Error(pickAxiosMessage(error, 'Error fetching job history report'))
  }
}

export const getOverhaulHistoryReport = async (
  vesselId?: number,
  fromDate?: string,
  toDate?: string
): Promise<OverhaulHistoryReportDto[]> => {
  try {
    const params: any = {}
    if (vesselId) params.vesselId = vesselId
    if (fromDate) params.fromDate = fromDate
    if (toDate) params.toDate = toDate
    const { data } = await axios.get(`${PMS_API_URL}/reports/overhaul-history`, { params })
    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error('Error fetching overhaul history report:', error)
    throw new Error(pickAxiosMessage(error, 'Error fetching overhaul history report'))
  }
}

export const getSparesConsumptionReport = async (
  vesselId?: number,
  equipmentId?: number,
  componentId?: number,
  fromDate?: string,
  toDate?: string
): Promise<SparesConsumptionReportDto[]> => {
  try {
    const params: any = {}
    if (vesselId) params.vesselId = vesselId
    if (equipmentId) params.equipmentId = equipmentId
    if (componentId) params.componentId = componentId
    if (fromDate) params.fromDate = fromDate
    if (toDate) params.toDate = toDate
    const { data } = await axios.get(`${PMS_API_URL}/reports/spares-consumption`, { params })
    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error('Error fetching spares consumption report:', error)
    throw new Error(pickAxiosMessage(error, 'Error fetching spares consumption report'))
  }
}

export const getDefectsIntegrationReport = async (
  vesselId?: number,
  fromDate?: string,
  toDate?: string
): Promise<DefectsIntegrationReportDto> => {
  try {
    const params: any = {}
    if (vesselId) params.vesselId = vesselId
    if (fromDate) params.fromDate = fromDate
    if (toDate) params.toDate = toDate
    const { data } = await axios.get(`${PMS_API_URL}/reports/defects-integration`, { params })
    return data
  } catch (error) {
    console.error('Error fetching defects integration report:', error)
    throw new Error(pickAxiosMessage(error, 'Error fetching defects integration report'))
  }
}

// ===============================
// REPORT EXPORTS
// ===============================

export const exportComplianceReport = async (
  vesselId?: number,
  fromDate?: string,
  toDate?: string
): Promise<void> => {
  try {
    const params: any = {}
    if (vesselId) params.vesselId = vesselId
    if (fromDate) params.fromDate = fromDate
    if (toDate) params.toDate = toDate
    const response = await axios.get(`${PMS_API_URL}/reports/compliance/export`, {
      params,
      responseType: 'blob',
    })
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `compliance-report-${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Error exporting compliance report:', error)
    throw new Error(pickAxiosMessage(error, 'Error exporting compliance report'))
  }
}

export const exportJobHistoryReport = async (
  vesselId?: number,
  fromDate?: string,
  toDate?: string,
  state?: PmsJobState
): Promise<void> => {
  try {
    const params: any = {}
    if (vesselId) params.vesselId = vesselId
    if (fromDate) params.fromDate = fromDate
    if (toDate) params.toDate = toDate
    if (state) params.state = state
    const response = await axios.get(`${PMS_API_URL}/reports/job-history/export`, {
      params,
      responseType: 'blob',
    })
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `job-history-report-${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Error exporting job history report:', error)
    throw new Error(pickAxiosMessage(error, 'Error exporting job history report'))
  }
}

export const exportOverhaulHistoryReport = async (
  vesselId?: number,
  fromDate?: string,
  toDate?: string
): Promise<void> => {
  try {
    const params: any = {}
    if (vesselId) params.vesselId = vesselId
    if (fromDate) params.fromDate = fromDate
    if (toDate) params.toDate = toDate
    const response = await axios.get(`${PMS_API_URL}/reports/overhaul-history/export`, {
      params,
      responseType: 'blob',
    })
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `overhaul-history-report-${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Error exporting overhaul history report:', error)
    throw new Error(pickAxiosMessage(error, 'Error exporting overhaul history report'))
  }
}

export const exportSparesConsumptionReport = async (
  vesselId?: number,
  equipmentId?: number,
  componentId?: number,
  fromDate?: string,
  toDate?: string
): Promise<void> => {
  try {
    const params: any = {}
    if (vesselId) params.vesselId = vesselId
    if (equipmentId) params.equipmentId = equipmentId
    if (componentId) params.componentId = componentId
    if (fromDate) params.fromDate = fromDate
    if (toDate) params.toDate = toDate
    const response = await axios.get(`${PMS_API_URL}/reports/spares-consumption/export`, {
      params,
      responseType: 'blob',
    })
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `spares-consumption-report-${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Error exporting spares consumption report:', error)
    throw new Error(pickAxiosMessage(error, 'Error exporting spares consumption report'))
  }
}

export const exportDefectsIntegrationReport = async (
  vesselId?: number,
  fromDate?: string,
  toDate?: string
): Promise<void> => {
  try {
    const params: any = {}
    if (vesselId) params.vesselId = vesselId
    if (fromDate) params.fromDate = fromDate
    if (toDate) params.toDate = toDate
    const response = await axios.get(`${PMS_API_URL}/reports/defects-integration/export`, {
      params,
      responseType: 'blob',
    })
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `defects-integration-report-${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Error exporting defects integration report:', error)
    throw new Error(pickAxiosMessage(error, 'Error exporting defects integration report'))
  }
}

// ===============================
// RUNNING HOURS
// ===============================

export const getRunningHourCounters = async (vesselId?: number): Promise<RunningHourCounterDto[]> => {
  try {
    const params = vesselId ? { vesselId } : {}
    const { data } = await axios.get(`${PMS_API_URL}/running-hours/counters`, { params })
    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error('Error fetching running hour counters:', error)
    throw new Error(pickAxiosMessage(error, 'Error fetching running hour counters'))
  }
}

export const getRunningHourCounter = async (id: number): Promise<RunningHourCounterDto> => {
  try {
    const { data } = await axios.get(`${PMS_API_URL}/running-hours/counters/${id}`)
    return data
  } catch (error) {
    console.error('Error fetching running hour counter:', error)
    throw new Error(pickAxiosMessage(error, 'Error fetching running hour counter'))
  }
}

export const createRunningHourCounter = async (dto: RunningHourCounterDto): Promise<RunningHourCounterDto> => {
  try {
    const { data } = await axios.post(`${PMS_API_URL}/running-hours/counters`, dto)
    return data
  } catch (error) {
    console.error('Error creating running hour counter:', error)
    throw new Error(pickAxiosMessage(error, 'Error creating running hour counter'))
  }
}

export const updateRunningHourCounter = async (id: number, dto: Partial<RunningHourCounterDto>): Promise<RunningHourCounterDto> => {
  try {
    const { data } = await axios.put(`${PMS_API_URL}/running-hours/counters/${id}`, dto)
    return data
  } catch (error) {
    console.error('Error updating running hour counter:', error)
    throw new Error(pickAxiosMessage(error, 'Error updating running hour counter'))
  }
}

export const getRunningHourReadings = async (counterId: number): Promise<RunningHourReadingDto[]> => {
  try {
    const { data } = await axios.get(`${PMS_API_URL}/running-hours/counters/${counterId}/readings`)
    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error('Error fetching running hour readings:', error)
    throw new Error(pickAxiosMessage(error, 'Error fetching running hour readings'))
  }
}

export const createRunningHourReading = async (counterId: number, dto: RunningHourReadingDto): Promise<RunningHourReadingDto> => {
  try {
    const { data } = await axios.post(`${PMS_API_URL}/running-hours/counters/${counterId}/readings`, dto)
    return data
  } catch (error) {
    console.error('Error creating running hour reading:', error)
    throw new Error(pickAxiosMessage(error, 'Error creating running hour reading'))
  }
}
export const bulkUploadRunningHourReadings = async (file: File): Promise<any> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await axios.post(
      `${PMS_API_URL}/running-hours/readings/bulk-upload`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return data;
  } catch (error) {
    console.error('Error uploading running hour readings bulk file:', error);
    throw new Error(pickAxiosMessage(error, 'Error uploading running hour readings'));
  }
};