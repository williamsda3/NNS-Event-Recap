'use client';

import { useState, useEffect } from 'react';
import { Client } from '@/types';
import { db } from '@/lib/storage';
import { v4 as uuidv4 } from 'uuid';

interface ClientSelectorProps {
  value: string;
  onChange: (clientId: string) => void;
}

export default function ClientSelector({ value, onChange }: ClientSelectorProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newLibraryName, setNewLibraryName] = useState('');

  useEffect(() => {
    db.getClients().then(setClients);
  }, []);

  const handleAddClient = async () => {
    if (!newClientName.trim() || !newLibraryName.trim()) return;

    const newClient: Client = {
      id: uuidv4(),
      name: newClientName.trim(),
      libraryName: newLibraryName.trim(),
      createdAt: new Date().toISOString(),
    };

    await db.saveClient(newClient);
    setClients([...clients, newClient]);
    onChange(newClient.id);
    setShowAddModal(false);
    setNewClientName('');
    setNewLibraryName('');
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;
    if (selectedValue === 'add-new') {
      setShowAddModal(true);
    } else {
      onChange(selectedValue);
    }
  };

  return (
    <>
      <div className="field-group">
        <label className="field-label">Client</label>
        <select
          value={value}
          onChange={handleSelectChange}
          className="input-field"
          required
        >
          <option value="">Select a client...</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
          <option value="add-new">+ Add new client</option>
        </select>
        {value && clients.find(c => c.id === value) && (
          <p className="field-hint">
            Folder: Documents / {clients.find(c => c.id === value)?.libraryName}
          </p>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card p-6 w-full max-w-md mx-4 animate-fade-in">
            <h3 className="font-display font-semibold text-xl text-surface-900 mb-4">
              Add New Client
            </h3>
            <div className="space-y-4">
              <div className="field-group">
                <label className="field-label">Client Name</label>
                <input
                  type="text"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="e.g., NVTA"
                  className="input-field"
                  autoFocus
                />
                <p className="field-hint">Display name for this client</p>
              </div>
              <div className="field-group">
                <label className="field-label">Photo Folder Name</label>
                <input
                  type="text"
                  value={newLibraryName}
                  onChange={(e) => setNewLibraryName(e.target.value)}
                  placeholder="e.g., NVTA Photos"
                  className="input-field"
                />
                <p className="field-hint">
                  The folder name in SharePoint Documents for this client&apos;s photos
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setNewClientName('');
                  setNewLibraryName('');
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddClient}
                disabled={!newClientName.trim() || !newLibraryName.trim()}
                className="btn-primary"
              >
                Add Client
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
