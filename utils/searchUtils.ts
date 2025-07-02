
import { Courier, Round, RoundEntry, SubDepot, TeamMember, TimeslotAssignment, TimeslotTemplate, CourierProfileData, RoundProfileData, DropProfileData, ParcelScanEntry } from '../types';
import { getTimeslotForRound } from './timeslotUtils'; 
import { TODAY_DATE_STRING, TODAY_DATE_STRING_GB } from '../constants';

export const searchCouriersLocal = (query: string, couriers: Courier[]): Courier[] => {
  if (!query.trim()) return [];
  const searchTerm = query.toLowerCase();
  return couriers.filter(courier => 
    courier.id.toLowerCase().includes(searchTerm) || 
    courier.name.toLowerCase().includes(searchTerm)
  ).slice(0, 5);
};

export const searchRoundsLocal = (query: string, rounds: Round[]): Round[] => {
  if (!query.trim()) return [];
  const searchTerm = query.toLowerCase().replace('round', '').trim();
  return rounds.filter(round => 
    round.id.toLowerCase().includes(searchTerm) 
  ).slice(0, 5);
};

export const searchDropsLocal = (query: string, rounds: Round[]): { dropNumber: number; rounds: Round[]; roundCount: number } | null => {
  if (!query.trim()) return null;
  const searchTerm = query.toLowerCase().replace('drop', '').trim();
  const dropNumber = parseInt(searchTerm);
  if (isNaN(dropNumber)) return null;
  const roundsWithDrop = rounds.filter(round => round.drop_number === dropNumber);
  return { dropNumber, rounds: roundsWithDrop.slice(0, 10), roundCount: roundsWithDrop.length };
};

export const getCourierProfileDetails = (
    courierId: string,
    couriers: Courier[],
    missingParcelsLog: RoundEntry[], // RoundEntry is ParcelScanEntry based
    roundsData: Round[], 
    subDepots: SubDepot[], 
    team: TeamMember[], 
    timeslotAssignments: TimeslotAssignment[],
    timeslotTemplates: TimeslotTemplate[] 
): CourierProfileData | null => {
    const courier = couriers.find(c => c.id === courierId);
    if (!courier) return null;

    const courierParcels = missingParcelsLog.filter(p => p.courier_id === courierId);
    const unrecovered = courierParcels.filter(p => !p.is_recovered);
    const recoveredParcels = courierParcels.filter(p => p.is_recovered);

    const parcelsByDate = courierParcels.reduce((acc, parcel) => {
        const date = parcel.dateAdded || 'Unknown Date';
        if (!acc[date]) acc[date] = [];
        acc[date].push(parcel);
        return acc;
    }, {} as Record<string, ParcelScanEntry[]>); // Use ParcelScanEntry here as RoundEntry is based on it

    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);
    const recentParcels = courierParcels.filter(p => {
        if (!p.dateAdded) return false;
        try {
            const parts = p.dateAdded.split('/');
            if (parts.length === 3) {
                const parcelDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
                return parcelDate >= last7Days;
            }
            return false;
        } catch (e) { return false; }
    });
    
    const flags: string[] = [];
    if (unrecovered.length >= 3) flags.push('High Unrecovered Count');
    if (recentParcels.length >= 3) flags.push('Multiple Recent Issues');
    if (courierParcels.length >= 10) flags.push('High Overall Volume');

    const roundsInvolved = [...new Set(courierParcels.map(p => p.round_id))].sort((a, b) => a.localeCompare(b)); 
    const subDepotsInvolved = [...new Set(courierParcels.map(p => p.sub_depot_id))];

    const todaysCourierRounds = [...new Set(courierParcels
        .filter(p => p.dateAdded === TODAY_DATE_STRING_GB)
        .map(p => p.round_id))];
    
    const todaysTimeslots = todaysCourierRounds.map(roundId => ({
        roundId,
        timeslot: getTimeslotForRound(roundId, TODAY_DATE_STRING, timeslotAssignments)
    })).filter(rt => rt.timeslot);

    return {
        ...courier,
        stats: {
            totalMissing: courierParcels.length,
            unrecovered: unrecovered.length,
            recovered: recoveredParcels.length,
            recoveryRate: courierParcels.length > 0 ? Math.round((recoveredParcels.length / courierParcels.length) * 100) : 0,
            totalCarryForwards: courierParcels.reduce((sum, p) => sum + (p.scan_type === 'CarryForward' ? 1 : 0), 0), // Assuming scan_type indicates carry forward
        },
        parcels: courierParcels.sort((a,b) => {
            const dateA = a.dateAdded ? new Date(a.dateAdded.split('/').reverse().join('-') + "T" + (a.time_scanned || "00:00")).getTime() : 0;
            const dateB = b.dateAdded ? new Date(b.dateAdded.split('/').reverse().join('-') + "T" + (b.time_scanned || "00:00")).getTime() : 0;
            return dateB - dateA;
        }),
        parcelsByDate,
        roundsInvolved,
        subDepotsInvolved,
        flags,
        recentActivityCount: recentParcels.length,
        todaysTimeslots,
    };
};

