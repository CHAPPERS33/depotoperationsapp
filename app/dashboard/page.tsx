'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Package, AlertTriangle, BarChart3, TrendingUp, CheckCircle2, ScanLine, Target, FileText, RefreshCw, Users, ListFilter, FileQuestion, Truck } from 'lucide-react';
import { useSharedState } from '../../hooks/useSharedState';
import { useAuth } from '../../contexts/AuthContext'; // ADD THIS IMPORT
import { getReportStatusForDate, getCourierStats } from '../../utils/reportUtils';
import TodaysTimeslotsSection from '../../components/dashboard/TodaysTimeslotsSection';
import DashboardMetricCard from '../../components/dashboard/DashboardMetricCard';
import { TODAY_DATE_STRING } from '../../constants';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '../../components/ProtectedRoute';
import LogoutButton from '../../components/LogoutButton';

type UserRole = 'manager' | 'sorter' | 'cdm' | 'guest' | 'duc'; // ADD 'duc'

const availableMetrics: Array<{ id: string; title: string; defaultChecked?: boolean }> = [
  { id: 'missing_parcels', title: 'Missing Parcels', defaultChecked: true },
  { id: 'recovery_rate', title: 'Recovery Rate', defaultChecked: true },
  { id: 'kpi_performance', title: 'KPI vs Target', defaultChecked: true },
  { id: 'total_scanned', title: 'Total Scanned', defaultChecked: true },
  { id: 'missort_analysis', title: 'Missort Rate', defaultChecked: true },
  { id: 'forecast_accuracy', title: 'Forecast vs Actual', defaultChecked: true },
  { id: 'overall_no_scans', title: 'Total No Scans', defaultChecked: true },
  { id: 'overall_carry_forwards', title: 'Total Carry Forwards', defaultChecked: true },
];

