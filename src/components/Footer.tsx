import React from 'react';
import { Phone, MessageCircle, Mail, ShieldCheck } from 'lucide-react';
import { SiteSettings } from '../types';

interface FooterProps {
  settings: SiteSettings;
}

export const Footer: React.FC<FooterProps> = ({ settings }) => {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-inner">
          <div className="footer-top">
            <div className="footer-brand">
              {settings.logoUrl ? (
                <img src={settings.logoUrl} alt={settings.siteName} className="brand-logo-img" />
              ) : (
                <div className="brand-logo-placeholder">KN</div>
              )}
              <div>
                <h4 style={{ fontWeight: 700, fontSize: '1.1rem' }}>{settings.siteName}</h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Single Source of Truth Educational Notes Platform
                </p>
              </div>
            </div>

            <div className="footer-contact">
              <a href={`https://wa.me/92${settings.whatsAppNumber.replace(/\D/g, '').replace(/^0/, '')}`} target="_blank" rel="noreferrer">
                <MessageCircle size={16} color="var(--accent-green)" /> WhatsApp: {settings.whatsAppNumber}
              </a>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Phone size={16} color="var(--primary)" /> EasyPaisa: {settings.easyPaisaNumber}
              </span>
              <a href={`mailto:${settings.contactEmail}`}>
                <Mail size={16} /> {settings.contactEmail}
              </a>
            </div>
          </div>

          <div className="footer-bottom">
            <p>{settings.footerText || `© 2026 ${settings.siteName}. All Rights Reserved.`}</p>
          </div>
        </div>
      </div>
    </footer>
  );
};
