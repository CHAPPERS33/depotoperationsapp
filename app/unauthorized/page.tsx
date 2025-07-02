'use client';

import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { AlertTriangle } from 'lucide-react';

export default function UnauthorizedPage() {
  const { profile } = useAuth();

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Access Denied
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            You don't have permission to access this page.
          </p>
          {profile && (
            <p className="mt-2 text-sm text-gray-500">
              Your current role: <span className="font-medium capitalize">{profile.role}</span>
            </p>
          )}
          <div className="mt-6">
            <a
              href="/dashboard"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Back to Dashboard
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}