'use client';

import { useState, useEffect } from 'react';
import { EventEntry, FormTemplate, Project } from '@/types';
import { db } from '@/lib/storage';

export default function BAFormPage({ params }: { params: { token: string } }) {
  const [event, setEvent] = useState<EventEntry | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [template, setTemplate] = useState<FormTemplate | null>(null);
  const [responses, setResponses] = useState<Record<string, string | number>>({});
  const [status, setStatus] = useState<'loading' | 'form' | 'submitted' | 'not_found'>('loading');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      const evt = await db.getEventByShareToken(params.token);
      if (!evt) {
        setStatus('not_found');
        return;
      }

      const proj = await db.getProject(evt.projectId);
      if (!proj) {
        setStatus('not_found');
        return;
      }

      const tmpl = await db.getTemplate(proj.templateId);
      if (!tmpl) {
        setStatus('not_found');
        return;
      }

      setEvent(evt);
      setProject(proj);
      setTemplate(tmpl);
      // Pre-fill with existing responses if any
      setResponses(evt.responses || {});
      setStatus('form');
    };
    load();
  }, [params.token]);

  const handleChange = (fieldId: string, value: string | number) => {
    setResponses(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;

    setIsSubmitting(true);
    await db.updateEventResponses(event.id, {
      ...responses,
      event_name: event.eventName,
      event_date_time: event.eventDate,
    }, 'submitted');
    setIsSubmitting(false);
    setStatus('submitted');
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
          <p className="text-surface-500 mb-6">
            Your event recap for <strong>{event?.eventName}</strong> has been submitted successfully.
          </p>
          <button
            onClick={() => setStatus('form')}
            className="btn-secondary"
          >
            Edit Response
          </button>
        </div>
      </div>
    );
  }

  // Render the form
  const sortedFields = template
    ? [...template.fields]
        .filter(f => f.type !== 'calculated' && f.id !== 'photo_album' && f.id !== 'event_name' && f.id !== 'event_date_time')
        .sort((a, b) => a.order - b.order)
    : [];

  const isResubmit = event?.status === 'submitted';

  return (
    <div className="min-h-screen bg-surface-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-display font-bold text-2xl text-surface-900 mb-1">Event Recap</h1>
          <p className="text-surface-500">{project?.name}</p>
          {isResubmit && (
            <p className="text-xs text-amber-600 mt-2 bg-amber-50 inline-block px-3 py-1 rounded-full">
              Previously submitted — you can update and resubmit
            </p>
          )}
        </div>

        {/* Event Info (read-only) */}
        <div className="card p-4 mb-6 bg-brand-50 border-brand-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-surface-900">{event?.eventName}</p>
              {event?.eventDate && (
                <p className="text-sm text-surface-600">{event.eventDate}</p>
              )}
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="card p-6">
            <h2 className="font-semibold text-surface-900 mb-4">Metrics & Counts</h2>
            <div className="space-y-4">
              {sortedFields.filter(f => f.category === 'metrics').map((field) => (
                <div key={field.id} className="field-group">
                  <label htmlFor={field.id} className="field-label">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {field.type === 'number' ? (
                    <input
                      type="number"
                      id={field.id}
                      value={responses[field.id] ?? ''}
                      onChange={(e) => handleChange(field.id, parseInt(e.target.value) || 0)}
                      className="input-field"
                      min="0"
                      required={field.required}
                    />
                  ) : (
                    <input
                      type="text"
                      id={field.id}
                      value={responses[field.id] ?? ''}
                      onChange={(e) => handleChange(field.id, e.target.value)}
                      className="input-field"
                      required={field.required}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Other fields */}
          {sortedFields.filter(f => f.category === 'other').length > 0 && (
            <div className="card p-6">
              <h2 className="font-semibold text-surface-900 mb-4">Additional Information</h2>
              <div className="space-y-4">
                {sortedFields.filter(f => f.category === 'other').map((field) => (
                  <div key={field.id} className="field-group">
                    <label htmlFor={field.id} className="field-label">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {field.type === 'longtext' ? (
                      <textarea
                        id={field.id}
                        value={responses[field.id] ?? ''}
                        onChange={(e) => handleChange(field.id, e.target.value)}
                        className="input-field min-h-[120px] resize-y"
                        placeholder="Enter comments..."
                        required={field.required}
                      />
                    ) : (
                      <input
                        type="text"
                        id={field.id}
                        value={responses[field.id] ?? ''}
                        onChange={(e) => handleChange(field.id, e.target.value)}
                        className="input-field"
                        required={field.required}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary w-full py-3 text-base flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Submitting...
              </>
            ) : (
              isResubmit ? 'Update Event Recap' : 'Submit Event Recap'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
