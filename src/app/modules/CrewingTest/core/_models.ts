// /_models.ts

export type DocumentSlot =
  | 'CV'   
  | 'PASSPORT'
  | 'NATIONAL_CDC'
  | 'BIOMETRIC_SID'
  | 'SCHENGEN_VISA'
  | 'US_VISA_C1D'
  | 'COC'
  | 'GMDSS'
  | 'GMDSS_ENDORSEMENT'
  | 'INDOS'
  | 'OTHERS'
  | 'OIL_ENDORSEMENT'
  | 'CHEM_ENDORSEMENT'
  | 'GAS_ENDORSEMENT';


export interface CrewDocument {
  id: number;
  slot: DocumentSlot;                 
  documentName: string; // e.g., "Passport", not the file name
  filePath: string | null; // e.g., "/Uploads/122/documents/sample-local-pdf (1).pdf"
  // fileUrl: string | null; // Constructed frontend-side if needed (e.g., `${BASE_URL}${filePath}`)
  uploadedAt: string; // ISO date string for sorting
}

export interface CrewCertification {
  id: number;
  documentName: string;
  fileUrl: string;
}

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';


export interface Crew {
  id: number;
  name: string;
  crewId: number;
  crewName: string;
  username: string;
  userId: number;
  dateOfBirth: string;
  nationality: string;
  department: string;
  contactNumber: string;
  email: string;
  rankId: number;
  rank: string;
  rankInfo: {
    id: number;
    rank: string;
  };
  // startDate?: string;
  // endDate?: string;
  notes?: string;
  companyAdminId?: number;
  companyGroupAdminId: number;
  vessel?: {
    id: number;
    fleet_name: string;
  };
  active: boolean;
  vesselId?: number;
  certifications: CrewCertification[];
  documents: CrewDocument[];
  availabilityStatus?: string;
  approvalStatus?: ApprovalStatus 

  // vessel summary (root‐level for PDF header)
  vesselName?: string;
  imoNumber?: string;
  callSign?: string;
  flagState?: string;
  voyageNumber?: string;
  portOfArrival?: string;
  portOfDeparture?: string;
  dateOfArrival?: string | null;
  dateOfDeparture?: string | null;

      // identity fields
  familyName?: string;
  // givenNames?: string;
  placeOfBirth?: string;
  gender?: string;
  // identityDocType?: string | null;
  // identityDocNumber?: string | null;
  // identityIssuingState?: string | null;
  // identityExpiryDate?: string | null;

  //view crew details 

  presentRankId?: number;
  rankAppliedForId?: number;
  dateOfAvailability?: string;
  telNo?: string;
  alternateMobNo?: string;
  skypeId?: string;
  maritalStatus?: string;
  bloodGroup?: string;
  heightCms?: number;
  weightKgs?: number;
  bmiIndex?: number;
  willingToAcceptLowerRank?: boolean;
  boilerSuitSize?: string;
  shoeSize?: string;
  address?: string;

  contractEndDate?: Date;

  crewDocuments?: CrewDocumentResponse[];
  academicQualifications?: AcademicQualificationResponse[] | null;
  watchkeepingCertificates?: WatchkeepingCertificateResponse[] | null; // Added
  deckWatchCert?: CertificateDetails | null;
  ableSeafarerDeckCert?: CertificateDetails | null;
  engineRoomWatchCert?: CertificateDetails | null;
  ableSeafarerEngineCert?: CertificateDetails | null;
  nextOfKin?: NextOfKinResponse | null;
  courses?: CourseCertificateResponse[] | null;
  seaServiceHistory?: SeaServiceResponse[] | null;
  additionalInfo?: AdditionalDetailsResponse | null;
  medicalHistory?: MedicalHistory | null;
  sourceOfInfo?: SourceOfInformation | null;
  references?: Reference[] | null;
  additionalNotes?: string | null;
  crewData: Crew;

}

