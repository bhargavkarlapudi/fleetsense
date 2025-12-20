import axios from 'axios'
import {
  Company,
  CompanyAdmin,
  Vessel,
  VesselGeneralInfo,
  VesselGeneralInfoRequest,
  ForUSACalls,
  ForUSACallsRequest,
  SafetyHelicopterRequest,
  SafetyHelicopter,
  TankCoating,
  TankCoatingRequest,
  Ballast,
  BallastRequest,
  CargoSystem,
  CargoSystemRequest,
  VacuumSystem,
  VacuumSystemRequest,
  PropulsionSystem,
  PropulsionSystemRequest,
  VesselLandingResponse ,
  Operator, CreateOperatorRequest, UpdateOperatorRequest,
  Vendor, VendorCategory, CreateVendorRequest, UpdateVendorRequest
} from './_models'

const API_URL = process.env.REACT_APP_API_URL

const COMPANY_ADMIN_API_URL = `${API_URL}/company-group-admins`
const GET_COMPANY_API_URL = `${API_URL}/users/company-admins`
const COMPANY_API_URL = `${API_URL}/company-admins`
const VESSEL_API_URL = `${API_URL}/vessels`
const ADDITIONAL_VESSEL_API_URL = `${API_URL}/v1/vessels/general-information`
const FOR_USA_CALLS_API_URL = `${API_URL}/v1/vessels/for-usa-calls`
const SAFETY_HELI_API_URL = `${API_URL}/v1/vessels/safety-helicopter`
const TANK_COATING_API_URL = `${API_URL}/v1/vessels/tank-coating`
const BALLAST_API_BASE = `${API_URL}/v1/vessels`
const CARGO_API_BASE = `${API_URL}/v1/vessels`
const VACUUM_API_BASE = `${API_URL}/v1/vessels`
const PROPULSION_API_BASE = `${API_URL}/v1/vessels`
const VESSEL_LANDING_API_URL = `${API_URL}/vessels/landing`
const OPERATORS_API_URL = `${API_URL}/operators`


// ——— VESSELS ——————————————————————————————————————————————————————————————————

export const getVesselList = async (): Promise<Vessel[]> => {
  try {
    const response = await axios.get<Vessel[]>(VESSEL_API_URL)
    return response.data
  } catch (error: any) {
    console.error('Error fetching vessel list:', error)
    throw new Error(error.response?.data?.message || 'Error fetching vessel list')
  }
}

export const createVessel = async (
  vesselName: string,
  vesselType: string,
  imoNumber: string,
  mmsi: string,
  call_sign: string,
  flag: string,
  classes: string,
  area: string,
  dwt: string,
  companyGroupAdminId: number,
  companyAdminId?: number
): Promise<Vessel[]> => {
  try {
    const requestBody: any = {
      fleet_name: vesselName,
      vesselType,
      imoNumber,
      mmsi,
      call_sign,
      flag,
      classes,
      area,
      dwt,
      companyGroupAdminId,
      active: true,
    }

    if (companyAdminId) {
      requestBody.companyAdminId = companyAdminId
    }

    const response = await axios.post<Vessel[]>(`${VESSEL_API_URL}/create`, requestBody)
    return response.data
  } catch (error: any) {
    console.error('Error creating vessel:', error)
    throw new Error(error.response?.data?.message || 'Error creating vessel')
  }
}

export const updateVessel = async (
  vesselId: number,
  vesselName: string,
  vesselType: string,
  imoNumber: string,
  mmsi: string,
  call_sign: string,
  flag: string,
  classes: string,
  area: string,
  dwt: string,
  companyAdminId: number,
  companyGroupAdminId: number,
  isActive: boolean
): Promise<Vessel> => {
  try {
    const payload: any = {
      fleet_name: vesselName,
      vesselType,
      imoNumber,
      mmsi,
      call_sign,
      flag,
      classes,
      area,
      dwt,
      companyGroupAdminId,
      active: isActive,
    }
    // ✅ Add companyAdminId only if it's not 0
    if (companyAdminId !== 0) {
      payload.companyAdminId = companyAdminId
    }
    const response = await axios.put<Vessel>(`${VESSEL_API_URL}/update/${vesselId}`, payload)

    return response.data
  } catch (error: any) {
    console.error('Error updating vessel:', error)
    throw new Error(error.response?.data?.message || 'Error updating vessel')
  }
}

