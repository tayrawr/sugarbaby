import React, { useState, useEffect } from 'react';
import {
  Cloud,
  CloudCheck,
  CloudAlert,
  RefreshCw,
  Share2,
  Copy,
  Check,
  ExternalLink,
  LogOut,
  Key,
  ShieldCheck,
  Users,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { ModalSheet } from '../common/ModalSheet';
import type { GoogleDriveSyncState } from '../../types';
import {
  requestGoogleAccessToken,
  clearStoredToken,
  getActiveClientId,
  setCustomClientId,
  setAutoSyncEnabled,
  setStoredFileId,
} from '../../utils/googleDrive';
import {
  getSyncState,
  subscribeToSyncState,
  synchronizeWithGoogleDrive,
  connectToExistingSharedFile,
  updateSyncState,
} from '../../utils/syncEngine';

interface GoogleDriveSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GoogleDriveSyncModal: React.FC<GoogleDriveSyncModalProps> = ({ isOpen, onClose }) => {
  const [syncState, setSyncState] = useState<GoogleDriveSyncState>(getSyncState());
  const [copiedId, setCopiedId] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [sharedFileInput, setSharedFileInput] = useState('');
  const [isConnectingFile, setIsConnectingFile] = useState(false);
  const [customClientIdInput, setCustomClientIdInput] = useState(getActiveClientId());
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToSyncState((state) => {
      setSyncState(state);
    });
    return unsubscribe;
  }, []);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setActionError(null);
    try {
      const tokenData = await requestGoogleAccessToken(true);
      updateSyncState({
        isSignedIn: true,
        userEmail: tokenData.email,
        userName: tokenData.name,
        userAvatar: tokenData.picture,
        status: 'idle',
        errorMessage: null,
      });
      // Immediately run sync cycle
      await synchronizeWithGoogleDrive();
    } catch (err: any) {
      console.error('Sign-in error:', err);
      setActionError(err.message || 'Google sign-in was cancelled or failed.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = () => {
    if (window.confirm('Disconnect Google Drive sync? Your local data will remain intact.')) {
      clearStoredToken();
      setStoredFileId(null);
      updateSyncState({
        isSignedIn: false,
        userEmail: null,
        userName: null,
        userAvatar: null,
        fileId: null,
        webViewLink: null,
        status: 'idle',
        errorMessage: null,
      });
    }
  };

  const handleManualSync = async () => {
    setActionError(null);
    await synchronizeWithGoogleDrive();
  };

  const handleConnectSharedFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sharedFileInput.trim()) return;

    setIsConnectingFile(true);
    setActionError(null);
    try {
      await connectToExistingSharedFile(sharedFileInput);
      setSharedFileInput('');
      alert('Successfully connected to shared Google Drive file!');
    } catch (err: any) {
      setActionError(err.message || 'Failed to connect to shared file.');
    } finally {
      setIsConnectingFile(false);
    }
  };

  const handleSaveCustomClientId = (e: React.FormEvent) => {
    e.preventDefault();
    setCustomClientId(customClientIdInput);
    alert('Google OAuth Client ID saved.');
    setShowAdvancedSettings(false);
  };

  const handleCopy = (text: string, type: 'id' | 'link') => {
    navigator.clipboard.writeText(text);
    if (type === 'id') {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } else {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const getStatusBadge = () => {
    switch (syncState.status) {
      case 'syncing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Syncing...
          </span>
        );
      case 'synced':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            <CloudCheck className="w-3.5 h-3.5" /> Up to Date
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
            <CloudAlert className="w-3.5 h-3.5" /> Sync Issue
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-xs font-semibold">
            <Cloud className="w-3.5 h-3.5" /> Ready
          </span>
        );
    }
  };

  const formatLastSync = () => {
    if (!syncState.lastSyncedAt) return 'Never';
    try {
      return formatDistanceToNow(parseISO(syncState.lastSyncedAt), { addSuffix: true });
    } catch {
      return 'Recently';
    }
  };

  return (
    <ModalSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Google Drive Cloud Sync"
      subtitle="Real-time multi-device sync & family sharing (100% private)"
      icon={<Cloud className="w-5 h-5 text-indigo-400" />}
    >
      <div className="space-y-5">
        {/* Error Banner */}
        {(actionError || syncState.errorMessage) && (
          <div className="p-3.5 rounded-2xl bg-rose-950/50 border border-rose-800/80 text-rose-300 text-xs flex items-start gap-2.5">
            <CloudAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold">Sync Notice</div>
              <div className="text-rose-200/90">{actionError || syncState.errorMessage}</div>
            </div>
          </div>
        )}

        {/* State 1: NOT SIGNED IN */}
        {!syncState.isSignedIn ? (
          <div className="space-y-4">
            {/* Feature Pitch Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 border border-indigo-500/20 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Private & Decentralized Storage</h3>
                  <p className="text-xs text-slate-400">
                    Syncs automatically across phones and laptops with zero cloud subscription fees.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-800/60 text-[11px] text-slate-300">
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Your Google Account</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Multi-Device Realtime</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Family Co-Care Sharing</span>
                </div>
              </div>
            </div>

            {/* Google Sign-in Action */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleSignIn}
                disabled={isSigningIn}
                className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs shadow-lg shadow-white/10 transition-all flex items-center justify-center gap-2.5 disabled:opacity-50"
              >
                {isSigningIn ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-700" />
                    <span>Connecting to Google...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Sign in with Google</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* State 2: SIGNED IN */
          <div className="space-y-4">
            {/* Account Card */}
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {syncState.userAvatar ? (
                  <img
                    src={syncState.userAvatar}
                    alt={syncState.userName || 'Account'}
                    className="w-10 h-10 rounded-full border border-slate-700"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-indigo-600/30 text-indigo-300 font-bold flex items-center justify-center text-sm border border-indigo-500/30">
                    {syncState.userName ? syncState.userName[0].toUpperCase() : 'G'}
                  </div>
                )}

                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>{syncState.userName || 'Connected Account'}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate max-w-[200px] sm:max-w-xs">
                    {syncState.userEmail}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSignOut}
                className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-700 transition-colors"
                title="Disconnect Google Drive"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            {/* Cloud Sync File Card */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                    Cloud Sync File
                  </div>
                  <div className="text-xs font-bold text-slate-200 mt-0.5">
                    {syncState.fileName || 'SugarBaby_Household.json'}
                  </div>
                </div>
                {getStatusBadge()}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
                <span>Last Synced:</span>
                <span className="font-semibold text-slate-200">{formatLastSync()}</span>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleManualSync}
                  disabled={syncState.status === 'syncing'}
                  className="py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${syncState.status === 'syncing' ? 'animate-spin' : ''}`}
                  />
                  <span>Sync Now</span>
                </button>

                {syncState.webViewLink ? (
                  <a
                    href={syncState.webViewLink}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
                    <span>View in Drive</span>
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="py-2.5 px-3 rounded-xl bg-slate-800/40 border border-slate-800 text-slate-500 font-semibold text-xs flex items-center justify-center gap-1.5"
                  >
                    <span>Local Only</span>
                  </button>
                )}
              </div>

              {/* Auto Sync Switch */}
              <label className="flex items-center justify-between pt-2 border-t border-slate-800/60 cursor-pointer">
                <span className="text-xs text-slate-300 font-medium">Automatic Background Sync</span>
                <input
                  type="checkbox"
                  checked={syncState.isAutoSyncEnabled}
                  onChange={(e) => {
                    setAutoSyncEnabled(e.target.checked);
                    updateSyncState({ isAutoSyncEnabled: e.target.checked });
                  }}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-800 border-slate-700"
                />
              </label>
            </div>

            {/* Family Sharing Hub Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950/30 border border-indigo-500/20 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <Users className="w-4 h-4 text-indigo-400" />
                <span>Family & Caregiver Sharing Hub</span>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                To sync with a spouse or family member on their phone:
              </p>

              <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside pl-1">
                <li>
                  {syncState.webViewLink ? (
                    <a
                      href={syncState.webViewLink}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-400 hover:text-indigo-300 underline font-semibold inline-flex items-center gap-1"
                    >
                      Open file in Google Drive <ExternalLink className="w-3 h-3 inline" />
                    </a>
                  ) : (
                    <span className="font-semibold text-slate-200">Open the file in Google Drive</span>
                  )}{' '}
                  and click <strong className="text-white">Share</strong> to invite your family member's email as{' '}
                  <strong className="text-emerald-400">Editor</strong>.
                </li>
                <li>
                  On their phone, have them open SugarBaby and click{' '}
                  <strong className="text-indigo-300">"Sign in with Google"</strong> — it will automatically detect and link to the shared file!
                </li>
              </ol>

              {/* Copy Links Bar */}
              {syncState.fileId && (
                <div className="pt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopy(syncState.fileId!, 'id')}
                    className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                  >
                    {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedId ? 'Copied File ID!' : 'Copy File ID'}</span>
                  </button>

                  {syncState.webViewLink && (
                    <button
                      type="button"
                      onClick={() => handleCopy(syncState.webViewLink!, 'link')}
                      className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? 'Copied Link!' : 'Copy Drive Link'}</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Connect to Existing Shared File (Fallback) */}
            <form onSubmit={handleConnectSharedFile} className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <label className="text-[11px] font-semibold text-slate-300">
                Joining a Family Member's File? (Manual Link)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Paste Google Drive link or File ID..."
                  value={sharedFileInput}
                  onChange={(e) => setSharedFileInput(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  disabled={isConnectingFile || !sharedFileInput.trim()}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-indigo-600 text-white text-xs font-semibold transition-colors disabled:opacity-40"
                >
                  {isConnectingFile ? 'Connecting...' : 'Link'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Collapsible Advanced Settings (OAuth Client ID) */}
        <div className="pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
            className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 py-1"
          >
            <span className="flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5" />
              <span>Developer & OAuth Configuration</span>
            </span>
            {showAdvancedSettings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showAdvancedSettings && (
            <form onSubmit={handleSaveCustomClientId} className="mt-3 p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">
                  Google OAuth Client ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. 12345-abcde.apps.googleusercontent.com"
                  value={customClientIdInput}
                  onChange={(e) => setCustomClientIdInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 font-mono focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[10px] text-slate-500">
                  Leave blank to use the built-in Client ID, or provide your own from Google Cloud Console.
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors"
                >
                  Save Client ID
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </ModalSheet>
  );
};
