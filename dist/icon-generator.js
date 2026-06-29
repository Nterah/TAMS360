// Dynamic PNG Icon Generator
// This script generates PNG icons from the SVG on-the-fly
// No file upload needed!

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <!-- Background Circle -->
  <circle cx="256" cy="256" r="256" fill="#010D13"/>
  
  <!-- Outer Ring - Sky Blue -->
  <circle cx="256" cy="256" r="220" fill="none" stroke="#39AEDF" stroke-width="24" stroke-dasharray="100 10"/>
  
  <!-- Inner Ring - Green -->
  <circle cx="256" cy="256" r="180" fill="none" stroke="#5DB32A" stroke-width="20" stroke-dasharray="100 10"/>
  
  <!-- Yellow Accents -->
  <rect x="250" y="40" width="12" height="20" fill="#F8D227" rx="6"/>
  <rect x="40" y="250" width="20" height="12" fill="#F8D227" rx="6"/>
  <rect x="452" y="250" width="20" height="12" fill="#F8D227" rx="6"/>
  <rect x="250" y="452" width="12" height="20" fill="#F8D227" rx="6"/>
  
  <!-- WiFi Signal -->
  <path d="M 256 150 Q 220 170 220 190 Q 220 200 230 200 Q 240 200 240 190 Q 240 180 256 170 Q 272 180 272 190 Q 272 200 282 200 Q 292 200 292 190 Q 292 170 256 150 Z" fill="white"/>
  <path d="M 256 170 Q 235 185 235 205 Q 235 215 245 215 Q 255 215 255 205 Q 255 195 256 190 Q 257 195 257 205 Q 257 215 267 215 Q 277 215 277 205 Q 277 185 256 170 Z" fill="white"/>
  <path d="M 256 190 Q 245 200 245 215 Q 245 225 256 225 Q 267 225 267 215 Q 267 200 256 190 Z" fill="white"/>
  
  <!-- Location Pin -->
  <path d="M 256 200 Q 236 200 236 220 Q 236 240 256 270 Q 276 240 276 220 Q 276 200 256 200 Z M 256 210 Q 266 210 266 220 Q 266 230 256 230 Q 246 230 246 220 Q 246 210 256 210 Z" fill="white"/>
  
  <!-- TAMS Text -->
  <text x="256" y="320" font-family="Inter, Arial, sans-serif" font-size="72" font-weight="900" fill="white" text-anchor="middle">TAMS</text>
  
  <!-- 360° Text -->
  <text x="256" y="375" font-family="Inter, Arial, sans-serif" font-size="60" font-weight="900" fill="white" text-anchor="middle">360°</text>
</svg>`;

// Convert SVG to PNG
function generatePNG(size) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, size, size);
      canvas.toBlob(blob => resolve(blob), 'image/png');
    };
    img.onerror = reject;
    
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    img.src = URL.createObjectURL(blob);
  });
}

// Export function for service worker or other scripts
if (typeof self !== 'undefined' && self.addEventListener) {
  self.generatePNG = generatePNG;
}

if (typeof window !== 'undefined') {
  window.generatePNG = generatePNG;
}
