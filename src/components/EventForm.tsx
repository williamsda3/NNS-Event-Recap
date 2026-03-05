'use client';

import { useState, useEffect } from 'react';
import { FormTemplate, FormField } from '@/types';
import PhotoUpload from '@/components/PhotoUpload';

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
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);

  useEffect(() => {
    if (initialValues) {
      setResponses(initialValues);
    }
  }, [initialValues]);

  const sortedFields = [...template.fields].sort((a, b) => a.order - b.order);

  // Build section list — use template sections if defined, otherwise fall back to category grouping
  const templateSections = (template.sections || []).sort((a, b) => a.order - b.order);
  const useSections = templateSections.length > 0;

  const sectionGroups = useSections
    ? templateSections.map(section => ({
        section,
        fields: sortedFields.filter(f => f.sectionId === section.id),
      })).filter(g => g.fields.length > 0)
    : [
        { section: { id: 'header', title: 'Event Details', description: '', order: 1 }, fields: sortedFields.filter(f => f.category === 'header') },
        { section: { id: 'metrics', title: 'Metrics & Counts', description: '', order: 2 }, fields: sortedFields.filter(f => f.category === 'metrics' || f.category === 'totals') },
        { section: { id: 'other', title: 'Additional Information', description: '', order: 3 }, fields: sortedFields.filter(f => f.category === 'other') },
      ].filter(g => g.fields.length > 0);

  const totalSections = sectionGroups.length;
  const isFirstSection = currentSectionIndex === 0;
  const isLastSection = currentSectionIndex === totalSections - 1;
  const currentGroup = sectionGroups[currentSectionIndex];

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

  const handleNext = () => {
    if (!isLastSection) setCurrentSectionIndex(i => i + 1);
  };

  const handleBack = () => {
    if (!isFirstSection) setCurrentSectionIndex(i => i - 1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLastSection) {
      handleNext();
    } else {
      onSubmit({ ...responses });
    }
  };

  const renderField = (field: FormField) => {
    // Hide calculated fields — totals are handled in Excel export
    if (field.type === 'calculated') {
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
        // Use PhotoUpload for photo_album field (auto-uploads to SharePoint)
        if (field.id === 'photo_album') {
          const eventName = (responses['event_name'] as string) || '';
          const eventDate = (responses['event_date_time'] as string) || '';
          return (
            <PhotoUpload
              key={field.id}
              value={value as string}
              onChange={(val) => handleChange(field.id, val)}
              projectName={projectName}
              eventName={eventName}
              eventDate={eventDate}
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
              {options.length === 0 && (
                <p className="text-sm text-surface-400 italic">No options configured for this field.</p>
              )}
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      {/* Header */}
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

      {/* Progress indicator */}
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

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section header card */}
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

        {/* Fields for current section */}
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
          ) : (
            <button type="button" onClick={onCancel} className="btn-secondary flex-1">
              Cancel
            </button>
          )}
          <button type="submit" className="btn-primary flex-1">
            {isLastSection
              ? (isEditing ? 'Save Changes' : 'Submit')
              : 'Next →'}
          </button>
        </div>
      </form>
    </div>
  );
}
