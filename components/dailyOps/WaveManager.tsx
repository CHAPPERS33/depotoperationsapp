// components/dailyOps/WaveManager.tsx
'use client';

import React, { useState } from 'react';
import { useSharedState } from '../../hooks/useSharedState';
import { WaveEntry, Vehicle, VehicleType } from '../../types';
import { Save, Trash2, AlertTriangle } from 'lucide-react';
import Button from '../shared/Button';
import Modal from '../shared/Modal';
import { TODAY_DATE_STRING } from '../../constants';

const WaveManager: React.FC = () => {
  const { waves, setWaves, vehicles, setVehicles, addWaveEntry, addVehicle: apiAddVehicle } = useSharedState();

  const [tempSelectedVehicleId, setTempSelectedVehicleId] = useState<string>('');
  const [showNewVehicleFormInWaves, setShowNewVehicleFormInWaves] = useState<boolean>(false);
  const [newWaveVehicleReg, setNewWaveVehicleReg] = useState<string>('');
  const [newWaveVehicleType, setNewWaveVehicleType] = useState<VehicleType>('Van');
  
  const [tempWaveDate, setTempWaveDate] = useState<string>(TODAY_DATE_STRING);
  const [tempWaveTime, setTempWaveTime] = useState<string>('');
  const [tempWavePalletCount, setTempWavePalletCount] = useState<number | ''>('');
  const [wavePhotoFile, setWavePhotoFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] = useState(false);
  const [waveToDelete, setWaveToDelete] = useState<WaveEntry | null>(null);


  const selectedVehicleDetails = vehicles.find(v => v.id === tempSelectedVehicleId);

  const handleAddNewVehicleForWave = async () => {
    if (!newWaveVehicleReg.trim()) {
      alert("Registration is required for the new vehicle.");
      return;
    }
    if (vehicles.find(v => v.registration.toLowerCase() === newWaveVehicleReg.trim().toLowerCase())) {
      alert("A vehicle with this registration already exists in the main list. Please select it or use a different registration.");
      return;
    }
    const newVId = `V-${Date.now()}`;
    const newV: Omit<Vehicle, 'createdAt' | 'updatedAt'> & {id: string} = { 
        id: newVId, 
        registration: newWaveVehicleReg.trim().toUpperCase(), 
        type: newWaveVehicleType, 
        notes: "Added during wave entry",
        is_active: true 
    };
    const savedVehicle = await apiAddVehicle(newV); // Use shared state function
    if (savedVehicle) {
        setTempSelectedVehicleId(newVId); 
        setShowNewVehicleFormInWaves(false);
    } else {
        alert("Failed to add new vehicle.");
    }
  };

  const handleSaveWave = async () => {
    const vehicleToLog = showNewVehicleFormInWaves 
      ? { registration: newWaveVehicleReg.trim().toUpperCase(), type: newWaveVehicleType } 
      : selectedVehicleDetails;

    if (!vehicleToLog || !vehicleToLog.registration) {
      alert('Please select or add a vehicle for the wave.');
      return;
    }
    
    if (!tempWaveDate || !tempWaveTime || tempWavePalletCount === '' || Number(tempWavePalletCount) <= 0) {
      alert('Please ensure Date, Time, and Pallet Count (>0) are filled.');
      return;
    }

    const formDataInstance = new FormData();
    formDataInstance.append('van_reg', vehicleToLog.registration);
    formDataInstance.append('vehicle_type', vehicleToLog.type);
    formDataInstance.append('date', tempWaveDate);
    formDataInstance.append('time', tempWaveTime);
    formDataInstance.append('pallet_count', String(Number(tempWavePalletCount)));
    if (wavePhotoFile) {
        formDataInstance.append('waveImage', wavePhotoFile);
    }
    
    const savedWave = await addWaveEntry(formDataInstance);

    if (savedWave) {
        setTempSelectedVehicleId('');
        setTempWaveDate(TODAY_DATE_STRING);
        setTempWaveTime('');
        setTempWavePalletCount('');
        setWavePhotoFile(null);
        setImagePreview(null);
        setShowNewVehicleFormInWaves(false);
        setNewWaveVehicleReg('');
        setNewWaveVehicleType('Van');
        alert('Wave entry saved successfully!');
    } else {
        alert('Failed to save wave entry. Check console for errors.');
    }
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setWavePhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setWavePhotoFile(null);
      setImagePreview(null);
    }
  };

  const handleDeleteRequest = (wave: WaveEntry) => {
    setWaveToDelete(wave);
    setIsConfirmDeleteModalOpen(true);
  };

  const confirmDeleteWave = () => {
    if (waveToDelete?.id) {
      // Call API delete, then refresh state via useSharedState
      // For now, local delete and placeholder alert:
      setWaves(prev => prev.filter(w => w.id !== waveToDelete!.id));
      alert(`Wave entry ${waveToDelete.id} deleted (Local). API delete not implemented.`);
    }
    setIsConfirmDeleteModalOpen(false);
    setWaveToDelete(null);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6 max-w-lg mx-auto">
        <h2 className="text-xl font-semibold mb-6">Record Wave Arrival</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="waveVehicleSelect" className="block text-sm font-medium text-gray-700">Vehicle</label>
            <select 
              id="waveVehicleSelect"
              value={tempSelectedVehicleId} 
              onChange={e => { 
                const val = e.target.value; 
                if (val === 'ADD_NEW_VEHICLE') { setShowNewVehicleFormInWaves(true); setNewWaveVehicleReg(''); setNewWaveVehicleType('Van'); } 
                else { setShowNewVehicleFormInWaves(false); } 
                setTempSelectedVehicleId(val); 
              }} 
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"
            >
              <option value="">-- Select Vehicle --</option>
              {vehicles.sort((a,b) => a.registration.localeCompare(b.registration)).map(v => 
                <option key={v.id} value={v.id}>{v.registration} ({v.type})</option>
              )}
              <option value="ADD_NEW_VEHICLE" className="text-blue-600 font-semibold">➕ Add New Vehicle for this wave</option>
            </select>
          </div>

          {showNewVehicleFormInWaves && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-md space-y-3">
              <h4 className="text-sm font-medium text-blue-700">Add New Vehicle Details:</h4>
              <div>
                <label htmlFor="newWaveVehicleReg" className="block text-xs font-medium text-gray-600">Registration</label>
                <input type="text" id="newWaveVehicleReg" value={newWaveVehicleReg} onChange={e=>setNewWaveVehicleReg(e.target.value.toUpperCase())} className="mt-1 border-gray-300 rounded-md shadow-sm px-2 py-1 w-full text-sm"/>
              </div>
              <div>
                <label htmlFor="newWaveVehicleType" className="block text-xs font-medium text-gray-600">Type</label>
                <select id="newWaveVehicleType" value={newWaveVehicleType} onChange={e=>setNewWaveVehicleType(e.target.value as VehicleType)} className="mt-1 border-gray-300 rounded-md shadow-sm px-2 py-1 w-full text-sm">
                  <option value="Van">Van</option><option value="Rigid">Rigid</option><option value="Artic">Artic</option><option value="LGV">LGV</option><option value="HGV">HGV</option><option value="Motorbike">Motorbike</option><option value="Bicycle">Bicycle</option><option value="Other">Other</option>
                </select>
              </div>
              <Button onClick={handleAddNewVehicleForWave} variant="primary" size="sm">Add & Use This Vehicle</Button>
            </div>
          )}

          {(selectedVehicleDetails && !showNewVehicleFormInWaves) && (
            <p className="text-sm text-gray-600">Selected Vehicle Type: <strong>{selectedVehicleDetails.type}</strong></p>
          )}

          <div className="flex gap-4">
            <div className="flex-1">
              <label htmlFor="waveDate" className="block text-sm font-medium text-gray-700">Date</label>
              <input type="date" id="waveDate" value={tempWaveDate} onChange={e => setTempWaveDate(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2" max={TODAY_DATE_STRING}/>
            </div>
            <div className="flex-1">
              <label htmlFor="waveTime" className="block text-sm font-medium text-gray-700">Time</label>
              <input type="time" id="waveTime" value={tempWaveTime} onChange={e => setTempWaveTime(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"/>
            </div>
          </div>
          <div>
            <label htmlFor="wavePalletCount" className="block text-sm font-medium text-gray-700">Pallet Count</label>
            <input 
              type="number" 
              id="wavePalletCount" 
              min="1" 
              value={tempWavePalletCount} 
              onChange={e => {
                const val = e.target.value;
                if (val === '') {
                    setTempWavePalletCount('');
                } else {
                    const num = parseInt(val, 10);
                    if (!isNaN(num) && num >= 0) { 
                        setTempWavePalletCount(num);
                    }
                }
              }} 
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"
              placeholder="e.g. 10"
            />
          </div>
          <div>
            <label htmlFor="wavePhoto" className="block text-sm font-medium text-gray-700">Photo (optional)</label>
            <input type="file" id="wavePhoto" accept="image/*" onChange={handleFileChange} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
            {imagePreview && <img src={imagePreview} alt="Wave Preview" className="mt-2 w-24 h-24 object-cover rounded-md border"/>}
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSaveWave} variant="primary" leftIcon={Save}>Save Wave</Button>
          </div>
        </div>
      </div>

      {waves.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mt-8 max-w-3xl mx-auto">
          <h3 className="text-lg font-semibold mb-4">Existing Wave Entries (Recent First)</h3>
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {['ID', 'Van Reg', 'Type', 'Date/Time', 'Pallets', 'Photo', 'Actions'].map(header => (
                    <th key={header} className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {waves.map(w => (
                  <tr key={w.id} className="hover:bg-gray-50">
                    <td className="p-3 whitespace-nowrap">{w.id.slice(-6)}</td>
                    <td className="p-3 whitespace-nowrap">{w.van_reg}</td>
                    <td className="p-3 whitespace-nowrap">{w.vehicle_type}</td>
                    <td className="p-3 whitespace-nowrap">{w.date} {w.time}</td>
                    <td className="p-3 text-center">{w.pallet_count}</td>
                    <td className="p-3">{w.photo_url ? (<img src={w.photo_url} alt="Wave" className="w-16 h-16 object-cover rounded-md border" />) : ('—')}</td>
                    <td className="p-3 whitespace-nowrap">
                      <Button 
                        onClick={() => handleDeleteRequest(w)} 
                        variant="ghost" 
                        size="sm"
                        className="text-red-500 hover:text-red-700"
                        aria-label={`Delete wave entry for ${w.van_reg}`}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal isOpen={isConfirmDeleteModalOpen} onClose={() => setIsConfirmDeleteModalOpen(false)} title="Confirm Deletion" size="sm">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
          <p className="mt-4 text-gray-700">
            Are you sure you want to delete the wave entry for {waveToDelete?.van_reg} on {waveToDelete?.date} at {waveToDelete?.time}?
          </p>
        </div>
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsConfirmDeleteModalOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={confirmDeleteWave}>Delete</Button>
          </div>
        }
      </Modal>
    </div>
  );
};

export default WaveManager;