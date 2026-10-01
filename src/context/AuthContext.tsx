import React, { createContext, useContext, useState, useEffect } from 'react';
import { useUser, useClerk } from '@clerk/clerk-react';
import { api, setAuthClerkUserId, setAuthAdminToken } from '../services/api';
import { UserProfile, NotificationItem } from '../types';
import { StudentLoginModal } from '../components/StudentLoginModal';

interface AuthContextType {
  // Student
  isAuthenticated: boolean;
  clerkUserId: string | null;
  studentProfile: UserProfile | null;
  studentName: string;
  studentEmail: string;
  studentAvatar: string;
  isClerkConfigured: boolean;
  notifications: NotificationItem[];
  unreadNotificationCount: number;
  openGoogleSignIn: (pendingCourseId?: string) => void;
  closeLoginModal: () => void;
  isLoginModalOpen: boolean;
  signOutStudent: () => Promise<void>;
  refreshStudentProfile: () => Promise<void>;
  setDevStudentProfile: (profile: { id: string; name: string; email: string; avatar: string }) => void;

  // Admin
  isAdminAuthenticated: boolean;
  adminUsername: string | null;
  loginAdmin: (user: string, pass: string) => Promise<boolean>;
  logoutAdmin: () => void;

  // Pending action after login
  pendingCourseToAdd: string | null;
  setPendingCourseToAdd: (courseId: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Check if Clerk key is valid
export const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
export const isClerkKeyValid = Boolean(
  CLERK_KEY && CLERK_KEY.startsWith('pk_') && CLERK_KEY !== 'pk_test_placeholder'
);

export const AuthProviderInner: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  let clerkUser: any = null;
  let clerkObj: any = null;
  try {
    clerkUser = useUser().user;
    clerkObj = useClerk();
  } catch (err) {
    // safe fallback if not wrapped or clerk error
  }

  // Fallback dev state
  const [devStudent, setDevStudent] = useState<{
    id: string;
    name: string;
    email: string;
    avatar: string;
  } | null>(null);

  const [studentProfile, setStudentProfile] = useState<UserProfile | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [pendingCourseToAdd, setPendingCourseToAdd] = useState<string | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);

  // Admin state initialized from localStorage
  const [adminToken, setAdminToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem('kainat_admin_token') || null;
    } catch {
      return null;
    }
  });
  const [adminUsername, setAdminUsername] = useState<string | null>(() => {
    try {
      return localStorage.getItem('kainat_admin_user') || null;
    } catch {
      return null;
    }
  });

  // Effective student values
  const effectiveUserId = clerkUser ? clerkUser.id : devStudent?.id || null;
  const effectiveName = clerkUser
    ? clerkUser.fullName || clerkUser.firstName || 'Student'
    : devStudent?.name || '';
  const effectiveEmail = clerkUser
    ? clerkUser.primaryEmailAddress?.emailAddress || ''
    : devStudent?.email || '';
  const effectiveAvatar = clerkUser
    ? clerkUser.imageUrl || ''
    : devStudent?.avatar || '';

  const isAuthenticated = Boolean(effectiveUserId);
  // Synchronously ensure API client knows the current active clerk user id
  setAuthClerkUserId(effectiveUserId);

  // If user signs in, close login modal automatically
  useEffect(() => {
    if (isAuthenticated) {
      setIsLoginModalOpen(false);
    }
  }, [isAuthenticated]);

  // Keep API client header updated with current clerk user id
  useEffect(() => {
    setAuthClerkUserId(effectiveUserId);
    if (effectiveUserId) {
      // Sync user profile to server-side users.json
      api
        .syncStudent({
          clerkUserId: effectiveUserId,
          name: effectiveName,
          email: effectiveEmail,
          avatarUrl: effectiveAvatar,
        })
        .then((res) => {
          if (res.user) {
            setStudentProfile(res.user);
          }
        })
        .catch((err) => console.error('Failed to sync student with server:', err));

      // Fetch user notifications
      api
        .getNotifications()
        .then(setNotifications)
        .catch(() => {});

      // Setup real-time listener for order verification
      let eventSource: EventSource | null = null;
      try {
        eventSource = new EventSource('/api/events');
        eventSource.addEventListener('ORDER_VERIFIED', (e: any) => {
          try {
            const data = JSON.parse(e.data);
            if (!data.clerkUserId || data.clerkUserId === effectiveUserId) {
              refreshStudentProfile();
            }
          } catch {
            refreshStudentProfile();
          }
        });
      } catch (err) {
        console.warn('SSE auth listener error:', err);
      }

      return () => {
        eventSource?.close();
      };
    } else {
      setStudentProfile(null);
      setNotifications([]);
    }
  }, [effectiveUserId, effectiveName, effectiveEmail, effectiveAvatar]);

  // Keep API client header updated with admin token
  useEffect(() => {
    setAuthAdminToken(adminToken);
  }, [adminToken]);

  const refreshStudentProfile = async () => {
    if (!effectiveUserId) return;
    try {
      const res = await api.syncStudent({
        clerkUserId: effectiveUserId,
        name: effectiveName,
        email: effectiveEmail,
        avatarUrl: effectiveAvatar,
      });
      if (res.user) setStudentProfile(res.user);
      const notifs = await api.getNotifications();
      setNotifications(notifs);
    } catch (err) {
      console.error('Failed to refresh profile:', err);
    }
  };

  const openGoogleSignIn = (pendingCourseId?: string) => {
    if (pendingCourseId) {
      setPendingCourseToAdd(pendingCourseId);
    }
    // Open in-app modal (zero accounts.dev iframe error, zero email/password confusion)
    setIsLoginModalOpen(true);
  };

  const closeLoginModal = () => {
    setIsLoginModalOpen(false);
  };

  const setDevStudentProfile = (profile: { id: string; name: string; email: string; avatar: string }) => {
    setDevStudent(profile);
  };

  const signOutStudent = async () => {
    if (isClerkKeyValid && clerkObj) {
      try {
        await clerkObj.signOut();
      } catch (err) {
        console.warn('Clerk signout warning:', err);
      }
    }
    setDevStudent(null);
    setStudentProfile(null);
    setAuthClerkUserId(null);
  };

  const loginAdmin = async (user: string, pass: string): Promise<boolean> => {
    try {
      const res = await api.adminLogin(user, pass);
      if (res.success && res.token) {
        setAdminToken(res.token);
        setAdminUsername(res.username);
        return true;
      }
      return false;
    } catch (err: any) {
      console.error('Admin login error:', err);
      throw err;
    }
  };

  const logoutAdmin = () => {
    setAdminToken(null);
    setAdminUsername(null);
    setAuthAdminToken(null);
    try {
      localStorage.removeItem('kainat_admin_token');
      localStorage.removeItem('kainat_admin_user');
    } catch {}
  };

  const unreadNotificationCount = notifications.filter((n) => !n.isRead).length;

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        clerkUserId: effectiveUserId,
        studentProfile,
        studentName: effectiveName,
        studentEmail: effectiveEmail,
        studentAvatar: effectiveAvatar,
        isClerkConfigured: isClerkKeyValid,
        notifications,
        unreadNotificationCount,
        openGoogleSignIn,
        closeLoginModal,
        isLoginModalOpen,
        signOutStudent,
        refreshStudentProfile,
        setDevStudentProfile,
        isAdminAuthenticated: Boolean(adminToken),
        adminUsername,
        loginAdmin,
        logoutAdmin,
        pendingCourseToAdd,
        setPendingCourseToAdd,
      }}
    >
      {children}
      <StudentLoginModal
        isOpen={isLoginModalOpen}
        onClose={closeLoginModal}
      />
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
