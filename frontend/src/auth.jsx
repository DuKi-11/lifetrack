import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, getToken, setToken, setUnauthorizedHandler } from './api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  // "loading" while we check a saved token on first load
  const [status, setStatus] = useState(getToken() ? 'loading' : 'signedOut')

  const signOut = useCallback(() => {
    setToken(null)
    setUser(null)
    setStatus('signedOut')
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(signOut)
    if (!getToken()) return
    api.me()
      .then((u) => { setUser(u); setStatus('signedIn') })
      .catch(() => signOut())
  }, [signOut])

  const finish = (res) => {
    setToken(res.token)
    setUser(res.user)
    setStatus('signedIn')
    return res.user
  }

  const value = useMemo(() => ({
    user,
    status,
    signIn: async (email, password) => finish(await api.signIn(email, password)),
    signUp: async (name, email, password) => finish(await api.signUp(name, email, password)),
    updateProfile: async (profile) => {
      const updated = await api.updateProfile(profile)
      setUser(updated)
      return updated
    },
    refreshUser: async () => { const u = await api.me(); setUser(u); return u },
    signOut,
  }), [user, status, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
