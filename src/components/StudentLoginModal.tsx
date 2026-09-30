import React, { useState } from 'react';
import { X, ShieldCheck, Sparkles, ExternalLink } from 'lucide-react';
import { SignIn, SignUp } from '@clerk/clerk-react';
import { useAuth, isClerkKeyValid } from '../context/AuthContext';

interface StudentLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingCourseTitle?: string;
}

export const StudentLoginModal: React.FC<StudentLoginModalProps> = ({
  isOpen,
  onClose,
  pendingCourseTitle,
}) => {
  const { setDevStudentProfile } = useAuth();
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const isIframe = typeof window !== 'undefined' && window.self !== window.top;

  if (!isOpen) return null;

  const handleOpenStandalone = () => {
    window.open(window.location.href, '_blank');
  };

  const handleQuickDemoLogin = (name: string, email: string) => {
    setDevStudentProfile({
      id: `usr_${email.replace(/[^a-zA-Z0-9]/g, '_')}`,
      name,
      email,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    });
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: 460, margin: '20px auto', overflow: 'visible' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                backgroundColor: 'var(--primary-glow)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShieldCheck size={18} />
            </div>
            <h3 className="modal-title">Student Google Login</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {isIframe && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={handleOpenStandalone}
                title="Open in dedicated tab"
                style={{ padding: '6px', color: 'var(--text-muted)' }}
                aria-label="Open in dedicated tab"
              >
                <ExternalLink size={18} />
              </button>
            )}
            <button className="modal-close-btn" onClick={onClose} aria-label="Close">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="modal-body" style={{ padding: '24px 20px' }}>
          {pendingCourseTitle && (
            <div
              style={{
                backgroundColor: 'rgba(37, 99, 235, 0.08)',
                border: '1px solid rgba(37, 99, 235, 0.25)',
                borderRadius: 'var(--radius-md)',
                padding: '10px 14px',
                fontSize: '0.85rem',
                marginBottom: 18,
                color: 'var(--text-main)',
              }}
            >
              Signing in will automatically add <strong>{pendingCourseTitle}</strong> to your cart.
            </div>
          )}

          {/* Clerk Native Google Auth (Zero iframe accounts.dev errors, Zero email/password confusion) */}
          {isClerkKeyValid ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: '100%', marginBottom: 12 }}>
                {authMode === 'signin' ? (
                  <SignIn
                    routing="hash"
                    signUpUrl="#signup"
                    appearance={{
                      elements: {
                        rootBox: { width: '100%' },
                        card: {
                          backgroundColor: 'transparent',
                          boxShadow: 'none',
                          padding: '0 !important',
                          border: 'none',
                          width: '100%',
                        },
                        header: { display: 'none' },
                        socialButtonsBlockButton: {
                          backgroundColor: '#ffffff',
                          color: '#1f2937',
                          border: '1px solid #d1d5db',
                          fontWeight: 600,
                          fontSize: '0.95rem',
                          padding: '12px 16px',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '10px',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
                          cursor: 'pointer',
                          width: '100%',
                        },
                        socialButtonsBlockButtonText: {
                          color: '#1f2937',
                          fontWeight: 600,
                        },
                        dividerRow: { display: 'none' }, // HIDE EMAIL INPUT SO USER ONLY CLICKS GOOGLE
                        form: { display: 'none' },       // HIDE EMAIL & PASSWORD
                        footer: { display: 'none' },
                      },
                    }}
                  />
                ) : (
                  <SignUp
                    routing="hash"
                    signInUrl="#signin"
                    appearance={{
                      elements: {
                        rootBox: { width: '100%' },
                        card: {
                          backgroundColor: 'transparent',
                          boxShadow: 'none',
                          padding: '0 !important',
                          border: 'none',
                          width: '100%',
                        },
                        header: { display: 'none' },
                        socialButtonsBlockButton: {
                          backgroundColor: '#ffffff',
                          color: '#1f2937',
                          border: '1px solid #d1d5db',
                          fontWeight: 600,
                          fontSize: '0.95rem',
                          padding: '12px 16px',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '10px',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
                          cursor: 'pointer',
                          width: '100%',
                        },
                        socialButtonsBlockButtonText: {
                          color: '#1f2937',
                          fontWeight: 600,
                        },
                        dividerRow: { display: 'none' },
                        form: { display: 'none' },
                        footer: { display: 'none' },
                      },
                    }}
                  />
                )}
              </div>

              <div style={{ display: 'flex', gap: 6, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {authMode === 'signin' ? (
                  <>
                    <span>New student?</span>
                    <button
                      type="button"
                      style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'underline' }}
                      onClick={() => setAuthMode('signup')}
                    >
                      Sign Up with Google
                    </button>
                  </>
                ) : (
                  <>
                    <span>Already enrolled?</span>
                    <button
                      type="button"
                      style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'underline' }}
                      onClick={() => setAuthMode('signin')}
                    >
                      Sign In with Google
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : null}

          {/* Quick Verified Testing / Iframe Fallback Account */}
          <div
            style={{
              marginTop: 20,
              paddingTop: 16,
              borderTop: '1px dashed var(--border-subtle)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: 8 }}>
              OR TEST INSTANTLY AS VERIFIED STUDENT
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => handleQuickDemoLogin('Hamad Khan', 'hamadkhan11h22@gmail.com')}
            >
              <Sparkles size={14} color="var(--accent-gold)" /> Instant Student Access (Hamad Khan)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
