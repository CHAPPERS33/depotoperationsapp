
'use client';

import React, { useState, useRef } from 'react';
import { useSharedState } from '../../hooks/useSharedState';
import { Client } from '../../types';
import Button from '../shared/Button';
import Modal from '../shared/Modal';
import { Plus, Edit, Trash2, Star, Upload } from 'lucide-react';

const ClientsManager: React.FC = () => {
  const { clients, addClient, updateClient, deleteClient } = useSharedState();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [currentClient, setCurrentClient] = useState<Partial<Client>>({is_high_priority: false});
  const [formError, setFormError] = useState<string | null>(null);

  const handleOpenModal = (client?: Client) => {
    setFormError(null);
    if (client) {
      setEditingClient(client);
      setCurrentClient(client);
    } else {
      setEditingClient(null);
      setCurrentClient({ is_high_priority: false }); 
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingClient(null);
    setCurrentClient({});
    setFormError(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setCurrentClient(prev => ({ 
        ...prev, 
        [name]: type === 'checkbox' ? checked : value 
    }));
  };

  const handleSubmit = async () => {
    setFormError(null);
    if (!currentClient.name?.trim()) {
      setFormError('Client Name is required.');
      return;
    }

    const clientToSave: Omit<Client, 'id' | 'createdAt' | 'updatedAt'> = {
      name: currentClient.name.trim(),
      code: currentClient.code?.trim().toUpperCase() || undefined,
      is_high_priority: currentClient.is_high_priority || false,
      contact_person: currentClient.contact_person || undefined,
      contact_email: currentClient.contact_email || undefined,
    };

    let success;
    if (editingClient && editingClient.id !== undefined) {
      success = await updateClient(editingClient.id, clientToSave); 
    } else {
      if (clients.some(c => c.name.toLowerCase() === clientToSave.name.toLowerCase())) {
        setFormError(`Client with name "${clientToSave.name}" already exists.`);
        return;
      }
      if (clientToSave.code && clients.some(c => c.code && c.code.toLowerCase() === clientToSave.code!.toLowerCase())) {
        setFormError(`Client with code "${clientToSave.code}" already exists.`);
        return;
      }
      success = await addClient(clientToSave);
    }
    if (success) {
        handleCloseModal();
    } else {
        setFormError('Failed to save client. Please try again.');
    }
  };

  const handleDelete = async (clientId: number) => {
    const clientToDelete = clients.find(c => c.id === clientId);
    if (window.confirm(`Are you sure you want to delete Client: ${clientToDelete?.name}?`)) {
      const success = await deleteClient(clientId);
      if (!success) {
          alert('Failed to delete client. It might be referenced in other records.');
      }
    }
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        let importedClientsData: Partial<Client>[] = [];

        if (file.name.endsWith('.json')) {
          importedClientsData = JSON.parse(content);
        } else if (file.name.endsWith('.csv')) {
          const lines = content.split(/\r\n|\n/).filter(line => line.trim() !== '');
          if (lines.length < 2) throw new Error("CSV file must have a header and at least one data row.");
          
          const headerLine = lines.shift()!;
          const header = headerLine.split(',').map(h => h.trim().toLowerCase().replace(/\s+/g,'_'));
          
          const nameIndex = header.indexOf('name');
          const codeIndex = header.indexOf('code'); 
          const priorityIndex = header.indexOf('is_high_priority');
          const contactPersonIndex = header.indexOf('contact_person');
          const contactEmailIndex = header.indexOf('contact_email');


          if (nameIndex === -1) {
             console.error("CSV must contain 'name' column.");
             alert("CSV Error: Missing required 'name' column.");
             return;
          }
          
          importedClientsData = lines.map(line => {
            const values = line.split(',');
            const client: Partial<Client> = {
              name: values[nameIndex]?.trim(),
              is_high_priority: priorityIndex !== -1 ? ['true', 'yes', '1'].includes(values[priorityIndex]?.trim().toLowerCase()) : false,
            };
            if (codeIndex !== -1 && values[codeIndex]?.trim()) {
              client.code = values[codeIndex]?.trim().toUpperCase();
            }
            if (contactPersonIndex !== -1 && values[contactPersonIndex]?.trim()){
                client.contact_person = values[contactPersonIndex]?.trim();
            }
            if (contactEmailIndex !== -1 && values[contactEmailIndex]?.trim()){
                client.contact_email = values[contactEmailIndex]?.trim();
            }
            return client;
          });
        } else {
          alert("Unsupported file type. Please upload JSON or CSV.");
          return;
        }
        processImportedClients(importedClientsData);
      } catch (error) {
        console.error("Error processing file:", error);
        alert(`Failed to process file. Error: ${(error as Error).message}`);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; 
    }
  };

  const processImportedClients = (importedData: Partial<Client>[]) => {
    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    importedData.forEach(async (client, index) => {
      if (!client.name || !client.name.trim()) {
        errors.push(`Row ${index + 1}: Missing Name.`);
        errorCount++;
        return;
      }
      const clientNameLower = client.name.trim().toLowerCase();
      const clientCodeLower = client.code?.trim().toLowerCase();

      if (clients.some(c => c.name.toLowerCase() === clientNameLower || (c.code && clientCodeLower && c.code.toLowerCase() === clientCodeLower))) {
        skippedCount++;
        return;
      }
      const result = await addClient({
        name: client.name.trim(),
        code: client.code?.trim().toUpperCase() || undefined,
        is_high_priority: client.is_high_priority || false,
        contact_person: client.contact_person || undefined,
        contact_email: client.contact_email || undefined,
      });
      if(result) successCount++; else errorCount++;
    });
    
    setTimeout(()=> {
        let summary = `${successCount} clients imported.`;
        if (skippedCount > 0) summary += ` ${skippedCount} skipped (duplicate name or code).`;
        if (errorCount > 0) summary += ` ${errorCount} had errors.`;
        alert(summary);
        if (errors.length > 0) console.warn("Import errors (Clients):", errors);
    }, 500);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-xl font-semibold">Manage Clients</h2>
        <div className="flex gap-2">
          <input 
            type="file" 
            ref={fileInputRef}
            className="hidden" 
            accept=".csv,.json" 
            onChange={handleFileImport} 
          />
          <Button 
            onClick={() => fileInputRef.current?.click()}
            variant="outline" 
            leftIcon={Upload}
          >
            Import Clients
          </Button>
          <Button onClick={() => handleOpenModal()} variant="primary" leftIcon={Plus}>
            Add Client
          </Button>
        </div>
      </div>

      {clients.length === 0 ? (
        <p className="text-gray-500">No clients configured yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-left font-medium">Name</th>
                <th className="p-3 text-left font-medium">Code</th>
                <th className="p-3 text-left font-medium">High Priority</th>
                <th className="p-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.sort((a,b) => a.name.localeCompare(b.name)).map(c => (
                <tr key={c.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">{c.name}</td>
                  <td className="p-3">{c.code || 'N/A'}</td>
                  <td className="p-3 text-center">
                    {c.is_high_priority ? <Star size={16} className="text-yellow-500 fill-yellow-400" /> : 'No'}
                  </td>
                  <td className="p-3 space-x-2">
                    <Button onClick={() => handleOpenModal(c)} variant="ghost" size="sm"><Edit size={16} /></Button>
                    <Button onClick={() => handleDelete(c.id!)} variant="ghost" size="sm" className="text-red-600"><Trash2 size={16} /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        title={editingClient ? 'Edit Client' : 'Add Client'}
        footer={
          <>
            <Button variant="outline" onClick={handleCloseModal}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit}>{editingClient ? 'Save Changes' : 'Add Client'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="client-name" className="block text-sm font-medium text-gray-700">Name</label>
            <input type="text" name="name" id="client-name" value={currentClient.name || ''} onChange={handleChange} className="mt-1 block w-full p-2 border rounded-md" />
          </div>
          <div>
            <label htmlFor="client-code" className="block text-sm font-medium text-gray-700">Code (Optional)</label>
            <input type="text" name="code" id="client-code" value={currentClient.code || ''} onChange={handleChange} className="mt-1 block w-full p-2 border rounded-md" />
          </div>
          <div className="flex items-center">
            <input type="checkbox" name="is_high_priority" id="client-is_high_priority" checked={currentClient.is_high_priority || false} onChange={handleChange} className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
            <label htmlFor="client-is_high_priority" className="ml-2 block text-sm text-gray-900">High Priority Client</label>
          </div>
          <div>
            <label htmlFor="client-contact_person" className="block text-sm font-medium text-gray-700">Contact Person (Optional)</label>
            <input type="text" name="contact_person" id="client-contact_person" value={currentClient.contact_person || ''} onChange={handleChange} className="mt-1 block w-full p-2 border rounded-md" />
          </div>
           <div>
            <label htmlFor="client-contact_email" className="block text-sm font-medium text-gray-700">Contact Email (Optional)</label>
            <input type="email" name="contact_email" id="client-contact_email" value={currentClient.contact_email || ''} onChange={handleChange} className="mt-1 block w-full p-2 border rounded-md" />
          </div>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
        </div>
      </Modal>
    </div>
  );
};

export default ClientsManager;