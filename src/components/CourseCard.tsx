import React from 'react';
import { BookOpen, ShoppingBag, Eye, CheckCircle2 } from 'lucide-react';
import { Course } from '../types';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface CourseCardProps {
  course: Course;
  onOpenDemo: (course: Course) => void;
  onOpenReader?: (course: Course) => void;
}

export const CourseCard: React.FC<CourseCardProps> = ({ course, onOpenDemo, onOpenReader }) => {
  const { addToCart, items } = useCart();
  const { studentProfile } = useAuth();
  const navigate = useNavigate();

  const isPurchased = Boolean(
    studentProfile?.purchasedCourseIds?.includes(course.id) || course.hasPurchased
  );
  const isInCart = items.some((i) => i.courseId === course.id);

  const chapterInfo = [
    course.unitNumber,
    course.chapterNumber,
    course.chapterName,
  ]
    .filter(Boolean)
    .join(' • ');

  const handleReadClick = () => {
    if (onOpenReader) {
      onOpenReader(course);
    } else {
      navigate('/library');
    }
  };

  return (
    <article className="course-card">
      <div className="course-card-cover-container" style={{ position: 'relative' }}>
        {course.coverImageUrl ? (
          <img src={course.coverImageUrl} alt={course.title} className="course-card-cover" />
        ) : (
          <div className="course-card-cover-fallback">
            <BookOpen size={36} color="var(--primary)" />
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{course.subject}</span>
          </div>
        )}
        <div className="course-card-badge">{course.class}</div>

        {isPurchased && (
          <div
            className="badge badge-verified"
            style={{
              position: 'absolute',
              top: 10,
              left: 10,
              zIndex: 3,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
              fontWeight: 700,
            }}
          >
            <CheckCircle2 size={13} /> Owned
          </div>
        )}
      </div>

      <div className="course-card-body">
        <div className="course-meta-row">
          <span>{course.subject}</span>
          {course.pageCount && <span>• {course.pageCount} Pages</span>}
        </div>

        <h3 className="course-title">{course.title}</h3>

        {chapterInfo && (
          <div className="course-chapter-info">
            <span>{chapterInfo}</span>
          </div>
        )}

        <p className="course-desc">{course.description}</p>

        <div className="course-card-footer">
          <div className="course-price">
            {isPurchased ? (
              <span
                className="badge badge-verified"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '4px 9px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                }}
              >
                <CheckCircle2 size={14} /> Full Notes Unlocked
              </span>
            ) : (
              <>
                <span className="course-price-label">Price</span>
                <span className="course-price-amount">Rs. {course.price}</span>
              </>
            )}
          </div>

          <div className="course-card-actions">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onOpenDemo(course)}
              title="Preview Sample PDF"
            >
              <Eye size={15} /> Demo
            </button>

            {isPurchased ? (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleReadClick}
                style={{
                  backgroundColor: 'var(--accent-green)',
                  borderColor: 'var(--accent-green)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontWeight: 600,
                  padding: '6px 14px',
                }}
                title="Read Complete Verified Notes"
              >
                <BookOpen size={15} /> Read Notes
              </button>
            ) : isInCart ? (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => navigate('/library')}
                disabled
              >
                In Cart
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => addToCart(course.id)}
              >
                <ShoppingBag size={15} /> Buy
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};
