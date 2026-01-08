import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Download, X, Smartphone, Monitor } from "lucide-react";
import { Alert, AlertDescription } from "../ui/alert";

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isInStandaloneMode = () =>
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes('android-app://');

    setIsStandalone(isInStandaloneMode());

    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iOS);

    // Listen for the beforeinstallprompt event (Chrome, Edge, etc.)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Check if user has dismissed the prompt before
      const dismissed = localStorage.getItem('pwa_install_dismissed');
      const dismissedTime = dismissed ? parseInt(dismissed) : 0;
      const dayInMs = 24 * 60 * 60 * 1000;
      
      // Show prompt if not dismissed or dismissed more than 7 days ago
      if (!dismissed || Date.now() - dismissedTime > 7 * dayInMs) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Show iOS prompt if on iOS and not standalone
    if (iOS && !isInStandalone()) {
      const dismissed = localStorage.getItem('pwa_install_dismissed_ios');
      const dismissedTime = dismissed ? parseInt(dismissed) : 0;
      const dayInMs = 24 * 60 * 60 * 1000;
      
      if (!dismissed || Date.now() - dismissedTime > 7 * dayInMs) {
        setShowPrompt(true);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }

    // Clear the deferredPrompt
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    if (isIOS) {
      localStorage.setItem('pwa_install_dismissed_ios', Date.now().toString());
    } else {
      localStorage.setItem('pwa_install_dismissed', Date.now().toString());
    }
  };

  // Don't show if already installed
  if (isStandalone || !showPrompt) {
    return null;
  }

  // iOS specific instructions
  if (isIOS) {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in slide-in-from-bottom-5">
        <Card className="border-2 border-primary shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-primary" />
                <CardTitle className="text-base">Install TAMS360</CardTitle>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleDismiss}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <CardDescription className="text-xs">
              Add TAMS360 to your home screen for quick access
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Alert>
              <AlertDescription className="text-xs space-y-2">
                <p className="font-semibold">To install on iOS:</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Tap the Share button <span className="inline-block">⎙</span> in Safari</li>
                  <li>Scroll down and tap "Add to Home Screen"</li>
                  <li>Tap "Add" to confirm</li>
                </ol>
              </AlertDescription>
            </Alert>
            <Button variant="outline" className="w-full" size="sm" onClick={handleDismiss}>
              Got it, thanks!
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Desktop/Android
  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in slide-in-from-bottom-5">
      <Card className="border-2 border-primary shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Monitor className="w-5 h-5 text-primary" />
              <CardTitle className="text-base">Install TAMS360</CardTitle>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleDismiss}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <CardDescription className="text-xs">
            Install TAMS360 for faster access and offline functionality
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-xs text-muted-foreground space-y-1">
            <p>✓ Works offline</p>
            <p>✓ Faster load times</p>
            <p>✓ Desktop/mobile icon</p>
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" size="sm" onClick={handleInstallClick}>
              <Download className="w-4 h-4 mr-2" />
              Install App
            </Button>
            <Button variant="outline" size="sm" onClick={handleDismiss}>
              Later
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
