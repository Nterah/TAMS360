import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../ui/Logo";
import { MapPin, BarChart3, ClipboardCheck, Settings } from "lucide-react";

export default function SplashScreen() {
  const navigate = useNavigate();
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Fade out after 2.5 seconds
    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, 2500);

    // Navigate to login after 3 seconds
    const navTimer = setTimeout(() => {
      navigate("/login");
    }, 3000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(navTimer);
    };
  }, [navigate]);

  return (
    <div
      className={`min-h-screen bg-gradient-to-br from-[#010D13] via-[#1a2d32] to-[#010D13] flex flex-col items-center justify-center p-4 transition-opacity duration-500 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Logo Animation */}
      <div className="animate-in zoom-in-50 duration-700">
        <div className="relative">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-[#39AEDF] blur-3xl opacity-20 rounded-full"></div>
          
          {/* Logo */}
          <div className="relative bg-white/10 backdrop-blur-sm p-8 rounded-3xl border border-white/20">
            <Logo 
              width={128} 
              height={128}
              className="animate-pulse" 
            />
          </div>
        </div>
      </div>

      {/* Brand Name */}
      <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
        <h1 className="text-5xl font-bold text-white text-center mb-3">
          TAMS360
        </h1>
        <p className="text-xl text-[#39AEDF] text-center font-medium">
          Road & Traffic Asset Management Suite
        </p>
      </div>

      {/* Feature Icons */}
      <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500">
        <div className="flex flex-col items-center gap-2 text-white/80">
          <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
            <MapPin className="w-6 h-6 text-[#39AEDF]" />
          </div>
          <span className="text-xs">GIS Mapping</span>
        </div>
        <div className="flex flex-col items-center gap-2 text-white/80">
          <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
            <ClipboardCheck className="w-6 h-6 text-[#5DB32A]" />
          </div>
          <span className="text-xs">Inspections</span>
        </div>
        <div className="flex flex-col items-center gap-2 text-white/80">
          <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
            <BarChart3 className="w-6 h-6 text-[#F8D227]" />
          </div>
          <span className="text-xs">Analytics</span>
        </div>
        <div className="flex flex-col items-center gap-2 text-white/80">
          <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
            <Settings className="w-6 h-6 text-[#455B5E]" />
          </div>
          <span className="text-xs">Management</span>
        </div>
      </div>

      {/* Loading Indicator */}
      <div className="mt-12 animate-in fade-in duration-700 delay-700">
        <div className="flex gap-2">
          <div className="w-2 h-2 bg-[#39AEDF] rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-[#39AEDF] rounded-full animate-bounce delay-100"></div>
          <div className="w-2 h-2 bg-[#39AEDF] rounded-full animate-bounce delay-200"></div>
        </div>
      </div>

      {/* Version */}
      <div className="absolute bottom-8 text-white/40 text-xs animate-in fade-in duration-700 delay-1000">
        Version 1.0.0 | Powered by TAMS360
      </div>
    </div>
  );
}