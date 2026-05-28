/**
 * Centralised asset display + geometry helpers for TAMS360.
 *
 * Purpose:
 * - Keep CI, Urgency, Condition and GPS/GeoJSON logic consistent across:
 *   Assets list
 *   Asset detail
 *   GIS Map
 *   Inspection detail
 *   Reports
 *
 * This prevents the current issue where the same asset displays different
 * CI / Urgency / Coordinate values depending on the page.
 */

export type GeometryKind = "Point" | "Line" | "Polygon";

export type NormalisedGeometry = {
  type: GeometryKind;
  coordinates: [number, number][]; // Leaflet format: [lat, lng]
  geojson: GeoJSON.Point | GeoJSON.LineString | GeoJSON.Polygon | null;
  center: { lat: number; lng: number } | null;
};

export type DisplayBadge = {
  code: string;
  label: string;
  shortLabel: string;
  description: string;
  className: string;
  color: string;
};

export type CIDisplay = {
  value: number | null;
  label: string;
  shortLabel: string;
  className: string;
  color: string;
};

function firstDefined(...values: any[]) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}

export function toNumber(value: any): number | null {
  if (value === undefined || value === null || value === "") return null;

  const parsed = Number(value);

  if (Number.isNaN(parsed) || !Number.isFinite(parsed)) return null;

  return parsed;
}

export function clampCI(value: any): number | null {
  const num = toNumber(value);

  if (num === null) return null;

  return Math.max(0, Math.min(100, Math.round(num)));
}

/**
 * Resolve CI using the same priority everywhere.
 *
 * Priority:
 * 1. Latest asset roll-up fields
 * 2. Inspection calculation metadata
 * 3. Inspection direct fields
 * 4. Older/legacy names
 */
export function resolveCI(source: any): number | null {
  if (!source) return null;

  const healthCI = clampCI(
    firstDefined(
      source.ci_health,
      source.latest_ci_health,
      source.latest_inspection?.calculation_metadata?.ci_health,
      source.latest_inspection?.ci_health,
      source.inspection?.calculation_metadata?.ci_health,
      source.inspection?.ci_health,
      source.calculation_metadata?.ci_health
    )
  );

  const safetyCI = clampCI(
    firstDefined(
      source.ci_safety,
      source.latest_ci_safety,
      source.latest_inspection?.calculation_metadata?.ci_safety,
      source.latest_inspection?.ci_safety,
      source.inspection?.calculation_metadata?.ci_safety,
      source.inspection?.ci_safety,
      source.calculation_metadata?.ci_safety
    )
  );

  if (healthCI !== null && safetyCI !== null) {
    return Math.min(healthCI, safetyCI);
  }

  const value = firstDefined(
    source.latest_ci_final,
    source.latest_final_ci,
    source.ci_final,
    source.final_ci,
    source.ci_final_score,
    source.latest_inspection?.calculation_metadata?.ci_final,
    source.latest_inspection?.ci_final,
    source.inspection?.calculation_metadata?.ci_final,
    source.inspection?.ci_final,
    source.calculation_metadata?.ci_final,
    source.latest_ci,
    source.condition_index,
    source.conditional_index,
    source.ci
  );

  return clampCI(value);
}

export function resolveCIHealth(source: any): number | null {
  if (!source) return null;

  return clampCI(
    firstDefined(
      source.ci_health,
      source.latest_ci_health,

      // In your current asset list API, latest_ci is behaving like health CI.
      source.latest_ci,

      source.calculation_metadata?.ci_health,
      source.latest_inspection?.calculation_metadata?.ci_health,
      source.inspection?.calculation_metadata?.ci_health
    )
  );
}

export function resolveCISafety(source: any): number | null {
  if (!source) return null;

  const explicitSafety = clampCI(
    firstDefined(
      source.ci_safety,
      source.latest_ci_safety,
      source.calculation_metadata?.ci_safety,
      source.latest_inspection?.calculation_metadata?.ci_safety,
      source.inspection?.calculation_metadata?.ci_safety
    )
  );

  if (explicitSafety !== null) return explicitSafety;

  // Safety CI derived from worst urgency.
  // This is the missing bridge causing AssetsPage to show 50 instead of 0.
  const urgency = resolveUrgency(source);

  switch (urgency) {
    case "4":
      return 0;
    case "3":
      return 25;
    case "2":
      return 50;
    case "1":
      return 75;
    case "0":
      return 90;
    case "R":
      return 100;
    case "U":
      return null;
    default:
      return null;
  }
}

/**
 * Resolve urgency using the same priority everywhere.
 *
 * Handles:
 * - 0, 1, 2, 3, 4
 * - R = Record only
 * - U = Unable to inspect
 * - legacy words like Low / Medium / High / Immediate
 */
