/**
 * Microsoft Graph API integration for SharePoint photo uploads.
 * Server-only module — never import this from client components.
 */

import { ConfidentialClientApplication } from '@azure/msal-node';
import { Client } from '@microsoft/microsoft-graph-client';
import { sanitizeForPath, generateFolderPath } from './sharepoint';

// Re-export for use in API routes
export { sanitizeForPath, generateFolderPath };

const AZURE_TENANT_ID = process.env.AZURE_TENANT_ID || '';
const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID || '';
const AZURE_CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET || '';
const SHAREPOINT_SITE_ID = process.env.SHAREPOINT_SITE_ID || '';
const SHAREPOINT_DRIVE_ID = process.env.SHAREPOINT_DRIVE_ID || '';

/** Check if all required Azure/SharePoint env vars are configured */
export function isGraphConfigured(): boolean {
  return !!(AZURE_TENANT_ID && AZURE_CLIENT_ID && AZURE_CLIENT_SECRET && SHAREPOINT_SITE_ID && SHAREPOINT_DRIVE_ID);
}

// Singleton MSAL client
let msalClient: ConfidentialClientApplication | null = null;

function getMsalClient(): ConfidentialClientApplication {
  if (!msalClient) {
    msalClient = new ConfidentialClientApplication({
      auth: {
        clientId: AZURE_CLIENT_ID,
        authority: `https://login.microsoftonline.com/${AZURE_TENANT_ID}`,
        clientSecret: AZURE_CLIENT_SECRET,
      },
    });
  }
  return msalClient;
}

/** Get an authenticated Microsoft Graph client using app-only credentials */
async function getGraphClient(): Promise<Client> {
  const cca = getMsalClient();
  const tokenResponse = await cca.acquireTokenByClientCredential({
    scopes: ['https://graph.microsoft.com/.default'],
  });

  if (!tokenResponse?.accessToken) {
    throw new Error('Failed to acquire access token from Azure AD');
  }

  return Client.init({
    authProvider: (done) => {
      done(null, tokenResponse.accessToken);
    },
  });
}

/**
 * Ensure a folder exists on the SharePoint drive, creating it if necessary.
 * Handles nested paths by creating each segment.
 * @returns The folder's driveItem ID
 */
export async function ensureFolder(folderPath: string): Promise<{ id: string; webUrl: string }> {
  const client = await getGraphClient();
  const segments = folderPath.split('/').filter(Boolean);

  let currentPath = '';
  let lastItem: { id: string; webUrl: string } = { id: '', webUrl: '' };

  for (const segment of segments) {
    currentPath = currentPath ? `${currentPath}/${segment}` : segment;

    try {
      // Try to get the folder
      const item = await client
        .api(`/drives/${SHAREPOINT_DRIVE_ID}/root:/${currentPath}`)
        .get();
      lastItem = { id: item.id, webUrl: item.webUrl };
    } catch {
      // Folder doesn't exist — create it
      const parentPath = currentPath.includes('/')
        ? currentPath.substring(0, currentPath.lastIndexOf('/'))
        : '';

      const parentApi = parentPath
        ? `/drives/${SHAREPOINT_DRIVE_ID}/root:/${parentPath}:/children`
        : `/drives/${SHAREPOINT_DRIVE_ID}/root/children`;

      const item = await client
        .api(parentApi)
        .post({
          name: segment,
          folder: {},
          '@microsoft.graph.conflictBehavior': 'fail',
        });
      lastItem = { id: item.id, webUrl: item.webUrl };
    }
  }

  return lastItem;
}

/**
 * Upload a file to a specific folder path on SharePoint.
 * For files under 4MB, uses simple upload. Larger files use upload sessions.
 * @returns The uploaded file's metadata
 */
export async function uploadFile(
  folderPath: string,
  fileName: string,
  buffer: Buffer
): Promise<{ id: string; name: string; webUrl: string; size: number }> {
  const client = await getGraphClient();
  const sanitizedName = sanitizeForPath(fileName) || 'photo.jpg';
  const filePath = `${folderPath}/${sanitizedName}`;

  if (buffer.length < 4 * 1024 * 1024) {
    // Simple upload for files under 4MB
    const item = await client
      .api(`/drives/${SHAREPOINT_DRIVE_ID}/root:/${filePath}:/content`)
      .putStream(buffer);

    return {
      id: item.id,
      name: item.name,
      webUrl: item.webUrl,
      size: item.size,
    };
  }

  // Large file upload session for files >= 4MB
  const session = await client
    .api(`/drives/${SHAREPOINT_DRIVE_ID}/root:/${filePath}:/createUploadSession`)
    .post({
      item: {
        '@microsoft.graph.conflictBehavior': 'rename',
        name: sanitizedName,
      },
    });

  const uploadUrl = session.uploadUrl;
  const fileSize = buffer.length;
  // Chunk size must be a multiple of 320 KiB
  const chunkSize = 320 * 1024 * 10; // 3.2MB chunks

  let offset = 0;
  let result: { id: string; name: string; webUrl: string; size: number } | null = null;

  while (offset < fileSize) {
    const end = Math.min(offset + chunkSize, fileSize);
    const chunk = buffer.subarray(offset, end);

    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Length': chunk.length.toString(),
        'Content-Range': `bytes ${offset}-${end - 1}/${fileSize}`,
      },
      body: new Uint8Array(chunk),
    });

    const data = await response.json();

    if (data.id) {
      // Upload complete — final chunk returns the driveItem
      result = {
        id: data.id,
        name: data.name,
        webUrl: data.webUrl,
        size: data.size,
      };
    }

    offset = end;
  }

  if (!result) {
    throw new Error('Upload session completed but no item was returned');
  }

  return result;
}

/**
 * Create a read-only sharing link for a folder.
 * @returns The sharing URL
 */
export async function createSharingLink(folderId: string): Promise<string> {
  const client = await getGraphClient();

  const result = await client
    .api(`/drives/${SHAREPOINT_DRIVE_ID}/items/${folderId}/createLink`)
    .post({
      type: 'view',
      scope: 'anonymous',
    });

  return result.link?.webUrl || '';
}

const NOTIFICATION_SENDER_EMAIL = process.env.NOTIFICATION_SENDER_EMAIL || '';

/** Check if email sending is configured */
export function isEmailConfigured(): boolean {
  return !!(AZURE_TENANT_ID && AZURE_CLIENT_ID && AZURE_CLIENT_SECRET && NOTIFICATION_SENDER_EMAIL);
}

/**
 * Send an email notification via Microsoft Graph API.
 * Uses app-only credentials with Mail.Send permission.
 */
export async function sendEmail(
  to: string[],
  subject: string,
  htmlBody: string
): Promise<void> {
  if (!isEmailConfigured()) {
    throw new Error('Email sending is not configured');
  }

  const client = await getGraphClient();

  await client
    .api(`/users/${NOTIFICATION_SENDER_EMAIL}/sendMail`)
    .post({
      message: {
        subject,
        body: {
          contentType: 'HTML',
          content: htmlBody,
        },
        toRecipients: to.map(email => ({
          emailAddress: { address: email },
        })),
      },
      saveToSentItems: false,
    });
}

/**
 * Check the upload configuration by making a test API call.
 * Returns true if the configuration is valid.
 */
export async function testConnection(): Promise<{ ok: boolean; error?: string }> {
  if (!isGraphConfigured()) {
    return { ok: false, error: 'Missing Azure/SharePoint environment variables' };
  }

  try {
    const client = await getGraphClient();
    await client.api(`/drives/${SHAREPOINT_DRIVE_ID}/root`).get();
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, error: message };
  }
}
