
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
  name: string;
}

export interface Voyage {
  id: number;
  voyageNumber: string;
  departurePort: string;
  arrivalPort: string;
  // startDate: Date;
  // endDaate: Date;
  startDate: string;
  endDate: string;
  companyGroupAdminId: number;
  companyAdminId: number;
  vessel: {
    id: number;
    fleet_name: string;
    vesselType: string;
    imoNumber: string;
  }
  active: boolean;
}

export interface CreatedReports {
  id: number;
  reportType: string;
  status: ReportStatus;
  createdDateTime: Date;
  submittedDateTime: Date;
  remark: string;
  createdBy: {
    id: number;
    rank: string;
  };
  assignment: {
    id: number;
    template: {
      id: number;
      name: string;
      menus: {
        name: string;
        id: number;
        isActive: boolean;
        submenus: Submenu[];
      }[];
    };
    customTemplate: {
      id: number;
      menus: {
        name: string;
        id: number;
        isActive: boolean;
        submenus: Submenu[];
      }[];
    }
  };
  values: {
    field: number;
    reportId: number;
    label: string;
    valueText: string;
  }[];
  vesselType: string;
  vesselId: number;
}

export interface AssignedReports {
  id: number;
  companyAdmin: number;
  template: {
    id: number;
    name: string;
    vesselType: string | null;
    vessel: {
      id: number;
      name: string;
      imoNumber?: string;
    } | null;
    menus: {
      name: string;
      id: number;
      isActive: boolean;
      submenus: Submenu[];
    }[];
  };
  customTemplate: {
    id: number;
    masterTemplateId: number;
    menus: {
      name: string;
      id: number;
      isActive: boolean;
      submenus: Submenu[];
    }[];
  }
  vesselType: string;
  vessel: number;
  companyGroupAdmin: number;
}

export interface CustomAssignedReports {
  id: number;
  template: {
    id: number;
    name: string;
    vesselType: string | null;
    vessel: {
      id: number;
      name: string;
      imoNumber?: string;
    } | null;
  };
  companyAdmin: {
    id: number;
  };
  vesselType: string;
  vesselId: number;
  menus: {
    name: string;
    id: number;
    isActive: boolean;
    submenus: Submenu[];
  }[]; // 👈 Changed to an array
  masterTemplate: {
    id: number;
    name: string;
  }
}

export interface Template {
  id: number;
  name: string;
  description: string;
  // menus: Menu[];
}

export interface Reports {
  id: number;
  name: string;
  order: number;
  templateId: number;
  isActive: boolean;
  submenus: Submenu[];
  customTemplateId?: number;
}

export interface Submenu {
  id: number;
  name: string;
  isActive: boolean;
  fields: Fields[];
  menuId: number;
  // add any other submenu fields you need here
}

export interface Fields {
  id: number;
  label: string;
  fieldType: string;
  readOnly: boolean;
  isActive: boolean;
  optionsJson?: string[];
  value?: string | number | string[];
  required: boolean;
  unit?: string;
  minValue?: number;
  maxValue?: number;
  warningOnly?: WarningLevel;
  submenuId: number
}

export enum WarningLevel {
  STRICT = "STRICT",
  SOFT = "SOFT"
}

export enum ReportStatus {
  DRAFT = "DRAFT",
  SUBMITTED = "SUBMITTED"
}

//for new position report page

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

// === Vessel Operations (header strip) ===
export interface VesselOperations {
  vesselName: string;
  vesselImo: string;
  lastPort: string | null;
  atd: string | null;     // ISO string or null
  nextPort: string | null;
  eta: string | null;     // ISO string or null
  latitude: string | null;
  longitude: string | null;
  status: string | null;
  lastUpdated: string | null;
  latLongSource: string | null;
  masterName: string | null;
  masterContactNumber: string | null;
  chiefEngineerName: string | null;
}

// === Cargo Operations ===
export type CargoBreakupType = 'TANK' | 'HOLD';

export interface CargoFinalAttachment {
  id?: number;
  cargoOperationId?: number;
  documentName: string;
  remarks?: string | null;
  attachmentUrl?: string | null;
}

export interface CargoOperationDetail {
  id?: number;
  cargoOperationId?: number;
  cargoGrade?: string | null;
  cargoName: string;
  quantityMt?: number | null;
  noOfLoadersOrDischarge?: number | null;
  ballastPumpingRateM3PerHr?: number | null;
  dockWaterDensity?: number | null;
  maxDraughtAvailableHw?: number | null;
  loadDischargeRateM3PerHr?: number | null;
  currentDraughtMtrs?: number | null;
  attachmentUrl?: string | null;
  orderIndex?: number;
}

export interface CargoOperation {
  id?: number;
  companyId?: number | null;
  companyName?: string | null;
  vesselId?: number | null;
  vesselName?: string | null;
  voyageId?: number | null;
  voyageNumber?: string | null;
  breakupType: CargoBreakupType;
  remarks?: string | null;
  cargoName?: string | null;
  totalCargoQtyMt?: number | null;
  shipperAsPerBl?: string | null;
  receiverAsPerBl?: string | null;
  loadPorts?: string | null;
  dischargePorts?: string | null;
  heatingRequirements?: string | null;
  createdDateTime?: string;
  updatedDateTime?: string;
  details: CargoOperationDetail[];
  finalAttachments?: CargoFinalAttachment[];
}

export interface CargoOperationRequest {
  companyId?: number | null;
  vesselId?: number | null;
  voyageId?: number | null;
  breakupType: CargoBreakupType;
  remarks?: string | null;
    cargoName?: string | null;
  totalCargoQtyMt?: number | null;
  shipperAsPerBl?: string | null;
  receiverAsPerBl?: string | null;
  loadPorts?: string | null;
  dischargePorts?: string | null;
  heatingRequirements?: string | null;
  details: CargoOperationDetail[];
  finalAttachments?: CargoFinalAttachment[];
}