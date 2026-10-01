import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ShieldCheck, ShoppingBag, Clock, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { Course, Order } from '../types';
import { PdfViewerModal } from '../components/PdfViewerModal';

export const Library: React.FC = () => {
  const { isAuthenticated, clerkUserId, studentName, studentEmail, studentAvatar, openGoogleSignIn } = useAuth();
  const navigate = useNavigate();

  const [purchasedCourses, setPurchasedCourses] = useState<Course[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeReadingCourse, setActiveReadingCourse] = useState<Course | null>(null);

  const fetchLibraryData = useCallback(async () => {
    if (!isAuthenticated || !clerkUserId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const [libRes, ordersRes] = await Promise.all([
        api.getStudentLibrary(),
        api.getMyOrders(),
      ]);
      setPurchasedCourses(libRes.courses || []);
      setMyOrders(ordersRes || []);
    } catch (err) {
      console.error('Failed to load library:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, clerkUserId]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchLibraryData();
    } else {
      setIsLoading(false);
    }

    // Real-time Cloud Firestore listener for student profile and library updates across devices
    let unsubUser: (() => void) | null = null;
    if (clerkUserId) {
      try {
        unsubUser = onSnapshot(doc(db, 'users', clerkUserId), () => {
          fetchLibraryData();
        }, (err) => console.warn('Library listener fallback:', err));
      } catch {}
    }

    // Real-time SSE listener if express server is reachable
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/events');
      eventSource.addEventListener('ORDER_VERIFIED', (e: any) => {
        try {
          const data = JSON.parse(e.data);
          if (data.clerkUserId === clerkUserId) {
            fetchLibraryData();
          }
        } catch {
          fetchLibraryData();
        }
      });
      eventSource.addEventListener('ORDER_REJECTED', (e: any) => {
        try {
          const data = JSON.parse(e.data);
          if (data.clerkUserId === clerkUserId) {
            fetchLibraryData();
          }
        } catch {
          fetchLibraryData();
        }
      });
    } catch (err) {
      console.warn('SSE event source error:', err);
    }

    return () => {
      unsubUser?.();
      eventSource?.close();
    };
  }, [isAuthenticated, clerkUserId, fetchLibraryData]);

  if (!isAuthenticated) {
    return (
      <div className="container" style={{ padding: '64px 20px', minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="empty-state" style={{ maxWidth: 480 }}>
          <div className="empty-state-icon">
            <BookOpen size={32} />
          </div>
          <h2 className="empty-state-title">Sign In Required</h2>
          <p className="empty-state-desc">
            Please sign in with your Google account to view your purchased notes and study library.
          </p>
          <button className="btn btn-primary" onClick={() => openGoogleSignIn()}>
            Continue with Google
          </button>
        </div>
      </div>
    );
  }

  const pendingOrders = myOrders.filter((o) => o.status === 'PENDING');

  return (
    <div className="container" style={{ padding: '40px 20px 80px' }}>
      {/* Header Profile Summary */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 20,
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          marginBottom: '32px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {studentAvatar ? (
            <img
              src={studentAvatar}
              alt={studentName}
              style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)' }}
            />
          ) : (
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                backgroundColor: 'var(--primary)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.4rem',
                fontWeight: 700,
              }}
            >
              {studentName ? studentName.slice(0, 2).toUpperCase() : 'ST'}
            </div>
          )}
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{studentName}’s Library</h1>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>{studentEmail}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <span className="badge badge-verified">
                <ShieldCheck size={12} /> Google Verified
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                {purchasedCourses.length} {purchasedCourses.length === 1 ? 'course' : 'courses'} unlocked
              </span>
            </div>
          </div>
        </div>

        <button className="btn btn-secondary" onClick={() => navigate('/')}>
          <ShoppingBag size={16} /> Browse More Notes
        </button>
      </div>

      {/* Pending Orders Notice Banner */}
      {pendingOrders.length > 0 && (
        <div
          style={{
            backgroundColor: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '16px 20px',
            marginBottom: '28px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, color: 'var(--accent-gold)', marginBottom: 6 }}>
            <Clock size={18} /> Payment Verification in Progress
          </div>
          <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            We received your EasyPaisa payment for{' '}
            <strong>{pendingOrders.map((o) => o.id).join(', ')}</strong>. The admin is verifying your
            transaction. Your notes will automatically unlock here once approved.
          </div>
        </div>
      )}

      {/* Purchased Courses Grid */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '16px' }}>
          My Unlocked Notes & Study Materials
        </h2>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            Loading your library...
          </div>
        ) : purchasedCourses.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <FileText size={32} />
            </div>
            <h3 className="empty-state-title">You haven't purchased any notes yet</h3>
            <p className="empty-state-desc">
              Browse the catalog to find comprehensive chapter summaries and solved exam notes.
            </p>
            <button className="btn btn-primary" onClick={() => navigate('/')}>
              <ShoppingBag size={16} /> Explore Notes Catalog
            </button>
          </div>
        ) : (
          <div className="course-grid">
            {purchasedCourses.map((course) => (
              <div key={course.id} className="course-card">
                <div className="course-card-cover-container">
                  {course.coverImageUrl ? (
                    <img src={course.coverImageUrl} alt={course.title} className="course-card-cover" />
                  ) : (
                    <div className="course-card-cover-fallback">
                      <BookOpen size={36} color="var(--accent-green)" />
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{course.subject}</span>
                    </div>
                  )}
                  <div className="course-card-badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.85)' }}>
                    Verified Access
                  </div>
                </div>

                <div className="course-card-body">
                  <div className="course-meta-row" style={{ color: 'var(--accent-green)' }}>
                    <span>{course.class}</span>
                    <span>• {course.subject}</span>
                  </div>

                  <h3 className="course-title">{course.title}</h3>

                  <p className="course-desc">{course.description}</p>

                  <div className="course-card-footer">
                    <span className="badge badge-verified">Permanent License</span>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => setActiveReadingCourse(course)}
                    >
                      <BookOpen size={16} /> Read Notes
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Order History */}
      {myOrders.length > 0 && (
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '14px' }}>
            My Orders History
          </h3>
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Date</th>
                  <th>Courses</th>
                  <th>Amount</th>
                  <th>Transaction ID</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {myOrders.map((order) => (
                  <tr key={order.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{order.id}</td>
                    <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                    <td>
                      {order.coursesSummary?.map((c) => c.title).join(', ') || `${order.courseIds.length} notes`}
                    </td>
                    <td style={{ fontWeight: 700 }}>Rs. {order.totalAmount}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      {order.transactionId}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          order.status === 'VERIFIED'
                            ? 'badge-verified'
                            : order.status === 'PENDING'
                            ? 'badge-pending'
                            : 'badge-rejected'
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Protected Document Reader Modal */}
      {activeReadingCourse && (
        <PdfViewerModal
          courseId={activeReadingCourse.id}
          courseTitle={activeReadingCourse.title}
          isPaidMode={true}
          onClose={() => setActiveReadingCourse(null)}
        />
      )}
    </div>
  );
};
