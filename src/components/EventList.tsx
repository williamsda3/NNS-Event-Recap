'use client';

import { useState } from 'react';
import { EventEntry, FormTemplate } from '@/types';

interface EventListProps {
  events: EventEntry[];
  template: FormTemplate;
  onEdit: (event: EventEntry) => void;
  onDelete: (eventId: string) => void;
}

export default function EventList({ events, template, onEdit, onDelete }: EventListProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const getDisplayValue = (event: EventEntry, fieldId: string): string | number => {
    const field = template.fields.find(f => f.id === fieldId);
    const value = event.responses[fieldId];

    if (field?.type === 'calculated') {
      if (!field.formula) return 0;
      const parts = field.formula.split('+').map(p => p.trim());
      return parts.reduce((sum, fId) => {
        const val = event.responses[fId];
        return sum + (typeof val === 'number' ? val : parseInt(val as string) || 0);
      }, 0);
    }

    return value ?? '-';
  };

  const getStatusBadge = (status: EventEntry['status']) => {
    switch (status) {
      case 'submitted':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-xs font-medium">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Submitted
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-xs font-medium">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Pending
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 bg-surface-100 text-surface-600 rounded-full text-xs font-medium">
            Draft
          </span>
        );
    }
  };

  const handleCopyLink = async (event: EventEntry) => {
    const url = `${window.location.origin}/form/${event.shareToken}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(event.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      prompt('Copy this link:', url);
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th>Event</th>
            <th>Date & Time</th>
            <th className="text-center">Status</th>
            <th className="text-center">Surveys</th>
            <th className="text-center">Interactions</th>
            <th className="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event, index) => (
            <tr key={event.id} className="animate-slide-in" style={{ animationDelay: `${index * 50}ms` }}>
              <td>
                <div className="font-medium text-surface-900">{event.eventName}</div>
              </td>
              <td className="text-surface-600">{event.eventDate || '-'}</td>
              <td className="text-center">
                {getStatusBadge(event.status)}
              </td>
              <td className="text-center">
                <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 bg-brand-50 text-brand-700 rounded-full text-sm font-medium">
                  {getDisplayValue(event, 'survey_submissions')}
                </span>
              </td>
              <td className="text-center">
                <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-sm font-medium">
                  {getDisplayValue(event, 'total_interactions')}
                </span>
              </td>
              <td className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => window.open(`/form/${event.shareToken}`, '_blank')}
                    className="p-2 rounded-lg hover:bg-surface-100 text-surface-500 hover:text-brand-600 transition-colors"
                    title="Preview form"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleCopyLink(event)}
                    className="p-2 rounded-lg hover:bg-surface-100 text-surface-500 hover:text-brand-600 transition-colors"
                    title={copiedId === event.id ? 'Link copied!' : 'Copy form link'}
                  >
                    {copiedId === event.id ? (
                      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={() => onEdit(event)}
                    className="p-2 rounded-lg hover:bg-surface-100 text-surface-500 hover:text-brand-600 transition-colors"
                    title="Edit event"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => onDelete(event.id)}
                    className="p-2 rounded-lg hover:bg-red-50 text-surface-500 hover:text-red-600 transition-colors"
                    title="Delete event"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
