// src/pages/Dashboard.jsx
import { useEffect, useState, useMemo } from 'react'
import { collection, getDocs, deleteDoc, doc, addDoc, updateDoc, query, orderBy, serverTimestamp, where, getDoc } from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { db, auth } from '../services/firebase'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import ProductForm from '../components/ProductForm'

export default function Dashboard() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [productsMap, setProductsMap] = useState({})
  const [orders, setOrders] = useState([])
  const [confirmedPayments, setConfirmedPayments] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('products')
  const [confirmPaymentModal, setConfirmPaymentModal] = useState(null)
  const [statsTimeRange, setStatsTimeRange] = useState('all') // 'all', 'today', 'week', 'month', 'year'

  useEffect(() => {
    if (!currentUser) {
      navigate('/login')
      return
    }
    loadProducts()
    loadOrders()
    loadConfirmedPayments()
  }, [currentUser, navigate])

  // Calculate statistics
  const statistics = useMemo(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate())
    const yearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate())

    const filterByDate = (items, dateField) => {
      if (statsTimeRange === 'all') return items
      return items.filter(item => {
        const itemDate = item[dateField]?.toDate ? item[dateField].toDate() : new Date(item[dateField])
        if (statsTimeRange === 'today') return itemDate >= today
        if (statsTimeRange === 'week') return itemDate >= weekAgo
        if (statsTimeRange === 'month') return itemDate >= monthAgo
        if (statsTimeRange === 'year') return itemDate >= yearAgo
        return true
      })
    }

    const filteredOrders = filterByDate(orders, 'createdAt')
    const filteredConfirmed = filterByDate(confirmedPayments, 'confirmedAt')
    const filteredProducts = filterByDate(products, 'createdAt')

    // Revenue calculations
    const totalRevenue = filteredConfirmed.reduce((sum, p) => sum + (p.totalPrice || 0), 0)
    const totalOrders = filteredOrders.length
    const totalConfirmedOrders = filteredConfirmed.length
    const averageOrderValue = totalConfirmedOrders > 0 ? totalRevenue / totalConfirmedOrders : 0

    // Product statistics
    const totalProducts = products.length
    const totalStock = products.reduce((sum, p) => sum + (p.piecesPerBox || 0), 0)
    const averagePrice = products.length > 0 
      ? products.reduce((sum, p) => sum + (p.price || 0), 0) / products.length 
      : 0

    // Top selling products
    const productSales = {}
    filteredConfirmed.forEach(payment => {
      payment.items?.forEach(item => {
        const id = item.id || item.name
        if (!productSales[id]) {
          productSales[id] = {
            name: item.name,
            quantity: 0,
            revenue: 0,
            imageUrl: item.imageUrl || productsMap[id]?.imageUrl
          }
        }
        productSales[id].quantity += item.quantity || 0
        productSales[id].revenue += (item.price || 0) * (item.quantity || 0)
      })
    })

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)

    // Flavor statistics
    const flavorStats = {}
    products.forEach(product => {
      product.flavors?.forEach(flavor => {
        if (!flavorStats[flavor]) {
          flavorStats[flavor] = { count: 0, products: [] }
        }
        flavorStats[flavor].count++
        flavorStats[flavor].products.push(product.name)
      })
    })

    // Order status breakdown
    const orderStatusBreakdown = {
      pending: filteredOrders.filter(o => o.status === 'completed' && !o.adminConfirmed).length,
      confirmed: filteredConfirmed.length,
      total: filteredOrders.length
    }

    // Daily revenue for chart (last 30 days)
    const dailyRevenue = {}
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      return d.toISOString().split('T')[0]
    }).reverse()

    last30Days.forEach(date => {
      dailyRevenue[date] = 0
    })

    filteredConfirmed.forEach(payment => {
      const date = payment.confirmedAt?.toDate 
        ? payment.confirmedAt.toDate().toISOString().split('T')[0]
        : new Date(payment.confirmedAt).toISOString().split('T')[0]
      if (dailyRevenue[date] !== undefined) {
        dailyRevenue[date] += payment.totalPrice || 0
      }
    })

    return {
      totalRevenue,
      totalOrders,
      totalConfirmedOrders,
      averageOrderValue,
      totalProducts,
      totalStock,
      averagePrice,
      topProducts,
      flavorStats,
      orderStatusBreakdown,
      dailyRevenue,
      conversionRate: totalOrders > 0 ? (totalConfirmedOrders / totalOrders) * 100 : 0
    }
  }, [orders, confirmedPayments, products, productsMap, statsTimeRange])

  const loadProducts = async () => {
    try {
      setIsLoading(true)
      const snapshot = await getDocs(collection(db, 'products'))
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setProducts(list)
      
      const map = {}
      list.forEach(product => {
        map[product.id] = product
      })
      setProductsMap(map)
    } catch (err) {
      console.error('Error loading products:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const getProductImage = (item) => {
    if (item.imageUrl) return item.imageUrl
    if (item.id && productsMap[item.id]?.imageUrl) {
      return productsMap[item.id].imageUrl
    }
    return null
  }

  const loadOrders = async () => {
    try {
      const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'))
      const snapshot = await getDocs(q)
      const list = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        adminConfirmed: doc.data().adminConfirmed || false
      }))
      setOrders(list)
    } catch (err) {
      console.error('Error loading orders:', err)
    }
  }

  const loadConfirmedPayments = async () => {
    try {
      const q = query(collection(db, 'confirmedPayments'), orderBy('confirmedAt', 'desc'))
      const snapshot = await getDocs(q)
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setConfirmedPayments(list)
    } catch (err) {
      console.error('Error loading confirmed payments:', err)
    }
  }

  const handleConfirmPayment = async (order) => {
    try {
      const enrichedItems = order.items?.map(item => ({
        ...item,
        imageUrl: getProductImage(item) || null
      })) || []

      await addDoc(collection(db, 'confirmedPayments'), {
        originalOrderId: order.id,
        orderId: order.orderId,
        paymentId: order.paymentId,
        customerInfo: { orderReference: order.orderId },
        items: enrichedItems,
        totalItems: order.totalItems || 0,
        totalPrice: order.totalPrice || 0,
        currency: order.currency || 'PI',
        originalCreatedAt: order.createdAt,
        confirmedBy: currentUser.uid,
        confirmedByEmail: currentUser.email,
        confirmedAt: serverTimestamp(),
        adminConfirmed: true,
        status: 'confirmed_for_shipping',
        shippingStatus: 'pending'
      })

      await updateDoc(doc(db, 'orders', order.id), {
        adminConfirmed: true,
        adminConfirmedAt: serverTimestamp(),
        adminConfirmedBy: currentUser.uid,
        shippingStatus: 'pending'
      })

      setConfirmPaymentModal(null)
      loadOrders()
      loadConfirmedPayments()
    } catch (err) {
      console.error('Error confirming payment:', err)
      alert('Error confirming payment. Please try again.')
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, 'products', id))
      setDeleteConfirm(null)
      loadProducts()
    } catch (err) {
      console.error('Error deleting product:', err)
    }
  }

  const handleSuccess = () => {
    setShowForm(false)
    setEditingProduct(null)
    loadProducts()
  }

  const handleEdit = (product) => {
    setEditingProduct(product)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
      navigate('/login')
    } catch (err) {
      console.error('Error logging out:', err)
    }
  }

  const filteredProducts = products.filter(p =>
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const pendingOrders = orders.filter(o => 
    o.status === 'completed' && !o.adminConfirmed
  )

  const filteredOrders = pendingOrders.filter(o =>
    o.orderId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.paymentId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.items?.some(item => item.name?.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A'
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (e) {
      return 'Invalid Date'
    }
  }

  const formatCurrency = (amount) => {
    return `π ${Number(amount).toFixed(2)}`
  }

  // Simple bar chart component
  const BarChart = ({ data, maxValue }) => {
    const entries = Object.entries(data)
    if (entries.length === 0) return <div className="empty-chart">No data available</div>
    
    return (
      <div className="bar-chart">
        {entries.map(([date, value], index) => {
          const height = maxValue > 0 ? (value / maxValue) * 100 : 0
          const displayDate = new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          return (
            <div key={date} className="bar-wrapper" title={`${displayDate}: ${formatCurrency(value)}`}>
              <div className="bar" style={{ height: `${Math.max(height, 4)}%` }}>
                {height > 20 && <span className="bar-value">{value > 0 ? 'π' + Math.round(value) : ''}</span>}
              </div>
              <span className="bar-label">{index % 5 === 0 ? displayDate : ''}</span>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="dashboard">
      <style jsx>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        .dashboard {
          min-height: 100vh;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
        }

        /* Header */
        .header {
          background: #ffffff;
          border-bottom: 1px solid #e2e8f0;
          padding: 20px 24px;
          position: sticky;
          top: 0;
          z-index: 100;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .header-content {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .header-title {
          font-size: 1.5rem;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.5px;
        }

        .header-badge {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          color: #ffffff;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .logout-btn {
          padding: 10px 18px;
          background: transparent;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          color: #0f172a;
          font-weight: 700;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .logout-btn:hover {
          background: #0f172a;
          color: #ffffff;
          border-color: #0f172a;
          transform: translateY(-2px);
        }

        /* Main Content */
        .main {
          padding: 40px 24px;
          max-width: 1400px;
          margin: 0 auto;
        }

        /* Navigation Tabs */
        .nav-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 32px;
          background: #ffffff;
          padding: 6px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          overflow-x: auto;
        }

        .nav-tab {
          padding: 12px 24px;
          border: none;
          background: transparent;
          color: #64748b;
          font-weight: 700;
          font-size: 0.95rem;
          cursor: pointer;
          border-radius: 8px;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 8px;
          position: relative;
          white-space: nowrap;
        }

        .nav-tab:hover {
          color: #0f172a;
          background: #f1f5f9;
        }

        .nav-tab.active {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          color: #ffffff;
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.2);
        }

        .tab-badge {
          background: rgba(255, 255, 255, 0.2);
          color: inherit;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 0.75rem;
          min-width: 20px;
          text-align: center;
        }

        /* Statistics Styles */
        .stats-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .stats-title {
          font-size: 1.8rem;
          font-weight: 800;
          color: #0f172a;
        }

        .time-range-selector {
          display: flex;
          gap: 8px;
          background: #ffffff;
          padding: 4px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
        }

        .time-range-btn {
          padding: 8px 16px;
          border: none;
          background: transparent;
          color: #64748b;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          border-radius: 6px;
          transition: all 0.3s ease;
        }

        .time-range-btn:hover {
          color: #0f172a;
          background: #f1f5f9;
        }

        .time-range-btn.active {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          color: #ffffff;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 20px;
          margin-bottom: 32px;
        }

        .stat-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .stat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 16px rgba(15, 23, 42, 0.1);
        }

        .stat-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
        }

        .stat-card.revenue::before { background: linear-gradient(135deg, #059669 0%, #047857 100%); }
        .stat-card.orders::before { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); }
        .stat-card.products::before { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }
        .stat-card.conversion::before { background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); }

        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          margin-bottom: 16px;
          background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
        }

        .stat-card.revenue .stat-icon { background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); }
        .stat-card.orders .stat-icon { background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); }
        .stat-card.products .stat-icon { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); }
        .stat-card.conversion .stat-icon { background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%); }

        .stat-label {
          font-size: 0.9rem;
          color: #64748b;
          font-weight: 600;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .stat-value {
          font-size: 2rem;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 8px;
        }

        .stat-change {
          font-size: 0.85rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .stat-change.positive { color: #059669; }
        .stat-change.negative { color: #dc2626; }

        .stats-sections {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 24px;
        }

        .stats-section {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .section-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 2px solid #f1f5f9;
        }

        .section-header-title {
          font-size: 1.2rem;
          font-weight: 700;
          color: #0f172a;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* Chart Styles */
        .chart-container {
          height: 250px;
          position: relative;
        }

        .bar-chart {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          height: 200px;
          gap: 4px;
          padding-bottom: 30px;
          border-bottom: 2px solid #e2e8f0;
        }

        .bar-wrapper {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          height: 100%;
          position: relative;
        }

        .bar {
          width: 100%;
          background: linear-gradient(180deg, #059669 0%, #047857 100%);
          border-radius: 4px 4px 0 0;
          min-height: 4px;
          transition: all 0.3s ease;
          position: relative;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding-bottom: 4px;
        }

        .bar:hover {
          opacity: 0.8;
          transform: scaleX(1.1);
        }

        .bar-value {
          color: #ffffff;
          font-size: 0.7rem;
          font-weight: 700;
          writing-mode: vertical-rl;
          text-orientation: mixed;
        }

        .bar-label {
          position: absolute;
          bottom: -25px;
          font-size: 0.7rem;
          color: #64748b;
          transform: rotate(-45deg);
          white-space: nowrap;
        }

        .empty-chart {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 200px;
          color: #94a3b8;
          font-size: 1rem;
        }

        /* Top Products List */
        .top-products-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .top-product-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 12px;
          background: #f8fafc;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          transition: all 0.2s ease;
        }

        .top-product-item:hover {
          background: #f1f5f9;
          border-color: #cbd5e1;
          transform: translateX(4px);
        }

        .top-product-rank {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.9rem;
        }

        .top-product-rank.top3 {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        }

        .top-product-image {
          width: 50px;
          height: 50px;
          border-radius: 8px;
          object-fit: cover;
          background: #e2e8f0;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .top-product-placeholder {
          width: 50px;
          height: 50px;
          border-radius: 8px;
          background: linear-gradient(135deg, #e0e7ff 0%, #ddd6fe 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .top-product-info {
          flex: 1;
        }

        .top-product-name {
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 4px;
        }

        .top-product-qty {
          font-size: 0.85rem;
          color: #64748b;
        }

        .top-product-revenue {
          font-weight: 800;
          color: #059669;
          font-size: 1.1rem;
        }

        /* Flavor Tags */
        .flavors-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .flavor-tag {
          padding: 8px 16px;
          background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          font-size: 0.9rem;
          color: #475569;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .flavor-tag .count {
          background: #0f172a;
          color: #ffffff;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 0.75rem;
        }

        /* Status Breakdown */
        .status-breakdown {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .status-item {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .status-bar-bg {
          flex: 1;
          height: 12px;
          background: #f1f5f9;
          border-radius: 6px;
          overflow: hidden;
        }

        .status-bar-fill {
          height: 100%;
          border-radius: 6px;
          transition: width 0.5s ease;
        }

        .status-bar-fill.pending { background: linear-gradient(90deg, #f59e0b 0%, #d97706 100%); }
        .status-bar-fill.confirmed { background: linear-gradient(90deg, #059669 0%, #047857 100%); }

        .status-info {
          min-width: 80px;
          text-align: right;
        }

        .status-count {
          font-weight: 700;
          color: #0f172a;
          font-size: 1.1rem;
        }

        .status-label {
          font-size: 0.8rem;
          color: #64748b;
        }

        /* Top Actions Bar */
        .actions-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          margin-bottom: 40px;
        }

        .add-btn {
          padding: 12px 24px;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          color: #ffffff;
          border: none;
          border-radius: 8px;
          font-weight: 700;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.3s ease;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.2);
          white-space: nowrap;
        }

        .add-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.3);
        }

        .search-box {
          flex: 1;
          max-width: 400px;
          position: relative;
        }

        .search-input {
          width: 100%;
          padding: 12px 16px 12px 40px;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          font-size: 1rem;
          background: #ffffff;
          transition: all 0.3s ease;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .search-input:focus {
          outline: none;
          border-color: #0f172a;
          box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.1);
        }

        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          font-size: 1.2rem;
        }

        /* Form Section */
        .form-section {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 32px;
          margin-bottom: 48px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          animation: slideDown 0.4s ease-out;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Section Headers */
        .section-header {
          margin-bottom: 32px;
        }

        .section-title {
          font-size: 1.5rem;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .section-count {
          background: linear-gradient(135deg, #e0e7ff 0%, #ddd6fe 100%);
          color: #3730a3;
          padding: 2px 10px;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 700;
        }

        .section-subtitle {
          color: #64748b;
          font-size: 0.95rem;
        }

        /* Products Grid */
        .products-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 28px;
        }

        .product-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.3s ease;
          display: flex;
          flex-direction: column;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          animation: fadeIn 0.4s ease-out;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .product-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 12px 24px rgba(15, 23, 42, 0.12);
          border-color: #cbd5e1;
        }

        .product-image-container {
          width: 100%;
          height: 240px;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          border-bottom: 1px solid #e2e8f0;
          position: relative;
        }

        .product-image-container img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease;
        }

        .product-card:hover .product-image-container img {
          transform: scale(1.05);
        }

        .product-placeholder {
          font-size: 3.5rem;
          animation: float 3s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }

        .product-content {
          padding: 24px;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .product-name {
          font-size: 1.1rem;
          font-weight: 700;
          color: #0f172a;
          line-height: 1.3;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .product-price {
          font-size: 1.5rem;
          font-weight: 800;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .product-meta {
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-size: 0.9rem;
          color: #64748b;
        }

        .product-actions {
          display: flex;
          gap: 12px;
          margin-top: auto;
        }

        .product-btn {
          flex: 1;
          padding: 10px 16px;
          border: 2px solid;
          border-radius: 8px;
          font-weight: 700;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.3s ease;
          background: transparent;
        }

        .product-btn.edit {
          border-color: #0f172a;
          color: #0f172a;
        }

        .product-btn.edit:hover {
          background: #0f172a;
          color: #ffffff;
          transform: translateY(-2px);
        }

        .product-btn.delete {
          border-color: #e11d48;
          color: #e11d48;
        }

        .product-btn.delete:hover {
          background: #e11d48;
          color: #ffffff;
          transform: translateY(-2px);
        }

        /* Orders Table */
        .orders-container {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .orders-table {
          width: 100%;
          border-collapse: collapse;
        }

        .orders-table th {
          background: #f8fafc;
          padding: 16px;
          text-align: left;
          font-weight: 700;
          color: #475569;
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 2px solid #e2e8f0;
        }

        .orders-table td {
          padding: 20px 16px;
          border-bottom: 1px solid #f1f5f9;
          color: #0f172a;
          font-size: 0.95rem;
        }

        .orders-table tr:hover {
          background: #f8fafc;
        }

        .orders-table tr:last-child td {
          border-bottom: none;
        }

        .order-id {
          font-family: monospace;
          font-size: 0.85rem;
          color: #64748b;
          background: #f1f5f9;
          padding: 4px 8px;
          border-radius: 4px;
          display: inline-block;
        }

        .payment-id {
          font-size: 0.8rem;
          color: #94a3b8;
          margin-top: 4px;
        }

        .order-items {
          max-width: 300px;
        }

        .order-item {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 0.9rem;
          color: #475569;
          margin-bottom: 8px;
          padding: 6px;
          background: #f8fafc;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }

        .item-image {
          width: 40px;
          height: 40px;
          border-radius: 6px;
          object-fit: cover;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
        }

        .item-placeholder {
          width: 40px;
          height: 40px;
          border-radius: 6px;
          background: linear-gradient(135deg, #e0e7ff 0%, #ddd6fe 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
          border: 1px solid #e2e8f0;
        }

        .item-details {
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        .item-name {
          font-weight: 600;
          color: #0f172a;
          font-size: 0.9rem;
        }

        .item-meta {
          font-size: 0.8rem;
          color: #64748b;
        }

        .order-total {
          font-weight: 800;
          font-size: 1.1rem;
          color: #0f172a;
        }

        .currency-badge {
          display: inline-block;
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: #ffffff;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 700;
          margin-left: 8px;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .status-badge.completed {
          background: #d1fae5;
          color: #065f46;
        }

        .status-badge.pending {
          background: #fef3c7;
          color: #92400e;
        }

        .confirm-btn {
          padding: 10px 20px;
          background: linear-gradient(135deg, #059669 0%, #047857 100%);
          color: #ffffff;
          border: none;
          border-radius: 8px;
          font-weight: 700;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.3s ease;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          box-shadow: 0 2px 8px rgba(5, 150, 105, 0.2);
        }

        .confirm-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);
        }

        /* Confirmed Payments Cards */
        .confirmed-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
          gap: 24px;
        }

        .confirmed-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          transition: all 0.3s ease;
          border-left: 4px solid #059669;
          animation: fadeIn 0.4s ease-out;
        }

        .confirmed-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 16px rgba(15, 23, 42, 0.1);
        }

        .confirmed-header {
          display: flex;
          justify-content: space-between;
          align-items: start;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid #f1f5f9;
        }

        .confirmed-ids {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .confirmed-order-id {
          font-family: monospace;
          font-size: 0.9rem;
          color: #0f172a;
          font-weight: 700;
        }

        .confirmed-payment-id {
          font-size: 0.8rem;
          color: #64748b;
        }

        .confirmed-date {
          font-size: 0.85rem;
          color: #059669;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 6px;
          background: #d1fae5;
          padding: 6px 12px;
          border-radius: 20px;
        }

        .confirmed-section {
          margin-bottom: 16px;
        }

        .confirmed-label {
          font-size: 0.8rem;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 12px;
          font-weight: 700;
        }

        .confirmed-items-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .confirmed-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 12px;
          background: #f8fafc;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          transition: all 0.2s ease;
        }

        .confirmed-item:hover {
          background: #f1f5f9;
          border-color: #cbd5e1;
        }

        .confirmed-item-image {
          width: 60px;
          height: 60px;
          border-radius: 8px;
          object-fit: cover;
          background: #e2e8f0;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .confirmed-item-placeholder {
          width: 60px;
          height: 60px;
          border-radius: 8px;
          background: linear-gradient(135deg, #e0e7ff 0%, #ddd6fe 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .confirmed-item-info {
          flex: 1;
        }

        .confirmed-item-name {
          font-weight: 700;
          color: #0f172a;
          font-size: 1rem;
          margin-bottom: 4px;
        }

        .confirmed-item-qty {
          font-size: 0.9rem;
          color: #64748b;
        }

        .confirmed-item-price {
          font-weight: 800;
          color: #059669;
          font-size: 1.1rem;
        }

        .confirmed-total {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
          border-radius: 10px;
          margin-top: 16px;
          border: 2px solid #059669;
        }

        .confirmed-total-label {
          font-weight: 700;
          color: #065f46;
          font-size: 1rem;
        }

        .confirmed-total-amount {
          font-size: 1.5rem;
          font-weight: 800;
          color: #059669;
        }

        .confirmed-meta {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #f1f5f9;
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 0.85rem;
          color: #64748b;
        }

        .confirmed-meta-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .shipping-status {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 700;
          background: #fef3c7;
          color: #92400e;
        }

        .shipping-status.shipped {
          background: #dbeafe;
          color: #1e40af;
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 200;
          animation: fadeIn 0.2s ease-out;
          padding: 20px;
          backdrop-filter: blur(4px);
        }

        .modal {
          background: #ffffff;
          border-radius: 16px;
          padding: 32px;
          max-width: 700px;
          width: 100%;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
          animation: slideUp 0.3s ease-out;
          max-height: 90vh;
          overflow-y: auto;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .modal-header {
          margin-bottom: 24px;
        }

        .modal-title {
          font-size: 1.5rem;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 8px;
        }

        .modal-subtitle {
          color: #64748b;
          font-size: 0.95rem;
        }

        .modal-section {
          background: #f8fafc;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 20px;
        }

        .modal-section-title {
          font-size: 0.85rem;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 700;
          margin-bottom: 16px;
        }

        .modal-items {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .modal-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background: #ffffff;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          transition: all 0.2s ease;
        }

        .modal-item:hover {
          border-color: #cbd5e1;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .modal-item-image {
          width: 64px;
          height: 64px;
          border-radius: 10px;
          object-fit: cover;
          background: #f1f5f9;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .modal-item-placeholder {
          width: 64px;
          height: 64px;
          border-radius: 10px;
          background: linear-gradient(135deg, #e0e7ff 0%, #ddd6fe 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.8rem;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .modal-item-details {
          flex: 1;
        }

        .modal-item-details h4 {
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 6px;
          font-size: 1.1rem;
        }

        .modal-item-details p {
          font-size: 0.9rem;
          color: #64748b;
        }

        .modal-item-price {
          font-weight: 800;
          color: #0f172a;
          font-size: 1.2rem;
        }

        .modal-summary {
          background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
          border: 2px solid #059669;
        }

        .modal-summary-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;
          font-size: 1rem;
          color: #374151;
        }

        .modal-summary-row:last-child {
          margin-bottom: 0;
          padding-top: 12px;
          border-top: 2px solid #059669;
          font-weight: 800;
          font-size: 1.3rem;
          color: #059669;
        }

        .modal-actions {
          display: flex;
          gap: 12px;
          margin-top: 24px;
        }

        .modal-btn {
          flex: 1;
          padding: 14px 24px;
          border: 2px solid;
          border-radius: 10px;
          font-weight: 700;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .modal-btn.cancel {
          background: #f1f5f9;
          border-color: #e2e8f0;
          color: #64748b;
        }

        .modal-btn.cancel:hover {
          background: #e2e8f0;
          color: #0f172a;
        }

        .modal-btn.confirm-payment {
          background: linear-gradient(135deg, #059669 0%, #047857 100%);
          border-color: transparent;
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);
        }

        .modal-btn.confirm-payment:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(5, 150, 105, 0.4);
        }

        /* Empty State */
        .empty-state {
          text-align: center;
          padding: 80px 40px;
          color: #94a3b8;
        }

        .empty-icon {
          font-size: 4rem;
          margin-bottom: 16px;
          animation: float 3s ease-in-out infinite;
        }

        .empty-text {
          font-size: 1.1rem;
          color: #64748b;
          margin-bottom: 24px;
        }

        .empty-button {
          padding: 12px 28px;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          color: #ffffff;
          border: none;
          border-radius: 8px;
          font-weight: 700;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.3s ease;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .empty-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.3);
        }

        .loading-spinner {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 400px;
          font-size: 3rem;
          animation: float 3s ease-in-out infinite;
        }

        /* Responsive Design */
        @media (max-width: 1024px) {
          .products-grid {
            grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
            gap: 20px;
          }

          .confirmed-grid {
            grid-template-columns: 1fr;
          }

          .stats-grid {
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          }

          .stats-sections {
            grid-template-columns: 1fr;
          }

          .header-content {
            flex-direction: column;
            align-items: flex-start;
          }

          .actions-bar {
            flex-direction: column;
          }

          .search-box {
            width: 100%;
            max-width: 100%;
          }

          .main {
            padding: 24px 16px;
          }

          .orders-table {
            display: block;
            overflow-x: auto;
          }
        }

        @media (max-width: 640px) {
          .header {
            padding: 16px;
          }

          .header-content {
            gap: 8px;
          }

          .header-title {
            font-size: 1.25rem;
          }

          .header-badge {
            display: none;
          }

          .logout-btn {
            padding: 8px 14px;
            font-size: 0.8rem;
          }

          .nav-tabs {
            flex-direction: row;
            overflow-x: auto;
            padding: 4px;
          }

          .nav-tab {
            padding: 10px 16px;
            font-size: 0.9rem;
          }

          .stats-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .time-range-selector {
            width: 100%;
            overflow-x: auto;
          }

          .main {
            padding: 20px 12px;
          }

          .actions-bar {
            flex-direction: column-reverse;
            margin-bottom: 24px;
          }

          .add-btn,
          .search-box {
            width: 100%;
            justify-content: center;
          }

          .products-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }

          .product-image-container {
            height: 200px;
          }

          .form-section {
            padding: 20px;
            margin-bottom: 32px;
            border-radius: 8px;
          }

          .close-btn {
            align-self: flex-end;
          }

          .modal {
            margin: 10px;
            padding: 20px;
          }

          .section-title {
            font-size: 1.2rem;
          }

          .empty-state {
            padding: 60px 20px;
          }

          .product-placeholder {
            font-size: 2.5rem;
          }

          .orders-table th,
          .orders-table td {
            padding: 12px 8px;
            font-size: 0.85rem;
          }

          .confirmed-card {
            padding: 16px;
          }

          .modal-actions {
            flex-direction: column;
          }

          .order-item {
            padding: 8px;
          }

          .item-image, .item-placeholder {
            width: 32px;
            height: 32px;
          }

          .confirmed-item {
            padding: 10px;
          }

          .confirmed-item-image, .confirmed-item-placeholder {
            width: 50px;
            height: 50px;
          }

          .bar-chart {
            gap: 2px;
          }

          .bar-label {
            font-size: 0.6rem;
          }
        }

        @media (max-width: 480px) {
          .header-title {
            font-size: 1.1rem;
          }

          .header-left {
            width: 100%;
            justify-content: space-between;
          }

          .logout-btn {
            padding: 6px 12px;
            font-size: 0.75rem;
          }

          .form-section {
            padding: 16px;
          }

          .product-content {
            padding: 16px;
            gap: 12px;
          }

          .product-name {
            font-size: 1rem;
          }

          .product-price {
            font-size: 1.3rem;
          }

          .stat-value {
            font-size: 1.5rem;
          }
        }
      `}</style>

      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="header-left">
            <h1 className="header-title">Dashboard</h1>
            <span className="header-badge">Admin</span>
          </div>
          <button onClick={handleLogout} className="logout-btn">
            🚪 Logout
          </button>
        </div>
      </header>

      <main className="main">
        {/* Navigation Tabs */}
        <div className="nav-tabs">
          <button
            className={`nav-tab ${activeTab === 'statistics' ? 'active' : ''}`}
            onClick={() => setActiveTab('statistics')}
          >
            📊 Statistics
          </button>
          <button
            className={`nav-tab ${activeTab === 'products' ? 'active' : ''}`}
            onClick={() => setActiveTab('products')}
          >
            📦 Products
            <span className="tab-badge">{products.length}</span>
          </button>
          <button
            className={`nav-tab ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            🛒 Orders
            <span className="tab-badge">{pendingOrders.length}</span>
          </button>
          <button
            className={`nav-tab ${activeTab === 'confirmed' ? 'active' : ''}`}
            onClick={() => setActiveTab('confirmed')}
          >
            ✅ Confirmed
            <span className="tab-badge">{confirmedPayments.length}</span>
          </button>
        </div>

        {/* Statistics Section */}
        {activeTab === 'statistics' && (
          <>
            <div className="stats-header">
              <h2 className="stats-title">📊 Business Overview</h2>
              <div className="time-range-selector">
                {[
                  { key: 'all', label: 'All Time' },
                  { key: 'today', label: 'Today' },
                  { key: 'week', label: 'This Week' },
                  { key: 'month', label: 'This Month' },
                  { key: 'year', label: 'This Year' }
                ].map(range => (
                  <button
                    key={range.key}
                    className={`time-range-btn ${statsTimeRange === range.key ? 'active' : ''}`}
                    onClick={() => setStatsTimeRange(range.key)}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Key Metrics Cards */}
            <div className="stats-grid">
              <div className="stat-card revenue">
                <div className="stat-icon">💰</div>
                <div className="stat-label">Total Revenue</div>
                <div className="stat-value">{formatCurrency(statistics.totalRevenue)}</div>
                <div className="stat-change positive">
                  {statistics.totalConfirmedOrders} confirmed orders
                </div>
              </div>

              <div className="stat-card orders">
                <div className="stat-icon">🛒</div>
                <div className="stat-label">Total Orders</div>
                <div className="stat-value">{statistics.totalOrders}</div>
                <div className="stat-change">
                  {statistics.totalConfirmedOrders} confirmed
                </div>
              </div>

              <div className="stat-card conversion">
                <div className="stat-icon">📈</div>
                <div className="stat-label">Conversion Rate</div>
                <div className="stat-value">{statistics.conversionRate.toFixed(1)}%</div>
                <div className="stat-change positive">
                  {statistics.averageOrderValue > 0 && `Avg: ${formatCurrency(statistics.averageOrderValue)}`}
                </div>
              </div>

              <div className="stat-card products">
                <div className="stat-icon">📦</div>
                <div className="stat-label">Products</div>
                <div className="stat-value">{statistics.totalProducts}</div>
                <div className="stat-change">
                  {statistics.totalStock} items in stock
                </div>
              </div>
            </div>

            {/* Detailed Statistics Sections */}
            <div className="stats-sections">
              {/* Revenue Chart */}
              <div className="stats-section">
                <div className="section-header-row">
                  <h3 className="section-header-title">📈 Revenue Trend (Last 30 Days)</h3>
                </div>
                <div className="chart-container">
                  <BarChart 
                    data={statistics.dailyRevenue} 
                    maxValue={Math.max(...Object.values(statistics.dailyRevenue), 1)} 
                  />
                </div>
              </div>

              {/* Top Selling Products */}
              <div className="stats-section">
                <div className="section-header-row">
                  <h3 className="section-header-title">🏆 Top Selling Products</h3>
                </div>
                {statistics.topProducts.length > 0 ? (
                  <div className="top-products-list">
                    {statistics.topProducts.map((product, index) => (
                      <div key={index} className="top-product-item">
                        <div className={`top-product-rank ${index < 3 ? 'top3' : ''}`}>
                          {index + 1}
                        </div>
                        {product.imageUrl ? (
                          <img 
                            src={product.imageUrl} 
                            alt={product.name} 
                            className="top-product-image"
                            onError={(e) => {
                              e.target.style.display = 'none'
                              e.target.nextSibling.style.display = 'flex'
                            }}
                          />
                        ) : (
                          <div className="top-product-placeholder">📦</div>
                        )}
                        <div className="top-product-info">
                          <div className="top-product-name">{product.name}</div>
                          <div className="top-product-qty">{product.quantity} units sold</div>
                        </div>
                        <div className="top-product-revenue">
                          {formatCurrency(product.revenue)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state" style={{ padding: '40px 20px' }}>
                    <div className="empty-icon" style={{ fontSize: '2rem' }}>📊</div>
                    <p className="empty-text">No sales data available yet</p>
                  </div>
                )}
              </div>

              {/* Order Status Breakdown */}
              <div className="stats-section">
                <div className="section-header-row">
                  <h3 className="section-header-title">📋 Order Status Breakdown</h3>
                </div>
                <div className="status-breakdown">
                  <div className="status-item">
                    <div className="status-bar-bg">
                      <div 
                        className="status-bar-fill confirmed" 
                        style={{ width: `${statistics.orderStatusBreakdown.total > 0 ? (statistics.orderStatusBreakdown.confirmed / statistics.orderStatusBreakdown.total) * 100 : 0}%` }}
                      />
                    </div>
                    <div className="status-info">
                      <div className="status-count">{statistics.orderStatusBreakdown.confirmed}</div>
                      <div className="status-label">Confirmed</div>
                    </div>
                  </div>
                  <div className="status-item">
                    <div className="status-bar-bg">
                      <div 
                        className="status-bar-fill pending" 
                        style={{ width: `${statistics.orderStatusBreakdown.total > 0 ? (statistics.orderStatusBreakdown.pending / statistics.orderStatusBreakdown.total) * 100 : 0}%` }}
                      />
                    </div>
                    <div className="status-info">
                      <div className="status-count">{statistics.orderStatusBreakdown.pending}</div>
                      <div className="status-label">Pending</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Product Flavors Distribution */}
              <div className="stats-section">
                <div className="section-header-row">
                  <h3 className="section-header-title">🎨 Product Flavors</h3>
                </div>
                <div className="flavors-grid">
                  {Object.entries(statistics.flavorStats).map(([flavor, data]) => (
                    <div key={flavor} className="flavor-tag">
                      {flavor}
                      <span className="count">{data.count}</span>
                    </div>
                  ))}
                </div>
                {Object.keys(statistics.flavorStats).length === 0 && (
                  <div className="empty-state" style={{ padding: '40px 20px' }}>
                    <div className="empty-icon" style={{ fontSize: '2rem' }}>🎨</div>
                    <p className="empty-text">No flavor data available</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Top Actions */}
        {activeTab === 'products' && (
          <div className="actions-bar">
            <button
              onClick={() => setShowForm(!showForm)}
              className="add-btn"
            >
              <span>➕</span>
              {showForm ? 'Cancel' : 'Add Product'}
            </button>

            <div className="search-box">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search products..."
                className="search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        )}

        {(activeTab === 'orders' || activeTab === 'confirmed') && (
          <div className="actions-bar">
            <div className="search-box" style={{ maxWidth: '100%' }}>
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder={activeTab === 'orders' ? "Search by Order ID, Payment ID, or product name..." : "Search confirmed payments..."}
                className="search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Product Form */}
        {activeTab === 'products' && showForm && (
          <div className="form-section">
            <div className="form-section-header">
              <h3 className="form-section-title">
                {editingProduct ? '✏️ Edit Product' : '✨ Add New Product'}
              </h3>
              <button
                onClick={() => {
                  setShowForm(false)
                  setEditingProduct(null)
                }}
                className="close-btn"
              >
                ✕ Close
              </button>
            </div>
            <ProductForm product={editingProduct} onSuccess={handleSuccess} />
          </div>
        )}

        {/* Products Section */}
        {activeTab === 'products' && (
          <>
            <div className="section-header">
              <h2 className="section-title">
                📦 Products
                <span className="section-count">{filteredProducts.length}</span>
              </h2>
              {searchQuery && (
                <p className="section-subtitle">
                  Search results for "{searchQuery}"
                </p>
              )}
            </div>

            {isLoading && (
              <div className="loading-spinner">⏳</div>
            )}

            {!isLoading && (
              <>
                {filteredProducts.length > 0 ? (
                  <div className="products-grid">
                    {filteredProducts.map(p => (
                      <div key={p.id} className="product-card">
                        <div className="product-image-container">
                          {p.imageUrl ? (
                            <img src={p.imageUrl} alt={p.name} />
                          ) : (
                            <div className="product-placeholder">📦</div>
                          )}
                        </div>

                        <div className="product-content">
                          <h3 className="product-name">{p.name}</h3>
                          <p className="product-price">π {p.price?.toFixed(2)}</p>

                          <div className="product-meta">
                            <span>📦 {p.piecesPerBox} pieces per box</span>
                            {p.flavors?.length > 0 && (
                              <span>🎨 {p.flavors.length} flavor{p.flavors.length !== 1 ? 's' : ''}</span>
                            )}
                          </div>

                          <div className="product-actions">
                            <button
                              onClick={() => handleEdit(p)}
                              className="product-btn edit"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(p)}
                              className="product-btn delete"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <div className="empty-icon">📭</div>
                    <p className="empty-text">
                      {searchQuery
                        ? 'No products match your search'
                        : 'No products yet. Create your first product!'}
                    </p>
                    {!searchQuery && (
                      <button
                        onClick={() => setShowForm(true)}
                        className="empty-button"
                      >
                        <span>➕</span>
                        Add First Product
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Orders Section */}
        {activeTab === 'orders' && (
          <>
            <div className="section-header">
              <h2 className="section-title">
                🛒 Pending Orders
                <span className="section-count">{filteredOrders.length}</span>
              </h2>
              <p className="section-subtitle">
                Orders with completed payment awaiting confirmation for shipping
              </p>
            </div>

            {filteredOrders.length > 0 ? (
              <div className="orders-container">
                <table className="orders-table">
                  <thead>
                    <tr>
                      <th>Order Details</th>
                      <th>Items</th>
                      <th>Total</th>
                      <th>Date</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map(order => (
                      <tr key={order.id}>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <span className="order-id">{order.orderId}</span>
                            <span className="payment-id">Payment: {order.paymentId?.slice(0, 16)}...</span>
                            <span className={`status-badge ${order.status}`}>
                              {order.status === 'completed' ? '✓ Paid' : order.status}
                            </span>
                          </div>
                        </td>
                        <td className="order-items">
                          {order.items?.map((item, idx) => {
                            const imageUrl = getProductImage(item)
                            return (
                              <div key={idx} className="order-item">
                                {imageUrl ? (
                                  <img 
                                    src={imageUrl} 
                                    alt={item.name} 
                                    className="item-image"
                                    onError={(e) => {
                                      e.target.style.display = 'none'
                                      e.target.nextSibling.style.display = 'flex'
                                    }}
                                  />
                                ) : (
                                  <div className="item-placeholder">📦</div>
                                )}
                                <div className="item-details">
                                  <span className="item-name">{item.name}</span>
                                  <span className="item-meta">{item.quantity} × π {item.price?.toFixed(2)}</span>
                                </div>
                              </div>
                            )
                          })}
                        </td>
                        <td>
                          <span className="order-total">
                            π {order.totalPrice?.toFixed(2)}
                          </span>
                          <span className="currency-badge">{order.currency}</span>
                        </td>
                        <td>
                          {formatDate(order.createdAt)}
                        </td>
                        <td>
                          <button
                            onClick={() => setConfirmPaymentModal(order)}
                            className="confirm-btn"
                          >
                            ✓ Confirm
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <p className="empty-text">
                  {searchQuery ? 'No orders match your search' : 'No pending orders'}
                </p>
              </div>
            )}
          </>
        )}

        {/* Confirmed Payments Section */}
        {activeTab === 'confirmed' && (
          <>
            <div className="section-header">
              <h2 className="section-title">
                ✅ Confirmed Payments
                <span className="section-count">{confirmedPayments.length}</span>
              </h2>
              <p className="section-subtitle">
                Payments confirmed and ready for shipping
              </p>
            </div>

            {confirmedPayments.length > 0 ? (
              <div className="confirmed-grid">
                {confirmedPayments.map(payment => (
                  <div key={payment.id} className="confirmed-card">
                    <div className="confirmed-header">
                      <div className="confirmed-ids">
                        <div className="confirmed-order-id">{payment.orderId}</div>
                        <div className="confirmed-payment-id">Payment: {payment.paymentId?.slice(0, 20)}...</div>
                      </div>
                      <span className="confirmed-date">
                        ✓ {formatDate(payment.confirmedAt)}
                      </span>
                    </div>
                    
                    <div className="confirmed-section">
                      <div className="confirmed-label">Order Items ({payment.totalItems})</div>
                      <div className="confirmed-items-list">
                        {payment.items?.map((item, idx) => (
                          <div key={idx} className="confirmed-item">
                            {item.imageUrl ? (
                              <img 
                                src={item.imageUrl} 
                                alt={item.name} 
                                className="confirmed-item-image"
                                onError={(e) => {
                                  e.target.style.display = 'none'
                                  e.target.nextSibling.style.display = 'flex'
                                }}
                              />
                            ) : (
                              <div className="confirmed-item-placeholder">📦</div>
                            )}
                            <div className="confirmed-item-info">
                              <div className="confirmed-item-name">{item.name}</div>
                              <div className="confirmed-item-qty">Quantity: {item.quantity}</div>
                            </div>
                            <div className="confirmed-item-price">π {(item.price * item.quantity).toFixed(2)}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="confirmed-total">
                      <span className="confirmed-total-label">Total Amount</span>
                      <span className="confirmed-total-amount">
                        π {payment.totalPrice?.toFixed(2)} {payment.currency}
                      </span>
                    </div>

                    <div className="confirmed-meta">
                      <div className="confirmed-meta-item">
                        📅 Original Order: {formatDate(payment.originalCreatedAt)}
                      </div>
                      <div className="confirmed-meta-item">
                        👤 Confirmed by: {payment.confirmedByEmail}
                      </div>
                      <div className="confirmed-meta-item" style={{ marginTop: '8px' }}>
                        <span className={`shipping-status ${payment.shippingStatus}`}>
                          🚚 {payment.shippingStatus === 'shipped' ? 'Shipped' : 'Pending Shipping'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <p className="empty-text">No confirmed payments yet</p>
              </div>
            )}
          </>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h3 className="modal-title">🗑️ Delete Product?</h3>
              <p className="modal-text">
                Are you sure you want to delete "{deleteConfirm.name}"? This action cannot be undone.
              </p>
              <div className="modal-actions">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="modal-btn cancel"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm.id)}
                  className="modal-btn confirm"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirm Payment Modal */}
        {confirmPaymentModal && (
          <div className="modal-overlay" onClick={() => setConfirmPaymentModal(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="modal-title">✅ Confirm Payment for Shipping</h3>
                <p className="modal-subtitle">
                  Review order details before confirming payment for shipping
                </p>
              </div>
              
              <div className="modal-section">
                <div className="modal-section-title">Order Information</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Order ID</div>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{confirmPaymentModal.orderId}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Payment ID</div>
                    <div style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>{confirmPaymentModal.paymentId}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Order Date</div>
                    <div>{formatDate(confirmPaymentModal.createdAt)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Status</div>
                    <span className={`status-badge ${confirmPaymentModal.status}`}>
                      {confirmPaymentModal.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="modal-section">
                <div className="modal-section-title">Order Items ({confirmPaymentModal.totalItems})</div>
                <div className="modal-items">
                  {confirmPaymentModal.items?.map((item, idx) => {
                    const imageUrl = getProductImage(item)
                    return (
                      <div key={idx} className="modal-item">
                        {imageUrl ? (
                          <img 
                            src={imageUrl} 
                            alt={item.name} 
                            className="modal-item-image"
                            onError={(e) => {
                              e.target.style.display = 'none'
                              e.target.nextSibling.style.display = 'flex'
                            }}
                          />
                        ) : (
                          <div className="modal-item-placeholder">📦</div>
                        )}
                        <div className="modal-item-details">
                          <h4>{item.name}</h4>
                          <p>Qty: {item.quantity} × π {item.price?.toFixed(2)}</p>
                        </div>
                        <div className="modal-item-price">π {(item.price * item.quantity).toFixed(2)}</div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="modal-section modal-summary">
                <div className="modal-summary-row">
                  <span>Total Items:</span>
                  <span>{confirmPaymentModal.totalItems}</span>
                </div>
                <div className="modal-summary-row">
                  <span>Currency:</span>
                  <span>{confirmPaymentModal.currency}</span>
                </div>
                <div className="modal-summary-row">
                  <span>Total Amount:</span>
                  <span>π {confirmPaymentModal.totalPrice?.toFixed(2)}</span>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  onClick={() => setConfirmPaymentModal(null)}
                  className="modal-btn cancel"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleConfirmPayment(confirmPaymentModal)}
                  className="modal-btn confirm-payment"
                >
                  ✓ Confirm Payment & Ready for Shipping
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
