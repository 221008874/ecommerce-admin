// src/components/ProductForm.jsx
import { useState } from 'react'
import { uploadImage } from '../services/cloudinary'
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore'
import { db } from "../services/firebase"

export default function ProductForm({ product = null, onSuccess }) {
  const [name, setName] = useState(product?.name || '')
  const [price, setPrice] = useState(product?.price || '')
  const [piecesPerBox, setPiecesPerBox] = useState(product?.piecesPerBox || '')
  const [flavors, setFlavors] = useState(product?.flavors?.join(', ') || '')
  const [description, setDescription] = useState(product?.description || '')
  const [imageUrl, setImageUrl] = useState(product?.imageUrl || '')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadImage(file)
      setImageUrl(url)
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const data = {
      name,
      price: parseFloat(price),
      piecesPerBox: parseInt(piecesPerBox),
      flavors: flavors.split(',').map(f => f.trim()).filter(Boolean),
      description,
      imageUrl,
      createdAt: product ? product.createdAt : new Date().toISOString()
    }

    try {
      if (product) {
        await updateDoc(doc(db, 'products', product.id), data)
      } else {
        await addDoc(collection(db, 'products'), data)
      }
      onSuccess()
    } catch (err) {
      setError('Failed to save product')
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {error && (
        <div style={{
          padding: '12px 16px',
          background: '#FFEBEE',
          border: '1px solid #EF5350',
          borderRadius: '6px',
          color: '#C62828',
          fontSize: '0.9rem'
        }}>
          {error}
        </div>
      )}
      
      {/* Image Upload Section */}
      <div>
        <label style={{
          display: 'block',
          marginBottom: '8px',
          fontWeight: '600',
          fontSize: '0.95rem',
          color: '#2C2416'
        }}>
          Product Image
        </label>
        
        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
          {/* Image Preview */}
          {imageUrl ? (
            <div style={{
              width: '120px',
              height: '120px',
              borderRadius: '8px',
              overflow: 'hidden',
              border: '1px solid #F0F0F0'
            }}>
              <img 
                src={imageUrl} 
                alt="Preview" 
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'cover' 
                }} 
              />
            </div>
          ) : (
            <div style={{
              width: '120px',
              height: '120px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #F8F8F8 0%, #E8E8E8 100%)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              border: '1px dashed #E0E0E0',
              fontSize: '2.5rem',
              color: '#BDBDBD'
            }}>
              📷
            </div>
          )}
          
          {/* Upload Controls */}
          <div style={{ flex: 1 }}>
            <div style={{
              position: 'relative',
              marginBottom: '8px'
            }}>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                id="image-upload"
                style={{
                  position: 'absolute',
                  width: '1px',
                  height: '1px',
                  padding: 0,
                  margin: -1,
                  overflow: 'hidden',
                  clip: 'rect(0, 0, 0, 0)',
                  whiteSpace: 'nowrap',
                  border: 0
                }}
              />
              <label
                htmlFor="image-upload"
                style={{
                  display: 'inline-block',
                  padding: '12px 24px',
                  background: '#2C2416',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: '600',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#1A1309'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#2C2416'}
              >
                Choose Image
              </label>
            </div>
            
            {uploading && (
              <div style={{
                padding: '8px 12px',
                background: '#E3F2FD',
                borderRadius: '4px',
                color: '#1565C0',
                fontSize: '0.85rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  border: '2px solid #1565C0',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                Uploading...
              </div>
            )}
            
            <p style={{
              marginTop: '8px',
              fontSize: '0.85rem',
              color: '#666666'
            }}>
              Recommended: 1:1 ratio, at least 400×400px
            </p>
          </div>
        </div>
      </div>

      {/* Form Fields Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px'
      }}>
        {/* Product Name */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: '600',
            fontSize: '0.95rem',
            color: '#2C2416'
          }}>
            Product Name *
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Dark Chocolate Truffles"
            required
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '1px solid #E0E0E0',
              borderRadius: '6px',
              fontSize: '1rem',
              color: '#2C2416',
              background: '#FFFFFF',
              transition: 'all 0.2s ease'
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = '#FF6B6B'}
            onBlur={(e) => e.currentTarget.style.borderColor = '#E0E0E0'}
          />
        </div>

        {/* Price */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: '600',
            fontSize: '0.95rem',
            color: '#2C2416'
          }}>
            Price ($) *
          </label>
          <div style={{ position: 'relative' }}>
            <span style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#666666',
              fontWeight: '500'
            }}>
              $
            </span>
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              type="number"
              step="0.01"
              min="0"
              required
              style={{
                width: '100%',
                padding: '12px 16px 12px 36px',
                border: '1px solid #E0E0E0',
                borderRadius: '6px',
                fontSize: '1rem',
                color: '#2C2416',
                background: '#FFFFFF',
                transition: 'all 0.2s ease'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#FF6B6B'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#E0E0E0'}
            />
          </div>
        </div>

        {/* Pieces per Box */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: '600',
            fontSize: '0.95rem',
            color: '#2C2416'
          }}>
            Pieces per Box *
          </label>
          <input
            value={piecesPerBox}
            onChange={(e) => setPiecesPerBox(e.target.value)}
            placeholder="e.g., 12"
            type="number"
            min="1"
            required
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '1px solid #E0E0E0',
              borderRadius: '6px',
              fontSize: '1rem',
              color: '#2C2416',
              background: '#FFFFFF',
              transition: 'all 0.2s ease'
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = '#FF6B6B'}
            onBlur={(e) => e.currentTarget.style.borderColor = '#E0E0E0'}
          />
        </div>

        {/* Flavors */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: '600',
            fontSize: '0.95rem',
            color: '#2C2416'
          }}>
            Flavors *
          </label>
          <input
            value={flavors}
            onChange={(e) => setFlavors(e.target.value)}
            placeholder="e.g., Dark Chocolate, Mint, Raspberry"
            required
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '1px solid #E0E0E0',
              borderRadius: '6px',
              fontSize: '1rem',
              color: '#2C2416',
              background: '#FFFFFF',
              transition: 'all 0.2s ease'
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = '#FF6B6B'}
            onBlur={(e) => e.currentTarget.style.borderColor = '#E0E0E0'}
          />
          <p style={{
            marginTop: '6px',
            fontSize: '0.85rem',
            color: '#666666'
          }}>
            Separate flavors with commas
          </p>
        </div>
      </div>

      {/* Description */}
      <div>
        <label style={{
          display: 'block',
          marginBottom: '8px',
          fontWeight: '600',
          fontSize: '0.95rem',
          color: '#2C2416'
        }}>
          Description *
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the product in detail..."
          required
          rows="4"
          style={{
            width: '100%',
            padding: '12px 16px',
            border: '1px solid #E0E0E0',
            borderRadius: '6px',
            fontSize: '1rem',
            color: '#2C2416',
            background: '#FFFFFF',
            resize: 'vertical',
            minHeight: '100px',
            transition: 'all 0.2s ease',
            fontFamily: 'inherit'
          }}
          onFocus={(e) => e.currentTarget.style.borderColor = '#FF6B6B'}
          onBlur={(e) => e.currentTarget.style.borderColor = '#E0E0E0'}
        />
      </div>

      {/* Submit Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
        <button
          type="submit"
          disabled={uploading}
          style={{
            padding: '14px 32px',
            background: '#FF6B6B',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '6px',
            fontWeight: '700',
            fontSize: '1rem',
            cursor: uploading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            opacity: uploading ? 0.7 : 1
          }}
          onMouseEnter={(e) => !uploading && (e.currentTarget.style.background = '#FF5252')}
          onMouseLeave={(e) => !uploading && (e.currentTarget.style.background = '#FF6B6B')}
        >
          {uploading ? 'Uploading...' : (product ? 'Update Product' : 'Add Product')}
        </button>
      </div>

      <style jsx="true">{`
        @keyframes spin {
          0% { transform: translateY(-50%) rotate(0deg); }
          100% { transform: translateY(-50%) rotate(360deg); }
        }
        
        input:focus, textarea:focus {
          outline: none;
        }
        
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        
        input[type="number"] {
          -moz-appearance: textfield;
        }
      `}</style>
    </form>
  )
}