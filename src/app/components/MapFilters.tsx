import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import { Layers, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from './ui/button';

export interface MapFilterState {
  assetTypes: Set<string>;
  ciRanges: Set<string>;
  urgencies: Set<string>;
  regions: Set<string>;
  depots: Set<string>;
}

interface MapFiltersProps {
  filters: MapFilterState;
  onFiltersChange: (filters: MapFilterState) => void;
  availableTypes: string[];
  availableRegions: string[];
  availableDepots: string[];
  assetCounts: {
    total: number;
    byType: Record<string, number>;
  };
}

const CI_RANGES = [
  { id: 'excellent', label: 'Excellent (80-100)', color: '#5DB32A' },
  { id: 'good', label: 'Good (60-79)', color: '#39AEDF' },
  { id: 'fair', label: 'Fair (40-59)', color: '#F8D227' },
  { id: 'poor', label: 'Poor (0-39)', color: '#EF4444' },
  { id: 'not-inspected', label: 'Not Inspected', color: '#94A3B8' },
];

const URGENCY_LEVELS = [
  { id: 'immediate', label: 'Immediate', color: '#DC2626' },
  { id: 'high', label: 'High', color: '#F59E0B' },
  { id: 'medium', label: 'Medium', color: '#3B82F6' },
  { id: 'low', label: 'Low / Routine', color: '#10B981' },
];

const ASSET_TYPE_COLORS: Record<string, string> = {
  'Signage': '#39AEDF',
  'Traffic Signal': '#F8D227',
  'Guardrail': '#455B5E',
  'Safety Barrier': '#5DB32A',
  'Road Marking': '#010D13',
  'Gantry': '#F8D227',
  'Fence': '#455B5E',
  'Guidepost': '#5DB32A',
  'Raised Road Marker': '#39AEDF',
};

export function MapFilters({
  filters,
  onFiltersChange,
  availableTypes,
  availableRegions,
  availableDepots,
  assetCounts,
}: MapFiltersProps) {
  const [showAssetTypes, setShowAssetTypes] = React.useState(true);
  const [showCIRanges, setShowCIRanges] = React.useState(true);
  const [showUrgency, setShowUrgency] = React.useState(false);
  const [showRegions, setShowRegions] = React.useState(false);
  const [showDepots, setShowDepots] = React.useState(false);

  const toggleAssetType = (type: string) => {
    const newTypes = new Set(filters.assetTypes);
    if (newTypes.has(type)) {
      newTypes.delete(type);
    } else {
      newTypes.add(type);
    }
    onFiltersChange({ ...filters, assetTypes: newTypes });
  };

  const toggleCIRange = (range: string) => {
    const newRanges = new Set(filters.ciRanges);
    if (newRanges.has(range)) {
      newRanges.delete(range);
    } else {
      newRanges.add(range);
    }
    onFiltersChange({ ...filters, ciRanges: newRanges });
  };

  const toggleUrgency = (urgency: string) => {
    const newUrgencies = new Set(filters.urgencies);
    if (newUrgencies.has(urgency)) {
      newUrgencies.delete(urgency);
    } else {
      newUrgencies.add(urgency);
    }
    onFiltersChange({ ...filters, urgencies: newUrgencies });
  };

  const toggleRegion = (region: string) => {
    const newRegions = new Set(filters.regions);
    if (newRegions.has(region)) {
      newRegions.delete(region);
    } else {
      newRegions.add(region);
    }
    onFiltersChange({ ...filters, regions: newRegions });
  };

  const toggleDepot = (depot: string) => {
    const newDepots = new Set(filters.depots);
    if (newDepots.has(depot)) {
      newDepots.delete(depot);
    } else {
      newDepots.add(depot);
    }
    onFiltersChange({ ...filters, depots: newDepots });
  };

  const selectAllAssetTypes = () => {
    onFiltersChange({ ...filters, assetTypes: new Set(availableTypes) });
  };

  const clearAllAssetTypes = () => {
    onFiltersChange({ ...filters, assetTypes: new Set() });
  };

  const selectAllCIRanges = () => {
    onFiltersChange({ ...filters, ciRanges: new Set(CI_RANGES.map(r => r.id)) });
  };

  const clearAllCIRanges = () => {
    onFiltersChange({ ...filters, ciRanges: new Set() });
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-[#39AEDF]" />
          <CardTitle className="text-base">Map Filters</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Asset Types Filter */}
        <div>
          <button
            onClick={() => setShowAssetTypes(!showAssetTypes)}
            className="flex items-center justify-between w-full mb-2"
          >
            <Label className="text-sm font-semibold text-[#010D13] cursor-pointer">
              Asset Types ({filters.assetTypes.size}/{availableTypes.length})
            </Label>
            {showAssetTypes ? (
              <ChevronUp className="w-4 h-4 text-[#455B5E]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#455B5E]" />
            )}
          </button>
          {showAssetTypes && (
            <>
              <div className="flex gap-2 mb-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllAssetTypes}
                  className="h-7 text-xs"
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllAssetTypes}
                  className="h-7 text-xs"
                >
                  Clear All
                </Button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {availableTypes.map((type) => (
                  <div key={type} className="flex items-center space-x-2">
                    <Checkbox
                      id={`type-${type}`}
                      checked={filters.assetTypes.has(type)}
                      onCheckedChange={() => toggleAssetType(type)}
                    />
                    <label
                      htmlFor={`type-${type}`}
                      className="flex items-center gap-2 text-sm cursor-pointer flex-1"
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: ASSET_TYPE_COLORS[type] || '#39AEDF' }}
                      />
                      <span className="flex-1">{type}</span>
                      {assetCounts.byType[type] && (
                        <Badge variant="secondary" className="ml-auto text-xs">
                          {assetCounts.byType[type]}
                        </Badge>
                      )}
                    </label>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* CI Condition Filter */}
        <div className="border-t pt-4">
          <button
            onClick={() => setShowCIRanges(!showCIRanges)}
            className="flex items-center justify-between w-full mb-2"
          >
            <Label className="text-sm font-semibold text-[#010D13] cursor-pointer">
              Condition (CI Score)
            </Label>
            {showCIRanges ? (
              <ChevronUp className="w-4 h-4 text-[#455B5E]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#455B5E]" />
            )}
          </button>
          {showCIRanges && (
            <>
              <div className="flex gap-2 mb-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllCIRanges}
                  className="h-7 text-xs"
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllCIRanges}
                  className="h-7 text-xs"
                >
                  Clear All
                </Button>
              </div>
              <div className="space-y-2">
                {CI_RANGES.map((range) => (
                  <div key={range.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`ci-${range.id}`}
                      checked={filters.ciRanges.has(range.id)}
                      onCheckedChange={() => toggleCIRange(range.id)}
                    />
                    <label
                      htmlFor={`ci-${range.id}`}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: range.color }}
                      />
                      {range.label}
                    </label>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Urgency Filter */}
        {availableTypes.length > 0 && (
          <div className="border-t pt-4">
            <button
              onClick={() => setShowUrgency(!showUrgency)}
              className="flex items-center justify-between w-full mb-2"
            >
              <Label className="text-sm font-semibold text-[#010D13] cursor-pointer">
                Urgency Level
              </Label>
              {showUrgency ? (
                <ChevronUp className="w-4 h-4 text-[#455B5E]" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[#455B5E]" />
              )}
            </button>
            {showUrgency && (
              <div className="space-y-2">
                {URGENCY_LEVELS.map((urgency) => (
                  <div key={urgency.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`urgency-${urgency.id}`}
                      checked={filters.urgencies.has(urgency.id)}
                      onCheckedChange={() => toggleUrgency(urgency.id)}
                    />
                    <label
                      htmlFor={`urgency-${urgency.id}`}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: urgency.color }}
                      />
                      {urgency.label}
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Regions Filter */}
        {availableRegions.length > 0 && (
          <div className="border-t pt-4">
            <button
              onClick={() => setShowRegions(!showRegions)}
              className="flex items-center justify-between w-full mb-2"
            >
              <Label className="text-sm font-semibold text-[#010D13] cursor-pointer">
                Regions
              </Label>
              {showRegions ? (
                <ChevronUp className="w-4 h-4 text-[#455B5E]" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[#455B5E]" />
              )}
            </button>
            {showRegions && (
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {availableRegions.map((region) => (
                  <div key={region} className="flex items-center space-x-2">
                    <Checkbox
                      id={`region-${region}`}
                      checked={filters.regions.has(region)}
                      onCheckedChange={() => toggleRegion(region)}
                    />
                    <label
                      htmlFor={`region-${region}`}
                      className="text-sm cursor-pointer"
                    >
                      {region}
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Depots Filter */}
        {availableDepots.length > 0 && (
          <div className="border-t pt-4">
            <button
              onClick={() => setShowDepots(!showDepots)}
              className="flex items-center justify-between w-full mb-2"
            >
              <Label className="text-sm font-semibold text-[#010D13] cursor-pointer">
                Depots
              </Label>
              {showDepots ? (
                <ChevronUp className="w-4 h-4 text-[#455B5E]" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[#455B5E]" />
              )}
            </button>
            {showDepots && (
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {availableDepots.map((depot) => (
                  <div key={depot} className="flex items-center space-x-2">
                    <Checkbox
                      id={`depot-${depot}`}
                      checked={filters.depots.has(depot)}
                      onCheckedChange={() => toggleDepot(depot)}
                    />
                    <label
                      htmlFor={`depot-${depot}`}
                      className="text-sm cursor-pointer"
                    >
                      {depot}
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
