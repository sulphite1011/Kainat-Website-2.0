import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, ShoppingBag, Lock, BookOpen, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { DocumentResponse } from '../types';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

interface PdfViewerModalProps {
  courseId: string;
  courseTitle: string;
  isPaidMode: boolean; // default mode to open
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
  const { studentProfile, studentName, studentEmail, clerkUserId } = useAuth();

  const isPurchased = Boolean(studentProfile?.purchasedCourseIds?.includes(courseId));
  const [currentMode, setCurrentMode] = useState<'sample' | 'paid'>(
    isPaidMode || isPurchased ? (isPaidMode ? 'paid' : 'sample') : 'sample'
  );

  const [docData, setDocData] = useState<DocumentResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(currentMode === 'paid');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isTabBlurred, setIsTabBlurred] = useState<boolean>(false);

  // Sync mode when prop changes
  useEffect(() => {
    if (isPaidMode) {
      setCurrentMode('paid');
    }
  }, [isPaidMode]);

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

  // If paid mode, load from protected backend endpoint with real student details
  useEffect(() => {
    if (currentMode === 'paid') {
      setIsLoading(true);
      setErrorMessage(null);
      api
        .getCourseDocument(courseId, {
          clerkUserId,
          studentName: studentName || studentProfile?.name,
          studentEmail: studentEmail || studentProfile?.email,
        })
        .then((res) => {
          setDocData(res);
          setIsLoading(false);
        })
        .catch((err) => {
          setErrorMessage(err.message || 'Access Denied. You have not purchased this course yet.');
          setIsLoading(false);
        });
    }
  }, [courseId, currentMode, clerkUserId, studentName, studentEmail, studentProfile]);

  // Determine which PDF URL to display
  let pdfUrlToDisplay = '';
  if (currentMode === 'paid') {
    pdfUrlToDisplay = docData?.fullPdfUrl || '';
  } else {
    pdfUrlToDisplay = samplePdfUrl || '';
  }

  // Helper to construct embed-friendly URL (handling Google Drive preview links if provided)
  const getEmbeddablePdfUrl = (rawUrl: string) => {
    if (!rawUrl) return '';
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
          {currentMode === 'paid' ? (
            <span style={{ color: 'var(--accent-green)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <BookOpen size={20} /> Verified Full Notes Reader
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
          {currentMode === 'sample' ? (
            isPurchased ? (
              <button
                type="button"
                className="btn btn-sm"
                style={{
                  backgroundColor: 'var(--accent-green)',
                  borderColor: 'var(--accent-green)',
                  color: '#ffffff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontWeight: 600,
                  padding: '6px 14px',
                }}
                onClick={() => setCurrentMode('paid')}
                title="Switch to complete verified notes"
              >
                <BookOpen size={14} /> Read Full Notes (Unlocked)
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  addToCart(courseId);
                  onClose();
                }}
              >
                <ShoppingBag size={14} /> Buy Full Notes
              </button>
            )
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', textAlign: 'right' }}>
              <span
                className="badge badge-verified"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '5px 10px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                }}
              >
                <CheckCircle2 size={14} /> Verified License Active
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                {docData?.watermark?.orderId && docData.watermark.orderId !== 'ORD-CLOUD' ? docData.watermark.orderId : 'ORD-VERIFIED'} • {docData?.watermark?.studentName && docData.watermark.studentName !== 'Verified Student' ? docData.watermark.studentName : (studentName || 'Student')}
              </span>
            </div>
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
            {isPurchased ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setIsLoading(true);
                  setErrorMessage(null);
                  api.getCourseDocument(courseId, {
                    clerkUserId,
                    studentName: studentName || studentProfile?.name,
                    studentEmail: studentEmail || studentProfile?.email,
                  })
                    .then((res) => {
                      setDocData(res);
                      setIsLoading(false);
                    })
                    .catch((err) => {
                      setErrorMessage(err.message || 'Authorization failed');
                      setIsLoading(false);
                    });
                }}
              >
                Retry Loading Document
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  addToCart(courseId);
                  onClose();
                }}
              >
                <ShoppingBag size={16} /> Purchase Course Access
              </button>
            )}
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

            {/* Subtle Diagonal Watermark Layer with Real Student & Order Data */}
            {currentMode === 'paid' && (
              <div className="watermark-layer" aria-hidden="true">
                {(() => {
                  const resolvedName =
                    docData?.watermark?.studentName && docData.watermark.studentName !== 'Verified Student'
                      ? docData.watermark.studentName
                      : (studentName || studentProfile?.name || 'Verified Student');
                  const resolvedEmail =
                    docData?.watermark?.studentEmail && docData.watermark.studentEmail !== 'student@example.com'
                      ? docData.watermark.studentEmail
                      : (studentEmail || studentProfile?.email || 'student@kainatnoteshub.com');
                  const resolvedOrder =
                    docData?.watermark?.orderId && docData.watermark.orderId !== 'ORD-CLOUD'
                      ? docData.watermark.orderId
                      : 'ORD-VERIFIED';

                  return [...Array(12)].map((_, idx) => (
                    <div key={idx} className="watermark-item">
                      <div className="watermark-brand">KAINAT NOTES HUB</div>
                      <div>Licensed to: {resolvedName}</div>
                      <div style={{ fontSize: '0.75rem' }}>{resolvedEmail}</div>
                      <div style={{ fontSize: '0.72rem', letterSpacing: '0.04em' }}>
                        Order: {resolvedOrder}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
