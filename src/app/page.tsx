'use client';

import { useState, useEffect } from 'react';
import { Project, Client } from '@/types';
import { db } from '@/lib/storage';
import { v4 as uuidv4 } from 'uuid';
import ClientCard from '@/components/ClientCard';
import ClientProjectsView from '@/components/ClientProjectsView';
import ProjectView from '@/components/ProjectView';
import TemplateManager from '@/components/TemplateManager';

export default function Home() {
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientLibrary, setNewClientLibrary] = useState('');
  const [projectCounts, setProjectCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);

  const refreshData = async () => {
    const [c, p] = await Promise.all([db.getClients(), db.getProjects()]);
    setClients(c);
    setProjects(p);

    // Load project counts per client
    const counts: Record<string, number> = {};
    await Promise.all(c.map(async (client) => {
      counts[client.id] = await db.getProjectCountByClient(client.id);
    }));
    setProjectCounts(counts);
  };

  useEffect(() => {
    const load = async () => {
      await db.ensureDefaultTemplate();
      await refreshData();
      setIsLoading(false);
    };
    load();
  }, []);

  const handleAddClient = async () => {
    if (!newClientName.trim() || !newClientLibrary.trim()) return;

    const newClient: Client = {
      id: uuidv4(),
      name: newClientName.trim(),
      libraryName: newClientLibrary.trim(),
      createdAt: new Date().toISOString(),
    };

    await db.saveClient(newClient);
    setClients([...clients, newClient]);
    setShowAddClientModal(false);
    setNewClientName('');
    setNewClientLibrary('');
    setSelectedClientId(newClient.id);
  };

  const handleDeleteClient = async (clientId: string) => {
    const clientProjects = await db.getProjectsByClient(clientId);
    const message = clientProjects.length > 0
      ? `Are you sure you want to delete this client? This will also delete ${clientProjects.length} project(s). This cannot be undone.`
      : 'Are you sure you want to delete this client? This cannot be undone.';

    if (confirm(message)) {
      await db.deleteClient(clientId);
      await refreshData();
      if (selectedClientId === clientId) {
        setSelectedClientId(null);
      }
    }
  };

  const handleUpdateProject = (updatedProject: Project) => {
    setProjects(projects.map(p => p.id === updatedProject.id ? updatedProject : p));
    setSelectedProject(updatedProject);
  };

  const handleDeleteProject = async (projectId: string) => {
    await db.deleteProject(projectId);
    await refreshData();
    setSelectedProject(null);
  };

  const selectedClient = selectedClientId ? clients.find(c => c.id === selectedClientId) : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-surface-500">Loading...</div>
      </div>
    );
  }

  // Level 3: Show ProjectView (Events)
  if (selectedProject) {
    return (
      <ProjectView
        project={selectedProject}
        onBack={() => setSelectedProject(null)}
        onUpdate={handleUpdateProject}
        onDelete={() => handleDeleteProject(selectedProject.id)}
      />
    );
  }

  // Level 2: Show Client's Projects
  if (selectedClient) {
    return (
      <ClientProjectsView
        client={selectedClient}
        onBack={() => setSelectedClientId(null)}
        onSelectProject={setSelectedProject}
        onUpdateProjects={refreshData}
      />
    );
  }

  // Level 1: Show Clients List (Home)
  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-surface-900 mb-2">Clients</h1>
          <p className="text-surface-500">Select a client to manage their projects and events</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowTemplateManager(true)}
            className="btn-secondary flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
            Templates
          </button>
          <button
            onClick={() => setShowAddClientModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Client
          </button>
        </div>
      </div>

      {clients.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="font-display font-semibold text-xl text-surface-900 mb-2">No clients yet</h3>
          <p className="text-surface-500 mb-6 max-w-sm mx-auto">
            Add your first client to start organizing projects and tracking events.
          </p>
          <button
            onClick={() => setShowAddClientModal(true)}
            className="btn-primary"
          >
            Add Your First Client
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              projectCount={projectCounts[client.id] || 0}
              onClick={() => setSelectedClientId(client.id)}
              onDelete={() => handleDeleteClient(client.id)}
            />
          ))}
        </div>
      )}

      {/* Add Client Modal */}
      {showAddClientModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display font-semibold text-xl text-surface-900">Add New Client</h2>
              <button
                onClick={() => {
                  setShowAddClientModal(false);
                  setNewClientName('');
                  setNewClientLibrary('');
                }}
                className="p-2 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleAddClient(); }} className="space-y-4">
              <div className="field-group">
                <label htmlFor="clientName" className="field-label">Client Name</label>
                <input
                  type="text"
                  id="clientName"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="e.g., NVTA"
                  className="input-field"
                  autoFocus
                />
                <p className="field-hint">Display name for this client</p>
              </div>

              <div className="field-group">
                <label htmlFor="clientLibrary" className="field-label">Photo Folder Name</label>
                <input
                  type="text"
                  id="clientLibrary"
                  value={newClientLibrary}
                  onChange={(e) => setNewClientLibrary(e.target.value)}
                  placeholder="e.g., NVTA Photos"
                  className="input-field"
                />
                <p className="field-hint">The folder name in SharePoint Documents for this client&apos;s photos</p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddClientModal(false);
                    setNewClientName('');
                    setNewClientLibrary('');
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1"
                  disabled={!newClientName.trim() || !newClientLibrary.trim()}
                >
                  Add Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTemplateManager && (
        <TemplateManager
          onClose={() => setShowTemplateManager(false)}
        />
      )}
    </div>
  );
}
