import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, ShoppingBag, Lock, BookOpen } from 'lucide-react';
import { api } from '../services/api';
import { DocumentResponse } from '../types';
import { useCart } from '../context/CartContext';

interface PdfViewerModalProps {
  courseId: string;
  courseTitle: string;
  isPaidMode: boolean; // true = load protected paid document; false = sample preview
  samplePdfUrl?: string;
  onClose: () => void;
  onOpenCheckout?: () => void;
}

export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({
  courseId,
  courseTitle,
  isPaidMode,
  samplePdfUrl,
  onClose,
}) => {
  const { addToCart } = useCart();
  const [docData, setDocData] = useState<DocumentResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(isPaidMode);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isTabBlurred, setIsTabBlurred] = useState<boolean>(false);

  // Best effort security deterrent: blur viewer on tab switch or visibility hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsTabBlurred(true);
      } else {
        setIsTabBlurred(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Deter Ctrl+P (Print) and Ctrl+S (Save) shortcuts
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 's')) {
        e.preventDefault();
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // If paid mode, load from protected backend endpoint
  useEffect(() => {
    if (isPaidMode) {
      setIsLoading(true);
      api
        .getCourseDocument(courseId)
        .then((res) => {
          setDocData(res);
          setIsLoading(false);
        })
        .catch((err) => {
          setErrorMessage(err.message || 'Access Denied. You have not purchased this course yet.');
          setIsLoading(false);
        });
    }
  }, [courseId, isPaidMode]);

  // Determine which PDF URL to display
  let pdfUrlToDisplay = '';
  if (isPaidMode) {
    pdfUrlToDisplay = docData?.fullPdfUrl || '';
  } else {
    pdfUrlToDisplay = samplePdfUrl || '';
  }

  // Helper to construct embed-friendly URL (handling Google Drive preview links if provided)
  const getEmbeddablePdfUrl = (rawUrl: string) => {
    if (!rawUrl) return '';
    // If it's a Google Drive link, convert to preview embed URL
    if (rawUrl.includes('drive.google.com') && rawUrl.includes('/view')) {
      return rawUrl.replace('/view', '/preview');
    }
    return rawUrl;
  };

  const finalSrc = getEmbeddablePdfUrl(pdfUrlToDisplay);

  return (
    <div
      className="pdf-viewer-overlay"
      onContextMenu={(e) => e.preventDefault()} // Disable right-click context menu
    >
      {/* Header */}
      <div className="pdf-viewer-header">
        <div className="pdf-viewer-title">
          {isPaidMode ? (
            <span style={{ color: 'var(--accent-green)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <BookOpen size={20} /> Verified Notes Reader
            </span>
          ) : (
            <span style={{ color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Lock size={18} /> Sample Demo Preview
            </span>
          )}
          <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 500 }}>
            | {courseTitle}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {!isPaidMode && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                addToCart(courseId);
                onClose();
              }}
            >
              <ShoppingBag size={14} /> Buy Full Notes
            </button>
          )}

          <button className="modal-close-btn" onClick={onClose} aria-label="Close Reader">
            <X size={22} />
          </button>
        </div>
      </div>

      {/* Main Reader Canvas Frame */}
      <div className="pdf-viewer-frame-container" style={{ filter: isTabBlurred ? 'blur(16px)' : 'none' }}>
        {isLoading && (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 8 }}>
              Verifying purchase authorization...
            </div>
            <div style={{ fontSize: '0.85rem' }}>Loading protected document from secure server</div>
          </div>
        )}

        {errorMessage && (
          <div className="empty-state" style={{ maxWidth: 480, margin: '40px auto' }}>
            <div className="empty-state-icon" style={{ color: 'var(--accent-red)' }}>
              <ShieldAlert size={32} />
            </div>
            <div className="empty-state-title">Access Restricted</div>
            <div className="empty-state-desc">{errorMessage}</div>
            <button
              className="btn btn-primary"
              onClick={() => {
                addToCart(courseId);
                onClose();
              }}
            >
              <ShoppingBag size={16} /> Purchase Course Access
            </button>
          </div>
        )}

        {!isLoading && !errorMessage && finalSrc && (
          <>
            <iframe
              src={finalSrc}
              title={courseTitle}
              className="pdf-iframe"
              allow="autoplay"
              sandbox="allow-scripts allow-same-origin"
            />

            {/* Subtle Diagonal Watermark Layer for Verified Student */}
            {isPaidMode && docData?.watermark && (
              <div className="watermark-layer" aria-hidden="true">
                {[...Array(12)].map((_, idx) => (
                  <div key={idx} className="watermark-item">
                    <div className="watermark-brand">KAINAT NOTES HUB</div>
                    <div>Licensed to: {docData.watermark.studentName}</div>
                    <div style={{ fontSize: '0.75rem' }}>{docData.watermark.studentEmail}</div>
                    <div style={{ fontSize: '0.72rem', letterSpacing: '0.04em' }}>
                      Order: {docData.watermark.orderId}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
