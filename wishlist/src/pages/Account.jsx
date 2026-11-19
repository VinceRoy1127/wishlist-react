import { useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { supabase } from '../utils/supabase'

function getSafeRedirectPath(value) {
  if (!value) return '/'
  try {
    const url = new URL(value, window.location.origin)
    if (url.origin !== window.location.origin) return '/'
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return '/'
  }
}

function Account() {
  const [mode, setMode] = useState('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const submittingRef = useRef(false)
  const { authError } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const requestedRedirect = new URLSearchParams(location.search).get('redirect')
  const redirectPath = getSafeRedirectPath(requestedRedirect)

  async function submit(event) {
    event.preventDefault()
    if (submittingRef.current) return
    submittingRef.current = true
    setSubmitting(true)
    setError('')
    setMessage('')
    try {
      const result = mode === 'sign-in'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: new URL(redirectPath, window.location.origin).toString() },
        })
      if (result.error) throw result.error
      if (mode === 'sign-up' && !result.data.session) {
        setMessage('Check your email to confirm your account, then sign in.')
      } else {
        setMessage('You are signed in.')
        navigate(redirectPath)
      }
    } catch (submitError) {
      const errorMessage = submitError.message || String(submitError)
      if (mode === 'sign-up' && errorMessage.toLowerCase().includes('database error saving new user')) {
        setError('A signup request may already have created this account. Check your email for confirmation; if you already confirmed, switch to sign in.')
      } else {
        setError(errorMessage)
      }
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  return (
    <main className="account-page">
      <h2>{mode === 'sign-in' ? 'Welcome back' : 'Create your account'}</h2>
      {authError && <p className="form-error" role="alert">Authentication error: {authError}</p>}
      {supabase ? (
        <form className="account-form" onSubmit={submit}>
          <label htmlFor="account-email">Email</label>
          <input id="account-email" type="email" autoComplete="email" required
            value={email} onChange={(event) => setEmail(event.target.value)} />
          <label htmlFor="account-password">Password</label>
          <input id="account-password" type="password" autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
            minLength={mode === 'sign-up' ? 8 : undefined} required value={password}
            onChange={(event) => setPassword(event.target.value)} />
          <button type="submit" disabled={submitting}>
            {submitting ? 'Please wait…' : mode === 'sign-in' ? 'Sign in' : 'Create account'}
          </button>
          <button type="button" className="text-button" disabled={submitting} onClick={() => setMode(
            mode === 'sign-in' ? 'sign-up' : 'sign-in',
          )}>
            {mode === 'sign-in' ? 'Need an account? Sign up' : 'Already registered? Sign in'}
          </button>
          {message && <p role="status">{message}</p>}
          {error && <p className="form-error" role="alert">{error}</p>}
        </form>
      ) : (
        <p>To enable accounts, connect a Supabase project using the setup steps in <code>wishlist/README.md</code>.</p>
      )}
      <Link to="/">Back to wishlist</Link>
    </main>
  )
}

export default Account
