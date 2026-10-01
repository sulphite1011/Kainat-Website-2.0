import React from 'react';
import { X, LogOut, BookOpen, User, Mail, ShieldCheck, Bell, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface StudentProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StudentProfileModal: React.FC<StudentProfileModalProps> = ({ isOpen, onClose }) => {
  const { studentName, studentEmail, studentAvatar, clerkUserId, signOutStudent, notifications } = useAuth();
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleGoToLibrary = () => {
    onClose();
    navigate('/library');
  };

  const handleSignOut = async () => {
    onClose();
    await signOutStudent();
  };

  const initials = studentName
    ? studentName
        .split(' ')
        .map((p) => p[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'ST';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Student Profile</h3>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close Profile">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              {studentAvatar ? (
                <img
                  src={studentAvatar}
                  alt={studentName}
                  className="user-avatar"
                  style={{ width: 80, height: 80, fontSize: '1.5rem', margin: '0 auto 12px' }}
                />
              ) : (
                <div
                  className="user-avatar"
                  style={{ width: 80, height: 80, fontSize: '1.5rem', margin: '0 auto 12px' }}
                >
                  {initials}
                </div>
              )}
              <span
                style={{
                  position: 'absolute',
                  bottom: 12,
                  right: 0,
                  backgroundColor: 'var(--accent-green)',
                  color: 'white',
                  borderRadius: '50%',
                  padding: 4,
                  display: 'flex',
                  border: '2px solid var(--bg-modal)',
                }}
                title="Google Authenticated via Clerk"
              >
                <ShieldCheck size={14} />
              </span>
            </div>

            <h4 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 4 }}>{studentName}</h4>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Mail size={14} /> {studentEmail}
            </div>
            {clerkUserId && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                ID: {clerkUserId}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            <button
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'flex-start', padding: '12px 16px' }}
              onClick={handleGoToLibrary}
            >
              <BookOpen size={18} /> My Library (Purchased Notes)
            </button>
            <a
              href={`https://wa.me/923249059918?text=${encodeURIComponent(
                `Assalam-o-Alaikum, I am student ${studentName || ''} (${studentEmail || ''}) on Kainat Notes Hub and need assistance with my order verification.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{ width: '100%', justifyContent: 'flex-start', padding: '10px 16px', color: 'var(--text-main)', textDecoration: 'none' }}
            >
              <MessageCircle size={18} color="#25D366" /> WhatsApp Support & Fast Verification
            </a>
          </div>

          {/* Recent In-App Notifications */}
          {notifications.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  marginBottom: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Bell size={14} /> RECENT NOTIFICATIONS
              </div>
              <div
                style={{
                  maxHeight: 140,
                  overflowY: 'auto',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-tertiary)',
                  padding: 8,
                }}
              >
                {notifications.slice(0, 4).map((n) => (
                  <div
                    key={n.id}
                    style={{
                      padding: '8px',
                      borderBottom: '1px solid var(--border-subtle)',
                      fontSize: '0.82rem',
                    }}
                  >
                    <div style={{ fontWeight: 600, color: n.type === 'order_verified' ? 'var(--accent-green)' : 'var(--text-main)' }}>
                      {n.title}
                    </div>
                    <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>{n.message}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <button className="btn btn-danger btn-sm" onClick={handleSignOut}>
            <LogOut size={16} /> Sign Out
          </button>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
