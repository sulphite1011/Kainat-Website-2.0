import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Home } from './pages/Home';
import { Library } from './pages/Library';
import { AdminPortal } from './pages/AdminPortal';
import { AdminLogin } from './pages/AdminLogin';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/ClerkWrapper';
import { CartProvider } from './context/CartContext';
import { SiteSettings, Order } from './types';
import { api } from './services/api';
import { db } from './firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { CheckCircle2, BookOpen, X } from 'lucide-react';
import { AuthenticateWithRedirectCallback } from '@clerk/clerk-react';

const DEFAULT_SETTINGS: SiteSettings = {
  siteName: 'Kainat Notes Hub',
  logoUrl: '',
  easyPaisaNumber: '03415892099',
  easyPaisaTitle: 'Kainat Educational Services',
  whatsAppNumber: '0324 9059918',
  contactEmail: 'support@kainatnoteshub.com',
  footerText: '© 2026 Kainat Notes Hub. All Rights Reserved. Verified Educational Notes.',
  currency: 'PKR',
};

function AppContent() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  // Sync theme attribute to HTML element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Load and listen to settings in real-time across all devices via Firestore
  useEffect(() => {
    api
      .getSettings()
      .then((data) => {
        if (data) setSettings(data);
      })
      .catch((err) => console.error('Failed to load settings:', err));

    // Real-time Cloud Firestore listener for cross-device live synchronization
    let unsubFirestore: (() => void) | null = null;
    try {
      unsubFirestore = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
        if (snap.exists()) {
          const data = snap.data() as SiteSettings;
          setSettings(data);
        }
      }, (err) => {
        console.warn('Settings listener fallback:', err);
      });
    } catch {}

    // Listen to real-time settings changes from SSE if express backend running
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/events');
      eventSource.addEventListener('SETTINGS_UPDATED', (e: any) => {
        try {
          const updated = JSON.parse(e.data);
          setSettings(updated);
        } catch {
          // ignore
        }
      });
    } catch {
      // ignore
    }

    return () => {
      unsubFirestore?.();
      eventSource?.close();
    };
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <div className="app-shell" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar
        settings={settings}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOrderSuccess={(order) => setConfirmedOrder(order)}
      />

      <div className="main-content" style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<Home settings={settings} />} />
          <Route path="/library" element={<Library />} />
          <Route path="/admin" element={<AdminPortal settings={settings} onSettingsUpdated={setSettings} />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/sso-callback" element={<AuthenticateWithRedirectCallback />} />
        </Routes>
      </div>

      <Footer settings={settings} />

      {/* Order Submission Success Dialog */}
      {confirmedOrder && (
        <div className="modal-backdrop" onClick={() => setConfirmedOrder(null)}>
          <div className="modal-content" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent-green)' }}>
                <CheckCircle2 size={20} /> Order Submitted
              </h3>
              <button className="modal-close-btn" onClick={() => setConfirmedOrder(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ textAlign: 'center', padding: '24px 20px' }}>
              <div
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent-green-bg)',
                  color: 'var(--accent-green)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <CheckCircle2 size={32} />
              </div>

              <h4 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 8 }}>
                Thank You for Your Order!
              </h4>

              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  backgroundColor: 'var(--bg-tertiary)',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: 14,
                  display: 'inline-block',
                }}
              >
                Order #{confirmedOrder.id}
              </div>

              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 20 }}>
                Your EasyPaisa payment (Rs. {confirmedOrder.totalAmount}) is under admin review. Once verified,
                your notes will instantly appear in your personal library.
              </p>

              <button
                className="btn btn-primary"
                style={{ width: '100%' }}
                onClick={() => {
                  setConfirmedOrder(null);
                  navigate('/library');
                }}
              >
                <BookOpen size={16} /> Go to My Library
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <CartProvider>
            <BrowserRouter>
              <AppContent />
            </BrowserRouter>
          </CartProvider>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
