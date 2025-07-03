'use client';

import React from 'react';
import SearchHub from '../../components/search/SearchHub';
import ProtectedRoute from '../../components/ProtectedRoute';


// Define user roles for access control
type UserRole = 'manager' | 'sorter' | 'cdm' | 'guest' | 'duc'; 

export default function SearchHubPage() {
  const allowedRoles: UserRole[] = ['manager', 'sorter', 'cdm', 'duc']; // All except guests

  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <SearchHub />
    </ProtectedRoute>
  );
}