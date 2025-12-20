// src/app/modules/Crewing/auth/AuthProvider.tsx
import React, { FC, useState, useEffect, createContext, useContext, Dispatch, SetStateAction, useRef } from 'react'
import { LayoutSplashScreen } from '../../../../_metronic/layout/core'
import { AuthModel, UserModel } from './_models'
import * as authHelper from './AuthHelpers'
import axios from 'axios'
import { WithChildren } from '../../../../_metronic/helpers'
import { getUserByToken } from './_requests'

const API_URL = process.env.REACT_APP_API_URL

// 1) Context shape: only auth, saveAuth, logout
type AuthContextProps = {
  auth: AuthModel | undefined
  saveAuth: (auth: AuthModel | undefined) => void
  currentUser: UserModel | undefined
  setCurrentUser: Dispatch<SetStateAction<UserModel | undefined>>
  logout: () => void
}

const initAuthContextPropsState = {
  auth: authHelper.getAuth(),
  saveAuth: () => { },
  currentUser: undefined,
  setCurrentUser: () => { },
  logout: () => { },
}


const AuthContext = createContext<AuthContextProps>(initAuthContextPropsState)
export const useAuth = () => useContext(AuthContext)

export const AuthProvider: FC<WithChildren> = ({ children }) => {
  const [auth, setAuth] = useState<AuthModel | undefined>(authHelper.getAuth())
  const [currentUser, setCurrentUser] = useState<UserModel | undefined>()

  useEffect(() => {
  if (!currentUser) return;

  // Keep lastRoleId updated from /profile/me (more reliable than login payload)
  if (currentUser.role?.id) {
    sessionStorage.setItem('lastRoleId', String(currentUser.role.id));
  }

  // Derive companyUsername from /profile/me
  const derived = computeCompanyUsernameFromUser(currentUser);
  if (derived) {
    sessionStorage.setItem('companyUsername', derived);
  } else {
    // Fallback: if we are on /auth/:companyUsername, capture from URL
    const m = window.location.pathname.match(/^\/auth\/([^/]+)(?:\/|$)/);
    if (m && m[1] && !['login', 'forgot-password', 'registration'].includes(m[1])) {
      sessionStorage.setItem('companyUsername', m[1]);
    } else {
      sessionStorage.removeItem('companyUsername');
    }
  }
}, [currentUser]);

  const saveAuth = (newAuth: AuthModel | undefined) => {
    setAuth(newAuth)
    if (newAuth) {
  authHelper.setAuth(newAuth);
  // Only remember lastRoleId here; do NOT try to compute companyUsername from login payload.
  const roleId = newAuth.role.id;
  sessionStorage.setItem('lastRoleId', String(roleId));
} else {
  authHelper.removeAuth();
  sessionStorage.clear(); // clear sessionStorage on logout
}

  }

  const logout = async () => {
  // Read before clearing
  const companyUsername = sessionStorage.getItem('companyUsername');
  const lastRoleId = sessionStorage.getItem('lastRoleId');

  try {
    await axios.post(`${API_URL}/auth/logout`);
  } catch (err) {
    console.error('Logout API failed', err);
  }

  saveAuth(undefined);
  setCurrentUser(undefined);

  // Decide target: default /auth, else /auth/:companyUsername (+ crew -> ship-login)
  let target = '/auth';
  if (companyUsername) {
    target = `/auth/${companyUsername}`;
    if (lastRoleId === '4') target += '/ship-login';
  }

  window.location.replace(target); // replace() avoids back-stack glitches
};


 function computeCompanyUsernameFromUser(u?: UserModel): string | undefined {
  if (!u?.role?.id) return undefined;
  const roleId = u.role.id;

  // We need CGA username for most cases; your /profile/me examples show it present.
  const cgaUsername =
    (u as any)?.companyGroupAdmin?.username ??
    (u as any)?.vessel?.companyGroupAdmin?.username;

  const caUsername =
    (u as any)?.companyAdmin?.username ??
    (u as any)?.vessel?.companyAdmin?.username;

  /**
   * Mapping:
   * 1 SUPER_ADMIN           -> no username (=> /auth)
   * 5 COMPANY_GROUP_ADMIN   -> CGA username
   * 2 COMPANY_ADMIN         -> CGA username (your requirement)
   * 4 CREW                  -> CGA username
   * 6 OPERATOR:
   *    - under company      -> CGA username (fallback CA username)
   *    - under superadmin   -> none
   */
  switch (roleId) {
    case 5:
      return cgaUsername;
    case 2:
      return cgaUsername; // NOTE: role 2 must use CGA username (e.g., cosco309)
    case 4:
      return cgaUsername;
    case 6:
      return cgaUsername ?? undefined;
    default:
      return undefined; // 1 SUPER_ADMIN
  }
}
 

  return (
    <AuthContext.Provider value={{ auth, saveAuth, currentUser, setCurrentUser, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// AuthInit: wait for auth.jwt presence before hiding splash
export const AuthInit: FC<WithChildren> = ({ children }) => {
  const { auth, logout, setCurrentUser } = useAuth()
  const [showSplash, setShowSplash] = useState(true)
  const didRequest = useRef(false)

  // useEffect(() => {
  //   if (auth && auth.jwt) {
  //     setShowSplash(false)
  //   } else {
  //     logout()
  //     setShowSplash(false)
  //   }
  // }, [auth, logout])

  useEffect(() => {
    const requestUser = async () => {
      try {
        if (!didRequest.current) {
          const { data } = await getUserByToken();
          if (data) {
            setCurrentUser(data);
          }
        }
      } catch (error) {
        console.error(error);
        if (!didRequest.current) {
          logout();
        }
      } finally {
        setShowSplash(false);
      }
      didRequest.current = true;
    };

    if (auth && auth.auth?.jwt) {
      requestUser();
    } else {
      // logout();
      setShowSplash(false);
    }
    // eslint-disable-next-line
  }, []);

  return showSplash ? <LayoutSplashScreen /> : <>{children}</>
}

