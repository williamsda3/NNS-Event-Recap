'use client';

import { useState, useEffect } from 'react';
import { FormTemplate, DEFAULT_TEMPLATE } from '@/types';
import { db } from '@/lib/storage';
import { v4 as uuidv4 } from 'uuid';
import TemplateEditor from '@/components/TemplateEditor';

interface TemplateManagerProps {
  onClose: () => void;
}

export default function TemplateManager({ onClose }: TemplateManagerProps) {
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<FormTemplate | null>(null);

  useEffect(() => {
    db.getTemplates().then(setTemplates);
  }, []);

  const refreshTemplates = async () => {
    const t = await db.getTemplates();
    setTemplates(t);
  };

  const handleDuplicate = (template: FormTemplate) => {
    const newTemplate: FormTemplate = {
      ...template,
      id: uuidv4(),
      name: `${template.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      fields: template.fields.map(f => ({ ...f })),
    };
    setEditingTemplate(newTemplate);
  };

  const handleSaveTemplate = async (template: FormTemplate) => {
    await db.saveTemplate(template);
    await refreshTemplates();
    setEditingTemplate(null);
  };

  const handleDeleteTemplate = async (templateId: string) => {
    // Check if template is in use
    const projects = await db.getProjects();
    const projectsUsingTemplate = projects.filter(p => p.templateId === templateId);

    if (projectsUsingTemplate.length > 0) {
      alert(`Cannot delete this template. It is used by ${projectsUsingTemplate.length} project(s): ${projectsUsingTemplate.map(p => p.name).join(', ')}`);
      return;
    }

    if (confirm('Are you sure you want to delete this template?')) {
      await db.deleteTemplate(templateId);
      await refreshTemplates();
    }
  };

  const isDefaultTemplate = (templateId: string) => templateId === DEFAULT_TEMPLATE.id;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-2xl max-h-[90vh] flex flex-col animate-fade-in">
        {/* Header */}
        <div className="p-6 border-b border-surface-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display font-semibold text-xl text-surface-900">Manage Templates</h2>
              <p className="text-sm text-surface-500 mt-1">
                Duplicate templates to create customized versions
              </p>
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
        </div>

        {/* Templates List */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-3">
            {templates.map((template) => (
              <div
                key={template.id}
                className="p-4 bg-surface-50 rounded-lg border border-surface-100"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-surface-900">{template.name}</h3>
                      {isDefaultTemplate(template.id) && (
                        <span className="text-xs px-2 py-0.5 bg-brand-100 text-brand-700 rounded-full">
                          Default
                        </span>
                      )}
                    </div>
                    {template.description && (
                      <p className="text-sm text-surface-500 mt-1">{template.description}</p>
                    )}
                    <p className="text-xs text-surface-400 mt-2">
                      {template.fields.length} fields
                    </p>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleDuplicate(template)}
                      className="p-2 rounded-lg hover:bg-surface-200 text-surface-500 hover:text-surface-700 transition-colors"
                      title="Duplicate template"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                    {!isDefaultTemplate(template.id) && (
                      <>
                        <button
                          onClick={() => setEditingTemplate(template)}
                          className="p-2 rounded-lg hover:bg-surface-200 text-surface-500 hover:text-surface-700 transition-colors"
                          title="Edit template"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteTemplate(template.id)}
                          className="p-2 rounded-lg hover:bg-red-50 text-surface-400 hover:text-red-600 transition-colors"
                          title="Delete template"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-surface-100 flex justify-end">
          <button onClick={onClose} className="btn-primary">
            Done
          </button>
        </div>
      </div>

      {/* Template Editor */}
      {editingTemplate && (
        <TemplateEditor
          template={editingTemplate}
          onSave={handleSaveTemplate}
          onCancel={() => setEditingTemplate(null)}
        />
      )}
    </div>
  );
}
