'use client';

import React from 'react';
import { FileText, LucideIcon, ArchiveX, ShieldAlert, MailWarning, CalendarRange, UserX, CornerUpLeft, ListChecks, PackageX, Shuffle } from 'lucide-react';
import AppLink from '../../components/shared/AppLink';
import ProtectedRoute from '../../components/ProtectedRoute';


// Define user roles for access control
type UserRole = 'manager' | 'sorter' | 'cdm' | 'guest' | 'duc';

interface ReportMenuItem {
  path: string;
  title: string;
  desc: string;
  icon: LucideIcon;
  color: string;
}

const reportMenuItems: ReportMenuItem[] = [
  {
    path: 'duc-final-report',
    title: 'DUC Final Report',
    desc: 'Compile and submit the daily DUC final operational report.',
    icon: FileText,
    color: 'purple',
  },
  {
    path: 'cage-return',
    title: 'Cage Return Report',
    desc: 'Log rounds/couriers that did not return their cages.',
    icon: ArchiveX,
    color: 'orange',
  },
  {
    path: 'lost-prevention',
    title: 'Lost Prevention Report',
    desc: 'Log security incidents, CCTV reviews, and van search details.',
    icon: ShieldAlert,
    color: 'pink',
  },
  {
    path: 'daily-missort-summary',
    title: 'Daily Missort Summary',
    desc: 'Generate and view daily summaries of missorted parcels.',
    icon: MailWarning,
    color: 'teal',
  },
  {
    path: 'weekly-missing-summary',
    title: 'Weekly Missing Parcels',
    desc: 'Summary of missing parcels for a selected week.',
    icon: CalendarRange,
    color: 'indigo',
  },
  {
    path: 'worst-courier-performance',
    title: 'Worst Courier Performance',
    desc: 'Identify couriers with highest issues (missing, carry forwards).',
    icon: UserX,
    color: 'red',
  },
  {
    path: 'worst-round-performance',
    title: 'Worst Round Performance',
    desc: 'Identify rounds with most missing parcels.',
    icon: CornerUpLeft,
    color: 'rose',
  },
  {
    path: 'client-missing-league',
    title: 'Client Missing League Table',
    desc: 'Rank clients by number of missing parcels.',
    icon: ListChecks,
    color: 'cyan',
  },
  {
    path: 'top-misrouted-destinations',
    title: 'Top Misrouted Destinations',
    desc: 'Identify common incorrect delivery units for misrouted parcels.',
    icon: Shuffle,
    color: 'lime',
  },
  {
    path: 'worst-courier-carry-forward',
    title: 'Worst Courier for Carry Forwards',
    desc: 'Identify couriers with most carry forwards.',
    icon: PackageX,
    color: 'amber',
  }
];

export default function ReportsMenuPage() {
  const allowedRoles: UserRole[] = ['manager', 'cdm', 'duc']; // Managers, CDM, and DUC can access reports

  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-6">Reports Hub</h2>
          {reportMenuItems.length === 0 ? (
            <p className="text-gray-500">No reports are currently configured.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reportMenuItems.map(item => (
                <AppLink
                  href={`/reports/${item.path}`}
                  key={item.path}
                  className={`block p-6 border-2 border-gray-200 rounded-lg hover:shadow-md hover:border-${item.color}-500 hover:bg-${item.color}-50 text-left transition-all focus:outline-none focus:ring-2 focus:ring-${item.color}-500 focus:ring-opacity-50`}
                  aria-label={`Navigate to ${item.title}`}
                >
                  <item.icon className={`w-8 h-8 text-${item.color}-600 mb-3`} />
                  <h3 className="font-semibold text-lg text-gray-800 mb-1">{item.title}</h3>
                  <p className="text-sm text-gray-600 h-12 overflow-hidden">{item.desc}</p>
                </AppLink>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}