interface LogoProps {
  className?: string;
  width?: number;
  height?: number;
}

export default function Logo({ className = "", width = 120, height = 120 }: LogoProps) {
  return (
    <img 
      src="/favicon.svg" 
      alt="TAMS360 Logo" 
      width={width} 
      height={height} 
      className={className}
    />
  );
}