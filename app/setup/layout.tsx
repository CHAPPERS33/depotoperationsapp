
'use client';

import React, { ReactNode } from 'react';
import AppLink from '../../components/shared/AppLink'; 
import { usePathname, useSearchParams } from 'next/navigation'; // Import Next.js routing hooks
import { ChevronLeft } from 'lucide-react';

export default function SetupLayout({ children }: { children: ReactNode }) {
  const currentPathname = usePathname();
  const searchParams = useSearchParams();
const viewParam = searchParams ? searchParams.get('view') : null;

  // Show back link if not on /setup or /setup?view=menu
  const showBackLink = !(currentPathname === '/setup' && (viewParam === null || viewParam === 'menu'));

  return (
    <div>
      {showBackLink && (
        <AppLink 
          href="/setup?view=menu" // Always go back to the menu view
          className="mb-6 inline-flex items-center text-blue-600 hover:text-blue-800 px-4 py-2 bg-blue-50 hover:bg-blue-100 rounded-md text-sm font-medium transition-colors"
        >
          <ChevronLeft className="w-5 h-5 mr-1"/>Back to Setup Menu
        </AppLink>
      )}
      {children}
    </div>
  );
}