export default function DashboardPage() {
  const router = useRouter();
  const { hasRole, isManager, isSorter, isCDM, isGuest, isDUC, profile } = useAuth();
  const {
    missingParcelsLog,
    scanActivityData,
    forecastActivityData,
    ducFinalReports,
    depotOpenRecords,
    fetchMissingParcelsLog,
    fetchScanData,
    fetchForecastActivityData,
    timeslotAssignments,
    subDepots,
    rounds,
    timeslotTemplates,
    couriers
  } = useSharedState();

  const [selectedDashboardDate, setSelectedDashboardDate] = useState<string>(TODAY_DATE_STRING);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(
    availableMetrics.filter(m => m.defaultChecked).map(m => m.id)
  );
  const [showMetricSelector, setShowMetricSelector] = useState(false);
 
  useEffect(() => {
    // Initialize data on component mount if needed
    handleRefreshData();
  }, []);
  
  const handleRefreshData = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchMissingParcelsLog(),
      fetchScanData(),
      fetchForecastActivityData(),
    ]);
    setRefreshing(false);
  };

  const selectedDateGB = useMemo(() => new Date(selectedDashboardDate + "T00:00:00Z").toLocaleDateString('en-GB'), [selectedDashboardDate]);
  const previousDashboardDate = useMemo(() => new Date(new Date(selectedDashboardDate).getTime() - 86400000).toISOString().slice(0, 10), [selectedDashboardDate]);
  const previousDashboardDateGB = useMemo(() => new Date(previousDashboardDate + "T00:00:00Z").toLocaleDateString('en-GB'), [previousDashboardDate]);

  const reportForSelectedDate = useMemo(() => getReportStatusForDate(ducFinalReports, selectedDashboardDate), [ducFinalReports, selectedDashboardDate]);

  const quickSummaryData = useMemo(() => {
    const parcelsLogForSelectedDate = missingParcelsLog.filter(p => p.dateAdded === selectedDateGB);
    const totalMissingSelectedDate = parcelsLogForSelectedDate.length;
    const scanDataForSelectedDate = scanActivityData.filter(s => s.date === selectedDateGB);
    const totalScannedSelectedDate = scanDataForSelectedDate.reduce((sum, scan) => sum + scan.totalScanned, 0);
    const totalMissortsSelectedDate = scanDataForSelectedDate.reduce((sum, scan) => sum + scan.missorts, 0);
    return { totalMissingSelectedDate, totalScannedSelectedDate, totalMissortsSelectedDate };
  }, [missingParcelsLog, scanActivityData, selectedDateGB]);

  const dashboardMetricsData = useMemo<DashboardMetric[]>(() => {
    const parcelsForSelectedDate = missingParcelsLog.filter(p => p.dateAdded === selectedDateGB);
    const unrecovered = parcelsForSelectedDate.filter(p => !p.is_recovered).length;
    const totalMissing = parcelsForSelectedDate.length;
    const recovered = totalMissing - unrecovered;
    const recoveryRate = totalMissing > 0 ? Math.round((recovered / totalMissing) * 100) : 0;

    const scanDataForSelectedDate = scanActivityData.filter(s => s.date === selectedDateGB);
    const totalScanned = scanDataForSelectedDate.reduce((sum, scan) => sum + scan.totalScanned, 0);

    const kpiTargetPercent = 0.02;
    const actualKpi = totalScanned > 0 ? (totalMissing / totalScanned) * 100 : 0;

    const totalMissorts = scanDataForSelectedDate.reduce((sum, scan) => sum + scan.missorts, 0);
    const missortRate = totalScanned > 0 ? (totalMissorts / totalScanned) * 100 : 0;

    const forecastDataForSelectedDate = forecastActivityData.filter(f => f.date === selectedDateGB);
    const totalForecast = forecastDataForSelectedDate.reduce((sum, f) => sum + f.forecast, 0);
    const forecastAccuracy = totalForecast > 0 ? Math.round((totalScanned / totalForecast) * 100) : (totalScanned > 0 ? 0 : 100);

    const totalNoScans = parcelsForSelectedDate.reduce((sum, p) => sum + (Number(p.noScans) || 0), 0);
    const totalCarryForwards = parcelsForSelectedDate.reduce((sum, p) => sum + (Number(p.carryForwards) || 0), 0);

    const parcelsForPreviousDate = missingParcelsLog.filter(p => p.dateAdded === previousDashboardDateGB);
    const missingPreviousDay = parcelsForPreviousDate.length;
    const noScansPreviousDay = parcelsForPreviousDate.reduce((sum, p) => sum + (Number(p.noScans) || 0), 0);
    const carryForwardsPreviousDay = parcelsForPreviousDate.reduce((sum, p) => sum + (Number(p.carryForwards) || 0), 0);

    const missingChange = totalMissing - missingPreviousDay;
    const noScansChange = totalNoScans - noScansPreviousDay;
    const carryForwardsChange = totalCarryForwards - carryForwardsPreviousDay;

    const generateRandomTrend = (base: number, variation: number, length = 7) => {
        const trend = Array.from({ length }, () => parseFloat((base + (Math.random() - 0.5) * variation).toFixed(2)));
        if (trend.every(val => val === trend[0])) {
            return trend.map((val, i) => i % 2 === 0 ? val + (variation || 1) * 0.05 : val - (variation || 1) * 0.05);
        }
        return trend;
    };
    return [
      { id: 'missing_parcels', title: 'Missing Parcels', value: totalMissing, change: missingChange, changeType: missingChange >= 0 ? 'increase' : 'decrease', icon: Package, color: 'blue', trend: generateRandomTrend(totalMissing, 5), target: Math.round(totalScanned * (kpiTargetPercent / 100)), unit: 'parcels', visualType: 'line-sparkline' },
      { id: 'recovery_rate', title: 'Recovery Rate', value: recoveryRate, icon: TrendingUp, color: 'green', trend: generateRandomTrend(recoveryRate, 10), target: 90, unit: '%', visualType: 'gauge' },
      { id: 'kpi_performance', title: `KPI vs Target (${kpiTargetPercent}%)`, value: parseFloat(actualKpi.toFixed(4)), icon: Target, color: actualKpi <= kpiTargetPercent ? 'green' : 'red', trend: generateRandomTrend(actualKpi, 0.01), target: kpiTargetPercent, unit: '%', visualType: 'gauge' },
      { id: 'total_scanned', title: 'Total Scanned', value: totalScanned.toLocaleString(), icon: ScanLine, color: 'purple', trend: generateRandomTrend(totalScanned, Math.max(10, totalScanned*0.1)), unit: 'parcels', visualType: 'line-sparkline' },
      { id: 'missort_analysis', title: 'Missort Rate', value: parseFloat(missortRate.toFixed(3)), icon: AlertTriangle, color: 'orange', trend: generateRandomTrend(missortRate, 0.2), target: 0.30, unit: '%', visualType: 'gauge' },
      { id: 'forecast_accuracy', title: 'Forecast vs Actual', value: forecastAccuracy, icon: BarChart3, color: 'teal', trend: generateRandomTrend(forecastAccuracy, 5), target: 100, unit: '%', visualType: 'gauge' },
      { id: 'overall_no_scans', title: 'Total No Scans', value: totalNoScans, change: noScansChange, changeType: noScansChange >= 0 ? 'increase' : 'decrease', icon: FileQuestion, color: 'slate', trend: generateRandomTrend(totalNoScans, Math.max(1, totalNoScans*0.1)), unit: 'parcels', visualType: 'line-sparkline' },
      { id: 'overall_carry_forwards', title: 'Total Carried Forward', value: totalCarryForwards, change: carryForwardsChange, changeType: carryForwardsChange >= 0 ? 'increase' : 'decrease', icon: Truck, color: 'sky', trend: generateRandomTrend(totalCarryForwards, Math.max(1, totalCarryForwards*0.1)), unit: 'parcels', visualType: 'line-sparkline' },
    ];
  }, [missingParcelsLog, scanActivityData, forecastActivityData, selectedDateGB, previousDashboardDateGB]);

  const openRecordsForSelectedDate = useMemo(() => depotOpenRecords.filter(r => r.date === selectedDashboardDate), [depotOpenRecords, selectedDashboardDate]);
  const globalOpenForSelectedDate = useMemo(() => openRecordsForSelectedDate.find(r => r.sub_depot_id === null), [openRecordsForSelectedDate]);
  const overridesForSelectedDate = useMemo(() => openRecordsForSelectedDate.filter(r => r.sub_depot_id !== null), [openRecordsForSelectedDate]);

  const handleMetricSelectionChange = (metricId: string) => { setSelectedMetrics(prev => prev.includes(metricId) ? prev.filter(id => id !== metricId) : [...prev, metricId]); };

  const courierPerformanceData = useMemo(() => {
    return getCourierStats(couriers, missingParcelsLog, selectedDashboardDate);
  }, [couriers, missingParcelsLog, selectedDashboardDate]);

  const sorterPerformanceData = useMemo(() => {
    return scanActivityData.filter(s => s.date === selectedDateGB).map(scan => {
        const missortRate = scan.totalScanned > 0 ? (scan.missorts / scan.totalScanned) * 100 : 0;
        let performanceBadgeText = '🥉 Average'; let performanceBadgeColor = 'yellow';
        if (missortRate < 0.1) { performanceBadgeText = '🥇 Excellent'; performanceBadgeColor = 'green'; }
        else if (missortRate < 0.3) { performanceBadgeText = '🥈 Good'; performanceBadgeColor = 'blue'; }
        else if (missortRate < 0.5) { /* Default Average */ }
        else { performanceBadgeText = '⚠️ Needs Improvement'; performanceBadgeColor = 'red'; }
        return { ...scan, missortRate, performanceBadgeText, performanceBadgeColor };
      }).sort((a, b) => a.missortRate - b.missortRate);
  }, [scanActivityData, selectedDateGB]);

  // ADD ROLE-BASED CONTENT SECTIONS
  const roleBasedAlert = (
    <>
      {/* Manager-only content */}
      {isManager() && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-purple-800 mb-2">🏢 Manager Dashboard</h3>
          <p className="text-purple-700">Full access to all system features, reports, and team management tools.</p>
        </div>
      )}

      {/* CDM-only content */}
      {isCDM() && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-green-800 mb-2">📊 CDM Dashboard</h3>
          <p className="text-green-700">Depot management oversight, reporting capabilities, and operational analytics.</p>
        </div>
      )}

      {/* Sorter-only content */}
      {isSorter() && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">📦 Sorter Dashboard</h3>
          <p className="text-blue-700">Daily operations focus: parcel tracking, scan activities, and performance metrics.</p>
        </div>
      )}

