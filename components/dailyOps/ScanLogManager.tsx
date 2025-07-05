// components/dailyOps/ScanLogManager.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useSharedState } from '../../hooks/useSharedState';
import { Save, Trash2 } from 'lucide-react';
import Button from '../shared/Button';
import { TODAY_DATE_STRING } from '../../constants';


const ScanLogManager: React.FC = () => {
  const { scanLogs, setScanLogs, team, subDepots, hhtLogins, hhtAssets, addScanLog: apiAddScanLog } = useSharedState();

  const [tempScanDate, setTempScanDate] = useState<string>(TODAY_DATE_STRING);
  const [tempScanUser, setTempScanUser] = useState<string>('');
  const [tempScanSubDepot, setTempScanSubDepot] = useState<number>(() => 
    subDepots.length > 0 ? subDepots[0].id : 0
  );
  const [tempScanHhtLogin, setTempScanHhtLogin] = useState<string>('');
  const [tempScanCount, setTempScanCount] = useState<number>(0);
  const [tempScanHhtSerial, setTempScanHhtSerial] = useState<string>('');
  const [scanPhotoFile, setScanPhotoFile] = useState<File | null>(null);
  const [tempScanNotes, setTempScanNotes] = useState<string>('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (subDepots.length > 0 && (tempScanSubDepot === 0 || !subDepots.find(sd => sd.id === tempScanSubDepot))) {
      setTempScanSubDepot(subDepots[0].id);
    }
  }, [subDepots, tempScanSubDepot]);

  useEffect(() => {
    const currentValidLogins = hhtLogins.filter(l => l.sub_depot_id === tempScanSubDepot);
    if (tempScanHhtLogin && !currentValidLogins.some(l => l.login_id === tempScanHhtLogin)) {
      setTempScanHhtLogin(''); 
    }
  }, [tempScanSubDepot, hhtLogins, tempScanHhtLogin]);

  useEffect(() => {
    const currentValidSerials = hhtAssets.filter(a => a.status === 'Active' && (a.assigned_to_team_member_id === tempScanUser || !a.assigned_to_team_member_id || tempScanUser === ''));
    if (tempScanHhtSerial && !currentValidSerials.some(s => s.serial_number === tempScanHhtSerial)) {
      setTempScanHhtSerial(''); 
    }
  }, [tempScanUser, hhtAssets, tempScanHhtSerial]);


  const handleSaveScanLog = async () => {
    if (!tempScanUser || !tempScanDate || !tempScanSubDepot || !tempScanHhtLogin || tempScanCount <=0 || !tempScanHhtSerial) {
      alert('All fields (Date, User, Sub Depot, HHT Login, Total Scanned > 0, HHT Serial) are required.');
      return;
    }
    
    const formDataInstance = new FormData();
    formDataInstance.append('date', tempScanDate);
    formDataInstance.append('user_id_team_member', tempScanUser);
    formDataInstance.append('sub_depot_id', String(tempScanSubDepot));
    formDataInstance.append('hht_login_id', tempScanHhtLogin);
    formDataInstance.append('total_scanned', String(tempScanCount));
    formDataInstance.append('hht_serial', tempScanHhtSerial);
    if (tempScanNotes.trim()) formDataInstance.append('notes', tempScanNotes.trim());
    if (scanPhotoFile) {
        formDataInstance.append('scanImage', scanPhotoFile);
    }

    const savedLog = await apiAddScanLog(formDataInstance);

    if (savedLog) {
        setTempScanDate(TODAY_DATE_STRING);
        setTempScanUser('');
        setTempScanSubDepot(subDepots[0]?.id || 0);
        setTempScanHhtLogin('');
        setTempScanCount(0);
        setTempScanHhtSerial('');
        setScanPhotoFile(null);
        setTempScanNotes('');
        setImagePreview(null);
        alert('Scan Log Saved successfully!');
    } else {
        alert('Failed to save scan log. Check console for errors.');
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setScanPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setScanPhotoFile(null);
      setImagePreview(null);
    }
  };


  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6 max-w-lg mx-auto">
        <h2 className="text-xl font-semibold mb-6">Add HHT Scan Log</h2>
        <div className="space-y-4">
          <div><label htmlFor="scanDate" className="block text-sm font-medium text-gray-700">Date</label><input type="date" id="scanDate" value={tempScanDate} onChange={e=>setTempScanDate(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2" max={TODAY_DATE_STRING}/></div>
          <div><label htmlFor="scanUser" className="block text-sm font-medium text-gray-700">User (Sorter/DUC)</label><select id="scanUser" value={tempScanUser} onChange={e=>setTempScanUser(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"><option value="">-- Select User --</option>{team.filter(m => m.position === 'Sorter' || m.position === 'DUC').sort((a,b) => a.name.localeCompare(b.name)).map(m=><option key={m.id} value={m.id}>{m.name} ({m.id})</option>)}</select></div>
          <div><label htmlFor="scanSubDepot" className="block text-sm font-medium text-gray-700">Sub Depot</label><select id="scanSubDepot" value={tempScanSubDepot} onChange={e=>setTempScanSubDepot(parseInt(e.target.value))} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2">{subDepots.sort((a,b) => a.name.localeCompare(b.name)).map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
          <div><label htmlFor="scanHhtLogin" className="block text-sm font-medium text-gray-700">HHT Login</label><select id="scanHhtLogin" value={tempScanHhtLogin} onChange={e=>setTempScanHhtLogin(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"><option value="">-- Select Login --</option>{hhtLogins.filter(l=>l.sub_depot_id===tempScanSubDepot).map(l=><option key={l.login_id} value={l.login_id}>{l.login_id}</option>)}</select></div>
          <div><label htmlFor="scanCount" className="block text-sm font-medium text-gray-700">Total Scanned</label><input type="number" id="scanCount" min={1} value={tempScanCount} onChange={e=>setTempScanCount(parseInt(e.target.value)||0)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"/></div>
          <div><label htmlFor="scanHhtSerial" className="block text-sm font-medium text-gray-700">HHT Serial</label><select id="scanHhtSerial" value={tempScanHhtSerial} onChange={e=>setTempScanHhtSerial(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"><option value="">-- Select HHT --</option>{hhtAssets.filter(a=>a.status==='Active' && (a.assigned_to_team_member_id === tempScanUser || !a.assigned_to_team_member_id || tempScanUser === '')).map(a=><option key={a.serial_number} value={a.serial_number}>{a.serial_number}</option>)}</select></div>
          <div><label htmlFor="scanPhoto" className="block text-sm font-medium text-gray-700">Photo (e.g., HHT screen)</label><input type="file" id="scanPhoto" accept="image/*" onChange={handleFileChange} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>{imagePreview && <img src={imagePreview} alt="Scan Log Preview" className="mt-2 w-24 h-24 object-cover rounded-md border"/>}</div>
          <div><label htmlFor="scanNotes" className="block text-sm font-medium text-gray-700">Notes</label><textarea id="scanNotes" value={tempScanNotes} onChange={e=>setTempScanNotes(e.target.value)} rows={2} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"/></div>
          <div className="flex justify-end">
            <Button onClick={handleSaveScanLog} variant="primary" leftIcon={Save}>Save Scan Log</Button>
          </div>
        </div>
      </div>

      {scanLogs.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mt-8 max-w-4xl mx-auto">
          <h3 className="text-lg font-semibold mb-4">Scan Logs List (Recent First)</h3>
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {['ID', 'Date', 'User', 'Sub Depot', 'HHT Login', 'Total Scans', 'HHT Serial', 'Photo', 'Notes', 'Actions'].map(header => (
                    <th key={header} className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {scanLogs.map(sl=>(
                  <tr key={sl.id} className="hover:bg-gray-50">
                    <td className="p-3 whitespace-nowrap">{sl.id?.slice(-6)}</td>
                    <td className="p-3 whitespace-nowrap">{sl.date}</td>
                    <td className="p-3 whitespace-nowrap">{team.find(u=>u.id === sl.user_id_team_member)?.name || sl.user_id_team_member}</td>
                    <td className="p-3 whitespace-nowrap">{subDepots.find(sd=>sd.id===sl.sub_depot_id)?.name || sl.sub_depot_id}</td>
                    <td className="p-3 whitespace-nowrap">{sl.hht_login_id}</td>
                    <td className="p-3 text-center">{sl.total_scanned}</td>
                    <td className="p-3 whitespace-nowrap">{sl.hht_serial}</td>
                    <td className="p-3">{sl.photo_url ? (<img src={sl.photo_url} alt="Scan Log" className="w-16 h-16 object-cover rounded-md border" />) : ('—')}</td>
                    <td className="p-3 max-w-xs truncate" title={sl.notes || undefined}>{sl.notes || '—'}</td>
                    <td className="p-3 whitespace-nowrap">
                      <Button 
                        onClick={()=>{if(confirm(`Delete scan log ${sl.id?.slice(-6)}?`))setScanLogs(prev => prev.filter(log => log.id !== sl.id)); alert('Delete from API not implemented.');}} 
                        variant="ghost" 
                        size="sm"
                        className="text-red-500 hover:text-red-700"
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
    </div>
  );
};

export default ScanLogManager;