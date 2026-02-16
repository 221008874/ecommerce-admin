// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import SignIn from './pages/SignIn'
import DashboardRouter from './pages/DashboardRouter'

function App() {
  return (
    <AuthProvider>
      <Routes>
<<<<<<< HEAD
        {/* Root route - redirect to login if not authenticated, dashboard if authenticated */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* Login route */}
        <Route path="/login" element={<SignIn />} />
        
        {/* Dashboard route */}
        <Route path="/dashboard" element={<DashboardRouter />} />
        
        {/* Catch all - redirect to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
=======
        <Route path="/signup" element={<SignUp />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/" element={<SignUp />} /> {/* Default: show sign-up first */}
        <Route path="*" element={<SignUp />} />
>>>>>>> 27288618fc4b4c28340a70b1454917150012fa80
      </Routes>
    </AuthProvider>
  )
}

export default App
