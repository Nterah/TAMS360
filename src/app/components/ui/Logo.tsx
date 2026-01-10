interface LogoProps {
  className?: string;
  width?: number;
  height?: number;
}

export default function Logo({ className = "", width = 120, height = 40 }: LogoProps) {
  // Calculate viewBox to maintain aspect ratio
  const aspectRatio = 3; // 120/40 = 3:1
  const viewBoxWidth = 120;
  const viewBoxHeight = viewBoxWidth / aspectRatio;
  
  return (
    <svg 
      width={width} 
      height={height} 
      viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background */}
      <rect width={viewBoxWidth} height={viewBoxHeight} rx="6" fill="#010D13"/>
      
      {/* TAMS text */}
      <text x="10" y="26" fontFamily="Inter, sans-serif" fontSize="16" fontWeight="700" fill="#39AEDF">
        TAMS
      </text>
      
      {/* 360 text */}
      <text x="55" y="26" fontFamily="Inter, sans-serif" fontSize="16" fontWeight="700" fill="#5DB32A">
        360
      </text>
      
      {/* Road icon accent */}
      <circle cx="105" cy="20" r="8" fill="#F8D227" opacity="0.9"/>
      <path d="M103 20 L107 20 M105 18 L105 22" stroke="#010D13" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}