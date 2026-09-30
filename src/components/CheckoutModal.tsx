import React, { useState, useRef } from 'react';
import { X, Upload, CheckCircle2, Copy, AlertCircle, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import { Order, SiteSettings } from '../types';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderSuccess: (order: Order) => void;
  settings?: SiteSettings;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  onOrderSuccess,
  settings,
}) => {
  const { items, totalAmount, clearCart } = useCart();
  const { studentName, studentEmail } = useAuth();
  const { showToast } = useToast();

  const easyPaisaNum = settings?.easyPaisaNumber || '03415892099';
  const easyPaisaName = settings?.easyPaisaTitle || 'Kainat Educational Services';

  const [transactionId, setTransactionId] = useState<string>('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [copiedNumber, setCopiedNumber] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleCopyEasyPaisa = () => {
    navigator.clipboard.writeText(easyPaisaNum);
    setCopiedNumber(true);
    showToast('EasyPaisa number copied to clipboard', 'info');
    setTimeout(() => setCopiedNumber(false), 2500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please upload an image file (PNG, JPG, WEBP)', 'error');
      return;
    }

    setProofFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setProofPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!transactionId.trim()) {
      showToast('Please enter your EasyPaisa Transaction / Reference ID', 'error');
      return;
    }

    if (items.length === 0) {
      showToast('Your cart is empty', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      let paymentProofUrl = '';

      // Upload proof screenshot if provided
      if (proofFile) {
        const formData = new FormData();
        formData.append('proof', proofFile);
        const uploadRes = await api.uploadPaymentProof(formData);
        if (uploadRes.success) {
          paymentProofUrl = uploadRes.proofUrl;
        }
      }

      // Submit Order to backend
      const courseIds = items.map((i) => i.courseId);
      const res = await api.createOrder({
        courseIds,
        transactionId: transactionId.trim(),
        paymentProofUrl,
      });

      if (res.success && res.order) {
        await clearCart();
        showToast(`Order ${res.order.id} submitted for verification!`, 'success');
        onOrderSuccess(res.order);
      } else {
        showToast('Failed to submit order', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to submit order', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">EasyPaisa Manual Payment</h3>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmitOrder}>
          <div className="modal-body">
            {/* Account Info Card */}
            <div
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                marginBottom: '20px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>EasyPaisa Account:</span>
                <span style={{ fontWeight: 700, color: 'var(--accent-green)' }}>{easyPaisaName}</span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: 'var(--bg-primary)',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.25rem', fontWeight: 700, letterSpacing: '0.05em' }}>
                  {easyPaisaNum}
                </span>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleCopyEasyPaisa}
                >
                  {copiedNumber ? <CheckCircle2 size={14} color="var(--accent-green)" /> : <Copy size={14} />}
                  {copiedNumber ? 'Copied' : 'Copy'}
                </button>
              </div>

              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 10 }}>
                WhatsApp Verification Support:{' '}
                <a
                  href="https://wa.me/923249059918"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: 'var(--primary)', fontWeight: 600 }}
                >
                  0324 9059918
                </a>
              </div>
            </div>

            {/* Order Summary */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
                ORDER ITEMS ({items.length})
              </div>
              <div
                style={{
                  maxHeight: '130px',
                  overflowY: 'auto',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '8px 12px',
                  backgroundColor: 'var(--bg-tertiary)',
                }}
              >
                {items.map((item) => (
                  <div
                    key={item.courseId}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.88rem',
                      padding: '6px 0',
                      borderBottom: '1px solid var(--border-subtle)',
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>
                      {item.title}
                    </span>
                    <span style={{ fontWeight: 700 }}>Rs. {item.price}</span>
                  </div>
                ))}
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 4px 4px',
                  fontWeight: 700,
                  fontSize: '1.1rem',
                }}
              >
                <span>Total Amount Due:</span>
                <span style={{ color: 'var(--primary)', fontSize: '1.3rem' }}>Rs. {totalAmount}</span>
              </div>
            </div>

            {/* Verification Inputs */}
            <div className="form-group">
              <label className="form-label">
                EasyPaisa Transaction ID / Reference ID <span className="req">*</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 2938472918"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                required
              />
              <div className="form-help">
                Found in your EasyPaisa confirmation SMS or app transaction receipt.
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Payment Screenshot / Receipt (Recommended)</label>
              <div
                style={{
                  border: '2px dashed var(--border-strong)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: 'var(--bg-tertiary)',
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                {proofPreview ? (
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <img
                      src={proofPreview}
                      alt="Proof Preview"
                      style={{ maxHeight: 110, borderRadius: 'var(--radius-sm)', objectFit: 'contain' }}
                    />
                    <div style={{ fontSize: '0.75rem', color: 'var(--accent-green)', marginTop: 4 }}>
                      Receipt attached. Click to change.
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload size={24} color="var(--primary)" style={{ margin: '0 auto 6px' }} />
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Upload Payment Screenshot</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      PNG, JPG, or WEBP up to 10MB
                    </div>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </div>

            {/* Identity Info Note */}
            <div
              style={{
                display: 'flex',
                gap: 8,
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(37, 99, 235, 0.08)',
                border: '1px solid rgba(37, 99, 235, 0.2)',
                fontSize: '0.82rem',
                color: 'var(--text-muted)',
              }}
            >
              <AlertCircle size={16} color="var(--primary)" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                Order will be registered to your verified Google account: <strong>{studentName}</strong> ({studentEmail}).
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting Order...' : (
                <>
                  Confirm & Submit Payment <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
