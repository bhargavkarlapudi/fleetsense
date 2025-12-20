// /_models.ts

export interface CrewDocument {
  id: number;
  documentName: string;
  fileUrl: string;
}

export interface CrewCertification {
  id: number;
  documentName: string;
  fileUrl: string;
}

export interface Crew {
  id: number;
  name: string;
  dateOfBirth: string;
  nationality: string;
  vesselName: string;
  department: string;
  contactNumber: string;
  email: string;
  rankId: number;
  // startDate?: string;
  // endDate?: string;
  notes?: string;
  companyAdminId: number;
  companyGroupAdminId: number;
  vessel: {
    id: number;
    fleet_name: string;
  };
  active: boolean;
  vesselId: number;
  certifications: CrewCertification[];
  documents: CrewDocument[];
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