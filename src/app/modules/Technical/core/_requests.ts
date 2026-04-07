import axios, { AxiosRequestConfig } from 'axios';
import { Crew, CrewDocument, CrewCertification, Vessel } from "./_models";
import { Voyage } from '../../operations/core/_models';
import { Rank } from "./_models";
import { Company, CompanyAdmin, HistoryRecord  } from "./_models";
import { EquipmentDto, EquipmentComponentDto, SubcomponentDto, PartDto, VesselMachineryCountsDto } from './_models'

const API_URL = process.env.REACT_APP_API_URL
const CREW_API_URL = `${API_URL}/crew`;
const RANKS_API = `${API_URL}/ranks`;
const COMPANY_ADMIN_API_URL = `${API_URL}/company-group-admins`;
const GET_COMPANY_API_URL = `${API_URL}/users/company-admins`;
const VESSEL_API_URL = `${process.env.REACT_APP_API_URL}/vessels`; // Assuming this is the endpoint for vessels

export const getCrewList = async (): Promise<Crew[]> => {
  try {
    const response = await axios.get(CREW_API_URL + "/all");
    console.log("finalcrew:" , response.data)

    return response.data;

  } catch (error: any) {
    console.error('Error fetching crew list:', error);
    throw new Error(error.response?.data?.message || 'Error fetching Crew list');
  }
};

const formatLocalDate = (date: Date) => date.toISOString().split('T')[0]; // "YYYY-MM-DD"
const formatLocalDateTime = (date: Date) => date.toISOString().split('.')[0];

function fmtDateTime(dt: Date) {
  // "2025-07-06T18:30:00"
  return dt.toISOString().split('.')[0];
}

