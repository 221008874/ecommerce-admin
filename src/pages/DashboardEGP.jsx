import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import ProductForm from '../components/ProductForm'
import { useDashboardEGP } from '../hooks/useDashboardEGP'
import { themes } from '../config/themes'
import { createStyles } from '../styles/dashboardStyles'

export default function DashboardEGP() {
  const theme = themes.egp
  const otherTheme = themes.pi
  
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  
  const {
    isReady,
    isMobile,
    isTablet,
    products,
    showForm,
    editingProduct,
    searchQuery,
    deleteConfirm,
    isLoading,
    activeTab,
    confirmPaymentModal,
    dataLoaded,
    syncStatus,
    selectedDate,
    otherCurrency,
    collectionNames,
    filteredProducts,
    filteredOrders,
    filteredConfirmedPayments,
    dateButtons,
    setSearchQuery,
    setActiveTab,
    setShowForm,
    setEditingProduct,
    setDeleteConfirm,
    setConfirmPaymentModal,
    setSelectedDate,
    loadAllData,
    handleDelete,
    handleSuccess,
    handleEdit,
    handleLogout,
    handleSyncProduct,
    handleConfirmPayment,
    formatDate
  } = useDashboardEGP()

  const [hoveredProduct, setHoveredProduct] = useState(null)
  const [hoveredCard, setHoveredCard] = useState(null)
  const [hoveredButton, setHoveredButton] = useState(null)
  const [hoveredModalBtn, setHoveredModalBtn] = useState({})

  const s = createStyles(theme, otherTheme, isMobile, isTablet)

  useEffect(() => {
    if (!currentUser) {
      navigate('/login')
      return
    }
    loadAllData()
  }, [currentUser])

  useEffect(() => {
    const styleId = 'dashboard-styles-egp'
    if (!document.getElementById(styleId)) {
      const styleSheet = document.createElement('style')
      styleSheet.id = styleId
      styleSheet.textContent = `
        @keyframes slideDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        @keyframes pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(15, 23, 42, 0.4); } 50% { box-shadow: 0 0 0 10px rgba(15, 23, 42, 0); } }
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; }
        .skeleton { background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 8px; }
        .sync-pulse { animation: pulse 2s infinite; }
        .dashboard-loading { min-height: 100vh; background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); display: flex; align-items: center; justify-content: center; }
        .date-filter-scroll { display: flex; gap: 8px; overflow-x: auto; padding: 4px; scroll-behavior: smooth; -webkit-overflow-scrolling: touch; scrollbar-width: thin; scrollbar-color: ${theme.color} #f1f5f9; }
        .date-filter-scroll::-webkit-scrollbar { height: 6px; }
        .date-filter-scroll::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 3px; }
        .date-filter-scroll::-webkit-scrollbar-thumb { background: ${theme.color}; border-radius: 3px; }
        @media (max-width: 768px) { table { display: block; overflow-x: auto; white-space: nowrap; } }
      `
      document.head.appendChild(styleSheet)
    }
  }, [])

  if (!isReady) {
    return (
      <div className="dashboard-loading">
        <div style={{fontSize: '2rem', color: '#94a3b8', animation: 'spin 1s linear infinite'}}>⟳</div>
      </div>
    )
  }

  const onConfirmPayment = (order) => handleConfirmPayment(order, currentUser)

  return (
    <div style={s.dashboard}>
      {/* Header */}
      <header style={s.header}>
        <div style={s.headerContent}>
          <div style={s.headerLeft}>
            <h1 style={s.headerTitle}>{theme.symbol} Dashboard</h1>
            <span style={s.headerBadge}>{theme.name}</span>
            {!isMobile && <span style={{...s.headerBadge, background: theme.lightBg, color: theme.textColor}}>📦 {collectionNames.products}</span>}
          </div>
          <button 
            onClick={handleLogout} 
            style={s.logoutBtn}
            onMouseEnter={(e) => { e.target.style.background = '#0f172a'; e.target.style.color = '#ffffff'; e.target.style.borderColor = '#0f172a'; e.target.style.transform = 'translateY(-2px)' }}
            onMouseLeave={(e) => { e.target.style.background = 'transparent'; e.target.style.color = '#0f172a'; e.target.style.borderColor = '#e2e8f0'; e.target.style.transform = 'translateY(0)' }}
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
            { id: 'orders', icon: '🛒', label: 'Orders', count: filteredOrders.length },
            { id: 'confirmed', icon: '✅', label: 'Confirmed', count: filteredConfirmedPayments.length }
          ].map(tab => (
            <button key={tab.id} style={s.navTab(activeTab === tab.id)} onClick={() => setActiveTab(tab.id)}>
              {tab.icon} {tab.label}
              <span style={s.tabBadge(activeTab === tab.id)}>{tab.count}</span>
            </button>
          ))}
        </div>

        {/* Search/Actions Bar */}
        {activeTab === 'products' && (
          <div style={s.actionsBar}>
            <button onClick={() => setShowForm(!showForm)} style={s.addBtn} onMouseEnter={() => setHoveredButton('add')} onMouseLeave={() => setHoveredButton(null)}>
              <span>➕</span>{showForm ? 'Cancel' : 'Add Product'}
            </button>
            <div style={s.searchBox}>
              <span style={{position: 'absolute', left: isMobile ? 10 : 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '1.2rem'}}>🔍</span>
              <input type="text" placeholder="Search products..." style={s.searchInput} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={(e) => { e.target.style.borderColor = theme.color; e.target.style.boxShadow = `0 0 0 3px ${theme.color}1a` }}
                onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)' }} />
            </div>
          </div>
        )}

        {(activeTab === 'orders' || activeTab === 'confirmed') && (
          <div style={s.actionsBar}>
            <div style={{...s.searchBox, maxWidth: '100%'}}>
              <span style={{position: 'absolute', left: isMobile ? 10 : 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '1.2rem'}}>🔍</span>
              <input type="text" placeholder={activeTab === 'orders' ? "Search by Order ID or product name..." : "Search confirmed orders..."} style={s.searchInput} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={(e) => { e.target.style.borderColor = theme.color; e.target.style.boxShadow = `0 0 0 3px ${theme.color}1a` }}
                onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)' }} />
            </div>
          </div>
        )}

        {/* Date Filter for Confirmed Orders */}
        {activeTab === 'confirmed' && (
          <div style={s.dateFilterContainer}>
            <div style={s.dateFilterLabel}>
              📅 Filter by Date
              <span style={{fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500}}>
                (Showing: {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })})
              </span>
            </div>
            <div className="date-filter-scroll">
              {dateButtons.map((btn) => (
                <button key={btn.date} style={s.dateButton(selectedDate === btn.date, btn.isToday)} onClick={() => setSelectedDate(btn.date)}
                  onMouseEnter={(e) => { if (selectedDate !== btn.date) { e.target.style.borderColor = theme.color; e.target.style.transform = 'translateY(-2px)' } }}
                  onMouseLeave={(e) => { if (selectedDate !== btn.date) { e.target.style.borderColor = '#e2e8f0'; e.target.style.transform = 'translateY(0)' } }}>
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Product Form */}
        {activeTab === 'products' && showForm && (
          <div style={s.formSection}>
            <div style={s.formSectionHeader}>
              <h3 style={s.formSectionTitle}>{editingProduct ? '✏️ Edit Product' : '✨ Add New Product'}</h3>
              <button onClick={() => { setShowForm(false); setEditingProduct(null) }} style={s.closeBtn}
                onMouseEnter={(e) => { e.target.style.background = '#e2e8f0'; e.target.style.color = '#0f172a' }}
                onMouseLeave={(e) => { e.target.style.background = '#f1f5f9'; e.target.style.color = '#64748b' }}>✕ Close</button>
            </div>
            <ProductForm product={editingProduct} onSuccess={handleSuccess} currency="EGP" collectionName={collectionNames.products} />
            
            {editingProduct && (
              <div style={{marginTop: 24, paddingTop: 24, borderTop: '2px solid #f1f5f9'}}>
                <button onClick={() => handleSyncProduct(editingProduct)} disabled={syncStatus === 'syncing'} style={s.syncButton(syncStatus)} className={syncStatus === 'syncing' ? 'sync-pulse' : ''}>
                  {syncStatus === 'syncing' && '⏳ Syncing...'}
                  {syncStatus === 'synced' && '✅ Synced!'}
                  {syncStatus === 'error' && '❌ Error'}
                  {!syncStatus && <>🔄 Sync to {otherCurrency} Store</>}
                </button>
                <p style={s.syncNote}>This will copy "{editingProduct.name}" to the <strong>{otherCurrency}</strong> products collection</p>
              </div>
            )}
          </div>
        )}

        {/* Products Section */}
        {activeTab === 'products' && (
          <>
            <div style={s.sectionHeader}>
              <h2 style={s.sectionTitle}>📦 Products<span style={s.sectionCount}>{filteredProducts.length}</span></h2>
              {searchQuery && <p style={s.sectionSubtitle}>Search results for "{searchQuery}"</p>}
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
                      <div key={p.id} style={s.productCard(hoveredProduct === p.id)} onMouseEnter={() => setHoveredProduct(p.id)} onMouseLeave={() => setHoveredProduct(null)}>
                        <div style={s.productImageContainer}>
                          {p.syncedFrom && (
                            <div style={{ position: 'absolute', top: 12, right: 12, background: themes[p.syncedFrom.toLowerCase()]?.gradient || theme.gradient, color: '#ffffff', padding: '4px 8px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700, zIndex: 10 }}>
                              Synced from {p.syncedFrom}
                            </div>
                          )}
                          {p.imageUrl ? <img src={p.imageUrl} alt={p.name} style={s.productImage(hoveredProduct === p.id)} /> : <div style={s.productPlaceholder}>📦</div>}
                        </div>
                        <div style={s.productContent}>
                          <h3 style={s.productName}>{p.name}</h3>
                          <p style={s.productPrice}>{theme.symbol} {p.price?.toFixed(2)}</p>
                          <div style={s.productMeta}>
                            <span>📦 {p.piecesPerBox} pieces per box</span>
                            {p.flavors?.length > 0 && <span>🎨 {p.flavors.length} flavor{p.flavors.length !== 1 ? 's' : ''}</span>}
                            {p.stock !== undefined && <span style={{color: p.stock === 0 ? '#e11d48' : p.stock < 10 ? '#f59e0b' : '#059669', fontWeight: 600}}>📊 Stock: {p.stock}</span>}
                          </div>
                          <div style={s.productActions}>
                            <button onClick={() => handleEdit(p)} style={s.productBtn('edit', hoveredButton === `edit-${p.id}`)} onMouseEnter={() => setHoveredButton(`edit-${p.id}`)} onMouseLeave={() => setHoveredButton(null)}>Edit</button>
                            <button onClick={() => setDeleteConfirm(p)} style={s.productBtn('delete', hoveredButton === `delete-${p.id}`)} onMouseEnter={() => setHoveredButton(`delete-${p.id}`)} onMouseLeave={() => setHoveredButton(null)}>Delete</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={s.emptyState}>
                    <div style={s.emptyIcon}>📭</div>
                    <p style={s.emptyText}>{searchQuery ? 'No products match your search' : 'No products found. Create your first product!'}</p>
                    {!searchQuery && <button onClick={() => setShowForm(true)} style={s.emptyButton(hoveredButton === 'empty')} onMouseEnter={() => setHoveredButton('empty')} onMouseLeave={() => setHoveredButton(null)}><span>➕</span>Add First Product</button>}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Orders Section - EGP specific with customer details */}
        {activeTab === 'orders' && (
          <>
            <div style={s.sectionHeader}>
              <h2 style={s.sectionTitle}>🛒 Pending EGP Orders<span style={s.sectionCount}>{filteredOrders.length}</span></h2>
              <p style={s.sectionSubtitle}>Cash on delivery orders awaiting confirmation for shipping</p>
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
                      <tr key={order.id}>
                        <td style={s.tableCell}>
                          <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
                            <span style={s.orderId}>{order.orderId}</span>
                            <span style={s.statusBadge(order.status)}>⏳ Pending</span>
                          </div>
                        </td>
                        
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
                                style={{fontSize: '0.75rem', color: theme.color, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4}}
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
                                <span style={s.itemMeta}>{item.quantity} × {theme.symbol} {item.price?.toFixed(2)}</span>
                              </div>
                            </div>
                          ))}
                        </td>
                        
                        <td style={s.tableCell}>
                          <span style={s.orderTotal}>{theme.symbol} {order.totalPrice?.toFixed(2)}</span>
                          <span style={s.currencyBadge}>{order.currency}</span>
                        </td>
                        
                        <td style={s.tableCell}>{formatDate(order.createdAt)}</td>
                        
                        <td style={s.tableCell}>
                          <button onClick={() => setConfirmPaymentModal(order)} style={s.confirmBtn(hoveredButton === `confirm-${order.id}`)} onMouseEnter={() => setHoveredButton(`confirm-${order.id}`)} onMouseLeave={() => setHoveredButton(null)}>✓ Confirm</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={s.emptyState}>
                <div style={s.emptyIcon}>📭</div>
                <p style={s.emptyText}>{searchQuery ? 'No orders match your search' : 'No pending EGP orders'}</p>
              </div>
            )}
          </>
        )}

        {/* Confirmed Payments Section - EGP specific with customer details */}
        {activeTab === 'confirmed' && (
          <>
            <div style={s.sectionHeader}>
              <h2 style={s.sectionTitle}>✅ Confirmed EGP Orders<span style={s.sectionCount}>{filteredConfirmedPayments.length}</span></h2>
              <p style={s.sectionSubtitle}>Cash on delivery orders confirmed and ready for shipping</p>
            </div>

            {filteredConfirmedPayments.length > 0 ? (
              <div style={s.confirmedGrid}>
                {filteredConfirmedPayments.map(payment => (
                  <div key={payment.id} style={s.confirmedCard(hoveredCard === payment.id)} onMouseEnter={() => setHoveredCard(payment.id)} onMouseLeave={() => setHoveredCard(null)}>
                    <div style={s.confirmedHeader}>
                      <div style={s.confirmedIds}>
                        <div style={s.confirmedOrderId}>{payment.orderId}</div>
                      </div>
                      <span style={s.confirmedDate}>✓ {formatDate(payment.confirmedAt)}</span>
                    </div>

                    {/* Customer Info for EGP */}
                    <div style={{
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12,
  overflow: 'hidden',
  marginBottom: 16
}}>
  {/* Header row */}
  <div style={{
    padding: '8px 14px',
    background: 'rgba(255,255,255,0.04)',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
    fontSize: '0.68rem',
    fontWeight: 700,
    color: 'rgba(255,255,255,0.40)',
    textTransform: 'uppercase',
    letterSpacing: '1px'
  }}>
    Customer Details
  </div>

  <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>

    {/* Name */}
    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'nowrap' }}>
      <div style={{
        width: 28, height: 28, borderRadius: 7, flexShrink: 0,
        background: `${theme.color}18`,
        border: `1px solid ${theme.color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.8rem'
      }}>👤</div>
      <span style={{
        fontWeight: 700, fontSize: '0.88rem', color: '#ffffff',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
      }}>
        {payment.customerInfo?.customerName || payment.customerName}
      </span>
    </div>

    {/* Phone */}
    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'nowrap' }}>
      <div style={{
        width: 28, height: 28, borderRadius: 7, flexShrink: 0,
        background: 'rgba(16,185,129,0.12)',
        border: '1px solid rgba(16,185,129,0.22)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.8rem'
      }}>📞</div>
      <span style={{
        fontSize: '0.82rem', color: 'rgba(255,255,255,0.80)',
        fontFamily: "'JetBrains Mono', monospace",
        letterSpacing: '0.3px', whiteSpace: 'nowrap'
      }}>
        {payment.customerInfo?.customerPhone || payment.customerPhone}
      </span>
    </div>

    {/* Address */}
    {(payment.customerInfo?.customerAddress || payment.customerAddress) && (
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: 10, flexWrap: 'nowrap' }}>
        <div style={{
          width: 28, height: 28, borderRadius: 7, flexShrink: 0,
          background: 'rgba(245,158,11,0.12)',
          border: '1px solid rgba(245,158,11,0.22)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.8rem', marginTop: 2
        }}>📍</div>
        <span style={{
          fontSize: '0.82rem', color: 'rgba(255,255,255,0.75)',
          lineHeight: 1.5, flex: 1
        }}>
          {payment.customerInfo?.customerAddress || payment.customerAddress}
        </span>
      </div>
    )}

    {/* Map link */}
    {(payment.customerInfo?.customerLocation || payment.customerLocation) && (
      <a
        href={`https://www.google.com/maps?q=${(payment.customerInfo?.customerLocation || payment.customerLocation).latitude},${(payment.customerInfo?.customerLocation || payment.customerLocation).longitude}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-flex', flexDirection: 'row', alignItems: 'center',
          gap: 6, padding: '6px 12px',
          background: `${theme.color}15`,
          border: `1px solid ${theme.color}30`,
          borderRadius: 8, fontSize: '0.78rem', fontWeight: 700,
          color: theme.color, textDecoration: 'none',
          alignSelf: 'flex-start', whiteSpace: 'nowrap'
        }}
      >
        🗺️ Open in Google Maps
      </a>
    )}

  </div>
</div>

                    <div style={s.confirmedSection}>
                      <div style={s.confirmedLabel}>Order Items</div>
                      <div style={s.confirmedItemsList}>
                        {payment.items?.map((item, idx) => (
                          <div key={idx} style={{...s.confirmedItem, borderBottom: idx === payment.items.length - 1 ? 'none' : '1px solid #e2e8f0'}}>
                            <div style={s.confirmedItemInfo}>
                              <div style={{fontSize: '1.5rem'}}>📦</div>
                              <div>
                                <div style={s.confirmedItemName}>{item.name}</div>
                                <div style={s.confirmedItemQty}>Qty: {item.quantity}</div>
                              </div>
                            </div>
                            <div style={s.confirmedItemPrice}>{theme.symbol} {(item.price * item.quantity).toFixed(2)}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={s.confirmedTotal}>
                      <span style={s.confirmedTotalLabel}>Total Amount</span>
                      <span style={s.confirmedTotalAmount}>{theme.symbol} {payment.totalPrice?.toFixed(2)}</span>
                    </div>

                    <div style={s.confirmedMeta}>
                      <div style={s.confirmedMetaItem}>📅 Confirmed: {formatDate(payment.confirmedAt)}</div>
                      <div style={s.confirmedMetaItem}>👤 By: {payment.confirmedByEmail}</div>
                      <div style={{...s.confirmedMetaItem, marginTop: 8}}>
                        <span style={s.shippingStatus(payment.shippingStatus)}>🚚 {payment.shippingStatus === 'shipped' ? 'Shipped' : 'Pending'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={s.emptyState}>
                <div style={s.emptyIcon}>📭</div>
                <p style={s.emptyText}>No confirmed EGP orders for {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                <p style={{fontSize: '0.9rem', color: '#94a3b8', marginTop: 8}}>Try selecting a different date from the filter above</p>
              </div>
            )}
          </>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div style={s.modalOverlay} onClick={() => setDeleteConfirm(null)}>
            <div style={s.modal} onClick={(e) => e.stopPropagation()}>
              <div style={s.modalHeader}>
                <h3 style={s.modalTitle}>🗑️ Delete Product</h3>
                <p style={s.modalSubtitle}>Are you sure you want to delete this product? This action cannot be undone.</p>
              </div>
              <div style={s.modalSection}>
                <p style={s.deleteModalText}>You are about to delete:<span style={s.deleteModalProductName}>📦 {deleteConfirm.name}</span></p>
                <p style={{fontSize: '0.85rem', color: '#94a3b8'}}>Price: {theme.symbol} {deleteConfirm.price?.toFixed(2)} | ID: {deleteConfirm.id}</p>
              </div>
              <div style={s.modalActions}>
                <button onClick={() => setDeleteConfirm(null)} style={s.modalBtn('cancel', hoveredModalBtn.cancel)} onMouseEnter={() => setHoveredModalBtn({...hoveredModalBtn, cancel: true})} onMouseLeave={() => setHoveredModalBtn({...hoveredModalBtn, cancel: false})}>Cancel</button>
                <button onClick={() => handleDelete(deleteConfirm.id)} style={{...s.modalBtn('confirm', hoveredModalBtn.confirm), background: hoveredModalBtn.confirm ? '#dc2626' : '#e11d48', borderColor: '#e11d48'}} onMouseEnter={() => setHoveredModalBtn({...hoveredModalBtn, confirm: true})} onMouseLeave={() => setHoveredModalBtn({...hoveredModalBtn, confirm: false})}>🗑️ Delete Product</button>
              </div>
            </div>
          </div>
        )}

        {/* Confirm Payment Modal - EGP specific with customer details */}
        {confirmPaymentModal && (
          <div style={s.modalOverlay} onClick={() => setConfirmPaymentModal(null)}>
            <div style={s.modal} onClick={(e) => e.stopPropagation()}>
              <div style={s.modalHeader}>
                <h3 style={s.modalTitle}>✅ Confirm EGP Order for Shipping</h3>
                <p style={s.modalSubtitle}>Review cash on delivery order before confirming for shipping</p>
              </div>

              <div style={s.modalSection}>
                <div style={s.modalSectionTitle}>Order Information</div>
                <div style={{display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12}}>
                  <div>
                    <div style={{fontSize: '0.85rem', color: '#64748b'}}>Order ID</div>
                    <div style={{fontWeight: 700, color: '#0f172a'}}>{confirmPaymentModal.orderId}</div>
                  </div>
                  <div>
                    <div style={{fontSize: '0.85rem', color: '#64748b'}}>Customer Name</div>
                    <div style={{fontWeight: 600}}>{confirmPaymentModal.customerName}</div>
                  </div>
                  <div>
                    <div style={{fontSize: '0.85rem', color: '#64748b'}}>Phone</div>
                    <div>{confirmPaymentModal.customerPhone}</div>
                  </div>
                  <div>
                    <div style={{fontSize: '0.85rem', color: '#64748b'}}>Order Date</div>
                    <div>{formatDate(confirmPaymentModal.createdAt)}</div>
                  </div>
                  <div>
                    <div style={{fontSize: '0.85rem', color: '#64748b'}}>Status</div>
                    <span style={s.statusBadge(confirmPaymentModal.status)}>{confirmPaymentModal.status}</span>
                  </div>
                </div>

                {/* EGP Customer Location Map */}
                {confirmPaymentModal.customerLocation && (
                  <div style={{marginTop: 16}}>
                    <div style={{fontSize: '0.85rem', color: '#64748b', marginBottom: 8}}>Delivery Location</div>
                    <div style={{height: 150, borderRadius: 8, overflow: 'hidden', border: `2px solid ${theme.borderColor}`}}>
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
                      style={{display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: '0.85rem', color: theme.color, textDecoration: 'none'}}
                    >
                      🗺️ Open in Google Maps
                    </a>
                  </div>
                )}

                {/* EGP Address */}
                {confirmPaymentModal.customerAddress && (
                  <div style={{marginTop: 16, padding: 12, background: '#f8fafc', borderRadius: 8}}>
                    <div style={{fontSize: '0.85rem', color: '#64748b', marginBottom: 4}}>Delivery Address</div>
                    <div style={{fontSize: '0.95rem', color: '#0f172a', fontWeight: 500}}>{confirmPaymentModal.customerAddress}</div>
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
                          <p style={s.modalItemDetailsP}>Qty: {item.quantity} × {theme.symbol} {item.price?.toFixed(2)}</p>
                        </div>
                      </div>
                      <div style={s.modalItemPrice}>{theme.symbol} {(item.price * item.quantity).toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{...s.modalSection, ...s.modalSummary}}>
                <div style={s.modalSummaryRow}><span>Total Items:</span><span>{confirmPaymentModal.totalItems}</span></div>
                <div style={s.modalSummaryRow}><span>Currency:</span><span>{confirmPaymentModal.currency}</span></div>
                <div style={{...s.modalSummaryRow, ...s.modalSummaryRowLast}}><span>Total Amount:</span><span>{theme.symbol} {confirmPaymentModal.totalPrice?.toFixed(2)}</span></div>
              </div>

              <div style={s.modalActions}>
                <button onClick={() => setConfirmPaymentModal(null)} style={s.modalBtn('cancel', hoveredModalBtn.cancel)} onMouseEnter={() => setHoveredModalBtn({...hoveredModalBtn, cancel: true})} onMouseLeave={() => setHoveredModalBtn({...hoveredModalBtn, cancel: false})}>Cancel</button>
                <button onClick={() => onConfirmPayment(confirmPaymentModal)} style={s.modalBtn('confirm', hoveredModalBtn.confirm)} onMouseEnter={() => setHoveredModalBtn({...hoveredModalBtn, confirm: true})} onMouseLeave={() => setHoveredModalBtn({...hoveredModalBtn, confirm: false})}>✓ Confirm for Shipping</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}