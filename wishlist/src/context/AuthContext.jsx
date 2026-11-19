import { useEffect, useState } from 'react'
import AuthContext from './authContext'
import { supabase } from '../utils/supabase'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(Boolean(supabase))
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    if (!supabase) return undefined

    supabase.auth.getSession().then(({ data, error }) => {
      if (error) throw error
      setUser(data.session?.user ?? null)
      setAuthError('')
      setLoading(false)
    }).catch((error) => {
      setAuthError(error.message)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setAuthError('')
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, authError }}>
      {children}
    </AuthContext.Provider>
  )
}
