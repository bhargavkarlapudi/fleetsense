//_requests.ts

import axios, { AxiosRequestConfig } from 'axios';
import { Crew, CrewDocument, CrewDocumentRequest, CrewDocumentResponse, CrewCertification, Vessel, AcademicQualificationRequest, AcademicQualificationResponse
 , WatchkeepingCertificateRequest, WatchkeepingCertificateResponse ,
 NextOfKinRequest, NextOfKinResponse,
 CourseCertificate, CourseCertificateResponse,
  SeaServiceRequest, SeaServiceResponse,
  AdditionalDetailsResponse, AdditionalDetailsRequest,
  CrewUnit,ApprovalStatus ,
 } from "./_models";
import { Voyage } from '../../operations/core/_models';
import { Rank } from "./_models";
import { Company, CompanyAdmin, HistoryRecord } from "./_models";
import {CrewFlagDocument, FlagCountry, FlagDocType} from './_models'
import { RollingExceptionResponse, RollingMatrixResponse } from './_models'

const API_URL = process.env.REACT_APP_API_URL 
const CREW_API_URL = `${API_URL}/crew`;
const SIGNEDON_CREW_API_URL = `${API_URL}/sign/active`;
const RANKS_API = `${API_URL}/ranks`;
const COMPANY_ADMIN_API_URL = `${API_URL}/company-group-admins`;
const GET_COMPANY_API_URL = `${API_URL}/users/company-admins`;
const VESSEL_API_URL = `${process.env.REACT_APP_API_URL}/vessels`; // Assuming this is the endpoint for vessels
const REST_HOURS_API_URL = `${process.env.REACT_APP_API_URL}/rest-hours`;
const REST_SUMMARY_RANGE_API = `${process.env.REACT_APP_API_URL}/rest-hours/summaries/range`;

