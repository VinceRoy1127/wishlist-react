import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CiGift } from 'react-icons/ci'
import { supabase } from '../utils/supabase'
import { useAuth } from '../context/useAuth'
import '../styles/Header.css'
function Header() {
  const { user } = useAuth()
  const [signOutError, setSignOutError] = useState('')

  async function signOut() {
    setSignOutError('')
    try {
      const { error } = await supabase.auth.signOut()
      if (error) setSignOutError(error.message)
    } catch (error) {
      setSignOutError(error.message)
    }
  }

  return (
        <nav className="header">
            <div className="header-gift-icon">
                <CiGift size={27} />
            </div>
            <div className="header-title">
                <h1>Wishlistr</h1>
            </div>
            <div className="header-account">
              {user ? (
                <button type="button" onClick={signOut}>Sign out</button>
              ) : (
                <Link to="/account">Account</Link>
              )}
              {signOutError && <p className="form-error" role="alert">{signOutError}</p>}
            </div>
        </nav>
  )
}

export default Header