//for single crew for get crew by id
export interface Vessel {
  id: number;
  fleet_name: string;
  imoNumber: string;
  call_sign?: string;
  flag?: string;
}
//for single crew for get crew by id
export interface CrewUnit {
  id: number;
  name: string;
  companyGroupAdminId: number;
  companyAdminId?: number;
  vessel: Vessel;
  username: string;
  rankId: number;
  presentRankId?: number;
  rankAppliedForId?: number;
  userId: number;
  isActive: boolean;
  notes: string;
  dateOfBirth: string;
  nationality: string;
  department: string;
  contactNumber: string;
  email: string;
  availabilityStatus?: string;
  password?: string;
  familyName?: string;
  placeOfBirth?: string;
  gender?: string;
  vesselName?: string;
  imoNumber?: string;
  callSign?: string;
  flagState?: string;
  voyageNumber?: string;
  portOfArrival?: string;
  portOfDeparture?: string;
  dateOfArrival?: string;
  dateOfDeparture?: string;
  approvalStatus?: ApprovalStatus | null;
  telNo?: string;
  alternateMobNo?: string;
  skypeId?: string;
  dateOfAvailability?: string;
  maritalStatus?: string;
  willingToAcceptLowerRank?: boolean;
  boilerSuitSize?: string;
  heightCms?: number;
  weightKgs?: number;
  bmiIndex?: number;
  bloodGroup?: string;
  shoeSize?: string;
  address?: string;
}

// NEW Interface for Identity Documents

// This is for docs upload
export interface CrewDocuments {
   // Identity Documents
  passportNumber?: string | null;
  passportIssueDate?: string | null;
  passportPlaceOfIssue?: string | null;
  passportExpiryDate?: string | null;
  passportEcnr?: boolean | null;
  passportMin4BlankPages?: boolean | null;
  
  cdcNumber?: string | null;
  cdcIssueDate?: string | null;
  cdcPlaceOfIssue?: string | null;
  cdcExpiryDate?: string | null;
  unionMembershipNo?: string | null;
  
  sidNumber?: string | null;
  sidIssueDate?: string | null;
  sidPlaceOfIssue?: string | null;
  sidExpiryDate?: string | null;
  
  schengenVisaNumber?: string | null;
  schengenVisaIssueDate?: string | null;
  schengenVisaPlaceOfIssue?: string | null;
  schengenVisaExpiryDate?: string | null;
  
  usVisaC1dNumber?: string | null;
  usVisaC1dIssueDate?: string | null;
  usVisaC1dPlaceOfIssue?: string | null;
  usVisaC1dExpiryDate?: string | null;

  // Professional Certificates
  cocGradeLevel?: string | null;
  cocNumber?: string | null;
  cocIssuingAuthority?: string | null;
  cocIssueDate?: string | null;
  cocExpiryDate?: string | null;

  gmdssGradeLevel?: string | null;
  gmdssNumber?: string | null;
  gmdssIssuingAuthority?: string | null;
  gmdssIssueDate?: string | null;
  gmdssExpiryDate?: string | null;

  gmdssEndorsementGradeLevel?: string | null;
  gmdssEndorsementNumber?: string | null;
  gmdssEndorsementIssuingAuthority?: string | null;
  gmdssEndorsementIssueDate?: string | null;
  gmdssEndorsementExpiryDate?: string | null;

  indosNumber?: string | null;

  otherDocName?: string | null;
  otherDocGradeLevel?: string | null;
  otherDocNumber?: string | null;
  otherDocIssuingAuthority?: string | null;
  otherDocIssueDate?: string | null;
  otherDocExpiryDate?: string | null;

  // Dangerous Cargo Endorsements
  oilEndorsementNationality?: string | null;
  oilEndorsementGradeLevel?: string | null;
  oilEndorsementNumber?: string | null;
  oilEndorsementIssueDate?: string | null;
  oilEndorsementPlaceOfIssue?: string | null;
  oilEndorsementExpiryDate?: string | null;

  chemEndorsementNationality?: string | null;
  chemEndorsementGradeLevel?: string | null;
  chemEndorsementNumber?: string | null;
  chemEndorsementIssueDate?: string | null;
  chemEndorsementPlaceOfIssue?: string | null;
  chemEndorsementExpiryDate?: string | null;

  gasEndorsementNationality?: string | null;
  gasEndorsementGradeLevel?: string | null;
  gasEndorsementNumber?: string | null;
  gasEndorsementIssueDate?: string | null;
  gasEndorsementPlaceOfIssue?: string | null;
  gasEndorsementExpiryDate?: string | null;
}


