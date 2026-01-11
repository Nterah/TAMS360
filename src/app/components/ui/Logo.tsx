interface LogoProps {
  className?: string;
  width?: number;
  height?: number;
}

export default function Logo({ className = "", width = 120, height = 120 }: LogoProps) {
  // Try to load PNG first (which exists in production), fallback to SVG
  return (
    <img 
      src="/icon-192x192.png" 
      onError={(e) => {
        // Fallback to SVG if PNG doesn't exist (Figma Make environment)
        const target = e.target as HTMLImageElement;
        target.src = "/favicon.svg";
      }}
      alt="TAMS360 Logo" 
      width={width} 
      height={height} 
      className={className}
    />
  );
}