export const deleteVessel = async (vesselId: number): Promise<Vessel[]> => {
  try {
    const response = await axios.delete<Vessel[]>(`${VESSEL_API_URL}/delete/${vesselId}`)
    return response.data
  } catch (error: any) {
    console.error('Error deleting vessel item:', error)
    throw new Error(error.response?.data?.message || 'Error deleting vessel item')
  }
}

// ——— COMPANY —————————————————————————————————————————————————————————————————

export const getCompanyList = async (): Promise<Company[]> => {
  try {
    const response = await axios.get<Company[]>(GET_COMPANY_API_URL)
    return response.data
  } catch (error: any) {
    console.error('Error fetching company list:', error)
    throw new Error(error.response?.data?.message || 'Error fetching company list')
  }
}

export const getCompanyAdminList = async (): Promise<CompanyAdmin[]> => {
  try {
    const response = await axios.get(COMPANY_ADMIN_API_URL)

    return response.data // Return company data
  } catch (error: any) {
    console.error('Error fetching company admin list:', error)
    throw new Error(error.response?.data?.message || 'Error fetching company admin list')
  }
}

export const createCompany = async (
  companyName: string,
  username: string,
  password: string,
  contactNo: string,
  altContactNo: string,
  email: string,
  addressLine1: string,
  addressLine2: string,
  landmark: string,
  country: string,
  state: string,
  city: string,
  companyDetails: string,
  cgaid: number
): Promise<Company> => {
  try {
    console.log('cgaid', cgaid)
    const response = await axios.post<Company>(`${COMPANY_API_URL}/create`, {
      uid: null,
      cgaid,
      name: companyName,
      contactNo,
      altContactNo,
      email,
      addressLine1,
      addressLine2,
      landmark,
      country,
      state,
      city,
      companyDetails,
      username,
      password,
      active: true,
    })

    return response.data
  } catch (error: any) {
    console.error('Error creating vessel:', error)
    throw new Error(error.response?.data?.message || 'Error creating vessel')
  }
}

export const updateCompany = async (
  companyId: number,
  companyAdminId: number,
  companyName: string,
  contactNo: string,
  altContactNo: string,
  email: string,
  addressLine1: string,
  addressLine2: string,
  landmark: string,
  country: string,
  state: string,
  city: string,
  companyDetails: string,
  isActive?: boolean
): Promise<Company> => {
  try {
    console.log(isActive)
    const response = await axios.put<Company>(`${COMPANY_API_URL}/update/${companyId}`, {
      id: companyId,
      cgaid: companyAdminId,
      name: companyName,
      contactNo,
      altContactNo,
      email,
      addressLine1,
      addressLine2,
      landmark,
      country,
      state,
      city,
      companyDetails,
      active: isActive,
    })

    return response.data
  } catch (error: any) {
    console.error('Error updating company:', error)
    throw new Error(error.response?.data?.message || 'Error updating company')
  }
}

export const deleteCompany = async (companyId: number): Promise<Company[]> => {
  try {
    const response = await axios.delete<Company[]>(`${COMPANY_API_URL}/delete/${companyId}`)
    return response.data
  } catch (error: any) {
    console.error('Error deleting company item:', error)
    throw new Error(error.response?.data?.message || 'Error deleting company item')
  }
}

// ——— COMPANY ADMINS ——————————————————————————————————————————————————

export const createCompanyAdmin = async (
  companyAdminName: string,
  username: string,
  password: string,
  contactNo: string,
  altContactNo: string,
  email: string,
  addressLine1: string,
  addressLine2: string,
  landmark: string,
  country: string,
  state: string,
  city: string,
  companyDetails: string
): Promise<CompanyAdmin> => {
  try {
    console.log('username:', username)
    console.log('password:', password)
    const response = await axios.post(COMPANY_ADMIN_API_URL + '/create', {
      uid: null,
      name: companyAdminName,
      contactNo,
      altContactNo,
      email,
      addressLine1,
      addressLine2,
      landmark,
      country,
      state,
      city,
      companyGroupAdminDetails: companyDetails,
      password,
      username,
      active: true,
    })

    return response.data
  } catch (error: any) {
    console.error('Error creating company admin:', error)
    throw new Error(error.response?.data?.message || 'Error creating company admin')
  }
}