{/* DUC-only content */}
{isDUC() && (
  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
    <h3 className="text-lg font-semibold text-red-800 mb-2">📋 DUC Dashboard</h3>
    <p className="text-red-700">Delivery Unit Controller access: operations oversight, reporting, and performance monitoring.</p>
  </div>
)}

      {/* Guest limitations */}
      {isGuest() && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">👁️ Guest View</h3>
          <p className="text-gray-700">Read-only access to basic dashboard metrics and overview data.</p>
        </div>
      )}
    </>
  );

  const dashboardContent = (
    <>
      {/* ADD ROLE-BASED ALERT HERE */}
      {roleBasedAlert}

      {/* MODIFY REPORT SUBMISSION - ONLY MANAGERS AND CDMs CAN SUBMIT */}
      {!reportForSelectedDate && selectedDashboardDate === TODAY_DATE_STRING && hasRole(['manager', 'cdm', 'duc']) && (
        <div className="w-full mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center">
            <AlertTriangle className="w-6 h-6 text-red-600 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-red-800">⚠️ DUC Final Report Not Submitted for Today</h3>
              <p className="text-red-700" suppressHydrationWarning>Today's final report ({selectedDateGB}) needs to be completed.</p>
            </div>
          </div>
          <button onClick={() => router.push('/reports/duc-final-report')} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 font-medium">
            Submit Report
          </button>
        </div>
      )}

      {/* SHOW REPORT STATUS TO ALL USERS */}
      {reportForSelectedDate && (
        <div className="w-full mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
          <CheckCircle2 className="w-6 h-6 text-green-600 mr-3" />
          <div>
            <h3 className="text-lg font-semibold text-green-800" suppressHydrationWarning>✅ Final Report for {selectedDateGB} Submitted</h3>
            <p className="text-green-700" suppressHydrationWarning>
              Submitted at {new Date(reportForSelectedDate.submitted_at).toLocaleTimeString('en-GB')} by {reportForSelectedDate.submitted_by_name}
            </p>
            <div className="mt-2 text-sm text-green-600" suppressHydrationWarning>
              Failed Rounds: {reportForSelectedDate.failed_rounds.length} | Returns: {reportForSelectedDate.total_returns} | Segregated: {reportForSelectedDate.segregated_parcels.length} items | Missing: {reportForSelectedDate.missing_parcels_summary.total_missing} ({reportForSelectedDate.missing_parcels_summary.unrecovered} unrecovered)
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h3 className="text-md font-semibold text-gray-700 mb-2" suppressHydrationWarning>Depot Opening Times ({selectedDateGB})</h3>
        {openRecordsForSelectedDate.length > 0 ? (
          <ul className="space-y-1 text-sm text-gray-800">
            {globalOpenForSelectedDate && (<li suppressHydrationWarning><strong>All Depots:</strong> {globalOpenForSelectedDate.time}</li>)}
            {overridesForSelectedDate.map(r => {
              const depotName = subDepots.find(sd => sd.id === r.sub_depot_id)?.name || `Sub-Depot ${r.sub_depot_id}`;
              return (<li key={r.id || `override-${r.sub_depot_id}`} suppressHydrationWarning><strong>{depotName}:</strong> {r.time}</li>);
            })}
          </ul>
        ) : (
          <p className="text-sm text-gray-500" suppressHydrationWarning>No opening times set for {selectedDateGB}.</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600" suppressHydrationWarning>Missing Parcels ({selectedDateGB})</p>
              <p className="text-2xl font-bold text-blue-600" suppressHydrationWarning>{quickSummaryData.totalMissingSelectedDate}</p>
            </div>
            <Package className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600" suppressHydrationWarning>Total Scanned ({selectedDateGB})</p>
              <p className="text-2xl font-bold text-purple-600" suppressHydrationWarning>{quickSummaryData.totalScannedSelectedDate.toLocaleString()}</p>
            </div>
            <ScanLine className="w-8 h-8 text-purple-500" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600" suppressHydrationWarning>Total Missorts ({selectedDateGB})</p>
              <p className="text-2xl font-bold text-orange-600" suppressHydrationWarning>{quickSummaryData.totalMissortsSelectedDate}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* ROLE-BASED METRICS SECTION - HIDE DATE SELECTOR FROM GUESTS */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-1">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Key Performance Indicators</h2>
            <p className="text-gray-500 text-sm" suppressHydrationWarning>Metrics for {selectedDateGB} (vs {previousDashboardDateGB})</p>
          </div>
          {/* HIDE CONTROLS FROM GUESTS */}
          {!isGuest() && (
            <div className="flex items-center gap-3">
              <input
                  type="date"
                  value={selectedDashboardDate}
                  onChange={(e) => setSelectedDashboardDate(e.target.value)}
                  max={TODAY_DATE_STRING}
                  min={new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10)}
                  className="border rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
              <button onClick={() => setShowMetricSelector(!showMetricSelector)} className="p-2 border rounded-md hover:bg-gray-100 text-gray-600" title="Select Metrics">
                <ListFilter size={18} />
              </button>
              <button onClick={handleRefreshData} disabled={refreshing} className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2 text-sm">
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />Refresh
              </button>
            </div>
          )}
        </div>
        {/* HIDE METRIC SELECTOR FROM GUESTS */}
        {showMetricSelector && !isGuest() && (
          <div className="my-4 p-4 bg-gray-50 border rounded-md">
            <p className="text-sm font-medium text-gray-700 mb-3">Display Metrics:</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-2">
              {availableMetrics.map(metric => (
                <label key={metric.id} className="flex items-center space-x-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={selectedMetrics.includes(metric.id)} onChange={() => handleMetricSelectionChange(metric.id)} className="rounded text-blue-600 focus:ring-blue-500" />
                  <span>{metric.title}</span>
                </label>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={() => setSelectedMetrics(availableMetrics.map(m => m.id))} className="text-xs text-blue-600 hover:underline">Select All</button>
              <button onClick={() => setSelectedMetrics([])} className="text-xs text-blue-600 hover:underline">Deselect All</button>
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          {dashboardMetricsData.filter(metric => selectedMetrics.includes(metric.id)).map(metric => (
            <DashboardMetricCard key={metric.id} metric={{...metric, title: `${metric.title} (${selectedDateGB})`}} />
          ))}
          {selectedMetrics.length === 0 && <p className="text-gray-500 col-span-1 sm:col-span-2 lg:col-span-4 text-center py-4">No metrics selected. Use the filter icon to choose metrics to display.</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          {/* FORECAST DATA - HIDE FROM GUESTS */}
          {!isGuest() && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4" suppressHydrationWarning>🌦️ Forecast vs Actual ({selectedDateGB})</h3>
              <div className="overflow-x-auto">
                {forecastActivityData.filter(fa => fa.date === selectedDateGB).length > 0 ? (
                  <table className="w-full text-sm"><thead className="bg-gray-50"><tr>
                      <th className="p-3 text-left font-medium">Sub-Depot</th>
                      <th className="p-3 text-right font-medium">Forecast</th>
                      <th className="p-3 text-right font-medium">Scanned</th>
                      <th className="p-3 text-right font-medium">Missorts</th>
                      <th className="p-3 text-right font-medium">Accuracy</th>
                    </tr></thead><tbody className="divide-y">{subDepots.map(sd => {
                      const forecast = forecastActivityData.find(fa => fa.date === selectedDateGB && fa.subDepot === sd.id)?.forecast || 0;
                      const scanInfo = scanActivityData.find(sa => sa.date === selectedDateGB && sa.subDepot === sd.id);
                      const scanned = scanInfo?.totalScanned || 0;
                      const missorts = scanInfo?.missorts || 0;
                      const accuracy = forecast > 0 ? Math.round((scanned / forecast) * 100) : (scanned > 0 ? 0 : 100);
                      if (forecast === 0 && scanned === 0 && missorts === 0 && !forecastActivityData.some(fa => fa.date === selectedDateGB && fa.subDepot === sd.id) && !scanActivityData.some(sa => sa.date === selectedDateGB && sa.subDepot === sd.id) ) return null;
                      return (
                        <tr key={sd.id} className="hover:bg-gray-50">
                          <td className="p-3" suppressHydrationWarning>{sd.name}</td>
                          <td className="p-3 text-right" suppressHydrationWarning>{forecast.toLocaleString()}</td>
                          <td className="p-3 text-right" suppressHydrationWarning>{scanned.toLocaleString()}</td>
                          <td className="p-3 text-right" suppressHydrationWarning>{missorts}</td>
                          <td className={`p-3 text-right font-medium ${accuracy >= 95 ? 'text-green-600' : accuracy >= 80 ? 'text-yellow-600' : 'text-red-600'}`} suppressHydrationWarning>
                            {accuracy}%
                          </td>
                        </tr>
                      );
                    })}</tbody></table>
                ) : (
                  <p className="text-gray-500 text-center py-4" suppressHydrationWarning>No forecast data available for {selectedDateGB}.</p>
                )}
              </div>
            </div>
          )}
          
          {/* TIMESLOTS - HIDE FROM GUESTS */}
          {!isGuest() && (
            <TodaysTimeslotsSection timeslotAssignments={timeslotAssignments} subDepots={subDepots} rounds={rounds} timeslotTemplates={timeslotTemplates} date={selectedDashboardDate} />
          )}
          
          {/* SORTER PERFORMANCE - SHOW TO MANAGERS AND CDMs ONLY */}
          {hasRole(['manager', 'cdm', 'duc']) && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" /> Sorter Performance (<span suppressHydrationWarning>{selectedDateGB}</span>)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm"><thead className="bg-gray-50"><tr>
                    <th className="text-left p-3 font-medium text-gray-600">Rank</th>
                    <th className="text-left p-3 font-medium text-gray-600">Sorter</th>
                    <th className="text-left p-3 font-medium text-gray-600">Sub Depot</th>
                    <th className="text-right p-3 font-medium text-gray-600">Scanned</th>
                    <th className="text-right p-3 font-medium text-gray-600">Missorts</th>
                    <th className="text-right p-3 font-medium text-gray-600">Missort Rate</th>
                    <th className="text-center p-3 font-medium text-gray-600">Performance</th>
                  </tr></thead><tbody>
                  {sorterPerformanceData.map((scan, index) => {
                    let badgeBgClass = 'bg-yellow-100';
                    let badgeTextClass = 'text-yellow-800';
                    if (scan.performanceBadgeColor === 'green') { badgeBgClass = 'bg-green-100'; badgeTextClass = 'text-green-800'; }
                    else if (scan.performanceBadgeColor === 'blue') { badgeBgClass = 'bg-blue-100'; badgeTextClass = 'text-blue-800'; }
                    else if (scan.performanceBadgeColor === 'red') { badgeBgClass = 'bg-red-100'; badgeTextClass = 'text-red-800'; }
                    return (
                      <tr key={scan.userId} className="border-b hover:bg-gray-50">
                        <td className="p-3" suppressHydrationWarning>#{index + 1}</td>
                        <td className="p-3 font-medium" suppressHydrationWarning>{scan.userName}</td>
                        <td className="p-3" suppressHydrationWarning>{subDepots.find(sd => sd.id === scan.subDepot)?.name}</td>
                        <td className="p-3 text-right" suppressHydrationWarning>{scan.totalScanned.toLocaleString()}</td>
                        <td className="p-3 text-right" suppressHydrationWarning>{scan.missorts}</td>
                        <td className="p-3 text-right" suppressHydrationWarning>{scan.missortRate.toFixed(3)}%</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${badgeBgClass} ${badgeTextClass}`} suppressHydrationWarning>
                            {scan.performanceBadgeText}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {sorterPerformanceData.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center p-4 text-gray-500" suppressHydrationWarning>
                        No scan data for {selectedDateGB}.
                      </td>
                    </tr>
                  )}
                </tbody></table>
              </div>
            </div>
          )}
        </div>
        <div className="space-y-6">
          {/* COURIER PERFORMANCE - SHOW TO MANAGERS AND CDMs ONLY */}
          {hasRole(['manager', 'cdm', 'duc']) && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <Users size={20} className="mr-2 text-indigo-600" /> Courier Performance (<span suppressHydrationWarning>{selectedDateGB}</span>)
              </h3>
              <div className="overflow-x-auto">
                {courierPerformanceData.length > 0 ? (
                  <table className="w-full text-sm"><thead className="bg-gray-50"><tr>
                      <th className="p-3 text-left font-medium">Courier Name</th>
                      <th className="p-3 text-right font-medium">Total Missing</th>
                      <th className="p-3 text-right font-medium">Unrecovered</th>
                      <th className="p-3 text-right font-medium">Recovered</th>
                      <th className="p-3 text-right font-medium">Recovery Rate (%)</th>
                    </tr></thead><tbody className="divide-y">{courierPerformanceData.map(courier => (
                      <tr key={courier.id} className="hover:bg-gray-50">
                        <td className="p-3" suppressHydrationWarning>{courier.name} ({courier.id})</td>
                        <td className="p-3 text-right" suppressHydrationWarning>{courier.totalMissing}</td>
                        <td className={`p-3 text-right font-semibold ${courier.unrecovered > 0 ? 'text-red-600' : 'text-gray-700'}`} suppressHydrationWarning>{courier.unrecovered}</td>
                        <td className="p-3 text-right text-green-600" suppressHydrationWarning>{courier.recovered}</td>
                        <td className={`p-3 text-right font-bold ${courier.recoveryRate >= 90 ? 'text-green-700' : courier.recoveryRate >= 75 ? 'text-yellow-700' : 'text-red-700'}`} suppressHydrationWarning>
                          {courier.recoveryRate}%
                        </td>
                      </tr>
                    ))}</tbody></table>
                ) : (
                  <p className="text-gray-500 text-center py-4" suppressHydrationWarning>No courier performance data available for {selectedDateGB}.</p>
                )}
              </div>
            </div>
          )}

          {/* DUC FINAL REPORTS - SHOW TO MANAGERS AND CDMs ONLY */}
          {hasRole(['manager', 'cdm', 'duc']) && ducFinalReports.filter(r => r.date === selectedDashboardDate).length === 0 && ducFinalReports.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="border-b pb-2 mb-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="w-5 h-5" /> Recent DUC Final Reports (Not for Selected Date)
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm"><thead className="bg-gray-50"><tr>
                        <th className="text-left p-3">Date</th>
                        <th className="text-left p-3">Failed Rounds</th>
                        <th className="text-left p-3">Returns</th>
                        <th className="text-left p-3">Segregated</th>
                        <th className="text-left p-3">Missing (Unrecovered)</th>
                        <th className="text-left p-3">Submitted By</th>
                        <th className="text-left p-3">Time</th>
                      </tr></thead><tbody>{ducFinalReports.slice(0, 7).map(report => (
                        <tr key={report.id} className="border-b hover:bg-gray-50">
                          <td className="p-3 font-medium" suppressHydrationWarning>{new Date(report.date + 'T00:00:00Z').toLocaleDateString('en-GB')}</td>
                          <td className="p-3" suppressHydrationWarning>{report.failed_rounds.length}</td>
                          <td className="p-3" suppressHydrationWarning>{report.total_returns}</td>
                          <td className="p-3" suppressHydrationWarning>{report.segregated_parcels.length}</td>
                          <td className="p-3 text-blue-600" suppressHydrationWarning>
                            {report.missing_parcels_summary.total_missing} ({report.missing_parcels_summary.unrecovered})
                          </td>
                          <td className="p-3" suppressHydrationWarning>{report.submitted_by_name}</td>
                          <td className="p-3" suppressHydrationWarning>{new Date(report.submitted_at).toLocaleTimeString('en-GB')}</td>
                        </tr>
                      ))}</tbody></table>
              </div>
            </div>
          )}

          {/* NO REPORTS MESSAGE - SHOW TO MANAGERS AND CDMs ONLY */}
         {hasRole(['manager', 'cdm', 'duc']) && ducFinalReports.filter(r => r.date === selectedDashboardDate).length === 0 && ducFinalReports.length === 0 && (
             <div className="bg-white rounded-lg shadow p-6"><p className="text-gray-500 text-center py-4">No DUC Final Reports submitted yet.</p></div>
           )}
        </div>
      </div>
    </>
  );

  // DEFINE ALLOWED ROLES FOR THIS PAGE
  const allowedRoles: UserRole[] = ['manager', 'sorter', 'cdm', 'guest', 'duc'];

  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <div className="min-h-screen bg-gray-100">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
              <LogoutButton />
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {dashboardContent}
        </main>
      </div>
    </ProtectedRoute>
  );
}