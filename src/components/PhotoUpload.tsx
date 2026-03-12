'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface PhotoUploadProps {
  projectName: string;
  eventName: string;
  eventDate?: string;
  value: string; // current photo_album URL
  onChange: (url: string) => void;
}

interface SelectedPhoto {
  id: string;
  file: File;
  preview: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
}

/** Compress an image file using Canvas API to stay under the size limit */
async function compressImage(file: File, maxSizeMB = 3.5, maxDimension = 2048): Promise<File> {
  // Skip non-image or already small files
  if (!file.type.startsWith('image/') || file.size < maxSizeMB * 1024 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;

      // Scale down if larger than maxDimension
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob && blob.size < file.size) {
            resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }));
          } else {
            resolve(file); // Compression didn't help, use original
          }
        },
        'image/jpeg',
        0.8
      );
    };
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}

export default function PhotoUpload({
  projectName,
  eventName,
  eventDate,
  value,
  onChange,
}: PhotoUploadProps) {
  const [photos, setPhotos] = useState<SelectedPhoto[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [shareUrl, setShareUrl] = useState(value || '');
  const [error, setError] = useState('');
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Check if upload is configured on mount
  useEffect(() => {
    fetch('/api/upload-photos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'check-config' }),
    })
      .then((res) => setIsConfigured(res.ok))
      .catch(() => setIsConfigured(false));
  }, []);

  const addPhotos = useCallback((files: FileList | File[]) => {
    const newPhotos: SelectedPhoto[] = Array.from(files)
      .filter((f) => f.type.startsWith('image/'))
      .map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        preview: URL.createObjectURL(file),
        status: 'pending' as const,
      }));

    if (newPhotos.length === 0) {
      setError('No valid image files selected');
      return;
    }

    setPhotos((prev) => [...prev, ...newPhotos]);
    setError('');
  }, []);

  const removePhoto = useCallback((id: string) => {
    setPhotos((prev) => {
      const photo = prev.find((p) => p.id === id);
      if (photo) URL.revokeObjectURL(photo.preview);
      return prev.filter((p) => p.id !== id);
    });
  }, []);

  const handleUpload = async () => {
    const pendingPhotos = photos.filter((p) => p.status === 'pending' || p.status === 'error');
    if (pendingPhotos.length === 0) return;

    setIsUploading(true);
    setError('');
    setUploadProgress({ current: 0, total: pendingPhotos.length });

    try {
      // Step 1: Create folder on SharePoint
      const folderRes = await fetch('/api/upload-photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-folder',
          projectName,
          eventName,
          eventDate,
        }),
      });

      if (!folderRes.ok) {
        const data = await folderRes.json();
        throw new Error(data.error || 'Failed to create folder');
      }

      const { folderId, folderPath, webUrl: folderWebUrl } = await folderRes.json();

      // Step 2: Upload each photo
      for (let i = 0; i < pendingPhotos.length; i++) {
        const photo = pendingPhotos[i];
        setUploadProgress({ current: i + 1, total: pendingPhotos.length });

        // Mark as uploading
        setPhotos((prev) =>
          prev.map((p) => (p.id === photo.id ? { ...p, status: 'uploading' } : p))
        );

        try {
          const compressed = await compressImage(photo.file);
          const formData = new FormData();
          formData.append('file', compressed);
          formData.append('folderPath', folderPath);

          const uploadRes = await fetch('/api/upload-photos', {
            method: 'POST',
            body: formData,
          });

          if (!uploadRes.ok) {
            const data = await uploadRes.json();
            throw new Error(data.error || 'Upload failed');
          }

          // Mark as done
          setPhotos((prev) =>
            prev.map((p) => (p.id === photo.id ? { ...p, status: 'done' } : p))
          );
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Upload failed';
          setPhotos((prev) =>
            prev.map((p) => (p.id === photo.id ? { ...p, status: 'error', error: message } : p))
          );
        }
      }

      // Step 3: Create sharing link
      const linkRes = await fetch('/api/upload-photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create-link', folderId, folderWebUrl }),
      });

      if (linkRes.ok) {
        const { shareUrl: url } = await linkRes.json();
        if (url) {
          setShareUrl(url);
          onChange(url);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setError(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addPhotos(e.target.files);
    }
    // Reset input so the same file can be selected again
    e.target.value = '';
  };

  const pendingCount = photos.filter((p) => p.status === 'pending' || p.status === 'error').length;
  const doneCount = photos.filter((p) => p.status === 'done').length;

  // If upload isn't configured, show a simple URL input fallback
  if (isConfigured === false) {
    return (
      <div className="field-group">
        <label className="field-label">Photo Album</label>
        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Paste SharePoint photo album link..."
          className="input-field"
        />
        <p className="field-hint">Paste a link to your event photo album</p>
      </div>
    );
  }

  // Loading state while checking config
  if (isConfigured === null) {
    return (
      <div className="field-group">
        <label className="field-label">Photo Album</label>
        <div className="input-field bg-surface-50 text-surface-400 flex items-center gap-2">
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Checking photo upload...
        </div>
      </div>
    );
  }

  return (
    <div className="field-group">
      <label className="field-label">Event Photos</label>

      {/* Upload area */}
      {!isUploading && !shareUrl && (
        <div className="border-2 border-dashed border-surface-200 rounded-xl p-6 text-center hover:border-brand-300 transition-colors">
          <svg className="w-10 h-10 text-surface-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>

          <div className="flex flex-wrap justify-center gap-2 mb-3">
            {/* Camera button (mobile-friendly) */}
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="btn-primary text-sm flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Take Photo
            </button>

            {/* File picker button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn-secondary text-sm flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
              </svg>
              Choose Photos
            </button>
          </div>

          <p className="text-xs text-surface-400">Tap to take a photo or select from your gallery</p>
        </div>
      )}

      {/* Photo thumbnails */}
      {photos.length > 0 && (
        <div className="mt-3">
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {photos.map((photo) => (
              <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden bg-surface-100">
                <img
                  src={photo.preview}
                  alt=""
                  className={`w-full h-full object-cover ${photo.status === 'uploading' ? 'opacity-50' : ''}`}
                />

                {/* Status overlay */}
                {photo.status === 'uploading' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <svg className="w-6 h-6 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  </div>
                )}

                {photo.status === 'done' && (
                  <div className="absolute top-1 right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}

                {photo.status === 'error' && (
                  <div className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center" title={photo.error}>
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                )}

                {/* Remove button (only when not uploading) */}
                {!isUploading && photo.status !== 'done' && (
                  <button
                    type="button"
                    onClick={() => removePhoto(photo.id)}
                    className="absolute top-1 left-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center hover:bg-black/80"
                  >
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}

            {/* Add more button */}
            {!isUploading && !shareUrl && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-lg border-2 border-dashed border-surface-200 flex flex-col items-center justify-center text-surface-400 hover:border-brand-300 hover:text-brand-500 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-xs mt-1">Add</span>
              </button>
            )}
          </div>

          {/* Upload progress */}
          {isUploading && (
            <div className="mt-3 p-3 bg-brand-50 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-brand-700 mb-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Uploading {uploadProgress.current} of {uploadProgress.total} photos...
              </div>
              <div className="w-full bg-brand-100 rounded-full h-2">
                <div
                  className="bg-brand-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Upload button */}
          {!isUploading && pendingCount > 0 && (
            <button
              type="button"
              onClick={handleUpload}
              className="mt-3 btn-primary w-full flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload {pendingCount} Photo{pendingCount !== 1 ? 's' : ''} to SharePoint
            </button>
          )}

          {/* Completion summary */}
          {!isUploading && doneCount > 0 && pendingCount === 0 && (
            <div className="mt-3 p-3 bg-green-50 rounded-lg text-sm text-green-700 flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              {doneCount} photo{doneCount !== 1 ? 's' : ''} uploaded successfully
            </div>
          )}
        </div>
      )}

      {/* Share URL display */}
      {shareUrl && (
        <div className="mt-3 p-3 bg-surface-50 rounded-lg">
          <p className="text-xs text-surface-500 mb-1">Photo Album Link</p>
          <a
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-brand-600 hover:text-brand-700 underline break-all"
          >
            {shareUrl}
          </a>
        </div>
      )}

      {/* Error display */}
      {error && (
        <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </p>
      )}

      {/* Hidden file inputs (duplicated refs for when thumbnails are showing) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
