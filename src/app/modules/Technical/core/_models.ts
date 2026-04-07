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

// Equipment Hierarchy Models
export interface EquipmentDto {
  id?: number;
  vesselId: number;
  vesselName?: string;
  name: string;
  code?: string;
  shortForm?: string;
  criticality?: boolean;
  subHead?: string;
  maker?: string;
  model?: string;
  serialNumber?: string;
  installationDate?: string;
  location?: string;
  isClassCritical?: boolean;
  isSurveyRelevant?: boolean;
  vesselLocationId?: number;
  vesselLocationDescription?: string;
  equipmentFunctionDescription?: string;
}

export interface EquipmentComponentDto {
  id?: number;
  equipmentId: number;
  equipmentName?: string;
  equipmentCode?: string;
  name: string;
  code?: string;
  description?: string;
  componentCode?: string;
  componentDescription?: string;
  componentFunctionDescription?: string;
  systemSerialNumber?: string;
  systemParticulars?: string;
  maker?: string;
  hasOpenJob?: boolean | null;
}

export interface SubcomponentDto {
  id?: number;
  part?: PartDto; // PartDto
  equipmentComponent?: EquipmentComponentDto;
  name: string;
  subComponentCode?: string;
  subComponentFunctionDescription?: string;
  subComponentParticulars?: string;
  maker?: string;
  hasOpenJob?: boolean | null;
}

export interface VesselMachineryCountsDto {
  vesselId: number;
  vesselName: string;
  equipmentCount: number;
  componentCount: number;
  subcomponentCount: number;
  partCount: number;
}

export interface PartDto {
  id?: number;
  vessel?: Vessel;
  vesselId?: number;
  code?: string;
  name: string;
  itemCode?: string;
  itemShortDescription?: string;
  itemLongDescription?: string;
  drawNo?: string;
  drawingPositionNo?: string;
  maker?: string;
  manufacturer?: string;
  partNo?: string;
  serialNumber?: string;
  subcomponent?: SubcomponentDto; // Subcomponent object from API
  subcomponentId?: number; // For linking to subcomponent (legacy/compatibility)
  location?: string; // Part location field
}
