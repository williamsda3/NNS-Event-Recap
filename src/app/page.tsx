'use client';

import { useState, useEffect } from 'react';
import { Project, Client } from '@/types';
import { db } from '@/lib/storage';
import { v4 as uuidv4 } from 'uuid';
import ClientCard from '@/components/ClientCard';
import ClientProjectsView from '@/components/ClientProjectsView';
import ProjectView from '@/components/ProjectView';
import TemplateManager from '@/components/TemplateManager';
import { getSharePointRootUrl } from '@/lib/sharepoint';

// ── Login Screen ──────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'Admin' && password === 'Admin') {
      localStorage.setItem('admin_auth', 'true');
      onLogin();
    } else {
      setError('Invalid username or password');
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="card p-8 w-full max-w-sm animate-fade-in">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-gradient-to-br from-brand-500 to-brand-700 rounded-xl flex items-center justify-center mx-auto mb-3">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="font-display font-bold text-xl text-surface-900">Admin Login</h1>
          <p className="text-sm text-surface-500 mt-1">Event Recap Builder</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="field-group">
            <label htmlFor="username" className="field-label">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input-field"
              autoFocus
              autoComplete="username"
            />
          </div>
          <div className="field-group">
            <label htmlFor="password" className="field-label">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              autoComplete="current-password"
            />
          </div>
          {error && (
            <p className="text-sm text-red-500 flex items-center gap-1.5">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </p>
          )}
          <button type="submit" className="btn-primary w-full mt-2">
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Main Admin App ─────────────────────────────────────────────────────────────
export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
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
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [lastBackupUrl, setLastBackupUrl] = useState<string>('');
  const [lastBackupTime, setLastBackupTime] = useState<string>('');

  useEffect(() => {
    setIsAuthenticated(localStorage.getItem('admin_auth') === 'true');
    setLastBackupUrl(localStorage.getItem('last_backup_url') || '');
    setLastBackupTime(localStorage.getItem('last_backup_time') || '');
    setAuthChecked(true);
  }, []);

  const refreshData = async () => {
    const [c, p] = await Promise.all([db.getClients(), db.getProjects()]);
    setClients(c);
    setProjects(p);

    const counts: Record<string, number> = {};
    await Promise.all(c.map(async (client) => {
      counts[client.id] = await db.getProjectCountByClient(client.id);
    }));
    setProjectCounts(counts);
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    const load = async () => {
      await db.ensureDefaultTemplate();
      await refreshData();
      setIsLoading(false);
    };
    load();
  }, [isAuthenticated]);

  const handleLogin = () => setIsAuthenticated(true);

  const handleLogout = () => {
    localStorage.removeItem('admin_auth');
    setIsAuthenticated(false);
    setSelectedClientId(null);
    setSelectedProject(null);
  };

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      const res = await fetch('/api/backup', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Backup failed');
      const url = data.url as string;
      const time = new Date().toLocaleString();
      setLastBackupUrl(url);
      setLastBackupTime(time);
      localStorage.setItem('last_backup_url', url);
      localStorage.setItem('last_backup_time', time);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Backup failed');
    } finally {
      setIsBackingUp(false);
    }
  };

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
      if (selectedClientId === clientId) setSelectedClientId(null);
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

  if (!authChecked) return null;

  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-surface-500">Loading...</div>
      </div>
    );
  }

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

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-surface-900 mb-2">Clients</h1>
          <p className="text-surface-500">Select a client to manage their projects and events</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleBackup}
            disabled={isBackingUp}
            title="Backup all data to SharePoint"
            className="btn-secondary flex items-center gap-2"
          >
            {isBackingUp ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Backing up...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
                Backup
              </>
            )}
          </button>

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

          <button
            onClick={handleLogout}
            title="Log out"
            className="p-2 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>

      {/* SharePoint root link */}
      {getSharePointRootUrl() && (
        <div className="mb-4 flex items-center gap-2 text-sm">
          <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <a
            href={getSharePointRootUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
          >
            Open SharePoint Documents
          </a>
        </div>
      )}

      {/* Last backup info banner */}
      {lastBackupUrl && (
        <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3 text-sm">
          <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
          </svg>
          <span className="text-green-700">Last backup: {lastBackupTime}</span>
          <span className="text-green-500">—</span>
          <a
            href={lastBackupUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-700 font-medium underline hover:text-green-900"
          >
            View on SharePoint
          </a>
        </div>
      )}

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
          <button onClick={() => setShowAddClientModal(true)} className="btn-primary">
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
                onClick={() => { setShowAddClientModal(false); setNewClientName(''); setNewClientLibrary(''); }}
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
                  onClick={() => { setShowAddClientModal(false); setNewClientName(''); setNewClientLibrary(''); }}
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
        <TemplateManager onClose={() => setShowTemplateManager(false)} />
      )}
    </div>
  );
}