export const createCrew = async (
  name: string,
  dateOfBirth: Date,
  nationality: string,
  department: string,
  contactNumber: string,
  email: string,
  username: string,
  password: string,
  rankId: number,
  companyGroupAdminId: number,
  companyAdminId: number,
  // companyAdminId: number | null,
  // vesselId: number,
  // startDate: Date,
  // endDate: Date,
  certifications: { documentName: string; file: File | null }[],
  documents: { documentName: string; file: File | null }[]
): Promise<Crew[]> => {
  const formData = new FormData();

  // —––– Primitive fields map 1:1 to your CrewDto properties —–––
  formData.append('name', name);
  formData.append('username', username);
  formData.append('nationality', nationality);
  formData.append('department', department);
  formData.append('contactNumber', contactNumber);
  formData.append('email', email);
  formData.append('password', password);
  formData.append('rankId', rankId.toString());
  formData.append('companyGroupAdminId', companyGroupAdminId.toString());
  if (companyAdminId !== 0) {
    formData.append('companyAdminId', companyAdminId.toString());
  }
  // if (companyAdminId != null) {
  //     formData.append('companyAdminId', companyAdminId.toString());
  // }
  // formData.append('vessel.id', vesselId.toString());
  formData.append('dateOfBirth', formatLocalDate(dateOfBirth));
  // formData.append('startDate', formatLocalDateTime(startDate));
  // formData.append('endDate', formatLocalDateTime(endDate));
  formData.append('isActive', 'true');              // or dto.isActive

  // —––– Now append your two parallel lists in lock-step —–––
  certifications.forEach((cert, idx) => {
    formData.append('certificationNames', cert.documentName);
    if (cert.file) {
      formData.append('certificationFiles', cert.file);
    }
  });

  documents.forEach((doc, idx) => {
    formData.append('documentNames', doc.documentName);
    if (doc.file) {
      formData.append('documentFiles', doc.file);
    }
  });

  const response = await axios.post(`${CREW_API_URL}/create`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

export const updateCrew = async (
  crewId: number,
  crewDto: {
    name: string;
    dateOfBirth: string;           // "YYYY-MM-DD"
    nationality: string;
    department: string;
    contactNumber: string;
    email?: string;
    rankId: number;
    // vessel: { id: number };
    companyGroupAdminId: number;
    active: boolean;
    // startDate: Date;
    // endDate: Date;
    notes?: string;
  }
): Promise<Crew[]> => {
  try {
    const form = new FormData();
    form.append('name', crewDto.name);
    form.append('dateOfBirth', crewDto.dateOfBirth);
    form.append('nationality', crewDto.nationality);
    form.append('department', crewDto.department);
    form.append('contactNumber', crewDto.contactNumber);
    form.append('email', crewDto.email || '');
    form.append('rankId', crewDto.rankId.toString());
    // this is the one you were missing
    // form.append('vessel.id', String(crewDto.vessel.id));
    form.append('companyGroupAdminId', String(crewDto.companyGroupAdminId));
    form.append('active', String(crewDto.active));
    // form.append('startDate', fmtDateTime(crewDto.startDate));
    // form.append('endDate',   fmtDateTime(crewDto.endDate));
    form.append('notes', crewDto.notes || '');




    const response = await axios.put(
      `${CREW_API_URL}/update/${crewId}`,
      form
    );

    return response.data;
  } catch (error: any) {
    console.error('Error updating crew:', error);
    throw new Error(error.response?.data?.message || 'Error updating crew');
  }
};

// New API to update the active status of a crew member
export const updateCrewStatus = async (crewId: number, active: boolean): Promise<Crew> => {
  try {
    const response = await axios.put(`${CREW_API_URL}/status-update/${crewId}`, { active });
    return response.data;
  } catch (error: any) {
    console.error('Error updating crew status:', error);
    throw new Error(error.response?.data?.message || 'Error updating crew status');
  }
};

export const deleteVessel = async (crewId: number): Promise<Crew[]> => {
  try {
    const response = await axios.delete(CREW_API_URL + "/delete/" + crewId);

    return response.data;
  } catch (error: any) {
    console.error('Error deleting crew item:', error);
    throw new Error(error.response?.data?.message || 'Error deleting crew item');
  }
};




// —–––– Vessels APIs ––––

export const getVesselList = async (): Promise<Vessel[]> => {
  try {
    const response = await axios.get(VESSEL_API_URL, {
      headers: {
      },
    });

    return response.data;

  } catch (error: any) {
    console.error('Error fetching vessel list:', error);
    throw new Error(error.response?.data?.message || 'Error fetching vessel list');
  }
};

// —–––– Documents APIs ––––

export const getCrewDocuments = async (crewId: number): Promise<CrewDocument[]> => {
  const res = await axios.get(`${API_URL}/documents/${crewId}`);
  return (res.data as any[]).map(doc => ({
    id: doc.id,
    documentName: doc.documentName,
    // point at the new `/view` endpoint
    fileUrl: `${API_URL}/documents/${crewId}/${doc.id}/view`
  }));
};


export const uploadCrewDocument = async (
  crewId: number,
  documentName: string,
  file: File
): Promise<CrewDocument[]> => {
  const form = new FormData();
  form.append('documentNames', documentName);
  // <-- send under the key the backend is expecting:
  form.append('file', file);

  const res = await axios.post(
    `${API_URL}/documents/${crewId}`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return res.data;
};


export const deleteCrewDocument = async (
  crewId: number,
  docId: number
): Promise<void> => {
  await axios.delete(`${API_URL}/documents/${crewId}/${docId}`);
};

// —–––– Certifications APIs ––––

export const getCrewCertifications = async (
  crewId: number
): Promise<CrewCertification[]> => {
  const res = await axios.get(`${API_URL}/certifications/${crewId}`);
  return (res.data as any[]).map(cert => ({
    id: cert.id,
    documentName: cert.certificationName,
    // point at the new `/view` endpoint
    fileUrl: `${API_URL}/certifications/${crewId}/${cert.id}/view`
  }));
};


export const uploadCrewCertification = async (
  crewId: number,
  documentName: string,
  file: File
): Promise<CrewCertification[]> => {
  const form = new FormData();
  form.append('certificationNames', documentName);
  // <-- same here:
  form.append('file', file);

  const res = await axios.post(
    `${API_URL}/certifications/${crewId}`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return res.data;
};


export const deleteCrewCertification = async (
  crewId: number,
  certId: number
): Promise<void> => {
  await axios.delete(`${API_URL}/certifications/${crewId}/${certId}`);
};


/**
 * Fetch all ranks so we can look up rankName by rankId.
 */
export const getRanks = async (): Promise<Rank[]> => {
  const res = await axios.get<Rank[]>(RANKS_API);
  return res.data;
};

/**
 * (optional) Fetch a single rank by id.
 */
export const getRankById = async (id: number): Promise<Rank> => {
  const res = await axios.get<Rank>(`${RANKS_API}/${id}`);
  return res.data;
};

export interface SignOnRequest {
  vesselId: number;
  crewId: number;
  signOnDate: string;  // "YYYY-MM-DD"
  portSignOn: string;
}

export interface SignOnResponse {
  id: number;
  vesselId: number;
  vesselName: string;
  crewId: number;
  crewName: string;
  rank: number;
  signOnDate: string;
  signOffDate: string | null;
  signOffReason: string | null;
  portSignOn: string;
  portSignOff: string | null;
  travelArrangements: string | null;
  status: string; // "SIGNED_ON" etc
}

/**
 * Sign a crew on to a vessel.
 */
export const signOnCrew = async (
  payload: SignOnRequest
): Promise<SignOnResponse> => {
  console.log("payload: ", payload)
  const res = await axios.post<SignOnResponse>(
    `${API_URL}/sign/on`,
    payload
  );
  return res.data;
};

// at the bottom of core/_requests.ts

export interface SignOnOffRecord {
  id: number;
  vesselId: number;
  vesselName: string;
  crewId: number;
  crewName: string;
  rank: number;       // this is the rankId
  signOnDate: string;       // "YYYY-MM-DD"
  signOffDate: string | null;
  signOffReason: string | null;
  portSignOn: string;
  portSignOff: string | null;
  travelArrangements: string | null;
  status: 'SIGNED_ON' | 'SIGNED_OFF' | string;
}

/**
 * Fetch all sign-on / sign-off records.
 */
export const getSignOnOffRecords = async (): Promise<SignOnOffRecord[]> => {
  const res = await axios.get<SignOnOffRecord[]>(
    `${API_URL}/sign/on-off-records/all`
  );
  console.log("Signonof recs: ", res.data)
  return res.data;
};

// at bottom of core/_requests.ts

export interface SignOffRequest {
  recordId: number;
  signOffDate: string; // "YYYY-MM-DD"
  signOffReason: string;
  portSignOff: string;
}

export interface SignOffResponse extends SignOnOffRecord { }

export const signOffCrew = async (
  payload: SignOffRequest
): Promise<SignOffResponse> => {
  const res = await axios.post<SignOffResponse>(
    `${API_URL}/sign/off`,
    payload
  );
  return res.data;
};



export const getCompanyList = async (): Promise<Company[]> => {
  try {
    const response = await axios.get(GET_COMPANY_API_URL);

    return response.data;

  } catch (error: any) {
    console.error('Error fetching company list:', error);
    throw new Error(error.response?.data?.message || 'Error fetching company list');
  }
};

export const getCompanyAdminList = async (): Promise<CompanyAdmin[]> => {
  try {
    const response = await axios.get(COMPANY_ADMIN_API_URL);

    return response.data; // Return company data

  } catch (error: any) {
    console.error('Error fetching company admin list:', error);
    throw new Error(error.response?.data?.message || 'Error fetching company admin list');
  }
};

// at the bottom, after signOffCrew...
export interface UpdateAssignmentPayload {
  signOnDate?: string;
  portSignOn: string;
  signOffDate?: string;
}

/**
 * Update a sign-on/off record (only PLANNED or SIGNED_ON allowed).
 */
export const updateAssignment = async (
  recordId: number,
  payload: UpdateAssignmentPayload
): Promise<SignOnOffRecord> => {
  const res = await axios.put<SignOnOffRecord>(
    `${API_URL}/sign/update/${recordId}`,
    payload
  );
  return res.data;
};

/**
 * Fetch change‑history for one sign‑on/off record.
 */
export const getHistory = async (recordId: number): Promise<HistoryRecord[]> => {
  const res = await axios.get<HistoryRecord | HistoryRecord[]>(
    `${API_URL}/sign-on-records/${recordId}/history`
  )
  const data = res.data
  // normalize to array
  return Array.isArray(data) ? data : [data]
}

// ——— Equipment APIs ——————————————————————————————————————————————————————————


const EQUIPMENT_URL = `${API_URL}/equipment`
const EQUIPMENT_COMPONENTS_URL = `${API_URL}/equipment-components`
const SUBCOMPONENTS_URL = `${API_URL}/subcomponents`
const PARTS_URL = `${API_URL}/parts`

export const getEquipmentList = async (vesselId?: number, q?: string): Promise<EquipmentDto[]> => {
  try {
    const params: any = {}
    if (vesselId) params.vesselId = vesselId
    if (q) params.q = q
    const response = await axios.get<EquipmentDto[]>(EQUIPMENT_URL, { params })
    return response.data
  } catch (error: any) {
    console.error('Error fetching equipment list:', error)
    throw new Error(error.response?.data?.message || 'Error fetching equipment list')
  }
}

export const getVesselMachineryCounts = async (vesselId?: number): Promise<VesselMachineryCountsDto[]> => {
  try {
    const params: any = {}
    if (vesselId) params.vesselId = vesselId
    const response = await axios.get<VesselMachineryCountsDto[]>(`${EQUIPMENT_URL}/vessel-counts`, { params })
    return response.data
  } catch (error: any) {
    console.error('Error fetching vessel machinery counts:', error)
    throw new Error(error.response?.data?.message || 'Error fetching vessel machinery counts')
  }
}

export const getEquipmentById = async (id: number): Promise<EquipmentDto> => {
  try {
    const response = await axios.get<EquipmentDto>(`${EQUIPMENT_URL}/${id}`)
    return response.data
  } catch (error: any) {
    console.error('Error fetching equipment:', error)
    throw new Error(error.response?.data?.message || 'Error fetching equipment')
  }
}

export const getEquipmentByVessel = async (vesselId: number): Promise<EquipmentDto[]> => {
  try {
    const response = await axios.get<EquipmentDto[]>(`${EQUIPMENT_URL}/by-vessel/${vesselId}`)
    return response.data
  } catch (error: any) {
    console.error('Error fetching equipment by vessel:', error)
    throw new Error(error.response?.data?.message || 'Error fetching equipment by vessel')
  }
}

export const createEquipment = async (dto: EquipmentDto): Promise<EquipmentDto> => {
  try {
    const response = await axios.post<EquipmentDto>(EQUIPMENT_URL, dto)
    return response.data
  } catch (error: any) {
    console.error('Error creating equipment:', error)
    throw new Error(error.response?.data?.message || 'Error creating equipment')
  }
}

export const updateEquipment = async (id: number, dto: EquipmentDto): Promise<EquipmentDto> => {
  try {
    const response = await axios.put<EquipmentDto>(`${EQUIPMENT_URL}/${id}`, dto)
    return response.data
  } catch (error: any) {
    console.error('Error updating equipment:', error)
    throw new Error(error.response?.data?.message || 'Error updating equipment')
  }
}

export const deleteEquipment = async (id: number): Promise<void> => {
  try {
    await axios.delete(`${EQUIPMENT_URL}/${id}`)
  } catch (error: any) {
    console.error('Error deleting equipment:', error)
    throw new Error(error.response?.data?.message || 'Error deleting equipment')
  }
}

// ——— Equipment Component APIs —————————————————————————————————————————————————————————

export const getEquipmentComponents = async (q?: string): Promise<EquipmentComponentDto[]> => {
  try {
    const params = q ? { q } : {}
    const response = await axios.get<EquipmentComponentDto[]>(EQUIPMENT_COMPONENTS_URL, { params })
    return response.data
  } catch (error: any) {
    console.error('Error fetching equipment components:', error)
    throw new Error(error.response?.data?.message || 'Error fetching equipment components')
  }
}

export const getEquipmentComponentsByEquipment = async (equipmentId: number): Promise<EquipmentComponentDto[]> => {
  try {
    const response = await axios.get<EquipmentComponentDto[]>(`${EQUIPMENT_COMPONENTS_URL}/by-equipment/${equipmentId}`)
    return response.data
  } catch (error: any) {
    console.error('Error fetching equipment components by equipment:', error)
    throw new Error(error.response?.data?.message || 'Error fetching equipment components by equipment')
  }
}

export const createEquipmentComponent = async (dto: EquipmentComponentDto): Promise<EquipmentComponentDto> => {
  try {
    const response = await axios.post<EquipmentComponentDto>(EQUIPMENT_COMPONENTS_URL, dto)
    return response.data
  } catch (error: any) {
    console.error('Error creating equipment component:', error)
    throw new Error(error.response?.data?.message || 'Error creating equipment component')
  }
}

export const updateEquipmentComponent = async (id: number, dto: EquipmentComponentDto): Promise<EquipmentComponentDto> => {
  try {
    const response = await axios.put<EquipmentComponentDto>(`${EQUIPMENT_COMPONENTS_URL}/${id}`, dto)
    return response.data
  } catch (error: any) {
    console.error('Error updating equipment component:', error)
    throw new Error(error.response?.data?.message || 'Error updating equipment component')
  }
}

export const deleteEquipmentComponent = async (id: number): Promise<void> => {
  try {
    await axios.delete(`${EQUIPMENT_COMPONENTS_URL}/${id}`)
  } catch (error: any) {
    console.error('Error deleting equipment component:', error)
    throw new Error(error.response?.data?.message || 'Error deleting equipment component')
  }
}

// ——— Subcomponent APIs (for Machinery hierarchy) —————————————————————————————————————————

export const getSubcomponentsByComponent = async (componentId: number): Promise<SubcomponentDto[]> => {
  try {
    const response = await axios.get<SubcomponentDto[]>(SUBCOMPONENTS_URL, {
      params: { equipmentComponentId: componentId }
    })
    return Array.isArray(response.data) ? response.data : []
  } catch (error: any) {
    console.error('Error fetching subcomponents by component:', error)
    return []
  }
}

export const createSubcomponent = async (dto: SubcomponentDto): Promise<SubcomponentDto> => {
  try {
    const response = await axios.post<SubcomponentDto>(SUBCOMPONENTS_URL, dto)
    return response.data
  } catch (error: any) {
    console.error('Error creating subcomponent:', error)
    throw new Error(error.response?.data?.message || 'Error creating subcomponent')
  }
}

export const updateSubcomponent = async (id: number, dto: SubcomponentDto): Promise<SubcomponentDto> => {
  try {
    const response = await axios.put<SubcomponentDto>(`${SUBCOMPONENTS_URL}/${id}`, dto)
    return response.data
  } catch (error: any) {
    console.error('Error updating subcomponent:', error)
    throw new Error(error.response?.data?.message || 'Error updating subcomponent')
  }
}

export const deleteSubcomponent = async (id: number): Promise<void> => {
  try {
    await axios.delete(`${SUBCOMPONENTS_URL}/${id}`)
  } catch (error: any) {
    console.error('Error deleting subcomponent:', error)
    throw new Error(error.response?.data?.message || 'Error deleting subcomponent')
  }
}

// ——— Parts by Subcomponent (reusing Inventory API) —————————————————————————

export const getPartsBySubcomponent = async (subcomponentId: number): Promise<PartDto[]> => {
  try {
    const res = await axios.get<PartDto[]>(`${PARTS_URL}/by-subcomponent/${subcomponentId}`)
    return Array.isArray(res.data) ? res.data : []
  } catch (error: any) {
    console.error('Error fetching parts by subcomponent:', error)
    return []
  }
}

export const getPartsByVessel = async (vesselId: number): Promise<PartDto[]> => {
  try {
    const res = await axios.get<PartDto[]>(`${PARTS_URL}`, {
      params: { vesselId }
    })
    return Array.isArray(res.data) ? res.data : []
  } catch (error: any) {
    console.error('Error fetching parts by vessel:', error)
    return []
  }
}

export const createPartForSubcomponent = async (payload: { subcomponentId: number; name: string; code?: string }): Promise<PartDto> => {
  try {
    const dto = {
      name: payload.name,
      code: payload.code,
      subcomponent: { id: payload.subcomponentId },
    }
    const res = await axios.post<PartDto>(PARTS_URL, dto)
    return res.data
  } catch (error: any) {
    console.error('Error creating part:', error)
    throw new Error(error.response?.data?.message || 'Error creating part')
  }
}

export const updatePart = async (id: number, dto: PartDto): Promise<PartDto> => {
  try {
    const response = await axios.put<PartDto>(`${PARTS_URL}/${id}`, dto)
    return response.data
  } catch (error: any) {
    console.error('Error updating part:', error)
    throw new Error(error.response?.data?.message || 'Error updating part')
  }
}

export const deletePart = async (id: number): Promise<void> => {
  try {
    await axios.delete(`${PARTS_URL}/${id}`)
  } catch (error: any) {
    console.error('Error deleting part:', error)
    throw new Error(error.response?.data?.message || 'Error deleting part')
  }
}

// ——— Machinery Upload APIs ——————————————————————————————————————————————————————————

const MACHINERY_UPLOAD_URL = `${API_URL}/machinery/upload`

export interface BulkUploadResult {
  totalRows: number
  successCount: number
  errorCount: number
  errors: BulkUploadError[]
}

export interface BulkUploadError {
  rowNumber: number
  message: string
  counterName?: string
  readingDate?: string
  value?: string
}

export const uploadMachinery = async (file: File, vesselId: number): Promise<BulkUploadResult> => {
  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('vesselId', vesselId.toString())
    
    const response = await axios.post<BulkUploadResult>(MACHINERY_UPLOAD_URL, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  } catch (error: any) {
    console.error('Error uploading machinery:', error)
    throw new Error(error.response?.data?.message || 'Error uploading machinery')
  }
}

export const downloadMachineryTemplate = async (): Promise<Blob> => {
  try {
    const response = await axios.get(`${MACHINERY_UPLOAD_URL}/template`, {
      responseType: 'blob',
    })
    return response.data
  } catch (error: any) {
    console.error('Error downloading template:', error)
    throw new Error(error.response?.data?.message || 'Error downloading template')
  }
}

export interface MachineryUploadPreview {
  totalRows: number
  validRows: number
  errorRows: number
  rows: PreviewRow[]
  errors: BulkUploadError[]
  hasMissingParts?: boolean
  missingPartsBranches?: MissingPartsBranch[]
}

export interface PreviewRow {
  rowNumber: number
  action: 'CREATE' | 'UPDATE'
  entityType: 'EQUIPMENT' | 'COMPONENT' | 'SUBCOMPONENT' | 'PART' | 
              'COMPONENT_INSTANCE' | 'SUBCOMPONENT_INSTANCE' | 
              'COMPONENT_PM_TEMPLATE' | 'SUBCOMPONENT_PM_TEMPLATE' | 'MULTIPLICITY_INSTANCE'
  entityName: string
  entityCode?: string | null
  parentEntity?: string | null
  status: 'NEW' | 'EXISTS' | 'ERROR'
  message: string
}

export interface MissingPartsBranch {
  equipmentCode?: string | null
  equipmentName?: string | null
  componentCode?: string | null
  componentName?: string | null
  subComponentCode?: string | null
  subComponentName?: string | null
  instanceNumber?: number | null
  missingParts?: MissingPartInfo[]
}

export interface MissingPartInfo {
  itemShortDescription?: string | null
  itemLongDescription?: string | null
  drawNo?: string | null
  drawingPositionNo?: string | null
  maker?: string | null
  partLocation?: string | null
}

export const previewMachineryUpload = async (file: File, vesselId: number): Promise<MachineryUploadPreview> => {
  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('vesselId', vesselId.toString())
    
    const response = await axios.post<MachineryUploadPreview>(`${MACHINERY_UPLOAD_URL}/preview`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  } catch (error: any) {
    console.error('Error previewing machinery upload:', error)
    throw new Error(error.response?.data?.message || 'Error previewing machinery upload')
  }
}


// ——— Vessel Location APIs ————————————————————————————————————————————————————

const VESSEL_LOCATION_URL = `${API_URL}/vessel-locations`

export interface VesselLocationDto {
  id?: number
  vesselId: number
  code: string
  description?: string
  comments?: string
}

export const getVesselLocations = async (vesselId: number): Promise<VesselLocationDto[]> => {
  try {
    const response = await axios.get<VesselLocationDto[]>(`${VESSEL_LOCATION_URL}/by-vessel/${vesselId}`)
    return response.data
  } catch (error: any) {
    console.error('Error fetching vessel locations:', error)
    throw new Error(error.response?.data?.message || 'Error fetching vessel locations')
  }
}

export const getVesselLocationById = async (id: number): Promise<VesselLocationDto> => {
  try {
    const response = await axios.get<VesselLocationDto>(`${VESSEL_LOCATION_URL}/${id}`)
    return response.data
  } catch (error: any) {
    console.error('Error fetching vessel location:', error)
    throw new Error(error.response?.data?.message || 'Error fetching vessel location')
  }
}

export const createVesselLocation = async (dto: VesselLocationDto): Promise<VesselLocationDto> => {
  try {
    const response = await axios.post<VesselLocationDto>(VESSEL_LOCATION_URL, dto)
    return response.data
  } catch (error: any) {
    console.error('Error creating vessel location:', error)
    throw new Error(error.response?.data?.message || 'Error creating vessel location')
  }
}

export const updateVesselLocation = async (id: number, dto: VesselLocationDto): Promise<VesselLocationDto> => {
  try {
    const response = await axios.put<VesselLocationDto>(`${VESSEL_LOCATION_URL}/${id}`, dto)
    return response.data
  } catch (error: any) {
    console.error('Error updating vessel location:', error)
    throw new Error(error.response?.data?.message || 'Error updating vessel location')
  }
}

export const deleteVesselLocation = async (id: number): Promise<void> => {
  try {
    await axios.delete(`${VESSEL_LOCATION_URL}/${id}`)
  } catch (error: any) {
    console.error('Error deleting vessel location:', error)
    throw new Error(error.response?.data?.message || 'Error deleting vessel location')
  }
}

