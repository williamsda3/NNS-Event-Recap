/**
 * SharePoint URL utilities for photo album integration
 */

// Get SharePoint base URL from environment or use a default placeholder
const getSharePointBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    // Client-side: check localStorage for user-configured URL
    const storedUrl = localStorage.getItem('sharepoint-base-url');
    if (storedUrl) return storedUrl;
  }
  return process.env.NEXT_PUBLIC_SHAREPOINT_BASE_URL || '';
};

const getLibraryName = (): string => {
  if (typeof window !== 'undefined') {
    const storedName = localStorage.getItem('sharepoint-library-name');
    if (storedName) return storedName;
  }
  return process.env.NEXT_PUBLIC_SHAREPOINT_LIBRARY_NAME || 'Event Photos';
};

/**
 * Sanitize a string for use in a folder/file name
 * Removes or replaces characters that are invalid in SharePoint paths
 */
export const sanitizeForPath = (input: string): string => {
  return input
    .replace(/[<>:"/\\|?*#%]/g, '') // Remove invalid characters
    .replace(/\s+/g, ' ')           // Normalize whitespace
    .trim()
    .substring(0, 100);              // Limit length
};

/**
 * Generate a folder path for an event's photo album
 * Format: ProjectName/EventName_YYYY-MM-DD
 */
export const generateFolderPath = (
  projectName: string,
  eventName: string,
  eventDate?: string
): string => {
  const sanitizedProject = sanitizeForPath(projectName);
  const sanitizedEvent = sanitizeForPath(eventName);

  // Format date if provided, otherwise use current date
  let dateStr = '';
  if (eventDate) {
    // Try to parse the date and format it
    const parsed = new Date(eventDate);
    if (!isNaN(parsed.getTime())) {
      dateStr = parsed.toISOString().split('T')[0]; // YYYY-MM-DD
    } else {
      // If date parsing fails, use the original cleaned up
      dateStr = sanitizeForPath(eventDate);
    }
  } else {
    dateStr = new Date().toISOString().split('T')[0];
  }

  return `${sanitizedProject}/${sanitizedEvent}_${dateStr}`;
};

/**
 * Build a SharePoint URL to open a specific folder location
 * This creates a URL that will open SharePoint's web UI at the folder
 */
export const buildSharePointUrl = (folderPath: string): string => {
  const baseUrl = getSharePointBaseUrl();
  const libraryName = getLibraryName();

  if (!baseUrl) {
    // Return a helpful message if not configured
    return '';
  }

  // Encode the folder path for URL
  const encodedPath = encodeURIComponent(folderPath);

  // SharePoint document library URL format
  // This opens the library at the specified folder path
  return `${baseUrl}/${encodeURIComponent(libraryName)}/Forms/AllItems.aspx?newTargetListUrl=${encodedPath}&viewpath=${encodedPath}`;
};

/**
 * Build a URL to open the SharePoint folder for a client
 * Opens SharePoint at the client's folder within the Documents library
 * @param projectName - The project name (used for suggested folder naming)
 * @param clientFolderName - The client's folder name within the Documents library
 */
export const buildCreateFolderUrl = (projectName: string, clientFolderName?: string): string => {
  const baseUrl = getSharePointBaseUrl();

  if (!baseUrl) {
    return '';
  }

  // Default library is "Shared Documents" (the default SharePoint document library)
  const defaultLibrary = 'Shared Documents';

  if (clientFolderName) {
    // Navigate to the client's folder within the Documents library
    return `${baseUrl}/${encodeURIComponent(defaultLibrary)}/${encodeURIComponent(clientFolderName)}`;
  }

  // If no client folder, just open the Documents library root
  return `${baseUrl}/${encodeURIComponent(defaultLibrary)}/Forms/AllItems.aspx`;
};

/**
 * Validate that a URL is a valid SharePoint sharing link
 * SharePoint sharing links typically contain specific patterns
 */
export const validateShareLink = (url: string): { valid: boolean; message: string } => {
  if (!url || typeof url !== 'string') {
    return { valid: false, message: 'Please enter a URL' };
  }

  const trimmedUrl = url.trim();

  // Basic URL validation
  try {
    new URL(trimmedUrl);
  } catch {
    return { valid: false, message: 'Please enter a valid URL' };
  }

  // Check for SharePoint patterns
  const sharePointPatterns = [
    /sharepoint\.com/i,
    /\.sharepoint\.com/i,
    /onedrive\.com/i,
    /1drv\.ms/i,
    /:f:/,        // SharePoint folder sharing pattern
    /:b:/,        // SharePoint file sharing pattern
    /guestaccess/i,
    /share/i,
  ];

  const isSharePointUrl = sharePointPatterns.some(pattern => pattern.test(trimmedUrl));

  if (!isSharePointUrl) {
    // Still accept it, but warn the user
    return {
      valid: true,
      message: 'This doesn\'t look like a SharePoint link, but you can still use it'
    };
  }

  return { valid: true, message: '' };
};

/**
 * Extract a display-friendly name from a SharePoint URL
 */
export const getDisplayNameFromUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    // Try to get something meaningful from the path
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    if (pathParts.length > 0) {
      const lastPart = pathParts[pathParts.length - 1];
      // Decode and clean up
      return decodeURIComponent(lastPart).replace(/_/g, ' ');
    }
    return urlObj.hostname;
  } catch {
    return 'Photo Album';
  }
};

/**
 * Returns a URL to the root Shared Documents library on SharePoint.
 * Used on the home/clients page.
 */
export const getSharePointRootUrl = (): string => {
  const baseUrl = process.env.NEXT_PUBLIC_SHAREPOINT_BASE_URL || (typeof window !== 'undefined' ? localStorage.getItem('sharepoint-base-url') : null) || '';
  if (!baseUrl) return '';
  return `${baseUrl}/Shared%20Documents/Forms/AllItems.aspx`;
};

/**
 * Returns a URL that opens SharePoint directly to a client's folder.
 * @param libraryName - The client's folder name inside Shared Documents
 */
export const getClientFolderUrl = (libraryName: string): string => {
  const baseUrl = process.env.NEXT_PUBLIC_SHAREPOINT_BASE_URL || (typeof window !== 'undefined' ? localStorage.getItem('sharepoint-base-url') : null) || '';
  if (!baseUrl || !libraryName) return '';
  // Extract site path for RootFolder (e.g. /sites/EventRecap)
  const sitePath = new URL(baseUrl).pathname;
  const rootFolder = encodeURIComponent(`${sitePath}/Shared Documents/${libraryName}`);
  return `${baseUrl}/Shared%20Documents/Forms/AllItems.aspx?RootFolder=${rootFolder}`;
};

/**
 * Save SharePoint configuration to localStorage
 */
export const saveSharePointConfig = (baseUrl: string, libraryName: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('sharepoint-base-url', baseUrl);
  localStorage.setItem('sharepoint-library-name', libraryName);
};

/**
 * Get SharePoint configuration from localStorage
 */
export const getSharePointConfig = (): { baseUrl: string; libraryName: string } => {
  if (typeof window === 'undefined') {
    return { baseUrl: '', libraryName: 'Event Photos' };
  }
  return {
    baseUrl: localStorage.getItem('sharepoint-base-url') || '',
    libraryName: localStorage.getItem('sharepoint-library-name') || 'Event Photos',
  };
};

/**
 * Check if SharePoint is configured
 */
export const isSharePointConfigured = (): boolean => {
  const config = getSharePointConfig();
  return !!config.baseUrl;
};
