import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

export const PwaInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    if (choiceResult.outcome === 'accepted') {
      console.log('User accepted the PWA install prompt');
    }
    setDeferredPrompt(null);
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="bg-emerald-600 text-white px-4 py-3 shadow-md flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center space-x-3">
        <Download className="w-5 h-5 animate-bounce text-amber-300" />
        <div>
          <p className="text-sm font-semibold">Installer l'application Heleanaf</p>
          <p className="text-xs opacity-90">Accédez plus rapidement depuis votre écran d'accueil</p>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <button
          onClick={handleInstallClick}
          className="bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold px-3 py-1.5 rounded-lg text-xs transition"
        >
          Installer
        </button>
        <button
          onClick={() => setShowBanner(false)}
          className="p-1 hover:bg-emerald-700 rounded-full text-white opacity-80 hover:opacity-100"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