export const updateCompanyAdmin = async (
  companyAdminId: number,
  companyAdminName: string,
  contactNo: string,
  altContactNo: string,
  email: string,
  addressLine1: string,
  addressLine2: string,
  landmark: string,
  country: string,
  state: string,
  city: string,
  companyDetails: string,
  isActive?: boolean
): Promise<CompanyAdmin[]> => {
  try {
    const response = await axios.put<CompanyAdmin[]>(
      `${COMPANY_ADMIN_API_URL}/update/${companyAdminId}`,
      {
        id: companyAdminId,
        name: companyAdminName,
        contactNo,
        altContactNo,
        email,
        addressLine1,
        addressLine2,
        landmark,
        country,
        state,
        city,
        companyGroupAdminDetails: companyDetails,
        active: isActive,
      }
    )

    console.log(response.data)
    return response.data
  } catch (error: any) {
    console.error('Error updating company admin:', error)
    throw new Error(error.response?.data?.message || 'Error updating company admin')
  }
}

export const deleteCompanyAdmin = async (companyAdminId: number): Promise<CompanyAdmin[]> => {
  try {
    const response = await axios.delete<CompanyAdmin[]>(
      `${COMPANY_ADMIN_API_URL}/delete/${companyAdminId}`
    )

    return response.data
  } catch (error: any) {
    console.error('Error deleting company admin item:', error)
    throw new Error(error.response?.data?.message || 'Error deleting company admin item')
  }
}

export const createGeneralInfoOfVessel = async (
  vesselId: number,
  payload: VesselGeneralInfoRequest
): Promise<VesselGeneralInfo> => {
  try {
    const response = await axios.post<VesselGeneralInfo>(
      `${ADDITIONAL_VESSEL_API_URL}/${vesselId}/create`,
      payload
    )
    return response.data
  } catch (error: any) {
    console.error('Error creating general info of vessel:', error)
    throw new Error(error.response?.data?.message || 'Error creating general info of vessel')
  }
}

export const getGeneralInfoOfVessel = async (vesselId: number): Promise<VesselGeneralInfo> => {
  try {
    const response = await axios.get<VesselGeneralInfo>(`${ADDITIONAL_VESSEL_API_URL}/${vesselId}`)
    console.log("gen info", response.data)
    return response.data
  } catch (error: any) {
    if (error.response?.status === 404) {
      throw new Error('Not found')
    }
    console.error('Error fetching general info:', error)
    throw new Error(error.response?.data?.message || 'Error fetching general info')
  }
}

export const updateGeneralInfoOfVessel = async (
  vesselId: number,
  payload: VesselGeneralInfoRequest
): Promise<VesselGeneralInfo> => {
  try {
    const response = await axios.put<VesselGeneralInfo>(
      `${ADDITIONAL_VESSEL_API_URL}/${vesselId}/update`,
      payload
    )
    return response.data
  } catch (error: any) {
    console.error('Error updating general info:', error)
    throw new Error(error.response?.data?.message || 'Error updating general info')
  }
}

/**
 * Fetch the existing “For USA Calls” data for a vessel
 */
export const getForUSACalls = async (vesselId: number): Promise<ForUSACalls> => {
  try {
    const response = await axios.get<ForUSACalls>(`${FOR_USA_CALLS_API_URL}/${vesselId}`)
    return response.data
  } catch (error: any) {
    console.error('Error fetching For USA Calls data:', error)
    throw new Error(error.response?.data?.message || 'Error fetching For USA Calls data')
  }
}

/**
 * Create a new “For USA Calls” record for a vessel
 */
export const createForUSACalls = async (
  vesselId: number,
  payload: ForUSACallsRequest
): Promise<ForUSACalls> => {
  try {
    const response = await axios.post<ForUSACalls>(
      `${FOR_USA_CALLS_API_URL}/${vesselId}/create`,
      payload
    )
    return response.data
  } catch (error: any) {
    console.error('Error creating For USA Calls data:', error)
    throw new Error(error.response?.data?.message || 'Error creating For USA Calls data')
  }
}

/**
 * Update an existing “For USA Calls” record for a vessel
 */
export const updateForUSACalls = async (
  vesselId: number,
  payload: ForUSACallsRequest
): Promise<ForUSACalls> => {
  try {
    const response = await axios.put<ForUSACalls>(
      `${FOR_USA_CALLS_API_URL}/${vesselId}/update`,
      payload
    )
    return response.data
  } catch (error: any) {
    console.error('Error updating For USA Calls data:', error)
    throw new Error(error.response?.data?.message || 'Error updating For USA Calls data')
  }
}



