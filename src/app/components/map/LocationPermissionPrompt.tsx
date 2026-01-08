import { useState, useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { MapPin, AlertCircle, CheckCircle2, XCircle, Navigation } from "lucide-react";

export default function LocationPermissionPrompt() {
  const [permissionState, setPermissionState] = useState<"prompt" | "granted" | "denied" | "checking">("checking");
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    checkLocationPermission();
  }, []);

  const checkLocationPermission = async () => {
    if (!navigator.geolocation) {
      setPermissionState("denied");
      return;
    }

    try {
      // Try to get current position to check permission
      navigator.geolocation.getCurrentPosition(
        () => {
          setPermissionState("granted");
        },
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            setPermissionState("denied");
          } else {
            setPermissionState("prompt");
          }
        }
      );
    } catch (error) {
      setPermissionState("prompt");
    }
  };

  const requestLocationPermission = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPermissionState("granted");
        setShowInstructions(false);
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setPermissionState("denied");
          setShowInstructions(true);
        }
      }
    );
  };

  if (permissionState === "checking") {
    return null;
  }

  if (permissionState === "granted") {
    return (
      <Alert className="border-success bg-success/10">
        <CheckCircle2 className="h-4 w-4 text-success" />
        <AlertTitle>Location Access Enabled</AlertTitle>
        <AlertDescription>
          Your location services are working correctly. You can now use the map's location features.
        </AlertDescription>
      </Alert>
    );
  }

  if (permissionState === "denied") {
    return (
      <Card className="border-warning bg-warning/5">
        <CardHeader>
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-warning mt-1" />
            <div className="flex-1">
              <CardTitle className="text-base">Location Access Blocked</CardTitle>
              <CardDescription className="text-sm mt-1">
                Location services are currently blocked. To use map features, you'll need to enable location permissions.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 text-sm">
            <div>
              <p className="font-semibold mb-2">📱 On Mobile Devices:</p>
              <div className="space-y-2 ml-4">
                <div>
                  <p className="font-medium">iPhone/iPad:</p>
                  <ol className="list-decimal list-inside ml-2 text-muted-foreground space-y-1">
                    <li>Open <strong>Settings</strong> app</li>
                    <li>Scroll to <strong>Safari</strong> or <strong>Chrome</strong></li>
                    <li>Tap <strong>Location</strong></li>
                    <li>Select <strong>While Using the App</strong></li>
                    <li>Refresh this page</li>
                  </ol>
                </div>
                <div className="mt-3">
                  <p className="font-medium">Android:</p>
                  <ol className="list-decimal list-inside ml-2 text-muted-foreground space-y-1">
                    <li>Open <strong>Settings</strong> app</li>
                    <li>Go to <strong>Apps</strong> → <strong>Chrome</strong> (or your browser)</li>
                    <li>Tap <strong>Permissions</strong></li>
                    <li>Tap <strong>Location</strong></li>
                    <li>Select <strong>Allow only while using the app</strong></li>
                    <li>Refresh this page</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <p className="font-semibold mb-2">💻 On Desktop Browsers:</p>
              <div className="space-y-2 ml-4">
                <div>
                  <p className="font-medium">Chrome:</p>
                  <ol className="list-decimal list-inside ml-2 text-muted-foreground space-y-1">
                    <li>Click the <strong>🔒 lock icon</strong> or <strong>⚙️ site settings</strong> in the address bar</li>
                    <li>Find <strong>Location</strong></li>
                    <li>Change to <strong>Allow</strong></li>
                    <li>Refresh this page</li>
                  </ol>
                </div>
                <div className="mt-3">
                  <p className="font-medium">Firefox:</p>
                  <ol className="list-decimal list-inside ml-2 text-muted-foreground space-y-1">
                    <li>Click the <strong>🔒 lock icon</strong> in the address bar</li>
                    <li>Click <strong>Connection secure</strong> → <strong>More information</strong></li>
                    <li>Go to <strong>Permissions</strong> tab</li>
                    <li>Find <strong>Access Your Location</strong></li>
                    <li>Uncheck <strong>Use Default</strong> and select <strong>Allow</strong></li>
                    <li>Refresh this page</li>
                  </ol>
                </div>
                <div className="mt-3">
                  <p className="font-medium">Safari (Mac):</p>
                  <ol className="list-decimal list-inside ml-2 text-muted-foreground space-y-1">
                    <li>Click <strong>Safari</strong> in menu bar → <strong>Settings</strong></li>
                    <li>Go to <strong>Websites</strong> tab</li>
                    <li>Select <strong>Location</strong> in the left sidebar</li>
                    <li>Find this website and select <strong>Allow</strong></li>
                    <li>Refresh this page</li>
                  </ol>
                </div>
                <div className="mt-3">
                  <p className="font-medium">Edge:</p>
                  <ol className="list-decimal list-inside ml-2 text-muted-foreground space-y-1">
                    <li>Click the <strong>🔒 lock icon</strong> in the address bar</li>
                    <li>Click <strong>Permissions for this site</strong></li>
                    <li>Find <strong>Location</strong></li>
                    <li>Change to <strong>Allow</strong></li>
                    <li>Refresh this page</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-3 border-t">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </Button>
            <Button 
              className="flex-1"
              onClick={checkLocationPermission}
            >
              <Navigation className="w-4 h-4 mr-2" />
              Check Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Permission is in "prompt" state
  return (
    <Alert className="border-primary">
      <MapPin className="h-4 w-4" />
      <AlertTitle>Enable Location Services</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>
          TAMS360 needs access to your location to show your current position on the map and help with asset location tracking.
        </p>
        <Button onClick={requestLocationPermission} size="sm">
          <Navigation className="w-4 h-4 mr-2" />
          Enable Location Access
        </Button>
      </AlertDescription>
    </Alert>
  );
}
