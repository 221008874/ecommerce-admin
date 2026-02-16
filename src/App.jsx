// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import SignIn from './pages/SignIn'
import DashboardRouter from './pages/DashboardRouter'

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Root route - redirect to login if not authenticated, dashboard if authenticated */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* Login route */}
        <Route path="/login" element={<SignIn />} />
        
        {/* Dashboard route */}
        <Route path="/dashboard" element={<DashboardRouter />} />
        
        {/* Catch all - redirect to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  )
}

export default App