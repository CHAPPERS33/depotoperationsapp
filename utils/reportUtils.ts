
import { DUCFinalReport,   RoundEntry, Courier, SubDepot, TeamMember, TimeslotAssignment, Round, ParcelScanEntry } from '../types';

export const getTodaysMissingParcelsSummaryForReport = (
  missingParcelsLog: RoundEntry[], // RoundEntry is based on ParcelScanEntry
  reportDate: string // YYYY-MM-DD
): DUCFinalReport['missing_parcels_summary'] => {
  const dateForFilteringLog = new Date(reportDate + "T00:00:00Z").toLocaleDateString('en-GB');
  const todaysLoggedEntries = missingParcelsLog.filter(p => p.dateAdded === dateForFilteringLog && p.barcode);
  
  const reportParcels: MissingParcelDUCReportContext[] = todaysLoggedEntries.map(logEntry => ({
    scan_entry_id: logEntry.id, // Assuming logEntry.id is the ParcelScanEntry PK
    barcode: logEntry.barcode,
    courier_id: logEntry.courier_id || 'N/A_COURIER', // from ParcelScanEntry
    round_id: logEntry.round_id, // from ParcelScanEntry
    drop_number: logEntry.drop_number, // from ParcelScanEntry
    sub_depot_id: logEntry.sub_depot_id, // from ParcelScanEntry
    sorter_id: logEntry.sorter_team_member_id || 'N/A_SORTER', // from ParcelScanEntry
    time_scanned: logEntry.time_scanned, // from ParcelScanEntry
    recovered: logEntry.is_recovered || false, // from ParcelScanEntry
    client_id: logEntry.client_id, // from ParcelScanEntry
    // UI specific names can be populated here if needed from lookups
    client_name: logEntry.client_name,
    courier_name: logEntry.courier_name,
    sorter_name: logEntry.sorter_name,
    sub_depot_name: logEntry.sub_depot_id ? `Sub ${logEntry.sub_depot_id}`: undefined, // Example
  }));

  const unrecoveredCount = reportParcels.filter(p => !p.recovered).length;
  const totalMissing = reportParcels.length;
  const recoveryRate = totalMissing > 0 ? Math.round(((totalMissing - unrecoveredCount) / totalMissing) * 100) : 0;
  
  return { total_missing: totalMissing, unrecovered: unrecoveredCount, recovery_rate: recoveryRate, parcels: reportParcels };
};

export const getReportStatusForDate = (ducFinalReports: DUCFinalReport[], targetDate: string): DUCFinalReport | undefined => {
  return ducFinalReports.find(report => report.date === targetDate);
};

export const getCourierStats = (
  couriers: Courier[], 
  missingParcelsLog: RoundEntry[], // RoundEntry is ParcelScanEntry based
  targetDateYYYYMMDD: string // YYYY-MM-DD format
) => {
  const targetDateGB = new Date(targetDateYYYYMMDD + "T00:00:00Z").toLocaleDateString('en-GB');
  return couriers.map(courier => {
    const courierMissingParcelsForDate = missingParcelsLog.filter(
      p => p.courier_id === courier.id && p.dateAdded === targetDateGB && p.barcode
    );
    const unrecovered = courierMissingParcelsForDate.filter(p => !p.is_recovered).length;
    const recoveredCount = courierMissingParcelsForDate.length - unrecovered;
    const involvedRounds = [...new Set(courierMissingParcelsForDate.map(p => p.round_id))]; 
    return {
      id: courier.id,
      name: courier.name,
      rounds: involvedRounds,
      totalMissing: courierMissingParcelsForDate.length,
      unrecovered: unrecovered,
      recovered: recoveredCount,
      recoveryRate: courierMissingParcelsForDate.length > 0 ? Math.round((recoveredCount / courierMissingParcelsForDate.length) * 100) : 0
    };
  }).sort((a, b) => b.unrecovered - a.unrecovered || b.totalMissing - a.totalMissing);
};

// Add other report-related utility functions here if needed
