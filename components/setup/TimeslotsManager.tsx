
import React, { useState } from 'react';
import { useSharedState } from '../../hooks/useSharedState';
import { TimeslotTemplate, TimeslotAssignment } from '../../types';
import Button from '../shared/Button';
import Modal from '../shared/Modal';
import { Plus, Edit, Trash2, Printer, CalendarDays } from 'lucide-react';
import { TODAY_DATE_STRING } from '../../constants';
import { printHtmlStringToNewWindow } from '../../utils/printUtils'; 
import { getTimeslotCapacity } from '../../utils/timeslotUtils';


const TimeslotsManager: React.FC = () => {
  const { 
    timeslotTemplates, subDepots, rounds, timeslotAssignments,
    addTimeslotTemplate, updateTimeslotTemplate, deleteTimeslotTemplate, 
  } = useSharedState();

  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TimeslotTemplate | null>(null);
  const [currentTemplate, setCurrentTemplate] = useState<Partial<TimeslotTemplate>>({});
  const [slotsString, setSlotsString] = useState<string>('');
  const [templateFormError, setTemplateFormError] = useState<string | null>(null);

  const [assignmentDate, setAssignmentDate] = useState<string>(TODAY_DATE_STRING);

  const handleOpenTemplateModal = (template?: TimeslotTemplate) => {
    setTemplateFormError(null);
    if (template) {
      setEditingTemplate(template);
      setCurrentTemplate(template);
      setSlotsString(template.slots.join(', '));
    } else {
      setEditingTemplate(null);
      setCurrentTemplate({ sub_depot_id: subDepots[0]?.id || null, max_capacity_per_slot: 10, is_default: false });
      setSlotsString('09:00, 09:30, 10:00, 10:30, 11:00, 11:30, 12:00'); 
    }
    setIsTemplateModalOpen(true);
  };

  const handleCloseTemplateModal = () => {
    setIsTemplateModalOpen(false);
    setEditingTemplate(null);
    setCurrentTemplate({});
    setSlotsString('');
    setTemplateFormError(null);
  };

  const handleTemplateChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setCurrentTemplate(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : (name === 'sub_depot_id' || name === 'max_capacity_per_slot') ? (value ? parseInt(value) : null) : value 
    }));
  };
  
  const handleSlotsStringChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlotsString(e.target.value);
  };

  const handleTemplateSubmit = async () => {
    setTemplateFormError(null);
    if (!currentTemplate.name?.trim() || currentTemplate.sub_depot_id === undefined || !slotsString.trim() || !currentTemplate.max_capacity_per_slot) {
      setTemplateFormError('Name, Sub-Depot, Slots string, and Max Capacity are required.');
      return;
    }
    const parsedSlots = slotsString.split(',')
                                  .map(s => s.trim())
                                  .filter(s => /^\d{2}:\d{2}$/.test(s)) 
                                  .sort();
    if (parsedSlots.length === 0) {
      setTemplateFormError('Valid time slots (HH:MM, comma-separated) are required.');
      return;
    }

    const templateToSave: Omit<TimeslotTemplate, 'id'| 'createdAt' | 'updatedAt'> & {id?: string} = {
      name: currentTemplate.name.trim(),
      sub_depot_id: Number(currentTemplate.sub_depot_id), // Can be null if global
      slots: parsedSlots,
      max_capacity_per_slot: Number(currentTemplate.max_capacity_per_slot),
      is_default: currentTemplate.is_default || false,
      days_of_week: currentTemplate.days_of_week || null,
    };
    if (editingTemplate) {
        templateToSave.id = editingTemplate.id;
    }


    let success;
    if (editingTemplate) {
      success = await updateTimeslotTemplate(editingTemplate.id, templateToSave as TimeslotTemplate); // Cast if ID is definitely present
    } else {
      const dataForAdd: Omit<TimeslotTemplate, 'id' | 'createdAt' | 'updatedAt'> = { ...templateToSave };
      delete (dataForAdd as any).id; 

      if (timeslotTemplates.some(t => t.name.toLowerCase() === templateToSave.name!.toLowerCase() && t.sub_depot_id === templateToSave.sub_depot_id)) {
        setTemplateFormError(`Template with this name for this sub-depot already exists.`);
        return;
      }
      success = await addTimeslotTemplate(dataForAdd);
    }
    if(success){
        handleCloseTemplateModal();
    } else {
        setTemplateFormError('Failed to save template. Please try again.');
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (window.confirm(`Are you sure you want to delete Timeslot Template ${id}? This might affect existing assignments if not handled by backend logic.`)) {
      const success = await deleteTimeslotTemplate(id);
      if(!success){
        alert('Failed to delete template.');
      }
    }
  };

   const printAssignmentsForDate = () => {
    const assignmentsToPrint = timeslotAssignments.filter(a => a.date === assignmentDate);
    if (assignmentsToPrint.length === 0) {
      alert(`No timeslot assignments for ${assignmentDate} to print.`);
      return;
    }
    let html = `<h1>Timeslot Assignments for ${new Date(assignmentDate+'T00:00:00Z').toLocaleDateString('en-GB')}</h1>`;
    subDepots.forEach(sd => {
      const depotAssignments = assignmentsToPrint.filter(a => a.sub_depot_id === sd.id);
      if (depotAssignments.length > 0) {
        html += `<h2>${sd.name}</h2><ul>`;
        const groupedBySlot = depotAssignments.reduce((acc, curr) => {
          acc[curr.timeslot] = acc[curr.timeslot] || [];
          acc[curr.timeslot].push(curr);
          return acc;
        }, {} as Record<string, TimeslotAssignment[]>);

        Object.keys(groupedBySlot).sort().forEach(slot => {
          html += `<li><strong>${slot}</strong>: `;
          html += groupedBySlot[slot].map(a => `R${a.round_id}`).join(', ');
          html += `</li>`;
        });
        html += `</ul>`;
      }
    });
    printHtmlStringToNewWindow(html, `Timeslots_${assignmentDate}`);
  };


  return (
    <div className="space-y-8">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Manage Timeslot Templates</h2>
          <Button onClick={() => handleOpenTemplateModal()} variant="primary" leftIcon={Plus}>
            Add Template
          </Button>
        </div>
        {timeslotTemplates.length === 0 ? (
          <p className="text-gray-500">No timeslot templates configured yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr><th className="p-3 text-left">Name</th><th className="p-3 text-left">Sub-Depot</th><th className="p-3 text-left">Slots</th><th className="p-3 text-left">Capacity/Slot</th><th className="p-3 text-left">Default?</th><th className="p-3 text-left">Actions</th></tr></thead>
              <tbody>
                {timeslotTemplates.sort((a,b)=>a.name.localeCompare(b.name)).map(t => (
                  <tr key={t.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">{t.name}</td>
                    <td className="p-3">{subDepots.find(sd=>sd.id === t.sub_depot_id)?.name || (t.sub_depot_id === null ? 'Global' : t.sub_depot_id)}</td>
                    <td className="p-3 text-xs truncate max-w-sm" title={t.slots.join(', ')}>{t.slots.join(', ')}</td>
                    <td className="p-3 text-center">{t.max_capacity_per_slot}</td>
                    <td className="p-3 text-center">{t.is_default ? 'Yes' : 'No'}</td>
                    <td className="p-3 space-x-2"><Button onClick={() => handleOpenTemplateModal(t)} variant="ghost" size="sm"><Edit size={16} /></Button><Button onClick={() => handleDeleteTemplate(t.id)} variant="ghost" size="sm" className="text-red-600"><Trash2 size={16} /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal 
        isOpen={isTemplateModalOpen} 
        onClose={handleCloseTemplateModal} 
        title={editingTemplate ? 'Edit Timeslot Template' : 'Add Timeslot Template'} 
        size="xl"
        footer={
          <>
            <Button variant="outline" onClick={handleCloseTemplateModal}>Cancel</Button>
            <Button variant="primary" onClick={handleTemplateSubmit}>{editingTemplate ? 'Save Changes' : 'Add Template'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div><label htmlFor="tmpl-name" className="block text-sm font-medium">Template Name</label><input type="text" name="name" id="tmpl-name" value={currentTemplate.name || ''} onChange={handleTemplateChange} className="mt-1 block w-full p-2 border rounded-md" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label htmlFor="tmpl-sub_depot_id" className="block text-sm font-medium">Sub-Depot</label><select name="sub_depot_id" id="tmpl-sub_depot_id" value={currentTemplate.sub_depot_id === null ? '' : String(currentTemplate.sub_depot_id || '')} onChange={handleTemplateChange} className="mt-1 block w-full p-2 border rounded-md"><option value="">Global (No Sub-Depot)</option>{subDepots.map(sd => <option key={sd.id} value={sd.id}>{sd.name}</option>)}</select></div>
            <div><label htmlFor="tmpl-max_capacity_per_slot" className="block text-sm font-medium">Max Capacity per Slot</label><input type="number" name="max_capacity_per_slot" id="tmpl-max_capacity_per_slot" value={currentTemplate.max_capacity_per_slot || ''} onChange={handleTemplateChange} min="1" className="mt-1 block w-full p-2 border rounded-md" /></div>
          </div>
          <div><label htmlFor="tmpl-slotsString" className="block text-sm font-medium">Slots (HH:MM, comma-separated)</label><input type="text" name="slotsString" id="tmpl-slotsString" value={slotsString} onChange={handleSlotsStringChange} className="mt-1 block w-full p-2 border rounded-md" placeholder="e.g. 09:00, 09:30, 10:00"/></div>
          <div className="flex items-center"><input type="checkbox" name="is_default" id="tmpl-is_default" checked={currentTemplate.is_default || false} onChange={handleTemplateChange} className="h-4 w-4 rounded"/><label htmlFor="tmpl-is_default" className="ml-2 text-sm font-medium">Set as Default for this Sub-Depot</label></div>
          {templateFormError && <p className="text-sm text-red-600">{templateFormError}</p>}
        </div>
      </Modal>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <h2 className="text-xl font-semibold">Manage Timeslot Assignments</h2>
          <div className="flex items-center gap-2">
            <label htmlFor="assignment-date" className="text-sm font-medium">Date:</label>
            <input type="date" id="assignment-date" value={assignmentDate} onChange={e => setAssignmentDate(e.target.value)} className="p-2 border rounded-md text-sm"/>
            <Button onClick={printAssignmentsForDate} variant="outline" size="sm" leftIcon={Printer}>Print Assignments</Button>
          </div>
        </div>
        <p className="text-gray-600 mb-4">Displaying assignments for: <span className="font-semibold">{new Date(assignmentDate+'T00:00:00Z').toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span></p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subDepots.map(sd => {
            const depotAssignments = timeslotAssignments.filter(a => a.date === assignmentDate && a.sub_depot_id === sd.id);
            const template = timeslotTemplates.find(t => t.sub_depot_id === sd.id && t.is_default) || timeslotTemplates.find(t => t.sub_depot_id === null && t.is_default); // Fallback to global default
            
            return (
              <div key={sd.id} className="border p-4 rounded-lg bg-gray-50">
                <h3 className="font-semibold text-lg mb-3 text-gray-700">{sd.name}</h3>
                {template ? (
                  template.slots.map(slot => {
                    const capacity = getTimeslotCapacity(assignmentDate, sd.id, slot, timeslotAssignments, timeslotTemplates, subDepots);
                    const assignedRoundsToSlot = depotAssignments.filter(a => a.timeslot === slot);
                    return (
                      <div key={slot} className={`p-2 mb-2 rounded border ${capacity.used > capacity.max ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white'}`}>
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-medium">{slot}</span>
                          <span className={`text-xs ${capacity.used > capacity.max ? 'text-red-600 font-bold' : 'text-gray-500'}`}>{capacity.used} / {capacity.max}</span>
                        </div>
                        {assignedRoundsToSlot.length > 0 && (
                          <div className="mt-1 text-xs text-gray-600">
                            Rounds: {assignedRoundsToSlot.map(a => `R${a.round_id}`).join(', ')}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : <p className="text-xs text-gray-400">No default template applicable for this sub-depot.</p>}
                 {depotAssignments.length === 0 && !template && <p className="text-sm text-gray-400 text-center py-2">No assignments or template for this day.</p>}
              </div>
            );
          })}
        </div>
        <p className="text-sm text-gray-500 mt-6 text-center">Full manual assignment (drag & drop) modal is planned for future implementation.</p>
      </div>

    </div>
  );
};

export default TimeslotsManager;