export const getCrewList = async (): Promise<Crew[]> => {
  try {
    const response = await axios.get(CREW_API_URL + "/all");
    console.log("finalcrew:", response.data)

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

export const getCrewUnit = async (crewId: number): Promise<CrewUnit> => {
  try {
    const response = await axios.get(`${API_URL}/crew/${crewId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching crew unit:', error);
    throw new Error('Failed to fetch crew unit');
  }
};

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
  companyAdminId: number | null,
  certifications: { documentName: string; file: File | null }[],
  documents: { documentName: string; file: File | null }[],
presentRankId: number,
  rankAppliedForId: number | null,
  telNo: string,
  familyName: string,
  alternateMobNo: string,
  skypeId: string,
  maritalStatus: string,
  bloodGroup: string,
  heightCms: number,
  weightKgs: number,
  bmiIndex: number,
  willingToAcceptLowerRank: boolean,
  boilerSuitSize: string,
  shoeSize: string,
  address: string,
  placeOfBirth: string,
  dateOfAvailability: Date,
  notes?: string, // Add missing field
  // isApproved?: boolean // Add missing field
): Promise<Crew> => {

  rankId = rankAppliedForId ?? rankId; // if rankAppliedForId is given, use it as initial rankId
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
  formData.append('presentRankId', presentRankId.toString());
  formData.append('dateOfBirth', formatLocalDate(dateOfBirth));
  formData.append('familyName', familyName);
  formData.append('placeOfBirth', placeOfBirth);
  formData.append('dateOfAvailability', formatLocalDate(dateOfAvailability));
  formData.append('maritalStatus', maritalStatus);
  formData.append('bloodGroup', bloodGroup);
  formData.append('heightCms', heightCms.toString());
  formData.append('weightKgs', weightKgs.toString());
  formData.append('bmiIndex', bmiIndex.toString());
  formData.append('willingToAcceptLowerRank', String(willingToAcceptLowerRank));
  formData.append('address', address);
  formData.append('isActive', 'true'); // Default for creation

  // Optional fields
  if (companyAdminId != null) {
    formData.append('companyAdminId', companyAdminId.toString());
  }
  if (rankAppliedForId != null) {
    formData.append('rankAppliedForId', rankAppliedForId.toString());
  }
  if (telNo) formData.append('telNo', telNo);
  if (alternateMobNo) formData.append('alternateMobNo', alternateMobNo);
  if (skypeId) formData.append('skypeId', skypeId);
  if (boilerSuitSize) formData.append('boilerSuitSize', boilerSuitSize);
  if (shoeSize) formData.append('shoeSize', shoeSize);
  if (notes) formData.append('notes', notes);
  // if (isApproved != null) formData.append('isApproved', String(isApproved));

  // Certifications and Documents
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

  try {
    const response = await axios.post(`${CREW_API_URL}/create`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    const data = response.data;
    if (data?.id) return data as Crew;
    throw new Error('Create Crew API did not return a valid Crew object');
  } catch (error: any) {
    console.error('Error creating crew:', error);
    throw new Error(error.response?.data?.message || 'Failed to create crew');
  }
};

export const updateCrew = async (
  crewId: number,
  crewDto: {
    name: string;
    dateOfBirth: string;
    nationality: string;
    department: string;
    contactNumber: string;
    email: string;
    rankId: number;
    presentRankId?: number;
    rankAppliedForId?: number;
    companyGroupAdminId: number;
    companyAdminId?: number | null;
    active: boolean;
    notes?: string;
    familyName?: string;
    placeOfBirth?: string;
    gender?: string;
    telNo?: string;
    alternateMobNo?: string;
    skypeId?: string;
    dateOfAvailability?: string;
    maritalStatus?: string;
    bloodGroup?: string;
    heightCms?: number;
    weightKgs?: number;
    bmiIndex?: number;
    willingToAcceptLowerRank?: boolean;
    boilerSuitSize?: string;
    shoeSize?: string;
    address?: string;
    // isApproved?: boolean;
  }
): Promise<Crew> => {
  try {
    crewDto.rankId = crewDto.rankAppliedForId ?? crewDto.rankId; // if rankAppliedForId is given, use it as initial rankId
    const form = new FormData();
    form.append('name', crewDto.name);
    form.append('dateOfBirth', crewDto.dateOfBirth);
    form.append('nationality', crewDto.nationality);
    form.append('department', crewDto.department);
    form.append('contactNumber', crewDto.contactNumber);
    form.append('email', crewDto.email);
    form.append('rankId', crewDto.rankId.toString());
    form.append('companyGroupAdminId', crewDto.companyGroupAdminId.toString());
    form.append('active', String(crewDto.active));

    // Optional fields
    if (crewDto.presentRankId != null) {
      form.append('presentRankId', crewDto.presentRankId.toString());
    }
    if (crewDto.rankAppliedForId != null) {
      form.append('rankAppliedForId', crewDto.rankAppliedForId.toString());
    }
    if (crewDto.companyAdminId != null) {
      form.append('companyAdminId', crewDto.companyAdminId.toString());
    }
    if (crewDto.notes) form.append('notes', crewDto.notes);
    if (crewDto.familyName) form.append('familyName', crewDto.familyName);
    if (crewDto.placeOfBirth) form.append('placeOfBirth', crewDto.placeOfBirth);
    if (crewDto.gender) form.append('gender', crewDto.gender);
    if (crewDto.telNo) form.append('telNo', crewDto.telNo);
    if (crewDto.alternateMobNo) form.append('alternateMobNo', crewDto.alternateMobNo);
    if (crewDto.skypeId) form.append('skypeId', crewDto.skypeId);
    if (crewDto.dateOfAvailability) form.append('dateOfAvailability', crewDto.dateOfAvailability);
    if (crewDto.maritalStatus) form.append('maritalStatus', crewDto.maritalStatus);
    if (crewDto.bloodGroup) form.append('bloodGroup', crewDto.bloodGroup);
    if (crewDto.heightCms != null) form.append('heightCms', crewDto.heightCms.toString());
    if (crewDto.weightKgs != null) form.append('weightKgs', crewDto.weightKgs.toString());
    if (crewDto.bmiIndex != null) form.append('bmiIndex', crewDto.bmiIndex.toString());
    if (crewDto.willingToAcceptLowerRank != null) {
      form.append('willingToAcceptLowerRank', String(crewDto.willingToAcceptLowerRank));
    }
    if (crewDto.boilerSuitSize) form.append('boilerSuitSize', crewDto.boilerSuitSize);
    if (crewDto.shoeSize) form.append('shoeSize', crewDto.shoeSize);
    if (crewDto.address) form.append('address', crewDto.address);
    // if (crewDto.isApproved != null) form.append('isApproved', String(crewDto.isApproved));

    const response = await axios.put(
      `${CREW_API_URL}/update/${crewId}`,
      form,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data as Crew;
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

export const updateCrewApprovalStatus = async (
  crewId: number,
  status: ApprovalStatus
): Promise<Crew> => {
  const res = await axios.put(`${CREW_API_URL}/${crewId}/approval`, null, {
    params: { status }, // sends ?status=PENDING|APPROVED|REJECTED
  });
  return res.data as Crew;
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



// —–––– Add Crew Documents APIs ––––
export const getDocumentsFormData = (crewId: number): Promise<CrewDocumentResponse> => {
  return axios
    .get(`${CREW_API_URL}/${crewId}/documents`)
    .then((response) => response.data);
};

// —–––– Documents APIs ––––

// list documents with slot
export const getCrewDocuments = async (crewId: number): Promise<CrewDocument[]> => {
  const res = await axios.get(`${API_URL}/documents/${crewId}`);
  return (res.data as any[]).map(doc => ({
    id: doc.id,
    slot: doc.slot,                           // ← include
    documentName: doc.documentName ?? doc.fileName ?? doc.slot,
    filePath: doc.filePath ?? null,
    uploadedAt: doc.uploadedAt,
  }));
};

// Fetch a single document as a Blob (authorized)
export const fetchCrewDocumentBlob = async (
  crewId: number,
  docId: number
): Promise<Blob> => {
  const res = await axios.get(`${API_URL}/documents/${crewId}/${docId}/view`, {
    responseType: 'blob',
  });
  return res.data as Blob;
};

// upload bound to a slot (upsert on server)
export const uploadCrewDocument = async (
  crewId: number,
  slot: string,
  file: File
): Promise<CrewDocument> => {
  const form = new FormData();
  form.append('file', file);
  form.append('slot', slot);                  // ← important

  const res = await axios.post(`${API_URL}/documents/${crewId}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return {
    id: res.data.id,
    slot: res.data.slot,
    documentName: res.data.documentName ?? res.data.fileName ?? res.data.slot,
    filePath: res.data.filePath,
    uploadedAt: res.data.uploadedAt,
  };
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
  contractStartDate: string;  // "YYYY-MM-DD"
  contractEndDate: string;    // "YYYY-MM-DD"
  relieverId?: string;        // Optional reliever ID
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
  contractStartDate?: string | null;  // "YYYY-MM-DD"
  contractEndDate?: string | null;    // "YYYY-MM-DD"
  relieverName?: string | null;       // Name of the selected reliever
  relieverRank?: number | null;       // Rank ID of the selected reliever
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

// Rest hours

// --- KEEP/REUSE your existing auth header helper if you have one ---
const jsonHeaders = {'Content-Type': 'application/json'};

// narrow string type for safety
export type Regulation = 'stcw' | 'mlc';

export interface RestHourViolation {
  description?: string
  ruleCode?: string
  standard?: string
}

export interface RestHourDailySummary {
  crewId: number
  vesselId: number
  summaryDate: string
  totalWorkHours: number
  totalRestHours: number
  compliant?: boolean
  isCompliant?: boolean
  violationCount?: number
  violations?: RestHourViolation[]
  exceptions?: { description?: string }[]
  remarks?: string | null
}

export interface RestHourEntry {
  slotIndex: number
}

// entriesByDate = { "2025-09-01": [{slotIndex: 0}, {slotIndex: 1}], "2025-09-02": [...] }
//

export async function saveRestHourEntries(
  crewId: number,
  vesselId: number,
  entriesByDate: Record<string, { slotIndex: number }[]>,
  // remarksByDate?: Record<string, string | null>   
): Promise<void> {
  try {
    for (const [entryDate, slots] of Object.entries(entriesByDate)) {
      // const commonRemarks = remarksByDate?.[entryDate] ?? null;

      const body = slots.map((s) => ({
        crewId,
        vesselId,
        entryDate,
        slotIndex: s.slotIndex,
        // keep the same field names your backend expects
        working: true,
        isApproved: false,
        // remarks: commonRemarks,
        createdBy: null,
      }));

      await axios.post(
        `${REST_HOURS_API_URL}/entries/bulk`,
        body,
        { params: { crewId, vesselId, entryDate } }
      );
    }
  } catch (error: any) {
    console.error('❌ Error saving rest hours:', error);
    throw new Error(error.response?.data?.message || 'Error saving rest hours');
  }
}

// Mark slots back to REST (uncheck)
export async function deleteWorkingSlots(
  crewId: number,
  vesselId: number,
  entryDate: string,     // 'YYYY-MM-DD'
  slotIndices: number[], // [0..47]
  recomputeForward = true
): Promise<any> {
  try {
    const { data } = await axios.put(
      `${REST_HOURS_API_URL}/entries/day/delete-slots`,
      { crewId, vesselId, entryDate, slotIndices, recomputeForward }
    );
    return data; // DayRecomputeResponse (if your API returns one)
  } catch (error: any) {
    console.error('❌ Delete-slots failed:', error);
    throw new Error(error.response?.data?.message || `Delete-slots failed for ${entryDate}`);
  }
}

export async function getDailySummary(
  crewId: number,
  vesselId: number,
  date: string
): Promise<RestHourDailySummary> {
  try {
    const { data } = await axios.get(
      `${REST_HOURS_API_URL}/summaries`,
      { params: { crewId, vesselId, date } }
    )
    return data
  } catch (error: any) {
    console.error('❌ Error fetching daily summary:', error)
    throw new Error(error.response?.data?.message || 'Failed fetching daily summary')
  }
}

export async function getRollingExceptionsCompany(
  crewId: number,
  vesselId: number,
  asOf?: string
): Promise<RollingExceptionResponse> {
  try {
    const { data } = await axios.get(
      `${REST_HOURS_API_URL}/entries/rolling-exceptions/company`,
      { params: { crewId, vesselId, asOf: asOf || undefined } }
    )
    return data
  } catch (error: any) {
    console.error('❌ Error fetching rolling exceptions:', error)
    throw new Error(error.response?.data?.message || 'Failed fetching rolling exceptions')
  }
}

export async function getRollingMatrixSummaries(
  start: string,
  end: string,
  crewId?: number | null,
  vesselId?: number | null,
  regulation: Regulation = 'stcw'
): Promise<any[]> {
  try {
    const { data } = await axios.get<RollingMatrixResponse>(
      `${REST_HOURS_API_URL}/summaries/rolling-range`,
      {
        params: {
          start,
          end,
          crewId: crewId ?? undefined,
          vesselId: vesselId ?? undefined,
          regulation,
        },
      }
    )
    return data?.summaries ?? []
  } catch (error: any) {
    console.error('❌ Error fetching rolling matrix summaries:', error)
    throw new Error(error.response?.data?.message || 'Failed fetching rolling matrix summaries')
  }
}

// Now returns array of summaries (same shape you used before)
export async function getRestHoursSummary(
  start: string,
  end: string,
  crewId?: number | null,
  vesselId?: number | null,
  regulation: Regulation = 'stcw'            
): Promise<any[]> {
  try {
    const { data } = await axios.get(
      `${REST_SUMMARY_RANGE_API}/${regulation}`,
      {
        params: {
          start,
          end,
          crewId: crewId ?? undefined,
          vesselId: vesselId ?? undefined,
        },
      }
    );
    return data?.summaries ?? [];
  } catch (error: any) {
    console.error('❌ Error fetching summaries range:', error);
    throw new Error(error.response?.data?.message || 'Failed fetching summaries range');
  }
}

// If you also need rolling 7d totals alongside summaries
export async function getSummariesRange(
  start: string,
  end: string,
  crewId?: number | null,
  vesselId?: number | null,
  regulation: Regulation = 'stcw'
): Promise<{ summaries: any[]; rolling: any[] }> {
  try {
    const { data } = await axios.get(
      `${REST_SUMMARY_RANGE_API}/${regulation}`,
      {
        params: {
          start,
          end,
          crewId: crewId ?? undefined,
          vesselId: vesselId ?? undefined,
        },
      }
    );
    // return { summaries: data?.summaries ?? [], rolling7d: data?.rolling7d ?? [] };
    // server now returns stcwRolling / mlcRolling; normalize to .rolling for callers
    const rolling = regulation === 'stcw' ? (data?.stcwRolling ?? []) : (data?.mlcRolling ?? []);
    return { summaries: data?.summaries ?? [], rolling };

  } catch (error: any) {
    console.error('❌ Error fetching summaries+rolling:', error);
    throw new Error(error.response?.data?.message || 'Failed fetching summaries range');
  }
}

// Approve/Unapprove a day summary
export async function approveRestDay(summaryId: number, approved: boolean): Promise<void> {
  try {
    const res = await axios.patch(
      `${REST_HOURS_API_URL}/entries/summaries/${summaryId}/approval`,
      null,
      { params: { approved } }
    );
    if (res.status !== 204) throw new Error(`Unexpected status ${res.status}`);
  } catch (error: any) {
    console.error('❌ Approval failed:', error);
    throw new Error(error.response?.data?.message || `Approval failed for summary ${summaryId}`);
  }
}

// NEW: Update remarks on a summary-day (preferred)
export async function patchSummaryRemarks(summaryId: number, remarks: string): Promise<void> {
  try {
    await axios.patch(
      `${REST_HOURS_API_URL}/summaries/${summaryId}/remarks`,
      { remarks },
      { headers: jsonHeaders }
    );
  } catch (error: any) {
    console.error('❌ PATCH summary remarks failed:', error);
    throw new Error(error.response?.data?.message || `Failed updating remarks for summary ${summaryId}`);
  }
}



// export const saveRestHourEntries = async (
//   crewId: number,
//   vesselId: number,
//   entriesByDate: Record<string, RestHourEntry[]>
// ): Promise<void> => {
//   try {
//     // Loop through each date and call API separately
//     for (const [date, entries] of Object.entries(entriesByDate)) {
//       const url = `${REST_HOURS_API_URL}/entries/bulk?crewId=${crewId}&vesselId=${vesselId}&entryDate=${date}`

//       console.log('Saving entries for:', date, entries)

//       // Add isWorking:true to each entry object
//       const payload = entries.map(entry => ({
//         ...entry,
//         working: true
//       }))

//       const response = await axios.post(url, payload)

//       console.log(`✅ Saved for ${date}`, response.data)
//     }
//   } catch (error: any) {
//     console.error('❌ Error saving rest hours:', error)
//     throw new Error(error.response?.data?.message || 'Error saving rest hours')
//   }
// }


// export const getRestHourEntriesInRange = async (
//   crewId: number,
//   vesselId: number,
//   start: string,   // format: YYYY-MM-DD
//   end: string      // format: YYYY-MM-DD
// ): Promise<any[]> => {
//   try {
//     const url = `${REST_HOURS_API_URL}/rest-range?crewId=${crewId}&vesselId=${vesselId}&start=${start}&end=${end}`

//     const response = await axios.get<any[]>(url)

//     return response.data
//   } catch (error: any) {
//     console.error('❌ Error fetching rest hour entries:', error)
//     throw new Error(error.response?.data?.message || 'Error fetching rest hour entries')
//   }
// }
export const getRestHourEntriesInRange = async (
  crewId: number,
  vesselId: number,
  start: string,
  end: string
) => {
  try {
    const response = await axios.get(`${REST_HOURS_API_URL}/entries/rest-range`, {
      params: {
        crewId,
        vesselId,
        start,
        end
      }
    });

    const rows = Array.isArray(response.data) ? response.data : [];
    // normalize: prefer server `working`, fallback to `isWorking`, keep remarks
    return rows.map((e: any) => ({
      ...e,
      isWorking: (e?.isWorking ?? e?.working ?? false),
      working: (e?.working ?? e?.isWorking ?? false),
      remarks: e?.remarks ?? null,
    }));

  } catch (error) {
    console.error("Error fetching rest range entries:", error);
    throw error;
  }
};

// export const getRestHoursSummary = async (
//   start: string,
//   end: string
// ) => {
//   try {
//     const response = await axios.get(`${REST_HOURS_API_URL}/summaries/range`, {
//       params: {
//         start,
//         end
//       }
//     });

//     return response.data; // this should give you the array of entries
//   } catch (error) {
//     console.error("Error fetching rest range entries:", error);
//     throw error;
//   }
// };

//Application Form Crew Documents

export const getCrewDocument = async (
  crewId: number
): Promise<CrewDocumentResponse | null> => {
  try {
    const res = await axios.get(`${API_URL}/crew/${crewId}/documents`);
    const data = res.data;

    // API sometimes returns an array; pick the first/only record
    const doc = Array.isArray(data) ? (data[0] ?? null) : (data ?? null);

    // Optionally: if backend ever returns newest-first array and you want latest:
    // const doc = Array.isArray(data) ? (data.sort((a,b)=>b.id-a.id)[0] ?? null) : (data ?? null);

    return doc;
  } catch (e) {
    throw new Error('Failed to fetch crew document');
  }
};


export const createCrewDocument = async (crewId: number, documentData: CrewDocumentRequest): Promise<CrewDocumentResponse> => {
  try {
    const response = await axios.post(`${API_URL}/crew/${crewId}/documents/create`, documentData)
    return response.data
  } catch (error) {
    throw new Error('Failed to create crew document')
  }
}

export const updateCrewDocument = async (crewId: number, documentId: number, documentData: CrewDocumentRequest): Promise<CrewDocumentResponse> => {
  try {
    if (!documentId && documentId !== 0) throw new Error('updateCrewDocument called without a valid docId');
    const response = await axios.put(`${API_URL}/crew/${crewId}/documents/update/${documentId}`, documentData)
    return response.data
  } catch (error) {
    throw new Error('Failed to update crew document')
  }
}

// Academic Details APIs
export const getAcademicDetails = async (crewId: number): Promise<AcademicQualificationResponse[]> => {
  try {
    const response = await axios.get(`${API_URL}/crew/${crewId}/academic-details`);
    return Array.isArray(response.data) ? response.data : [response.data];
  } catch (error: any) {
    console.error('Error fetching academic details:', error);
    throw new Error(error.response?.data?.message || 'Error fetching academic details');
  }
};

export const createAcademicDetails = async (crewId: number, academicData: AcademicQualificationRequest): Promise<AcademicQualificationResponse> => {
  try {
    const response = await axios.post(`${API_URL}/crew/${crewId}/academic-details/create`, {
      qualification: academicData.qualification,
      institutionName: academicData.institutionName,
      boardOrUniversity: academicData.boardOrUniversity,
      dateOfPassing: academicData.dateOfPassing,
      gradeOrPercentage: academicData.gradeOrPercentage,
    });
    return response.data;
  } catch (error: any) {
    console.error('Error creating academic details:', error);
    throw new Error(error.response?.data?.message || 'Error creating academic details');
  }
};

export const updateAcademicDetails = async (crewId: number, academicId: number, academicData: AcademicQualificationRequest): Promise<AcademicQualificationResponse> => {
  try {
    if (!academicId && academicId !== 0) throw new Error('updateAcademicDetails called without a valid academicId');
    const response = await axios.put(`${API_URL}/crew/${crewId}/academic-details/update/${academicId}`, {
      qualification: academicData.qualification,
      institutionName: academicData.institutionName,
      boardOrUniversity: academicData.boardOrUniversity,
      dateOfPassing: academicData.dateOfPassing,
      gradeOrPercentage: academicData.gradeOrPercentage,
    });
    return response.data;
  } catch (error: any) {
    console.error('Error updating academic details:', error);
    throw new Error(error.response?.data?.message || 'Error updating academic details');
  }
};

// Watchkeeping Certificates APIs
export const getWatchkeepingCertificates = async (crewId: number): Promise<WatchkeepingCertificateResponse[]> => {
  try {
    const response = await axios.get(`${API_URL}/crew/${crewId}/watchkeeping-certificates`);
    return Array.isArray(response.data) ? response.data : [response.data];
  } catch (error: any) {
    console.error('Error fetching watchkeeping certificates:', error);
    throw new Error(error.response?.data?.message || 'Error fetching watchkeeping certificates');
  }
};

export const createWatchkeepingCertificate = async (crewId: number, certificateData: WatchkeepingCertificateRequest): Promise<WatchkeepingCertificateResponse> => {
  try {
    const response = await axios.post(`${API_URL}/crew/${crewId}/watchkeeping-certificates/create`, {
      certificateDetails: certificateData.certificateDetails,
      certificateNo: certificateData.certificateNo,
      dateOfIssue: certificateData.dateOfIssue,
      placeOfIssue: certificateData.placeOfIssue,
      validUntil: certificateData.validUntil,
    });
    return response.data;
  } catch (error: any) {
    console.error('Error creating watchkeeping certificate:', error);
    throw new Error(error.response?.data?.message || 'Error creating watchkeeping certificate');
  }
};

export const updateWatchkeepingCertificate = async (crewId: number, certificateId: number, certificateData: WatchkeepingCertificateRequest): Promise<WatchkeepingCertificateResponse> => {
  try {
    if (!certificateId && certificateId !== 0) throw new Error('updateWatchkeepingCertificate called without a valid certificateId');
    const response = await axios.put(`${API_URL}/crew/${crewId}/watchkeeping-certificates/update/${certificateId}`, {
      certificateDetails: certificateData.certificateDetails,
      certificateNo: certificateData.certificateNo,
      dateOfIssue: certificateData.dateOfIssue,
      placeOfIssue: certificateData.placeOfIssue,
      validUntil: certificateData.validUntil,
    });
    return response.data;
  } catch (error: any) {
    console.error('Error updating watchkeeping certificate:', error);
    throw new Error(error.response?.data?.message || 'Error updating watchkeeping certificate');
  }
};


export const getNextOfKin = async (crewId: number): Promise<NextOfKinResponse | null> => {
  try {
    const response = await axios.get(`${API_URL}/crew/${crewId}/next-of-kin`);
    const data = response.data;

    // API sometimes returns an array; pick the first/only record
    const kin = Array.isArray(data) ? (data[0] ?? null) : (data ?? null);

    // Optionally: if backend ever returns newest-first array and you want latest:
    // const doc = Array.isArray(data) ? (data.sort((a,b)=>b.id-a.id)[0] ?? null) : (data ?? null);

    return kin;
  } catch (error: any) {
    console.error('Error fetching next of kin:', error);
    throw new Error(error.response?.data?.message || 'Error fetching next of kin');
  }
};

export const createNextOfKin = async (crewId: number, nextOfKinData: NextOfKinRequest): Promise<NextOfKinResponse> => {
  try {
    const response = await axios.post(`${API_URL}/crew/${crewId}/next-of-kin/create`, {
      crewId: nextOfKinData.crewId,
      civilStatus: nextOfKinData.civilStatus,
      fullName: nextOfKinData.fullName,
      relationship: nextOfKinData.relationship,
      address: nextOfKinData.address,
      pinCode: nextOfKinData.pinCode,
      phoneStdCode: nextOfKinData.phoneStdCode,
      phoneNumber: nextOfKinData.phoneNumber,
    });
    return response.data;
  } catch (error: any) {
    console.error('Error creating next of kin:', error);
    throw new Error(error.response?.data?.message || 'Error creating next of kin');
  }
};

export const updateNextOfKin = async (crewId: number, nextOfKinId: number, nextOfKinData: NextOfKinRequest): Promise<NextOfKinResponse> => {
  try {
    if (!nextOfKinId && nextOfKinId !== 0) throw new Error('updateNextOfKin called without a valid nextOfKinId');
    const response = await axios.put(`${API_URL}/crew/${crewId}/next-of-kin/update/${nextOfKinId}`, {
      crewId: nextOfKinData.crewId,
      civilStatus: nextOfKinData.civilStatus,
      fullName: nextOfKinData.fullName,
      relationship: nextOfKinData.relationship,
      address: nextOfKinData.address,
      pinCode: nextOfKinData.pinCode,
      phoneStdCode: nextOfKinData.phoneStdCode,
      phoneNumber: nextOfKinData.phoneNumber,
    });
    return response.data;
  } catch (error: any) {
    console.error('Error updating next of kin:', error);
    throw new Error(error.response?.data?.message || 'Error updating next of kin');
  }
};

export const getCourseCertificates = async (crewId: number): Promise<CourseCertificateResponse[]> => {
  try {
    const response = await axios.get(`${API_URL}/crew-course-certificates/crew/${crewId}`);
    return Array.isArray(response.data) ? response.data : [response.data];
  } catch (error: any) {
    console.error('Error fetching course certificates:', error);
    throw new Error(error.response?.data?.message || 'Error fetching course certificates');
  }
};

export const createCourseCertificate = async (
  crewId: number,
  certificateData: CourseCertificate
): Promise<CourseCertificateResponse> => {
  try {
    const response = await axios.post(`${API_URL}/crew-course-certificates/create/${crewId}`, {
      certificateName: certificateData.certificateName,
      category: certificateData.category,
      certificateNumber: certificateData.certificateNumber || null,
      dateOfIssue: certificateData.dateOfIssue || null,
      dateOfExpiry: certificateData.dateOfExpiry || null,
      issuedBy: certificateData.issuedBy || null,
    });
    return response.data;
  } catch (error: any) {
    console.error('Error creating course certificate:', error);
    throw new Error(error.response?.data?.message || 'Error creating course certificate');
  }
};

export const updateCourseCertificate = async (
  crewId: number,
  certificateId: number,
  certificateData: CourseCertificate
): Promise<CourseCertificateResponse> => {
  try {
    if (!certificateId && certificateId !== 0)
      throw new Error('updateCourseCertificate called without a valid certificateId');
    const response = await axios.put(
      `${API_URL}/crew-course-certificates/update/${certificateId}/${crewId}`,
      {
        certificateName: certificateData.certificateName,
        category: certificateData.category,
        certificateNumber: certificateData.certificateNumber || null,
        dateOfIssue: certificateData.dateOfIssue || null,
        dateOfExpiry: certificateData.dateOfExpiry || null,
        issuedBy: certificateData.issuedBy || null,
      }
    );
    return response.data;
  } catch (error: any) {
    console.error('Error updating course certificate:', error);
    throw new Error(error.response?.data?.message || 'Error updating course certificate');
  }
};

export const deleteCourseCertificate = async (certificateId: number): Promise<void> => {
  try {
    await axios.delete(`${API_URL}/crew-course-certificates/delete/${certificateId}`);
  } catch (error: any) {
    console.error('Error deleting course certificate:', error);
    throw new Error(error.response?.data?.message || 'Error deleting course certificate');
  }
};

export const getSeaServices = async (crewId: number): Promise<SeaServiceResponse[]> => {
  try {
    const response = await axios.get(`${API_URL}/crew/${crewId}/sea-service`);
    return Array.isArray(response.data) ? response.data : [response.data];
  } catch (error: any) {
    console.error('Error fetching sea services:', error);
    throw new Error(error.response?.data?.message || 'Error fetching sea services');
  }
};

export const createSeaService = async (crewId: number, seaServiceData: SeaServiceRequest): Promise<SeaServiceResponse> => {
  try {
    const response = await axios.post(`${API_URL}/crew/${crewId}/sea-service/create`, {
      serialNo: seaServiceData.serialNo,
      companyName: seaServiceData.companyName || null,
      vesselName: seaServiceData.vesselName || null,
      typeOfVesselFlag: seaServiceData.typeOfVesselFlag || null,
      grtdrt: seaServiceData.grtdrt || null,
      engineType: seaServiceData.engineType || null,
      kwtBhp: seaServiceData.kwtBhp || null,
      rank: seaServiceData.rank || null,
      fromDate: seaServiceData.fromDate || null,
      toDate: seaServiceData.toDate || null,
      totalMonthsDays: seaServiceData.totalMonthsDays || null,
      reasonForSignOff: seaServiceData.reasonForSignOff || null,
    });
    return response.data;
  } catch (error: any) {
    console.error('Error creating sea service:', error);
    throw new Error(error.response?.data?.message || 'Error creating sea service');
  }
};

export const updateSeaService = async (crewId: number, seaServiceId: number, seaServiceData: SeaServiceRequest): Promise<SeaServiceResponse> => {
  try {
    if (!seaServiceId && seaServiceId !== 0) throw new Error('updateSeaService called without a valid seaServiceId');
    const response = await axios.put(`${API_URL}/crew/${crewId}/sea-service/update/${seaServiceId}`, {
      serialNo: seaServiceData.serialNo,
      companyName: seaServiceData.companyName || null,
      vesselName: seaServiceData.vesselName || null,
      typeOfVesselFlag: seaServiceData.typeOfVesselFlag || null,
      grtdrt: seaServiceData.grtdrt || null,
      engineType: seaServiceData.engineType || null,
      kwtBhp: seaServiceData.kwtBhp || null,
      rank: seaServiceData.rank || null,
      fromDate: seaServiceData.fromDate || null,
      toDate: seaServiceData.toDate || null,
      totalMonthsDays: seaServiceData.totalMonthsDays || null,
      reasonForSignOff: seaServiceData.reasonForSignOff || null,
    });
    return response.data;
  } catch (error: any) {
    console.error('Error updating sea service:', error);
    throw new Error(error.response?.data?.message || 'Error updating sea service');
  }
};

export const deleteSeaService = async (crewId: number, seaServiceId: number): Promise<void> => {
  try {
    await axios.delete(`${API_URL}/crew/${crewId}/sea-service/delete/${seaServiceId}`);
  } catch (error: any) {
    console.error('Error deleting sea service:', error);
    throw new Error(error.response?.data?.message || 'Error deleting sea service');
  }
};

export const getAdditionalDetails = async (crewId: number): Promise<AdditionalDetailsResponse | null> => {
  try {
    const response = await axios.get(`${API_URL}/crew/${crewId}/additional-details`);
    return response.data[0] || null;
  } catch (error: any) {
    console.error('Error fetching additional details:', error);
    throw new Error(error.response?.data?.message || 'Error fetching additional details');
  }
};

export const createAdditionalDetails = async (crewId: number, additionalDetailsData: AdditionalDetailsRequest): Promise<AdditionalDetailsResponse> => {
  try {
    const payload = Object.fromEntries(
      Object.entries(additionalDetailsData).filter(([_, value]) => value !== null && value !== undefined)
    );
    const response = await axios.post(`${API_URL}/crew/${crewId}/additional-details/create`, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  } catch (error: any) {
    console.error('Error creating additional details:', error);
    throw new Error(error.response?.data?.message || 'Error creating additional details');
  }
};

export const updateAdditionalDetails = async (crewId: number, additionalDetailsId: number, additionalDetailsData: AdditionalDetailsRequest): Promise<AdditionalDetailsResponse> => {
  try {
    if (!additionalDetailsId && additionalDetailsId !== 0) throw new Error('updateAdditionalDetails called without a valid additionalDetailsId');
    const payload = Object.fromEntries(
      Object.entries(additionalDetailsData).filter(([_, value]) => value !== null && value !== undefined)
    );
    const response = await axios.put(`${API_URL}/crew/${crewId}/additional-details/update/${additionalDetailsId}`, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  } catch (error: any) {
    console.error('Error updating additional details:', error);
    throw new Error(error.response?.data?.message || 'Error updating additional details');
  }
};

export const getSignedOnCrewList = async (): Promise<Crew[]> => {
  try {
    const response = await axios.get(SIGNEDON_CREW_API_URL);
    console.log("signed on crew:", response.data)

    return response.data;

  } catch (error: any) {
    console.error('Error fetching crew list:', error);
    throw new Error(error.response?.data?.message || 'Error fetching Crew list');
  }
};

// ================= FLAG DOCUMENTS =================

export const getFlagDocuments = async (
  crewId: number
): Promise<CrewFlagDocument[]> => {
  const res = await axios.get(`${API_URL}/crew/${crewId}/flag-documents`)
  return res.data
}

export interface SaveFlagDocumentPayload {
  crewId: number
  flag: FlagCountry
  docType: FlagDocType
  documentNumber?: string
  issueDate?: string // yyyy-MM-dd
  expiryDate?: string
  file?: File | null
}

export const saveFlagDocument = async (
  payload: SaveFlagDocumentPayload
): Promise<CrewFlagDocument> => {
  const {crewId, flag, docType, documentNumber, issueDate, expiryDate, file} = payload
  const fd = new FormData()
  fd.append('flag', flag)
  fd.append('docType', docType)
  if (documentNumber) fd.append('documentNumber', documentNumber)
  if (issueDate) fd.append('issueDate', issueDate)
  if (expiryDate) fd.append('expiryDate', expiryDate)
  if (file) fd.append('file', file)

  const res = await axios.post(
    `${API_URL}/crew/${crewId}/flag-documents`,
    fd,
    {
      headers: {'Content-Type': 'multipart/form-data'},
    }
  )
  return res.data
}

export const deleteFlagDocument = async (
  crewId: number,
  id: number
): Promise<void> => {
  await axios.delete(`${API_URL}/crew/${crewId}/flag-documents/${id}`)
}

export const fetchFlagDocumentBlob = async (
  crewId: number,
  id: number
): Promise<Blob> => {
  const res = await axios.get(
    `${API_URL}/crew/${crewId}/flag-documents/${id}/view`,
    {
      responseType: 'blob',
    }
  )
  return res.data
}
// Watchkeeping certificate file upload
export async function uploadWatchkeepingFile(
  crewId: number,
  certificateId: number,
  file: File
): Promise<void> {
  const formData = new FormData();
  formData.append('file', file);

  await axios.post(
    `${API_URL}/crew/${crewId}/watchkeeping-certificates/${certificateId}/file`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    }
  );
}

// View file
export async function fetchWatchkeepingFileBlob(
  crewId: number,
  certificateId: number
): Promise<Blob> {
  const res = await axios.get(
    `${API_URL}/crew/${crewId}/watchkeeping-certificates/${certificateId}/view`,
    { responseType: 'blob' }
  );
  return res.data;
}

// Delete file
export async function deleteWatchkeepingFile(
  crewId: number,
  certificateId: number
): Promise<void> {
  await axios.delete(
    `${API_URL}/crew/${crewId}/watchkeeping-certificates/${certificateId}/file`
  );
}

// Course certificate file upload
export async function uploadCourseCertificateFile(
  certificateId: number,
  file: File
): Promise<void> {
  const formData = new FormData();
  formData.append('file', file);

  await axios.post(
    `${API_URL}/crew-course-certificates/${certificateId}/file`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    }
  );
}

export async function fetchCourseCertificateFileBlob(
  certificateId: number
): Promise<Blob> {
  const res = await axios.get(
    `${API_URL}/crew-course-certificates/${certificateId}/view`,
    {
      responseType: 'blob',
    }
  );
  return res.data;
}

export async function deleteCourseCertificateFile(
  certificateId: number
): Promise<void> {
  await axios.delete(
    `${API_URL}/crew-course-certificates/${certificateId}/file`
  );
}