export interface CrewDocumentRequest {
  passportNumber?: string;
  passportIssueDate?: string;
  passportPlaceOfIssue?: string;
  passportExpiryDate?: string;
  passportEcnr?: boolean;
  passportMin4BlankPages?: boolean;
  cdcNumber?: string;
  cdcIssueDate?: string;
  cdcPlaceOfIssue?: string;
  cdcExpiryDate?: string;
  unionMembershipNo?: string;
  sidNumber?: string;
  sidIssueDate?: string;
  sidPlaceOfIssue?: string;
  sidExpiryDate?: string;
  schengenVisaNumber?: string;
  schengenVisaIssueDate?: string;
  schengenVisaPlaceOfIssue?: string;
  schengenVisaExpiryDate?: string;
  usVisaC1dNumber?: string;
  usVisaC1dIssueDate?: string;
  usVisaC1dPlaceOfIssue?: string;
  usVisaC1dExpiryDate?: string;
  cocGradeLevel?: string;
  cocNumber?: string;
  cocIssuingAuthority?: string;
  cocIssueDate?: string;
  cocExpiryDate?: string;
  gmdssGradeLevel?: string;
  gmdssNumber?: string;
  gmdssIssuingAuthority?: string;
  gmdssIssueDate?: string;
  gmdssExpiryDate?: string;
  gmdssEndorsementGradeLevel?: string;
  gmdssEndorsementNumber?: string;
  gmdssEndorsementIssuingAuthority?: string;
  gmdssEndorsementIssueDate?: string;
  gmdssEndorsementExpiryDate?: string;
  indosGradeLevel?: string;
  indosNumber?: string;
  indosIssuingAuthority?: string;
  indosIssueDate?: string;
  indosExpiryDate?: string;
  otherDocGradeLevel?: string;
  otherDocNumber?: string;
  otherDocIssuingAuthority?: string;
  otherDocIssueDate?: string;
  otherDocExpiryDate?: string;
  oilEndorsementNationality?: string;
  oilEndorsementGradeLevel?: string;
  oilEndorsementNumber?: string;
  oilEndorsementIssueDate?: string;
  oilEndorsementPlaceOfIssue?: string;
  oilEndorsementExpiryDate?: string;
  chemEndorsementNationality?: string;
  chemEndorsementGradeLevel?: string;
  chemEndorsementNumber?: string;
  chemEndorsementIssueDate?: string;
  chemEndorsementPlaceOfIssue?: string;
  chemEndorsementExpiryDate?: string;
  gasEndorsementNationality?: string;
  gasEndorsementGradeLevel?: string;
  gasEndorsementNumber?: string;
  gasEndorsementIssueDate?: string;
  gasEndorsementPlaceOfIssue?: string;
  gasEndorsementExpiryDate?: string;
}

export interface CrewDocumentResponse extends CrewDocumentRequest {
  id: number;
  crewId: number;
}

export interface CrewDocumentForm {
  passportNumber?: string;
  passportIssueDate?: string;
  passportPlaceOfIssue?: string;
  passportExpiryDate?: string;
  passportEcnr?: boolean;
  passportMin4BlankPages?: boolean;
  cdcNumber?: string;
  cdcIssueDate?: string;
  cdcPlaceOfIssue?: string;
  cdcExpiryDate?: string;
  unionMembershipNo?: string;
  sidNumber?: string;
  sidIssueDate?: string;
  sidPlaceOfIssue?: string;
  sidExpiryDate?: string;
  schengenVisaNumber?: string;
  schengenVisaIssueDate?: string;
  schengenVisaPlaceOfIssue?: string;
  schengenVisaExpiryDate?: string;
  usVisaC1dNumber?: string;
  usVisaC1dIssueDate?: string;
  usVisaC1dPlaceOfIssue?: string;
  usVisaC1dExpiryDate?: string;
  cocGradeLevel?: string;
  cocNumber?: string;
  cocIssuingAuthority?: string;
  cocIssueDate?: string;
  cocExpiryDate?: string;
  gmdssGradeLevel?: string;
  gmdssNumber?: string;
  gmdssIssuingAuthority?: string;
  gmdssIssueDate?: string;
  gmdssExpiryDate?: string;
  gmdssEndorsementGradeLevel?: string;
  gmdssEndorsementNumber?: string;
  gmdssEndorsementIssuingAuthority?: string;
  gmdssEndorsementIssueDate?: string;
  gmdssEndorsementExpiryDate?: string;
  indosGradeLevel?: string;
  indosNumber?: string;
  indosIssuingAuthority?: string;
  indosIssueDate?: string;
  indosExpiryDate?: string;
  otherDocGradeLevel?: string;
  otherDocNumber?: string;
  otherDocIssuingAuthority?: string;
  otherDocIssueDate?: string;
  otherDocExpiryDate?: string;
  oilEndorsementNationality?: string;
  oilEndorsementGradeLevel?: string;
  oilEndorsementNumber?: string;
  oilEndorsementIssueDate?: string;
  oilEndorsementPlaceOfIssue?: string;
  oilEndorsementExpiryDate?: string;
  chemEndorsementNationality?: string;
  chemEndorsementGradeLevel?: string;
  chemEndorsementNumber?: string;
  chemEndorsementIssueDate?: string;
  chemEndorsementPlaceOfIssue?: string;
  chemEndorsementExpiryDate?: string;
  gasEndorsementNationality?: string;
  gasEndorsementGradeLevel?: string;
  gasEndorsementNumber?: string;
  gasEndorsementIssueDate?: string;
  gasEndorsementPlaceOfIssue?: string;
  gasEndorsementExpiryDate?: string;
}


