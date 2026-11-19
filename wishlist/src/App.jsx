import { Route, Routes } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import AddGift from './pages/AddGift'
import Account from './pages/Account'
import AcceptInvite from './pages/AcceptInvite'
import Home from './pages/Home'
import SharedWishlist from './pages/SharedWishlist'
import { AuthProvider } from './context/AuthContext'

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/addgift" element={<AddGift />} />
        <Route path="/account" element={<Account />} />
        <Route path="/share/:token" element={<SharedWishlist />} />
        <Route path="/invite/:token" element={<AcceptInvite />} />
      </Routes>
      <Analytics />
    </AuthProvider>
  )
}

export default App
