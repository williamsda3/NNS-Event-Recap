'use client';

import { useState, useEffect } from 'react';
import { FormTemplate, FormField } from '@/types';
import PhotoAlbumField from '@/components/PhotoAlbumField';

interface EventFormProps {
  template: FormTemplate;
  initialValues?: Record<string, string | number>;
  onSubmit: (responses: Record<string, string | number>) => void;
  onCancel: () => void;
  isEditing?: boolean;
  projectName?: string;
  clientLibrary?: string;
}

export default function EventForm({ template, initialValues, onSubmit, onCancel, isEditing, projectName = '', clientLibrary }: EventFormProps) {
  const [responses, setResponses] = useState<Record<string, string | number>>({});

  useEffect(() => {
    if (initialValues) {
      setResponses(initialValues);
    }
  }, [initialValues]);

  const sortedFields = [...template.fields].sort((a, b) => a.order - b.order);

  const handleChange = (fieldId: string, value: string | number) => {
    setResponses(prev => ({ ...prev, [fieldId]: value }));
  };

  const calculateValue = (field: FormField): number => {
    if (!field.formula) return 0;
    
    // Simple formula parser for addition
    const parts = field.formula.split('+').map(p => p.trim());
    return parts.reduce((sum, fieldId) => {
      const val = responses[fieldId];
      return sum + (typeof val === 'number' ? val : parseInt(val as string) || 0);
    }, 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ ...responses });
  };

  const renderField = (field: FormField) => {
    // Hide calculated fields — totals are handled in Excel export
    if (field.type === 'calculated') {
      return null;
    }

    // Hide photo album field for now (using Flickr instead)
    if (field.id === 'photo_album') {
      return null;
    }

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

      case 'url':
        // Use PhotoAlbumField for photo_album field
        if (field.id === 'photo_album') {
          const eventName = (responses['event_name'] as string) || '';
          const eventDate = (responses['event_date_time'] as string) || '';
          return (
            <PhotoAlbumField
              key={field.id}
              value={value as string}
              onChange={(val) => handleChange(field.id, val)}
              projectName={projectName}
              eventName={eventName}
              eventDate={eventDate}
              required={field.required}
              clientLibrary={clientLibrary}
            />
          );
        }
        // Regular URL field
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
              className="input-field min-h-[150px] resize-y"
              placeholder="Enter detailed comments..."
              required={field.required}
            />
            <p className="field-hint">Include numbered points for community feedback and suggestions</p>
          </div>
        );

      default:
        return null;
    }
  };

  // Group fields by category
  const headerFields = sortedFields.filter(f => f.category === 'header');
  const metricFields = sortedFields.filter(f => f.category === 'metrics' || f.category === 'totals');
  const otherFields = sortedFields.filter(f => f.category === 'other');

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={onCancel}
          className="p-2 rounded-lg hover:bg-surface-100 text-surface-500 hover:text-surface-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-display font-bold text-surface-900">
          {isEditing ? 'Edit Event' : 'Add New Event'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Event Details */}
        <div className="card p-6">
          <h2 className="font-semibold text-surface-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Event Details
          </h2>
          <div className="space-y-4">
            {headerFields.map(renderField)}
          </div>
        </div>

        {/* Metrics */}
        <div className="card p-6">
          <h2 className="font-semibold text-surface-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Metrics & Counts
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {metricFields.map(renderField)}
          </div>
        </div>

        {/* Other Fields */}
        <div className="card p-6">
          <h2 className="font-semibold text-surface-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
            Additional Information
          </h2>
          <div className="space-y-4">
            {otherFields.map(renderField)}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onCancel} className="btn-secondary flex-1">
            Cancel
          </button>
          <button type="submit" className="btn-primary flex-1">
            {isEditing ? 'Save Changes' : 'Add Event'}
          </button>
        </div>
      </form>
    </div>
  );
}
