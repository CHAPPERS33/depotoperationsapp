
// components/dailyOps/CageAuditManager.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSharedState } from '../../hooks/useSharedState';
import { CageAuditEntry, MissortedParcelDetail, Client } from '../../types';
import Button from '../shared/Button';
import { Plus, Save, Trash2, UploadCloud, XCircle, Image as ImageIcon, CheckCircle, AlertTriangle } from 'lucide-react';
import { TODAY_DATE_STRING } from '../../constants';

const MAX_MISSORTS = 5;
const MAX_IMAGES = 5;

// Define a type for the form data that explicitly allows client_id to be a string for the "Add New" placeholder
interface MissortFormData extends Partial<Omit<MissortedParcelDetail, 'client_id'>> {
    client_id: number | string; // Allow string for "-1" (Add New)
    client_name?: string;
}

type CageAuditFormData = Partial<Omit<CageAuditEntry, 'id' | 'createdAt' | 'updatedAt' | 'images' | 'total_missorts_found' | 'drop_number' | 'missorted_parcels'>> & {
    newClientName?: string;
    tempMissortImageFiles?: File[];
    missorted_parcels: Array<MissortFormData>; 
};


const CageAuditManager: React.FC = () => {
  const {
    team,
    subDepots,
    rounds,
    clients,
    addClient: apiAddClient,
    cageAudits = [], 
    addCageAudit,
  } = useSharedState();

  const initialFormState: CageAuditFormData = {
    date: TODAY_DATE_STRING,
    team_member_id: '',
    sub_depot_id: subDepots[0]?.id || 0,
    round_id: "", 
    total_parcels_in_cage: 0,
    missorted_parcels: [],
    missortImageUrls: [], 
    tempMissortImageFiles: [], 
    notes: '',
    newClientName: '',
  };

  const [formData, setFormData] = useState<CageAuditFormData>(initialFormState);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const availableSortersAndDucs = useMemo(() =>
    team.filter(tm => tm.position === 'Sorter' || tm.position === 'DUC'),
    [team]
  );

  const availableRoundsForSubDepot = useMemo(() =>
    rounds.filter(r => r.sub_depot_id === formData.sub_depot_id).sort((a,b) => a.id.localeCompare(b.id)),
    [rounds, formData.sub_depot_id]
  );

  useEffect(() => {
    if (formData.sub_depot_id) {
        if (!formData.round_id || !availableRoundsForSubDepot.some(r => r.id === formData.round_id)) {
            setFormData(prev => ({ ...prev, round_id: availableRoundsForSubDepot[0]?.id || "" })); 
        }
    }
  }, [formData.sub_depot_id, availableRoundsForSubDepot]);


  const selectedRoundDetails = useMemo(() =>
    rounds.find(r => r.id === formData.round_id), 
    [rounds, formData.round_id]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: (name === 'sub_depot_id' || name === 'total_parcels_in_cage') ? parseInt(value) || 0 : value, 
    }));
  };

  const handleMissortChange = (index: number, field: keyof MissortFormData, value: string) => {
    const updatedMissorts = [...(formData.missorted_parcels || [])];
    if (updatedMissorts[index]) {
      const currentEntry = { ...updatedMissorts[index] };
      if (field === 'client_id') {
        currentEntry[field] = value === "-1" ? "-1" : parseInt(value) || 0; // Handle "-1" for new client
      } else {
        (currentEntry as any)[field] = value;
      }
      updatedMissorts[index] = currentEntry;
      setFormData(prev => ({ ...prev, missorted_parcels: updatedMissorts }));
    }
  };

  const addMissortEntry = () => {
    if ((formData.missorted_parcels?.length || 0) < MAX_MISSORTS) {
      setFormData(prev => ({
        ...prev,
        missorted_parcels: [...(prev.missorted_parcels || []), { barcode: '', client_id: 0, client_name: '' }],
      }));
    }
  };

  const removeMissortEntry = (index: number) => {
    setFormData(prev => ({
      ...prev,
      missorted_parcels: (prev.missorted_parcels || []).filter((_, i) => i !== index),
    }));
  };
  
  const handleAddNewClientForMissort = async (index: number) => {
    if (!formData.newClientName?.trim()) {
      alert('New client name cannot be empty.');
      return;
    }
    const newClientData: Omit<Client, 'id'|'createdAt'|'updatedAt'> = { name: formData.newClientName.trim(), is_high_priority: false };
    if (clients.some(c => c.name.toLowerCase() === newClientData.name.toLowerCase())) {
      alert(`Client "${newClientData.name}" already exists. Please select it from the list.`);
      return;
    }
    const savedClient = await apiAddClient(newClientData);
    if(savedClient) {
        const updatedMissorts = [...(formData.missorted_parcels || [])];
        if (updatedMissorts[index]) {
        updatedMissorts[index] = { ...updatedMissorts[index], client_id: savedClient.id, client_name: savedClient.name };
        setFormData(prev => ({ ...prev, missorted_parcels: updatedMissorts, newClientName: '' }));
        }
    } else {
        alert("Failed to add new client via missort form.");
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if ((formData.tempMissortImageFiles?.length || 0) + files.length > MAX_IMAGES) {
      setFormError(`You can upload a maximum of ${MAX_IMAGES} images.`);
      return;
    }
    setFormError(null);

    const newImagePreviewsArray: string[] = [];
    const newFilesArray = [...(formData.tempMissortImageFiles || [])];

    files.forEach((file: File) => { // Explicitly type file here
      newFilesArray.push(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        newImagePreviewsArray.push(reader.result as string);
        if (newImagePreviewsArray.length === files.length) {
          setImagePreviews(prev => [...prev, ...newImagePreviewsArray]);
        }
      };
      reader.readAsDataURL(file); 
    });
    setFormData(prev => ({ ...prev, tempMissortImageFiles: newFilesArray }));
    e.target.value = ''; 
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      tempMissortImageFiles: (prev.tempMissortImageFiles || []).filter((_, i) => i !== index),
    }));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!formData.date || !formData.team_member_id || !formData.sub_depot_id || !formData.round_id || formData.total_parcels_in_cage === undefined) {
      setFormError('Date, Sorter/DUC, Sub Depot, Round, and Total Parcels are required.');
      return;
    }
    if (formData.total_parcels_in_cage < 0) {
        setFormError('Total parcels cannot be negative.');
        return;
    }
    const validMissorts = formData.missorted_parcels?.filter(mp => mp.barcode && mp.barcode.trim().length === 16 && mp.client_id && mp.client_id !== 0 && mp.client_id !== "-1") || [];
    const numberOfMissorts = validMissorts.length;
    
    if (numberOfMissorts > formData.total_parcels_in_cage) {
      setFormError('Number of valid missorted entries cannot exceed total parcels in cage.');
      return;
    }
     if (formData.missorted_parcels?.some(mp => String(mp.client_id) === "-1")) {
      setFormError('Please save or remove any "Add New Client" selections before submitting.');
      return;
    }


    const formDataInstance = new FormData();
    formDataInstance.append('date', formData.date);
    formDataInstance.append('teamMemberId', formData.team_member_id); 
    formDataInstance.append('subDepotId', String(formData.sub_depot_id)); 
    formDataInstance.append('roundId', formData.round_id); 
    formDataInstance.append('drop', String(selectedRoundDetails?.drop_number || 0));
    formDataInstance.append('totalParcelsInCage', String(formData.total_parcels_in_cage)); 
    
    const missortedParcelsForApi = validMissorts.map(mp => ({
        barcode: mp.barcode!,
        client_id: Number(mp.client_id), 
        reason: mp.reason
    }));
    formDataInstance.append('missortedParcels', JSON.stringify(missortedParcelsForApi));

    if(formData.notes?.trim()) formDataInstance.append('notes', formData.notes.trim());

    (formData.tempMissortImageFiles || []).forEach((file, index) => {
        formDataInstance.append(`missortImages[${index}]`, file);
    });
    
    const result = await addCageAudit(formDataInstance);

    if (result) {
        setFormSuccess('Cage audit submitted successfully!');
        setFormData(initialFormState);
        setImagePreviews([]);
        setFormData(prev => ({ ...prev, sub_depot_id: subDepots[0]?.id || 0}));
    } else {
        setFormError('Failed to submit cage audit. Check API logs.');
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        <h2 className="text-xl font-semibold text-gray-800 border-b pb-3">Log Cage Audit</h2>

        {formError && <div className="p-3 bg-red-100 text-red-700 border border-red-300 rounded-md text-sm flex items-center gap-2"><AlertTriangle size={18}/>{formError}</div>}
        {formSuccess && <div className="p-3 bg-green-100 text-green-700 border border-green-300 rounded-md text-sm flex items-center gap-2"><CheckCircle size={18}/>{formSuccess}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div><label htmlFor="date" className="block text-sm font-medium text-gray-700">Date</label><input type="date" name="date" id="date" value={formData.date} onChange={handleInputChange} className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm" required /></div>
          <div><label htmlFor="team_member_id" className="block text-sm font-medium text-gray-700">Sorter/DUC</label><select name="team_member_id" id="team_member_id" value={formData.team_member_id} onChange={handleInputChange} className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm" required><option value="">-- Select Member --</option>{availableSortersAndDucs.map(tm => <option key={tm.id} value={tm.id}>{tm.name}</option>)}</select></div>
          <div><label htmlFor="sub_depot_id" className="block text-sm font-medium text-gray-700">Sub Depot</label><select name="sub_depot_id" id="sub_depot_id" value={String(formData.sub_depot_id)} onChange={handleInputChange} className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm" required>{subDepots.map(sd => <option key={sd.id} value={sd.id}>{sd.name}</option>)}</select></div>
          <div><label htmlFor="round_id" className="block text-sm font-medium text-gray-700">Round Number</label><select name="round_id" id="round_id" value={formData.round_id} onChange={handleInputChange} className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm" required disabled={availableRoundsForSubDepot.length === 0}><option value="">-- Select Round --</option>{availableRoundsForSubDepot.map(r => <option key={r.id} value={r.id}>{r.id}</option>)}</select></div>
          <div><label className="block text-sm font-medium text-gray-700">Drop</label><input type="text" value={selectedRoundDetails?.drop_number || 'N/A'} className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm bg-gray-100" readOnly /></div>
          <div><label htmlFor="total_parcels_in_cage" className="block text-sm font-medium text-gray-700">Total Parcels in Cage</label><input type="number" name="total_parcels_in_cage" id="total_parcels_in_cage" value={formData.total_parcels_in_cage} onChange={handleInputChange} className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm" min="0" required /></div>
        </div>

        <div className="space-y-3 border-t pt-4">
          <div className="flex justify-between items-center">
             <h3 className="text-md font-semibold text-gray-700">Missorted Parcels ({formData.missorted_parcels?.length || 0} / {MAX_MISSORTS})</h3>
            <Button type="button" onClick={addMissortEntry} variant="outline" size="sm" leftIcon={Plus} disabled={(formData.missorted_parcels?.length || 0) >= MAX_MISSORTS}>Add Missort</Button>
          </div>
          {(formData.missorted_parcels || []).map((missort, index) => (
            <div key={index} className="p-3 border rounded-md bg-gray-50 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-600">Missort #{index + 1}</p>
                <Button type="button" onClick={() => removeMissortEntry(index)} variant="ghost" size="sm" className="text-red-500 hover:text-red-700 -mr-2"><Trash2 size={16}/></Button>
              </div>
              <div><label htmlFor={`missort-barcode-${index}`} className="text-xs text-gray-500">Barcode (16 digits)</label><input type="text" id={`missort-barcode-${index}`} value={missort.barcode || ''} onChange={(e) => handleMissortChange(index, 'barcode', e.target.value.toUpperCase())} className="mt-0.5 block w-full p-1.5 text-sm border-gray-300 rounded-md" maxLength={16} /></div>
              <div><label htmlFor={`missort-client_id-${index}`} className="text-xs text-gray-500">Client</label>
                 <select id={`missort-client_id-${index}`} value={String(missort.client_id || 0)} onChange={(e) => handleMissortChange(index, 'client_id', e.target.value)} className="mt-0.5 block w-full p-1.5 text-sm border-gray-300 rounded-md">
                    <option value="0">-- Select Client --</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    <option value="-1">➕ Add New Client</option>
                 </select>
              </div>
              {String(missort.client_id) === '-1' && ( 
                <div className="mt-1 p-2 bg-blue-50 border rounded-md space-y-1">
                    <input type="text" value={formData.newClientName || ''} onChange={e => setFormData(prev => ({...prev, newClientName: e.target.value}))} placeholder="Enter new client name" className="block w-full p-1.5 text-sm border-gray-300 rounded-md" />
                    <Button type="button" onClick={() => handleAddNewClientForMissort(index)} variant="secondary" size="sm">Save New Client</Button>
                </div>
              )}
            </div>
          ))}
        </div>
        
        <div className="space-y-3 border-t pt-4">
           <h3 className="text-md font-semibold text-gray-700">Images of Missorts ({imagePreviews.length} / {MAX_IMAGES})</h3>
            <div>
                <label htmlFor="missortImages" className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md cursor-pointer hover:border-indigo-500 bg-gray-50 hover:bg-indigo-50 transition-colors">
                    <div className="space-y-1 text-center">
                        <UploadCloud className="mx-auto h-10 w-10 text-gray-400" />
                        <div className="flex text-sm text-gray-600">
                            <span className="relative rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                            Upload files
                            </span>
                            <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB each. Max {MAX_IMAGES} images.</p>
                    </div>
                    <input id="missortImages" name="missortImages" type="file" className="sr-only" multiple accept="image/*" onChange={handleImageUpload} disabled={(formData.tempMissortImageFiles?.length || 0) >= MAX_IMAGES} />
                </label>
            </div>
            {imagePreviews.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mt-2">
              {imagePreviews.map((src, index) => (
                <div key={index} className="relative group">
                  <img src={src} alt={`Missort preview ${index + 1}`} className="w-full h-24 object-cover rounded-md border" />
                  <button type="button" onClick={() => removeImage(index)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-70 group-hover:opacity-100 transition-opacity" aria-label={`Remove image ${index + 1}`}>
                    <XCircle size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t pt-4">
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notes</label>
          <textarea name="notes" id="notes" value={formData.notes} onChange={handleInputChange} rows={3} className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm"></textarea>
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" variant="primary" leftIcon={Save} size="lg">Submit Cage Audit</Button>
        </div>
      </form>

      {cageAudits.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mt-8">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Submitted Cage Audits (Recent First)</h3>
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {['Date', 'Auditor', 'Sub Depot', 'Round (Drop)', 'Total Parcels', '# Missorts', 'Images', 'Notes'].map(header => (
                    <th key={header} className="p-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {cageAudits.map(audit => {
                  const auditor = team.find(tm => tm.id === audit.team_member_id)?.name || audit.team_member_id;
                  const subDepotName = subDepots.find(sd => sd.id === audit.sub_depot_id)?.name || String(audit.sub_depot_id);
                  return (
                    <tr key={audit.id} className="hover:bg-gray-50">
                      <td className="p-2 whitespace-nowrap">{new Date(audit.date + 'T00:00:00Z').toLocaleDateString('en-GB')}</td>
                      <td className="p-2 whitespace-nowrap">{auditor}</td>
                      <td className="p-2 whitespace-nowrap">{subDepotName}</td>
                      <td className="p-2 whitespace-nowrap">R{audit.round_id} (D{audit.drop_number})</td>
                      <td className="p-2 text-center">{audit.total_parcels_in_cage}</td>
                      <td className="p-2 text-center">{audit.missorted_parcels.length}</td>
                      <td className="p-2 text-center">
                        {(audit.missortImageUrls || audit.images)?.length > 0 ? 
                          <span title={`${(audit.missortImageUrls || audit.images).length} image(s)`}>
                            <ImageIcon size={16} className="text-indigo-500 mx-auto" />
                          </span>
                           : '0'}
                      </td>
                      <td className="p-2 whitespace-nowrap max-w-xs truncate" title={audit.notes || undefined}>{audit.notes || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default CageAuditManager;
