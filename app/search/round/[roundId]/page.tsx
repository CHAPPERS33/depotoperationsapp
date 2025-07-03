
'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation'; // Use Next.js routing
import { useSharedState } from '../../../../hooks/useSharedState';
import { getRoundProfileDetails } from '../../../../utils/searchUtils';
import { RoundProfileData } from '../../../../types'; 
import { MapPin, AlertTriangle, ExternalLink, Clock } from 'lucide-react';
import Button from '../../../../components/shared/Button';

export default function RoundProfileDisplayPage() {
  const currentPathname = usePathname(); // Use Next.js pathname
  const [roundId, setRoundId] = useState<string | null>(null); 
  
  const { 
    rounds, missingParcelsLog, subDepots, couriers, team, 
    clients, 
    markMissingParcelRecovered, 
    timeslotAssignments, timeslotTemplates
  } = useSharedState();
  
  const [profileData, setProfileData] = useState<RoundProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const pathParts = currentPathname.split('/');
    if (pathParts.length === 4 && pathParts[1] === 'search' && pathParts[2] === 'round') {
      setRoundId(pathParts[3]);
    } else {
      setRoundId(null);
    }
  }, [currentPathname]);

  useEffect(() => {
    if (roundId) {
      setIsLoading(true);
      const details = getRoundProfileDetails(roundId, rounds, missingParcelsLog, subDepots, couriers, team, timeslotAssignments, timeslotTemplates);
      setProfileData(details);
      setIsLoading(false);
    } else {
      setProfileData(null);
      setIsLoading(false);
    }
  }, [roundId, rounds, missingParcelsLog, subDepots, couriers, team, timeslotAssignments, timeslotTemplates, clients]);
  
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

  if (isLoading) {
    return <div className="text-center py-10">Loading round profile...</div>;
  }

  if (!profileData) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-red-600 font-semibold">Round with ID "{roundId}" not found or invalid.</p>
      </div>
    );
  }

  const { id, subDepotName, drop_number, stats, parcelsByDate, couriersInvolved, sortersInvolved, flags, todaysTimeslot } = profileData;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start mb-6 gap-4">
          <div className="flex items-center space-x-4">
            <div className="bg-green-100 rounded-full p-3"><MapPin className="w-10 h-10 text-green-600" /></div>
            <div> <h1 className="text-3xl font-bold text-gray-800">Round {id}</h1> <p className="text-gray-500 text-sm">{subDepotName} | Drop: {drop_number}</p> </div>
          </div>
           {todaysTimeslot && ( <div className="bg-green-100 text-green-800 px-3 py-1.5 rounded-full text-sm font-medium flex items-center self-start sm:self-center"> <Clock size={16} className="mr-2" /> Today's Timeslot: {todaysTimeslot} </div> )}
        </div>
        {flags.length > 0 && ( <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500"> <h3 className="text-md font-semibold text-red-700 mb-2 flex items-center"><AlertTriangle className="w-5 h-5 mr-2"/>Round Analysis Alerts</h3> <ul className="list-disc list-inside space-y-1 text-sm text-red-600"> {flags.map((flag, index) => (<li key={index}>{flag}</li>))} </ul> </div> )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 text-center">
          <div className="bg-blue-50 p-4 rounded-lg shadow-sm"><p className="text-xs text-blue-700 uppercase tracking-wider">Total Missing</p><p className="text-3xl font-bold text-blue-800">{stats.totalMissing}</p></div>
          <div className="bg-red-50 p-4 rounded-lg shadow-sm"><p className="text-xs text-red-700 uppercase tracking-wider">Unrecovered</p><p className="text-3xl font-bold text-red-800">{stats.unrecovered}</p></div>
          <div className="bg-green-50 p-4 rounded-lg shadow-sm"><p className="text-xs text-green-700 uppercase tracking-wider">Recovered</p><p className="text-3xl font-bold text-green-800">{stats.recovered}</p></div>
          <div className="bg-purple-50 p-4 rounded-lg shadow-sm"><p className="text-xs text-purple-700 uppercase tracking-wider">Recovery Rate</p><p className="text-3xl font-bold text-purple-800">{stats.recoveryRate}%</p></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div> <h4 className="font-semibold text-gray-700 mb-3 text-lg">Couriers with Missing Parcels</h4> {couriersInvolved.length > 0 ? ( <div className="space-y-2"> {couriersInvolved.map(c => ( <div key={c.id || c.name} className="flex justify-between items-center p-3 bg-gray-100 rounded-md text-sm"> <span>{c.name} ({c.id || 'N/A'})</span> <span className="text-gray-600">{c.parcelsCount} missing ({c.unrecoveredCount} unrecovered)</span> </div> ))} </div> ) : <p className="text-gray-500 text-sm">No couriers with missing parcels recorded for this round.</p>} </div>
            <div> <h4 className="font-semibold text-gray-700 mb-3 text-lg">Sorters with Missing Parcels</h4> {sortersInvolved.length > 0 ? ( <div className="space-y-2"> {sortersInvolved.map(s => ( <div key={s.id || s.name} className="flex justify-between items-center p-3 bg-gray-100 rounded-md text-sm"> <span>{s.name} ({s.id || 'N/A'})</span> <span className="text-gray-600">{s.parcelsCount} missing ({s.unrecoveredCount} unrecovered)</span> </div> ))} </div> ) : <p className="text-gray-500 text-sm">No sorters with missing parcels recorded for this round.</p>} </div>
        </div>
        <div>
          <h3 className="text-xl font-semibold text-gray-700 mb-4">Missing Parcels Timeline for Round {id}</h3>
           {Object.keys(parcelsByDate).length === 0 ? ( <p className="text-gray-500 text-center py-8">No missing parcels recorded for this round.</p> ) : (
            <div className="space-y-6">
              {Object.entries(parcelsByDate).sort(([aDate], [bDate]) => new Date(bDate.split('/').reverse().join('-')).getTime() - new Date(aDate.split('/').reverse().join('-')).getTime()).map(([date, parcelsOnDate]) => (
                  <div key={date} className="border-l-4 border-green-500 pl-4 py-2">
                    <div className="flex justify-between items-center mb-2"> <h4 className="font-semibold text-gray-800">{date}</h4> <span className="text-sm text-gray-500">{parcelsOnDate.length} parcel{parcelsOnDate.length !== 1 ? 's' : ''} | {parcelsOnDate.filter(p => p.is_recovered).length} recovered</span> </div>
                    <div className="space-y-3">
                      {parcelsOnDate.map(parcel => {
                        const courierInfo = couriers.find(c => c.id === parcel.courier_id);
                        const sorterInfo = team.find(s => s.id === parcel.sorter_team_member_id);
                        const clientInfo = clients.find(cl => cl.id === parcel.client_id);
                        return (
                          <div key={parcel.id || `${parcel.barcode}-${parcel.round_id}-${date}`} className={`p-3 rounded-md border ${parcel.is_recovered ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                            <div className="flex flex-col sm:flex-row justify-between items-start">
                              <div className="flex-1 mb-2 sm:mb-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <a href={`https://www.evri.com/track/parcel/${parcel.barcode}/details`} target="_blank" rel="noopener noreferrer" className="font-mono text-sm text-blue-600 hover:underline flex items-center gap-1"> {parcel.barcode} <ExternalLink size={14}/> </a>
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ parcel.is_recovered ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800' }`}> {parcel.is_recovered ? 'Recovered' : 'Missing'} </span>
                                </div>
                                <p className="text-xs text-gray-600"> Drop {parcel.drop_number} • Courier: {courierInfo?.name || parcel.courier_id || 'N/A'} • Sorter: {sorterInfo?.name || parcel.sorter_team_member_id || 'N/A'} • Client: {clientInfo?.name || parcel.client_id} • Scanned: {new Date(parcel.time_scanned).toLocaleTimeString('en-GB')} </p>
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
