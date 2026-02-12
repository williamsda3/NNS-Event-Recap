'use client';

import { useState, useEffect } from 'react';
import { FormTemplate } from '@/types';
import { db } from '@/lib/storage';

interface TemplateSelectorProps {
  selectedId: string;
  onChange: (templateId: string) => void;
  disabled?: boolean;
}

export default function TemplateSelector({ selectedId, onChange, disabled }: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    db.getTemplates().then(setTemplates);
  }, []);

  const selectedTemplate = templates.find(t => t.id === selectedId);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full px-4 py-2.5 text-left bg-white border border-surface-200 rounded-lg flex items-center justify-between transition-colors ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-surface-300 cursor-pointer'
        }`}
      >
        <div className="flex-1 min-w-0">
          <div className="font-medium text-surface-900 truncate">
            {selectedTemplate?.name || 'Select a template'}
          </div>
          {selectedTemplate?.description && (
            <div className="text-sm text-surface-500 truncate">
              {selectedTemplate.description}
            </div>
          )}
        </div>
        <svg
          className={`w-5 h-5 text-surface-400 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-20 w-full mt-1 bg-white border border-surface-200 rounded-lg shadow-lg max-h-60 overflow-auto">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => {
                  onChange(template.id);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-3 text-left hover:bg-surface-50 transition-colors border-b border-surface-100 last:border-b-0 ${
                  template.id === selectedId ? 'bg-brand-50' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium text-surface-900">{template.name}</div>
                  {template.id === selectedId && (
                    <svg className="w-5 h-5 text-brand-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                {template.description && (
                  <div className="text-sm text-surface-500 mt-0.5">{template.description}</div>
                )}
                <div className="text-xs text-surface-400 mt-1">
                  {template.fields.length} fields
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
