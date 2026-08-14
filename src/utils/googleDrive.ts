import type { HouseholdDataPayload } from '../types';

export const GOOGLE_DRIVE_FILE_NAME = 'SugarBaby_Household.json';
export const GOOGLE_SCOPES = 'https://www.googleapis.com/auth/drive.file email profile';

const STORAGE_KEYS = {
  TOKEN_DATA: 'sugarbaby_gdrive_token',
  FILE_ID: 'sugarbaby_gdrive_file_id',
  FILE_LINK: 'sugarbaby_gdrive_file_link',
  CUSTOM_CLIENT_ID: 'sugarbaby_gdrive_custom_client_id',
  LAST_SYNC_TIME: 'sugarbaby_gdrive_last_sync',
  AUTO_SYNC: 'sugarbaby_gdrive_auto_sync',
};

// Fallback / standard demo client ID or environment variable
export function getActiveClientId(): string {
  const custom = localStorage.getItem(STORAGE_KEYS.CUSTOM_CLIENT_ID);
  if (custom && custom.trim()) {
    return custom.trim();
  }
  const envId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID;
  if (envId && envId.trim()) {
    return envId.trim();
  }
  // Default public client ID placeholder for SugarBaby deployments
  return '';
}

export function setCustomClientId(clientId: string): void {
  if (clientId && clientId.trim()) {
    localStorage.setItem(STORAGE_KEYS.CUSTOM_CLIENT_ID, clientId.trim());
  } else {
    localStorage.removeItem(STORAGE_KEYS.CUSTOM_CLIENT_ID);
  }
}

export interface StoredTokenData {
  access_token: string;
  expires_at: number; // Unix timestamp in ms
  email: string;
  name: string;
  picture: string;
}

export function getStoredToken(): StoredTokenData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TOKEN_DATA);
    if (!raw) return null;
    const data: StoredTokenData = JSON.parse(raw);
    if (!data.access_token) return null;
    return data;
  } catch {
    return null;
  }
}

export function saveStoredToken(tokenData: StoredTokenData): void {
  localStorage.setItem(STORAGE_KEYS.TOKEN_DATA, JSON.stringify(tokenData));
}

export function clearStoredToken(): void {
  localStorage.removeItem(STORAGE_KEYS.TOKEN_DATA);
  localStorage.removeItem(STORAGE_KEYS.LAST_SYNC_TIME);
}

export function getStoredFileId(): string | null {
  return localStorage.getItem(STORAGE_KEYS.FILE_ID);
}

export function setStoredFileId(fileId: string | null): void {
  if (fileId) {
    localStorage.setItem(STORAGE_KEYS.FILE_ID, fileId);
  } else {
    localStorage.removeItem(STORAGE_KEYS.FILE_ID);
    localStorage.removeItem(STORAGE_KEYS.FILE_LINK);
  }
}

export function getStoredFileLink(): string | null {
  return localStorage.getItem(STORAGE_KEYS.FILE_LINK);
}

export function setStoredFileLink(link: string | null): void {
  if (link) {
    localStorage.setItem(STORAGE_KEYS.FILE_LINK, link);
  } else {
    localStorage.removeItem(STORAGE_KEYS.FILE_LINK);
  }
}

export function getLastSyncTime(): string | null {
  return localStorage.getItem(STORAGE_KEYS.LAST_SYNC_TIME);
}

export function setLastSyncTime(isoString: string): void {
  localStorage.setItem(STORAGE_KEYS.LAST_SYNC_TIME, isoString);
}

export function isAutoSyncEnabled(): boolean {
  const stored = localStorage.getItem(STORAGE_KEYS.AUTO_SYNC);
  return stored !== 'false';
}

export function setAutoSyncEnabled(enabled: boolean): void {
  localStorage.setItem(STORAGE_KEYS.AUTO_SYNC, enabled ? 'true' : 'false');
}

// Dynamically load Google Identity Services script
let gisScriptLoadingPromise: Promise<void> | null = null;

export function loadGisScript(): Promise<void> {
  if ((window as any).google?.accounts?.oauth2) {
    return Promise.resolve();
  }

  if (gisScriptLoadingPromise) {
    return gisScriptLoadingPromise;
  }

  gisScriptLoadingPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById('google-gsi-client');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', (e) => reject(e));
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-gsi-client';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = (err) => {
      gisScriptLoadingPromise = null;
      reject(new Error(`Failed to load Google Identity Services: ${err}`));
    };
    document.head.appendChild(script);
  });

  return gisScriptLoadingPromise;
}

