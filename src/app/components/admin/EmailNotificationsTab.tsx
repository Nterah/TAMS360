import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { Badge } from "../ui/badge";
import { Alert, AlertDescription } from "../ui/alert";
import { Mail, Plus, X as XIcon, Send, Info, CheckCircle2 } from "lucide-react";

interface EmailNotificationsTabProps {
  settings: {
    notificationEmails: string[];
    enableDailyDigest: boolean;
    autoNotifyOnCritical: boolean;
  };
  onSettingsChange: (updates: Partial<EmailNotificationsTabProps['settings']>) => void;
  onSendTestEmail?: () => void;
}

export default function EmailNotificationsTab({ settings, onSettingsChange, onSendTestEmail }: EmailNotificationsTabProps) {
  const [newEmail, setNewEmail] = useState("");
  const [emailError, setEmailError] = useState("");

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleAddEmail = () => {
    if (!newEmail) {
      setEmailError("Please enter an email address");
      return;
    }

    if (!validateEmail(newEmail)) {
      setEmailError("Please enter a valid email address");
      return;
    }

    if (settings.notificationEmails.includes(newEmail)) {
      setEmailError("This email is already in the list");
      return;
    }

    onSettingsChange({
      notificationEmails: [...settings.notificationEmails, newEmail],
    });
    setNewEmail("");
    setEmailError("");
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    onSettingsChange({
      notificationEmails: settings.notificationEmails.filter(e => e !== emailToRemove),
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Email Notification Settings</CardTitle>
          <CardDescription>
            Configure email addresses and notification preferences for automated alerts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Notification Recipients */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Notification Recipients</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Add email addresses to receive automated notifications
                </p>
              </div>
              <Badge variant="outline">
                {settings.notificationEmails.length} recipient{settings.notificationEmails.length !== 1 ? 's' : ''}
              </Badge>
            </div>

            {/* Add Email Input */}
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  type="email"
                  placeholder="email@organization.co.za"
                  value={newEmail}
                  onChange={(e) => {
                    setNewEmail(e.target.value);
                    setEmailError("");
                  }}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddEmail();
                    }
                  }}
                  className={emailError ? "border-destructive" : ""}
                />
                {emailError && (
                  <p className="text-xs text-destructive mt-1">{emailError}</p>
                )}
              </div>
              <Button onClick={handleAddEmail} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add
              </Button>
            </div>

            {/* Email List */}
            {settings.notificationEmails.length > 0 ? (
              <div className="space-y-2">
                {settings.notificationEmails.map((email, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
                  >
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{email}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveEmail(email)}
                    >
                      <XIcon className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <Alert>
                <Info className="w-4 h-4" />
                <AlertDescription>
                  No email recipients configured. Add at least one email address to receive notifications.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="border-t pt-4" />

          {/* Notification Types */}
          <div className="space-y-4">
            <h4 className="font-semibold">Notification Types</h4>

            <div className="space-y-4">
              <div className="flex items-start justify-between p-4 border rounded-lg">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <Label>Critical Inspection Alerts</Label>
                    <Badge variant="secondary" className="text-xs">Auto</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Receive instant alerts when inspections identify critical conditions (CI &lt; 50 or High/Critical urgency)
                  </p>
                  <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                    <li>✓ Asset details and location</li>
                    <li>✓ Condition Index (CI) score</li>
                    <li>✓ Urgency classification</li>
                    <li>✓ Inspector information</li>
                  </ul>
                </div>
                <Switch
                  checked={settings.autoNotifyOnCritical}
                  onCheckedChange={(checked) => onSettingsChange({ autoNotifyOnCritical: checked })}
                />
              </div>

              <div className="flex items-start justify-between p-4 border rounded-lg">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <Label>Auto-Maintenance Notifications</Label>
                    <Badge variant="secondary" className="text-xs">Auto</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Get notified when maintenance work orders are automatically created from inspections
                  </p>
                  <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                    <li>✓ Work order details</li>
                    <li>✓ Scheduled date and priority</li>
                    <li>✓ Estimated costs</li>
                    <li>✓ Link to triggering inspection</li>
                  </ul>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">Always On</Badge>
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
              </div>

              <div className="flex items-start justify-between p-4 border rounded-lg">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <Label>Maintenance Due Reminders</Label>
                    <Badge variant="secondary" className="text-xs">Manual</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Receive reminders for maintenance tasks that are overdue or due within 7 days
                  </p>
                  <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                    <li>✓ Overdue tasks highlighted</li>
                    <li>✓ Upcoming tasks (next 7 days)</li>
                    <li>✓ Priority and asset information</li>
                    <li>✓ Trigger manually from Maintenance page</li>
                  </ul>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">Always On</Badge>
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
              </div>

              <div className="flex items-start justify-between p-4 border rounded-lg bg-muted/20">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <Label>Daily Maintenance Digest</Label>
                    <Badge className="text-xs bg-amber-100 text-amber-800 hover:bg-amber-100">Coming Soon</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Daily summary of maintenance statistics: overdue tasks, due today, due this week, and completed tasks
                  </p>
                  <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                    <li>✓ Daily statistics dashboard</li>
                    <li>✓ Sent every morning at 8:00 AM</li>
                    <li>✓ Visual summary cards</li>
                    <li>✓ Action items highlighted</li>
                  </ul>
                </div>
                <Switch
                  checked={settings.enableDailyDigest}
                  onCheckedChange={(checked) => onSettingsChange({ enableDailyDigest: checked })}
                  disabled
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4" />

          {/* Test Email */}
          <div className="space-y-4">
            <h4 className="font-semibold">Test Notifications</h4>
            <div className="flex items-start gap-4 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-blue-900 dark:text-blue-100 font-medium">
                  Email notifications require configuration
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  To enable email notifications, please contact your system administrator to configure the RESEND_API_KEY environment variable in your Supabase project settings.
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                  Once configured, emails will be sent from <strong>notifications@tams360.co.za</strong>
                </p>
              </div>
            </div>

            {onSendTestEmail && settings.notificationEmails.length > 0 && (
              <Button 
                onClick={onSendTestEmail} 
                variant="outline"
                className="w-full"
              >
                <Send className="w-4 h-4 mr-2" />
                Send Test Email to All Recipients
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notification Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Examples</CardTitle>
          <CardDescription>
            Preview of automated email notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1">
                  <h5 className="font-semibold text-sm">🚨 CRITICAL Inspection Alert - TAMS26001</h5>
                  <p className="text-xs text-muted-foreground mt-1">
                    A recent inspection has identified issues requiring attention...
                  </p>
                  <div className="mt-3 p-3 bg-muted/30 rounded text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Asset:</span>
                      <span className="font-medium">TAMS26001 - Traffic Signal</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">CI:</span>
                      <span className="font-medium text-red-600">23.5 (Poor)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Urgency:</span>
                      <Badge className="bg-red-600 text-white text-xs">Critical</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <h5 className="font-semibold text-sm">✅ New Maintenance Work Order - TAMS26001</h5>
                  <p className="text-xs text-muted-foreground mt-1">
                    A new maintenance work order has been scheduled...
                  </p>
                  <div className="mt-3 p-3 bg-muted/30 rounded text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <span className="font-medium">Corrective Maintenance</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Scheduled:</span>
                      <span className="font-medium">Immediately</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Priority:</span>
                      <Badge className="bg-red-600 text-white text-xs">Critical</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1">
                  <h5 className="font-semibold text-sm">📅 Maintenance Due Reminder - 3 Overdue</h5>
                  <p className="text-xs text-muted-foreground mt-1">
                    You have 8 maintenance tasks requiring attention...
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="p-2 bg-red-50 dark:bg-red-900/10 rounded text-center">
                      <div className="text-lg font-bold text-red-600">3</div>
                      <div className="text-xs text-red-700 dark:text-red-400">Overdue</div>
                    </div>
                    <div className="p-2 bg-amber-50 dark:bg-amber-900/10 rounded text-center">
                      <div className="text-lg font-bold text-amber-600">5</div>
                      <div className="text-xs text-amber-700 dark:text-amber-400">Due This Week</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