export function resolveUrgency(source: any): string | null {
  if (!source) return null;

  const raw = firstDefined(
    source.latest_urgency,
    source.worst_urgency,
    source.calculated_urgency,
    source.urgency,
    source.deru_urgency,
    source.DERU_URGENCY,
    source.calculation_metadata?.worst_urgency,
    source.latest_inspection?.calculation_metadata?.worst_urgency,
    source.latest_inspection?.calculated_urgency,
    source.latest_inspection?.urgency,
    source.inspection?.calculation_metadata?.worst_urgency,
    source.inspection?.calculated_urgency,
    source.inspection?.urgency
  );

  if (raw === undefined || raw === null || raw === "") return null;

  const value = String(raw).trim();

  if (!value) return null;

  const lower = value.toLowerCase();

  if (lower === "r" || lower.includes("record")) return "R";
  if (lower === "u" || lower.includes("unable")) return "U";
  if (lower === "n/a" || lower === "na" || lower.includes("not assessed")) return null;
  if (lower === "r" || lower.includes("record")) return "R";
  if (lower === "u" || lower.includes("unable")) return "U";
  if (lower.includes("immediate") || lower.includes("critical")) return "4";
  if (lower.includes("high")) return "3";
  if (lower.includes("medium")) return "2";
  if (lower.includes("low")) return "1";
  if (lower.includes("routine") || lower.includes("monitor")) return "0";

  if (["0", "1", "2", "3", "4"].includes(value)) return value;

  return value;
}

export function getCIDisplay(source: any): CIDisplay {
  const value = typeof source === "number" || typeof source === "string"
    ? resolveCI({ ci_final: source })
    : resolveCI(source);

  if (value === null) {
    return {
      value: null,
      label: "No CI",
      shortLabel: "No CI",
      className: "bg-slate-100 text-slate-700 border-slate-300",
      color: "#94A3B8",
    };
  }

  if (value >= 80) {
    return {
      value,
      label: `${value} - Excellent`,
      shortLabel: `${value}`,
      className: "bg-green-100 text-green-800 border-green-300",
      color: "#5DB32A",
    };
  }

  if (value >= 60) {
    return {
      value,
      label: `${value} - Good`,
      shortLabel: `${value}`,
      className: "bg-blue-100 text-blue-800 border-blue-300",
      color: "#39AEDF",
    };
  }

  if (value >= 40) {
    return {
      value,
      label: `${value} - Fair`,
      shortLabel: `${value}`,
      className: "bg-yellow-100 text-yellow-900 border-yellow-300",
      color: "#F8D227",
    };
  }

  return {
    value,
    label: `${value} - Poor`,
    shortLabel: `${value}`,
    className: "bg-red-100 text-red-800 border-red-300",
    color: "#D4183D",
  };
}

export function getUrgencyDisplay(source: any): DisplayBadge {
  const code = typeof source === "number" || typeof source === "string"
    ? resolveUrgency({ latest_urgency: source })
    : resolveUrgency(source);

  switch (code) {
    case "4":
      return {
        code: "4",
        label: "4 - Immediate",
        shortLabel: "4",
        description: "Immediate action required",
        className: "bg-red-100 text-red-800 border-red-300",
        color: "#D4183D",
      };

    case "3":
      return {
        code: "3",
        label: "3 - High",
        shortLabel: "3",
        description: "High urgency",
        className: "bg-orange-100 text-orange-900 border-orange-300",
        color: "#F97316",
      };

    case "2":
      return {
        code: "2",
        label: "2 - Medium",
        shortLabel: "2",
        description: "Medium urgency",
        className: "bg-yellow-100 text-yellow-900 border-yellow-300",
        color: "#F8D227",
      };

    case "1":
      return {
        code: "1",
        label: "1 - Low",
        shortLabel: "1",
        description: "Low urgency",
        className: "bg-blue-100 text-blue-800 border-blue-300",
        color: "#39AEDF",
      };

    case "0":
      return {
        code: "0",
        label: "0 - Routine",
        shortLabel: "0",
        description: "Routine monitoring",
        className: "bg-green-100 text-green-800 border-green-300",
        color: "#5DB32A",
      };

    case "R":
      return {
        code: "R",
        label: "R - Record Only",
        shortLabel: "R",
        description: "Record only",
        className: "bg-slate-100 text-slate-700 border-slate-300",
        color: "#94A3B8",
      };

    case "U":
      return {
        code: "U",
        label: "U - Unable to Inspect",
        shortLabel: "U",
        description: "Unable to inspect",
        className: "bg-slate-200 text-slate-800 border-slate-400",
        color: "#64748B",
      };

    default:
      return {
        code: "N/A",
        label: "N/A - Not Assessed",
        shortLabel: "N/A",
        description: "No valid urgency score available",
        className: "bg-slate-100 text-slate-700 border-slate-300",
        color: "#94A3B8",
      };
  }
}

