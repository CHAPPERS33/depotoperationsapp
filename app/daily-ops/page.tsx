'use client';

import React from 'react';
import { Package, Clock, Truck, ClipboardList, TrendingUp, CalendarClock, ReceiptText, Share2, LucideIcon, CalendarCheck2, Archive } from 'lucide-react';
import AppLink from '../../components/shared/AppLink';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useAuth } from '../../contexts/AuthContext';

// Define user roles for access control
type UserRole = 'manager' | 'sorter' | 'cdm' | 'guest' | 'duc'; 

interface DailyOpsMenuItem {
  view: string; 
  title: string;
  desc: string;
  icon: LucideIcon;
  color: string;
}

const menuItems: DailyOpsMenuItem[] = [
  { view: 'missing-parcels', title: 'Missing Parcels & Approvals', desc: 'Log missing items, courier checks', icon: Package, color: 'blue' },
  { view: 'cage-audit', title: 'Cage Audit', desc: 'Perform and log cage audits for accuracy.', icon: Archive, color: 'orange' },
  { view: 'depot-open', title: 'Depot Open Time', desc: 'Record when the depot opened', icon: Clock, color: 'indigo' },
  { view: 'waves', title: 'Record Waves', desc: 'Log freight arrivals', icon: Truck, color: 'teal' },
  { view: 'scan-logs', title: 'Log HHT Scans', desc: 'Record daily HHT scan totals', icon: ClipboardList, color: 'emerald' },
  { view: 'forecasts', title: 'Manage Forecasts', desc: 'View, add, or edit daily forecasts', icon: TrendingUp, color: 'lime' },
  { view: 'work-schedules', title: 'Work Schedules', desc: 'Manage daily staff schedules', icon: CalendarClock, color: 'cyan' },
  { view: 'availability', title: 'Manage Availability', desc: 'Set team member work availability', icon: CalendarCheck2, color: 'rose'},
  { view: 'invoices', title: 'Manage Invoices', desc: 'Generate and track invoices', icon: ReceiptText, color: 'purple' },
  // Share buttons can directly link to the respective pages for now
  { view: 'forecasts', title: "Share Forecast (View All)", desc: 'Go to Forecasts to share', icon: Share2, color: 'green' },
  { view: 'work-schedules', title: "Share Schedule (View All)", desc: 'Go to Schedules to share', icon: Share2, color: 'cyan'},
];

export default function DailyOpsMenuPage() {
  const allowedRoles: UserRole[] = ['manager', 'sorter', 'cdm', 'duc']; // All except guests

  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-6">Daily Operations Menu</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {menuItems.map(item => (
              <AppLink
                href={`/daily-ops/${item.view}`}
                key={item.view + item.title} 
                className={`block p-6 border-2 border-gray-200 rounded-lg hover:border-${item.color}-500 hover:bg-${item.color}-50 text-left transition-all`}
              >
                <item.icon className={`w-8 h-8 text-${item.color}-600 mb-2`} />
                <h3 className="font-semibold text-lg mb-1">{item.title}</h3>
                <p className="text-sm text-gray-600 h-10">{item.desc}</p>
              </AppLink>
            ))}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}