import React from 'react'
import { NavLink } from 'react-router-dom'
import { CiGift } from 'react-icons/ci'
import '../styles/Header.css'
function Header() {
  return (
    <>
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
        </nav>
    </>
  )
}

export default Header