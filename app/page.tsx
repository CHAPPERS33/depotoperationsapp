'use client';

import React from 'react';
import { ClipboardList, BarChart3, FileText, Settings, Package } from 'lucide-react';
import { useSharedState } from '../hooks/useSharedState'; 
import { useAuth } from '../contexts/AuthContext'; // ADD THIS IMPORT
import { TODAY_DATE_STRING_GB } from '../constants';
import AppLink from '../components/shared/AppLink';
import ProtectedRoute from '../components/ProtectedRoute';
import LogoutButton from '../components/LogoutButton';
import LoginForm from '../components/LoginForm'; // ADD THIS IMPORT

export default function HomePage() {
  const { user, loading } = useAuth(); // ADD THIS LINE
  const { missingParcelsLog, rounds, team, couriers } = useSharedState();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // If user is not logged in, show login form
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <LoginForm />
      </div>
    );
  }

  // If user is logged in, show the dashboard (your existing content)
  const quickStats = [
    { title: "Today's Unrecovered", value: missingParcelsLog.filter(p => p.dateAdded === TODAY_DATE_STRING_GB && !p.is_recovered).length, color: "blue" },
    { title: "Couriers Processed Today", value: new Set(missingParcelsLog.filter(p => p.dateAdded === TODAY_DATE_STRING_GB).map(p => p.courier_id)).size, color: "green" },
    { title: "Active Rounds", value: rounds.length, color: "purple" },
    { title: "Total Team Members", value: team.length, color: "yellow" },
  ];

  const navCards = [
    { title: "Daily Operations", desc: "Log missing items, depot open, waves, scans", icon: ClipboardList, color: "blue", path: "/daily-ops" },
    { title: "Live Dashboard", desc: "Real-time metrics & performance", icon: BarChart3, color: "green", path: "/dashboard" },
    { title: "Reports", desc: "Generate performance reports", icon: FileText, color: "purple", path: "/reports" },
    { title: "Setup", desc: "Configure core data structures", icon: Settings, color: "orange", path: "/setup" },
  ];

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-100">
        {/* Header with logout */}
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <h1 className="text-2xl font-bold text-gray-900">
                DUC Operations
              </h1>
              <LogoutButton />
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold mb-2">DUC Operations Management</h2>
              <p className="text-gray-600 mb-6">Main Dashboard Overview</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {quickStats.map(stat => (
                  <div key={stat.title} className={`bg-${stat.color}-50 p-4 rounded-lg border border-${stat.color}-200`}>
                    <p className={`text-sm text-${stat.color}-700`}>{stat.title}</p>
                    <p className={`text-2xl font-bold text-${stat.color}-900`} suppressHydrationWarning>{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {navCards.map(item => (
                <AppLink 
                  href={item.path} 
                  key={item.path} 
                  className={`block bg-white rounded-lg shadow p-6 hover:shadow-lg transition-all duration-200 cursor-pointer border-2 border-transparent hover:border-${item.color}-500`}
                >
                  <item.icon className={`w-12 h-12 text-${item.color}-600 mb-4`} />
                  <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                  <p className="text-gray-600 text-sm h-16">{item.desc}</p>
                  <div className={`mt-4 text-${item.color}-600 text-sm font-medium`}>Go to {item.title} →</div>
                </AppLink>
              ))}
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Recent Missing Parcel Activity (Last 5 from Log)</h3>
              {missingParcelsLog.filter(e => e.barcode).slice(-5).reverse().length > 0 ? (
                <div className="space-y-3">
                  {missingParcelsLog.filter(e => e.barcode).slice(-5).reverse().map((e, idx) => {
                    const courierInfo = couriers.find(c => c.id === e.courier_id);
                    const courierName = courierInfo?.name || e.courier_id || 'N/A';
                    const uniqueKey = `${e.barcode}-${e.round_id}-${e.courier_id}-${e.dateAdded}-${idx}`;
                    return (
                      <div key={uniqueKey} className="flex items-center justify-between py-2 border-b last:border-b-0">
                        <div className="flex items-center space-x-3">
                          <Package className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium" suppressHydrationWarning>{e.barcode}</p>
                            <p className="text-xs text-gray-500" suppressHydrationWarning>{courierName} – Round {e.round_id} (Added: {e.dateAdded})</p>
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${e.is_recovered ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`} suppressHydrationWarning>
                          {e.is_recovered ? 'Recovered' : 'Missing'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No missing parcel entries in the log yet.</p>
              )}
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}