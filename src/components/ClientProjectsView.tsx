'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Client, Project, DEFAULT_TEMPLATE } from '@/types';
import { db } from '@/lib/storage';
import { v4 as uuidv4 } from 'uuid';
import ProjectCard from '@/components/ProjectCard';
import TemplateSelector from '@/components/TemplateSelector';

interface ClientProjectsViewProps {
  client: Client;
  onBack: () => void;
  onSelectProject: (project: Project) => void;
  onUpdateProjects: () => void;
}

export default function ClientProjectsView({
  client,
  onBack,
  onSelectProject,
  onUpdateProjects,
}: ClientProjectsViewProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [eventCounts, setEventCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDateRange, setNewProjectDateRange] = useState('');
  const [newProjectTemplateId, setNewProjectTemplateId] = useState(DEFAULT_TEMPLATE.id);
  const [sortBy, setSortBy] = useState<'recent' | 'starred' | 'name'>('recent');

  const sortedProjects = useMemo(() => {
    const sorted = [...projects];
    switch (sortBy) {
      case 'recent':
        return sorted.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      case 'starred':
        return sorted.sort((a, b) => (b.starred ? 1 : 0) - (a.starred ? 1 : 0) || b.updatedAt.localeCompare(a.updatedAt));
      case 'name':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      default:
        return sorted;
    }
  }, [projects, sortBy]);

  const loadProjects = useCallback(async () => {
    const projs = await db.getProjectsByClient(client.id);
    setProjects(projs);

    // Load event counts for each project
    const counts: Record<string, number> = {};
    await Promise.all(
      projs.map(async (p) => {
        const events = await db.getEventsByProject(p.id);
        counts[p.id] = events.length;
      })
    );
    setEventCounts(counts);
    setIsLoading(false);
  }, [client.id]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleCreateProject = async () => {
    if (!newProjectName.trim() || !newProjectDateRange.trim()) return;

    const newProject: Project = {
      id: uuidv4(),
      name: newProjectName.trim(),
      dateRange: newProjectDateRange.trim(),
      templateId: newProjectTemplateId,
      clientId: client.id,
      starred: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.saveProject(newProject);
    await db.ensureDefaultTemplate();
    onUpdateProjects();
    setShowCreateModal(false);
    setNewProjectName('');
    setNewProjectDateRange('');
    setNewProjectTemplateId(DEFAULT_TEMPLATE.id);
    onSelectProject(newProject);
  };

  const handleDeleteProject = async (projectId: string) => {
    if (confirm('Are you sure you want to delete this project? This cannot be undone.')) {
      await db.deleteProject(projectId);
      onUpdateProjects();
      await loadProjects();
    }
  };

  const handleToggleStar = async (project: Project) => {
    await db.toggleProjectStar(project.id, !project.starred);
    await loadProjects();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-pulse text-surface-500">Loading projects...</div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-surface-100 text-surface-500 hover:text-surface-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-display font-bold text-surface-900 mb-1">{client.name}</h1>
          <p className="text-surface-500">Documents / {client.libraryName}</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Project
        </button>
      </div>

      {/* Sort Controls */}
      {projects.length > 1 && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-surface-500">Sort by:</span>
          {(['recent', 'starred', 'name'] as const).map((sort) => (
            <button
              key={sort}
              onClick={() => setSortBy(sort)}
              className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
                sortBy === sort
                  ? 'bg-brand-50 text-brand-700 font-medium'
                  : 'text-surface-600 hover:bg-surface-100'
              }`}
            >
              {sort === 'recent' ? 'Recent' : sort === 'starred' ? 'Starred' : 'A-Z'}
            </button>
          ))}
        </div>
      )}

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="font-display font-semibold text-xl text-surface-900 mb-2">No projects yet</h3>
          <p className="text-surface-500 mb-6 max-w-sm mx-auto">
            Create your first project for {client.name} to start tracking events.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary"
          >
            Create Your First Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              eventCount={eventCounts[project.id] || 0}
              onClick={() => onSelectProject(project)}
              onDelete={() => handleDeleteProject(project.id)}
              onToggleStar={() => handleToggleStar(project)}
            />
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display font-semibold text-xl text-surface-900">New Project</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4 p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800">
                <span className="font-medium">Client:</span> {client.name}
              </p>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleCreateProject(); }} className="space-y-4">
              <div className="field-group">
                <label htmlFor="projectName" className="field-label">Project Name</label>
                <input
                  type="text"
                  id="projectName"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="e.g., BRT Pop-Up Events"
                  className="input-field"
                  autoFocus
                />
              </div>

              <div className="field-group">
                <label htmlFor="dateRange" className="field-label">Date Range</label>
                <input
                  type="text"
                  id="dateRange"
                  value={newProjectDateRange}
                  onChange={(e) => setNewProjectDateRange(e.target.value)}
                  placeholder="e.g., April 19 - May 18, 2025"
                  className="input-field"
                />
              </div>

              <div className="field-group">
                <label className="field-label">Template</label>
                <TemplateSelector
                  selectedId={newProjectTemplateId}
                  onChange={setNewProjectTemplateId}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1"
                  disabled={!newProjectName.trim() || !newProjectDateRange.trim()}
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
