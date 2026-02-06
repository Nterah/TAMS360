import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthContext } from '../App';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';

interface TenantSettings {
  organization_name: string;
  organization_tagline?: string | null;
  address: string;
  phone: string;
  email?: string | null;
  website: string;
  logo_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  accent_color?: string | null;
  license_expiry_date?: string | null;
  asset_number_prefix?: string | null;
  asset_number_digits?: number | null;
  inspection_number_prefix?: string | null;
  maintenance_number_prefix?: string | null;
  date_format?: string | null;
  currency?: string | null;
  measurement_units?: string | null;
  time_zone?: string | null;
  fiscal_year_start?: string | null;
  auto_backup?: boolean | null;
  notifications_enabled?: boolean | null;
}

interface TenantContextType {
  tenantId: string | null;
  tenantName: string;
  settings: TenantSettings;
  loading: boolean;
  refreshSettings: () => Promise<void>;
}

const defaultSettings: TenantSettings = {
  organization_name: 'TAMS360',
  organization_tagline: null,
  address: '',
  phone: '',
  email: null,
  website: '',
  logo_url: null,
  primary_color: null,
  secondary_color: null,
  accent_color: null,
  license_expiry_date: null,
  asset_number_prefix: null,
  asset_number_digits: null,
  inspection_number_prefix: null,
  maintenance_number_prefix: null,
  date_format: null,
  currency: null,
  measurement_units: null,
  time_zone: null,
  fiscal_year_start: null,
  auto_backup: null,
  notifications_enabled: null,
};

export const TenantContext = createContext<TenantContextType>({
  tenantId: null,
  tenantName: 'TAMS360',
  settings: defaultSettings,
  loading: false,
  refreshSettings: async () => {},
});

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { accessToken, user } = useContext(AuthContext);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenantName, setTenantName] = useState<string>('TAMS360');
  const [settings, setSettings] = useState<TenantSettings>(defaultSettings);
  const [loading, setLoading] = useState(false);

  const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-c894a9ff`;

  const fetchTenantSettings = async () => {
    if (!accessToken) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/tenant/settings`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTenantId(data.tenantId);
        setTenantName(data.tenantName);
        setSettings(data.settings);
      } else {
        if (response.status === 401) {
          console.log('Tenant settings require authentication');
        } else {
          console.error('Failed to fetch tenant settings:', response.status);
        }
        // Use fallback values
        setTenantName('TAMS360');
        setSettings(defaultSettings);
      }
    } catch (error) {
      console.error('Error fetching tenant settings:', error);
      // Use fallback values
      setTenantName('TAMS360');
      setSettings(defaultSettings);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && accessToken) {
      setTenantId(user.tenantId);
      fetchTenantSettings();
    } else {
      setTenantId(null);
      setTenantName('TAMS360');
      setSettings(defaultSettings);
    }
  }, [user, accessToken]);

  return (
    <TenantContext.Provider 
      value={{ 
        tenantId, 
        tenantName, 
        settings, 
        loading,
        refreshSettings: fetchTenantSettings 
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}