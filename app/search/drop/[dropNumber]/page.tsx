
'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation'; // Changed from useHashRouter
import { useSharedState } from '../../../../hooks/useSharedState';
import { getDropProfileDetails } from '../../../../utils/searchUtils';
import { DropProfileData, RoundEntry } from '../../../../types'; 
import { TrendingUp, AlertTriangle, ExternalLink } from 'lucide-react';
import Button from '../../../../components/shared/Button';

export default function DropProfileDisplayPage() {
  const pathname = usePathname(); // Changed from useHashRouter
  const [dropNumber] = useState<number | null>(null);

  const { 
    rounds, missingParcelsLog, subDepots, couriers, team, 
    clients,
    markMissingParcelRecovered 
  } = useSharedState();
  
  const [profileData, setProfileData] = useState<DropProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
  if (!pathname) return; // Add this null check
  
  const pathParts = pathname.split('/');
  if (pathParts.length === 4 && pathParts[1] === 'search' && pathParts[2] === 'drop') {
    // ... rest of the code
  }
}, [pathname]);

  useEffect(() => {
    if (dropNumber !== null) {
      setIsLoading(true);
      const details = getDropProfileDetails(dropNumber, rounds, missingParcelsLog, subDepots, couriers, team);
      setProfileData(details);
      setIsLoading(false);
    } else {
      setProfileData(null);
      setIsLoading(false);
    }
  }, [dropNumber, rounds, missingParcelsLog, subDepots, couriers, team, clients]); 

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
    return <div className="text-center py-10">Loading drop profile...</div>;
  }

  if (!profileData) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-red-600 font-semibold">Drop analysis for Drop "{dropNumber}" not available or drop number is invalid.</p>
      </div>
    );
  }

  const { stats, flags, roundsInvolvedDetails } = profileData;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start mb-6 gap-4">
          <div className="flex items-center space-x-4">
            <div className="bg-purple-100 rounded-full p-3"><TrendingUp className="w-10 h-10 text-purple-600" /></div>
            <div> <h1 className="text-3xl font-bold text-gray-800">Drop {profileData.dropNumber} Analysis</h1> <p className="text-gray-500 text-sm">Cross-round analysis for Drop {profileData.dropNumber}</p> </div>
          </div>
        </div>
        {flags.length > 0 && ( <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500"> <h3 className="text-md font-semibold text-red-700 mb-2 flex items-center"><AlertTriangle className="w-5 h-5 mr-2"/>Drop Analysis Alerts</h3> <ul className="list-disc list-inside space-y-1 text-sm text-red-600"> {flags.map((flag, index) => (<li key={index}>{flag}</li>))} </ul> </div> )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 text-center">
          <div className="bg-blue-50 p-4 rounded-lg shadow-sm"><p className="text-xs text-blue-700 uppercase tracking-wider">Rounds w/ Drop</p><p className="text-3xl font-bold text-blue-800">{stats.totalRoundsWithThisDrop}</p></div>
          <div className="bg-orange-50 p-4 rounded-lg shadow-sm"><p className="text-xs text-orange-700 uppercase tracking-wider">Affected Rounds</p><p className="text-3xl font-bold text-orange-800">{stats.affectedRoundsCount}</p></div>
          <div className="bg-red-50 p-4 rounded-lg shadow-sm"><p className="text-xs text-red-700 uppercase tracking-wider">Total Missing</p><p className="text-3xl font-bold text-red-800">{stats.totalMissing}</p></div>
          <div className="bg-purple-50 p-4 rounded-lg shadow-sm"><p className="text-xs text-purple-700 uppercase tracking-wider">Recovery Rate</p><p className="text-3xl font-bold text-purple-800">{stats.recoveryRate}%</p></div>
        </div>
        <div>
          <h3 className="text-xl font-semibold text-gray-700 mb-4">Affected Rounds & Parcels for Drop {profileData.dropNumber}</h3>
           {stats.totalMissing === 0 ? ( <p className="text-gray-500 text-center py-8">No missing parcels recorded for this drop number across any rounds.</p> ) : (
            <div className="space-y-6">
              {roundsInvolvedDetails.filter(r => r.parcels.length > 0).map(roundInfo => (
                <div key={`drop-round-${roundInfo.roundData.id}`} className="border-l-4 border-purple-500 pl-4 py-3 bg-white rounded-r-lg shadow">
                  <h4 className="font-semibold text-gray-800 text-lg mb-2">Round {roundInfo.roundData.id} - {roundInfo.subDepotName}</h4>
                  <div className="space-y-3">
                    {roundInfo.parcels.map((parcel: RoundEntry) => { 
                      const courierInfo = couriers.find(c => c.id === parcel.courier_id);
                      const sorterInfo = team.find(s => s.id === parcel.sorter_team_member_id);
                      const clientInfo = clients.find(cl => cl.id === parcel.client_id);
                      const displayDate = parcel.dateAdded || (parcel.created_at ? new Date(parcel.created_at).toLocaleDateString('en-GB') : 'N/A');
                      return (
                        <div key={parcel.id || `${parcel.barcode}-${parcel.round_id}-${displayDate}-drop`} className={`p-3 rounded-md border ${parcel.is_recovered ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                          <div className="flex flex-col sm:flex-row justify-between items-start">
                            <div className="flex-1 mb-2 sm:mb-0">
                              <div className="flex items-center gap-2 mb-1">
                                <a href={`https://www.evri.com/track/parcel/${parcel.barcode}/details`} target="_blank" rel="noopener noreferrer" className="font-mono text-sm text-blue-600 hover:underline flex items-center gap-1"> {parcel.barcode} <ExternalLink size={14}/> </a>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ parcel.is_recovered ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800' }`}> {parcel.is_recovered ? 'Recovered' : 'Missing'} </span>
                              </div>
                              <p className="text-xs text-gray-600"> Date: {displayDate} • Courier: {courierInfo?.name || parcel.courier_id || 'N/A'} • Sorter: {sorterInfo?.name || parcel.sorter_team_member_id || 'N/A'} • Client: {clientInfo?.name || parcel.client_id} • Scanned: {new Date(parcel.time_scanned).toLocaleTimeString('en-GB')} </p>
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