export interface AcademicQualificationRequest {
  qualification?: string | null;
  institutionName?: string | null;
  boardOrUniversity?: string | null; // Changed from boardUniversity
  dateOfPassing?: string | null;
  gradeOrPercentage?: string | null; // Changed from gradePercentage
}

export interface AcademicQualificationResponse extends AcademicQualificationRequest {
  id: number;
  crewId: number;
}

export interface WatchkeepingCertificateRequest {
  certificateDetails: string;
  certificateNo?: string | null;
  dateOfIssue?: string | null;
  placeOfIssue?: string | null;
  validUntil?: string | null;
}

export interface WatchkeepingCertificateResponse extends WatchkeepingCertificateRequest {
  id: number;
  crewId: number;
      filePath?: string | null;
  fileName?: string | null;
  uploadedAt?: string | null;
}
 
//might  need to change the names after apis will be given and we replace static data
export interface CertificateDetails {
  certificateNo?: string | null;
  dateOfIssue?: string | null;
  placeOfIssue?: string | null;
  validUntil?: string | null;
}

export interface NextOfKinRequest {
  crewId: number;
  civilStatus?: 'SINGLE' | 'MARRIED' | 'SEPARATED' | 'DIVORCED' | 'WIDOWED' | null;
  fullName?: string | null;
  relationship?: string | null;
  address?: string | null;
  pinCode?: string | null;
  phoneStdCode?: string | null;
  phoneNumber?: string | null;
}

export interface NextOfKinResponse extends NextOfKinRequest {
  id: number;
}

export interface CourseCertificate {
  id?: number;
  crewId?: number;
  certificateName?: string | null;
  category?: string | null;
  certificateNumber?: string | null;
  dateOfIssue?: string | null;
  dateOfExpiry?: string | null;
  issuedBy?: string | null;
      filePath?: string | null;
  fileName?: string | null;
  uploadedAt?: string | null;
}

export interface CourseCertificateResponse extends CourseCertificate {
  id: number;
  crewId: number;
}

export interface SeaServiceRequest {
    id?: number; // ✅ add this
  serialNo: number;
  companyName?: string | null;
  vesselName?: string | null;
  typeOfVesselFlag?: string | null;
  grtdrt?: string | null;
  engineType?: string | null;
  kwtBhp?: string | null;
  rank?: string | null;
  fromDate?: string | null;
  toDate?: string | null;
  totalMonthsDays?: string | null;
  reasonForSignOff?: string | null;
}

export interface SeaServiceResponse extends SeaServiceRequest {
  id: number;
  crewId: number;
}
export interface Reference {
  srNo: number;
  companyName: string;
  pic: string;
  designation: string;
  phoneNo: string;
}


