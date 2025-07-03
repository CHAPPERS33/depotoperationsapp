
'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation'; // Use Next.js routing
import { useSharedState } from '../../../../hooks/useSharedState';
import { getCourierProfileDetails } from '../../../../utils/searchUtils';
import { CourierProfileData, ParcelScanEntry } from '../../../../types'; 
import { User as UserIcon, AlertTriangle, Plus, CheckCircle2, Clock, Phone, ExternalLink } from 'lucide-react';
import Button from '../../../../components/shared/Button';


export default function CourierProfileDisplayPage() {
  const currentPathname = usePathname(); // Use Next.js pathname
  const router = useRouter(); // Use Next.js router
  
  const [courierId, setCourierId] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<CourierProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { 
    couriers, missingParcelsLog, rounds, subDepots, team, 
    clients,
    markMissingParcelRecovered, setMissingParcelsLog,
    timeslotAssignments, timeslotTemplates,
    setCurrentCourierForWorkflow, setActiveTab, setDailyOpsView
  } = useSharedState();
  
 useEffect(() => {
  if (!currentPathname) return;
  
  const pathParts = currentPathname.split('/');
  if (pathParts.length === 4 && pathParts[1] === 'search' && pathParts[2] === 'courier') {
    setCourierId(pathParts[3]);
  } else {
    setCourierId(null); // Add this line to handle else case
  }
}, [currentPathname]); // Add this closing brace and dependency array

useEffect(() => {
  if (courierId) {
    setIsLoading(true);
    const details = getCourierProfileDetails(courierId, couriers, missingParcelsLog, rounds, subDepots, team, timeslotAssignments, timeslotTemplates);
    setProfileData(details);
    setIsLoading(false);
  } else {
    setProfileData(null);
    setIsLoading(false);
  }
}, [courierId, couriers, missingParcelsLog, rounds, subDepots, team, timeslotAssignments, timeslotTemplates]);

  const handleBulkMarkRecovered = () => {
    if (!profileData || !courierId || profileData.stats.unrecovered === 0) {
        alert("No unrecovered parcels to mark.");
        return;
    }
    if (confirm(`Mark all ${profileData.stats.unrecovered} unrecovered parcels for ${profileData.name} as recovered?`)) {
        const updatedLog = missingParcelsLog.map(p => {
            if (p.courier_id === courierId && !p.is_recovered && p.id) { 
                return { ...p, is_recovered: true, recovery_date: new Date().toISOString().split('T')[0] };
            }
            return p;
        });
        setMissingParcelsLog(updatedLog); 
        alert(`${profileData.stats.unrecovered} parcels marked as recovered (client-side). For persistent change, ensure API supports bulk updates or mark individually.`);
    }
  };
  
  const handleMarkSingleRecovered = async (parcelId: string, currentStatus: boolean) => {
    if (!parcelId) {
      console.error("Cannot mark parcel as recovered: parcelId is missing.");
      alert("Error: Parcel identifier is missing.");
      return;
    }
    const updatedParcel = await markMissingParcelRecovered(parcelId, !currentStatus);
    if (!updatedParcel) {
      alert(`Failed to update parcel ${parcelId}.`);
    }
  };

  const handleNavigateToAddMissingParcel = () => {
    if (profileData?.id) { // Use profileData.id
        setCurrentCourierForWorkflow(profileData.id);
        setActiveTab('/daily-ops'); 
        setDailyOpsView('missingParcels');
        router.push('/daily-ops/missing-parcels'); // Use Next.js router
    }
  };


  if (isLoading) {
    return <div className="text-center py-10">Loading courier profile...</div>;
  }

  if (!profileData) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-red-600 font-semibold">Courier with ID "{courierId}" not found.</p>
      </div>
    );
  }
  
  const { name, id, stats, parcelsByDate, flags, todaysTimeslots, telephone } = profileData;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start mb-6 gap-4">
          <div className="flex items-center space-x-4">
            <div className="bg-blue-100 rounded-full p-3"><UserIcon className="w-10 h-10 text-blue-600" /></div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">{name}</h1>
              <p className="text-gray-500 text-sm">ID: {id} | {profileData.subDepotsInvolved.map(sdId => subDepots.find(s=>s.id === sdId)?.name?.replace('Sub Depot ','S') || `S${sdId}`).join(', ')}</p>
              {telephone && (
                <p className="text-gray-500 text-sm flex items-center mt-1">
                  <Phone size={14} className="mr-1.5 text-gray-400" /> {telephone}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
             <Button 
                variant="primary" 
                size="sm" 
                leftIcon={Plus}
                onClick={handleNavigateToAddMissingParcel}
            >
                Add Missing Parcel
            </Button>
            {stats.unrecovered > 0 && (
                <Button variant="secondary" size="sm" leftIcon={CheckCircle2} onClick={handleBulkMarkRecovered}>
                    Bulk Mark Recovered ({stats.unrecovered})
                </Button>
            )}
          </div>
        </div>

        {flags.length > 0 && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500">
            <h3 className="text-md font-semibold text-red-700 mb-2 flex items-center"><AlertTriangle className="w-5 h-5 mr-2"/>Investigation Alerts</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-red-600">
              {flags.map((flag, index) => (<li key={index}>{flag}</li>))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 text-center">
          <div className="bg-blue-50 p-4 rounded-lg shadow-sm"><p className="text-xs text-blue-700 uppercase tracking-wider">Total Missing</p><p className="text-3xl font-bold text-blue-800">{stats.totalMissing}</p></div>
          <div className="bg-red-50 p-4 rounded-lg shadow-sm"><p className="text-xs text-red-700 uppercase tracking-wider">Unrecovered</p><p className="text-3xl font-bold text-red-800">{stats.unrecovered}</p></div>
          <div className="bg-green-50 p-4 rounded-lg shadow-sm"><p className="text-xs text-green-700 uppercase tracking-wider">Recovered</p><p className="text-3xl font-bold text-green-800">{stats.recovered}</p></div>
          <div className="bg-purple-50 p-4 rounded-lg shadow-sm"><p className="text-xs text-purple-700 uppercase tracking-wider">Recovery Rate</p><p className="text-3xl font-bold text-purple-800">{stats.recoveryRate}%</p></div>
        </div>
        
        {todaysTimeslots && todaysTimeslots.length > 0 && (
            <div className="mb-6 p-4 bg-gray-50 border rounded-md">
              <h3 className="text-md font-semibold text-gray-700 mb-2 flex items-center"><Clock className="w-5 h-5 mr-2"/>Today's Assigned Timeslots</h3>
              <div className="flex flex-wrap gap-2">
                {todaysTimeslots.map(rt => (
                  <span key={rt.roundId} className="bg-gray-200 text-gray-800 px-3 py-1 rounded-full text-xs font-medium">
                    Round {rt.roundId}: {rt.timeslot || "N/A"}
                  </span>
                ))}
              </div>
            </div>
        )}

        <div>
          <h3 className="text-xl font-semibold text-gray-700 mb-4">Missing Parcels History</h3>
          {Object.keys(parcelsByDate).length === 0 ? (
            <p className="text-gray-500 text-center py-8">No missing parcels recorded for this courier.</p>
          ) : (
            <div className="space-y-6">
              {Object.entries(parcelsByDate)
                .sort(([aDate], [bDate]) => new Date(bDate.split('/').reverse().join('-')).getTime() - new Date(aDate.split('/').reverse().join('-')).getTime())
                .slice(0, 25)
                .map(([date, parcelsOnDate]: [string, ParcelScanEntry[]]) => (
                  <div key={date} className="border-l-4 border-blue-500 pl-4 py-2">
                    <div className="flex justify-between items-center mb-2"> <h4 className="font-semibold text-gray-800">{date}</h4> <span className="text-sm text-gray-500">{parcelsOnDate.length} parcel{parcelsOnDate.length !== 1 ? 's' : ''} | {parcelsOnDate.filter(p => p.is_recovered).length} recovered</span> </div>
                    <div className="space-y-3">
                      {parcelsOnDate.map(parcel => {
                        const subDepotInfo = subDepots.find(s => s.id === parcel.sub_depot_id);
                        const sorterInfo = team.find(s => s.id === parcel.sorter_team_member_id);
                        const clientInfo = clients.find(c => c.id === parcel.client_id);
                        const displayDate = parcel.created_at ? new Date(parcel.created_at).toLocaleDateString('en-GB') : date;

                        return (
                          <div key={parcel.id || `${parcel.barcode}-${parcel.round_id}-${displayDate}`} className={`p-3 rounded-md border ${parcel.is_recovered ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                            <div className="flex flex-col sm:flex-row justify-between items-start">
                              <div className="flex-1 mb-2 sm:mb-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <a href={`https://www.evri.com/track/parcel/${parcel.barcode}/details`} target="_blank" rel="noopener noreferrer" className="font-mono text-sm text-blue-600 hover:underline flex items-center gap-1"> {parcel.barcode} <ExternalLink size={14}/> </a>
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ parcel.is_recovered ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800' }`}> {parcel.is_recovered ? 'Recovered' : 'Missing'} </span>
                                </div>
                                <p className="text-xs text-gray-600"> Round {parcel.round_id}/Drop {parcel.drop_number} • {subDepotInfo?.name || `Sub ${parcel.sub_depot_id}`} • Sorter: {sorterInfo?.name || parcel.sorter_team_member_id || 'N/A'} • Client: {clientInfo?.name || parcel.client_id} • Scanned: {new Date(parcel.time_scanned).toLocaleTimeString('en-GB')} </p>
                              </div>
                              {!parcel.is_recovered && parcel.id && ( <Button onClick={() => handleMarkSingleRecovered(parcel.id!, parcel.is_recovered || false)} variant="primary" size="sm" className="self-start sm:self-center">Mark Found</Button> )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
