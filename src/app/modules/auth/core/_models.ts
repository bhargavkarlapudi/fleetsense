export interface UserDetails {
  role: {
    id: number;
  },
  roleId: number;
  vessel: {
    id: number;
    fleet_name: string;
    imoNumber: string;
    companyAdminId: number;
    companyGroupAdminId: number;
    vesselType: string;
  } | null;
  vesselId: number;
  username: string;
  rank: number;
companyGroupAdminId: number | null;
  companyAdminId: number | null;
  companyGroupAdmin: {
    id: number;
    name: string;
    username: string;
    // Add other fields if needed from response examples
  } | null;
  companyAdmin: {
    id: number;
    name: string;
    username: string;
    // Add other fields if needed from response examples
  } | null;
}

export interface RefreshResponse {
  accessToken: string
  refreshToken: string
  accessExpiryIn: number
  refreshExpiryIn: number
}

export interface AuthModel {
  auth: {
    jwt: string;
    refreshToken?: string
    expiryIn: number;
  }
  role: {
    id: number;
    roleName: string;
  }
  roleEntityId: number;
  roleEntityName: string;
  userDetails?: UserDetails;
}

export interface UserAddressModel {
  addressLine: string
  city: string
  state: string
  postCode: string
}

export interface UserModel {
  id: number;
  username: string;
  password?: string;
  rank: {
    id: number;
    rank: string;
  }
  roleEntityId?: number;
  roleEntityName?: string;
  vessel?: {
    id: number;
    fleet_name: string;
    vesselType: string;
    imoNumber: string;
    dynamicUrl: string;
    companyAdminId: number;
    companyGroupAdminId: number;
    companyAdmin: {
      id: number;
      name: string;
    };
    voyages: any[];
  } | null;
  role: {
    id: number;
    roleType: string;
  };
  enabled: boolean;
  authorities: {
    authority: string;
  }[];
  accountNonExpired: boolean;
  accountNonLocked: boolean;
  credentialsNonExpired: boolean;
  companyGroupAdminId?: number;
  companyAdminId?: number;
      // NEW: make these available on /profile/me (the API already sends them in your examples)
  companyGroupAdmin?: {
    id: number;
    name: string;
    username: string;            // <-- needed for redirect
  } | null;

  companyAdmin?: {
    id: number;
    name: string;
    username: string;            // <-- needed for redirect (even if we use CGA for role 2)
  } | null;

}


export interface UserCommunicationModel {
  username: boolean
  sms: boolean
  phone: boolean
}

export interface UserEmailSettingsModel {
  emailNotification?: boolean
  sendCopyToPersonalEmail?: boolean
  activityRelatesEmail?: {
    youHaveNewNotifications?: boolean
    youAreSentADirectMessage?: boolean
    someoneAddsYouAsAsAConnection?: boolean
    uponNewOrder?: boolean
    newMembershipApproval?: boolean
    memberRegistration?: boolean
  }
  updatesFromKeenthemes?: {
    newsAboutKeenthemesProductsAndFeatureUpdates?: boolean
    tipsOnGettingMoreOutOfKeen?: boolean
    thingsYouMissedSindeYouLastLoggedIntoKeen?: boolean
    newsAboutStartOnPartnerProductsAndOtherServices?: boolean
    tipsOnStartBusinessProducts?: boolean
  }
}

export interface UserSocialNetworksModel {
  linkedIn: string
  facebook: string
  twitter: string
  instagram: string
}

export interface Vessel {
  id: number;
  fleet_name: string;
  vesselType: string;
  imoNumber: string;
  mmsi: number;
  call_sign: string;
  flag: string;
  classes: string;
  area: string;
  dwt: string;
  dynamicUrl: string;
  companyAdminId: number | null;
  companyGroupAdminId: number;
  voyages: any[] | null;
  active: boolean;
  companyAdmin: {
    id: number;
    uid: number;
    cgaid: number;
    cga: any | null;
    name: string;
    username: string;
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
    password: string;
    active: boolean;
  } | null;
  companyGroupAdmin: {
    id: number;
    uid: number;
    name: string;
    username: string;
    contactNo: string;
    altContactNo: string;
    email: string;
    addressLine1: string;
    addressLine2: string;
    landmark: string;
    country: string;
    state: string;
    city: string;
    companyGroupAdminDetails: string;
    password: string;
    active: boolean;
  };
}