
export interface VesselDetails {
  fleet_name: string;
  imoNumber: string;
  latitude: string;
  longitude: string;
  masterName?: string;
  chiefEngineerName?: string;
  lastPort?: string;
  nextPort?: string;
  atd?: string;
  eta?: string;
  latLongSource?: string;
  lastUpdated?: string;
  mmsi?: string;
  call_sign?: string;
  flag?: string;
  classes?: string;
  area?: string;
  dwt?: string;
  status?: string;
  port?: string;
  coords?: [number, number];
}

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
  companyAdmin?: Company;
  companyGroupAdmin?: CompanyAdmin;
  status: string;
  port: string;
  eta: string;
  coords?: [number, number];
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