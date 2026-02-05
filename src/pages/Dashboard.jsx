// src/pages/Dashboard.jsx
import { useEffect, useState } from 'react'
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { db, auth } from '../services/firebase'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import ProductForm from '../components/ProductForm'

export default function Dashboard() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!currentUser) {
      navigate('/login')
      return
    }
    loadProducts()
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
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

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

        .add-btn:active {
          transform: translateY(0);
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

        /* Products Section */
        .products-header {
          margin-bottom: 32px;
        }

        .products-title {
          font-size: 1.5rem;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .products-count {
          background: linear-gradient(135deg, #e0e7ff 0%, #ddd6fe 100%);
          color: #3730a3;
          padding: 2px 10px;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 700;
        }

        .products-subtitle {
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

        /* Delete Confirmation Modal */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 200;
          animation: fadeIn 0.2s ease-out;
        }

        .modal {
          background: #ffffff;
          border-radius: 12px;
          padding: 32px;
          max-width: 400px;
          box-shadow: 0 20px 25px rgba(0, 0, 0, 0.15);
          animation: slideUp 0.3s ease-out;
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

        .modal-title {
          font-size: 1.3rem;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 12px;
        }

        .modal-text {
          color: #64748b;
          margin-bottom: 28px;
          line-height: 1.5;
        }

        .modal-actions {
          display: flex;
          gap: 12px;
        }

        .modal-btn {
          flex: 1;
          padding: 12px 16px;
          border: 2px solid;
          border-radius: 8px;
          font-weight: 700;
          font-size: 0.9rem;
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
        }

        .modal-btn.confirm {
          background: #e11d48;
          border-color: #e11d48;
          color: #ffffff;
        }

        .modal-btn.confirm:hover {
          background: #be123c;
          border-color: #be123c;
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
            margin: 20px;
            max-width: calc(100% - 40px);
          }

          .products-title {
            font-size: 1.2rem;
          }

          .empty-state {
            padding: 60px 20px;
          }

          .product-placeholder {
            font-size: 2.5rem;
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

          .modal {
            margin: 12px;
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
        {/* Top Actions */}
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

        {/* Product Form */}
        {showForm && (
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
        <div className="products-header">
          <h2 className="products-title">
            📦 Products
            <span className="products-count">{filteredProducts.length}</span>
          </h2>
          {searchQuery && (
            <p className="products-subtitle">
              Search results for "{searchQuery}"
            </p>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="loading-spinner">⏳</div>
        )}

        {/* Products Grid */}
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
                      <p className="product-price">π {p.price.toFixed(2)}</p>

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
      </main>
    </div>
  )
}