import { useTenant } from '../../contexts/TenantContext';
import { Building2 } from 'lucide-react';

export default function TenantBanner() {
  const { tenantName, settings, loading } = useTenant();

  if (loading) {
    return null;
  }

  const orgName = settings.organization_name || tenantName;
  const logoUrl = settings.logo_url;

  return (
    <div className="bg-gradient-to-r from-[#010D13] to-[#1a2d32] border-b border-[#39AEDF]/20 px-4 py-2">
      <div className="flex items-center gap-3 max-w-7xl mx-auto">
        {logoUrl ? (
          <img 
            src={logoUrl} 
            alt={orgName} 
            className="h-8 w-auto object-contain"
            onError={(e) => {
              // Fallback to icon if logo fails to load
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <Building2 className="w-6 h-6 text-[#39AEDF]" />
        )}
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">{orgName}</p>
          {settings.address && (
            <p className="text-xs text-gray-400">{settings.address}</p>
          )}
        </div>
        {settings.phone && (
          <p className="text-xs text-gray-400 hidden sm:block">{settings.phone}</p>
        )}
        {settings.website && (
          <a 
            href={`https://${settings.website.replace(/^https?:\/\//, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#39AEDF] hover:text-[#5DB32A] transition-colors hidden md:block"
          >
            {settings.website.replace(/^https?:\/\//, '')}
          </a>
        )}
      </div>
    </div>
  );
}
