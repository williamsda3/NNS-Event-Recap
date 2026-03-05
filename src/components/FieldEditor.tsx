'use client';

import { useState } from 'react';
import { FormField, FormSection, FieldType } from '@/types';

interface FieldEditorProps {
  field?: FormField;
  existingFieldIds: string[];
  sections?: FormSection[];
  onSave: (field: FormField) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

const FIELD_TYPES: { value: FieldType; label: string; description: string }[] = [
  { value: 'text', label: 'Text', description: 'Short text input' },
  { value: 'number', label: 'Number', description: 'Numeric input' },
  { value: 'longtext', label: 'Long Text', description: 'Multi-line text area' },
  { value: 'url', label: 'URL', description: 'Web link input' },
  { value: 'date', label: 'Date', description: 'Date picker' },
  { value: 'checkbox', label: 'Checkbox', description: 'Multiple selectable options' },
  { value: 'calculated', label: 'Calculated', description: 'Auto-calculated from other fields' },
];

const CATEGORIES: { value: FormField['category']; label: string }[] = [
  { value: 'header', label: 'Header' },
  { value: 'metrics', label: 'Metrics' },
  { value: 'totals', label: 'Totals' },
  { value: 'other', label: 'Other' },
];

export default function FieldEditor({ field, existingFieldIds, sections, onSave, onCancel, onDelete }: FieldEditorProps) {
  const isEditing = !!field;

  const [label, setLabel] = useState(field?.label || '');
  const [fieldId, setFieldId] = useState(field?.id || '');
  const [type, setType] = useState<FieldType>(field?.type || 'text');
  const [category, setCategory] = useState<FormField['category']>(field?.category || 'metrics');
  const [sectionId, setSectionId] = useState<string | undefined>(field?.sectionId);
  const [required, setRequired] = useState(field?.required || false);
  const [formula, setFormula] = useState(field?.formula || '');
  const [options, setOptions] = useState<string[]>(field?.options || []);
  const [newOption, setNewOption] = useState('');

  const generateIdFromLabel = (labelText: string) => {
    return labelText
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  };

  const handleLabelChange = (newLabel: string) => {
    setLabel(newLabel);
    if (!isEditing) {
      setFieldId(generateIdFromLabel(newLabel));
    }
  };

  const isIdValid = () => {
    if (!fieldId.trim()) return false;
    if (isEditing && fieldId === field?.id) return true;
    return !existingFieldIds.includes(fieldId);
  };

  const handleSave = () => {
    if (!label.trim() || !fieldId.trim() || !isIdValid()) return;

    const savedField: FormField = {
      id: fieldId,
      label: label.trim(),
      type,
      category,
      sectionId: sectionId || undefined,
      required,
      order: field?.order || 0,
      ...(type === 'calculated' && formula ? { formula } : {}),
      ...(type === 'checkbox' ? { options } : {}),
    };

    onSave(savedField);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card p-6 w-full max-w-lg animate-fade-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display font-semibold text-xl text-surface-900">
            {isEditing ? 'Edit Field' : 'Add Field'}
          </h2>
          <button
            onClick={onCancel}
            className="p-2 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div className="field-group">
            <label className="field-label">Field Label</label>
            <input
              type="text"
              value={label}
              onChange={(e) => handleLabelChange(e.target.value)}
              placeholder="e.g., Total Survey Responses"
              className="input-field"
              autoFocus
            />
            <p className="field-hint">The label shown on the form</p>
          </div>

          <div className="field-group">
            <label className="field-label">Field ID</label>
            <input
              type="text"
              value={fieldId}
              onChange={(e) => setFieldId(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              placeholder="e.g., total_survey_responses"
              className={`input-field ${!isIdValid() && fieldId ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : ''}`}
              disabled={isEditing}
            />
            {!isIdValid() && fieldId && (
              <p className="text-sm text-red-500 mt-1">This ID is already in use</p>
            )}
            <p className="field-hint">Unique identifier (lowercase, underscores only)</p>
          </div>

          <div className="field-group">
            <label className="field-label">Field Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as FieldType)}
              className="input-field"
            >
              {FIELD_TYPES.map((ft) => (
                <option key={ft.value} value={ft.value}>
                  {ft.label} - {ft.description}
                </option>
              ))}
            </select>
          </div>

          {sections && sections.length > 0 && (
            <div className="field-group">
              <label className="field-label">Section</label>
              <select
                value={sectionId || ''}
                onChange={(e) => setSectionId(e.target.value || undefined)}
                className="input-field"
              >
                <option value="">— No section —</option>
                {sections.map(s => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>
              <p className="field-hint">Which section of the form this field appears in</p>
            </div>
          )}

          <div className="field-group">
            <label className="field-label">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as FormField['category'])}
              className="input-field"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
            <p className="field-hint">Used for Excel export formatting</p>
          </div>

          {type === 'checkbox' && (
            <div className="field-group">
              <label className="field-label">Options</label>
              <div className="space-y-2 mb-2">
                {options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="flex-1 text-sm text-surface-700 bg-surface-50 border border-surface-200 rounded px-3 py-1.5">{opt}</span>
                    <button
                      type="button"
                      onClick={() => setOptions(options.filter((_, j) => j !== i))}
                      className="p-1.5 rounded hover:bg-red-50 text-surface-400 hover:text-red-500 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newOption}
                  onChange={e => setNewOption(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (newOption.trim() && !options.includes(newOption.trim())) {
                        setOptions([...options, newOption.trim()]);
                        setNewOption('');
                      }
                    }
                  }}
                  placeholder="Add an option..."
                  className="input-field flex-1"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newOption.trim() && !options.includes(newOption.trim())) {
                      setOptions([...options, newOption.trim()]);
                      setNewOption('');
                    }
                  }}
                  disabled={!newOption.trim()}
                  className="btn-secondary text-sm px-3"
                >
                  Add
                </button>
              </div>
              <p className="field-hint">Press Enter or click Add to add each option</p>
            </div>
          )}

          {type === 'calculated' && (
            <div className="field-group">
              <label className="field-label">Formula</label>
              <input
                type="text"
                value={formula}
                onChange={(e) => setFormula(e.target.value)}
                placeholder="e.g., field_a + field_b"
                className="input-field font-mono text-sm"
              />
              <p className="field-hint">
                Use field IDs with + to sum them. Example: interactions_english + interactions_spanish
              </p>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="required"
              checked={required}
              onChange={(e) => setRequired(e.target.checked)}
              className="w-4 h-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500"
            />
            <label htmlFor="required" className="text-sm text-surface-700">
              Required field
            </label>
          </div>
        </div>

        <div className="flex gap-3 mt-6 pt-4 border-t border-surface-100">
          {isEditing && onDelete && (
            <button
              onClick={onDelete}
              className="btn-ghost text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
          )}
          <div className="flex-1" />
          <button onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!label.trim() || !fieldId.trim() || !isIdValid()}
            className="btn-primary"
          >
            {isEditing ? 'Save Changes' : 'Add Field'}
          </button>
        </div>
      </div>
    </div>
  );
}
