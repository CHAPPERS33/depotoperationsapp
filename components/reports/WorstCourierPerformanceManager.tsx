
'use client';

import React, { useState, useMemo } from 'react';
import { useSharedState } from '../../hooks/useSharedState';
import { WorstCourierPerformanceReport, PeriodSelection, Courier, RoundEntry } from '../../types';
import Button from '../shared/Button';
import Modal from '../shared/Modal';
import { UserX, CalendarDays, FileText, Eye, Send } from 'lucide-react';
import { getIsoWeek, getWeekDates } from '../../utils/dateUtils';

const WorstCourierPerformanceManager: React.FC = () => {
  const {
    missingParcelsLog,
    couriers,
    worstCourierPerformanceReports,
    addWorstCourierPerformanceReport,
  } = useSharedState();

  const [periodType, setPeriodType] = useState<PeriodSelection>('day');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedWeek, setSelectedWeek] = useState<string>(getIsoWeek(new Date()));
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
  
  const [generatedReport, setGeneratedReport] = useState<WorstCourierPerformanceReport | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  
  const [emailPreviewModalOpen, setEmailPreviewModalOpen] = useState<boolean>(false);
  const [emailPreviewContent, setEmailPreviewContent] = useState<{subject: string, body: string} | null>(null);

  const handleGenerateReport = () => {
    setFormError(null);
    setGeneratedReport(null);

    let startDateStr: string, endDateStr: string;

    if (periodType === 'day') {
      startDateStr = selectedDate;
      endDateStr = selectedDate;
    } else if (periodType === 'week') {
      const { startDate, endDate } = getWeekDates(selectedWeek);
      startDateStr = startDate.toISOString().split('T')[0];
      endDateStr = endDate.toISOString().split('T')[0];
    } else { // month
      const year = parseInt(selectedMonth.substring(0, 4));
      const month = parseInt(selectedMonth.substring(5, 7)) - 1;
      startDateStr = new Date(year, month, 1).toISOString().split('T')[0];
      endDateStr = new Date(year, month + 1, 0).toISOString().split('T')[0];
    }
    
    const startDateObj = new Date(startDateStr + "T00:00:00Z");
    const endDateObj = new Date(endDateStr + "T23:59:59Z");

    const relevantParcels = missingParcelsLog.filter(p => {
      if (!p.dateAdded) return false;
      try {
        const [day, month, year] = p.dateAdded.split('/').map(Number);
        const parcelDate = new Date(year, month - 1, day);
        return parcelDate >= startDateObj && parcelDate <= endDateObj;
      } catch (e) { return false; }
    });

    if (relevantParcels.length === 0) {
      setFormError('No missing parcel data found for the selected period.');
      return;
    }

    const courierStats: Record<string, { courierId: string, courierName?: string, totalMissing: number, unrecovered: number, carryForwards: number, score: number }> = {};

    relevantParcels.forEach(p => {
      if (!p.courier_id) return; // Ensure courier_id exists
      if (!courierStats[p.courier_id]) {
        const courierInfo = couriers.find(c => c.id === p.courier_id);
        courierStats[p.courier_id] = { courierId: p.courier_id, courierName: courierInfo?.name || p.courier_id, totalMissing: 0, unrecovered: 0, carryForwards: 0, score: 0 };
      }
      courierStats[p.courier_id].totalMissing++;
      if (!p.is_recovered) courierStats[p.courier_id].unrecovered++; // Use is_recovered
      if (p.carryForwards && p.carryForwards > 0) courierStats[p.courier_id].carryForwards += Number(p.carryForwards);
    });
    
    Object.values(courierStats).forEach(stat => {
      stat.score = (stat.unrecovered * 3) + (stat.carryForwards * 2) + stat.totalMissing;
    });

    const sortedCouriers = Object.values(courierStats)
        .sort((a, b) => b.score - a.score || b.unrecovered - a.unrecovered || b.carryForwards - a.carryForwards)
        .map(stat => ({
            courierId: stat.courierId,
            courierName: stat.courierName,
            score: stat.score,
            metrics: { totalMissing: stat.totalMissing, unrecovered: stat.unrecovered, carryForwards: stat.carryForwards },
            reasons: [`Score: ${stat.score}`, `Unrecovered: ${stat.unrecovered}`, `Carry Fwds: ${stat.carryForwards}`]
        }));


    const report: WorstCourierPerformanceReport = {
      id: `WCP-${Date.now()}`,
      periodType,
      startDate: startDateStr,
      endDate: endDateStr,
      couriers: sortedCouriers,
      generatedAt: new Date().toISOString(),
      generatedBy: 'System (Current User Placeholder)',
    };
    setGeneratedReport(report);
  };

  const handleSaveReport = () => {
    if (generatedReport) {
      addWorstCourierPerformanceReport(generatedReport);
      alert('Report saved!');
      setGeneratedReport(null); // Clear after saving
    }
  };

  const handlePreviewEmail = (report: WorstCourierPerformanceReport) => {
     const subject = `Worst Courier Performance Report: ${report.startDate} to ${report.endDate}`;
     let body = `<h1>Worst Courier Performance Report</h1><p>Period: ${report.startDate} to ${report.endDate}</p><p>Generated by: ${report.generatedBy} at ${new Date(report.generatedAt).toLocaleString()}</p>`;
     body += `<table border="1"><thead><tr><th>Rank</th><th>Courier</th><th>Score</th><th>Missing</th><th>Unrecovered</th><th>Carry Fwds</th></tr></thead><tbody>`;
     if (report.couriers && report.couriers.length > 0) {
        report.couriers.slice(0, 10).forEach((c, index) => {
            body += `<tr><td>${index+1}</td><td>${c.courierName} (${c.courierId})</td><td>${c.score}</td><td>${c.metrics.totalMissing}</td><td>${c.metrics.unrecovered}</td><td>${c.metrics.carryForwards}</td></tr>`;
        });
     }
     body += `</tbody></table>`;
     setEmailPreviewContent({subject, body});
     setEmailPreviewModalOpen(true);
  };
  const handleSendEmail = (report: WorstCourierPerformanceReport) => { alert("Email sending functionality not fully implemented."); };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-800 border-b pb-3 flex items-center">
          <UserX className="w-6 h-6 mr-2 text-red-600" /> Worst Courier Performance Report
        </h2>
        {formError && <div className="mt-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded-md text-sm">{formError}</div>}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 items-end">
          <div>
            <label htmlFor="periodType" className="block text-sm font-medium text-gray-700">Period Type</label>
            <select id="periodType" value={periodType} onChange={e => setPeriodType(e.target.value as PeriodSelection)} className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm">
              <option value="day">Day</option><option value="week">Week</option><option value="month">Month</option>
            </select>
          </div>
          {periodType === 'day' && (<div><label htmlFor="selectedDate" className="block text-sm font-medium text-gray-700">Date</label><input type="date" id="selectedDate" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm" /></div>)}
          {periodType === 'week' && (<div><label htmlFor="selectedWeek" className="block text-sm font-medium text-gray-700">Week</label><input type="week" id="selectedWeek" value={selectedWeek} onChange={e => setSelectedWeek(e.target.value)} className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm" /></div>)}
          {periodType === 'month' && (<div><label htmlFor="selectedMonth" className="block text-sm font-medium text-gray-700">Month</label><input type="month" id="selectedMonth" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm" /></div>)}
          <div className="md:col-span-1"><Button onClick={handleGenerateReport} variant="primary" leftIcon={CalendarDays} className="w-full">Generate Report</Button></div>
        </div>

        {generatedReport && generatedReport.couriers && generatedReport.couriers.length > 0 && (
          <div className="mt-6 p-4 border rounded-md bg-gray-50 space-y-4">
            <h3 className="text-lg font-semibold">Report for {generatedReport.startDate} to {generatedReport.endDate} (Top 10)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100"><tr>{[ 'Rank', 'Courier', 'Score', 'Total Missing', 'Unrecovered', 'Carry Fwds'].map(h=><th key={h} className="p-2 text-left font-medium">{h}</th>)}</tr></thead>
                <tbody>
                  {generatedReport.couriers.slice(0, 10).map((c, index) => (
                    <tr key={c.courierId} className="border-b">
                      <td className="p-2">#{index + 1}</td>
                      <td className="p-2">{c.courierName} ({c.courierId})</td>
                      <td className="p-2 font-bold">{c.score}</td>
                      <td className="p-2">{c.metrics.totalMissing}</td>
                      <td className="p-2">{c.metrics.unrecovered}</td>
                      <td className="p-2">{c.metrics.carryForwards}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button onClick={() => handlePreviewEmail(generatedReport)} variant="outline" leftIcon={Eye}>Preview Email</Button>
              <Button onClick={handleSaveReport} variant="secondary" leftIcon={FileText}>Save Report</Button>
            </div>
          </div>
        )}
         {generatedReport && (!generatedReport.couriers || generatedReport.couriers.length === 0) && (
            <p className="mt-4 text-sm text-gray-500">No courier performance data to display for this period.</p>
        )}
      </div>
      {worstCourierPerformanceReports && worstCourierPerformanceReports.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-3">Saved Worst Courier Performance Reports</h3>
          <div className="overflow-x-auto max-h-96"><table className="w-full text-sm"><thead className="bg-gray-50"><tr>{['Period', 'Dates', 'Generated By', 'Actions'].map(h=><th key={h} className="p-2 text-left font-medium">{h}</th>)}</tr></thead>
          <tbody>{worstCourierPerformanceReports.map(report => (<tr key={report.id}><td className="p-2 capitalize">{report.periodType}</td><td className="p-2">{report.startDate} to {report.endDate}</td><td className="p-2">{report.generatedBy}</td><td className="p-2 space-x-1"><Button onClick={() => handlePreviewEmail(report)} variant="ghost" size="sm" leftIcon={Eye}>View</Button><Button onClick={() => handleSendEmail(report)} variant="ghost" size="sm" leftIcon={Send}>Send</Button></td></tr>))}</tbody></table></div>
        </div>
      )}
      <Modal isOpen={emailPreviewModalOpen} onClose={() => setEmailPreviewModalOpen(false)} title={`Email Preview: ${emailPreviewContent?.subject || ''}`} size="3xl">{emailPreviewContent && (<div className="prose max-w-none p-2 bg-white border rounded-md max-h-[70vh] overflow-y-auto" dangerouslySetInnerHTML={{ __html: emailPreviewContent.body }} />)}footer={<Button onClick={() => setEmailPreviewModalOpen(false)} variant="primary">Close Preview</Button>}</Modal>
    </div>
  );
};
export default WorstCourierPerformanceManager;
