'use client';

import { useState, useEffect, useCallback } from 'react';
import { Project, EventEntry, DEFAULT_TEMPLATE, FormTemplate } from '@/types';
import { db } from '@/lib/storage';
import EventForm from '@/components/EventForm';
import EventList from '@/components/EventList';
import TemplateSelector from '@/components/TemplateSelector';
import SpreadsheetPreview from '@/components/SpreadsheetPreview';

interface ProjectViewProps {
  project: Project;
  onBack: () => void;
  onUpdate: (project: Project) => void;
  onDelete: () => void;
}

export default function ProjectView({ project, onBack, onUpdate, onDelete }: ProjectViewProps) {
  const [events, setEvents] = useState<EventEntry[]>([]);
  const [template, setTemplate] = useState<FormTemplate>(DEFAULT_TEMPLATE);
  const [client, setClient] = useState<{ name: string; libraryName: string } | undefined>();
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);
  const [newEventName, setNewEventName] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [createdEvent, setCreatedEvent] = useState<EventEntry | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventEntry | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showTemplateChange, setShowTemplateChange] = useState(false);
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const loadEvents = useCallback(async () => {
    const evts = await db.getEventsByProject(project.id);
    setEvents(evts);
    setIsLoadingEvents(false);
  }, [project.id]);

  useEffect(() => {
    loadEvents();
    db.getTemplate(project.templateId).then(t => {
      if (t) setTemplate(t);
    });
    if (project.clientId) {
      db.getClient(project.clientId).then(c => {
        if (c) setClient(c);
      });
    }
  }, [project.templateId, project.clientId, loadEvents]);

  const handleTemplateChange = (newTemplateId: string) => {
    if (newTemplateId === project.templateId) return;
    if (events.length > 0) {
      setPendingTemplateId(newTemplateId);
    } else {
      applyTemplateChange(newTemplateId);
    }
  };

  const applyTemplateChange = async (newTemplateId: string) => {
    const updatedProject: Project = {
      ...project,
      templateId: newTemplateId,
      updatedAt: new Date().toISOString(),
    };
    await db.saveProject(updatedProject);
    onUpdate(updatedProject);
    const t = await db.getTemplate(newTemplateId);
    if (t) setTemplate(t);
    setShowTemplateChange(false);
    setPendingTemplateId(null);
  };

  const handleCreateEvent = async () => {
    if (!newEventName.trim()) return;

    const newEvent = await db.createEvent({
      projectId: project.id,
      eventName: newEventName.trim(),
      eventDate: newEventDate.trim(),
      responses: {},
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    if (newEvent) {
      const updatedProject = { ...project, updatedAt: new Date().toISOString() };
      await db.saveProject(updatedProject);
      onUpdate(updatedProject);
      await loadEvents();
      setShowCreateEventModal(false);
      setNewEventName('');
      setNewEventDate('');
      setCreatedEvent(newEvent);
    }
  };

  const handleUpdateEvent = async (responses: Record<string, string | number>) => {
    if (!editingEvent) return;

    const updatedEvent: EventEntry = {
      ...editingEvent,
      eventName: responses['event_name'] as string || editingEvent.eventName,
      eventDate: responses['event_date_time'] as string || editingEvent.eventDate,
      responses,
      updatedAt: new Date().toISOString(),
    };

    await db.saveEvent(updatedEvent);
    const updatedProject = { ...project, updatedAt: new Date().toISOString() };
    await db.saveProject(updatedProject);
    onUpdate(updatedProject);
    await loadEvents();
    setEditingEvent(null);
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (confirm('Are you sure you want to delete this event?')) {
      await db.deleteEvent(eventId);
      const updatedProject = { ...project, updatedAt: new Date().toISOString() };
      await db.saveProject(updatedProject);
      onUpdate(updatedProject);
      await loadEvents();
    }
  };

  const handleExport = async () => {
    if (events.length === 0) {
      alert('Please add at least one event before exporting.');
      return;
    }

    setIsExporting(true);
    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project, template, events }),
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name.replace(/[^a-z0-9]/gi, '_')}_Event_Tracker.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Calculate totals for display
  const calculateTotals = () => {
    const totals: Record<string, number> = {};
    const numericFields = template.fields.filter(f => f.type === 'number');

    for (const field of numericFields) {
      totals[field.id] = events.reduce((sum, event) => {
        const value = event.responses[field.id];
        return sum + (typeof value === 'number' ? value : 0);
      }, 0);
    }

    totals['total_take_ones'] = (totals['english_spanish_take_ones'] || 0) + (totals['english_korean_take_ones'] || 0);
    totals['total_interactions'] = (totals['interactions_english'] || 0) + (totals['interactions_spanish'] || 0) + (totals['interactions_vietnamese'] || 0);

    return totals;
  };

  const totals = calculateTotals();

  if (editingEvent) {
    return (
      <EventForm
        template={template}
        initialValues={editingEvent.responses}
        onSubmit={handleUpdateEvent}
        projectName={project.name}
        clientLibrary={client?.libraryName}
        onCancel={() => setEditingEvent(null)}
        isEditing
      />
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-surface-100 text-surface-500 hover:text-surface-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-display font-bold text-surface-900">{project.name}</h1>
          <p className="text-surface-500">{project.dateRange}</p>
          <div className="flex items-center gap-4 mt-1 flex-wrap">
            {client && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-surface-400">Client:</span>
                <span className="text-sm text-surface-700">{client.name}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-sm text-surface-400">Template:</span>
              <button
                onClick={() => setShowTemplateChange(true)}
                className="text-sm text-brand-600 hover:text-brand-700 hover:underline"
              >
                {template.name}
              </button>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onDelete}
            className="btn-ghost text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
          <button
            onClick={() => setShowPreview(true)}
            disabled={events.length === 0}
            className="btn-secondary flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Preview
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || events.length === 0}
            className="btn-primary flex items-center gap-2"
          >
            {isExporting ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Exporting...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export to Excel
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      {events.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="card p-4">
            <div className="text-2xl font-bold text-surface-900">{events.length}</div>
            <div className="text-sm text-surface-500">Events</div>
          </div>
          <div className="card p-4">
            <div className="text-2xl font-bold text-brand-600">{totals['survey_submissions'] || 0}</div>
            <div className="text-sm text-surface-500">Surveys</div>
          </div>
          <div className="card p-4">
            <div className="text-2xl font-bold text-green-600">{totals['total_interactions'] || 0}</div>
            <div className="text-sm text-surface-500">Interactions</div>
          </div>
          <div className="card p-4">
            <div className="text-2xl font-bold text-amber-600">{totals['total_take_ones'] || 0}</div>
            <div className="text-sm text-surface-500">Take Ones</div>
          </div>
        </div>
      )}

      {/* Events Section */}
      <div className="card">
        <div className="flex items-center justify-between p-4 border-b border-surface-100">
          <h2 className="font-semibold text-surface-900">Events</h2>
          <button
            onClick={() => setShowCreateEventModal(true)}
            className="btn-primary text-sm flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Event
          </button>
        </div>

        {isLoadingEvents ? (
          <div className="p-12 text-center">
            <div className="animate-pulse text-surface-500">Loading events...</div>
          </div>
        ) : events.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 bg-surface-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="font-medium text-surface-900 mb-1">No events yet</h3>
            <p className="text-sm text-surface-500 mb-4">Add your first event to start tracking</p>
            <button
              onClick={() => setShowCreateEventModal(true)}
              className="btn-secondary text-sm"
            >
              Add First Event
            </button>
          </div>
        ) : (
          <EventList
            events={events}
            template={template}
            onEdit={setEditingEvent}
            onDelete={handleDeleteEvent}
          />
        )}
      </div>

      {/* Template Change Modal */}
      {showTemplateChange && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold text-lg text-surface-900">Change Template</h2>
              <button
                onClick={() => setShowTemplateChange(false)}
                className="p-2 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="mb-4">
              <label className="field-label mb-2 block">Select Template</label>
              <TemplateSelector
                selectedId={project.templateId}
                onChange={handleTemplateChange}
              />
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setShowTemplateChange(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template Change Confirmation Modal */}
      {pendingTemplateId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="font-display font-semibold text-lg text-surface-900">Change Template?</h2>
            </div>
            <p className="text-surface-600 mb-4">
              This project has <strong>{events.length} event{events.length !== 1 ? 's' : ''}</strong>.
              Changing the template may cause some data to not display correctly if field IDs don&apos;t match.
              Your existing data will be preserved.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setPendingTemplateId(null)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => applyTemplateChange(pendingTemplateId)}
                className="btn-primary"
              >
                Change Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Event Modal */}
      {showCreateEventModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display font-semibold text-xl text-surface-900">Create Event</h2>
              <button
                onClick={() => {
                  setShowCreateEventModal(false);
                  setNewEventName('');
                  setNewEventDate('');
                }}
                className="p-2 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-surface-500 mb-4">
              Create an event and share the link with a Brand Ambassador to fill in the recap.
            </p>
            <form onSubmit={(e) => { e.preventDefault(); handleCreateEvent(); }} className="space-y-4">
              <div className="field-group">
                <label htmlFor="eventName" className="field-label">Event Name</label>
                <input
                  type="text"
                  id="eventName"
                  value={newEventName}
                  onChange={(e) => setNewEventName(e.target.value)}
                  placeholder="e.g., Community Pop-Up at Main St"
                  className="input-field"
                  autoFocus
                />
              </div>
              <div className="field-group">
                <label htmlFor="eventDate" className="field-label">Event Date & Time</label>
                <input
                  type="text"
                  id="eventDate"
                  value={newEventDate}
                  onChange={(e) => setNewEventDate(e.target.value)}
                  placeholder="e.g., Saturday, March 15, 2025 10am-2pm"
                  className="input-field"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateEventModal(false);
                    setNewEventName('');
                    setNewEventDate('');
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1"
                  disabled={!newEventName.trim()}
                >
                  Create & Get Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Share Link Modal (shown after creating event) */}
      {createdEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h2 className="font-display font-semibold text-lg text-surface-900">Event Created</h2>
                <p className="text-sm text-surface-500">{createdEvent.eventName}</p>
              </div>
            </div>
            <p className="text-sm text-surface-600 mb-4">
              Share this link with the Brand Ambassador to fill in the event recap:
            </p>
            <div className="flex items-center gap-2 mb-4">
              <input
                type="text"
                readOnly
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/form/${createdEvent.shareToken}`}
                className="input-field text-sm flex-1"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                onClick={async () => {
                  const url = `${window.location.origin}/form/${createdEvent.shareToken}`;
                  try {
                    await navigator.clipboard.writeText(url);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  } catch {
                    prompt('Copy this link:', url);
                  }
                }}
                className="btn-primary text-sm whitespace-nowrap flex items-center gap-1.5"
              >
                {copiedLink ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    Copy
                  </>
                )}
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCreatedEvent(null)}
                className="btn-secondary flex-1"
              >
                Done
              </button>
              <button
                onClick={() => window.open(`/form/${createdEvent.shareToken}`, '_blank')}
                className="btn-ghost flex-1 flex items-center justify-center gap-1.5 text-brand-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Preview Form
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spreadsheet Preview Modal */}
      {showPreview && (
        <SpreadsheetPreview
          project={project}
          template={template}
          events={events}
          onClose={() => setShowPreview(false)}
          onExport={() => {
            setShowPreview(false);
            handleExport();
          }}
          isExporting={isExporting}
        />
      )}
    </div>
  );
}
