// src/pages/SignUp.jsx
import { useState } from 'react'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../services/firebase'
import { useNavigate, Link } from 'react-router-dom'

export default function SignUp() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)
    try {
      await createUserWithEmailAndPassword(auth, email, password)
      alert('Admin account created! Please sign in.')
      navigate('/login')
    } catch (err) {
      console.error(err)
      let message = 'Failed to create account.'
      if (err.code === 'auth/email-already-in-use') {
        message = 'This email is already registered.'
      } else if (err.code === 'auth/invalid-email') {
        message = 'Invalid email address.'
      }
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: '#FFFFFF',
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        background: '#FAFAFA',
        padding: '48px 40px',
        borderRadius: '8px',
        border: '1px solid #F0F0F0',
        animation: 'slideUp 0.5s ease-out'
      }}>
        <h2 style={{ 
          textAlign: 'center', 
          marginBottom: '8px', 
          color: '#2C2416',
          fontSize: '1.75rem',
          fontWeight: '700',
          letterSpacing: '-0.5px'
        }}>
          Create Admin Account
        </h2>
        
        <p style={{
          textAlign: 'center',
          marginBottom: '32px',
          color: '#666666',
          fontSize: '0.95rem'
        }}>
          Get started with your dashboard
        </p>

        {error && (
          <div style={{
            background: '#FFEBEE',
            color: '#EF5350',
            padding: '12px 16px',
            borderRadius: '6px',
            marginBottom: '24px',
            fontSize: '0.9rem',
            border: '1px solid #FFCDD2'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label 
              htmlFor="email" 
              style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '600',
                color: '#2C2416',
                fontSize: '0.9rem'
              }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@yourstore.com"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #E0E0E0',
                borderRadius: '6px',
                fontSize: '1rem',
                background: '#FFFFFF',
                transition: 'border-color 0.2s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = '#FF6B6B'}
              onBlur={(e) => e.target.style.borderColor = '#E0E0E0'}
              required
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label 
              htmlFor="password" 
              style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '600',
                color: '#2C2416',
                fontSize: '0.9rem'
              }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #E0E0E0',
                borderRadius: '6px',
                fontSize: '1rem',
                background: '#FFFFFF',
                transition: 'border-color 0.2s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = '#FF6B6B'}
              onBlur={(e) => e.target.style.borderColor = '#E0E0E0'}
              required
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label 
              htmlFor="confirmPassword" 
              style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '600',
                color: '#2C2416',
                fontSize: '0.9rem'
              }}
            >
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #E0E0E0',
                borderRadius: '6px',
                fontSize: '1rem',
                background: '#FFFFFF',
                transition: 'border-color 0.2s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = '#FF6B6B'}
              onBlur={(e) => e.target.style.borderColor = '#E0E0E0'}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: loading ? '#BDBDBD' : '#FF6B6B',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              fontSize: '1rem',
              fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.background = '#FF5252'
            }}
            onMouseLeave={(e) => {
              if (!loading) e.currentTarget.style.background = '#FF6B6B'
            }}
          >
            {loading ? 'Creating Account...' : 'Create Admin Account'}
          </button>
        </form>

        <p style={{ 
          textAlign: 'center', 
          marginTop: '24px', 
          fontSize: '0.95rem',
          color: '#666666'
        }}>
          Already have an account?{' '}
          <Link 
            to="/login" 
            style={{ 
              color: '#FF6B6B', 
              textDecoration: 'none',
              fontWeight: '600'
            }}
          >
            Sign In
          </Link>
        </p>
      </div>
    </div>
  )
}