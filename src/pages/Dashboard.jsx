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

  useEffect(() => {
    if (!currentUser) {
      navigate('/login')
      return
    }
    loadProducts()
  }, [currentUser, navigate])

  const loadProducts = async () => {
    const snapshot = await getDocs(collection(db, 'products'))
    const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    setProducts(list)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Delete this product?')) {
      await deleteDoc(doc(db, 'products', id))
      loadProducts()
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
  }

  const handleLogout = async () => {
    await signOut(auth)
    navigate('/login')
  }

  return (
    <div style={{ 
      minHeight: '100vh',
      background: '#FFFFFF'
    }}>
      {/* Header */}
      <header style={{
        background: '#FAFAFA',
        borderBottom: '1px solid #F0F0F0',
        padding: '20px 32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h1 style={{ 
          margin: 0, 
          fontSize: '1.5rem',
          fontWeight: '700',
          color: '#2C2416'
        }}>
          Admin Dashboard
        </h1>
        
        <button
          onClick={handleLogout}
          style={{
            padding: '10px 20px',
            background: 'transparent',
            border: '2px solid #2C2416',
            borderRadius: '6px',
            color: '#2C2416',
            fontWeight: '600',
            fontSize: '0.9rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#2C2416'
            e.currentTarget.style.color = '#FFFFFF'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = '#2C2416'
          }}
        >
          Logout
        </button>
      </header>

      <main style={{ padding: '40px 32px', maxWidth: '1200px', margin: '0 auto' }}>
        {/* Add Product Button */}
        <div style={{ marginBottom: '32px' }}>
          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              padding: '12px 24px',
              background: '#FF6B6B',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '700',
              fontSize: '1rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#FF5252'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#FF6B6B'}
          >
            + Add Product
          </button>
        </div>

        {/* Product Form */}
        {showForm && (
          <div style={{
            marginBottom: '40px',
            padding: '32px',
            background: '#FAFAFA',
            borderRadius: '8px',
            border: '1px solid #F0F0F0'
          }}>
            <h3 style={{ 
              marginTop: 0,
              marginBottom: '24px',
              fontSize: '1.3rem',
              fontWeight: '700',
              color: '#2C2416'
            }}>
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </h3>
            <ProductForm product={editingProduct} onSuccess={handleSuccess} />
            <button
              onClick={() => {
                setShowForm(false)
                setEditingProduct(null)
              }}
              style={{
                marginTop: '16px',
                padding: '10px 20px',
                background: 'transparent',
                border: '1px solid #E0E0E0',
                borderRadius: '6px',
                color: '#666666',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        )}

        {/* Products List */}
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ 
            fontSize: '1.5rem',
            fontWeight: '700',
            color: '#2C2416',
            marginBottom: '8px'
          }}>
            Products ({products.length})
          </h2>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '24px'
        }}>
          {products.map(p => (
            <div
              key={p.id}
              style={{
                background: '#FAFAFA',
                border: '1px solid #F0F0F0',
                borderRadius: '8px',
                overflow: 'hidden',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.12)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              {p.imageUrl ? (
                <img
                  src={p.imageUrl}
                  alt={p.name}
                  style={{
                    width: '100%',
                    height: '200px',
                    objectFit: 'cover',
                    borderBottom: '1px solid #F0F0F0'
                  }}
                />
              ) : (
                <div style={{
                  width: '100%',
                  height: '200px',
                  background: 'linear-gradient(135deg, #F8F8F8 0%, #E8E8E8 100%)',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  fontSize: '3rem',
                  borderBottom: '1px solid #F0F0F0'
                }}>
                  📦
                </div>
              )}

              <div style={{ padding: '20px' }}>
                <h3 style={{
                  margin: '0 0 8px 0',
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  color: '#2C2416'
                }}>
                  {p.name}
                </h3>
                
                <p style={{
                  margin: '0 0 16px 0',
                  fontSize: '1.3rem',
                  fontWeight: '700',
                  color: '#FF6B6B'
                }}>
                  ${p.price}
                </p>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleEdit(p)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      background: 'transparent',
                      border: '2px solid #2C2416',
                      borderRadius: '6px',
                      color: '#2C2416',
                      fontWeight: '600',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#2C2416'
                      e.currentTarget.style.color = '#FFFFFF'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.color = '#2C2416'
                    }}
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => handleDelete(p.id)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      background: 'transparent',
                      border: '2px solid #EF5350',
                      borderRadius: '6px',
                      color: '#EF5350',
                      fontWeight: '600',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#EF5350'
                      e.currentTarget.style.color = '#FFFFFF'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.color = '#EF5350'
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {products.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: '#666666'
          }}>
            <p style={{ fontSize: '1.1rem' }}>No products yet. Add your first product!</p>
          </div>
        )}
      </main>
    </div>
  )
}