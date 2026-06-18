export const GPS_TARGET_ACCURACY_METERS = 30;
export const GPS_ACCEPTABLE_ACCURACY_METERS = 100;
export const GPS_OVERRIDE_REQUIRED_ACCURACY_METERS = 500;
export const GPS_CAPTURE_WINDOW_MS = 20000;
const GPS_READING_TIMEOUT_MS = 12000;

export type GpsAccuracyStatus = "unknown" | "precise" | "acceptable" | "review" | "poor";

export type GpsFix = {
  latitude: number;
  longitude: number;
  accuracy: number;
  capturedAt: string;
};

type CaptureBestGpsFixOptions = {
  targetAccuracyMeters?: number;
  sampleWindowMs?: number;
  readingTimeoutMs?: number;
  onProgress?: (fix: GpsFix) => void;
};

export function classifyGpsAccuracy(accuracy: number | null): GpsAccuracyStatus {
  if (accuracy === null || Number.isNaN(accuracy)) return "unknown";
  if (accuracy <= GPS_TARGET_ACCURACY_METERS) return "precise";
  if (accuracy <= GPS_ACCEPTABLE_ACCURACY_METERS) return "acceptable";
  if (accuracy <= GPS_OVERRIDE_REQUIRED_ACCURACY_METERS) return "review";
  return "poor";
}

export function shouldRequireGpsSaveOverride(accuracy: number | null): boolean {
  return accuracy !== null && accuracy > GPS_ACCEPTABLE_ACCURACY_METERS;
}

export function buildGpsOverrideMessage(accuracy: number): string {
  if (accuracy > GPS_OVERRIDE_REQUIRED_ACCURACY_METERS) {
    return `GPS accuracy is very poor (±${Math.round(accuracy)}m).\n\nRetry the capture or manually verify the coordinates before saving.\n\nDo you still want to save these coordinates?`;
  }

  return `GPS accuracy is low (±${Math.round(accuracy)}m).\n\nPlease confirm the coordinates before saving.\n\nDo you want to continue with this location?`;
}

function mapGeolocationError(error: GeolocationPositionError): Error {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return new Error("Location permission denied. Please enable location access and try again.");
    case error.POSITION_UNAVAILABLE:
      return new Error("Location information is unavailable. Move to an open area and try again.");
    case error.TIMEOUT:
      return new Error("Timed out waiting for a reliable GPS fix. Please try again.");
    default:
      return new Error(error.message || "Unable to capture your location.");
  }
}

export function captureBestGpsFix({
  targetAccuracyMeters = GPS_TARGET_ACCURACY_METERS,
  sampleWindowMs = GPS_CAPTURE_WINDOW_MS,
  readingTimeoutMs = GPS_READING_TIMEOUT_MS,
  onProgress,
}: CaptureBestGpsFixOptions = {}): Promise<GpsFix> {
  if (!navigator.geolocation) {
    return Promise.reject(new Error("Geolocation is not supported by this device."));
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    let bestFix: GpsFix | null = null;
    let lastError: GeolocationPositionError | null = null;
    let watchId: number | null = null;
    let settleTimer: number | null = null;

    const cleanup = () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
      if (settleTimer !== null) {
        window.clearTimeout(settleTimer);
      }
    };

    const settleWithResult = () => {
      if (settled) return;
      settled = true;
      cleanup();

      if (bestFix) {
        resolve(bestFix);
        return;
      }

      if (lastError) {
        reject(mapGeolocationError(lastError));
        return;
      }

      reject(new Error("Unable to capture your location."));
    };

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        const nextFix: GpsFix = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          capturedAt: new Date(position.timestamp).toISOString(),
        };

        if (!bestFix || nextFix.accuracy < bestFix.accuracy) {
          bestFix = nextFix;
          onProgress?.(nextFix);
        }

        if (nextFix.accuracy <= targetAccuracyMeters) {
          settleWithResult();
        }
      },
      (error) => {
        lastError = error;

        if (error.code === error.PERMISSION_DENIED && !bestFix) {
          if (settled) return;
          settled = true;
          cleanup();
          reject(mapGeolocationError(error));
        }
      },
      {
        enableHighAccuracy: true,
        timeout: readingTimeoutMs,
        maximumAge: 0,
      }
    );

    settleTimer = window.setTimeout(settleWithResult, sampleWindowMs);
  });
}
