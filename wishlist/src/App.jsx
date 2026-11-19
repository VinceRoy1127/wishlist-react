import { Navigate, Route, Routes } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import Account from './pages/Account'
import Folder from './pages/Folder'
import Home from './pages/Home'
import SharedFolder from './pages/SharedFolder'
import { AuthProvider } from './context/AuthContext'
import './App.css'

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/account" element={<Account />} />
        <Route path="/folders/:folderId" element={<Folder />} />
        <Route path="/share/:token" element={<SharedFolder />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Analytics />
    </AuthProvider>
  )
}

export default App
