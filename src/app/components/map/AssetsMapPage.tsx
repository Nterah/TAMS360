import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../App';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { AssetMap, Asset } from '../AssetMap';
import { MapFilters, MapFilterState } from '../MapFilters';
import { Map, LayoutGrid, RefreshCw, Maximize2, Minimize2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../../../../utils/supabase/info';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

export default function AssetsMapPage() {
  const { accessToken, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [filters, setFilters] = useState<MapFilterState>({
    assetTypes: new Set<string>(),
    ciRanges: new Set(['excellent', 'good', 'fair', 'poor', 'not-inspected']),
    urgencies: new Set<string>(),
    regions: new Set<string>(),
    depots: new Set<string>(),
  });

  const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-c894a9ff`;

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch first page with count
      const response = await fetch(`${API_URL}/assets?pageSize=500`, {
        headers: {
          Authorization: `Bearer ${accessToken || publicAnonKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const fetchedAssets = data.assets || [];
        setAssets(fetchedAssets);

        // Initialize asset type filters to show all by default
        const types = new Set(fetchedAssets.map((a: Asset) => a.asset_type).filter(Boolean));
        setFilters(prev => ({ ...prev, assetTypes: types }));

        // Load more pages if needed (up to 2000 assets for map display)
        if (data.totalPages > 1) {
          const allAssets = [...fetchedAssets];
          for (let page = 2; page <= Math.min(data.totalPages, 4); page++) {
            const pageResponse = await fetch(`${API_URL}/assets?page=${page}&pageSize=500`, {
              headers: {
                Authorization: `Bearer ${accessToken || publicAnonKey}`,
              },
            });
            if (pageResponse.ok) {
              const pageData = await pageResponse.json();
              allAssets.push(...(pageData.assets || []));
            }
          }
          setAssets(allAssets);
          const allTypes = new Set(allAssets.map((a: Asset) => a.asset_type).filter(Boolean));
          setFilters(prev => ({ ...prev, assetTypes: allTypes }));
        }
      } else {
        // Handle error response
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Failed to fetch assets:', response.status, errorData);
        
        if (response.status === 403) {
          if (errorData.error?.includes('not associated with an organization')) {
            setError('Your account is not associated with an organization. Please contact your administrator.');
            toast.error('Account not configured properly');
          } else {
            setError('You do not have permission to view assets.');
            toast.error('Access denied');
          }
        } else if (response.status === 401) {
          setError('Your session has expired. Please log in again.');
          toast.error('Session expired');
          setTimeout(() => navigate('/login'), 2000);
        } else {
          setError(errorData.error || 'Failed to load assets');
          toast.error('Failed to load assets');
        }
      }
    } catch (error: any) {
      console.error('Error fetching assets:', error);
      setError('Network error: Unable to connect to the server');
      toast.error('Error loading assets');
    } finally {
      setLoading(false);
    }
  };

  // Filter assets based on selected filters
  const filteredAssets = assets.filter((asset) => {
    // Asset type filter
    if (filters.assetTypes.size > 0 && !filters.assetTypes.has(asset.asset_type)) {
      return false;
    }

    // CI range filter
    if (filters.ciRanges.size > 0) {
      const ci = asset.latest_ci;
      let ciRange = 'not-inspected';
      
      if (ci !== undefined && ci !== null) {
        if (ci >= 80) ciRange = 'excellent';
        else if (ci >= 60) ciRange = 'good';
        else if (ci >= 40) ciRange = 'fair';
        else ciRange = 'poor';
      }
      
      if (!filters.ciRanges.has(ciRange)) {
        return false;
      }
    }

    // Urgency filter
    if (filters.urgencies.size > 0) {
      const urgency = asset.urgency?.toLowerCase() || '';
      let urgencyLevel = '';
      
      if (urgency.includes('immediate')) urgencyLevel = 'immediate';
      else if (urgency.includes('high')) urgencyLevel = 'high';
      else if (urgency.includes('medium')) urgencyLevel = 'medium';
      else if (urgency.includes('low') || urgency.includes('routine')) urgencyLevel = 'low';
      
      if (urgencyLevel && !filters.urgencies.has(urgencyLevel)) {
        return false;
      }
    }

    // Region filter
    if (filters.regions.size > 0 && asset.region && !filters.regions.has(asset.region)) {
      return false;
    }

    // Depot filter
    if (filters.depots.size > 0 && asset.depot && !filters.depots.has(asset.depot)) {
      return false;
    }

    return true;
  });

  // Extract unique values for filters
  const availableTypes = Array.from(new Set(assets.map(a => a.asset_type).filter(Boolean)));
  const availableRegions = Array.from(new Set(assets.map(a => a.region).filter(Boolean)));
  const availableDepots = Array.from(new Set(assets.map(a => a.depot).filter(Boolean)));

  // Calculate asset counts by type
  const assetCountsByType = availableTypes.reduce((acc, type) => {
    acc[type] = assets.filter(a => a.asset_type === type).length;
    return acc;
  }, {} as Record<string, number>);

  const handleViewAsset = (asset: Asset) => {
    navigate(`/assets/${asset.asset_id || asset.id}`);
  };

  return (
    <div className={`space-y-6 ${isFullscreen ? 'fixed inset-0 z-50 bg-white p-6' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#010D13] flex items-center gap-2">
            <Map className="w-8 h-8 text-[#39AEDF]" />
            Assets Map View
          </h1>
          <p className="text-[#455B5E] mt-1">
            Geographic visualization of road and traffic assets
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={fetchAssets}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/assets')}
          >
            <LayoutGrid className="w-4 h-4 mr-2" />
            List View
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-4 h-4 mr-2" />
                Exit Fullscreen
              </>
            ) : (
              <>
                <Maximize2 className="w-4 h-4 mr-2" />
                Fullscreen
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Stats */}
      {!isFullscreen && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-[#455B5E]">Total Assets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#010D13]">{assets.length}</div>
              <p className="text-xs text-[#455B5E] mt-1">
                {filteredAssets.length} visible on map
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-[#455B5E]">
                With GPS Data
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#010D13]">
                {assets.filter(a => a.gps_latitude && a.gps_longitude).length}
              </div>
              <p className="text-xs text-[#455B5E] mt-1">
                {Math.round((assets.filter(a => a.gps_latitude && a.gps_longitude).length / Math.max(assets.length, 1)) * 100)}% coverage
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-[#455B5E]">Asset Types</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#010D13]">{availableTypes.length}</div>
              <p className="text-xs text-[#455B5E] mt-1">
                {filters.assetTypes.size} selected
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-[#455B5E]">Regions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#010D13]">{availableRegions.length}</div>
              <p className="text-xs text-[#455B5E] mt-1">Across the system</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Map and Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1">
          <MapFilters
            filters={filters}
            onFiltersChange={setFilters}
            availableTypes={availableTypes}
            availableRegions={availableRegions}
            availableDepots={availableDepots}
            assetCounts={{
              total: assets.length,
              byType: assetCountsByType,
            }}
          />
        </div>

        {/* Map */}
        <div className="lg:col-span-3">
          <Card className={isFullscreen ? 'h-full' : ''}>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center h-[600px]">
                  <div className="text-center">
                    <RefreshCw className="w-8 h-8 text-[#39AEDF] animate-spin mx-auto mb-2" />
                    <p className="text-[#455B5E]">Loading assets...</p>
                  </div>
                </div>
              ) : (
                <div className={isFullscreen ? 'h-full' : 'h-[600px]'}>
                  <AssetMap
                    assets={filteredAssets}
                    onViewAsset={handleViewAsset}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Map Legend */}
      {!isFullscreen && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Map Legend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <h4 className="text-sm font-semibold text-[#010D13] mb-2">Condition Index</h4>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full bg-[#5DB32A]" />
                    <span>Excellent (80-100)</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full bg-[#39AEDF]" />
                    <span>Good (60-79)</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full bg-[#F8D227]" />
                    <span>Fair (40-59)</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full bg-[#EF4444]" />
                    <span>Poor (0-39)</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full bg-[#94A3B8]" />
                    <span>Not Inspected</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-[#010D13] mb-2">Clusters</h4>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-8 h-8 rounded-full bg-[#39AEDF] text-white flex items-center justify-center text-xs font-bold">
                      15
                    </div>
                    <span>Multiple assets</span>
                  </div>
                  <p className="text-xs text-[#455B5E] mt-2">
                    Click clusters to zoom in and see individual assets
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-[#010D13] mb-2">Interaction</h4>
                <div className="space-y-1 text-sm">
                  <p className="text-[#455B5E]">• Click marker for details</p>
                  <p className="text-[#455B5E]">• Zoom with mouse wheel</p>
                  <p className="text-[#455B5E]">• Drag to pan map</p>
                  <p className="text-[#455B5E]">• Use filters to refine view</p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-[#010D13] mb-2">Asset Types</h4>
                <div className="space-y-1">
                  {availableTypes.slice(0, 5).map((type) => (
                    <div key={type} className="flex items-center gap-2 text-sm">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ 
                          backgroundColor: 
                            type === 'Signage' ? '#39AEDF' :
                            type === 'Traffic Signal' ? '#F8D227' :
                            type === 'Guardrail' ? '#455B5E' :
                            type === 'Safety Barrier' ? '#5DB32A' :
                            type === 'Road Marking' ? '#010D13' :
                            '#39AEDF'
                        }}
                      />
                      <span className="truncate">{type}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}