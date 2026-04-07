import axios, { AxiosRequestConfig } from 'axios';
import { Crew, CrewDocument, CrewCertification, Vessel } from "./_models";
import { Voyage } from '../../operations/core/_models';
import { Rank } from "./_models";
import { Company, CompanyAdmin, HistoryRecord  } from "./_models";


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

export const getDropdownCrewList = async (): Promise<Crew[]> => {
  try {
    const response = await axios.get(CREW_API_URL + "/all/drop-down");
    console.log("dropdown finalcrew:" , response.data)

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
  documents: { documentName: string; file: File | null }[],
  notes?: string
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
  formData.append('notes', notes || '');
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
  const res = await axios.get<Rank[]>(RANKS_API + "/drop-down");
  return res.data;
};

export const getRanksforList = async (): Promise<Rank[]> => {
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

