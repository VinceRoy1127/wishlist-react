import { Route, Routes } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import AddGift from './pages/AddGift'
import Home from './pages/Home'

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/addgift" element={<AddGift />} />
      </Routes>
      <Analytics />
    </>
  )
}

export default App
