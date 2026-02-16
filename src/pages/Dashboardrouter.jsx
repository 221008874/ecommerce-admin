// src/pages/DashboardRouter.jsx
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import DashboardPi from './DashboardPi'
import DashboardEGP from './DashboardEGP'

export default function DashboardRouter() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [activeDashboard, setActiveDashboard] = useState('pi') // 'pi' or 'egp'

  useEffect(() => {
    if (!currentUser) {
      navigate('/login')
      return
    }
  }, [currentUser, navigate])

  if (!currentUser) {
    return null
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <style jsx>{`
        .dashboard-switcher {
          background: #ffffff;
          border-bottom: 1px solid #e2e8f0;
          padding: 0;
          position: sticky;
          top: 0;
          z-index: 50;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .switcher-content {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          padding: 0;
        }

        .switcher-tabs {
          display: flex;
          gap: 0;
          flex: 1;
        }

        .switcher-tab {
          padding: 20px 32px;
          border: none;
          background: transparent;
          color: #64748b;
          font-weight: 700;
          font-size: 1rem;
          cursor: pointer;
          border-bottom: 3px solid transparent;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 8px;
          position: relative;
        }

        .switcher-tab:hover {
          color: #0f172a;
          background: #f8fafc;
        }

        .switcher-tab.active {
          color: #0f172a;
          border-bottom-color: #0f172a;
          background: transparent;
        }

        .tab-icon {
          font-size: 1.2rem;
        }

        .tab-label {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 2px;
        }

        .tab-name {
          font-size: 1rem;
          font-weight: 700;
        }

        .tab-desc {
          font-size: 0.75rem;
          color: #94a3b8;
          font-weight: 500;
        }

        @media (max-width: 768px) {
          .switcher-tab {
            padding: 16px 20px;
            font-size: 0.9rem;
          }

          .tab-desc {
            display: none;
          }

          .tab-icon {
            font-size: 1rem;
          }
        }

        @media (max-width: 480px) {
          .switcher-tab {
            padding: 12px 12px;
            flex: 1;
            justify-content: center;
          }

          .tab-name {
            font-size: 0.9rem;
          }

          .tab-label {
            display: flex;
            align-items: center;
            flex-direction: row;
          }
        }
      `}</style>

      {/* Dashboard Switcher */}
      <div className="dashboard-switcher">
        <div className="switcher-content">
          <div className="switcher-tabs">
            <button
              className={`switcher-tab ${activeDashboard === 'pi' ? 'active' : ''}`}
              onClick={() => setActiveDashboard('pi')}
            >
              <span className="tab-icon">π</span>
              <div className="tab-label">
                <span className="tab-name">Pi Network</span>
                <span className="tab-desc">Web3 Store</span>
              </div>
            </button>

            <button
              className={`switcher-tab ${activeDashboard === 'egp' ? 'active' : ''}`}
              onClick={() => setActiveDashboard('egp')}
            >
              <span className="tab-icon">💷</span>
              <div className="tab-label">
                <span className="tab-name">EGP Store</span>
                <span className="tab-desc">Cash on Delivery</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      {activeDashboard === 'pi' && <DashboardPi />}
      {activeDashboard === 'egp' && <DashboardEGP />}
    </div>
  )
}