'use client';

import { useState, useEffect } from 'react';
import {
  generateFolderPath,
  buildCreateFolderUrl,
  validateShareLink,
  isSharePointConfigured,
  getSharePointConfig,
  saveSharePointConfig,
} from '@/lib/sharepoint';

interface PhotoAlbumFieldProps {
  value: string;
  onChange: (value: string) => void;
  projectName: string;
  eventName: string;
  eventDate?: string;
  required?: boolean;
  clientLibrary?: string;
}

export default function PhotoAlbumField({
  value,
  onChange,
  projectName,
  eventName,
  eventDate,
  required,
  clientLibrary,
}: PhotoAlbumFieldProps) {
  const [showHelp, setShowHelp] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [validation, setValidation] = useState<{ valid: boolean; message: string }>({ valid: true, message: '' });
  const [isConfigured, setIsConfigured] = useState(false);
  const [configForm, setConfigForm] = useState({ baseUrl: '', libraryName: '' });

  useEffect(() => {
    // If clientLibrary is provided, we only need baseUrl to be configured
    const config = getSharePointConfig();
    setConfigForm(config);
    if (clientLibrary) {
      setIsConfigured(!!config.baseUrl);
    } else {
      setIsConfigured(isSharePointConfigured());
    }
  }, [clientLibrary]);

  useEffect(() => {
    if (value) {
      const result = validateShareLink(value);
      setValidation(result);
    } else {
      setValidation({ valid: true, message: '' });
    }
  }, [value]);

  const handleOpenSharePoint = () => {
    if (!isConfigured) {
      setShowConfig(true);
      return;
    }

    // Use clientLibrary if provided, otherwise fall back to global config
    const url = buildCreateFolderUrl(projectName, clientLibrary);

    if (url) {
      // Open SharePoint in new tab
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleSaveConfig = () => {
    saveSharePointConfig(configForm.baseUrl, configForm.libraryName);
    setIsConfigured(true);
    setShowConfig(false);
  };

  const suggestedFolderName = eventName && eventDate
    ? `${eventName}_${new Date(eventDate).toISOString().split('T')[0]}`
    : eventName || 'Event Photos';

  return (
    <div className="field-group">
      <label className="field-label">
        Photo Album
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {/* SharePoint Actions */}
      <div className="flex flex-wrap gap-2 mb-3">
        <button
          type="button"
          onClick={handleOpenSharePoint}
          className="btn-secondary text-sm flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          {isConfigured ? 'Open SharePoint' : 'Configure SharePoint'}
        </button>

        <button
          type="button"
          onClick={() => setShowHelp(true)}
          className="btn-ghost text-sm flex items-center gap-1.5 text-surface-500"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          How to get a share link
        </button>
      </div>

      {/* Suggested folder name */}
      {isConfigured && (eventName || projectName) && (
        <div className="text-xs text-surface-500 mb-2 bg-surface-50 p-2 rounded">
          <span className="font-medium">Suggested folder name:</span> {suggestedFolderName}
        </div>
      )}

      {/* Share Link Input */}
      <div className="relative">
        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Paste SharePoint sharing link here..."
          className={`input-field pr-10 ${!validation.valid ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : ''}`}
          required={required}
        />
        {value && validation.valid && (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded"
            title="Open album"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}
      </div>

      {/* Validation message */}
      {validation.message && (
        <p className={`text-sm mt-1 ${validation.valid ? 'text-amber-600' : 'text-red-500'}`}>
          {validation.message}
        </p>
      )}

      {/* Status indicator */}
      {value && validation.valid && !validation.message && (
        <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Link saved
        </p>
      )}

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-lg text-surface-900">
                How to Create a SharePoint Share Link
              </h3>
              <button
                onClick={() => setShowHelp(false)}
                className="p-2 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 text-surface-600">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-brand-100 text-brand-700 rounded-full flex items-center justify-center text-sm font-medium">
                  1
                </div>
                <div>
                  <p className="font-medium text-surface-900">Open SharePoint</p>
                  <p className="text-sm">Click &quot;Open SharePoint&quot; button above to go to your photo library.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-brand-100 text-brand-700 rounded-full flex items-center justify-center text-sm font-medium">
                  2
                </div>
                <div>
                  <p className="font-medium text-surface-900">Create a folder for this event</p>
                  <p className="text-sm">Click &quot;+ New&quot; → &quot;Folder&quot; and use the suggested name above.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-brand-100 text-brand-700 rounded-full flex items-center justify-center text-sm font-medium">
                  3
                </div>
                <div>
                  <p className="font-medium text-surface-900">Upload your photos</p>
                  <p className="text-sm">Open the folder and drag-drop photos, or use &quot;Upload&quot; button.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-brand-100 text-brand-700 rounded-full flex items-center justify-center text-sm font-medium">
                  4
                </div>
                <div>
                  <p className="font-medium text-surface-900">Get the sharing link</p>
                  <p className="text-sm">
                    Select the folder → Click &quot;Share&quot; → Choose &quot;Anyone with the link&quot; →
                    Set to &quot;Can view&quot; → Copy the link.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-brand-100 text-brand-700 rounded-full flex items-center justify-center text-sm font-medium">
                  5
                </div>
                <div>
                  <p className="font-medium text-surface-900">Paste the link</p>
                  <p className="text-sm">Paste the copied link into the field above.</p>
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
                <p className="font-medium">Tip for mobile:</p>
                <p>Use the SharePoint mobile app to upload photos directly from your phone&apos;s camera.</p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button onClick={() => setShowHelp(false)} className="btn-primary">
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Configuration Modal */}
      {showConfig && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-lg text-surface-900">
                Configure SharePoint
              </h3>
              <button
                onClick={() => setShowConfig(false)}
                className="p-2 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-sm text-surface-600 mb-4">
              Enter your SharePoint site URL to enable the &quot;Open SharePoint&quot; button.
            </p>

            <div className="space-y-4">
              <div className="field-group">
                <label className="field-label">SharePoint Site URL</label>
                <input
                  type="url"
                  value={configForm.baseUrl}
                  onChange={(e) => setConfigForm({ ...configForm, baseUrl: e.target.value })}
                  placeholder="https://yourcompany.sharepoint.com/sites/YourSite"
                  className="input-field"
                />
                <p className="field-hint">The URL of your SharePoint site (not the full library path)</p>
              </div>

              <div className="field-group">
                <label className="field-label">Document Library Name</label>
                <input
                  type="text"
                  value={configForm.libraryName}
                  onChange={(e) => setConfigForm({ ...configForm, libraryName: e.target.value })}
                  placeholder="Event Photos"
                  className="input-field"
                />
                <p className="field-hint">The name of the document library for event photos</p>
              </div>
            </div>

            <div className="mt-6 flex gap-3 justify-end">
              <button onClick={() => setShowConfig(false)} className="btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleSaveConfig}
                disabled={!configForm.baseUrl}
                className="btn-primary"
              >
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
