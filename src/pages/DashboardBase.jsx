// src/pages/DashboardBase.jsx
import { useEffect, useState } from 'react'
import { collection, getDocs, deleteDoc, doc, addDoc, updateDoc, query, orderBy, serverTimestamp, where } from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { db, auth } from '../services/firebase'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import ProductForm from '../components/ProductForm'

// Get collection names based on currency
const getCollections = (currency) => ({
  products: currency === 'PI' ? 'products_pi' : 'products_egp',
  orders: currency === 'PI' ? 'orders_pi' : 'orders_egp',
  confirmedPayments: currency === 'PI' ? 'confirmedPayments_pi' : 'confirmedPayments_egp'
})

export default function DashboardBase({ currency, theme }) {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [isReady, setIsReady] = useState(false)
  
  const otherCurrency = currency === 'PI' ? 'EGP' : 'PI'
  const otherTheme = currency === 'PI' ? 'egp' : 'pi'
  
  // Theme configuration
  const themes = {
    pi: {
      name: 'Pi Network',
      symbol: 'π',
      color: '#d4a017',
      darkColor: '#b8860b',
      gradient: 'linear-gradient(135deg, #d4a017 0%, #b8860b 100%)',
      lightBg: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
      borderColor: '#d4a017',
      textColor: '#92400e',
      collectionColor: '#d4a017'
    },
    egp: {
      name: 'EGP Store',
      symbol: '£',
      color: '#0f172a',
      darkColor: '#1e293b',
      gradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      lightBg: 'linear-gradient(135deg, #e0e7ff 0%, #ddd6fe 100%)',
      borderColor: '#0f172a',
      textColor: '#3730a3',
      collectionColor: '#0f172a'
    }
  }

  const currentTheme = themes[theme] || themes.pi

  useEffect(() => {
    // Inject global styles
    const styleId = 'dashboard-styles'
    if (!document.getElementById(styleId)) {
      const styleSheet = document.createElement('style')
      styleSheet.id = styleId
      styleSheet.textContent = `
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(212, 160, 23, 0.4); }
          50% { box-shadow: 0 0 0 10px rgba(212, 160, 23, 0); }
        }
        .skeleton {
          background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 8px;
        }
        .sync-pulse {
          animation: pulse 2s infinite;
        }
        .dashboard-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
        }
        .dashboard-loading {
          min-height: 100vh;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          display: flex;
          align-items: center;
          justify-content: center;
        }
      `
      document.head.appendChild(styleSheet)
    }
    
    const timer = setTimeout(() => setIsReady(true), 50)
    return () => clearTimeout(timer)
  }, [])

  // State
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [confirmedPayments, setConfirmedPayments] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('products')
  const [confirmPaymentModal, setConfirmPaymentModal] = useState(null)
  const [dataLoaded, setDataLoaded] = useState(false)
  const [syncStatus, setSyncStatus] = useState(null)

  const collectionNames = getCollections(currency)

  useEffect(() => {
    if (!currentUser) {
      navigate('/login')
      return
    }
    // Only load data if we have permission (user is authenticated)
    if (currentUser) {
      loadAllData()
    }
  }, [currentUser, navigate, currency])

  const loadAllData = async () => {
    setIsLoading(true)
    try {
      await Promise.all([
        loadProducts(),
        loadOrders(),
        loadConfirmedPayments()
      ])
      setDataLoaded(true)
    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const loadProducts = async () => {
    try {
      const snapshot = await getDocs(collection(db, collectionNames.products))
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setProducts(list)
    } catch (err) {
      console.error('Error loading products:', err)
      if (err.code === 'permission-denied') {
        console.warn('Permission denied for products collection')
      }
    }
  }

  const loadOrders = async () => {
    try {
      const q = query(
        collection(db, collectionNames.orders),
        orderBy('createdAt', 'desc')
      )
      const snapshot = await getDocs(q)
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        adminConfirmed: doc.data().adminConfirmed || false
      }))
      setOrders(list)
    } catch (err) {
      console.error('Error loading orders:', err)
      // Don't throw - handle gracefully
      setOrders([])
    }
  }

  const loadConfirmedPayments = async () => {
    try {
      const q = query(
        collection(db, collectionNames.confirmedPayments),
        orderBy('confirmedAt', 'desc')
      )
      const snapshot = await getDocs(q)
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setConfirmedPayments(list)
    } catch (err) {
      console.error('Error loading confirmed payments:', err)
      // Don't throw - handle gracefully
      setConfirmedPayments([])
    }
  }

  // SYNC PRODUCT TO OTHER COLLECTION
  const handleSyncProduct = async (product) => {
    if (!product) return
    
    try {
      setSyncStatus('syncing')
      
      const otherCollection = currency === 'PI' ? 'products_egp' : 'products_pi'
      const otherCurrency = currency === 'PI' ? 'EGP' : 'PI'
      
      const syncedProduct = {
        ...product,
        currency: otherCurrency,
        syncedFrom: currency,
        syncedAt: serverTimestamp(),
        originalId: product.id
      }
      
      delete syncedProduct.id
      
      const otherProductsQuery = query(
        collection(db, otherCollection),
        where('name', '==', product.name)
      )
      const existingSnapshot = await getDocs(otherProductsQuery)
      
      if (!existingSnapshot.empty) {
        const existingDoc = existingSnapshot.docs[0]
        await updateDoc(doc(db, otherCollection, existingDoc.id), {
          ...syncedProduct,
          updatedAt: serverTimestamp()
        })
      } else {
        await addDoc(collection(db, otherCollection), {
          ...syncedProduct,
          createdAt: serverTimestamp()
        })
      }
      
      setSyncStatus('synced')
      setTimeout(() => setSyncStatus(null), 3000)
    } catch (err) {
      console.error('Error syncing product:', err)
      setSyncStatus('error')
      setTimeout(() => setSyncStatus(null), 3000)
    }
  }