export const getSafetyHelicopter = async (vesselId: number): Promise<SafetyHelicopter> => {
  const response = await axios.get<SafetyHelicopter>(`${SAFETY_HELI_API_URL}/${vesselId}`)
  return response.data
}

export const createSafetyHelicopter = async (
  vesselId: number,
  payload: SafetyHelicopterRequest
): Promise<SafetyHelicopter> => {
  const response = await axios.post<SafetyHelicopter>(
    `${SAFETY_HELI_API_URL}/${vesselId}/create`,
    payload
  )
  return response.data
}

export const updateSafetyHelicopter = async (
  vesselId: number,
  payload: SafetyHelicopterRequest
): Promise<SafetyHelicopter> => {
  const response = await axios.put<SafetyHelicopter>(
    `${SAFETY_HELI_API_URL}/${vesselId}/update`,
    payload
  )
  return response.data
}

/**
 * Fetch existing Tank Coating / Anodes for a vessel
 */
export const getTankCoating = async (vesselId: number): Promise<TankCoating> => {
  try {
    const response = await axios.get<TankCoating>(`${TANK_COATING_API_URL}/${vesselId}`)
    return response.data
  } catch (error: any) {
    if (error.response?.status === 404) {
      throw new Error('Not found')
    }
    console.error('Error fetching Tank Coating:', error)
    throw new Error(error.response?.data?.message || 'Error fetching Tank Coating')
  }
}

/**
 * Create a new Tank Coating / Anodes record
 */
export const createTankCoating = async (
  vesselId: number,
  payload: TankCoatingRequest
): Promise<TankCoating> => {
  try {
    const response = await axios.post<TankCoating>(
      `${TANK_COATING_API_URL}/${vesselId}/create`,
      payload
    )
    return response.data
  } catch (error: any) {
    console.error('Error creating Tank Coating:', error)
    throw new Error(error.response?.data?.message || 'Error creating Tank Coating')
  }
}

/**
 * Update an existing Tank Coating / Anodes record
 */
export const updateTankCoating = async (
  vesselId: number,
  payload: TankCoatingRequest
): Promise<TankCoating> => {
  try {
    const response = await axios.put<TankCoating>(
      `${TANK_COATING_API_URL}/${vesselId}/update`,
      payload
    )
    return response.data
  } catch (error: any) {
    console.error('Error updating Tank Coating:', error)
    throw new Error(error.response?.data?.message || 'Error updating Tank Coating')
  }
}

/**
 * Fetch existing Ballast data for a vessel
 */
export const getBallast = async (vesselId: number): Promise<Ballast> => {
  try {
    const response = await axios.get<Ballast>(`${BALLAST_API_BASE}/${vesselId}/ballast`)
    return response.data
  } catch (error: any) {
    // not-yet-created returns 404
    if (error.response?.status === 404) {
      throw new Error('Not found')
    }
    console.error('Error fetching Ballast data:', error)
    throw new Error(error.response?.data?.message || 'Error fetching Ballast data')
  }
}

/**
 * Create a new Ballast record for a vessel
 */
export const createBallast = async (
  vesselId: number,
  payload: BallastRequest
): Promise<Ballast> => {
  try {
    const response = await axios.post<Ballast>(
    `${BALLAST_API_BASE}/${vesselId}/ballast/create`,
      payload
    )
    return response.data
  } catch (error: any) {
    console.error('Error creating Ballast data:', error)
    throw new Error(error.response?.data?.message || 'Error creating Ballast data')
  }
}

/**
 * Update an existing Ballast record for a vessel
 */
export const updateBallast = async (
  vesselId: number,
  payload: BallastRequest
): Promise<Ballast> => {
  try {
    const response = await axios.put<Ballast>(
    `${BALLAST_API_BASE}/${vesselId}/ballast/update`,
      payload
    )
    return response.data
  } catch (error: any) {
    console.error('Error updating Ballast data:', error)
    throw new Error(error.response?.data?.message || 'Error updating Ballast data')
  }
}


/**
 * GET   /v1/vessels/{vesselId}/cargo-system
 */
