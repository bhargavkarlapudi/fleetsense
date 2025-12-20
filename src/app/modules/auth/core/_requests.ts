import axios from 'axios'
import { AuthModel, RefreshResponse, UserModel, Vessel } from './_models'
import { Rank } from '../../Crewing/core/_models'

const API_URL = process.env.REACT_APP_API_URL

export const LOGIN_URL = `${API_URL}/auth/login`
export const RESET_PASSWORD_URL = `${API_URL}/api/company-admins/update/`
export const GET_USER_URL = `${API_URL}/users/all`
export const RANKS_API = `${API_URL}/ranks/vessel`;
export const GET_USER_BY_ACCESSTOKEN_URL = `${API_URL}/profile/me`
export const REGISTER_URL = `${API_URL}/register`
export const REFRESH_TOKEN_URL = `${API_URL}/auth/refresh-token`

export function login(username: string, password: string) {

  return axios.post<AuthModel>(LOGIN_URL, {
    username,
    password,
  })

}
// OLD
// export function shipLogin(vesselType: string,
//   imoNumber: string, rank: string, password: string,) {
//   const SHIP_LOGIN_URL = `${API_URL}/auth/${encodeURIComponent(vesselType)}/${imoNumber}/ship-login`
//   return axios.post<AuthModel>(SHIP_LOGIN_URL, {
//     rank,
//     password,
//   })
// }

// NEW
export function shipLogin(companyUsername: string, vesselType: string, imoNumber: string, rank: string, password: string) {
  const SHIP_LOGIN_URL = `${API_URL}/auth/${encodeURIComponent(companyUsername)}/ship-login`
  return axios.post<AuthModel>(SHIP_LOGIN_URL, {
    vesselType,
    imoNumber,
    rank,
    password,
  })
}

// Server should return AuthModel
export function register(
  username: string,
  firstname: string,
  lastname: string,
  password: string,
  password_confirmation: string
) {
  return axios.post(REGISTER_URL, {
    username,
    first_name: firstname,
    last_name: lastname,
    password,
    password_confirmation,
  })
}

export const fetchUserIdByEmail = async (email: string): Promise<number | null> => {
  try {
    const response = await axios.get<UserModel[]>(GET_USER_URL); // ✅ await + assign

    const users = response.data;
    const user = users.find(u => u.username.toLowerCase() === email.toLowerCase());

    if (user) {
      return user.id;   // ✅ returns id
    } else {
      return null;      // ✅ returns null if not found
    }
  } catch (error) {
    console.error('Error fetching user ID:', error);
    return null;  // ✅ error handled properly
  }
};

// Server should return object => { result: boolean } (Is Email in DB)
export function resetPassword(password: string) {
  return axios.put(RESET_PASSWORD_URL, {
    password,
  })
}

export function getUserByToken() {
  return axios.get<UserModel>(GET_USER_BY_ACCESSTOKEN_URL)
}

export function requestRefreshToken(oldRefreshToken: string) {
  return axios.post<RefreshResponse>(REFRESH_TOKEN_URL, {
    refreshToken: oldRefreshToken,
  },)
}

/**
 * Fetch all ranks so we can look up rankName by rankId.
 */
export const getRanks = async (imoNumber: string): Promise<Rank[]> => {
  const res = await axios.get<Rank[]>(RANKS_API, {
    params: { vesselImo: imoNumber }
  });
  return res.data;
};

export const getVesselsByCompany = async (companyUsername: string): Promise<Vessel[]> => {
  const VESSELS_API = `${API_URL}/vessels/vessels-by-cga`;
  const res = await axios.get<Vessel[]>(VESSELS_API, {
    params: { companyUsername }
  });
  return res.data;
};