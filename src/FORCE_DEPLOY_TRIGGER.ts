// Force deployment trigger - v2.1.0
// This file forces Figma Make to detect changes and redeploy
// Photo Import Feature + Map Visibility Fix
// Generated: 2026-01-17

export const DEPLOYMENT_VERSION = "2.1.0";
export const DEPLOYMENT_TIMESTAMP = "2026-01-17T12:00:00Z";
export const FEATURES_ADDED = [
  "Photo Import System - Upload 3,310 inspection photos",
  "Map Visibility Fix - Shows all 202 assets",
  "Photo Classification - Automatic detection of photo types (0, 1, 1.1, 6, etc.)",
  "Supabase Storage Integration - Uploads to 'tams360-inspection-photos' bucket"
];

console.log(`TAMS360 Deployment v${DEPLOYMENT_VERSION} - ${DEPLOYMENT_TIMESTAMP}`);
console.log("Features:", FEATURES_ADDED);
