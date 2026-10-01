import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingBag,
  BookOpen,
  Users,
  Settings,
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
  Eye,
  Trash2,
  Edit,
  Plus,
  LogOut,
  Upload,
  RefreshCw,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { Course, Order, UserProfile, AdminStats, SiteSettings } from '../types';
import { LogoCropperModal } from '../components/LogoCropperModal';

type AdminTab = 'dashboard' | 'orders' | 'courses' | 'students' | 'branding' | 'settings';

interface AdminPortalProps {
  settings: SiteSettings;
  onSettingsUpdated: (updated: SiteSettings) => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ settings, onSettingsUpdated }) => {
  const { isAdminAuthenticated, logoutAdmin, adminUsername } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modals & Editors
  const [isLogoModalOpen, setIsLogoModalOpen] = useState<boolean>(false);
  const [isCourseModalOpen, setIsCourseModalOpen] = useState<boolean>(false);
  const [editingCourse, setEditingCourse] = useState<Partial<Course> | null>(null);
  const [selectedProofUrl, setSelectedProofUrl] = useState<string | null>(null);
  const [deleteConfirmCourse, setDeleteConfirmCourse] = useState<{ id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [rejectModalOrder, setRejectModalOrder] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('Transaction could not be verified or reference not found');
  const [isRejecting, setIsRejecting] = useState<boolean>(false);

  // Settings form state
  const [formSettings, setFormSettings] = useState<SiteSettings>(settings);
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);

  // Custom class level state
  const [isAddingCustomClass, setIsAddingCustomClass] = useState<boolean>(false);
  const [newCustomClassName, setNewCustomClassName] = useState<string>('');
  const [isSavingCustomClass, setIsSavingCustomClass] = useState<boolean>(false);

  // Computed list of all available class levels (combining defaults, settings, and courses)
  const availableClasses = useMemo(() => {
    const defaultClasses = [
      'Matric 9th',
      'Matric 10th',
      'FSc Pre-Medical',
      'FSc Pre-Engineering',
      'ICS',
      'I.Com',
      'BSc / BS',
    ];
    const set = new Set<string>(defaultClasses);
    if (settings.customClasses && Array.isArray(settings.customClasses)) {
      settings.customClasses.forEach((c) => c && set.add(c.trim()));
    }
    if (formSettings.customClasses && Array.isArray(formSettings.customClasses)) {
      formSettings.customClasses.forEach((c) => c && set.add(c.trim()));
    }
    courses.forEach((c) => {
      if (c.class && c.class.trim()) set.add(c.class.trim());
    });
    return Array.from(set).filter(Boolean);
  }, [settings.customClasses, formSettings.customClasses, courses]);

  const handleSaveNewCustomClass = async () => {
    if (!newCustomClassName.trim()) {
      showToast('Please enter a valid class name', 'error');
      return;
    }
    const trimmed = newCustomClassName.trim();
    try {
      setIsSavingCustomClass(true);
      const res = await api.addCustomClass(trimmed);
      if (res.settings) {
        onSettingsUpdated(res.settings);
        setFormSettings(res.settings);
      }
      if (editingCourse) {
        setEditingCourse((prev) => (prev ? { ...prev, class: trimmed } : null));
      }
      setNewCustomClassName('');
      setIsAddingCustomClass(false);
      showToast(`Class "${trimmed}" saved to dropdown for future courses!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save custom class', 'error');
    } finally {
      setIsSavingCustomClass(false);
    }
  };

  const handleDeleteCustomClass = async (classNameToDelete: string) => {
    try {
      const res = await api.deleteCustomClass(classNameToDelete);
      if (res.settings) {
        onSettingsUpdated(res.settings);
        setFormSettings(res.settings);
      }
      showToast(`Class "${classNameToDelete}" removed from dropdown list`, 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to remove class', 'error');
    }
  };

  // Course cover upload ref
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingCover, setIsUploadingCover] = useState<boolean>(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAdminAuthenticated) {
      navigate('/admin/login');
    }
  }, [isAdminAuthenticated, navigate]);

  // Sync settings prop to form state
  useEffect(() => {
    setFormSettings(settings);
  }, [settings]);

  // Fetch data for active tab
  const loadData = useCallback(async () => {
    if (!isAdminAuthenticated) return;
    setIsLoading(true);
    try {
      if (activeTab === 'dashboard') {
        const statsData = await api.getAdminStats();
        setStats(statsData);
      } else if (activeTab === 'orders') {
        const ordersData = await api.getAllOrders();
        setOrders(ordersData);
      } else if (activeTab === 'courses') {
        const coursesData = await api.getCourses();
        setCourses(coursesData);
      } else if (activeTab === 'students') {
        const studentsData = await api.getStudents();
        setStudents(studentsData);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch admin data', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [isAdminAuthenticated, activeTab, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time Firestore & SSE updates for admin portal across all devices
  useEffect(() => {
    if (!isAdminAuthenticated) return;

    let unsubOrders: (() => void) | null = null;
    let unsubCourses: (() => void) | null = null;

    try {
      unsubOrders = onSnapshot(collection(db, 'orders'), () => {
        loadData();
      }, (err) => console.warn('Admin orders listener fallback:', err));

      unsubCourses = onSnapshot(collection(db, 'courses'), () => {
        loadData();
      }, (err) => console.warn('Admin courses listener fallback:', err));
    } catch {}

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/events');
      eventSource.addEventListener('NEW_ORDER', () => {
        showToast('New order received!', 'info');
        loadData();
      });
      eventSource.addEventListener('ORDER_VERIFIED', () => loadData());
      eventSource.addEventListener('ORDER_REJECTED', () => loadData());
      eventSource.addEventListener('COURSE_CREATED', () => loadData());
      eventSource.addEventListener('COURSE_UPDATED', () => loadData());
      eventSource.addEventListener('COURSE_DELETED', () => loadData());
    } catch (err) {
      console.warn('SSE error:', err);
    }
    return () => {
      unsubOrders?.();
      unsubCourses?.();
      eventSource?.close();
    };
  }, [isAdminAuthenticated, loadData, showToast]);

  // Order Actions
  const handleVerifyOrder = async (orderId: string) => {
    try {
      await api.verifyOrder(orderId, 'Verified by administrator');
      showToast(`Order ${orderId} verified and notes unlocked!`, 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Verification failed', 'error');
    }
  };

  const handleRejectOrder = (orderId: string) => {
    setRejectModalOrder(orderId);
    setRejectReason('Transaction could not be verified or reference not found');
  };

  const handleConfirmReject = async () => {
    if (!rejectModalOrder) return;
    try {
      setIsRejecting(true);
      await api.rejectOrder(rejectModalOrder, rejectReason);
      showToast(`Order ${rejectModalOrder} marked as rejected`, 'info');
      setRejectModalOrder(null);
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Rejection failed', 'error');
    } finally {
      setIsRejecting(false);
    }
  };

  const handleDeleteCourse = (courseId: string, title: string) => {
    setDeleteConfirmCourse({ id: courseId, title });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmCourse) return;
    try {
      setIsDeleting(true);
      await api.deleteCourse(deleteConfirmCourse.id);
      showToast(`Course "${deleteConfirmCourse.title}" deleted from server`, 'info');
      setDeleteConfirmCourse(null);
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete course', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Course Cover Upload
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingCover(true);
      const formData = new FormData();
      formData.append('cover', file);
      const res = await api.uploadCourseCover(formData);
      if (res.success && res.coverUrl) {
        setEditingCourse((prev) => ({ ...prev, coverImageUrl: res.coverUrl }));
        showToast('Course cover uploaded!', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Cover upload failed', 'error');
    } finally {
      setIsUploadingCover(false);
    }
  };

  // Save / Update Course
  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourse?.title || !editingCourse?.class || !editingCourse?.subject || editingCourse?.price === undefined) {
      showToast('Title, Class, Subject, and Price are required.', 'error');
      return;
    }

    try {
      if (editingCourse.id) {
        // Update
        await api.updateCourse(editingCourse.id, editingCourse);
        showToast('Course updated successfully', 'success');
      } else {
        // Create
        await api.createCourse(editingCourse);
        showToast('Course created successfully', 'success');
      }
      setIsCourseModalOpen(false);
      setEditingCourse(null);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to save course', 'error');
    }
  };



  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingSettings(true);
      const res = await api.updateSettings(formSettings);
      if (res.success && res.settings) {
        onSettingsUpdated(res.settings);
        showToast('Website settings saved to server filesystem', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to save settings', 'error');
    } finally {
      setIsSavingSettings(false);
    }
  };

  if (!isAdminAuthenticated) return null;

  return (
    <div className="container" style={{ padding: '32px 20px 80px' }}>
      {/* Top Admin Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '18px 24px',
          marginBottom: '24px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Admin Management Console</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Logged in as <strong>{adminUsername}</strong> • Persistent Server Storage
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn btn-secondary btn-sm" onClick={loadData}>
            <RefreshCw size={15} /> Refresh
          </button>
          <button className="btn btn-danger btn-sm" onClick={logoutAdmin}>
            <LogOut size={15} /> Logout
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          overflowX: 'auto',
          paddingBottom: 8,
          marginBottom: 24,
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <button
          className={`btn ${activeTab === 'dashboard' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          onClick={() => setActiveTab('dashboard')}
        >
          <LayoutDashboard size={16} /> Dashboard
        </button>
        <button
          className={`btn ${activeTab === 'orders' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          onClick={() => setActiveTab('orders')}
        >
          <ShoppingBag size={16} /> Orders
        </button>
        <button
          className={`btn ${activeTab === 'courses' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          onClick={() => setActiveTab('courses')}
        >
          <BookOpen size={16} /> Courses & Notes
        </button>
        <button
          className={`btn ${activeTab === 'students' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          onClick={() => setActiveTab('students')}
        >
          <Users size={16} /> Students Directory
        </button>
        <button
          className={`btn ${activeTab === 'branding' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          onClick={() => setActiveTab('branding')}
        >
          <ImageIcon size={16} /> Branding & Logo
        </button>
        <button
          className={`btn ${activeTab === 'settings' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          onClick={() => setActiveTab('settings')}
        >
          <Settings size={16} /> Website Settings
        </button>
      </div>

      {/* TAB 1: DASHBOARD */}
      {activeTab === 'dashboard' && stats && (
        <div>
          <div className="admin-stats-grid">
            <div className="admin-stat-card">
              <span className="admin-stat-title">Verified Revenue</span>
              <span className="admin-stat-value" style={{ color: 'var(--accent-green)' }}>
                Rs. {stats.verifiedRevenue}
              </span>
            </div>
            <div className="admin-stat-card">
              <span className="admin-stat-title">Pending Payments</span>
              <span className="admin-stat-value" style={{ color: 'var(--accent-gold)' }}>
                Rs. {stats.pendingPayments}
              </span>
            </div>
            <div className="admin-stat-card">
              <span className="admin-stat-title">Verified Students</span>
              <span className="admin-stat-value">{stats.verifiedStudents}</span>
            </div>
            <div className="admin-stat-card">
              <span className="admin-stat-title">Total Registered Students</span>
              <span className="admin-stat-value">{stats.totalStudents}</span>
            </div>
            <div className="admin-stat-card">
              <span className="admin-stat-title">Published Courses</span>
              <span className="admin-stat-value">{stats.publishedCourses} / {stats.totalCourses}</span>
            </div>
            <div className="admin-stat-card">
              <span className="admin-stat-title">Total Orders</span>
              <span className="admin-stat-value">{stats.totalOrders}</span>
            </div>
          </div>

          <div
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '18px 22px',
              fontSize: '0.88rem',
              color: 'var(--text-muted)',
            }}
          >
            <strong>Single Source of Truth Active:</strong> All metrics, courses, and orders are computed
            directly from server-side persistent files in <code>/data/</code>. Every change made here is
            immediately reflected for all students across any browser, incognito window, or device.
          </div>
        </div>
      )}

      {/* TAB 2: ORDERS */}
      {activeTab === 'orders' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Orders & Payment Verification</h2>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Total: {orders.length} orders
            </span>
          </div>

          {orders.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-title">No Orders Yet</div>
              <div className="empty-state-desc">Orders placed by students will appear here for verification.</div>
            </div>
          ) : (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Student</th>
                    <th>Amount</th>
                    <th>Transaction ID</th>
                    <th>Proof</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td>
                        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{o.id}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                          {new Date(o.createdAt).toLocaleString()}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{o.studentName}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{o.studentEmail}</div>
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--primary)' }}>Rs. {o.totalAmount}</td>
                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', backgroundColor: 'var(--bg-tertiary)', padding: '3px 6px', borderRadius: 4 }}>
                          {o.transactionId}
                        </span>
                      </td>
                      <td>
                        {o.paymentProofUrl ? (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => setSelectedProofUrl(o.paymentProofUrl)}
                          >
                            <Eye size={14} /> View Proof
                          </button>
                        ) : (
                          <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>None attached</span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            o.status === 'VERIFIED'
                              ? 'badge-verified'
                              : o.status === 'PENDING'
                              ? 'badge-pending'
                              : 'badge-rejected'
                          }`}
                        >
                          {o.status}
                        </span>
                      </td>
                      <td>
                        {o.status === 'PENDING' ? (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => handleVerifyOrder(o.id)}
                              title="Verify Payment & Unlock Notes"
                              style={{ backgroundColor: 'var(--accent-green)' }}
                            >
                              <CheckCircle2 size={14} /> Verify
                            </button>
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              onClick={() => handleRejectOrder(o.id)}
                              title="Reject Order"
                            >
                              <XCircle size={14} /> Reject
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                            Completed
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: COURSES */}
      {activeTab === 'courses' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Course & Notes Management</h2>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                setEditingCourse({
                  title: '',
                  class: 'Matric 9th',
                  subject: 'Physics',
                  description: '',
                  price: 300,
                  coverImageUrl: '',
                  samplePdfUrl: '',
                  fullPdfUrl: '',
                  isPublished: true,
                });
                setIsCourseModalOpen(true);
              }}
            >
              <Plus size={16} /> Create New Course
            </button>
          </div>

          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Title & Class</th>
                  <th>Subject</th>
                  <th>Chapter / Unit</th>
                  <th>Price</th>
                  <th>PDFs</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{c.title}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>{c.class}</div>
                    </td>
                    <td>{c.subject}</td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {[c.unitNumber, c.chapterNumber, c.chapterName].filter(Boolean).join(' • ') || '—'}
                    </td>
                    <td style={{ fontWeight: 700 }}>Rs. {c.price}</td>
                    <td style={{ fontSize: '0.8rem' }}>
                      <div>Sample: {c.samplePdfUrl ? '✅ Set' : '❌ None'}</div>
                      <div>Full: {c.hasFullPdf || c.fullPdfUrl ? '🔒 Protected' : '❌ None'}</div>
                    </td>
                    <td>
                      <span className={`badge ${c.isPublished ? 'badge-verified' : 'badge-rejected'}`}>
                        {c.isPublished ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setEditingCourse(c);
                            setIsCourseModalOpen(true);
                          }}
                          title="Edit Course"
                        >
                          <Edit size={14} /> Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDeleteCourse(c.id, c.title)}
                          title="Delete Course"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: STUDENTS */}
      {activeTab === 'students' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Students Directory</h2>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Synchronized from Clerk Google Logins
            </span>
          </div>

          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Student Profile</th>
                  <th>Gmail</th>
                  <th>Clerk User ID</th>
                  <th>Purchased Notes</th>
                  <th>Orders</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s: any) => (
                  <tr key={s.clerkUserId}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {s.avatarUrl ? (
                          <img
                            src={s.avatarUrl}
                            alt={s.name}
                            style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }}
                          />
                        ) : (
                          <div className="user-avatar" style={{ width: 34, height: 34, fontSize: '0.85rem' }}>
                            {s.name ? s.name[0].toUpperCase() : 'S'}
                          </div>
                        )}
                        <span style={{ fontWeight: 600 }}>{s.name}</span>
                      </div>
                    </td>
                    <td>{s.email}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                      {s.clerkUserId}
                    </td>
                    <td>
                      <span className="badge badge-verified">
                        {s.purchasedCourseIds?.length || s.purchasedCoursesCount || 0} Unlocked
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.85rem' }}>
                        {s.totalOrders || 0} ({s.verifiedOrders || 0} verified)
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: BRANDING & LOGO */}
      {activeTab === 'branding' && (
        <div style={{ maxWidth: 640 }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 16 }}>Website Branding & Logo</h2>

          <div
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              marginBottom: 24,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 20 }}>
              {settings.logoUrl ? (
                <img
                  src={settings.logoUrl}
                  alt={settings.siteName}
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '3px solid var(--primary)',
                    boxShadow: 'var(--shadow-md)',
                  }}
                />
              ) : (
                <div
                  className="brand-logo-placeholder"
                  style={{ width: 96, height: 96, fontSize: '2.5rem' }}
                >
                  KN
                </div>
              )}

              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Current Circular Profile Logo</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '4px 0 12px' }}>
                  The circular logo is displayed in the navigation bar and footer across all browsers.
                </p>
                <button className="btn btn-primary btn-sm" onClick={() => setIsLogoModalOpen(true)}>
                  <Upload size={16} /> Open Logo Editor & Cropper
                </button>
              </div>
            </div>

            <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)', borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
              Supports drag/pan, pinch-to-zoom, mouse scroll zoom, and live circular export preview.
              Stored in <code>/storage/logos/</code> and <code>settings.json</code>.
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: SETTINGS */}
      {activeTab === 'settings' && (
        <div style={{ maxWidth: 640 }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 16 }}>Website Configuration</h2>

          <form
            onSubmit={handleSaveSettings}
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
            }}
          >
            <div className="form-group">
              <label className="form-label">Site Name</label>
              <input
                type="text"
                className="form-input"
                value={formSettings.siteName}
                onChange={(e) => setFormSettings({ ...formSettings, siteName: e.target.value })}
                required
              />
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">EasyPaisa Account Number</label>
                <input
                  type="text"
                  className="form-input"
                  value={formSettings.easyPaisaNumber}
                  onChange={(e) => setFormSettings({ ...formSettings, easyPaisaNumber: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">EasyPaisa Account Title</label>
                <input
                  type="text"
                  className="form-input"
                  value={formSettings.easyPaisaTitle}
                  onChange={(e) => setFormSettings({ ...formSettings, easyPaisaTitle: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">WhatsApp Contact Number</label>
                <input
                  type="text"
                  className="form-input"
                  value={formSettings.whatsAppNumber}
                  onChange={(e) => setFormSettings({ ...formSettings, whatsAppNumber: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Support Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  value={formSettings.contactEmail}
                  onChange={(e) => setFormSettings({ ...formSettings, contactEmail: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Footer Copyright Text</label>
              <input
                type="text"
                className="form-input"
                value={formSettings.footerText}
                onChange={(e) => setFormSettings({ ...formSettings, footerText: e.target.value })}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={isSavingSettings}>
              {isSavingSettings ? 'Saving Settings...' : 'Save Settings to Server'}
            </button>
          </form>

          {/* Academic Class Levels Management */}
          <div
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              marginTop: '24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Layers size={20} color="var(--primary)" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Customized Class Levels</h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 16 }}>
              These class levels appear in the course creation dropdown and the homepage filter tabs.
              Custom classes are saved permanently on the server for all future courses.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
              {availableClasses.map((cls) => {
                const isDefault = [
                  'Matric 9th',
                  'Matric 10th',
                  'FSc Pre-Medical',
                  'FSc Pre-Engineering',
                  'ICS',
                  'I.Com',
                  'BSc / BS',
                ].includes(cls);

                return (
                  <span
                    key={cls}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 12px',
                      backgroundColor: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                    }}
                  >
                    <span>{cls}</span>
                    {!isDefault && (
                      <button
                        type="button"
                        onClick={() => handleDeleteCustomClass(cls)}
                        title={`Remove "${cls}" from class list`}
                        style={{
                          color: 'var(--accent-red)',
                          padding: 2,
                          lineHeight: 1,
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <XCircle size={14} />
                      </button>
                    )}
                  </span>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Enter new class (e.g. O Levels, A Levels, MDCAT, ECAT)"
                value={newCustomClassName}
                onChange={(e) => setNewCustomClassName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSaveNewCustomClass();
                  }
                }}
                style={{ maxWidth: 360 }}
              />
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleSaveNewCustomClass}
                disabled={isSavingCustomClass || !newCustomClassName.trim()}
              >
                <Plus size={14} /> Add Class Level
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Course Create / Edit Modal */}
      {isCourseModalOpen && editingCourse && (
        <div className="modal-backdrop" onClick={() => setIsCourseModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingCourse.id ? 'Edit Course' : 'Create New Educational Course'}
              </h3>
              <button className="modal-close-btn" onClick={() => setIsCourseModalOpen(false)}>
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveCourse}>
              <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
                <div className="form-group">
                  <label className="form-label">
                    Course Title <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Physics Chapter 1: Physical Quantities & Measurement"
                    value={editingCourse.title || ''}
                    onChange={(e) => setEditingCourse({ ...editingCourse, title: e.target.value })}
                    required
                  />
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <label className="form-label" style={{ margin: 0 }}>
                        Class Level <span className="req">*</span>
                      </label>
                      {!isAddingCustomClass && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => setIsAddingCustomClass(true)}
                          style={{ fontSize: '0.78rem', color: 'var(--primary)', padding: '2px 6px', fontWeight: 600 }}
                        >
                          + Add Custom Class
                        </button>
                      )}
                    </div>

                    {!isAddingCustomClass ? (
                      <select
                        className="form-select"
                        value={editingCourse.class || availableClasses[0] || 'Matric 9th'}
                        onChange={(e) => {
                          if (e.target.value === '__ADD_CUSTOM__') {
                            setIsAddingCustomClass(true);
                          } else {
                            setEditingCourse({ ...editingCourse, class: e.target.value });
                          }
                        }}
                      >
                        {availableClasses.map((cls) => (
                          <option key={cls} value={cls}>
                            {cls}
                          </option>
                        ))}
                        <option value="__ADD_CUSTOM__" style={{ fontWeight: 700, color: 'var(--primary)' }}>
                          + Add Customized Class...
                        </option>
                      </select>
                    ) : (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. O Levels, A Levels, MDCAT, ECAT, BS CS"
                          value={newCustomClassName}
                          onChange={(e) => setNewCustomClassName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSaveNewCustomClass();
                            }
                          }}
                          autoFocus
                          style={{ flex: 1 }}
                        />
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={handleSaveNewCustomClass}
                          disabled={isSavingCustomClass || !newCustomClassName.trim()}
                          style={{ whiteSpace: 'nowrap' }}
                        >
                          {isSavingCustomClass ? 'Saving...' : 'Save & Select'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setIsAddingCustomClass(false);
                            setNewCustomClassName('');
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Subject <span className="req">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Physics, Chemistry, Mathematics"
                      value={editingCourse.subject || ''}
                      onChange={(e) => setEditingCourse({ ...editingCourse, subject: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Unit (Optional)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Unit 1"
                      value={editingCourse.unitNumber || ''}
                      onChange={(e) => setEditingCourse({ ...editingCourse, unitNumber: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Chapter (Optional)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Chapter 1: Measurements"
                      value={editingCourse.chapterName || ''}
                      onChange={(e) => setEditingCourse({ ...editingCourse, chapterName: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">
                      Price (PKR) <span className="req">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="form-input"
                      value={editingCourse.price ?? 300}
                      onChange={(e) => setEditingCourse({ ...editingCourse, price: Number(e.target.value) })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Page Count</label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="e.g. 45"
                      value={editingCourse.pageCount || ''}
                      onChange={(e) => setEditingCourse({ ...editingCourse, pageCount: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    placeholder="Short summary of chapter notes, solved numericals, exercises..."
                    value={editingCourse.description || ''}
                    onChange={(e) => setEditingCourse({ ...editingCourse, description: e.target.value })}
                  />
                </div>

                {/* Cover Image Upload */}
                <div className="form-group">
                  <label className="form-label">Course Cover Image</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    {editingCourse.coverImageUrl && (
                      <img
                        src={editingCourse.coverImageUrl}
                        alt="Cover"
                        style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 'var(--radius-sm)' }}
                      />
                    )}
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => coverInputRef.current?.click()}
                      disabled={isUploadingCover}
                    >
                      <Upload size={14} /> {isUploadingCover ? 'Uploading...' : 'Upload Cover File'}
                    </button>
                    <input
                      ref={coverInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleCoverUpload}
                    />
                  </div>
                </div>

                {/* Two PDF System */}
                <div
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    padding: 14,
                    borderRadius: 'var(--radius-md)',
                    marginBottom: 16,
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 8 }}>
                    Two-PDF System (Google Drive / Direct Links)
                  </div>

                  <div className="form-group">
                    <label className="form-label">1. Sample PDF URL (Public Preview)</label>
                    <input
                      type="url"
                      className="form-input"
                      placeholder="https://drive.google.com/file/d/.../view"
                      value={editingCourse.samplePdfUrl || ''}
                      onChange={(e) => setEditingCourse({ ...editingCourse, samplePdfUrl: e.target.value })}
                    />
                    <div className="form-help">
                      Freely readable by anyone clicking "View Demo".
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">2. Full PDF URL (Paid Notes - Protected)</label>
                    <input
                      type="url"
                      className="form-input"
                      placeholder="https://drive.google.com/file/d/.../view"
                      value={editingCourse.fullPdfUrl || ''}
                      onChange={(e) => setEditingCourse({ ...editingCourse, fullPdfUrl: e.target.value })}
                    />
                    <div className="form-help">
                      Server strictly locks this link. Only verified paid students can open it with
                      personalized watermarking.
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    id="isPublishedCheck"
                    checked={editingCourse.isPublished ?? true}
                    onChange={(e) => setEditingCourse({ ...editingCourse, isPublished: e.target.checked })}
                    style={{ width: 18, height: 18 }}
                  />
                  <label htmlFor="isPublishedCheck" style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                    Publish to Public Catalog immediately
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsCourseModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Course to Server
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Proof Viewer Modal */}
      {selectedProofUrl && (
        <div className="modal-backdrop" onClick={() => setSelectedProofUrl(null)}>
          <div className="modal-content" style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Payment Screenshot Verification</h3>
              <button className="modal-close-btn" onClick={() => setSelectedProofUrl(null)}>
                &times;
              </button>
            </div>
            <div className="modal-body" style={{ textAlign: 'center' }}>
              <img
                src={selectedProofUrl}
                alt="Payment Proof"
                style={{ maxWidth: '100%', maxHeight: '65vh', borderRadius: 'var(--radius-sm)', objectFit: 'contain' }}
              />
              <div style={{ marginTop: 12 }}>
                <a
                  href={selectedProofUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <ExternalLink size={14} /> Open Full Size in New Tab
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Professional Circular Logo Cropper Modal */}
      {isLogoModalOpen && (
        <LogoCropperModal
          isOpen={isLogoModalOpen}
          onClose={() => setIsLogoModalOpen(false)}
          onLogoUpdated={(newLogoUrl) => {
            onSettingsUpdated({ ...settings, logoUrl: newLogoUrl });
          }}
        />
      )}

      {/* In-App Course Delete Confirmation Dialog */}
      {deleteConfirmCourse && (
        <div className="modal-backdrop" onClick={() => !isDeleting && setDeleteConfirmCourse(null)}>
          <div className="modal-content" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ color: 'var(--accent-red)' }}>
                Delete Course
              </h3>
              <button
                className="modal-close-btn"
                onClick={() => !isDeleting && setDeleteConfirmCourse(null)}
                disabled={isDeleting}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: 12 }}>
                Are you sure you want to permanently delete:
              </p>
              <div
                style={{
                  padding: '10px 14px',
                  backgroundColor: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 600,
                  marginBottom: 14,
                  border: '1px solid var(--border-subtle)',
                }}
              >
                {deleteConfirmCourse.title}
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                This course will be deleted directly from the server database (<code>courses.json</code>)
                and will disappear immediately for every student across all devices and browsers.
              </p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeleteConfirmCourse(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting Course...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-App Order Reject Confirmation Dialog */}
      {rejectModalOrder && (
        <div className="modal-backdrop" onClick={() => !isRejecting && setRejectModalOrder(null)}>
          <div className="modal-content" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ color: 'var(--accent-red)' }}>
                Reject Order {rejectModalOrder}
              </h3>
              <button
                className="modal-close-btn"
                onClick={() => !isRejecting && setRejectModalOrder(null)}
                disabled={isRejecting}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Reason for Rejection</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Transaction ID not found or screenshot unclear"
                />
                <div className="form-help">
                  The student will be notified of this reason in their notifications.
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setRejectModalOrder(null)}
                disabled={isRejecting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleConfirmReject}
                disabled={isRejecting}
              >
                {isRejecting ? 'Rejecting...' : 'Confirm Reject Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
