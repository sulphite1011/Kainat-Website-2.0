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
            Master Your Board Exams With <span>Kainat Notes Hub</span>
          </h1>

          <p className="hero-subtitle">
            Comprehensive chapter-wise summaries, solved numericals, and board-pattern questions for Matric, FSc, and BSc students.
          </p>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 20,
              flexWrap: 'wrap',
              justifyContent: 'center',
              fontSize: '0.85rem',
              color: 'var(--text-muted)',
              backgroundColor: 'var(--bg-secondary)',
              padding: '10px 20px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={16} color="var(--accent-green)" /> EasyPaisa Verified: {settings.easyPaisaNumber}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <BookOpen size={16} color="var(--primary)" /> Instant Access to Verified Library
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
