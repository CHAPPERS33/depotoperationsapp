
'use client';

import React, { useState, useEffect } from 'react';
import { Clock, Printer } from 'lucide-react'; 
import { TimeslotAssignment, SubDepot, Round, TimeslotTemplate } from '../../types';
import { getTimeslotCapacity, getTimeslotColorForSubDepot } from '../../utils/timeslotUtils';
import { printHtmlContent } from '../../utils/invoicePdfGenerator'; // Ensure this is correctly pathed if used in this component or remove.
import { TODAY_DATE_STRING } from '../../constants';

interface TodaysTimeslotsSectionProps {
  timeslotAssignments: TimeslotAssignment[];
  subDepots: SubDepot[];
  rounds: Round[];
  timeslotTemplates: TimeslotTemplate[];
  date: string; // YYYY-MM-DD format passed from parent
}

const TodaysTimeslotsSection: React.FC<TodaysTimeslotsSectionProps> = ({ 
  timeslotAssignments, 
  subDepots, 
  rounds,
  timeslotTemplates,
  date // Consuming the passed date
}) => {
  const [mounted, setMounted] = useState(false);
  const [currentTimeString, setCurrentTimeString] = useState('');

  useEffect(() => {
    setMounted(true);
    const updateCurrentTime = () => {
      const now = new Date();
      setCurrentTimeString(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    };
    updateCurrentTime();
    const timerId = setInterval(updateCurrentTime, 60000); // Update every minute
    return () => clearInterval(timerId);
  }, []);

  const currentDisplayDateStr = date; // Use the passed date prop
  const assignmentsForDisplayDate = timeslotAssignments.filter(a => a.date === currentDisplayDateStr);
  
  const getNextTimeslot = () => {
    if (currentDisplayDateStr !== TODAY_DATE_STRING || !mounted) return null; // Only show "Next" for today and after mount
    const allTimeslots = assignmentsForDisplayDate.map(a => a.timeslot).filter((v, i, arr) => arr.indexOf(v) === i).sort();
    return allTimeslots.find(slot => slot > currentTimeString) || null;
  };
  const nextTimeslot = getNextTimeslot();

  const printTodaysTimeslots = () => {
    const formattedDate = new Date(currentDisplayDateStr + 'T00:00:00Z').toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
    let htmlContent = `
      <h1>Timeslots for ${formattedDate}</h1>
      <p>Generated: ${new Date().toLocaleString()}</p>
    `;

    const groupedBySubDepot = subDepots.reduce<Record<number, TimeslotAssignment[]>>((acc, subDepot) => {
      acc[subDepot.id] = assignmentsForDisplayDate.filter(a => a.sub_depot_id === subDepot.id);
      return acc;
    }, {} as Record<number, TimeslotAssignment[]>);

    Object.entries(groupedBySubDepot).forEach(([subDepotIdStr, assignmentsInGroup]: [string, TimeslotAssignment[]]) => {
      if (assignmentsInGroup.length === 0) return;
      const subDepotId = parseInt(subDepotIdStr);
      const subDepotInfo = subDepots.find(sd => sd.id === subDepotId)!;
      htmlContent += `<h2>${subDepotInfo.name}</h2>`;
      
      const timeslotGroups = assignmentsInGroup.reduce<Record<string, TimeslotAssignment[]>>((acc, assignment) => {
        if (!acc[assignment.timeslot]) acc[assignment.timeslot] = [];
        acc[assignment.timeslot].push(assignment);
        return acc;
      }, {} as Record<string, TimeslotAssignment[]>);

      htmlContent += '<table border="1" style="width:100%; border-collapse: collapse;"><thead><tr><th>Timeslot</th><th>Capacity</th><th>Rounds</th></tr></thead><tbody>';
      Object.entries(timeslotGroups).sort(([a], [b]) => a.localeCompare(b)).forEach(([timeslot, slotAssignments]:[string, TimeslotAssignment[]]) => {
        const capacity = getTimeslotCapacity(currentDisplayDateStr, subDepotId, timeslot, timeslotAssignments, timeslotTemplates, subDepots);
        htmlContent += `
          <tr>
            <td>${timeslot}</td>
            <td>${capacity.used}/${capacity.max} ${capacity.used > capacity.max ? '⚠️' : ''}</td>
            <td>${slotAssignments.map(sa => `R${sa.round_id} (D${rounds.find(r=>r.id === sa.round_id)?.drop_number || 'N/A'})`).join(', ')}</td>
          </tr>
        `;
      });
      htmlContent += '</tbody></table>';
    });
    printHtmlContent(htmlContent, `Timeslots_${currentDisplayDateStr}`);
  };


  if (!mounted) return (
    <div className="bg-white rounded-lg shadow p-6 animate-pulse">
      <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1,2,3].map(i => <div key={i} className="border-2 border-gray-200 rounded-lg p-3 bg-gray-50 h-40"></div>)}
      </div>
    </div>
  );

  if (assignmentsForDisplayDate.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Clock className="w-5 h-5" /><span suppressHydrationWarning>Timeslots for {new Date(currentDisplayDateStr + 'T00:00:00Z').toLocaleDateString('en-GB')}</span></h3>
        <p className="text-gray-500 text-center py-4" suppressHydrationWarning>No timeslots assigned for {new Date(currentDisplayDateStr + 'T00:00:00Z').toLocaleDateString('en-GB')}.</p>
      </div>
    );
  }

  const groupedBySubDepotRender = subDepots.reduce<Record<number, TimeslotAssignment[]>>((acc, subDepot) => {
    acc[subDepot.id] = assignmentsForDisplayDate.filter(a => a.sub_depot_id === subDepot.id);
    return acc;
  }, {} as Record<number, TimeslotAssignment[]>);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2"><Clock className="w-5 h-5" /><span suppressHydrationWarning>Timeslots for {new Date(currentDisplayDateStr + 'T00:00:00Z').toLocaleDateString('en-GB')}</span></h3>
        <div className="text-sm text-gray-600">{nextTimeslot && (<span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full" suppressHydrationWarning>Next: {nextTimeslot}</span>)}</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(groupedBySubDepotRender).filter(([, assignmentsList]) => assignmentsList.length > 0).map(([subDepotIdStr, assignmentsList]: [string, TimeslotAssignment[]]) => {
            const subDepotId = parseInt(subDepotIdStr);
            const subDepotInfo = subDepots.find(sd => sd.id === subDepotId);
            if (!subDepotInfo) return null;
            
            const color = getTimeslotColorForSubDepot(subDepotId, subDepots);
            const timeslotGroups = assignmentsList.reduce<Record<string, TimeslotAssignment[]>>((acc, assignment) => { 
              if (!acc[assignment.timeslot]) acc[assignment.timeslot] = []; 
              acc[assignment.timeslot].push(assignment); 
              return acc; 
            }, {} as Record<string, TimeslotAssignment[]>);

            return (
              <div key={subDepotId} className={`border-2 border-${color}-200 rounded-lg p-3 bg-${color}-50`}>
                <h4 className={`font-medium text-${color}-700 mb-3 text-sm`}>{subDepotInfo.name.replace('Sub Depot ', '')}</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {Object.entries(timeslotGroups).sort(([a], [b]) => a.localeCompare(b)).map(([timeslot, slotAssignments]: [string, TimeslotAssignment[]]) => {
                      const capacity = getTimeslotCapacity(currentDisplayDateStr, subDepotId, timeslot, timeslotAssignments, timeslotTemplates, subDepots);
                      const isPast = currentDisplayDateStr < TODAY_DATE_STRING || (currentDisplayDateStr === TODAY_DATE_STRING && timeslot < currentTimeString);
                      const isCurrent = currentDisplayDateStr === TODAY_DATE_STRING && timeslot === nextTimeslot;

                      return (
                        <div key={timeslot} className={`p-2 rounded text-xs ${isCurrent ? `bg-yellow-200 border-yellow-400 border-2 shadow-md ring-2 ring-yellow-500` : isPast ? 'bg-gray-100 text-gray-600 opacity-70' : 'bg-white border border-gray-200'}`}>
                          <div className="flex justify-between items-center">
                            <span className="font-medium" suppressHydrationWarning>{timeslot} {isCurrent && '← CURRENT'}</span>
                            <span className={`text-xs ${capacity.used > capacity.max ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>{capacity.used}/{capacity.max} {capacity.used > capacity.max && '⚠️'}</span>
                          </div>
                          <div className="text-gray-600 mt-1 text-[11px]">
                            {slotAssignments.map(sa => `R${sa.round_id}`).join(', ')}
                          </div>
                        </div>);
                    })}
                </div>
              </div>);
          })}
      </div>
       <div className="mt-4 text-center">
        <button 
          onClick={printTodaysTimeslots} 
          className="text-purple-600 hover:underline text-sm flex items-center gap-1 mx-auto"
        >
          <Printer className="w-4 h-4" /><span suppressHydrationWarning>Print Schedule for {new Date(currentDisplayDateStr + 'T00:00:00Z').toLocaleDateString('en-GB')}</span>
        </button>
      </div>
    </div>
  );
};

export default TodaysTimeslotsSection;
