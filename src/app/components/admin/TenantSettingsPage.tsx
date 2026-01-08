import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../../App";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Switch } from "../ui/switch";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Building2, Palette, Hash, Globe, Save, Upload, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { projectId, publicAnonKey } from "../../../../utils/supabase/info";

export default function TenantSettingsPage() {
  const { accessToken } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [settings, setSettings] = useState({
    // Organization Branding
    organizationName: "TAMS360",
    organizationTagline: "Road & Traffic Asset Management Suite",
    logoUrl: "",
    primaryColor: "#010D13",
    secondaryColor: "#39AEDF",
    accentColor: "#5DB32A",
    
    // Asset Numbering System
    assetRefPrefix: "TAMS",
    assetRefFormat: "PREFIX-YEAR-SEQUENCE", // Options: PREFIX-YEAR-SEQUENCE, PREFIX-SEQUENCE, YEAR-PREFIX-SEQUENCE
    assetRefSeparator: "-",
    assetRefSequenceLength: 5, // e.g., 00001
    assetRefIncludeType: false, // Include asset type code in reference
    assetRefAutoGenerate: true,
    
    // Regional Settings
    defaultRegion: "National",
    defaultCurrency: "ZAR",
    currencySymbol: "R",
    dateFormat: "DD/MM/YYYY",
    distanceUnit: "kilometers",
    
    // System Preferences
    requireGPSForAssets: true,
    requirePhotoForInspection: true,
    autoCalculateCI: true,
    enableOfflineMode: true,
    dataRetentionYears: 10,
  });

  const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-c894a9ff`;

  useEffect(() => {
    fetchTenantSettings();
  }, []);

  const fetchTenantSettings = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/tenant-settings`, {
        headers: {
          Authorization: `Bearer ${accessToken || publicAnonKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.settings) {
          setSettings({ ...settings, ...data.settings });
        }
      }
    } catch (error) {
      console.error("Error fetching tenant settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/admin/tenant-settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        toast.success("Tenant settings saved successfully");
      } else {
        toast.error("Failed to save settings");
      }
    } catch (error) {
      toast.error("Error saving settings");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async () => {
    if (!logoFile) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("logo", logoFile);
      const response = await fetch(`${API_URL}/admin/tenant-settings/logo`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken || publicAnonKey}`,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.logo_url) {
          setSettings({ ...settings, logoUrl: data.logo_url });
          toast.success("Logo uploaded successfully!");
          setLogoFile(null);
        }
      } else {
        toast.error("Failed to upload logo");
      }
    } catch (error) {
      console.error("Logo upload error:", error);
      toast.error("Error uploading logo");
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = async (file: File) => {
    setLogoFile(file);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("logo", file);
      const response = await fetch(`${API_URL}/admin/tenant-settings/logo`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken || publicAnonKey}`,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.logo_url) {
          setSettings({ ...settings, logoUrl: data.logo_url });
          toast.success("Logo uploaded successfully!");
          setLogoFile(null);
        }
      } else {
        toast.error("Failed to upload logo");
      }
    } catch (error) {
      console.error("Logo upload error:", error);
      toast.error("Error uploading logo");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Tenant Settings</h1>
          <p className="text-muted-foreground">
            Configure branding, asset numbering, and system preferences
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      <Tabs defaultValue="branding" className="space-y-6">
        <TabsList>
          <TabsTrigger value="branding">
            <Palette className="w-4 h-4 mr-2" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="numbering">
            <Hash className="w-4 h-4 mr-2" />
            Asset Numbering
          </TabsTrigger>
          <TabsTrigger value="regional">
            <Globe className="w-4 h-4 mr-2" />
            Regional Settings
          </TabsTrigger>
          <TabsTrigger value="system">
            <Building2 className="w-4 h-4 mr-2" />
            System Preferences
          </TabsTrigger>
        </TabsList>

        {/* Branding Tab */}
        <TabsContent value="branding" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Organization Branding</CardTitle>
              <CardDescription>
                Customize your organization's identity and visual appearance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="org-name">Organization Name</Label>
                  <Input
                    id="org-name"
                    value={settings.organizationName}
                    onChange={(e) => setSettings({ ...settings, organizationName: e.target.value })}
                    placeholder="Your Organization Name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="org-tagline">Tagline</Label>
                  <Input
                    id="org-tagline"
                    value={settings.organizationTagline}
                    onChange={(e) => setSettings({ ...settings, organizationTagline: e.target.value })}
                    placeholder="Your organization tagline"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="logo-url">Organization Logo URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="logo-url"
                    value={settings.logoUrl}
                    onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
                    placeholder="https://example.com/logo.png"
                    className="flex-1"
                  />
                  <Button variant="outline" onClick={() => document.getElementById("logo-upload")?.click()}>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload
                  </Button>
                </div>
                {settings.logoUrl && (
                  <div className="mt-2 p-4 border rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground mb-2">Logo Preview:</p>
                    <img src={settings.logoUrl} alt="Logo" className="h-16 object-contain" />
                  </div>
                )}
                <input
                  type="file"
                  id="logo-upload"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileSelect(file);
                    }
                  }}
                />
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-semibold">Color Palette</h4>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="primary-color">Primary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="primary-color"
                        type="color"
                        value={settings.primaryColor}
                        onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                        className="w-20"
                      />
                      <Input
                        value={settings.primaryColor}
                        onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                        placeholder="#010D13"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="secondary-color">Secondary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="secondary-color"
                        type="color"
                        value={settings.secondaryColor}
                        onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
                        className="w-20"
                      />
                      <Input
                        value={settings.secondaryColor}
                        onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
                        placeholder="#39AEDF"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="accent-color">Accent Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="accent-color"
                        type="color"
                        value={settings.accentColor}
                        onChange={(e) => setSettings({ ...settings, accentColor: e.target.value })}
                        className="w-20"
                      />
                      <Input
                        value={settings.accentColor}
                        onChange={(e) => setSettings({ ...settings, accentColor: e.target.value })}
                        placeholder="#5DB32A"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 items-center p-4 bg-muted/30 rounded-lg">
                  <div className="w-12 h-12 rounded" style={{ backgroundColor: settings.primaryColor }}></div>
                  <div className="w-12 h-12 rounded" style={{ backgroundColor: settings.secondaryColor }}></div>
                  <div className="w-12 h-12 rounded" style={{ backgroundColor: settings.accentColor }}></div>
                  <p className="text-sm text-muted-foreground ml-4">Color palette preview</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Asset Numbering Tab */}
        <TabsContent value="numbering" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Asset Reference Number System</CardTitle>
              <CardDescription>
                Configure how asset reference numbers are generated and formatted
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="asset-prefix">Reference Prefix</Label>
                  <Input
                    id="asset-prefix"
                    value={settings.assetRefPrefix}
                    onChange={(e) => setSettings({ ...settings, assetRefPrefix: e.target.value.toUpperCase() })}
                    placeholder="TAMS"
                    maxLength={10}
                  />
                  <p className="text-xs text-muted-foreground">
                    Prefix for all asset reference numbers (e.g., TAMS, ROAD, ASSET)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ref-format">Reference Format</Label>
                  <Select
                    value={settings.assetRefFormat}
                    onValueChange={(v) => setSettings({ ...settings, assetRefFormat: v })}
                  >
                    <SelectTrigger id="ref-format">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PREFIX-YEAR-SEQUENCE">PREFIX-YEAR-SEQUENCE</SelectItem>
                      <SelectItem value="PREFIX-SEQUENCE">PREFIX-SEQUENCE</SelectItem>
                      <SelectItem value="YEAR-PREFIX-SEQUENCE">YEAR-PREFIX-SEQUENCE</SelectItem>
                      <SelectItem value="SEQUENCE-ONLY">SEQUENCE-ONLY</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    How the reference number is structured
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ref-separator">Separator Character</Label>
                  <Select
                    value={settings.assetRefSeparator === "" ? "none" : settings.assetRefSeparator}
                    onValueChange={(v) => setSettings({ ...settings, assetRefSeparator: v === "none" ? "" : v })}
                  >
                    <SelectTrigger id="ref-separator">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="-">Hyphen (-)</SelectItem>
                      <SelectItem value="_">Underscore (_)</SelectItem>
                      <SelectItem value="/">Slash (/)</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sequence-length">Sequence Number Length</Label>
                  <Select
                    value={settings.assetRefSequenceLength.toString()}
                    onValueChange={(v) => setSettings({ ...settings, assetRefSequenceLength: parseInt(v) })}
                  >
                    <SelectTrigger id="sequence-length">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 digits (001)</SelectItem>
                      <SelectItem value="4">4 digits (0001)</SelectItem>
                      <SelectItem value="5">5 digits (00001)</SelectItem>
                      <SelectItem value="6">6 digits (000001)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <Label>Include Asset Type Code</Label>
                  <p className="text-sm text-muted-foreground">
                    Add asset type abbreviation to reference (e.g., SG for Signage)
                  </p>
                </div>
                <Switch
                  checked={settings.assetRefIncludeType}
                  onCheckedChange={(checked) => setSettings({ ...settings, assetRefIncludeType: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <Label>Auto-Generate Reference Numbers</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically assign sequential reference numbers to new assets
                  </p>
                </div>
                <Switch
                  checked={settings.assetRefAutoGenerate}
                  onCheckedChange={(checked) => setSettings({ ...settings, assetRefAutoGenerate: checked })}
                />
              </div>

              {/* Reference Number Preview */}
              <div className="p-6 bg-muted/50 rounded-lg space-y-3">
                <h4 className="font-semibold">Reference Number Preview</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Format:</span>
                    <Badge variant="outline" className="font-mono text-base px-4 py-1">
                      {getPreviewReferenceNumber()}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Example: The 123rd asset created in 2026
                    {settings.assetRefIncludeType && " (Signage type)"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Regional Settings Tab */}
        <TabsContent value="regional" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Regional & Localization Settings</CardTitle>
              <CardDescription>
                Configure region-specific formats and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="default-region">Default Region/Depot</Label>
                  <Input
                    id="default-region"
                    value={settings.defaultRegion}
                    onChange={(e) => setSettings({ ...settings, defaultRegion: e.target.value })}
                    placeholder="National"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="default-currency">Default Currency</Label>
                  <Select
                    value={settings.defaultCurrency}
                    onValueChange={(v) => setSettings({ ...settings, defaultCurrency: v })}
                  >
                    <SelectTrigger id="default-currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ZAR">South African Rand (ZAR)</SelectItem>
                      <SelectItem value="USD">US Dollar (USD)</SelectItem>
                      <SelectItem value="EUR">Euro (EUR)</SelectItem>
                      <SelectItem value="GBP">British Pound (GBP)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency-symbol">Currency Symbol</Label>
                  <Input
                    id="currency-symbol"
                    value={settings.currencySymbol}
                    onChange={(e) => setSettings({ ...settings, currencySymbol: e.target.value })}
                    placeholder="R"
                    maxLength={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date-format">Date Format</Label>
                  <Select
                    value={settings.dateFormat}
                    onValueChange={(v) => setSettings({ ...settings, dateFormat: v })}
                  >
                    <SelectTrigger id="date-format">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="distance-unit">Distance Unit</Label>
                  <Select
                    value={settings.distanceUnit}
                    onValueChange={(v) => setSettings({ ...settings, distanceUnit: v })}
                  >
                    <SelectTrigger id="distance-unit">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kilometers">Kilometers (km)</SelectItem>
                      <SelectItem value="miles">Miles (mi)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Preferences Tab */}
        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>System Preferences</CardTitle>
              <CardDescription>
                Configure system-wide behavior and requirements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <Label>Require GPS Coordinates for Assets</Label>
                  <p className="text-sm text-muted-foreground">
                    Make latitude/longitude mandatory when creating assets
                  </p>
                </div>
                <Switch
                  checked={settings.requireGPSForAssets}
                  onCheckedChange={(checked) => setSettings({ ...settings, requireGPSForAssets: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <Label>Require Photo for Inspections</Label>
                  <p className="text-sm text-muted-foreground">
                    Make at least one photo mandatory for all inspections
                  </p>
                </div>
                <Switch
                  checked={settings.requirePhotoForInspection}
                  onCheckedChange={(checked) => setSettings({ ...settings, requirePhotoForInspection: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <Label>Auto-Calculate Condition Index (CI)</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically calculate CI from D/E/R scores during inspections
                  </p>
                </div>
                <Switch
                  checked={settings.autoCalculateCI}
                  onCheckedChange={(checked) => setSettings({ ...settings, autoCalculateCI: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <Label>Enable Offline Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow field users to work offline with local data caching
                  </p>
                </div>
                <Switch
                  checked={settings.enableOfflineMode}
                  onCheckedChange={(checked) => setSettings({ ...settings, enableOfflineMode: checked })}
                />
              </div>

              <div className="space-y-2 p-4 border rounded-lg">
                <Label htmlFor="retention-years">Data Retention Period (Years)</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="retention-years"
                    type="number"
                    min="1"
                    max="50"
                    value={settings.dataRetentionYears}
                    onChange={(e) => setSettings({ ...settings, dataRetentionYears: parseInt(e.target.value) || 10 })}
                    className="w-24"
                  />
                  <p className="text-sm text-muted-foreground">
                    How long to retain historical inspection and maintenance data
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button (Bottom) */}
      <div className="flex justify-end pt-4 border-t">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving Changes...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save All Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );

  function getPreviewReferenceNumber(): string {
    const sep = settings.assetRefSeparator;
    const prefix = settings.assetRefPrefix;
    const year = new Date().getFullYear().toString().slice(-2);
    const sequence = "123".padStart(settings.assetRefSequenceLength, "0");
    const typeCode = settings.assetRefIncludeType ? `${sep}SG` : "";

    switch (settings.assetRefFormat) {
      case "PREFIX-YEAR-SEQUENCE":
        return `${prefix}${sep}${year}${sep}${sequence}${typeCode}`;
      case "PREFIX-SEQUENCE":
        return `${prefix}${sep}${sequence}${typeCode}`;
      case "YEAR-PREFIX-SEQUENCE":
        return `${year}${sep}${prefix}${sep}${sequence}${typeCode}`;
      case "SEQUENCE-ONLY":
        return `${sequence}${typeCode}`;
      default:
        return `${prefix}${sep}${year}${sep}${sequence}${typeCode}`;
    }
  }
}