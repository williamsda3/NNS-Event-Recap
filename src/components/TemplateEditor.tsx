'use client';

import { useState } from 'react';
import { FormTemplate, FormField } from '@/types';
import FieldEditor from '@/components/FieldEditor';

interface TemplateEditorProps {
  template: FormTemplate;
  onSave: (template: FormTemplate) => void;
  onCancel: () => void;
}

export default function TemplateEditor({ template, onSave, onCancel }: TemplateEditorProps) {
  const [name, setName] = useState(template.name);
  const [description, setDescription] = useState(template.description);
  const [fields, setFields] = useState<FormField[]>([...template.fields].sort((a, b) => a.order - b.order));
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [showAddField, setShowAddField] = useState(false);

  const handleSave = () => {
    if (!name.trim()) return;

    const updatedTemplate: FormTemplate = {
      ...template,
      name: name.trim(),
      description: description.trim(),
      fields: fields.map((f, i) => ({ ...f, order: i + 1 })),
      updatedAt: new Date().toISOString(),
    };

    onSave(updatedTemplate);
  };

  const handleFieldSave = (savedField: FormField) => {
    if (editingField) {
      setFields(fields.map(f => f.id === editingField.id ? { ...savedField, order: f.order } : f));
      setEditingField(null);
    } else {
      setFields([...fields, { ...savedField, order: fields.length + 1 }]);
      setShowAddField(false);
    }
  };

  const handleFieldDelete = (fieldId: string) => {
    if (confirm('Are you sure you want to delete this field?')) {
      setFields(fields.filter(f => f.id !== fieldId));
      setEditingField(null);
    }
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === fields.length - 1) return;

    const newFields = [...fields];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [newFields[index], newFields[swapIndex]] = [newFields[swapIndex], newFields[index]];
    setFields(newFields);
  };

  const getCategoryColor = (category: FormField['category']) => {
    switch (category) {
      case 'header': return 'bg-orange-100 text-orange-700';
      case 'metrics': return 'bg-blue-100 text-blue-700';
      case 'totals': return 'bg-yellow-100 text-yellow-700';
      case 'other': return 'bg-gray-100 text-gray-700';
    }
  };

  const getTypeLabel = (type: FormField['type']) => {
    switch (type) {
      case 'text': return 'Text';
      case 'number': return 'Number';
      case 'longtext': return 'Long Text';
      case 'url': return 'URL';
      case 'date': return 'Date';
      case 'calculated': return 'Calculated';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-2xl max-h-[90vh] flex flex-col animate-fade-in">
        {/* Header */}
        <div className="p-6 border-b border-surface-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-xl text-surface-900">Edit Template</h2>
            <button
              onClick={onCancel}
              className="p-2 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-3">
            <div className="field-group">
              <label className="field-label">Template Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Template name"
                className="input-field"
              />
            </div>
            <div className="field-group">
              <label className="field-label">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this template"
                className="input-field"
              />
            </div>
          </div>
        </div>

        {/* Fields List */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-surface-900">Fields ({fields.length})</h3>
            <button
              onClick={() => setShowAddField(true)}
              className="btn-secondary text-sm flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Field
            </button>
          </div>

          {fields.length === 0 ? (
            <div className="text-center py-8 text-surface-500">
              <p>No fields yet. Add your first field to get started.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="flex items-center gap-3 p-3 bg-surface-50 rounded-lg border border-surface-100 hover:border-surface-200 transition-colors"
                >
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => moveField(index, 'up')}
                      disabled={index === 0}
                      className="p-1 rounded hover:bg-surface-200 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <svg className="w-4 h-4 text-surface-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => moveField(index, 'down')}
                      disabled={index === fields.length - 1}
                      className="p-1 rounded hover:bg-surface-200 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <svg className="w-4 h-4 text-surface-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-surface-900">{field.label}</span>
                      {field.required && (
                        <span className="text-red-500 text-sm">*</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getCategoryColor(field.category)}`}>
                        {field.category}
                      </span>
                      <span className="text-xs text-surface-500">{getTypeLabel(field.type)}</span>
                      <span className="text-xs text-surface-400 font-mono">{field.id}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setEditingField(field)}
                    className="p-2 rounded-lg hover:bg-surface-200 text-surface-500 hover:text-surface-700 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-surface-100 flex gap-3 justify-end">
          <button onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="btn-primary"
          >
            Save Template
          </button>
        </div>
      </div>

      {/* Field Editor Modal */}
      {(showAddField || editingField) && (
        <FieldEditor
          field={editingField || undefined}
          existingFieldIds={fields.filter(f => f.id !== editingField?.id).map(f => f.id)}
          onSave={handleFieldSave}
          onCancel={() => {
            setShowAddField(false);
            setEditingField(null);
          }}
          onDelete={editingField ? () => handleFieldDelete(editingField.id) : undefined}
        />
      )}
    </div>
  );
}