export const getCargoSystem = async (vesselId: number): Promise<CargoSystem> => {
  try {
    const response = await axios.get<CargoSystem>(
      `${CARGO_API_BASE}/${vesselId}/cargo-system`
    )
    return response.data
  } catch (error: any) {
    if (error.response?.status === 404) {
      throw new Error('Not found')
    }
    console.error('Error fetching Cargo System data:', error)
    throw new Error(error.response?.data?.message || 'Error fetching Cargo System data')
  }
}

/**
 * POST  /v1/vessels/{vesselId}/cargo-system/create
 */
export const createCargoSystem = async (
  vesselId: number,
  payload: CargoSystemRequest
): Promise<CargoSystem> => {
  try {
    const response = await axios.post<CargoSystem>(
      `${CARGO_API_BASE}/${vesselId}/cargo-system/create`,
      payload
    )
    return response.data
  } catch (error: any) {
    console.error('Error creating Cargo System data:', error)
    throw new Error(error.response?.data?.message || 'Error creating Cargo System data')
  }
}

/**
 * PUT   /v1/vessels/{vesselId}/cargo-system/update
 */
export const updateCargoSystem = async (
  vesselId: number,
  payload: CargoSystemRequest
): Promise<CargoSystem> => {
  try {
    const response = await axios.put<CargoSystem>(
      `${CARGO_API_BASE}/${vesselId}/cargo-system/update`,
      payload
    )
    return response.data
  } catch (error: any) {
    console.error('Error updating Cargo System data:', error)
    throw new Error(error.response?.data?.message || 'Error updating Cargo System data')
  }
}

/**
 * GET   /v1/vessels/{vesselId}/vacuum-system
 */
export const getVacuumSystem = async (vesselId: number): Promise<VacuumSystem> => {
  try {
    const response = await axios.get<VacuumSystem>(
      `${VACUUM_API_BASE}/${vesselId}/vacuum-system`
    )
    return response.data
  } catch (error: any) {
    if (error.response?.status === 404) {
      throw new Error('Not found')
    }
    console.error('Error fetching Vacuum System data:', error)
    throw new Error(error.response?.data?.message || 'Error fetching Vacuum System data')
  }
}

/**
 * POST  /v1/vessels/{vesselId}/vacuum-system/create
 */
export const createVacuumSystem = async (
  vesselId: number,
  payload: VacuumSystemRequest
): Promise<VacuumSystem> => {
  try {
    const response = await axios.post<VacuumSystem>(
      `${VACUUM_API_BASE}/${vesselId}/vacuum-system/create`,
      payload
    )
    return response.data
  } catch (error: any) {
    console.error('Error creating Vacuum System data:', error)
    throw new Error(error.response?.data?.message || 'Error creating Vacuum System data')
  }
}

/**
 * PUT   /v1/vessels/{vesselId}/vacuum-system/update
 */
export const updateVacuumSystem = async (
  vesselId: number,
  payload: VacuumSystemRequest
): Promise<VacuumSystem> => {
  try {
    const response = await axios.put<VacuumSystem>(
      `${VACUUM_API_BASE}/${vesselId}/vacuum-system/update`,
      payload
    )
    return response.data
  } catch (error: any) {
    console.error('Error updating Vacuum System data:', error)
    throw new Error(error.response?.data?.message || 'Error updating Vacuum System data')
  }
}


export const getVesselLanding = async (vesselId: number): Promise<VesselLandingResponse> => {
  try {
    const res = await axios.get<VesselLandingResponse>(`${VESSEL_LANDING_API_URL}/${vesselId}`)
    return res.data
  } catch (error: any) {
    console.error('Error fetching vessel landing data:', error)
    throw new Error(error.response?.data?.message || 'Error fetching vessel landing data')
  }
}

