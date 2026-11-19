import React from 'react'
import { useState } from 'react'
import { NavLink } from 'react-router-dom'
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
            <div className="header-tabs">
              <div className="header-text">
                <NavLink to="/" className="header-text-view">View Gifts</NavLink>
                <NavLink to="/addgift" className="header-text-add">Add Gifts</NavLink>
              </div>
            </div>
            <div className="header-account">
              {user ? (
                <button type="button" onClick={signOut}>Sign out</button>
              ) : (
                <NavLink to="/account">Account</NavLink>
              )}
              {signOutError && <p className="form-error" role="alert">{signOutError}</p>}
            </div>
        </nav>
  )
}

export default Header