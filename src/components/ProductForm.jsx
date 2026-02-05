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
  const [success, setSuccess] = useState('')

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB')
      return
    }

    setError('')
    setUploading(true)
    try {
      const url = await uploadImage(file)
      setImageUrl(url)
      setSuccess('Image uploaded successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('Failed to upload image: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    if (!name.trim() || !description.trim()) {
      setError('Please fill in all required fields')
      return
    }

    const data = {
      name: name.trim(),
      price: parseFloat(price),
      piecesPerBox: parseInt(piecesPerBox),
      flavors: flavors.split(',').map(f => f.trim()).filter(Boolean),
      description: description.trim(),
      imageUrl,
      createdAt: product ? product.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    try {
      if (product) {
        await updateDoc(doc(db, 'products', product.id), data)
      } else {
        await addDoc(collection(db, 'products'), data)
      }
      setSuccess(product ? 'Product updated successfully!' : 'Product added successfully!')
      setTimeout(() => onSuccess(), 500)
    } catch (err) {
      setError(err.message || 'Failed to save product')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="product-form">
      <style jsx>{`
        .product-form {
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        .alert {
          padding: 16px;
          border-radius: 12px;
          font-size: 0.95rem;
          animation: slideDown 0.3s ease-out;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .alert-error {
          background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
          border: 1px solid #fca5a5;
          color: #991b1b;
        }

        .alert-success {
          background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
          border: 1px solid #86efac;
          color: #166534;
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

        /* Image Upload Section */
        .image-section {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .image-label {
          display: block;
          font-size: 1.05rem;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 4px;
        }

        .image-container {
          display: flex;
          gap: 28px;
          align-items: flex-start;
        }

        .image-preview {
          flex-shrink: 0;
        }

        .image-preview-box {
          width: 140px;
          height: 140px;
          border-radius: 12px;
          overflow: hidden;
          border: 2px solid #e2e8f0;
          background: #f8fafc;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        }

        .image-preview-box:hover {
          border-color: #cbd5e1;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
        }

        .image-preview-box img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .image-preview-placeholder {
          font-size: 3.5rem;
          animation: float 3s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }

        .image-controls {
          flex: 1;
        }

        .file-input-wrapper {
          position: relative;
          margin-bottom: 16px;
        }

        .file-input {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }

        .file-label {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          color: #ffffff;
          border: none;
          border-radius: 8px;
          font-weight: 700;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.2);
        }

        .file-label:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.3);
        }

        .file-label:active {
          transform: translateY(0);
        }

        .upload-status {
          padding: 12px 16px;
          background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
          border: 1px solid #93c5fd;
          border-radius: 8px;
          color: #1e40af;
          font-size: 0.9rem;
          display: inline-flex;
          align-items: center;
          gap: 12px;
          animation: slideDown 0.3s ease-out;
        }

        .spinner {
          width: 14px;
          height: 14px;
          border: 2px solid #1e40af;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .image-hint {
          font-size: 0.85rem;
          color: #64748b;
          margin-top: 12px;
          line-height: 1.4;
        }

        /* Form Fields */
        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 24px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-label {
          font-size: 0.95rem;
          font-weight: 700;
          color: #0f172a;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .required {
          color: #e11d48;
        }

        .form-input,
        .form-textarea {
          padding: 12px 14px;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          font-size: 1rem;
          color: #0f172a;
          background: #ffffff;
          font-family: inherit;
          transition: all 0.3s ease;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .form-input:focus,
        .form-textarea:focus {
          outline: none;
          border-color: #0f172a;
          box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.1);
          transform: translateY(-1px);
        }

        .form-input::placeholder,
        .form-textarea::placeholder {
          color: #94a3b8;
        }

        .form-hint {
          font-size: 0.85rem;
          color: #64748b;
          margin-top: 4px;
          line-height: 1.4;
        }

        .currency-wrapper {
          position: relative;
        }

        .currency-symbol {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #64748b;
          font-weight: 600;
          font-size: 1rem;
          pointer-events: none;
        }

        .currency-wrapper .form-input {
          padding-left: 30px;
        }

        .form-textarea {
          resize: vertical;
          min-height: 120px;
        }

        /* Full Width Description */
        .description-section {
          grid-column: 1 / -1;
        }

        /* Form Actions */
        .form-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 16px;
        }

        .btn {
          padding: 12px 28px;
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

        .btn-primary {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          color: #ffffff;
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.2);
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.3);
        }

        .btn-primary:active:not(:disabled) {
          transform: translateY(0);
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Number Input Styling */
        input[type="number"]::-webkit-outer-spin-button,
        input[type="number"]::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        input[type="number"] {
          -moz-appearance: textfield;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .product-form {
            gap: 24px;
          }

          .image-container {
            flex-direction: column;
            gap: 20px;
          }

          .image-preview-box {
            width: 100%;
            max-width: 140px;
          }

          .form-grid {
            grid-template-columns: 1fr;
            gap: 20px;
          }

          .form-actions {
            flex-direction: column-reverse;
          }

          .btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>

      {error && (
        <div className="alert alert-error">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <span>✓</span>
          <span>{success}</span>
        </div>
      )}

      {/* Image Upload Section */}
      <div className="image-section">
        <label className="image-label">Product Image</label>

        <div className="image-container">
          {/* Image Preview */}
          <div className="image-preview">
            <div className="image-preview-box">
              {imageUrl ? (
                <img src={imageUrl} alt="Product preview" />
              ) : (
                <div className="image-preview-placeholder">📸</div>
              )}
            </div>
          </div>

          {/* Upload Controls */}
          <div className="image-controls">
            <div className="file-input-wrapper">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                id="image-upload"
                className="file-input"
                disabled={uploading}
              />
              <label htmlFor="image-upload" className="file-label">
                <span>📁</span>
                {uploading ? 'Uploading...' : 'Choose Image'}
              </label>
            </div>

            {uploading && <div className="upload-status">
              <div className="spinner"></div>
              Uploading image...
            </div>}

            <p className="image-hint">
              <strong>Recommended:</strong> Square format (1:1), at least 600×600px, under 5MB
            </p>
          </div>
        </div>
      </div>

      {/* Form Fields */}
      <div className="form-grid">
        {/* Product Name */}
        <div className="form-group">
          <label className="form-label">
            Product Name <span className="required">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Dark Chocolate Truffles"
            className="form-input"
            required
          />
        </div>

        {/* Price */}
        <div className="form-group">
          <label className="form-label">
            Price <span className="required">*</span>
          </label>
          <div className="currency-wrapper">
            <span className="currency-symbol">π </span>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0"
              className="form-input"
              required
            />
          </div>
        </div>

        {/* Pieces per Box */}
        <div className="form-group">
          <label className="form-label">
            Pieces per Box <span className="required">*</span>
          </label>
          <input
            type="number"
            value={piecesPerBox}
            onChange={(e) => setPiecesPerBox(e.target.value)}
            placeholder="e.g., 12"
            min="1"
            className="form-input"
            required
          />
        </div>

        {/* Flavors */}
        <div className="form-group">
          <label className="form-label">
            Flavors <span className="required">*</span>
          </label>
          <input
            type="text"
            value={flavors}
            onChange={(e) => setFlavors(e.target.value)}
            placeholder="e.g., Dark Chocolate, Mint, Raspberry"
            className="form-input"
            required
          />
          <p className="form-hint">Separate flavors with commas</p>
        </div>

        {/* Description - Full Width */}
        <div className="form-group description-section">
          <label className="form-label">
            Description <span className="required">*</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the product in detail..."
            className="form-textarea"
            required
          />
        </div>
      </div>

      {/* Submit Button */}
      <div className="form-actions">
        <button type="submit" disabled={uploading} className="btn btn-primary">
          <span>{uploading ? '⏳' : '💾'}</span>
          {uploading ? 'Uploading...' : product ? 'Update Product' : 'Add Product'}
        </button>
      </div>
    </form>
  )
}