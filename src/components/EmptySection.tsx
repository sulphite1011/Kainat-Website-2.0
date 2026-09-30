import React from 'react';
import { BookMarked, MessageCircle } from 'lucide-react';
import { SiteSettings } from '../types';

interface EmptySectionProps {
  sectionName: string;
  settings: SiteSettings;
}

export const EmptySection: React.FC<EmptySectionProps> = ({ sectionName, settings }) => {
  const whatsappUrl = `https://wa.me/92${settings.whatsAppNumber.replace(/\D/g, '').replace(/^0/, '')}?text=${encodeURIComponent(
    `Hello Kainat Notes Hub! Please notify me when notes for ${sectionName} are released.`
  )}`;

  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <BookMarked size={28} />
      </div>
      <h3 className="empty-state-title">Courses Coming Soon</h3>
      <p className="empty-state-desc">
        We are currently preparing verified, board-pattern notes and chapter summaries for{' '}
        <strong>{sectionName}</strong>.
      </p>
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-secondary"
        style={{ borderColor: 'var(--accent-green)', color: 'var(--text-main)' }}
      >
        <MessageCircle size={18} color="var(--accent-green)" />
        Request Notes on WhatsApp
      </a>
    </div>
  );
};
