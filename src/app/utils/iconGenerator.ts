/**
 * Icon Generator Utility
 * 
 * This script helps generate icon files from the TAMS360 logo.
 * 
 * Since we cannot process images server-side in this environment,
 * use this as a reference for what needs to be done:
 * 
 * LOGO SOURCE: figma:asset/64eb9bc8e330e96a962c9d775073b6c24bad7ae0.png
 * 
 * REQUIRED OUTPUTS (place in /public folder):
 * 
 * 1. favicon.ico (32×32px)
 *    - Classic browser tab icon
 *    - ICO format
 * 
 * 2. icon-192x192.png (192×192px)
 *    - PWA standard icon
 *    - PNG with transparent or #010D13 background
 * 
 * 3. icon-512x512.png (512×512px)
 *    - PWA high-resolution icon
 *    - PNG with transparent or #010D13 background
 * 
 * 4. apple-touch-icon.png (180×180px)
 *    - iOS home screen icon
 *    - PNG with #010D13 background (NO transparency)
 *    - Add 20px padding around logo
 * 
 * RECOMMENDED TOOLS:
 * - https://realfavicongenerator.net/ (easiest)
 * - https://favicon.io/favicon-converter/
 * - https://www.pwabuilder.com/imageGenerator
 * 
 * MANUAL PROCESS:
 * 1. Download the logo from Figma
 * 2. Use Photoshop/GIMP/online editor to resize
 * 3. Export at correct sizes
 * 4. Place in /public folder
 * 
 * VERIFICATION:
 * - Check Chrome DevTools → Application → Manifest
 * - Test PWA install prompt
 * - Check browser tab favicon
 * - Test iOS "Add to Home Screen"
 */

// Logo asset reference for documentation
export const TAMS360_LOGO_ASSET = "figma:asset/64eb9bc8e330e96a962c9d775073b6c24bad7ae0.png";

// Brand colors for icon background
export const BRAND_COLORS = {
  deepNavy: "#010D13",
  skyBlue: "#39AEDF",
  green: "#5DB32A",
  yellow: "#F8D227",
  slateGrey: "#455B5E",
};

// Icon specifications
export const ICON_SPECS = [
  {
    name: "favicon.ico",
    size: "32×32px",
    format: "ICO",
    background: "transparent or #010D13",
    notes: "Classic browser favicon",
  },
  {
    name: "icon-192x192.png",
    size: "192×192px",
    format: "PNG",
    background: "transparent or #010D13",
    notes: "PWA standard icon for Android",
  },
  {
    name: "icon-512x512.png",
    size: "512×512px",
    format: "PNG",
    background: "transparent or #010D13",
    notes: "PWA high-res icon for splash screens",
  },
  {
    name: "apple-touch-icon.png",
    size: "180×180px",
    format: "PNG",
    background: "#010D13 (solid, no transparency)",
    notes: "iOS home screen icon with 20px padding",
  },
];

export default {
  TAMS360_LOGO_ASSET,
  BRAND_COLORS,
  ICON_SPECS,
};
