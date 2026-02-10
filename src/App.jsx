// src/App.jsx
import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import SignIn from './pages/SignUp'
import SignUp from './pages/SignIn'     // 👈 new
import Dashboard from './pages/Dashboard'

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/signup" element={<SignUp />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/" element={<SignUp />} /> {/* Default: show sign-up first */}
        <Route path="*" element={<SignUp />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