export const getRoundProfileDetails = (
    roundId: string, 
    rounds: Round[],
    missingParcelsLog: RoundEntry[],
    subDepots: SubDepot[],
    couriers: Courier[],
    team: TeamMember[],
    timeslotAssignments: TimeslotAssignment[],
    timeslotTemplates: TimeslotTemplate[] 
): RoundProfileData | null => {
    const round = rounds.find(r => r.id === roundId); 
    if (!round) return null;

    const subDepotInfo = subDepots.find(s => s.id === round.sub_depot_id);
    const roundParcels = missingParcelsLog.filter(p => p.round_id === roundId); 
    const unrecovered = roundParcels.filter(p => !p.is_recovered);
    const recoveredParcels = roundParcels.filter(p => p.is_recovered);

    const uniqueCourierIds = [...new Set(roundParcels.map(p => p.courier_id))];
    const couriersInvolved = uniqueCourierIds.map(cId => {
        const courierInfo = couriers.find(c => c.id === cId);
        const courierRoundParcels = roundParcels.filter(p => p.courier_id === cId);
        return {
            id: cId,
            name: courierInfo?.name || (cId ?? 'Unknown Courier'),
            parcelsCount: courierRoundParcels.length,
            unrecoveredCount: courierRoundParcels.filter(p => !p.is_recovered).length
        };
    }).filter(c => c.id);

    const uniqueSorterIds = [...new Set(roundParcels.map(p => p.sorter_team_member_id))];
    const sortersInvolved = uniqueSorterIds.map(sId => {
        const sorterInfo = team.find(s => s.id === sId && s.position === 'Sorter');
        const sorterRoundParcels = roundParcels.filter(p => p.sorter_team_member_id === sId);
        return {
            id: sId,
            name: sorterInfo?.name || (sId ?? 'Unknown Sorter'),
            parcelsCount: sorterRoundParcels.length,
            unrecoveredCount: sorterRoundParcels.filter(p => !p.is_recovered).length
        };
    }).filter(s => s.id);

    const parcelsByDate = roundParcels.reduce((acc, parcel) => {
        const date = parcel.dateAdded || 'Unknown Date';
        if (!acc[date]) acc[date] = [];
        acc[date].push(parcel);
        return acc;
    }, {} as Record<string, ParcelScanEntry[]>);

    const flags: string[] = [];
    if (unrecovered.length >= 2) flags.push('High Missing Count on Round');
    if (couriersInvolved.length >= 3) flags.push('Multiple Couriers Involved');
    if (roundParcels.length >= 5) flags.push('Frequently Problematic Round');

    const todaysTimeslot = getTimeslotForRound(roundId, TODAY_DATE_STRING, timeslotAssignments);

    return {
        ...round, 
        subDepotName: subDepotInfo?.name || `Sub Depot ${round.sub_depot_id}`,
        stats: {
            totalMissing: roundParcels.length,
            unrecovered: unrecovered.length,
            recovered: recoveredParcels.length,
            recoveryRate: roundParcels.length > 0 ? Math.round((recoveredParcels.length / roundParcels.length) * 100) : 0,
        },
        parcels: roundParcels.sort((a,b) => {
            const dateA = a.dateAdded ? new Date(a.dateAdded.split('/').reverse().join('-') + "T" + (a.time_scanned || "00:00")).getTime() : 0;
            const dateB = b.dateAdded ? new Date(b.dateAdded.split('/').reverse().join('-') + "T" + (b.time_scanned || "00:00")).getTime() : 0;
            return dateB - dateA;
        }),
        parcelsByDate,
        couriersInvolved,
        sortersInvolved,
        flags,
        todaysTimeslot,
    };
};

export const getDropProfileDetails = (
    dropNumber: number,
    rounds: Round[],
    missingParcelsLog: RoundEntry[],
    subDepots: SubDepot[],
    couriers: Courier[], 
    team: TeamMember[]    
): DropProfileData | null => {
    const roundsWithThisDrop = rounds.filter(r => r.drop_number === dropNumber);
    if (roundsWithThisDrop.length === 0) return null;

    const dropAnalysisByRound = roundsWithThisDrop.map(round => {
        const roundParcelsForThisDrop = missingParcelsLog.filter(p => p.round_id === round.id && p.drop_number === dropNumber); 
        const subDepotInfo = subDepots.find(s => s.id === round.sub_depot_id);
        return {
            roundData: round,
            subDepotName: subDepotInfo?.name || `Sub Depot ${round.sub_depot_id}`,
            parcels: roundParcelsForThisDrop,
            unrecoveredCount: roundParcelsForThisDrop.filter(p => !p.is_recovered).length,
            totalMissingCount: roundParcelsForThisDrop.length
        };
    });

    const totalMissingForDrop = dropAnalysisByRound.reduce((sum, r) => sum + r.totalMissingCount, 0);
    const totalUnrecoveredForDrop = dropAnalysisByRound.reduce((sum, r) => sum + r.unrecoveredCount, 0);
    
    const flags: string[] = [];
    if (totalUnrecoveredForDrop >= 3) flags.push('High Unrecovered Count for this Drop');
    if (dropAnalysisByRound.filter(r => r.totalMissingCount > 0).length >= 2) flags.push('Issue on this Drop across Multiple Rounds');

    return {
        dropNumber,
        roundsInvolvedDetails: dropAnalysisByRound,
        stats: {
            totalRoundsWithThisDrop: roundsWithThisDrop.length,
            affectedRoundsCount: dropAnalysisByRound.filter(r => r.totalMissingCount > 0).length,
            totalMissing: totalMissingForDrop,
            totalUnrecovered: totalUnrecoveredForDrop,
            recoveryRate: totalMissingForDrop > 0 ? Math.round(((totalMissingForDrop - totalUnrecoveredForDrop) / totalMissingForDrop) * 100) : 0,
        },
        flags,
    };
};
