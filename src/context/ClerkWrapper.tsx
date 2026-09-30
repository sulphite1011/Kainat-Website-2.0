import React from 'react';
import { ClerkProvider } from '@clerk/clerk-react';
import { AuthProviderInner, CLERK_KEY, isClerkKeyValid } from './AuthContext';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (isClerkKeyValid && CLERK_KEY) {
    return (
      <ClerkProvider publishableKey={CLERK_KEY}>
        <AuthProviderInner>{children}</AuthProviderInner>
      </ClerkProvider>
    );
  }

  // Fallback when Clerk key is not yet configured in environment
  return <AuthProviderInner>{children}</AuthProviderInner>;
};