export function parseGeoJson(value: any): any | null {
  if (!value) return null;

  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  if (typeof value === "object") return value;

  return null;
}

export function normaliseGeometryType(value: any): GeometryKind {
  const raw = String(value || "").trim().toLowerCase();

  if (raw === "line" || raw === "linestring" || raw === "polyline") return "Line";
  if (raw === "polygon" || raw === "area") return "Polygon";

  return "Point";
}

function isValidLatLng(lat: any, lng: any): boolean {
  const latNum = toNumber(lat);
  const lngNum = toNumber(lng);

  if (latNum === null || lngNum === null) return false;

  return latNum >= -90 && latNum <= 90 && lngNum >= -180 && lngNum <= 180;
}

function pointFromLatLng(lat: any, lng: any): [number, number] | null {
  if (!isValidLatLng(lat, lng)) return null;

  return [Number(lat), Number(lng)];
}

function coordinatesFromGeoJson(geojson: any): [GeometryKind, [number, number][]] | null {
  if (!geojson || !geojson.type) return null;

  if (geojson.type === "Feature" && geojson.geometry) {
    return coordinatesFromGeoJson(geojson.geometry);
  }

  if (geojson.type === "Point" && Array.isArray(geojson.coordinates)) {
    const [lng, lat] = geojson.coordinates;
    const point = pointFromLatLng(lat, lng);
    return point ? ["Point", [point]] : null;
  }

  if (geojson.type === "LineString" && Array.isArray(geojson.coordinates)) {
    const points = geojson.coordinates
      .map(([lng, lat]: [number, number]) => pointFromLatLng(lat, lng))
      .filter(Boolean) as [number, number][];

    return points.length ? ["Line", points] : null;
  }

  if (
    geojson.type === "Polygon" &&
    Array.isArray(geojson.coordinates) &&
    Array.isArray(geojson.coordinates[0])
  ) {
    const ring = geojson.coordinates[0];

    const points = ring
      .map(([lng, lat]: [number, number]) => pointFromLatLng(lat, lng))
      .filter(Boolean) as [number, number][];

    return points.length ? ["Polygon", points] : null;
  }

  return null;
}

function geoJsonFromCoordinates(
  geometryType: GeometryKind,
  coordinates: [number, number][]
): GeoJSON.Point | GeoJSON.LineString | GeoJSON.Polygon | null {
  if (!coordinates.length) return null;

  if (geometryType === "Point") {
    const [lat, lng] = coordinates[0];

    return {
      type: "Point",
      coordinates: [lng, lat],
    };
  }

  if (geometryType === "Line") {
    return {
      type: "LineString",
      coordinates: coordinates.map(([lat, lng]) => [lng, lat]),
    };
  }

  const polygonCoords = coordinates.map(([lat, lng]) => [lng, lat]);

  const first = polygonCoords[0];
  const last = polygonCoords[polygonCoords.length - 1];

  if (first && last && (first[0] !== last[0] || first[1] !== last[1])) {
    polygonCoords.push(first);
  }

  return {
    type: "Polygon",
    coordinates: [polygonCoords],
  };
}

function calculateCenter(coordinates: [number, number][]): { lat: number; lng: number } | null {
  if (!coordinates.length) return null;

  const total = coordinates.reduce(
    (sum, [lat, lng]) => ({
      lat: sum.lat + lat,
      lng: sum.lng + lng,
    }),
    { lat: 0, lng: 0 }
  );

  return {
    lat: total.lat / coordinates.length,
    lng: total.lng / coordinates.length,
  };
}

/**
 * Resolve geometry from:
 * 1. Existing GeoJSON / geometry fields
 * 2. Start and end coordinates for linear assets
 * 3. Normal GPS point fields
 *
 * This directly supports the Asset Register style fields:
 * START LATITUDE, START LONGITUDE, END LATITUDE, END LONGITUDE
 */
