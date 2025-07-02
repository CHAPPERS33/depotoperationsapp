
'use client';

import React, { ReactNode } from 'react';
import AppLink from '../../components/shared/AppLink'; 
import { usePathname } from 'next/navigation'; // Import usePathname
import { ChevronLeft } from 'lucide-react';

export default function SearchLayout({ children }: { children: ReactNode }) {
  const currentPathname = usePathname(); // Use Next.js pathname
  const showBackLink = currentPathname !== '/search';

  return (
    <div>
      {showBackLink && (
        <AppLink 
          href="/search" 
          className="mb-6 inline-flex items-center text-blue-600 hover:text-blue-800 px-4 py-2 bg-blue-50 hover:bg-blue-100 rounded-md text-sm font-medium transition-colors"
        >
          <ChevronLeft className="w-5 h-5 mr-1"/>
          Back to Search Hub
        </AppLink>
      )}
      {children}
    </div>
  );
}
