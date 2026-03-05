import { NextRequest, NextResponse } from 'next/server';
import {
  isGraphConfigured,
  ensureFolder,
  uploadFile,
  createSharingLink,
  generateFolderPath,
} from '@/lib/microsoft-graph';

export const runtime = 'nodejs';

// Allow larger request bodies for photo uploads (up to 10MB)
export const maxDuration = 30; // seconds

export async function POST(request: NextRequest) {
  if (!isGraphConfigured()) {
    return NextResponse.json(
      { error: 'SharePoint upload is not configured. Azure credentials are missing.' },
      { status: 503 }
    );
  }

  const contentType = request.headers.get('content-type') || '';

  try {
    // FormData request = file upload
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const folderPath = formData.get('folderPath') as string | null;

      if (!file || !folderPath) {
        return NextResponse.json(
          { error: 'Missing required fields: file, folderPath' },
          { status: 400 }
        );
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        return NextResponse.json(
          { error: 'Only image files are allowed' },
          { status: 400 }
        );
      }

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'File size exceeds 10MB limit' },
          { status: 400 }
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const result = await uploadFile(folderPath, file.name, buffer);

      return NextResponse.json({
        fileName: result.name,
        webUrl: result.webUrl,
        size: result.size,
      });
    }

    // JSON request = folder creation or sharing link
    const body = await request.json();
    const { action } = body;

    if (action === 'create-folder') {
      const { projectName, eventName, eventDate } = body;

      if (!projectName || !eventName) {
        return NextResponse.json(
          { error: 'Missing required fields: projectName, eventName' },
          { status: 400 }
        );
      }

      const folderPath = generateFolderPath(projectName, eventName, eventDate);
      const folder = await ensureFolder(folderPath);

      return NextResponse.json({
        folderId: folder.id,
        folderPath,
        webUrl: folder.webUrl,
      });
    }

    if (action === 'create-link') {
      const { folderId } = body;

      if (!folderId) {
        return NextResponse.json(
          { error: 'Missing required field: folderId' },
          { status: 400 }
        );
      }

      const shareUrl = await createSharingLink(folderId);

      return NextResponse.json({ shareUrl });
    }

    if (action === 'check-config') {
      return NextResponse.json({ configured: true });
    }

    return NextResponse.json(
      { error: `Unknown action: ${action}` },
      { status: 400 }
    );
  } catch (err) {
    console.error('Upload photos error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
