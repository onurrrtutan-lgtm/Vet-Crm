import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { PawPrint } from 'lucide-react';

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { googleAuth } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent double processing in StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      // Get session_id from URL hash
      const hash = window.location.hash;
      const params = new URLSearchParams(hash.replace('#', ''));
      const sessionId = params.get('session_id');

      if (!sessionId) {
        console.error('No session_id found');
        navigate('/login', { replace: true });
        return;
      }

      try {
        await googleAuth(sessionId);
        navigate('/dashboard', { replace: true });
      } catch (error) {
        console.error('Auth error:', error);
        navigate('/login', { replace: true });
      }
    };

    processAuth();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-[#0F4C5C] flex items-center justify-center animate-pulse">
            <PawPrint className="w-7 h-7 text-white" />
          </div>
        </div>
        <p className="text-muted-foreground">Giriş yapılıyor...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
