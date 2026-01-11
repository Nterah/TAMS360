interface LogoProps {
  className?: string;
  width?: number;
  height?: number;
}

export default function Logo({ className = "", width = 120, height = 120 }: LogoProps) {
  // Use the PNG logo files from public folder
  // These will be replaced with your actual logo when you deploy
  return (
    <img 
      src="/icon-192x192.png" 
      alt="TAMS360 Logo" 
      width={width} 
      height={height} 
      className={className}
    />
  );
}