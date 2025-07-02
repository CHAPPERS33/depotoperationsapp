
import { TimeslotAssignment, TimeslotTemplate, SubDepot } from '../types';

export const getTimeslotAssignmentsForDate = (
  date: string, 
  timeslotAssignments: TimeslotAssignment[],
  subDepotId?: number
): TimeslotAssignment[] => {
  return timeslotAssignments.filter(assignment => 
    assignment.date === date && 
    (subDepotId === undefined || assignment.sub_depot_id === subDepotId)
  );
};

export const getTimeslotTemplateForSubDepot = (
  subDepotId: number, 
  timeslotTemplates: TimeslotTemplate[],
  subDepots: SubDepot[] 
): TimeslotTemplate | null => {
  let template = timeslotTemplates.find(t => t.sub_depot_id === subDepotId && t.is_default);
  if (!template) {
    const subDepotInfo = subDepots.find(sd => sd.id === subDepotId);
    if (subDepotInfo?.name.includes('Edmonton')) {
      template = timeslotTemplates.find(t => t.id === 'EDM_STANDARD');
    } else if (subDepotInfo?.name.includes('Barking')) {
      template = timeslotTemplates.find(t => t.id === 'BRK_STANDARD');
    }
  }
  return template || null;
};

export const getTimeslotCapacity = (
  date: string, 
  subDepotId: number, 
  timeslot: string,
  timeslotAssignments: TimeslotAssignment[],
  timeslotTemplates: TimeslotTemplate[],
  subDepotsList?: SubDepot[] 
): { used: number; max: number } => {
  const assignments = timeslotAssignments.filter(a => 
    a.date === date && 
    a.sub_depot_id === subDepotId && 
    a.timeslot === timeslot
  );
  
  const template = subDepotsList ? getTimeslotTemplateForSubDepot(subDepotId, timeslotTemplates, subDepotsList) : timeslotTemplates.find(t => t.sub_depot_id === subDepotId && t.is_default); 
  const maxCapacity = template?.max_capacity_per_slot || 40; 
  
  return { used: assignments.length, max: maxCapacity };
};

export const getTimeslotColorForSubDepot = (subDepotId: number, subDepots: SubDepot[]): string => {
  const subDepotInfo = subDepots.find(sd => sd.id === subDepotId);
  if (subDepotInfo?.name.includes('Edmonton')) return 'blue';
  if (subDepotInfo?.name.includes('Barking')) return 'green';
  return 'gray';
};

export const getTimeslotForRound = (
  roundId: string, 
  date: string,
  timeslotAssignments: TimeslotAssignment[]
): string | null => {
  const assignment = timeslotAssignments.find(a => a.round_id === roundId && a.date === date ); 
  return assignment?.timeslot || null;
};