export function resolveAssetGeometry(asset: any): NormalisedGeometry {
  const geojson = parseGeoJson(
    firstDefined(
      asset?.geojson,
      asset?.geometry,
      asset?.location?.geometry,
      asset?.raw?.geojson,
      asset?.raw?.geometry
    )
  );

  const fromGeoJson = coordinatesFromGeoJson(geojson);

  if (fromGeoJson) {
    const [type, coordinates] = fromGeoJson;

    return {
      type,
      coordinates,
      geojson: geoJsonFromCoordinates(type, coordinates),
      center: calculateCenter(coordinates),
    };
  }

  const startPoint = pointFromLatLng(
    firstDefined(
      asset?.start_latitude,
      asset?.start_lat,
      asset?.START_LATITUDE,
      asset?.gps_lat,
      asset?.gps_latitude,
      asset?.latitude,
      asset?.lat
    ),
    firstDefined(
      asset?.start_longitude,
      asset?.start_lng,
      asset?.start_lon,
      asset?.START_LONGITUDE,
      asset?.gps_lng,
      asset?.gps_longitude,
      asset?.longitude,
      asset?.lng,
      asset?.lon
    )
  );

  const endPoint = pointFromLatLng(
    firstDefined(
      asset?.end_latitude,
      asset?.end_lat,
      asset?.END_LATITUDE
    ),
    firstDefined(
      asset?.end_longitude,
      asset?.end_lng,
      asset?.end_lon,
      asset?.END_LONGITUDE
    )
  );

  const declaredType = normaliseGeometryType(
    firstDefined(
      asset?.geometry_type,
      asset?.geometryType,
      asset?.asset_geometry_type,
      asset?.asset_type_geometry
    )
  );

  if (startPoint && endPoint) {
    const lineCoordinates: [number, number][] = [startPoint, endPoint];

    return {
      type: declaredType === "Polygon" ? "Polygon" : "Line",
      coordinates: lineCoordinates,
      geojson: geoJsonFromCoordinates(declaredType === "Polygon" ? "Polygon" : "Line", lineCoordinates),
      center: calculateCenter(lineCoordinates),
    };
  }

  if (startPoint) {
    return {
      type: "Point",
      coordinates: [startPoint],
      geojson: geoJsonFromCoordinates("Point", [startPoint]),
      center: calculateCenter([startPoint]),
    };
  }

  return {
    type: "Point",
    coordinates: [],
    geojson: null,
    center: null,
  };
}

export function hasUsableGeometry(asset: any): boolean {
  return resolveAssetGeometry(asset).coordinates.length > 0;
}

export function getAssetDisplayName(asset: any): string {
  return String(
    firstDefined(
      asset?.asset_ref,
      asset?.referenceNumber,
      asset?.reference_number,
      asset?.asset_name,
      asset?.name,
      asset?.id,
      "Unnamed Asset"
    )
  );
}

export function getAssetType(asset: any): string {
  return String(
    firstDefined(
      asset?.asset_type_name,
      asset?.asset_type,
      asset?.type,
      "Unknown"
    )
  );
}

export function getAssetRoadName(asset: any): string {
  return String(
    firstDefined(
      asset?.road_name,
      asset?.roadName,
      asset?.location,
      "N/A"
    )
  );
}

export function getAssetKm(asset: any): string {
  const km = firstDefined(
    asset?.km_marker,
    asset?.kilometer,
    asset?.km,
    asset?.start_km,
    asset?.START_KM
  );

  return km === undefined || km === null || km === "" ? "N/A" : String(km);
}


export function resolveCondition(source: any): string {
  const ci = resolveCI(source);

  const existingCondition = firstDefined(
    source?.latest_condition,
    source?.asset_condition,
    source?.condition,
    source?.ASSET_CONDITION,
    source?.latest_inspection?.condition,
    source?.inspection?.condition
  );

  if (existingCondition) return String(existingCondition).trim();

  if (ci === null) return "N/A";
  if (ci >= 80) return "Excellent";
  if (ci >= 60) return "Good";
  if (ci >= 40) return "Fair";
  return "Poor";
}


/**
 * Creates one clean asset object that all pages can use.
 */
export function normaliseAssetForDisplay(asset: any) {
  const geometry = resolveAssetGeometry(asset);
  const ci = resolveCI(asset);
  const urgency = resolveUrgency(asset);
  const condition = resolveCondition(asset);

  return {
    ...asset,

    id: firstDefined(asset?.asset_id, asset?.id),
    asset_id: firstDefined(asset?.asset_id, asset?.id),

    asset_ref: firstDefined(asset?.asset_ref, asset?.referenceNumber, asset?.reference_number),
    asset_name: firstDefined(asset?.asset_name, asset?.name),
    asset_type_name: getAssetType(asset),

    road_name: getAssetRoadName(asset),
    km_marker: getAssetKm(asset),

    latest_ci: ci,
    latest_urgency: urgency,
    latest_condition: condition,

    condition,

    geometry_type: geometry.type,
    map_coordinates: geometry.coordinates,
    map_center: geometry.center,
    geojson: geometry.geojson,

    gps_lat: geometry.center?.lat ?? firstDefined(asset?.gps_lat, asset?.latitude, asset?.start_latitude),
    gps_lng: geometry.center?.lng ?? firstDefined(asset?.gps_lng, asset?.longitude, asset?.start_longitude),

    latitude: geometry.center?.lat ?? firstDefined(asset?.latitude, asset?.gps_lat, asset?.start_latitude),
    longitude: geometry.center?.lng ?? firstDefined(asset?.longitude, asset?.gps_lng, asset?.start_longitude),
  };
}