import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, User, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const AdminLogin: React.FC = () => {
  const { loginAdmin } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      showToast('Please enter admin username and password', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const success = await loginAdmin(username.trim(), password.trim());
      if (success) {
        showToast('Admin session authenticated', 'success');
        navigate('/admin');
      } else {
        showToast('Invalid admin credentials', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Login failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '75vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 20px',
      }}
    >
      <div
        className="modal-content"
        style={{ maxWidth: 420, margin: '0 auto', boxShadow: 'var(--shadow-lg)' }}
      >
        <div className="modal-header" style={{ justifyContent: 'center', textAlign: 'center', flexDirection: 'column', gap: 8 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
            }}
          >
            <Shield size={28} />
          </div>
          <h2 className="modal-title">Admin Management Portal</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Separate administrative credentials required
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <User size={15} /> Admin Username
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Lock size={15} /> Admin Password
              </label>
              <input
                type="password"
                className="form-input"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
          </div>

          <div className="modal-footer" style={{ justifyContent: 'center' }}>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%' }}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Authenticating...' : (
                <>
                  Enter Admin Console <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
