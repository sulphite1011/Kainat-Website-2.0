import React, { createContext, useContext, useState, useEffect } from 'react';
import { useUser, useClerk } from '@clerk/clerk-react';
import { api, setAuthClerkUserId, setAuthAdminToken } from '../services/api';
import { UserProfile, NotificationItem } from '../types';

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
  signOutStudent: () => Promise<void>;
  refreshStudentProfile: () => Promise<void>;

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

// Check if Clerk key is real
export const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
export const isClerkKeyValid = Boolean(
  CLERK_KEY && CLERK_KEY.startsWith('pk_') && CLERK_KEY !== 'pk_test_placeholder'
);

export const AuthProviderInner: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Clerk hooks (safe if within ClerkProvider)
  let clerkUser: any = null;
  let clerkObj: any = null;
  try {
    clerkUser = useUser().user;
    clerkObj = useClerk();
  } catch (err) {
    // If not within ClerkProvider or Clerk key is placeholder
  }

  // Fallback dev state if Clerk key is placeholder
  const [devStudent, setDevStudent] = useState<{
    id: string;
    name: string;
    email: string;
    avatar: string;
  } | null>(null);

  const [studentProfile, setStudentProfile] = useState<UserProfile | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [pendingCourseToAdd, setPendingCourseToAdd] = useState<string | null>(null);

  // Admin state
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [adminUsername, setAdminUsername] = useState<string | null>(null);

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

    if (isClerkKeyValid && clerkObj) {
      clerkObj.openSignIn({
        appearance: {
          elements: {
            socialButtonsBlockButton: 'clerk-social-btn',
          },
        },
      });
    } else {
      // Dev mode: simulate authenticating via Google account
      const demoId = 'user_clerk_demo_student';
      setDevStudent({
        id: demoId,
        name: 'Hamad Khan',
        email: 'hamadkhan11h22@gmail.com',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      });
    }
  };

  const signOutStudent = async () => {
    if (isClerkKeyValid && clerkObj) {
      await clerkObj.signOut();
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
    } catch {
      return false;
    }
  };

  const logoutAdmin = () => {
    setAdminToken(null);
    setAdminUsername(null);
    setAuthAdminToken(null);
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
        signOutStudent,
        refreshStudentProfile,
        isAdminAuthenticated: Boolean(adminToken),
        adminUsername,
        loginAdmin,
        logoutAdmin,
        pendingCourseToAdd,
        setPendingCourseToAdd,
      }}
    >
      {children}
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
