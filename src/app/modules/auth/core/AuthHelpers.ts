import axios, { AxiosError, AxiosInstance } from 'axios'
import { AuthModel } from './_models'
import { requestRefreshToken } from './_requests'

const AUTH_LOCAL_STORAGE_KEY = 'kt-auth-react-v'

const getAuth = (): AuthModel | undefined => {
  const lsValue = localStorage.getItem(AUTH_LOCAL_STORAGE_KEY)
  if (!lsValue) {
    return
  }

  try {
    const auth: AuthModel = JSON.parse(lsValue) as AuthModel
    return auth
  } catch (error) {
    console.error('AUTH LOCAL STORAGE PARSE ERROR', error)
    return undefined
  }
}

const setAuth = (auth: AuthModel) => {
  try {
    removeAuth();
    const lsValue = JSON.stringify(auth);
    localStorage.setItem(AUTH_LOCAL_STORAGE_KEY, lsValue);

    // Set a timer to refresh the token before it expires
    // if (auth.auth?.jwt && auth.auth?.expiryIn) {
    //   const refreshTime = (auth.auth?.expiryIn - 300) * 1000; // 5 minutes before expiry
    //   setTimeout(() => {
    //     refreshToken();
    //   }, refreshTime);
    // }
  } catch (error) {
    console.error('AUTH LOCAL STORAGE SAVE ERROR', error);
  }
};

const removeAuth = () => {
  try {
    localStorage.removeItem(AUTH_LOCAL_STORAGE_KEY)
  } catch (error) {
    console.error('AUTH LOCAL STORAGE REMOVE ERROR', error)
  }
}

export async function tryRefreshOrLogout(): Promise<string> {
  const prev = getAuth();
  const oldRefresh = prev?.auth?.refreshToken;

  if (!oldRefresh) {
    removeAuth();
    window.location.href = '/auth/login';
    return Promise.reject(new Error('no refresh token'));
  }

  try {
    const { data, status } = await requestRefreshToken(oldRefresh);

    // Check if the status code is 200
    if (status !== 200) {
      throw new Error('Refresh token request failed with status: ' + status);
    }

    const newAuth: AuthModel = {
      auth: {
        jwt: data.accessToken,
        refreshToken: data.refreshToken,
        expiryIn: data.accessExpiryIn,
      },
      // carry over the rest:
      role: prev.role,
      roleEntityId: prev.roleEntityId,
      roleEntityName: prev.roleEntityName,
      userDetails: prev.userDetails,
    };

    setAuth(newAuth);
    return data.accessToken;

  } catch (err) {
    console.error('refresh failed', err);
    // Get companyUsername before removing auth (which may clear storage indirectly)
    const companyUsername = sessionStorage.getItem('companyUsername');
    removeAuth();
    // window.location.href = '/auth/login';
    window.location.href = companyUsername ? `/auth/${companyUsername}` : '/auth/login';
    return Promise.reject(err);
  }
}

// Axios interceptor setup function
export function setupAxios(axiosInstance: AxiosInstance) {
  axiosInstance.defaults.headers.common['Accept'] = 'application/json'

  axiosInstance.interceptors.request.use(config => {
    const auth = getAuth()
    if (auth?.auth?.jwt && config.headers) {
      config.headers.Authorization = `Bearer ${auth.auth.jwt}`
    }
    return config
  })

  // axiosInstance.interceptors.response.use(
  //   res => res,
  //   async (error: AxiosError & { config?: any }) => {
  //     const original = error.config
  //     if (
  //       error.response?.status === 401 &&
  //       original &&
  //       !original._retry
  //     ) {
  //       original._retry = true
  //       // attempt refresh (or redirect to login)
  //       const token = await tryRefreshOrLogout()
  //       original.headers = {
  //         ...original.headers,
  //         Authorization: `Bearer ${token}`,
  //       }
  //       return axiosInstance(original)
  //     }
  //     return Promise.reject(error)
  //   }
  // )
}

export { getAuth, setAuth, removeAuth, AUTH_LOCAL_STORAGE_KEY }