// ---- Vessel image (returns a single image) ----
// Tries to fetch a blob image (preferred). If server returns JSON with {url},
// it will fall back to that.
export const getVesselImageUrl = async (vesselId: number): Promise<string | null> => {
  try {
    const url = `${API_URL}/vessels/${vesselId}/images`;

    // First attempt: as BLOB (image)
    const blobResp = await axios.get(url, { responseType: 'blob' });
    // If server actually answered JSON, blob.type will usually be application/json
    if (blobResp?.data instanceof Blob && blobResp.data.type?.startsWith('image/')) {
      const objectUrl = URL.createObjectURL(blobResp.data);
      return objectUrl; // call site should revokeObjectURL on unmount
    }

    // Fallback: try JSON with { url: string } or plain string
    try {
      // Convert blob to text then JSON
      const text = await blobResp.data.text?.();
      if (text) {
        const maybe = JSON.parse(text);
        if (typeof maybe === 'string') return maybe;
        if (typeof maybe?.url === 'string') return maybe.url;
      }
    } catch {
      /* ignore JSON parse errors */
    }

    return null;
  } catch (err: any) {
    // Final fallback: try normal JSON request — some servers only send JSON
    try {
      const jsonResp = await axios.get(`${API_URL}/vessels/${vesselId}/images`);
      const data = jsonResp.data;
      if (!data) return null;
      if (typeof data === 'string') return data;
      if (Array.isArray(data) && data.length && typeof data[0] === 'string') return data[0];
      if (typeof data?.url === 'string') return data.url;
      return null;
    } catch (e) {
      console.error('Error fetching vessel image:', e);
      return null;
    }
  }
};


/**
 * GET   /v1/vessels/{vesselId}/propulsion
 */
export const getPropulsionSystem = async (vesselId: number): Promise<PropulsionSystem> => {
  try {
    const response = await axios.get<PropulsionSystem>(
      `${PROPULSION_API_BASE}/${vesselId}/propulsion`
    )
    return response.data
  } catch (error: any) {
    if (error.response?.status === 404) throw new Error('Not found')
    console.error('Error fetching Propulsion System data:', error)
    throw new Error(error.response?.data?.message || 'Error fetching Propulsion data')
  }
}

/**
 * POST  /v1/vessels/{vesselId}/propulsion/create
 */
export const createPropulsionSystem = async (
  vesselId: number,
  payload: PropulsionSystemRequest
): Promise<PropulsionSystem> => {
  try {
    const response = await axios.post<PropulsionSystem>(
      `${PROPULSION_API_BASE}/${vesselId}/propulsion/create`,
      payload
    )
    return response.data
  } catch (error: any) {
    console.error('Error creating Propulsion System data:', error)
    throw new Error(error.response?.data?.message || 'Error creating Propulsion data')
  }
}

/**
 * PUT   /v1/vessels/{vesselId}/propulsion/update
 */
export const updatePropulsionSystem = async (
  vesselId: number,
  payload: PropulsionSystemRequest
): Promise<PropulsionSystem> => {
  try {
    const response = await axios.put<PropulsionSystem>(
      `${PROPULSION_API_BASE}/${vesselId}/propulsion/update`,
      payload
    )
    return response.data
  } catch (error: any) {
    console.error('Error updating Propulsion System data:', error)
    throw new Error(error.response?.data?.message || 'Error updating Propulsion data')
  }
}


// --- MENUS TREE (permissions) ------------------------------------------------
export type MenuLevel = 'MODULE' | 'MENU' | 'SUBMENU'
export interface MenuTreeNode {
  level: MenuLevel
  id: number
  name: string
  sortOrder: number | null
  canView: boolean
  canAdd: boolean
  canEdit: boolean
  canDelete: boolean
  children: MenuTreeNode[]
}

// general (not used in modal anymore, but keep if other parts need it)
const MENUS_TREE_API_URL = `${API_URL}/menus/tree`

// user-specific (used in permissions modal)
const USER_MENUS_TREE_ABSOLUTE  = `${API_URL}/menus/tree` // /:userId

/**
 * GET /api/menus/tree
 * Returns the dynamic menu tree used for permissions (MODULE -> MENU -> [children]).
 * Normalizes the response to an array of MenuTreeNode for convenience.
 */
export const getMenusTree = async (opts?: { token?: string }): Promise<MenuTreeNode[]> => {
  try {
    const response = await axios.get<MenuTreeNode[] | MenuTreeNode>(MENUS_TREE_API_URL, {
      headers: opts?.token ? { Authorization: `Bearer ${opts.token}` } : undefined,
    })
    const data = response.data
    return Array.isArray(data) ? data : [data]
  } catch (error: any) {
    console.error('Error fetching menus tree:', error)
    throw new Error(error.response?.data?.message || 'Error fetching menus tree')
  }
}

/**
 * GET /api/menus/tree/{userId}
 * Loads a USER-specific MENU -> SUBMENU tree with permission flags.
 */
