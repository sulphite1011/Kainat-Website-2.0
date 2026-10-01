import React from 'react';
import { BookOpen, Sparkles } from 'lucide-react';

export const CourseSkeletonGrid: React.FC = () => {
  return (
    <div style={{ width: '100%', marginTop: 8 }}>
      {/* Engaging animated loading status pill */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          margin: '0 auto 28px',
          padding: '8px 18px',
          borderRadius: '9999px',
          background: 'linear-gradient(90deg, rgba(37,99,235,0.08), rgba(16,185,129,0.08))',
          border: '1px solid rgba(37,99,235,0.2)',
          maxWidth: 380,
          boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <BookOpen size={16} color="var(--primary)" />
          <span
            style={{
              position: 'absolute',
              top: -2,
              right: -2,
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: 'var(--accent-green)',
              boxShadow: '0 0 8px var(--accent-green)',
            }}
          />
        </div>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
          Synchronizing syllabus notes from Cloud...
        </span>
        <Sparkles size={14} color="var(--accent-green)" />
      </div>

      {/* Grid of Shimmering Cards */}
      <div className="course-grid">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="skeleton-card" style={{ animationDelay: `${i * 0.1}s` }}>
            {/* Class & Subject Badges */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="skeleton-shimmer skeleton-badge" style={{ width: 85 }} />
              <div className="skeleton-shimmer skeleton-badge" style={{ width: 65 }} />
            </div>

            {/* Title */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
              <div className="skeleton-shimmer skeleton-title" />
              <div className="skeleton-shimmer skeleton-title-sm" />
            </div>

            {/* Chapter / Topic Info */}
            <div
              style={{
                display: 'flex',
                gap: 8,
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--bg-tertiary)',
                margin: '6px 0',
              }}
            >
              <div className="skeleton-shimmer" style={{ width: 50, height: 16 }} />
              <div className="skeleton-shimmer" style={{ width: 120, height: 16 }} />
            </div>

            {/* Description Lines */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div className="skeleton-shimmer skeleton-text" />
              <div className="skeleton-shimmer skeleton-text" style={{ width: '80%' }} />
            </div>

            {/* Price & Action Buttons */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 'auto',
                paddingTop: 12,
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              <div className="skeleton-shimmer skeleton-price" />
              <div style={{ display: 'flex', gap: 8 }}>
                <div className="skeleton-shimmer skeleton-btn" style={{ width: 80 }} />
                <div className="skeleton-shimmer skeleton-btn" style={{ width: 95 }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
