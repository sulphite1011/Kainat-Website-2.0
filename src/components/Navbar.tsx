import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, BookOpen, Sun, Moon, Shield, Menu, X, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { StudentProfileModal } from './StudentProfileModal';
import { CartModal } from './CartModal';
import { SiteSettings, Order } from '../types';

interface NavbarProps {
  settings: SiteSettings;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onOrderSuccess: (order: Order) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  settings,
  theme,
  onToggleTheme,
  onOrderSuccess,
}) => {
  const { isAuthenticated, studentName, studentAvatar, openGoogleSignIn } = useAuth();
  const { totalItems, isCartOpen, openCart, closeCart } = useCart();
  const location = useLocation();

  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  const initials = studentName
    ? studentName
        .split(' ')
        .map((p) => p[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'ST';

  return (
    <>
      <header className="navbar">
        <div className="container">
          <div className="navbar-inner">
            {/* Brand Logo & Title */}
            <Link to="/" className="brand-link" onClick={() => setIsMobileMenuOpen(false)}>
              {settings.logoUrl ? (
                <img src={settings.logoUrl} alt={settings.siteName} className="brand-logo-img" />
              ) : (
                <div className="brand-logo-placeholder">KN</div>
              )}
              <span className="brand-title">{settings.siteName || 'Kainat Notes Hub'}</span>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="nav-links" style={{ display: 'none', alignItems: 'center' }}>
              <Link
                to="/"
                className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}
              >
                Catalog
              </Link>
              <Link
                to="/library"
                className={`nav-item ${location.pathname === '/library' ? 'active' : ''}`}
              >
                <BookOpen size={16} /> My Library
              </Link>
              <Link
                to="/admin"
                className={`nav-item ${location.pathname.startsWith('/admin') ? 'active' : ''}`}
              >
                <Shield size={16} /> Admin Portal
              </Link>
            </nav>

            {/* Actions: Theme Toggle, Cart, Profile / Login */}
            <div className="nav-actions">
              <button
                type="button"
                className="cart-btn"
                onClick={onToggleTheme}
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                aria-label="Toggle Theme"
              >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              <button
                type="button"
                className="cart-btn"
                onClick={openCart}
                aria-label="Open Cart"
              >
                <ShoppingBag size={19} />
                {totalItems > 0 && <span className="cart-badge">{totalItems}</span>}
              </button>

              {/* Student Auth: Profile Button or Continue with Google */}
              {isAuthenticated ? (
                <button
                  type="button"
                  className="user-profile-btn"
                  onClick={() => setIsProfileOpen(true)}
                  aria-label="Student Profile"
                >
                  {studentAvatar ? (
                    <img src={studentAvatar} alt={studentName} className="user-avatar" />
                  ) : (
                    <div className="user-avatar">{initials}</div>
                  )}
                  <span className="user-name-text">{studentName || 'Student'}</span>
                  <CheckCircle2 size={14} color="var(--accent-green)" />
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary btn-sm nav-login-btn"
                  onClick={() => openGoogleSignIn()}
                  title="Sign in with Google"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                    <path
                      fill="#ffffff"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#ffffff"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#ffffff"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#ffffff"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span className="login-btn-full-text">Continue with Google</span>
                  <span className="login-btn-short-text">Sign In</span>
                </button>
              )}

              {/* Mobile menu hamburger toggle */}
              <button
                type="button"
                className="cart-btn mobile-menu-toggle"
                onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                aria-label="Toggle Mobile Menu"
                style={{ display: 'none' }}
              >
                {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Drawer & Backdrop */}
      {isMobileMenuOpen && (
        <>
          <div
            className="mobile-drawer-backdrop"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="mobile-drawer">
            <Link
              to="/"
              className={`mobile-nav-link ${location.pathname === '/' ? 'active' : ''}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <BookOpen size={18} />
              <span>Catalog & Notes</span>
            </Link>
            <Link
              to="/library"
              className={`mobile-nav-link ${location.pathname === '/library' ? 'active' : ''}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <CheckCircle2 size={18} color="var(--accent-green)" />
              <span>My Verified Library</span>
            </Link>
            <Link
              to="/admin"
              className={`mobile-nav-link ${location.pathname.startsWith('/admin') ? 'active' : ''}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Shield size={18} />
              <span>Admin Management</span>
            </Link>
          </div>
        </>
      )}

      {/* Cart Modal */}
      {isCartOpen && (
        <CartModal
          isOpen={isCartOpen}
          onClose={closeCart}
          settings={settings}
          onOrderSuccess={onOrderSuccess}
        />
      )}

      {/* Student Profile Modal */}
      {isProfileOpen && (
        <StudentProfileModal
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
        />
      )}
    </>
  );
};
