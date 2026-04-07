import axios from 'axios'

export interface TechnicalFormTemplate {
  id: number
  code: string
  title: string
  category?: string
  allowedFormats?: string[]
  version?: string
  status?: string
  description?: string
  companyId?: number
  companyAdminId?: number
  companyGroupAdminId?: number
  originalFileUrl?: string
  createdAt?: string
  updatedAt?: string
}

export interface TechnicalFormSubmission {
  id: number
  templateId: number
  templateVersion?: string
  crewId?: number
  vesselId?: number
  companyId?: number
  submittedByUserId?: number
  status?: string
  uploadedFormat?: string
  fileUrl?: string
  remarks?: string
  submissionData?: string
  createdAt?: string
  updatedAt?: string
}

const API_URL = process.env.REACT_APP_API_URL || '/api'

export const fetchTechnicalFormTemplates = async (
  params?: { companyId?: number }
): Promise<TechnicalFormTemplate[]> => {
  const { data } = await axios.get(`${API_URL}/technical/forms/templates`, { params })
  return data
}

export const createTechnicalFormTemplate = async (payload: {
  code: string
  title: string
  category?: string
  allowedFormats?: string[]
  version?: string
  status?: string
  description?: string
  file: File
  userId?: number
  companyId?: number
}): Promise<TechnicalFormTemplate> => {
  const formData = new FormData()
  formData.append('code', payload.code)
  formData.append('title', payload.title)
  if (payload.category) formData.append('category', payload.category)
  if (payload.allowedFormats?.length) formData.append('allowedFormats', payload.allowedFormats.join(','))
  if (payload.version) formData.append('version', payload.version)
  if (payload.status) formData.append('status', payload.status)
  if (payload.description) formData.append('description', payload.description)
  if (payload.userId) formData.append('userId', String(payload.userId))
  if (payload.companyId) formData.append('companyId', String(payload.companyId))
  formData.append('file', payload.file)

  const { data } = await axios.post(`${API_URL}/technical/forms/templates`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export const fetchTechnicalFormSubmissions = async (
  templateId: number,
  params?: { companyId?: number; crewId?: number; vesselId?: number; userId?: number }
): Promise<TechnicalFormSubmission[]> => {
  const { data } = await axios.get(`${API_URL}/technical/forms/${templateId}/submissions`, { params })
  return data
}

export const uploadTechnicalFormSubmission = async (
  templateId: number,
  payload: {
    file: File
    crewId?: number
    vesselId?: number
    companyId?: number
    remarks?: string
    userId?: number
  }
): Promise<TechnicalFormSubmission> => {
  const formData = new FormData()
  formData.append('file', payload.file)
  if (payload.crewId) formData.append('crewId', String(payload.crewId))
  if (payload.vesselId) formData.append('vesselId', String(payload.vesselId))
  if (payload.companyId) formData.append('companyId', String(payload.companyId))
  if (payload.userId) formData.append('userId', String(payload.userId))
  if (payload.remarks) formData.append('remarks', payload.remarks)

  const { data } = await axios.post(
    `${API_URL}/technical/forms/${templateId}/submissions`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    }
  )
  return data
}

export const deleteTechnicalFormSubmission = async (
  submissionId: number,
  payload?: { userId?: number }
): Promise<void> => {
  const params: any = {}
  if (payload?.userId) params.userId = payload.userId
  await axios.delete(`${API_URL}/technical/forms/submissions/${submissionId}`, { params })
}