const handleConfirmPayment = async (order) => {
  try {
    const confirmedData = {
      originalOrderId: order.id,
      orderId: order.orderId,
      currency: currency,
      items: order.items || [],
      totalItems: order.totalItems || 0,
      totalPrice: order.totalPrice || 0,
      originalCreatedAt: order.createdAt,
      confirmedBy: currentUser.uid,
      confirmedByEmail: currentUser.email,
      confirmedAt: serverTimestamp(),
      adminConfirmed: true,
      status: 'confirmed_for_shipping',
      shippingStatus: 'pending'
    };

    // Add currency-specific fields
    if (currency === 'PI') {
      confirmedData.paymentId = order.paymentId;
      confirmedData.txid = order.txid || null;
      confirmedData.customerInfo = {
        orderReference: order.orderId
      };
    } else {
      // For EGP - include all customer delivery info
      confirmedData.referenceId = order.orderId;
      confirmedData.customerName = order.customerName;
      confirmedData.customerPhone = order.customerPhone;
      confirmedData.customerAddress = order.customerAddress;
      confirmedData.customerLocation = order.customerLocation;
      confirmedData.customerInfo = {
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        customerAddress: order.customerAddress,
        customerLocation: order.customerLocation,
        orderReference: order.orderId
      };
    }

    await addDoc(collection(db, collectionNames.confirmedPayments), confirmedData);
    
    // Update order status
    const updateData = {
      adminConfirmed: true,
      adminConfirmedAt: serverTimestamp(),
      adminConfirmedBy: currentUser.uid,
      shippingStatus: 'pending'
    };
    
    // Add currency-specific fields to order update
    if (currency === 'PI') {
      updateData.paymentId = order.paymentId;
      updateData.txid = order.txid || null;
    }

    await updateDoc(doc(db, collectionNames.orders, order.id), updateData);
    
    setConfirmPaymentModal(null);
    loadOrders();
    loadConfirmedPayments();
    
  } catch (err) {
    console.error('Error confirming payment:', err);
    alert('Error confirming order. Please try again.');
  }
};

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, collectionNames.products, id))
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
const pendingOrders = orders.filter(order => {
  // For Pi Network: show completed payments that are NOT admin-confirmed
  if (currency === 'PI') {
    return order.status === 'completed' && !order.adminConfirmed;
  }
  // For EGP: show pending orders that are NOT admin-confirmed
  else {
    return order.status === 'pending' && !order.adminConfirmed;
  }
});

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

  // Hover states
  const [hoveredProduct, setHoveredProduct] = useState(null)
  const [hoveredCard, setHoveredCard] = useState(null)
  const [hoveredButton, setHoveredButton] = useState(null)
  const [hoveredModalBtn, setHoveredModalBtn] = useState({})

  // Loading state
  if (!isReady) {
    return (
      <div className="dashboard-loading">
        <div style={{fontSize: '2rem', color: '#94a3b8', animation: 'spin 1s linear infinite'}}>⟳</div>
      </div>
    )
  }

  // Inline styles
  const s = {
    dashboard: { minHeight: '100vh', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' },
    header: { background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '20px 24px', position: 'sticky', top: 0, zIndex: 40, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)' },
    headerContent: { maxWidth: 1400, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20 },
    headerLeft: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
    headerTitle: { fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: 8 },
    headerBadge: { background: currentTheme.gradient, color: '#ffffff', padding: '4px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' },
    collectionBadge: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700, background: currentTheme.lightBg, color: currentTheme.textColor },
    logoutBtn: { padding: '10px 18px', background: 'transparent', border: '2px solid #e2e8f0', borderRadius: 8, color: '#0f172a', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.3s ease' },
    main: { padding: '40px 24px', maxWidth: 1400, margin: '0 auto' },
    navTabs: { display: 'flex', gap: 8, marginBottom: 32, background: '#ffffff', padding: 6, borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)', overflowX: 'auto' },
    navTab: (isActive) => ({ padding: '12px 24px', border: 'none', background: isActive ? currentTheme.gradient : 'transparent', color: isActive ? '#ffffff' : '#64748b', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', borderRadius: 8, transition: 'all 0.3s ease', display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap', boxShadow: isActive ? `0 2px 8px ${currentTheme.color}33` : 'none' }),
    tabBadge: (isActive) => ({ background: isActive ? 'rgba(255, 255, 255, 0.2)' : '#e2e8f0', color: 'inherit', padding: '2px 8px', borderRadius: 12, fontSize: '0.75rem', minWidth: 20, textAlign: 'center' }),
    actionsBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, marginBottom: 40, flexWrap: 'wrap' },
    addBtn: { padding: '12px 24px', background: currentTheme.gradient, color: '#ffffff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', transition: 'all 0.3s ease', display: 'inline-flex', alignItems: 'center', gap: 8, boxShadow: `0 2px 8px ${currentTheme.color}33`, whiteSpace: 'nowrap' },
    searchBox: { flex: 1, maxWidth: 400, position: 'relative' },
    searchInput: { width: '100%', padding: '12px 16px 12px 40px', border: '2px solid #e2e8f0', borderRadius: 8, fontSize: '1rem', background: '#ffffff', transition: 'all 0.3s ease', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)' },
    formSection: { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 32, marginBottom: 48, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)', animation: 'slideDown 0.4s ease-out' },
    formSectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, paddingBottom: 20, borderBottom: '2px solid #f1f5f9' },
    formSectionTitle: { fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' },
    closeBtn: { padding: '8px 12px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, color: '#64748b', fontWeight: 600, cursor: 'pointer', transition: 'all 0.3s ease', fontSize: '0.85rem' },
    sectionHeader: { marginBottom: 32 },
    sectionTitle: { fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
    sectionCount: { background: currentTheme.lightBg, color: currentTheme.textColor, padding: '2px 10px', borderRadius: 20, fontSize: '0.85rem', fontWeight: 700 },
    sectionSubtitle: { color: '#64748b', fontSize: '0.95rem' },
    productsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 28 },
    productCard: (isHovered) => ({ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', transition: 'all 0.3s ease', display: 'flex', flexDirection: 'column', boxShadow: isHovered ? `0 12px 24px ${currentTheme.color}1f` : '0 1px 3px rgba(0, 0, 0, 0.05)', transform: isHovered ? 'translateY(-8px)' : 'translateY(0)', animation: 'fadeIn 0.4s ease-out' }),
    productImageContainer: { width: '100%', height: 240, background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderBottom: '1px solid #e2e8f0', position: 'relative' },
    productImage: (isHovered) => ({ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s ease', transform: isHovered ? 'scale(1.05)' : 'scale(1)' }),
    productPlaceholder: { fontSize: '3.5rem', animation: 'float 3s ease-in-out infinite' },
    productContent: { padding: 24, flex: 1, display: 'flex', flexDirection: 'column', gap: 16 },
    productName: { fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
    productPrice: { fontSize: '1.5rem', fontWeight: 800, background: currentTheme.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' },
    productMeta: { display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.9rem', color: '#64748b' },
    productActions: { display: 'flex', gap: 12, marginTop: 'auto' },
    productBtn: (type, isHovered) => ({ flex: 1, padding: '10px 16px', border: `2px solid ${type === 'edit' ? '#0f172a' : '#e11d48'}`, borderRadius: 8, fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.3s ease', background: isHovered ? (type === 'edit' ? '#0f172a' : '#e11d48') : 'transparent', color: isHovered ? '#ffffff' : (type === 'edit' ? '#0f172a' : '#e11d48'), transform: isHovered ? 'translateY(-2px)' : 'translateY(0)' }),
    ordersContainer: { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)' },
    ordersTable: { width: '100%', borderCollapse: 'collapse' },
    tableHeader: { background: '#f8fafc', padding: 16, textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #e2e8f0' },
    tableCell: { padding: '20px 16px', borderBottom: '1px solid #f1f5f9', color: '#0f172a', fontSize: '0.95rem' },
    orderId: { fontFamily: 'monospace', fontSize: '0.85rem', color: '#64748b', background: '#f1f5f9', padding: '4px 8px', borderRadius: 4, display: 'inline-block' },
    paymentId: { fontSize: '0.8rem', color: '#94a3b8', marginTop: 4 },
    orderItems: { maxWidth: 250 },
    orderItem: { display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', color: '#475569', marginBottom: 6, padding: '4px 0' },
    itemPlaceholder: { width: 32, height: 32, borderRadius: 6, background: currentTheme.lightBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' },
    itemDetails: { display: 'flex', flexDirection: 'column' },
    itemName: { fontWeight: 600, color: '#0f172a' },
    itemMeta: { fontSize: '0.8rem', color: '#64748b' },
    orderTotal: { fontWeight: 800, fontSize: '1.1rem', color: '#0f172a' },
    currencyBadge: { display: 'inline-block', background: currentTheme.gradient, color: '#ffffff', padding: '2px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 700, marginLeft: 8 },
    statusBadge: (status) => ({ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', background: status === 'completed' ? '#d1fae5' : '#fef3c7', color: status === 'completed' ? '#065f46' : '#92400e' }),
    confirmBtn: (isHovered) => ({ padding: '10px 20px', background: currentTheme.gradient, color: '#ffffff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.3s ease', display: 'inline-flex', alignItems: 'center', gap: 6, boxShadow: isHovered ? `0 4px 12px ${currentTheme.color}4d` : `0 2px 8px ${currentTheme.color}33`, transform: isHovered ? 'translateY(-2px)' : 'translateY(0)' }),
    confirmedGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 24 },
    confirmedCard: (isHovered) => ({ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24, boxShadow: isHovered ? '0 8px 16px rgba(15, 23, 42, 0.1)' : '0 1px 3px rgba(0, 0, 0, 0.05)', transition: 'all 0.3s ease', borderLeft: `4px solid ${currentTheme.color}`, animation: 'fadeIn 0.4s ease-out', transform: isHovered ? 'translateY(-4px)' : 'translateY(0)' }),
    confirmedHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #f1f5f9' },
    confirmedIds: { display: 'flex', flexDirection: 'column', gap: 4 },
    confirmedOrderId: { fontFamily: 'monospace', fontSize: '0.9rem', color: '#0f172a', fontWeight: 700 },
    confirmedPaymentId: { fontSize: '0.8rem', color: '#64748b' },
    confirmedDate: { fontSize: '0.85rem', color: currentTheme.darkColor, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, background: currentTheme.lightBg, padding: '6px 12px', borderRadius: 20 },
    confirmedSection: { marginBottom: 16 },
    confirmedLabel: { fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8, fontWeight: 700 },
    confirmedItemsList: { background: '#f8fafc', borderRadius: 8, padding: 12 },
    confirmedItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #e2e8f0' },
    confirmedItemInfo: { display: 'flex', alignItems: 'center', gap: 12 },
    confirmedItemName: { fontWeight: 600, color: '#0f172a' },
    confirmedItemQty: { fontSize: '0.85rem', color: '#64748b' },
    confirmedItemPrice: { fontWeight: 700, color: '#0f172a' },
    confirmedTotal: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16, background: currentTheme.lightBg, borderRadius: 8, marginTop: 16 },
    confirmedTotalLabel: { fontWeight: 700, color: currentTheme.textColor },
    confirmedTotalAmount: { fontSize: '1.4rem', fontWeight: 800, color: currentTheme.darkColor },
    confirmedMeta: { marginTop: 16, paddingTop: 16, borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.85rem', color: '#64748b' },
    confirmedMetaItem: { display: 'flex', alignItems: 'center', gap: 8 },
    shippingStatus: (status) => ({ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700, background: status === 'shipped' ? '#dbeafe' : '#fef3c7', color: status === 'shipped' ? '#1e40af' : '#92400e' }),
    modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, animation: 'fadeIn 0.2s ease-out', padding: 20, backdropFilter: 'blur(4px)' },
    modal: { background: '#ffffff', borderRadius: 16, padding: 32, maxWidth: 600, width: '100%', boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15)', animation: 'slideUp 0.3s ease-out', maxHeight: '90vh', overflowY: 'auto' },
    modalHeader: { marginBottom: 24 },
    modalTitle: { fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: 8 },
    modalSubtitle: { color: '#64748b', fontSize: '0.95rem' },
    modalSection: { background: '#f8fafc', borderRadius: 12, padding: 20, marginBottom: 20 },
    modalSectionTitle: { fontSize: '0.85rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700, marginBottom: 12 },
    modalItems: { display: 'flex', flexDirection: 'column', gap: 12 },
    modalItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0' },
    modalItemInfo: { display: 'flex', alignItems: 'center', gap: 12 },
    modalItemDetails: { display: 'flex', flexDirection: 'column' },
    modalItemDetailsH4: { fontWeight: 700, color: '#0f172a', marginBottom: 4 },
    modalItemDetailsP: { fontSize: '0.85rem', color: '#64748b' },
    modalItemPrice: { fontWeight: 800, color: '#0f172a', fontSize: '1.1rem' },
    modalSummary: { background: currentTheme.lightBg, border: `2px solid ${currentTheme.color}` },
    modalSummaryRow: { display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.95rem', color: currentTheme.textColor },
    modalSummaryRowLast: { marginBottom: 0, paddingTop: 12, borderTop: `1px solid ${currentTheme.color}`, fontWeight: 800, fontSize: '1.2rem', color: currentTheme.darkColor },
    modalActions: { display: 'flex', gap: 12, marginTop: 24 },
    modalBtn: (type, isHovered) => ({ flex: 1, padding: '14px 24px', border: '2px solid', borderRadius: 10, fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', transition: 'all 0.3s ease', background: type === 'cancel' ? (isHovered ? '#e2e8f0' : '#f1f5f9') : currentTheme.gradient, borderColor: type === 'cancel' ? '#e2e8f0' : 'transparent', color: type === 'cancel' ? (isHovered ? '#0f172a' : '#64748b') : '#ffffff', boxShadow: type === 'cancel' ? 'none' : (isHovered ? `0 6px 16px ${currentTheme.color}66` : `0 4px 12px ${currentTheme.color}4d`), transform: type === 'confirm' && isHovered ? 'translateY(-2px)' : 'translateY(0)' }),
    emptyState: { textAlign: 'center', padding: '80px 40px', color: '#94a3b8' },
    emptyIcon: { fontSize: '4rem', marginBottom: 16, animation: 'float 3s ease-in-out infinite' },
    emptyText: { fontSize: '1.1rem', color: '#64748b', marginBottom: 24 },
    emptyButton: (isHovered) => ({ padding: '12px 28px', background: currentTheme.gradient, color: '#ffffff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', transition: 'all 0.3s ease', display: 'inline-flex', alignItems: 'center', gap: 8, transform: isHovered ? 'translateY(-2px)' : 'translateY(0)', boxShadow: isHovered ? `0 4px 12px ${currentTheme.color}4d` : 'none' }),
    loadingSpinner: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400, fontSize: '3rem', animation: 'float 3s ease-in-out infinite' },
    skeletonCard: { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', height: 400 },
    skeletonImage: { width: '100%', height: 240, background: '#f1f5f9' },
    skeletonContent: { padding: 24, display: 'flex', flexDirection: 'column', gap: 16 },
    skeletonLine: (width) => ({ height: 16, width: width || '100%', background: '#e2e8f0', borderRadius: 4, animation: 'shimmer 1.5s infinite' }),
    syncButton: (status) => ({ padding: '12px 24px', background: status === 'synced' ? '#059669' : status === 'error' ? '#e11d48' : themes[otherTheme].gradient, color: '#ffffff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.95rem', cursor: status === 'syncing' ? 'wait' : 'pointer', transition: 'all 0.3s ease', display: 'inline-flex', alignItems: 'center', gap: 8, boxShadow: `0 2px 8px ${themes[otherTheme].color}33`, whiteSpace: 'nowrap', opacity: status === 'syncing' ? 0.7 : 1 }),
    syncNote: { fontSize: '0.85rem', color: '#64748b', marginTop: 12, padding: '8px 12px', background: '#f8fafc', borderRadius: 6, borderLeft: `3px solid ${themes[otherTheme].color}` }
  }

  return (
    <div style={s.dashboard}>
      {/* Header */}
      <header style={s.header}>
        <div style={s.headerContent}>
          <div style={s.headerLeft}>
            <h1 style={s.headerTitle}>
              {currentTheme.symbol} Dashboard
            </h1>
            <span style={s.headerBadge}>{currentTheme.name}</span>
            <span style={s.collectionBadge}>
              📦 {collectionNames.products}
            </span>
          </div>
          <button 
            onClick={handleLogout} 
            style={s.logoutBtn}
            onMouseEnter={(e) => {
              e.target.style.background = '#0f172a'
              e.target.style.color = '#ffffff'
              e.target.style.borderColor = '#0f172a'
              e.target.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'transparent'
              e.target.style.color = '#0f172a'
              e.target.style.borderColor = '#e2e8f0'
              e.target.style.transform = 'translateY(0)'
            }}
          >
            🚪 Logout
          </button>
        </div>
      </header>

      <main style={s.main}>
        {/* Navigation Tabs */}
        <div style={s.navTabs}>
          {[
            { id: 'products', icon: '📦', label: 'Products', count: products.length },
            { id: 'orders', icon: '🛒', label: 'Orders', count: pendingOrders.length },
            { id: 'confirmed', icon: '✅', label: 'Confirmed', count: confirmedPayments.length }
          ].map(tab => (
            <button
              key={tab.id}
              style={s.navTab(activeTab === tab.id)}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon} {tab.label}
              <span style={s.tabBadge(activeTab === tab.id)}>{tab.count}</span>
            </button>
          ))}
        </div>

        {/* Top Actions */}
        {activeTab === 'products' && (
          <div style={s.actionsBar}>
            <button
              onClick={() => setShowForm(!showForm)}
              style={s.addBtn}
              onMouseEnter={() => setHoveredButton('add')}
              onMouseLeave={() => setHoveredButton(null)}
            >
              <span>➕</span>
              {showForm ? 'Cancel' : 'Add Product'}
            </button>

            <div style={s.searchBox}>
              <span style={{position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '1.2rem'}}>🔍</span>
              <input
                type="text"
                placeholder="Search products..."
                style={s.searchInput}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={(e) => {
                  e.target.style.borderColor = currentTheme.color
                  e.target.style.boxShadow = `0 0 0 3px ${currentTheme.color}1a`
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e2e8f0'
                  e.target.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)'
                }}
              />
            </div>
          </div>
        )}

        {(activeTab === 'orders' || activeTab === 'confirmed') && (
          <div style={s.actionsBar}>
            <div style={{...s.searchBox, maxWidth: '100%'}}>
              <span style={{position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '1.2rem'}}>🔍</span>
              <input
                type="text"
                placeholder={activeTab === 'orders' ? "Search by Order ID, Payment ID, or product name..." : "Search confirmed payments..."}
                style={s.searchInput}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={(e) => {
                  e.target.style.borderColor = currentTheme.color
                  e.target.style.boxShadow = `0 0 0 3px ${currentTheme.color}1a`
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e2e8f0'
                  e.target.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)'
                }}
              />
            </div>
          </div>
        )}

        {/* Product Form */}
        {activeTab === 'products' && showForm && (
          <div style={s.formSection}>
            <div style={s.formSectionHeader}>
              <h3 style={s.formSectionTitle}>
                {editingProduct ? '✏️ Edit Product' : '✨ Add New Product'}
              </h3>
              <button
                onClick={() => {
                  setShowForm(false)
                  setEditingProduct(null)
                }}
                style={s.closeBtn}
                onMouseEnter={(e) => {
                  e.target.style.background = '#e2e8f0'
                  e.target.style.color = '#0f172a'
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#f1f5f9'
                  e.target.style.color = '#64748b'
                }}
              >
                ✕ Close
              </button>
            </div>
            <ProductForm 
              product={editingProduct} 
              onSuccess={handleSuccess}
              currency={currency}
              collectionName={collectionNames.products}
            />
            
            {/* Sync Button - Only show when editing existing product */}
            {editingProduct && (
              <div style={{marginTop: 24, paddingTop: 24, borderTop: '2px solid #f1f5f9'}}>
                <button
                  onClick={() => handleSyncProduct(editingProduct)}
                  disabled={syncStatus === 'syncing'}
                  style={s.syncButton(syncStatus)}
                  className={syncStatus === 'syncing' ? 'sync-pulse' : ''}
                >
                  {syncStatus === 'syncing' && '⏳ Syncing...'}
                  {syncStatus === 'synced' && '✅ Synced!'}
                  {syncStatus === 'error' && '❌ Error'}
                  {!syncStatus && (
                    <>
                      🔄 Sync to {otherCurrency} Store
                    </>
                  )}
                </button>
                <p style={s.syncNote}>
                  This will copy "{editingProduct.name}" to the <strong>{otherCurrency}</strong> products collection ({currency === 'PI' ? 'products_egp' : 'products_pi'})
                </p>
              </div>
            )}
          </div>
        )}

        {/* Products Section */}
        {activeTab === 'products' && (
          <>
            <div style={s.sectionHeader}>
              <h2 style={s.sectionTitle}>
                📦 Products
                <span style={s.sectionCount}>{filteredProducts.length}</span>
                <span style={{fontSize: '0.85rem', color: '#94a3b8', fontWeight: 500}}>
                  from {collectionNames.products}
                </span>
              </h2>
              {searchQuery && (
                <p style={s.sectionSubtitle}>
                  Search results for "{searchQuery}"
                </p>
              )}
            </div>

            {isLoading && !dataLoaded ? (
              <div style={s.productsGrid}>
                {[1,2,3,4].map(i => (
                  <div key={i} style={s.skeletonCard}>
                    <div className="skeleton" style={s.skeletonImage} />
                    <div style={s.skeletonContent}>
                      <div className="skeleton" style={s.skeletonLine('70%')} />
                      <div className="skeleton" style={s.skeletonLine('40%')} />
                      <div className="skeleton" style={s.skeletonLine('60%')} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {filteredProducts.length > 0 ? (
                  <div style={s.productsGrid}>
                    {filteredProducts.map(p => (
                      <div 
                        key={p.id} 
                        style={s.productCard(hoveredProduct === p.id)}
                        onMouseEnter={() => setHoveredProduct(p.id)}
                        onMouseLeave={() => setHoveredProduct(null)}
                      >
                        <div style={s.productImageContainer}>
                          {p.syncedFrom && (
                            <div style={{
                              position: 'absolute',
                              top: 12,
                              right: 12,
                              background: themes[p.syncedFrom.toLowerCase()]?.gradient || currentTheme.gradient,
                              color: '#ffffff',
                              padding: '4px 8px',
                              borderRadius: 6,
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              zIndex: 10
                            }}>
                              Synced from {p.syncedFrom}
                            </div>
                          )}
                          {p.imageUrl ? (
                            <img 
                              src={p.imageUrl} 
                              alt={p.name} 
                              style={s.productImage(hoveredProduct === p.id)}
                            />
                          ) : (
                            <div style={s.productPlaceholder}>📦</div>
                          )}
                        </div>

                        <div style={s.productContent}>
                          <h3 style={s.productName}>{p.name}</h3>
                          <p style={s.productPrice}>{currentTheme.symbol} {p.price?.toFixed(2)}</p>

                          <div style={s.productMeta}>
                            <span>📦 {p.piecesPerBox} pieces per box</span>
                            {p.flavors?.length > 0 && (
                              <span>🎨 {p.flavors.length} flavor{p.flavors.length !== 1 ? 's' : ''}</span>
                            )}
                            {p.stock !== undefined && (
                              <span style={{color: p.stock === 0 ? '#e11d48' : p.stock < 10 ? '#f59e0b' : '#059669', fontWeight: 600}}>
                                📊 Stock: {p.stock} {p.stock === 0 ? '(Out)' : p.stock < 10 ? '(Low)' : '(Good)'}
                              </span>
                            )}
                            {p.currency && (
                              <span style={{color: currentTheme.color, fontWeight: 600}}>
                                💰 {p.currency} Store
                              </span>
                            )}
                          </div>

                          <div style={s.productActions}>
                            <button
                              onClick={() => handleEdit(p)}
                              style={s.productBtn('edit', hoveredButton === `edit-${p.id}`)}
                              onMouseEnter={() => setHoveredButton(`edit-${p.id}`)}
                              onMouseLeave={() => setHoveredButton(null)}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(p)}
                              style={s.productBtn('delete', hoveredButton === `delete-${p.id}`)}
                              onMouseEnter={() => setHoveredButton(`delete-${p.id}`)}
                              onMouseLeave={() => setHoveredButton(null)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={s.emptyState}>
                    <div style={s.emptyIcon}>📭</div>
                    <p style={s.emptyText}>
                      {searchQuery
                        ? 'No products match your search'
                        : `No products in ${collectionNames.products}. Create your first product!`}
                    </p>
                    {!searchQuery && (
                      <button
                        onClick={() => setShowForm(true)}
                        style={s.emptyButton(hoveredButton === 'empty')}
                        onMouseEnter={() => setHoveredButton('empty')}
                        onMouseLeave={() => setHoveredButton(null)}
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
    <div style={s.sectionHeader}>
      <h2 style={s.sectionTitle}>
        🛒 Pending {currency} Orders
        <span style={s.sectionCount}>{filteredOrders.length}</span>
        <span style={{fontSize: '0.85rem', color: '#94a3b8', fontWeight: 500}}>
          from {collectionNames.orders}
        </span>
      </h2>
      <p style={s.sectionSubtitle}>
        {currency === 'PI' 
          ? 'Orders with completed payments awaiting confirmation for shipping'
          : 'Cash on delivery orders awaiting confirmation for shipping'}
      </p>
    </div>

    {filteredOrders.length > 0 ? (
      <div style={s.ordersContainer}>
        <table style={s.ordersTable}>
          <thead>
            <tr>
              <th style={s.tableHeader}>Order Details</th>
              <th style={s.tableHeader}>Customer</th>
              <th style={s.tableHeader}>Items</th>
              <th style={s.tableHeader}>Total</th>
              <th style={s.tableHeader}>Date</th>
              <th style={s.tableHeader}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map(order => (
              <tr key={order.id} style={{transition: 'background 0.2s'}}>
                <td style={s.tableCell}>
                  <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
                    <span style={s.orderId}>{order.orderId}</span>
                    {currency === 'PI' && order.paymentId && (
                      <span style={s.paymentId}>Payment: {order.paymentId?.slice(0, 16)}...</span>
                    )}
                    <span style={s.statusBadge(order.status)}>
                      {order.status === 'completed' || order.status === 'pending' ? '⏳ Pending' : order.status}
                    </span>
                  </div>
                </td>
                
                {/* Customer Info - EGP specific */}
                <td style={s.tableCell}>
                  <div style={{display: 'flex', flexDirection: 'column', gap: 4}}>
                    <span style={{fontWeight: 600, color: '#0f172a'}}>{order.customerName}</span>
                    <span style={{fontSize: '0.85rem', color: '#64748b'}}>📞 {order.customerPhone}</span>
                    {order.customerAddress && (
                      <span style={{fontSize: '0.8rem', color: '#94a3b8', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis'}}>
                        📍 {order.customerAddress}
                      </span>
                    )}
                    {order.customerLocation && (
                      <a 
                        href={`https://www.google.com/maps?q=${order.customerLocation.latitude},${order.customerLocation.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: '0.75rem',
                          color: currentTheme.color,
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        🗺️ View Map
                      </a>
                    )}
                  </div>
                </td>

                <td style={{...s.tableCell, ...s.orderItems}}>
                  {order.items?.map((item, idx) => (
                    <div key={idx} style={s.orderItem}>
                      <div style={s.itemPlaceholder}>📦</div>
                      <div style={s.itemDetails}>
                        <span style={s.itemName}>{item.name}</span>
                        <span style={s.itemMeta}>{item.quantity} × {currentTheme.symbol} {item.price?.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </td>
                
                <td style={s.tableCell}>
                  <span style={s.orderTotal}>
                    {currentTheme.symbol} {order.totalPrice?.toFixed(2)}
                  </span>
                  <span style={s.currencyBadge}>{order.currency}</span>
                </td>
                
                <td style={s.tableCell}>
                  {formatDate(order.createdAt)}
                </td>
                
                <td style={s.tableCell}>
                  <button
                    onClick={() => setConfirmPaymentModal(order)}
                    style={s.confirmBtn(hoveredButton === `confirm-${order.id}`)}
                    onMouseEnter={() => setHoveredButton(`confirm-${order.id}`)}
                    onMouseLeave={() => setHoveredButton(null)}
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
      <div style={s.emptyState}>
        <div style={s.emptyIcon}>📭</div>
        <p style={s.emptyText}>
          {searchQuery ? 'No orders match your search' : `No pending ${currency} orders in ${collectionNames.orders}`}
        </p>
      </div>
    )}
  </>
)}

        {/* Confirmed Payments Section */}
        {/* Confirmed Payments Section */}
{activeTab === 'confirmed' && (
  <>
    <div style={s.sectionHeader}>
      <h2 style={s.sectionTitle}>
        ✅ Confirmed {currency} Orders
        <span style={s.sectionCount}>{confirmedPayments.length}</span>
        <span style={{fontSize: '0.85rem', color: '#94a3b8', fontWeight: 500}}>
          from {collectionNames.confirmedPayments}
        </span>
      </h2>
      <p style={s.sectionSubtitle}>
        {currency === 'PI' 
          ? 'Pi Network payments confirmed and ready for shipping'
          : 'Cash on delivery orders confirmed and ready for shipping'}
      </p>
    </div>

    {confirmedPayments.length > 0 ? (
      <div style={s.confirmedGrid}>
        {confirmedPayments.map(payment => (
          <div 
            key={payment.id} 
            style={s.confirmedCard(hoveredCard === payment.id)}
            onMouseEnter={() => setHoveredCard(payment.id)}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div style={s.confirmedHeader}>
              <div style={s.confirmedIds}>
                <div style={s.confirmedOrderId}>{payment.orderId}</div>
                {currency === 'PI' && payment.paymentId && (
                  <div style={s.confirmedPaymentId}>{currentTheme.symbol} {payment.paymentId?.slice(0, 20)}...</div>
                )}
              </div>
              <span style={s.confirmedDate}>
                ✓ {formatDate(payment.confirmedAt)}
              </span>
            </div>

            {/* Customer Info for EGP */}
            {currency === 'EGP' && (
              <div style={{...s.confirmedSection, background: '#f8fafc', padding: 16, borderRadius: 8, marginBottom: 16}}>
                <div style={{...s.confirmedLabel, marginBottom: 12}}>Customer Details</div>
                <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                    <span>👤</span>
                    <span style={{fontWeight: 600}}>{payment.customerInfo?.customerName || payment.customerName}</span>
                  </div>
                  <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                    <span>📞</span>
                    <span>{payment.customerInfo?.customerPhone || payment.customerPhone}</span>
                  </div>
                  <div style={{display: 'flex', alignItems: 'flex-start', gap: 8}}>
                    <span>📍</span>
                    <span style={{fontSize: '0.9rem', lineHeight: 1.4}}>
                      {payment.customerInfo?.customerAddress || payment.customerAddress}
                    </span>
                  </div>
                  {(payment.customerInfo?.customerLocation || payment.customerLocation) && (
                    <a 
                      href={`https://www.google.com/maps?q=${(payment.customerInfo?.customerLocation || payment.customerLocation).latitude},${(payment.customerInfo?.customerLocation || payment.customerLocation).longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: '0.85rem',
                        color: currentTheme.color,
                        textDecoration: 'none',
                        marginTop: 4
                      }}
                    >
                      🗺️ View on Map
                    </a>
                  )}
                </div>
              </div>
            )}

            <div style={s.confirmedSection}>
              <div style={s.confirmedLabel}>Order Items</div>
              <div style={s.confirmedItemsList}>
                {payment.items?.map((item, idx) => (
                  <div key={idx} style={{
                    ...s.confirmedItem,
                    borderBottom: idx === payment.items.length - 1 ? 'none' : '1px solid #e2e8f0'
                  }}>
                    <div style={s.confirmedItemInfo}>
                      <div style={{fontSize: '1.5rem'}}>📦</div>
                      <div>
                        <div style={s.confirmedItemName}>{item.name}</div>
                        <div style={s.confirmedItemQty}>Qty: {item.quantity}</div>
                      </div>
                    </div>
                    <div style={s.confirmedItemPrice}>{currentTheme.symbol} {(item.price * item.quantity).toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={s.confirmedTotal}>
              <span style={s.confirmedTotalLabel}>Total Amount</span>
              <span style={s.confirmedTotalAmount}>
                {currentTheme.symbol} {payment.totalPrice?.toFixed(2)}
              </span>
            </div>

            <div style={s.confirmedMeta}>
              <div style={s.confirmedMetaItem}>
                📅 Confirmed: {formatDate(payment.confirmedAt)}
              </div>
              <div style={s.confirmedMetaItem}>
                👤 By: {payment.confirmedByEmail}
              </div>
              <div style={{...s.confirmedMetaItem, marginTop: 8}}>
                <span style={s.shippingStatus(payment.shippingStatus)}>
                  🚚 {payment.shippingStatus === 'shipped' ? 'Shipped' : 'Pending'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <div style={s.emptyState}>
        <div style={s.emptyIcon}>📭</div>
        <p style={s.emptyText}>No confirmed {currency} orders in {collectionNames.confirmedPayments}</p>
      </div>
    )}
  </>
)}

        {/* Confirm Payment Modal */}
        {/* Confirm Payment Modal */}
{confirmPaymentModal && (
  <div style={s.modalOverlay} onClick={() => setConfirmPaymentModal(null)}>
    <div style={s.modal} onClick={(e) => e.stopPropagation()}>
      <div style={s.modalHeader}>
        <h3 style={s.modalTitle}>
          ✅ Confirm {currency} Order for Shipping
        </h3>
        <p style={s.modalSubtitle}>
          {currency === 'PI' 
            ? 'Review order details before confirming payment for shipping'
            : 'Review cash on delivery order before confirming for shipping'}
        </p>
      </div>

      <div style={s.modalSection}>
        <div style={s.modalSectionTitle}>Order Information</div>
        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12}}>
          <div>
            <div style={{fontSize: '0.85rem', color: '#64748b'}}>Order ID</div>
            <div style={{fontWeight: 700, color: '#0f172a'}}>{confirmPaymentModal.orderId}</div>
          </div>
          
          {currency === 'PI' && confirmPaymentModal.paymentId && (
            <div>
              <div style={{fontSize: '0.85rem', color: '#64748b'}}>Payment ID</div>
              <div style={{fontFamily: 'monospace', fontSize: '0.9rem'}}>{confirmPaymentModal.paymentId}</div>
            </div>
          )}
          
          {currency === 'EGP' && (
            <>
              <div>
                <div style={{fontSize: '0.85rem', color: '#64748b'}}>Customer Name</div>
                <div style={{fontWeight: 600}}>{confirmPaymentModal.customerName}</div>
              </div>
              <div>
                <div style={{fontSize: '0.85rem', color: '#64748b'}}>Phone</div>
                <div>{confirmPaymentModal.customerPhone}</div>
              </div>
            </>
          )}
          
          <div>
            <div style={{fontSize: '0.85rem', color: '#64748b'}}>Order Date</div>
            <div>{formatDate(confirmPaymentModal.createdAt)}</div>
          </div>
          
          <div>
            <div style={{fontSize: '0.85rem', color: '#64748b'}}>Status</div>
            <span style={s.statusBadge(confirmPaymentModal.status)}>
              {confirmPaymentModal.status}
            </span>
          </div>
        </div>

        {/* EGP Customer Location Map */}
        {currency === 'EGP' && confirmPaymentModal.customerLocation && (
          <div style={{marginTop: 16}}>
            <div style={{fontSize: '0.85rem', color: '#64748b', marginBottom: 8}}>Delivery Location</div>
            <div style={{
              height: 150,
              borderRadius: 8,
              overflow: 'hidden',
              border: `2px solid ${currentTheme.borderColor}`
            }}>
              <iframe
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${confirmPaymentModal.customerLocation.longitude - 0.01}%2C${confirmPaymentModal.customerLocation.latitude - 0.01}%2C${confirmPaymentModal.customerLocation.longitude + 0.01}%2C${confirmPaymentModal.customerLocation.latitude + 0.01}&marker=${confirmPaymentModal.customerLocation.latitude}%2C${confirmPaymentModal.customerLocation.longitude}`}
                style={{ width: '100%', height: '100%', border: 'none' }}
                title="Customer Location"
              />
            </div>
            <a 
              href={`https://www.google.com/maps?q=${confirmPaymentModal.customerLocation.latitude},${confirmPaymentModal.customerLocation.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                marginTop: 8,
                fontSize: '0.85rem',
                color: currentTheme.color,
                textDecoration: 'none'
              }}
            >
              🗺️ Open in Google Maps
            </a>
          </div>
        )}

        {/* EGP Address */}
        {currency === 'EGP' && confirmPaymentModal.customerAddress && (
          <div style={{marginTop: 16, padding: 12, background: '#f8fafc', borderRadius: 8}}>
            <div style={{fontSize: '0.85rem', color: '#64748b', marginBottom: 4}}>Delivery Address</div>
            <div style={{fontSize: '0.95rem', color: '#0f172a', fontWeight: 500}}>
              {confirmPaymentModal.customerAddress}
            </div>
          </div>
        )}
      </div>

      <div style={s.modalSection}>
        <div style={s.modalSectionTitle}>Order Items ({confirmPaymentModal.totalItems})</div>
        <div style={s.modalItems}>
          {confirmPaymentModal.items?.map((item, idx) => (
            <div key={idx} style={s.modalItem}>
              <div style={s.modalItemInfo}>
                <div style={{fontSize: '1.5rem'}}>📦</div>
                <div style={s.modalItemDetails}>
                  <h4 style={s.modalItemDetailsH4}>{item.name}</h4>
                  <p style={s.modalItemDetailsP}>Qty: {item.quantity} × {currentTheme.symbol} {item.price?.toFixed(2)}</p>
                </div>
              </div>
              <div style={s.modalItemPrice}>{currentTheme.symbol} {(item.price * item.quantity).toFixed(2)}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{...s.modalSection, ...s.modalSummary}}>
        <div style={s.modalSummaryRow}>
          <span>Total Items:</span>
          <span>{confirmPaymentModal.totalItems}</span>
        </div>
        <div style={s.modalSummaryRow}>
          <span>Currency:</span>
          <span>{confirmPaymentModal.currency}</span>
        </div>
        <div style={{...s.modalSummaryRow, ...s.modalSummaryRowLast}}>
          <span>Total Amount:</span>
          <span>{currentTheme.symbol} {confirmPaymentModal.totalPrice?.toFixed(2)}</span>
        </div>
      </div>

      <div style={s.modalActions}>
        <button
          onClick={() => setConfirmPaymentModal(null)}
          style={s.modalBtn('cancel', hoveredModalBtn.cancel)}
          onMouseEnter={() => setHoveredModalBtn({...hoveredModalBtn, cancel: true})}
          onMouseLeave={() => setHoveredModalBtn({...hoveredModalBtn, cancel: false})}
        >
          Cancel
        </button>
        <button
          onClick={() => handleConfirmPayment(confirmPaymentModal)}
          style={s.modalBtn('confirm', hoveredModalBtn.confirm)}
          onMouseEnter={() => setHoveredModalBtn({...hoveredModalBtn, confirm: true})}
          onMouseLeave={() => setHoveredModalBtn({...hoveredModalBtn, confirm: false})}
        >
          ✓ Confirm for Shipping
        </button>
      </div>
    </div>
  </div>
)}
      </main>
    </div>
  )
}