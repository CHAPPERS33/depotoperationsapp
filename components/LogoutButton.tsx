'use client';

import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut } from 'lucide-react';

export default function LogoutButton() {
  const { signOut, profile } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getRoleBadgeColor = (role: string) => {
  switch (role) {
    case 'manager': return 'bg-purple-100 text-purple-800';
    case 'sorter': return 'bg-blue-100 text-blue-800';
    case 'cdm': return 'bg-green-100 text-green-800';
    case 'duc': return 'bg-red-100 text-red-800'; // ADD THIS LINE
    case 'guest': return 'bg-gray-100 text-gray-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

  return (
    <div className="flex items-center gap-4">
      {profile && (
        <div className="text-sm text-gray-600">
          <span className="font-medium">{profile.full_name}</span>
          <span className={`ml-2 px-2 py-1 rounded-full text-xs uppercase font-medium ${getRoleBadgeColor(profile.role)}`}>
            {profile.role}
          </span>
        </div>
      )}
      <button
        onClick={handleLogout}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        <LogOut size={16} />
        Logout
      </button>
    </div>
  );
}