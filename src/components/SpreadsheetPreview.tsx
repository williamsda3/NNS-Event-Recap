'use client';

import React from 'react';
import { Project, FormTemplate, FormField, EventEntry } from '@/types';

interface SpreadsheetPreviewProps {
  project: Project;
  template: FormTemplate;
  events: EventEntry[];
  onClose: () => void;
  onExport: () => void;
  isExporting: boolean;
}

export default function SpreadsheetPreview({
  project,
  template,
  events,
  onClose,
  onExport,
  isExporting,
}: SpreadsheetPreviewProps) {
  const sortedFields = [...template.fields]
    .filter(f => f.type !== 'calculated' && f.id !== 'photo_album')
    .sort((a, b) => a.order - b.order);

  // Calculate value for a calculated field
  const calculateValue = (field: FormField, eventResponses: Record<string, string | number>): number => {
    if (!field.formula) return 0;

    // Parse the formula and replace field IDs with values
    let result = 0;
    const parts = field.formula.split('+').map(p => p.trim());

    for (const part of parts) {
      const value = eventResponses[part];
      if (typeof value === 'number') {
        result += value;
      } else if (typeof value === 'string') {
        const num = parseFloat(value);
        if (!isNaN(num)) result += num;
      }
    }

    return result;
  };

  // Calculate total for a row across all events
  const calculateRowTotal = (field: FormField): number | null => {
    if (field.type !== 'number' && field.type !== 'calculated') return null;

    return events.reduce((sum, event) => {
      if (field.type === 'calculated') {
        return sum + calculateValue(field, event.responses);
      }
      const value = event.responses[field.id];
      return sum + (typeof value === 'number' ? value : 0);
    }, 0);
  };

  // Get cell value for display
  const getCellValue = (field: FormField, eventResponses: Record<string, string | number>): React.ReactNode => {
    if (field.type === 'calculated') {
      return calculateValue(field, eventResponses);
    }

    if (field.type === 'url') {
      const value = eventResponses[field.id];
      if (value && typeof value === 'string' && value.trim()) {
        return (
          <a
            href={value.trim()}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            View Photos
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        );
      }
      return '';
    }

    if (field.type === 'longtext') {
      const value = eventResponses[field.id];
      if (value && typeof value === 'string') {
        // Truncate long text for preview
        return value.length > 50 ? value.substring(0, 50) + '...' : value;
      }
      return '';
    }

    const value = eventResponses[field.id];
    return value !== undefined ? value : '';
  };

  // Get row background color based on category
  const getRowBgClass = (field: FormField, isEventName: boolean = false): string => {
    if (isEventName) return '';
    if (field.category === 'header') {
      return field.id === 'event_name' ? 'bg-amber-100' : 'bg-amber-50';
    }
    if (field.category === 'metrics') return 'bg-amber-50';
    if (field.category === 'totals') return 'bg-yellow-200';
    return 'bg-white';
  };

  // Get header cell background for event columns
  const getEventHeaderBg = (index: number): string => {
    const colors = ['bg-amber-300', 'bg-sky-300', 'bg-green-300', 'bg-amber-300', 'bg-sky-300'];
    return colors[index % colors.length];
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-6xl max-h-[90vh] flex flex-col animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-surface-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
            </div>
            <div>
              <h2 className="font-display font-semibold text-lg text-surface-900">Export Preview</h2>
              <p className="text-sm text-surface-500">Review data before exporting to Excel</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Project Title */}
        <div className="px-4 py-3 bg-surface-50 border-b border-surface-100">
          <p className="font-semibold text-surface-900">
            {project.name} ({project.dateRange})
          </p>
        </div>

        {/* Table Container */}
        <div className="flex-1 overflow-auto p-4">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-surface-100 border border-surface-200 px-3 py-2 text-left font-semibold text-surface-700 min-w-[200px]">
                    Field
                  </th>
                  {events.map((event, index) => (
                    <th
                      key={event.id}
                      className={`border border-surface-200 px-3 py-2 text-center font-semibold min-w-[120px] ${getEventHeaderBg(index)}`}
                    >
                      {event.eventName || `Event ${index + 1}`}
                    </th>
                  ))}
                  <th className="border border-surface-200 px-3 py-2 text-center font-semibold bg-yellow-300 min-w-[100px]">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedFields.map((field) => {
                  const rowTotal = calculateRowTotal(field);
                  const isEventNameRow = field.id === 'event_name';

                  return (
                    <tr key={field.id}>
                      <td className={`sticky left-0 z-10 border border-surface-200 px-3 py-2 font-medium text-surface-700 ${getRowBgClass(field)}`}>
                        {field.label}
                      </td>
                      {events.map((event, index) => (
                        <td
                          key={event.id}
                          className={`border border-surface-200 px-3 py-2 ${
                            isEventNameRow
                              ? getEventHeaderBg(index) + ' font-semibold'
                              : getRowBgClass(field)
                          } ${
                            field.type === 'number' || field.type === 'calculated'
                              ? 'text-center'
                              : 'text-left'
                          }`}
                        >
                          {getCellValue(field, event.responses)}
                        </td>
                      ))}
                      <td className={`border border-surface-200 px-3 py-2 text-center font-medium ${
                        isEventNameRow ? 'bg-yellow-300 font-semibold' : 'bg-yellow-200'
                      }`}>
                        {isEventNameRow
                          ? 'Pop-Up Event Total'
                          : rowTotal !== null
                            ? rowTotal
                            : ''
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {events.length === 0 && (
            <div className="text-center py-8 text-surface-500">
              No events to preview. Add events to see the export preview.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-surface-100 bg-surface-50">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={onExport}
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
    </div>
  );
}
