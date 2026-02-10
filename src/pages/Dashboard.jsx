// src/pages/Dashboard.jsx
import { useEffect, useState } from 'react'
import { collection, getDocs, deleteDoc, doc, addDoc, updateDoc, query, orderBy, serverTimestamp, where } from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { db, auth } from '../services/firebase'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import ProductForm from '../components/ProductForm'

export default function Dashboard() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [confirmedPayments, setConfirmedPayments] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('products') // 'products', 'orders', 'confirmed'
  const [confirmPaymentModal, setConfirmPaymentModal] = useState(null)

  useEffect(() => {
    if (!currentUser) {
      navigate('/login')
      return
    }
    loadProducts()
    loadOrders()
    loadConfirmedPayments()
  }, [currentUser, navigate])

  const loadProducts = async () => {
    try {
      setIsLoading(true)
      const snapshot = await getDocs(collection(db, 'products'))
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setProducts(list)
    } catch (err) {
      console.error('Error loading products:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const loadOrders = async () => {
    try {
      // Load orders that are not yet confirmed (status is completed but not confirmed by admin)
      const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'))
      const snapshot = await getDocs(q)
      const list = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        // Ensure we have a confirmed status field, default to false if not present
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
      // Add to confirmedPayments collection with your data structure
      await addDoc(collection(db, 'confirmedPayments'), {
        originalOrderId: order.id,
        orderId: order.orderId, // The custom order ID like "order_1770364914207"
        paymentId: order.paymentId,
        
        // Customer info - try to extract from available data or use defaults
        customerInfo: {
          // Since your data doesn't have customer fields, we'll store what we have
          // You may want to update your order creation to include these fields
          orderReference: order.orderId
        },
        
        // Items from your structure
        items: order.items || [],
        totalItems: order.totalItems || 0,
        totalPrice: order.totalPrice || 0,
        currency: order.currency || 'PI',
        
        // Original timestamps
        originalCreatedAt: order.createdAt,
        
        // Confirmation details
        confirmedBy: currentUser.uid,
        confirmedByEmail: currentUser.email,
        confirmedAt: serverTimestamp(),
        adminConfirmed: true,
        
        // Status
        status: 'confirmed_for_shipping',
        shippingStatus: 'pending'
      })

      // Update order to mark as admin confirmed
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

  // Filter orders - show only completed payments that haven't been admin confirmed
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

  const formatCurrency = (amount, currency = 'PI') => {
    return `${currency} ${Number(amount).toFixed(2)}`
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

        .form-section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 28px;
          padding-bottom: 20px;
          border-bottom: 2px solid #f1f5f9;
        }

        .form-section-title {
          font-size: 1.3rem;
          font-weight: 800;
          color: #0f172a;
        }

        .close-btn {
          padding: 8px 12px;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          color: #64748b;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: 0.85rem;
        }

        .close-btn:hover {
          background: #e2e8f0;
          color: #0f172a;
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
          max-width: 250px;
        }

        .order-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.9rem;
          color: #475569;
          margin-bottom: 6px;
          padding: 4px 0;
        }

        .item-image {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          object-fit: cover;
          background: #f1f5f9;
        }

        .item-placeholder {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          background: linear-gradient(135deg, #e0e7ff 0%, #ddd6fe 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1rem;
        }

        .item-details {
          display: flex;
          flex-direction: column;
        }

        .item-name {
          font-weight: 600;
          color: #0f172a;
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
          grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
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
          margin-bottom: 8px;
          font-weight: 700;
        }

        .confirmed-items-list {
          background: #f8fafc;
          border-radius: 8px;
          padding: 12px;
        }

        .confirmed-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid #e2e8f0;
        }

        .confirmed-item:last-child {
          border-bottom: none;
        }

        .confirmed-item-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .confirmed-item-img {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          object-fit: cover;
          background: #e2e8f0;
        }

        .confirmed-item-name {
          font-weight: 600;
          color: #0f172a;
        }

        .confirmed-item-qty {
          font-size: 0.85rem;
          color: #64748b;
        }

        .confirmed-item-price {
          font-weight: 700;
          color: #0f172a;
        }

        .confirmed-total {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
          border-radius: 8px;
          margin-top: 16px;
        }

        .confirmed-total-label {
          font-weight: 700;
          color: #065f46;
        }

        .confirmed-total-amount {
          font-size: 1.4rem;
          font-weight: 800;
          color: #059669;
        }

        .confirmed-meta {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #f1f5f9;
          display: flex;
          flex-direction: column;
          gap: 4px;
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
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 0.75rem;
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
          max-width: 600px;
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
          margin-bottom: 12px;
        }

        .modal-items {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .modal-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: #ffffff;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }

        .modal-item-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .modal-item-img {
          width: 48px;
          height: 48px;
          border-radius: 8px;
          object-fit: cover;
          background: #f1f5f9;
        }

        .modal-item-details h4 {
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 4px;
        }

        .modal-item-details p {
          font-size: 0.85rem;
          color: #64748b;
        }

        .modal-item-price {
          font-weight: 800;
          color: #0f172a;
          font-size: 1.1rem;
        }

        .modal-summary {
          background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
          border: 2px solid #059669;
        }

        .modal-summary-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          font-size: 0.95rem;
        }

        .modal-summary-row:last-child {
          margin-bottom: 0;
          padding-top: 12px;
          border-top: 1px solid #059669;
          font-weight: 800;
          font-size: 1.2rem;
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

          .form-section-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
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
                          {order.items?.map((item, idx) => (
                            <div key={idx} className="order-item">
                              <div className="item-placeholder">📦</div>
                              <div className="item-details">
                                <span className="item-name">{item.name}</span>
                                <span className="item-meta">{item.quantity} × π {item.price?.toFixed(2)}</span>
                              </div>
                            </div>
                          ))}
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
                      <div className="confirmed-label">Order Items</div>
                      <div className="confirmed-items-list">
                        {payment.items?.map((item, idx) => (
                          <div key={idx} className="confirmed-item">
                            <div className="confirmed-item-info">
                              <div className="confirmed-item-img">📦</div>
                              <div>
                                <div className="confirmed-item-name">{item.name}</div>
                                <div className="confirmed-item-qty">Qty: {item.quantity}</div>
                              </div>
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
                  {confirmPaymentModal.items?.map((item, idx) => (
                    <div key={idx} className="modal-item">
                      <div className="modal-item-info">
                        <div className="modal-item-img">📦</div>
                        <div className="modal-item-details">
                          <h4>{item.name}</h4>
                          <p>Qty: {item.quantity} × π {item.price?.toFixed(2)}</p>
                        </div>
                      </div>
                      <div className="modal-item-price">π {(item.price * item.quantity).toFixed(2)}</div>
                    </div>
                  ))}
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