'use client';

import { useState } from 'react';
import { DEFAULT_TEMPLATE } from '@/types';
import TemplateSelector from '@/components/TemplateSelector';
import ClientSelector from '@/components/ClientSelector';

interface CreateProjectModalProps {
  onClose: () => void;
  onCreate: (name: string, dateRange: string, templateId: string, clientId: string) => void;
}

export default function CreateProjectModal({ onClose, onCreate }: CreateProjectModalProps) {
  const [name, setName] = useState('');
  const [dateRange, setDateRange] = useState('');
  const [templateId, setTemplateId] = useState(DEFAULT_TEMPLATE.id);
  const [clientId, setClientId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && dateRange.trim() && clientId) {
      onCreate(name.trim(), dateRange.trim(), templateId, clientId);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card p-6 w-full max-w-md animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display font-semibold text-xl text-surface-900">Create New Project</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="field-group">
            <label htmlFor="name" className="field-label">Project Name</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., NVTA BRT PDP Pop-Up Events"
              className="input-field"
              autoFocus
            />
            <p className="field-hint">A descriptive name for your outreach project</p>
          </div>

          <div className="field-group">
            <label htmlFor="dateRange" className="field-label">Date Range</label>
            <input
              type="text"
              id="dateRange"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              placeholder="e.g., April 19 - May 18, 2025"
              className="input-field"
            />
            <p className="field-hint">The time period covered by this project</p>
          </div>

          <div className="field-group">
            <label className="field-label">Template</label>
            <TemplateSelector
              selectedId={templateId}
              onChange={setTemplateId}
            />
            <p className="field-hint">Choose which form template to use for this project</p>
          </div>

          <ClientSelector
            value={clientId}
            onChange={setClientId}
          />

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={!name.trim() || !dateRange.trim() || !clientId}
            >
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
