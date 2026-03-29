import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { 
  connectGoogleCalendar, 
  disconnectGoogleCalendar, 
  isGoogleCalendarConnected,
  getLastSyncTime,
  getGoogleCalendarToken,
  createGoogleCalendarEvent,
  updateLastSyncTime,
} from '@/lib/googleCalendar';
import { COLORS } from '@/lib/theme';

interface GoogleCalendarCardProps {
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export default function GoogleCalendarCard({ onConnect, onDisconnect }: GoogleCalendarCardProps) {
  const [connected, setConnected] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setConnected(isGoogleCalendarConnected());
    setLastSync(getLastSyncTime());
  }, []);

  const handleConnect = () => {
    try {
      connectGoogleCalendar();
      onConnect?.();
    } catch (error) {
      alert('Google Calendar is not configured yet. Please add VITE_GOOGLE_CLIENT_ID to your .env file.');
      console.error('Failed to connect Google Calendar:', error);
    }
  };

  const handleDisconnect = () => {
    if (!confirm('Disconnect Google Calendar? Events will no longer sync automatically.')) return;
    disconnectGoogleCalendar();
    setConnected(false);
    setLastSync(null);
    onDisconnect?.();
  };

  const handleExportAll = async () => {
    const token = getGoogleCalendarToken();
    if (!token) {
      alert('Google Calendar is not connected.');
      return;
    }

    setExporting(true);
    try {
      // Pull events from Firestore and push to Google Calendar
      const { db } = await import('@/lib/firebase');
      const { collection, getDocs, query, orderBy } = await import('firebase/firestore');
      const q = query(collection(db, 'events'), orderBy('startDate', 'desc'));
      const snapshot = await getDocs(q);

      let exported = 0;
      for (const docSnap of snapshot.docs) {
        const e = docSnap.data();
        if (e.status === 'Cancelled') continue;
        try {
          await createGoogleCalendarEvent({
            title: e.title || 'Untitled Event',
            description: e.description || '',
            location: e.location || '',
            startDate: e.startDate?.toDate ? e.startDate.toDate() : new Date(e.startDate),
            endDate: e.endDate?.toDate ? e.endDate.toDate() : new Date(e.endDate),
          });
          exported++;
        } catch {
          // skip individual failures
        }
      }

      updateLastSyncTime();
      setLastSync(new Date());
      alert(`✅ Exported ${exported} event${exported !== 1 ? 's' : ''} to Google Calendar.`);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleSyncSettings = () => {
    toast('Sync Settings coming soon! Currently all non-cancelled events sync automatically.', {
      icon: '⚙️',
      duration: 4000,
    });
  };

  const formatLastSync = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString('en-IN');
  };

  return (
    <div className="rounded-2xl bg-card p-4 shadow-md">
      <div className="flex items-center justify-between gap-4">
        {/* Icon and text */}
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{
              backgroundColor: '#fff',
              border: `1px solid ${COLORS.border}`,
            }}
          >
            📆
          </div>
          <div>
            <div className="font-bold text-sm text-foreground">
              Google Calendar
            </div>
            <div className="text-xs mt-0.5" style={{ color: COLORS.textMuted }}>
              {connected 
                ? "✅ Connected — events sync automatically" 
                : "Connect to sync Trackly events to your Google Calendar"}
            </div>
          </div>
        </div>

        {/* Button */}
        {connected ? (
          <button
            onClick={handleDisconnect}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{
              backgroundColor: COLORS.greyLight,
              color: COLORS.textMuted,
              border: 'none',
            }}
          >
            Disconnect
          </button>
        ) : (
          <button
            onClick={handleConnect}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
            style={{
              backgroundColor: '#4285f4',
              color: '#fff',
              border: 'none',
            }}
          >
            <span>🔗</span>
            Connect
          </button>
        )}
      </div>

      {/* Connected state extra info */}
      {connected && (
        <div 
          className="mt-3 pt-3 flex items-center gap-2"
          style={{ borderTop: `1px solid ${COLORS.border}` }}
        >
          <button
            onClick={handleExportAll}
            disabled={exporting}
            className="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors disabled:opacity-50"
            style={{
              backgroundColor: 'transparent',
              color: COLORS.teal,
              border: `1.5px solid ${COLORS.teal}`,
            }}
          >
            {exporting ? '⏳ Exporting...' : '↗ Export All Events'}
          </button>
          <button
            onClick={handleSyncSettings}
            className="px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors"
            style={{
              backgroundColor: COLORS.greyLight,
              color: COLORS.textMuted,
              border: 'none',
            }}
          >
            ⚙️ Sync Settings
          </button>
          <div 
            className="ml-auto flex items-center gap-1 text-[11px]"
            style={{ color: COLORS.textMuted }}
          >
            <span 
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: COLORS.green }}
            />
            Last synced: {lastSync ? formatLastSync(lastSync) : 'Never'}
          </div>
        </div>
      )}
    </div>
  );
}
