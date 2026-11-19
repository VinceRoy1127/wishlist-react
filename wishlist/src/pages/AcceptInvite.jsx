import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { acceptEditorInvite } from '../utils/workspace'

function AcceptInvite() {
  const { token } = useParams()
  const { user, loading } = useAuth()
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    acceptEditorInvite(token)
      .then(() => setMessage('You now have editor access to this wishlist.'))
      .catch((acceptError) => setError(acceptError.message))
  }, [token, user])

  return (
    <main className="account-page">
      <h2>Join a shared wishlist</h2>
      {loading && <p>Checking your account…</p>}
      {!loading && !user && (
        <p>
          <Link to={`/account?redirect=${encodeURIComponent(`/invite/${token}`)}`}>
            Sign in or create an account
          </Link>{' '}to accept this editor invitation.
        </p>
      )}
      {message && <p role="status">{message}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {user && <Link to="/">Open your wishlists</Link>}
    </main>
  )
}

export default AcceptInvite
