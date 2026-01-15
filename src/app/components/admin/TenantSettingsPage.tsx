import { useContext, useState, useEffect } from "react";
import { AuthContext } from "../../App";
import { useTenant } from "../../contexts/TenantContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Switch } from "../ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Badge } from "../ui/badge";
import { Save, Palette, Hash, Globe, Building2, AlertCircle, Loader2, Zap, Mail } from "lucide-react";
import { toast } from "sonner";
import { projectId, publicAnonKey } from "../../../../utils/supabase/info";
import EmailNotificationsTab from "./EmailNotificationsTab";

export default function TenantSettingsPage() {
  const { accessToken } = useContext(AuthContext);
  const { settings: tenantSettings, refreshSettings, tenantName } = useTenant();
  const [settings, setSettings] = useState({
    organizationName: "",
    organizationTagline: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    logoUrl: "",
    licenseExpiryDate: "",
    primaryColor: "#010D13",
    secondaryColor: "#39AEDF",
    accentColor: "#5DB32A",
    assetNumberPrefix: "AST",
    assetNumberDigits: 6,
    inspectionNumberPrefix: "INS",
    maintenanceNumberPrefix: "MNT",
    dateFormat: "YYYY-MM-DD",
    currency: "ZAR",
    measurementUnits: "metric",
    timeZone: "Africa/Johannesburg",
    fiscalYearStart: "April",
    autoBackup: true,
    notificationsEnabled: true,
    // Automation Rules
    enableAutoMaintenance: true,
    ciThreshold: 50,
    urgencyThreshold: "Medium",
    autoAssignFieldUser: false,
    autoNotifyOnCritical: true,
    // Email Notifications
    notificationEmails: [] as string[],
    enableDailyDigest: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-c894a9ff`;

  useEffect(() => {
    // Load settings from TenantContext (same source as TenantBanner)
    if (tenantSettings) {
      setSettings({
        organizationName: tenantSettings.organization_name || "",
        organizationTagline: tenantSettings.organization_tagline || "",
        address: tenantSettings.address || "",
        phone: tenantSettings.phone || "",
        email: tenantSettings.email || "",
        website: tenantSettings.website || "",
        logoUrl: tenantSettings.logo_url || "",
        licenseExpiryDate: tenantSettings.license_expiry_date || "",
        primaryColor: tenantSettings.primary_color || "#010D13",
        secondaryColor: tenantSettings.secondary_color || "#39AEDF",
        accentColor: tenantSettings.accent_color || "#5DB32A",
        assetNumberPrefix: tenantSettings.asset_number_prefix || "AST",
        assetNumberDigits: tenantSettings.asset_number_digits || 6,
        inspectionNumberPrefix: tenantSettings.inspection_number_prefix || "INS",
        maintenanceNumberPrefix: tenantSettings.maintenance_number_prefix || "MNT",
        dateFormat: tenantSettings.date_format || "YYYY-MM-DD",
        currency: tenantSettings.currency || "ZAR",
        measurementUnits: tenantSettings.measurement_units || "metric",
        timeZone: tenantSettings.time_zone || "Africa/Johannesburg",
        fiscalYearStart: tenantSettings.fiscal_year_start || "April",
        autoBackup: tenantSettings.auto_backup ?? true,
        notificationsEnabled: tenantSettings.notifications_enabled ?? true,
        // Automation Rules
        enableAutoMaintenance: tenantSettings.enable_auto_maintenance ?? true,
        ciThreshold: tenantSettings.ci_threshold ?? 50,
        urgencyThreshold: tenantSettings.urgency_threshold ?? "Medium",
        autoAssignFieldUser: tenantSettings.auto_assign_field_user ?? false,
        autoNotifyOnCritical: tenantSettings.auto_notify_on_critical ?? true,
        // Email Notifications
        notificationEmails: tenantSettings.notification_emails ?? [],
        enableDailyDigest: tenantSettings.enable_daily_digest ?? false,
      });
      setLoading(false);
    }
  }, [tenantSettings]);

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
        refreshSettings(); // Refresh settings in TenantContext
      } else {
        toast.error("Failed to save settings");
      }
    } catch (error) {
      toast.error("Error saving settings");
    } finally {
      setSaving(false);
    }
  };

  const handleFileSelect = async (file: File) => {
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
          // Refresh TenantContext to update banner
          refreshSettings();
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
          <TabsTrigger value="automation">
            <Zap className="w-4 h-4 mr-2" />
            Workflow Automation
          </TabsTrigger>
          <TabsTrigger value="email-notifications">
            <Mail className="w-4 h-4 mr-2" />
            Email Notifications
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
              {/* Logo Upload Section */}
              <div className="space-y-4 pb-4 border-b">
                <h4 className="font-semibold">Organization Logo</h4>
                <div className="flex items-start gap-4">
                  {settings.logoUrl && (
                    <div className="relative">
                      <img
                        src={settings.logoUrl}
                        alt="Organization Logo"
                        className="h-24 w-auto object-contain border rounded-lg p-2"
                      />
                    </div>
                  )}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            handleFileSelect(e.target.files[0]);
                          }
                        }}
                        disabled={uploading}
                        className="flex-1"
                      />
                      {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Upload your organization logo. Recommended: PNG or SVG, max 2MB, transparent background preferred.
                    </p>
                  </div>
                </div>
              </div>

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

              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-semibold">Contact Details</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address">Physical Address</Label>
                    <Textarea
                      id="address"
                      value={settings.address}
                      onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                      placeholder="Street address, city, postal code"
                      rows={3}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={settings.phone}
                      onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                      placeholder="+27 12 345 6789"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={settings.email}
                      onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                      placeholder="contact@organization.co.za"
                    />
                  </div>
                  
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      value={settings.website}
                      onChange={(e) => setSettings({ ...settings, website: e.target.value })}
                      placeholder="https://www.organization.co.za"
                    />
                  </div>
                </div>
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
                    value={settings.assetNumberPrefix}
                    onChange={(e) => setSettings({ ...settings, assetNumberPrefix: e.target.value.toUpperCase() })}
                    placeholder="TAMS"
                    maxLength={10}
                  />
                  <p className="text-xs text-muted-foreground">
                    Prefix for all asset reference numbers (e.g., TAMS, ROAD, ASSET)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sequence-length">Sequence Number Length</Label>
                  <Select
                    value={settings.assetNumberDigits.toString()}
                    onValueChange={(v) => setSettings({ ...settings, assetNumberDigits: parseInt(v) })}
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
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={settings.currency}
                    onValueChange={(v) => setSettings({ ...settings, currency: v })}
                  >
                    <SelectTrigger id="currency">
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
                  <Label htmlFor="measurement-units">Measurement Units</Label>
                  <Select
                    value={settings.measurementUnits}
                    onValueChange={(v) => setSettings({ ...settings, measurementUnits: v })}
                  >
                    <SelectTrigger id="measurement-units">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="metric">Metric (km, kg)</SelectItem>
                      <SelectItem value="imperial">Imperial (mi, lb)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time-zone">Time Zone</Label>
                  <Select
                    value={settings.timeZone}
                    onValueChange={(v) => setSettings({ ...settings, timeZone: v })}
                  >
                    <SelectTrigger id="time-zone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Africa/Johannesburg">Africa/Johannesburg</SelectItem>
                      <SelectItem value="America/New_York">America/New_York</SelectItem>
                      <SelectItem value="Europe/London">Europe/London</SelectItem>
                      <SelectItem value="Asia/Tokyo">Asia/Tokyo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fiscal-year-start">Fiscal Year Start</Label>
                  <Select
                    value={settings.fiscalYearStart}
                    onValueChange={(v) => setSettings({ ...settings, fiscalYearStart: v })}
                  >
                    <SelectTrigger id="fiscal-year-start">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="January">January</SelectItem>
                      <SelectItem value="April">April</SelectItem>
                      <SelectItem value="July">July</SelectItem>
                      <SelectItem value="October">October</SelectItem>
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
                  <Label>Auto-Backup</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically back up data at regular intervals
                  </p>
                </div>
                <Switch
                  checked={settings.autoBackup}
                  onCheckedChange={(checked) => setSettings({ ...settings, autoBackup: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <Label>Enable Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications for important system events
                  </p>
                </div>
                <Switch
                  checked={settings.notificationsEnabled}
                  onCheckedChange={(checked) => setSettings({ ...settings, notificationsEnabled: checked })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Browser Permissions</CardTitle>
              <CardDescription>
                Manage browser notifications, location access, and PWA installation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable browser push notifications for alerts
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      try {
                        const permission = await Notification.requestPermission();
                        if (permission === "granted") {
                          toast.success("Notifications enabled!");
                        } else {
                          toast.error("Notification permission denied");
                        }
                      } catch (error) {
                        toast.error("Failed to request notification permission");
                      }
                    }}
                  >
                    Request Permission
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground">
                  Current status: {typeof Notification !== 'undefined' ? Notification.permission : 'not supported'}
                </div>
              </div>

              <div className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Location Services</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable location access for field inspections
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(
                          () => {
                            toast.success("Location access granted!");
                          },
                          (error) => {
                            toast.error("Location permission denied");
                          }
                        );
                      } else {
                        toast.error("Location not supported by browser");
                      }
                    }}
                  >
                    Request Permission
                  </Button>
                </div>
              </div>

              <div className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Install App (PWA)</Label>
                    <p className="text-sm text-muted-foreground">
                      Install TAMS360 as a standalone app
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      // PWA install prompt
                      const deferredPrompt = (window as any).deferredPrompt;
                      if (deferredPrompt) {
                        deferredPrompt.prompt();
                        deferredPrompt.userChoice.then((choiceResult: any) => {
                          if (choiceResult.outcome === 'accepted') {
                            toast.success("App installed!");
                          }
                          (window as any).deferredPrompt = null;
                        });
                      } else {
                        toast.info("App is already installed or browser doesn't support PWA installation");
                      }
                    }}
                  >
                    Install App
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Workflow Automation Tab */}
        <TabsContent value="automation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Workflow Automation</CardTitle>
              <CardDescription>
                Configure automated workflows and rules
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <Label>Enable Auto-Maintenance</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically schedule maintenance based on asset condition
                  </p>
                </div>
                <Switch
                  checked={settings.enableAutoMaintenance}
                  onCheckedChange={(checked) => setSettings({ ...settings, enableAutoMaintenance: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <Label>Condition Index Threshold</Label>
                  <p className="text-sm text-muted-foreground">
                    Set the condition index threshold for auto-maintenance
                  </p>
                </div>
                <Input
                  type="number"
                  value={settings.ciThreshold}
                  onChange={(e) => setSettings({ ...settings, ciThreshold: parseInt(e.target.value) })}
                  className="w-20"
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <Label>Urgency Threshold</Label>
                  <p className="text-sm text-muted-foreground">
                    Set the urgency threshold for maintenance tasks
                  </p>
                </div>
                <Select
                  value={settings.urgencyThreshold}
                  onValueChange={(v) => setSettings({ ...settings, urgencyThreshold: v })}
                >
                  <SelectTrigger id="urgency-threshold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <Label>Auto-Assign Field User</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically assign maintenance tasks to field users
                  </p>
                </div>
                <Switch
                  checked={settings.autoAssignFieldUser}
                  onCheckedChange={(checked) => setSettings({ ...settings, autoAssignFieldUser: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <Label>Auto-Notify on Critical</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically notify when a critical maintenance task is due
                  </p>
                </div>
                <Switch
                  checked={settings.autoNotifyOnCritical}
                  onCheckedChange={(checked) => setSettings({ ...settings, autoNotifyOnCritical: checked })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Notifications Tab */}
        <TabsContent value="email-notifications" className="space-y-6">
          <EmailNotificationsTab 
            settings={{
              notificationEmails: settings.notificationEmails,
              enableDailyDigest: settings.enableDailyDigest,
              autoNotifyOnCritical: settings.autoNotifyOnCritical,
            }}
            onSettingsChange={(updates) => setSettings({ ...settings, ...updates })}
          />
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

      {/* Tenant Info */}
      {tenantName && (
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Tenant Information</CardTitle>
              <CardDescription>
                Overview of your tenant account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Tenant Name (Login ID)</Label>
                  <Input
                    value={tenantName}
                    readOnly
                    className="bg-muted/50"
                  />
                  <p className="text-xs text-muted-foreground">
                    This is your login identifier and cannot be changed
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="license-expiry">License Expiry Date</Label>
                  <Input
                    id="license-expiry"
                    type="date"
                    value={settings.licenseExpiryDate}
                    onChange={(e) => setSettings({ ...settings, licenseExpiryDate: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    System license expiration date
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );

  function getPreviewReferenceNumber(): string {
    const prefix = settings.assetNumberPrefix;
    const year = new Date().getFullYear().toString().slice(-2);
    const sequence = "123".padStart(settings.assetNumberDigits, "0");

    return `${prefix}${year}${sequence}`;
  }
}