'use client';

import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

type UserRole = 'manager' | 'sorter' | 'cdm' | 'guest' | 'duc'; // ADD 'duc'

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  fallbackPath?: string;
}

export default function ProtectedRoute({ 
  children, 
  allowedRoles = [], 
  fallbackPath = '/' 
}: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/');
        return;
      }

      if (allowedRoles.length > 0 && profile && !allowedRoles.includes(profile.role)) {
        router.push('/unauthorized');
        return;
      }
    }
  }, [user, profile, loading, allowedRoles, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (allowedRoles.length > 0 && profile && !allowedRoles.includes(profile.role)) {
    return null;
  }

  return <>{children}</>;
}