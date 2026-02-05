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

  const passwordStrength = password.length > 0 ? Math.min(Math.ceil(password.length / 3), 3) : 0
  const strengthLabels = ['', 'Weak', 'Medium', 'Strong']
  const strengthColors = ['', '#ef5350', '#ff9800', '#4caf50']

  return (
    <div className="signup-container">
      <style jsx>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        .signup-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
          padding: 20px;
          position: relative;
          overflow: hidden;
        }

        .signup-container::before {
          content: '';
          position: absolute;
          inset: 0;
          background: 
            radial-gradient(circle at 20% 50%, rgba(15, 23, 42, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(30, 41, 59, 0.1) 0%, transparent 50%);
          pointer-events: none;
        }

        .signup-wrapper {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 440px;
          animation: slideUp 0.6s ease-out;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(40px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .signup-card {
          background: #ffffff;
          padding: 48px 40px;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(10px);
        }

        .signup-header {
          margin-bottom: 32px;
          text-align: center;
        }

        .signup-icon {
          font-size: 3rem;
          margin-bottom: 16px;
          display: inline-block;
          animation: bounce 0.8s ease-in-out infinite;
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }

        .signup-title {
          font-size: 1.75rem;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.5px;
          margin-bottom: 8px;
        }

        .signup-subtitle {
          color: #64748b;
          font-size: 0.95rem;
          line-height: 1.5;
        }

        .alert {
          padding: 14px 16px;
          border-radius: 12px;
          margin-bottom: 24px;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          gap: 12px;
          animation: slideDown 0.3s ease-out;
          background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
          border: 1px solid #fca5a5;
          color: #991b1b;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-label {
          font-size: 0.9rem;
          font-weight: 700;
          color: #0f172a;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .form-input {
          padding: 12px 14px;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          font-size: 1rem;
          background: #f8fafc;
          color: #0f172a;
          font-family: inherit;
          transition: all 0.3s ease;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .form-input:focus {
          outline: none;
          border-color: #0f172a;
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.1);
          transform: translateY(-1px);
        }

        .form-input::placeholder {
          color: #cbd5e1;
        }

        .password-strength {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.8rem;
          margin-top: 4px;
        }

        .strength-bars {
          display: flex;
          gap: 3px;
        }

        .strength-bar {
          width: 16px;
          height: 3px;
          border-radius: 2px;
          background: #e2e8f0;
          transition: all 0.3s ease;
        }

        .strength-bar.active {
          background: currentColor;
        }

        .strength-text {
          font-weight: 600;
          color: currentColor;
          flex-shrink: 0;
        }

        .submit-btn {
          padding: 14px;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          color: #ffffff;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.2);
          margin-top: 8px;
        }

        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(15, 23, 42, 0.3);
        }

        .submit-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .submit-btn-text {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .signup-footer {
          margin-top: 28px;
          padding-top: 24px;
          border-top: 1px solid #e2e8f0;
          text-align: center;
          font-size: 0.95rem;
          color: #64748b;
        }

        .signup-footer-text {
          margin-bottom: 8px;
        }

        .signin-link {
          color: #0f172a;
          text-decoration: none;
          font-weight: 700;
          transition: all 0.3s ease;
          position: relative;
        }

        .signin-link::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          width: 0;
          height: 2px;
          background: #0f172a;
          transition: width 0.3s ease;
        }

        .signin-link:hover::after {
          width: 100%;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .signup-card {
            padding: 40px 32px;
            border-radius: 12px;
          }

          .signup-title {
            font-size: 1.5rem;
          }

          .signup-icon {
            font-size: 2.5rem;
          }

          .signup-header {
            margin-bottom: 28px;
          }
        }

        @media (max-width: 480px) {
          .signup-wrapper {
            max-width: 100%;
          }

          .signup-card {
            padding: 32px 24px;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
          }

          .signup-title {
            font-size: 1.35rem;
          }

          .signup-icon {
            font-size: 2rem;
            margin-bottom: 12px;
          }

          .signup-header {
            margin-bottom: 24px;
          }

          .signup-subtitle {
            font-size: 0.9rem;
          }

          .form {
            gap: 16px;
          }

          .form-label {
            font-size: 0.85rem;
          }

          .form-input {
            padding: 11px 12px;
            font-size: 16px;
          }

          .submit-btn {
            padding: 12px;
            font-size: 0.95rem;
            margin-top: 6px;
          }

          .signup-footer {
            margin-top: 24px;
            padding-top: 20px;
            font-size: 0.9rem;
          }

          .password-strength {
            font-size: 0.75rem;
          }

          .strength-bar {
            width: 14px;
            height: 2.5px;
          }
        }

        @media (max-width: 360px) {
          .signup-card {
            padding: 28px 20px;
          }

          .signup-title {
            font-size: 1.2rem;
          }

          .signup-icon {
            font-size: 1.8rem;
          }

          .form-group {
            gap: 6px;
          }

          .form-label {
            font-size: 0.8rem;
          }

          .form-input {
            padding: 10px 11px;
            font-size: 15px;
          }
        }
      `}</style>

      <div className="signup-wrapper">
        <div className="signup-card">
          <div className="signup-header">
            <div className="signup-icon">✨</div>
            <h1 className="signup-title">Create Admin Account</h1>
            <p className="signup-subtitle">Set up your dashboard access</p>
          </div>

          {error && (
            <div className="alert">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="form">
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                <span>✉️</span>
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@yourstore.com"
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                <span>🔑</span>
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="form-input"
                required
              />
              {password.length > 0 && (
                <div className="password-strength" style={{ color: strengthColors[passwordStrength] }}>
                  <div className="strength-bars">
                    {[1, 2, 3].map(i => (
                      <div
                        key={i}
                        className={`strength-bar ${i <= passwordStrength ? 'active' : ''}`}
                      />
                    ))}
                  </div>
                  <span className="strength-text">{strengthLabels[passwordStrength]}</span>
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">
                <span>✓</span>
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="form-input"
                required
              />
            </div>

            <button type="submit" disabled={loading} className="submit-btn">
              <span className="submit-btn-text">
                {loading ? (
                  <>
                    <div className="spinner"></div>
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <span>🚀</span>
                    <span>Create Account</span>
                  </>
                )}
              </span>
            </button>
          </form>

          <div className="signup-footer">
            <p className="signup-footer-text">Already have an account?</p>
            <Link to="/login" className="signin-link">
              Sign in here
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}