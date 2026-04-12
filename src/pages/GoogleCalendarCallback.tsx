import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { handleGoogleCallback } from '@/lib/googleCalendar';

export default function GoogleCalendarCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const token = handleGoogleCallback();
    if (token) {
      // Show success message then redirect after a short delay
      setTimeout(() => navigate('/dashboard'), 1500);
    } else {
      navigate('/dashboard');
    }
  }, [navigate]);

  return (
    <div 
      className="flex items-center justify-center min-h-screen"
      style={{ backgroundColor: '#f8fafc' }}
    >
      <div className="text-center">
        <div 
          className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
          style={{ backgroundColor: '#22c55e' }}
        >
          <svg 
            className="w-8 h-8 text-white" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={3} 
              d="M5 13l4 4L19 7" 
            />
          </svg>
        </div>
        <h2 className="text-xl font-bold" style={{ color: '#0f172a' }}>
          Google Calendar Connected!
        </h2>
        <p className="text-sm mt-2" style={{ color: '#64748b' }}>
          Redirecting to dashboard...
        </p>
      </div>
    </div>
  );
}

