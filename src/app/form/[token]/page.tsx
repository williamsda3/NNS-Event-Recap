'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { EventEntry, FormTemplate, FormField, Project } from '@/types';
import { db } from '@/lib/storage';
import PhotoUpload from '@/components/PhotoUpload';

function getEditTimeRemaining(event: EventEntry): number {
  const deadline = event.editDeadline
    ? new Date(event.editDeadline).getTime()
    : new Date(event.createdAt).getTime() + 4 * 60 * 60 * 1000;
  return Math.max(0, deadline - Date.now());
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '0:00:00';
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatDateTime(date: Date): string {
  return `${formatDate(date)} ${date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })}`;
}

export default function SharedFormPage({ params }: { params: { token: string } }) {
  const [project, setProject] = useState<Project | null>(null);
  const [template, setTemplate] = useState<FormTemplate | null>(null);
  const [responses, setResponses] = useState<Record<string, string | number>>({});
  const [status, setStatus] = useState<'loading' | 'form' | 'submitted' | 'editing' | 'locked' | 'not_found'>('loading');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedEvent, setSubmittedEvent] = useState<EventEntry | null>(null);
  const [editingEvent, setEditingEvent] = useState<EventEntry | null>(null);
  const [draftEvent, setDraftEvent] = useState<EventEntry | null>(null);
  const draftCreatingRef = useRef(false);
  const [countdown, setCountdown] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [todayDate, setTodayDate] = useState('');
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);

  // Set today's date on mount
  useEffect(() => {
    setTodayDate(formatDate(new Date()));
  }, []);

  // Countdown timer
  useEffect(() => {
    const activeEvent = submittedEvent || editingEvent;
    if (!activeEvent) return;

    const tick = () => {
      const remaining = getEditTimeRemaining(activeEvent);
      setTimeRemaining(remaining);
      setCountdown(formatCountdown(remaining));
      if (remaining <= 0 && status === 'editing') {
        setStatus('locked');
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [submittedEvent, editingEvent, status]);

  useEffect(() => {
    const load = async () => {
      // Try project share token first (new flow)
      const proj = await db.getProjectByShareToken(params.token);
      if (proj) {
        const tmpl = await db.getTemplate(proj.templateId);
        if (!tmpl) { setStatus('not_found'); return; }
        setProject(proj);
        setTemplate(tmpl);
        // Restore any in-progress field responses
        try {
          const saved = localStorage.getItem(`form-draft-${params.token}`);
          if (saved) setResponses(JSON.parse(saved));
        } catch {}
        // Restore draft event from localStorage if this person already started filling in the form
        const draftKey = `form-draft-event-${params.token}`;
        try {
          const savedDraft = localStorage.getItem(draftKey);
          if (savedDraft) setDraftEvent(JSON.parse(savedDraft));
        } catch {}
        setStatus('form');
        return;
      }

      // Fallback: try event share token (edit mode)
      const evt = await db.getEventByShareToken(params.token);
      if (evt) {
        const evtProj = await db.getProject(evt.projectId);
        if (!evtProj) { setStatus('not_found'); return; }
        const tmpl = await db.getTemplate(evtProj.templateId);
        if (!tmpl) { setStatus('not_found'); return; }

        setProject(evtProj);
        setTemplate(tmpl);

        // Check if within edit window
        const remaining = getEditTimeRemaining(evt);
        if (remaining <= 0) {
          setEditingEvent(evt);
          setStatus('locked');
          return;
        }

        // Allow editing
        setEditingEvent(evt);
        setResponses({
          ...evt.responses,
          event_name: evt.eventName,
          event_date_time: evt.eventDate,
        });
        setStatus('editing');
        return;
      }

      setStatus('not_found');
    };
    load();
  }, [params.token]);

  // Auto-save draft to localStorage on every change; create DB draft on first interaction
  const handleChange = (fieldId: string, value: string | number) => {
    setResponses(prev => {
      const next = { ...prev, [fieldId]: value };
      try { localStorage.setItem(`form-draft-${params.token}`, JSON.stringify(next)); } catch {}
      return next;
    });

    // Create the pending draft event on first field interaction (starts 2-hour timer)
    if (!draftEvent && !draftCreatingRef.current && project) {
      draftCreatingRef.current = true;
      const draftKey = `form-draft-event-${params.token}`;
      db.createEvent({
        projectId: project.id,
        eventName: 'In Progress...',
        eventDate: '',
        responses: {},
        status: 'pending',
        editDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).then(draft => {
        if (draft) {
          setDraftEvent(draft);
          try { localStorage.setItem(draftKey, JSON.stringify(draft)); } catch {}
        }
        draftCreatingRef.current = false;
      }).catch(() => { draftCreatingRef.current = false; });
    }
  };

  const sendNotificationEmail = async (eventName: string, eventDate: string, eventResponses: Record<string, string | number>) => {
    if (!project?.notifyEmails?.length) return;
    try {
      await fetch('/api/send-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: project.name,
          eventName,
          eventDate,
          responses: eventResponses,
          emails: project.notifyEmails,
          templateFields: template?.fields || [],
        }),
      });
    } catch {
      // Fire-and-forget — don't block submission on email failure
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;

    setIsSubmitting(true);

    const eventName = (responses['event_name'] as string) || 'Untitled Event';
    // Auto-set date/time: date from page load + current time at submission
    const eventDate = formatDateTime(new Date());

    const finalResponses = {
      ...responses,
      event_date_time: eventDate,
    };

    // Update the existing draft event to submitted, or create fresh if no draft
    let created: EventEntry | null = null;
    if (draftEvent) {
      created = await db.saveEvent({
        ...draftEvent,
        eventName,
        eventDate,
        responses: finalResponses,
        status: 'submitted',
        updatedAt: new Date().toISOString(),
      });
    } else {
      created = await db.createEvent({
        projectId: project.id,
        eventName,
        eventDate,
        responses: finalResponses,
        status: 'submitted',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    // Send email notification (fire-and-forget)
    sendNotificationEmail(eventName, eventDate, finalResponses);

    // Sync to SharePoint (fire-and-forget)
    fetch('/api/sync-sharepoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: project.id }),
    }).catch(() => {});

    try {
      localStorage.removeItem(`form-draft-${params.token}`);
      localStorage.removeItem(`form-draft-event-${params.token}`);
    } catch {}
    setDraftEvent(null);
    setSubmittedEvent(created);
    setIsSubmitting(false);
    setStatus('submitted');
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;

    // Double-check edit window
    if (getEditTimeRemaining(editingEvent) <= 0) {
      setStatus('locked');
      return;
    }

    setIsSubmitting(true);

    const eventName = (responses['event_name'] as string) || editingEvent.eventName;
    const eventDate = editingEvent.eventDate; // Keep original date/time on edit

    await db.saveEvent({
      ...editingEvent,
      eventName,
      eventDate,
      responses,
      updatedAt: new Date().toISOString(),
    });

    setIsSubmitting(false);
    setStatus('submitted');
    setSubmittedEvent(editingEvent);
  };

  const handleEdit = useCallback(() => {
    if (!submittedEvent) return;
    const remaining = getEditTimeRemaining(submittedEvent);
    if (remaining <= 0) {
      setStatus('locked');
      return;
    }
    setEditingEvent(submittedEvent);
    setStatus('editing');
  }, [submittedEvent]);

  const handleSubmitAnother = () => {
    try {
      localStorage.removeItem(`form-draft-${params.token}`);
      localStorage.removeItem(`form-draft-event-${params.token}`);
    } catch {}
    setDraftEvent(null);
    setResponses({});
    setSubmittedEvent(null);
    setEditingEvent(null);
    setTodayDate(formatDate(new Date()));
    setStatus('form');
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center">
        <div className="animate-pulse text-surface-500 text-lg">Loading form...</div>
      </div>
    );
  }

  if (status === 'not_found') {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center p-4">
        <div className="card p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="font-display font-bold text-xl text-surface-900 mb-2">Form Not Found</h1>
          <p className="text-surface-500">This form link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  if (status === 'locked') {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center p-4">
        <div className="card p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="font-display font-bold text-xl text-surface-900 mb-2">Submission Locked</h1>
          <p className="text-surface-500 mb-2">
            The edit window has closed. This submission can no longer be modified.
          </p>
          <p className="text-xs text-surface-400">
            Contact your manager if you need to make changes.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'submitted') {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center p-4">
        <div className="card p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="font-display font-bold text-xl text-surface-900 mb-2">Thank You!</h1>
          <p className="text-surface-500 mb-4">
            Your event recap has been submitted successfully.
          </p>

          {/* Edit window countdown */}
          {submittedEvent && timeRemaining > 0 && (
            <div className="p-3 bg-amber-50 rounded-lg mb-4">
              <div className="flex items-center justify-center gap-2 text-amber-700 text-sm font-medium mb-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Edit window: {countdown}
              </div>
              <p className="text-xs text-amber-600">You can edit this submission within the next {Math.ceil(timeRemaining / (1000 * 60 * 60))} hour{Math.ceil(timeRemaining / (1000 * 60 * 60)) !== 1 ? 's' : ''}.</p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {submittedEvent && timeRemaining > 0 && (
              <button onClick={handleEdit} className="btn-secondary">
                Edit This Submission
              </button>
            )}
            <button onClick={handleSubmitAnother} className="btn-primary">
              Submit Another Event
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Build section groups from template
  const sortedFields = template
    ? [...template.fields]
        .filter(f => f.type !== 'calculated' && f.id !== 'event_date_time')
        .sort((a, b) => a.order - b.order)
    : [];

  const templateSections = (template?.sections || []).sort((a, b) => a.order - b.order);
  const useSections = templateSections.length > 0;

  const sectionGroups = useSections
    ? templateSections
        .map(section => ({
          section,
          fields: sortedFields.filter(f => f.sectionId === section.id),
        }))
        .filter(g => g.fields.length > 0)
    : [
        { section: { id: 'header', title: 'Event Details', description: '', order: 1 }, fields: sortedFields.filter(f => f.category === 'header') },
        { section: { id: 'metrics', title: 'Metrics & Counts', description: '', order: 2 }, fields: sortedFields.filter(f => f.category === 'metrics' || f.category === 'totals') },
        { section: { id: 'other', title: 'Additional Information', description: '', order: 3 }, fields: sortedFields.filter(f => f.category === 'other') },
      ].filter(g => g.fields.length > 0);

  const totalSections = sectionGroups.length;
  const isFirstSection = currentSectionIndex === 0;
  const isLastSection = currentSectionIndex === totalSections - 1;
  const currentGroup = sectionGroups[currentSectionIndex] || sectionGroups[0];

  const isEditing = status === 'editing';

  const handleNext = () => {
    if (!isLastSection) setCurrentSectionIndex(i => i + 1);
  };

  const handleBack = () => {
    if (!isFirstSection) setCurrentSectionIndex(i => i - 1);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLastSection) {
      handleNext();
    } else if (isEditing) {
      handleUpdate(e);
    } else {
      handleSubmit(e);
    }
  };

  const renderField = (field: FormField) => {
    const value = responses[field.id] ?? '';

    switch (field.type) {
      case 'text':
        return (
          <div key={field.id} className="field-group">
            <label htmlFor={field.id} className="field-label">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="text"
              id={field.id}
              value={value}
              onChange={(e) => handleChange(field.id, e.target.value)}
              className="input-field"
              required={field.required}
            />
          </div>
        );

      case 'number':
        return (
          <div key={field.id} className="field-group">
            <label htmlFor={field.id} className="field-label">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="number"
              id={field.id}
              value={value}
              onChange={(e) => handleChange(field.id, parseInt(e.target.value) || 0)}
              className="input-field"
              min="0"
              required={field.required}
            />
          </div>
        );

      case 'date':
        return (
          <div key={field.id} className="field-group">
            <label htmlFor={field.id} className="field-label">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="date"
              id={field.id}
              value={value as string}
              onChange={(e) => handleChange(field.id, e.target.value)}
              className="input-field"
              required={field.required}
            />
          </div>
        );

      case 'photo_upload':
      case 'url':
        if (field.type === 'photo_upload' || field.id === 'photo_album') {
          return (
            <PhotoUpload
              key={field.id}
              projectName={project?.name || ''}
              eventName={(responses['event_name'] as string) || ''}
              eventDate={todayDate}
              value={value as string}
              onChange={(url) => handleChange(field.id, url)}
            />
          );
        }
        return (
          <div key={field.id} className="field-group">
            <label htmlFor={field.id} className="field-label">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="url"
              id={field.id}
              value={value}
              onChange={(e) => handleChange(field.id, e.target.value)}
              className="input-field"
              placeholder="https://"
              required={field.required}
            />
          </div>
        );

      case 'longtext':
        return (
          <div key={field.id} className="field-group">
            <label htmlFor={field.id} className="field-label">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <textarea
              id={field.id}
              value={value}
              onChange={(e) => handleChange(field.id, e.target.value)}
              className="input-field min-h-[120px] resize-y"
              placeholder="Enter comments..."
              required={field.required}
            />
          </div>
        );

      case 'checkbox': {
        const options = field.options || [];
        const checked = String(value).split(',').filter(Boolean);
        const handleCheck = (option: string, isChecked: boolean) => {
          const next = isChecked ? [...checked, option] : checked.filter(o => o !== option);
          handleChange(field.id, next.join(','));
        };
        return (
          <div key={field.id} className="field-group">
            <label className="field-label">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="space-y-2 mt-1">
              {options.map(option => (
                <label key={option} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checked.includes(option)}
                    onChange={e => handleCheck(option, e.target.checked)}
                    className="w-4 h-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-sm text-surface-700">{option}</span>
                </label>
              ))}
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  };

  if (!currentGroup) return null;

  return (
    <div className="min-h-screen bg-surface-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="font-display font-bold text-2xl text-surface-900 mb-1">Event Recap</h1>
          <p className="text-surface-500">{project?.name}</p>
          {!isEditing && todayDate && (
            <p className="text-sm text-surface-400 mt-1">{todayDate}</p>
          )}
          {isEditing && editingEvent?.eventDate && (
            <p className="text-sm text-surface-400 mt-1">{editingEvent.eventDate}</p>
          )}
        </div>

        {/* Edit mode countdown banner */}
        {isEditing && timeRemaining > 0 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-700 text-sm">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Editing — time remaining
            </div>
            <span className="font-mono font-semibold text-amber-800">{countdown}</span>
          </div>
        )}

        {/* Progress bar */}
        {totalSections > 1 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-surface-500">
                Section {currentSectionIndex + 1} of {totalSections}
              </span>
              <span className="text-sm font-medium text-surface-700">
                {currentGroup.section.title}
              </span>
            </div>
            <div className="flex gap-1.5">
              {sectionGroups.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    i <= currentSectionIndex ? 'bg-brand-500' : 'bg-surface-200'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {/* Section header */}
          <div className="rounded-xl bg-surface-100 border border-surface-200 overflow-hidden">
            <div className="bg-surface-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-surface-900">{currentGroup.section.title}</h2>
            </div>
            {currentGroup.section.description && (
              <div className="px-6 py-3 text-sm text-surface-600">
                {currentGroup.section.description}
              </div>
            )}
          </div>

          {/* Fields */}
          <div className="space-y-4">
            {currentGroup.fields.map(field => (
              <div key={field.id} className="card p-5">
                {renderField(field)}
              </div>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex gap-3 pt-2">
            {!isFirstSection ? (
              <button type="button" onClick={handleBack} className="btn-secondary flex-1">
                ← Back
              </button>
            ) : null}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {isEditing ? 'Saving...' : 'Submitting...'}
                </>
              ) : isLastSection
                ? (isEditing ? 'Save Changes' : 'Submit Event Recap')
                : 'Next →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
