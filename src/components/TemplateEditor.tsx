'use client';

import { useState } from 'react';
import { FormTemplate, FormField, FormSection } from '@/types';
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
  const [sections, setSections] = useState<FormSection[]>([...(template.sections || [])].sort((a, b) => a.order - b.order));
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [showAddField, setShowAddField] = useState(false);
  const [activeTab, setActiveTab] = useState<'fields' | 'sections'>('fields');
  const [editingSection, setEditingSection] = useState<FormSection | null>(null);
  const [showAddSection, setShowAddSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newSectionDescription, setNewSectionDescription] = useState('');

  const handleSave = () => {
    if (!name.trim()) return;

    const updatedTemplate: FormTemplate = {
      ...template,
      name: name.trim(),
      description: description.trim(),
      fields: fields.map((f, i) => ({ ...f, order: i + 1 })),
      sections: sections.map((s, i) => ({ ...s, order: i + 1 })),
      updatedAt: new Date().toISOString(),
    };

    onSave(updatedTemplate);
  };

  const handleAddSection = () => {
    if (!newSectionTitle.trim()) return;
    const newSection: FormSection = {
      id: newSectionTitle.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
      title: newSectionTitle.trim(),
      description: newSectionDescription.trim() || undefined,
      order: sections.length + 1,
    };
    setSections([...sections, newSection]);
    setNewSectionTitle('');
    setNewSectionDescription('');
    setShowAddSection(false);
  };

  const handleSaveSection = (section: FormSection) => {
    setSections(sections.map(s => s.id === section.id ? section : s));
    setEditingSection(null);
  };

  const handleDeleteSection = (sectionId: string) => {
    if (!confirm('Delete this section? Fields assigned to it will become unassigned.')) return;
    setSections(sections.filter(s => s.id !== sectionId));
    setFields(fields.map(f => f.sectionId === sectionId ? { ...f, sectionId: undefined } : f));
  };

  const moveSectionUp = (index: number) => {
    if (index === 0) return;
    const next = [...sections];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    setSections(next);
  };

  const moveSectionDown = (index: number) => {
    if (index === sections.length - 1) return;
    const next = [...sections];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    setSections(next);
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

        {/* Tabs */}
        <div className="border-b border-surface-100 px-6 flex gap-1">
          <button
            onClick={() => setActiveTab('fields')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'fields'
                ? 'border-brand-500 text-brand-600'
                : 'border-transparent text-surface-500 hover:text-surface-700'
            }`}
          >
            Fields ({fields.length})
          </button>
          <button
            onClick={() => setActiveTab('sections')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'sections'
                ? 'border-brand-500 text-brand-600'
                : 'border-transparent text-surface-500 hover:text-surface-700'
            }`}
          >
            Sections ({sections.length})
          </button>
        </div>

        {/* Fields Tab */}
        {activeTab === 'fields' && (
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
                {fields.map((field, index) => {
                  const assignedSection = sections.find(s => s.id === field.sectionId);
                  return (
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
                          {field.required && <span className="text-red-500 text-sm">*</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {assignedSection ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-brand-100 text-brand-700">
                              {assignedSection.title}
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-surface-200 text-surface-500">
                              No section
                            </span>
                          )}
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getCategoryColor(field.category)}`}>
                            {field.category}
                          </span>
                          <span className="text-xs text-surface-500">{getTypeLabel(field.type)}</span>
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
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Sections Tab */}
        {activeTab === 'sections' && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-surface-900">Sections ({sections.length})</h3>
              <button
                onClick={() => setShowAddSection(true)}
                className="btn-secondary text-sm flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Section
              </button>
            </div>

            {/* Add section inline form */}
            {showAddSection && (
              <div className="mb-4 p-4 bg-brand-50 border border-brand-200 rounded-lg space-y-3">
                <input
                  type="text"
                  value={newSectionTitle}
                  onChange={e => setNewSectionTitle(e.target.value)}
                  placeholder="Section title (e.g. Set-Up and Logistics)"
                  className="input-field"
                  autoFocus
                />
                <input
                  type="text"
                  value={newSectionDescription}
                  onChange={e => setNewSectionDescription(e.target.value)}
                  placeholder="Description (optional)"
                  className="input-field"
                />
                <div className="flex gap-2">
                  <button onClick={handleAddSection} disabled={!newSectionTitle.trim()} className="btn-primary text-sm">
                    Add
                  </button>
                  <button onClick={() => { setShowAddSection(false); setNewSectionTitle(''); setNewSectionDescription(''); }} className="btn-secondary text-sm">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {sections.length === 0 ? (
              <div className="text-center py-8 text-surface-500">
                <p>No sections yet. Add sections to group your form fields.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sections.map((section, index) => (
                  <div key={section.id}>
                    {editingSection?.id === section.id ? (
                      <div className="p-4 bg-brand-50 border border-brand-200 rounded-lg space-y-3">
                        <input
                          type="text"
                          value={editingSection.title}
                          onChange={e => setEditingSection({ ...editingSection, title: e.target.value })}
                          className="input-field"
                          autoFocus
                        />
                        <input
                          type="text"
                          value={editingSection.description || ''}
                          onChange={e => setEditingSection({ ...editingSection, description: e.target.value || undefined })}
                          placeholder="Description (optional)"
                          className="input-field"
                        />
                        <div className="flex gap-2">
                          <button onClick={() => handleSaveSection(editingSection)} disabled={!editingSection.title.trim()} className="btn-primary text-sm">
                            Save
                          </button>
                          <button onClick={() => setEditingSection(null)} className="btn-secondary text-sm">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 p-3 bg-surface-50 rounded-lg border border-surface-100 hover:border-surface-200 transition-colors">
                        <div className="flex flex-col gap-1">
                          <button onClick={() => moveSectionUp(index)} disabled={index === 0} className="p-1 rounded hover:bg-surface-200 disabled:opacity-30 disabled:cursor-not-allowed">
                            <svg className="w-4 h-4 text-surface-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          </button>
                          <button onClick={() => moveSectionDown(index)} disabled={index === sections.length - 1} className="p-1 rounded hover:bg-surface-200 disabled:opacity-30 disabled:cursor-not-allowed">
                            <svg className="w-4 h-4 text-surface-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>

                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-surface-900">{section.title}</span>
                          {section.description && (
                            <p className="text-xs text-surface-500 mt-0.5 truncate">{section.description}</p>
                          )}
                          <p className="text-xs text-surface-400 mt-0.5">
                            {fields.filter(f => f.sectionId === section.id).length} field(s)
                          </p>
                        </div>

                        <div className="flex gap-1">
                          <button
                            onClick={() => setEditingSection(section)}
                            className="p-2 rounded-lg hover:bg-surface-200 text-surface-500 hover:text-surface-700 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteSection(section.id)}
                            className="p-2 rounded-lg hover:bg-red-50 text-surface-400 hover:text-red-600 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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
          sections={sections}
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
