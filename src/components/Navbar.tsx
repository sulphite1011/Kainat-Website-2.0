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
            {/* Brand */}
            <Link to="/" className="brand-link" onClick={() => setIsMobileMenuOpen(false)}>
              {settings.logoUrl ? (
                <img src={settings.logoUrl} alt={settings.siteName} className="brand-logo-img" />
              ) : (
                <div className="brand-logo-placeholder">KN</div>
              )}
              <span>{settings.siteName || 'Kainat Notes Hub'}</span>
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
                  className="btn btn-primary btn-sm"
                  onClick={() => openGoogleSignIn()}
                >
                  Continue with Google
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

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div
          style={{
            position: 'fixed',
            top: 'var(--header-height)',
            left: 0,
            right: 0,
            backgroundColor: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-subtle)',
            padding: '16px 20px',
            zIndex: 49,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <Link
            to="/"
            className="nav-item"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Catalog & Notes
          </Link>
          <Link
            to="/library"
            className="nav-item"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <BookOpen size={16} /> My Library
          </Link>
          <Link
            to="/admin"
            className="nav-item"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <Shield size={16} /> Admin Portal
          </Link>
        </div>
      )}

      {/* Cart Modal */}
      {isCartOpen && (
        <CartModal
          isOpen={isCartOpen}
          onClose={closeCart}
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
