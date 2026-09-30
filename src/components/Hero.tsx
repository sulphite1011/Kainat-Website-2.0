import React from 'react';
import { BookOpen, CheckCircle, ShieldCheck } from 'lucide-react';
import { SiteSettings } from '../types';

interface HeroProps {
  settings: SiteSettings;
}

export const Hero: React.FC<HeroProps> = ({ settings }) => {
  return (
    <section className="hero-section">
      <div className="container">
        <div className="hero-content">
          <div className="hero-badge">
            <CheckCircle size={14} /> Official Curriculum Notes & Past Papers
          </div>

          <h1 className="hero-title">
            Master Your Board Exams With <span>{settings.siteName || 'Kainat Notes Hub'}</span>
          </h1>

          <p className="hero-subtitle">
            Comprehensive chapter-wise summaries, solved numericals, and board-pattern questions for all classes and faculties.
          </p>

          <div className="hero-highlights">
            <div className="hero-highlight-item">
              <ShieldCheck size={16} color="var(--accent-green)" />
              <span>EasyPaisa Verified: <strong>{settings.easyPaisaNumber || '03415892099'}</strong></span>
            </div>
            <div className="hero-highlight-item">
              <BookOpen size={16} color="var(--primary)" />
              <span>Instant Access to Protected Notes</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
