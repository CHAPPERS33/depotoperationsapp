'use client';

import React, { useState, useEffect, Suspense, ReactNode, useRef } from 'react';
import { Package, Search as SearchIcon, Settings, Home as HomeIcon, ClipboardList, BarChart3, PieChart, Menu, X } from 'lucide-react';
import { NavItemType, SearchResultItem, SearchMode } from '../types';
import { searchCouriersLocal, searchRoundsLocal, searchDropsLocal } from '../utils/searchUtils';
import { SharedStateProvider, useSharedState } from '../hooks/useSharedState';
import { AuthProvider } from '../contexts/AuthContext'; // ADD THIS IMPORT
import { usePathname, useRouter } from 'next/navigation';
import AppLink from '../components/shared/AppLink';
import '../globals.css';

// Page components are no longer directly imported or rendered here.
// Next.js App Router handles page rendering based on file structure.

const navItemsConfig: NavItemType[] = [
  { path: '/', name: 'Home', icon: HomeIcon, color: 'blue' }, // Updated path for home
  { path: '/dashboard', name: 'Dashboard', icon: BarChart3, color: 'green' },
  { path: '/daily-ops', name: 'Daily Ops', icon: ClipboardList, color: 'indigo' },
  { path: '/reports', name: 'Reports', icon: PieChart, color: 'purple' },
  { path: '/search', name: 'Search Hub', icon: SearchIcon, color: 'yellow' },
  { path: '/setup', name: 'Setup', icon: Settings, color: 'orange' },
];

function NavLink({ item }: { item: NavItemType }) {
  const currentPathname = usePathname(); // Use Next.js pathname
  
  // Active state logic needs to be based on Next.js pathname
  const isActive = item.subView 
    ? currentPathname === item.path // Query params are not part of pathname, handle subView differently if needed
    : currentPathname === item.path || (item.path !== '/' && currentPathname.startsWith(item.path + '/'));
  
  const activeClasses = `bg-${item.color}-100 text-${item.color}-600 border-r-4 border-${item.color}-500`;
  const inactiveClasses = 'text-gray-600 hover:bg-gray-100 hover:text-gray-900';
  // AppLink will now handle the href correctly for Next.js Link
  const linkHref = item.subView ? `${item.path}?view=${item.subView}` : item.path;

  return (
    <AppLink 
      href={linkHref}
      className={`group flex items-center px-3 py-3 text-sm font-medium rounded-md transition-colors duration-150 ${isActive ? activeClasses : inactiveClasses}`}
    >
      <item.icon className={`mr-3 flex-shrink-0 h-5 w-5 ${isActive ? `text-${item.color}-600` : 'text-gray-400 group-hover:text-gray-500'}`} aria-hidden="true" />
      {item.name}
    </AppLink>
  );
}

// This component contains the main layout structure.
function AppStructure({ children }: { children: ReactNode }) {
  const { 
    couriers, rounds, subDepots, 
    headerSearchInputRef, setActiveTab 
  } = useSharedState();
  
  const currentPathname = usePathname(); // From Next.js
  const router = useRouter(); // From Next.js for navigation

  const [searchQueryLocal, setSearchQueryLocal] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentPathname) {
      setActiveTab(currentPathname);
    }
  }, [currentPathname, setActiveTab]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const queryText = e.target.value;
    setSearchQueryLocal(queryText);
    if (queryText.length > 1) {
      const courierResults = searchCouriersLocal(queryText, couriers).map(c => ({ type: 'courier' as SearchMode, data: c } as SearchResultItem));
      const roundDataWithNames = rounds.map(r => ({...r, subDepotName: subDepots.find(sd => sd.id === r.sub_depot_id)?.name || `Sub ${r.sub_depot_id}`}));
      const roundResults = searchRoundsLocal(queryText, roundDataWithNames).map(r => ({ type: 'round' as SearchMode, data: r } as SearchResultItem));
      const dropResult = searchDropsLocal(queryText, roundDataWithNames);
      const dropResults = dropResult ? [{ type: 'drop' as SearchMode, data: dropResult } as SearchResultItem] : [];
      
      setSearchResults([...courierResults, ...roundResults, ...dropResults].slice(0, 10));
      setIsSearchFocused(true);
    } else {
      setSearchResults([]);
    }
  };

  const handleSearchResultClick = (item: SearchResultItem) => {
    setSearchQueryLocal('');
    setSearchResults([]);
    setIsSearchFocused(false);
    setIsSidebarOpen(false); 
    if (item.type === 'courier') router.push(`/search/courier/${item.data.id}`);
    else if (item.type === 'round') router.push(`/search/round/${item.data.id}`);
    else if (item.type === 'drop') router.push(`/search/drop/${item.data.dropNumber}`);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-white shadow-sm fixed top-0 left-0 right-0 z-40">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="lg:hidden mr-2 text-gray-500 hover:text-gray-700 focus:outline-none"
                aria-label="Toggle sidebar"
                aria-expanded={isSidebarOpen}
              >
                {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
              <AppLink href="/" className="flex-shrink-0 flex items-center"> {/* Updated href for home */}
                <Package className="h-8 w-auto text-blue-600" />
                <span className="ml-2 text-xl font-semibold text-gray-800">DUC Ops</span>
              </AppLink>
            </div>
            <div ref={searchContainerRef} className="relative w-full max-w-md mx-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <SearchIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <input
                  ref={headerSearchInputRef}
                  type="search"
                  name="search"
                  id="search"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Search Courier, Round, Drop..."
                  value={searchQueryLocal}
                  onChange={handleSearchChange}
                  onFocus={() => searchQueryLocal.length > 1 && setIsSearchFocused(true)}
                />
              </div>
              {isSearchFocused && searchResults.length > 0 && (
                <div className="absolute mt-1 w-full rounded-md bg-white shadow-lg z-50 max-h-80 overflow-y-auto border border-gray-200">
                  <ul className="divide-y divide-gray-100">
                    {searchResults.map((item, index) => (
                      <li key={index} onClick={() => handleSearchResultClick(item)} className="px-4 py-3 hover:bg-gray-100 cursor-pointer text-sm">
                        <strong>{item.type.toUpperCase()}:</strong>{' '}
                        {item.type === 'courier' && item.data.name}
                        {item.type === 'round' && `R${item.data.id} (${(item.data as any).subDepotName || 'N/A'})`}
                        {item.type === 'drop' && `Drop ${item.data.dropNumber} (${item.data.roundCount} rounds)`}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="flex items-center">
              {/* Placeholder for user profile/actions */}
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm text-gray-500">U</div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 pt-16">
         <nav className={`fixed inset-y-0 left-0 z-30 flex flex-col bg-white shadow-lg transition-transform duration-300 ease-in-out transform ${isSidebarOpen ? 'translate-x-0 pt-16' : '-translate-x-full pt-16'} lg:translate-x-0 lg:static lg:flex-shrink-0 w-60 border-r border-gray-200 lg:pt-0`}>
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {navItemsConfig.map((item) => (
              <NavLink key={item.name} item={item} />
            ))}
          </div>
        </nav>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8"> 
           <Suspense fallback={<div>Loading page...</div>}>
            {children} {/* Next.js will render the current page here */}
          </Suspense>
        </main>
      </div>
       {isSidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black bg-opacity-25 lg:hidden mt-16" // Ensure this respects header height if sidebar slides under
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider> {/* ADD THIS WRAPPER */}
          <SharedStateProvider>
            <AppStructure>{children}</AppStructure>
          </SharedStateProvider>
        </AuthProvider> {/* ADD THIS CLOSING TAG */}
      </body>
    </html>
  );
}