export const getUserMenusTree = async (userId: number): Promise<MenuTreeNode[]> => {
  try {
    const url = `${USER_MENUS_TREE_ABSOLUTE}/${userId}`
    const response = await axios.get<MenuTreeNode[] | MenuTreeNode>(url)
    const data = response.data
    return Array.isArray(data) ? data : [data]
  } catch (error: any) {
    console.error('Error fetching user menu tree:', error)
    throw new Error(error.response?.data?.message || 'Error fetching user menu tree')
  }
}


// OPERATORS ROLE 6

// GET /api/operators
export const getOperators = async (): Promise<Operator[]> => {
  try {
    const res = await axios.get<Operator[]>(OPERATORS_API_URL)
    return res.data
  } catch (error: any) {
    console.error('Error fetching operators:', error)
    throw new Error(error.response?.data?.message || 'Error fetching operators')
  }
}

// POST /api/operators/create
export const createOperator = async (payload: CreateOperatorRequest): Promise<Operator> => {
  try {
    const res = await axios.post<Operator>(`${OPERATORS_API_URL}/create`, payload)
    return res.data
  } catch (error: any) {
    console.error('Error creating operator:', error)
    throw new Error(error.response?.data?.message || 'Error creating operator')
  }
}

// PUT /api/operators/{id}
export const updateOperator = async (id: number, payload: UpdateOperatorRequest): Promise<Operator> => {
  try {
    const res = await axios.put<Operator>(`${OPERATORS_API_URL}/${id}`, payload)
    return res.data
  } catch (error: any) {
    console.error('Error updating operator:', error)
    throw new Error(error.response?.data?.message || 'Error updating operator')
  }
}

// --- ACL (permissions) -------------------------------------------------------
export type AclOverride = {
  moduleId: number
  menuId: number | null
  submenuId: number | null
  subsubmenuId: number | null
  viewOverride: boolean | null
  addOverride: boolean | null
  editOverride: boolean | null
  deleteOverride: boolean | null
}


export type BulkAclItem = {
  userId: number
  replaceAll: boolean
  acls: AclOverride[]
}

// API: PUT /api/acl/bulk
type AclRowResponse = AclOverride & { id: number; userId: number }

export const putBulkAcl = async (payload: BulkAclItem[]): Promise<Record<string, AclRowResponse[]>> => {
  try {
    const res = await axios.put<Record<string, AclRowResponse[]>>(`${API_URL}/acl/bulk`, payload)
    return res.data
  } catch (error: any) {
    console.error('Error updating ACLs:', error)
    throw new Error(error.response?.data?.message || 'Error updating ACLs')
  }
}

// --- VENDORS -----------------------------------------------------------------
const VENDORS_API_URL = `${API_URL}/vendors`
const VENDOR_CATEGORIES_API_URL = `${API_URL}/vendor-categories`

export const getVendorCategories = async (): Promise<VendorCategory[]> => {
  try {
    const res = await axios.get<VendorCategory[]>(VENDOR_CATEGORIES_API_URL)
    return res.data
  } catch (error: any) {
    console.error('Error fetching vendor categories:', error)
    throw new Error(error.response?.data?.message || 'Error fetching vendor categories')
  }
}

export const getVendors = async (): Promise<Vendor[]> => {
  try {
    const res = await axios.get<Vendor[]>(VENDORS_API_URL)
    return res.data
  } catch (error: any) {
    console.error('Error fetching vendors:', error)
    throw new Error(error.response?.data?.message || 'Error fetching vendors')
  }
}

export const createVendor = async (payload: CreateVendorRequest): Promise<Vendor> => {
  try {
    const res = await axios.post<Vendor>(`${VENDORS_API_URL}/create`, payload)
    return res.data
  } catch (error: any) {
    console.error('Error creating vendor:', error)
    throw new Error(error.response?.data?.message || 'Error creating vendor')
  }
}

export const updateVendor = async (id: number, payload: UpdateVendorRequest): Promise<Vendor> => {
  try {
    const res = await axios.put<Vendor>(`${VENDORS_API_URL}/${id}`, payload)
    return res.data
  } catch (error: any) {
    console.error('Error updating vendor:', error)
    throw new Error(error.response?.data?.message || 'Error updating vendor')
  }
}

export const deleteVendor = async (id: number): Promise<void> => {
  try {
    await axios.delete(`${VENDORS_API_URL}/${id}`)
  } catch (error: any) {
    console.error('Error deleting vendor:', error)
    throw new Error(error.response?.data?.message || 'Error deleting vendor')
  }
}