export interface AdditionalDetailsRequest {
  crewId: number;
  criminalCaseInvolved?: boolean;
  criminalCaseDetails?: string | null;
  certificateSuspendedRevoked?: boolean;
  certificateSuspendedRevokedDetails?: string | null;
  hasMedicalConditions?: boolean;
  medicalConditionsDetails?: string | null;
  habitualUseDrugsAlcohol?: boolean;
  habitualUseDetails?: string | null;
  workedWithMultinational?: boolean;
  multinationalNationalities?: string | null;
  referralSource?: 'WORD_OF_MOUTH' | 'PRINT_MEDIA' | 'CONTACTED_BY_STAFF' | 'WEB_SITES' | null;
  referralDetails?: string | null;
  pumpExperienceFramoMonths?: number | null;
  pumpExperienceCopMonths?: number | null;
  drydockingExperience?: boolean;
  drydockingRank?: string | null;
  newConstructionExperience?: boolean;
  newConstructionRank?: string | null;
  incidentInvolvement?: boolean;
  incidentDetails?: string | null;
  courtOfEnquiryInvolvement?: boolean;
  courtOfEnquiryDetails?: string | null;
  references?: string | null;
  declarationMedicalExam?: boolean;
  declarationMedicalDecision?: boolean;
  declarationNoCriminal?: boolean;
  declarationDocumentsValid?: boolean;
  declarationNotEmployed?: boolean;
  declarationNoAgents?: boolean;
  availabilityDate?: string | null;
  applicantName?: string | null;
  applicantDate?: string | null;
  hasReferenceData?: boolean;
}

export interface AdditionalDetailsResponse extends AdditionalDetailsRequest {
  id: number;
}

export interface MedicalHistory {
  certSuspendedDetails?: string | null;
  sufferedFromDetails?: string | null;
  habitualUserDetails?: string | null;
  multinationalWorkDetails?: string | null;
}

export interface SourceOfInformation {
  wordOfMouth?: boolean | null;
  wordOfMouthDetails?: string | null;
  printMedia?: boolean | null;
  printMediaDetails?: string | null;
  contactedByStaff?: boolean | null;
  contactedByStaffDetails?: string | null;
  webSites?: boolean | null;
  webSitesDetails?: string | null;
}

// add at the bottom:
export interface Rank {
  id: number;
  rank: string;
}

export interface Company {
  id: number;
  uid: {
    username: string;
    password: string;
    role: {
      id: number;
      roleType: string;
    };
    enabled: boolean;
  };
  cga: {
    id: number;
    name: string;
  };
  name: string;
  contactNo?: string;
  altContactNo?: string;
  email?: string;
  addressLine1: string;
  addressLine2: string;
  landmark: string;
  country: string;
  state: string;
  city: string;
  companyDetails: string;
  active: boolean;
  username?: string;
  password?: string;
};

export interface CompanyAdmin {
  id: number;
  uid: {
    username: string;
    password: string;
    role: {
      id: number;
      roleType: string;
    };
    enabled: boolean;
  };
  cgaid: {
    id: number;
  };
  name: string;
  contactNo: string;
  altContactNo: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
  landmark: string;
  country: string;
  state: string;
  city: string;
  companyDetails: string;
  active: boolean;
};

export interface Vessel {
  id: number;
  fleet_name: string;
  imoNumber: string;
  mmsi?: string;
  call_sign?: string;
  flag?: string;
  classes?: string;
  area?: string;
  dwt?: string;
  vesselType: string;
  companyAdmin: Company;
  companyGroupAdmin?: CompanyAdmin;
  active: boolean;
}

/**
 * A single revision of sign‑on/off history.
 */
export interface HistoryRecord {
  id: number;
  rev: number;
  revtype: number;
  sign_on_date: string;
  sign_off_date: string | null;
  port_sign_on: string;
  port_sign_off: string | null;
  status: string;
  created_at: string | null;
  updated_at: string | null;
  vessel_id: number;
  rank_id: number;
  username: string;
}

// --- Flag Documents (per-flag, per-doc-type) ---

export type FlagCountry =
  | 'GAMBIA'
  | 'COMOROS'
  | 'MOZAMBIQUE'
  | 'MARSHALL_ISLANDS'
  | 'COOK_ISLANDS'

export type FlagDocType =
  | 'COC'
  | 'GMDSS'
  | 'SSO'
  | 'OIL_ENDORSEMENT'
  | 'CHEM_ENDORSEMENT'
  | 'STSDSD'
  | 'CRA'

export interface CrewFlagDocument {
  id: number
  crewId: number

  flag: FlagCountry
  docType: FlagDocType

  documentNumber: string | null
  issueDate: string | null // yyyy-MM-dd
  expiryDate: string | null

  fileName: string | null
  filePath: string | null // /uploads/...
  uploadedAt: string | null
}
