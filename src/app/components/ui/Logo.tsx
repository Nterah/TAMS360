import logoImage from "figma:asset/64eb9bc8e330e96a962c9d775073b6c24bad7ae0.png";

interface LogoProps {
  className?: string;
  width?: number;
  height?: number;
}

export default function Logo({ className = "", width = 120, height = 120 }: LogoProps) {
  return (
    <img 
      src={logoImage} 
      alt="TAMS360 Logo" 
      width={width} 
      height={height} 
      className={className}
    />
  );
}