// Fetch user profile info with access token
export async function fetchGoogleUserProfile(accessToken: string): Promise<{
  email: string;
  name: string;
  picture: string;
}> {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch user profile: ${res.statusText}`);
  }
  const data = await res.json();
  return {
    email: data.email || '',
    name: data.name || data.given_name || 'Caregiver',
    picture: data.picture || '',
  };
}

// Request access token using Google Identity Services Token Client
export async function requestGoogleAccessToken(promptUser = true): Promise<StoredTokenData> {
  await loadGisScript();

  const clientId = getActiveClientId();
  if (!clientId) {
    throw new Error(
      'Google Client ID is not configured. Please enter your Google OAuth Client ID in Settings.'
    );
  }

  return new Promise((resolve, reject) => {
    try {
      const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: GOOGLE_SCOPES,
        prompt: promptUser ? 'consent' : '',
        callback: async (tokenResponse: any) => {
          if (tokenResponse.error) {
            reject(new Error(tokenResponse.error_description || tokenResponse.error));
            return;
          }

          try {
            const token = tokenResponse.access_token;
            const expiresInSec = parseInt(tokenResponse.expires_in, 10) || 3600;
            const expiresAt = Date.now() + (expiresInSec - 60) * 1000;

            const profile = await fetchGoogleUserProfile(token);

            const tokenData: StoredTokenData = {
              access_token: token,
              expires_at: expiresAt,
              email: profile.email,
              name: profile.name,
              picture: profile.picture,
            };

            saveStoredToken(tokenData);
            resolve(tokenData);
          } catch (profileErr) {
            reject(profileErr);
          }
        },
        error_callback: (err: any) => {
          reject(new Error(err.message || 'Google OAuth initialization failed.'));
        },
      });

      tokenClient.requestAccessToken();
    } catch (err: any) {
      reject(new Error(err.message || 'Failed to initialize Google token client.'));
    }
  });
}

// Get valid access token (or refresh silently)
export async function getValidAccessToken(): Promise<string> {
  const current = getStoredToken();
  if (current && current.access_token && current.expires_at > Date.now() + 30000) {
    return current.access_token;
  }

  // Token expired or missing, attempt promptless token request
  try {
    const refreshed = await requestGoogleAccessToken(false);
    return refreshed.access_token;
  } catch {
    clearStoredToken();
    throw new Error('Google Drive session expired. Please sign in again.');
  }
}

// Google Drive API operations
export async function findHouseholdFileOnDrive(
  accessToken: string
): Promise<{ id: string; name: string; webViewLink?: string } | null> {
  const query = encodeURIComponent(`name = '${GOOGLE_DRIVE_FILE_NAME}' and trashed = false`);
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink,modifiedTime,owners)&spaces=drive`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to search Google Drive: ${res.statusText}`);
  }

  const data = await res.json();
  if (data.files && data.files.length > 0) {
    const file = data.files[0];
    return {
      id: file.id,
      name: file.name,
      webViewLink: file.webViewLink,
    };
  }

  return null;
}

export async function createHouseholdFileOnDrive(
  accessToken: string,
  payload: HouseholdDataPayload
): Promise<{ id: string; name: string; webViewLink?: string }> {
  const metadata = {
    name: GOOGLE_DRIVE_FILE_NAME,
    mimeType: 'application/json',
    description: 'SugarBaby Feline Diabetes Log - Household Sync Data',
  };

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    JSON.stringify(payload, null, 2) +
    closeDelimiter;

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to create file on Google Drive: ${errText || res.statusText}`);
  }

  const data = await res.json();
  return {
    id: data.id,
    name: data.name,
    webViewLink: data.webViewLink,
  };
}

export async function readHouseholdFileFromDrive(
  accessToken: string,
  fileId: string
): Promise<HouseholdDataPayload> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error('Sync file not found on Google Drive. It may have been deleted or unshared.');
    }
    if (res.status === 403) {
      throw new Error(
        'Permission denied to read this Google Drive file. Ensure the file is shared with Editor access.'
      );
    }
    throw new Error(`Failed to read file from Google Drive: ${res.statusText}`);
  }

  const payload: HouseholdDataPayload = await res.json();
  if (!payload.pets || !Array.isArray(payload.pets)) {
    throw new Error('Invalid SugarBaby household data structure.');
  }

  return payload;
}

export async function writeHouseholdFileToDrive(
  accessToken: string,
  fileId: string,
  payload: HouseholdDataPayload
): Promise<void> {
  const res = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload, null, 2),
    }
  );

  if (!res.ok) {
    if (res.status === 403) {
      throw new Error(
        'Permission denied to update Google Drive file. Check that you have Editor permissions.'
      );
    }
    throw new Error(`Failed to write file to Google Drive: ${res.statusText}`);
  }
}

export async function getFileMetadataFromDrive(
  accessToken: string,
  fileId: string
): Promise<{ id: string; name: string; webViewLink?: string; modifiedTime?: string }> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,webViewLink,modifiedTime,owners`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to get file info from Google Drive: ${res.statusText}`);
  }

  return await res.json();
}

export function extractFileIdFromInput(input: string): string {
  const clean = input.trim();
  if (!clean) return '';

  // Check if user pasted a full Google Drive URL
  // e.g., https://drive.google.com/file/d/1a2b3c4d5e.../view
  const match = clean.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return match[1];
  }

  // e.g., https://drive.google.com/open?id=1a2b3c4d5e...
  const idParamMatch = clean.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idParamMatch && idParamMatch[1]) {
    return idParamMatch[1];
  }

  // Assume raw file ID
  return clean;
}
