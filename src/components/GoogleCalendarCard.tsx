import { useState, useEffect } from 'react';
import { 
  connectGoogleCalendar, 
  disconnectGoogleCalendar, 
  isGoogleCalendarConnected,
  getLastSyncTime 
} from '@/lib/googleCalendar';
import { COLORS } from '@/lib/theme';

interface GoogleCalendarCardProps {
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export default function GoogleCalendarCard({ onConnect, onDisconnect }: GoogleCalendarCardProps) {
  const [connected, setConnected] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    setConnected(isGoogleCalendarConnected());
    setLastSync(getLastSyncTime());
  }, []);

  const handleConnect = () => {
    try {
      connectGoogleCalendar();
      onConnect?.();
    } catch (error) {
      console.error('Failed to connect Google Calendar:', error);
    }
  };

  const handleDisconnect = () => {
    disconnectGoogleCalendar();
    setConnected(false);
    setLastSync(null);
    onDisconnect?.();
  };

  // Format last sync time
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
    <div 
      className="rounded-2xl border bg-card p-4"
      style={{
        border: connected ? `1.5px solid ${COLORS.green}` : `1.5px solid ${COLORS.border}`,
      }}
    >
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
            <div className="font-bold text-sm" style={{ color: COLORS.text }}>
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
            className="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors"
            style={{
              backgroundColor: 'transparent',
              color: COLORS.teal,
              border: `1.5px solid ${COLORS.teal}`,
            }}
          >
            ↗ Export All Events
          </button>
          <button
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

