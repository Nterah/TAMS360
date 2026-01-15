import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../../App";
import { projectId, publicAnonKey } from "../../../../utils/supabase/info";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";
import { toast } from "sonner";
import { UserPlus, Mail, Copy, CheckCircle, Clock, XCircle, AlertCircle, Trash2, Eye } from "lucide-react";
import { Alert, AlertDescription } from "../ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

// User Invitations with full action buttons restored
interface Invitation {
  code: string;
  email?: string;
  role: string;
  status: "pending" | "accepted" | "expired";
  createdAt: string;
  expiresAt: string;
  invitedBy: string;
  acceptedAt?: string;
  acceptedBy?: string;
}

export default function UserInvitationsPage() {
  const { user, accessToken } = useContext(AuthContext);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  
  // Form state
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("field_user");
  const [expiryDays, setExpiryDays] = useState("7");
  const [generatedInvite, setGeneratedInvite] = useState<string | null>(null);
  
  // View dialog state
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedInvitation, setSelectedInvitation] = useState<Invitation | null>(null);

  const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-c894a9ff`;

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/admin/invitations`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setInvitations(data.invitations || []);
      }
    } catch (error) {
      console.error("Error fetching invitations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setGeneratedInvite(null);

    try {
      const response = await fetch(`${API_URL}/admin/invitations/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          email: email || undefined,
          role,
          expiryDays: parseInt(expiryDays),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create invitation");
      }

      const data = await response.json();
      setGeneratedInvite(data.inviteCode);
      toast.success("Invitation created successfully!");
      
      // Reset form
      setEmail("");
      setRole("field_user");
      
      // Refresh invitations list
      fetchInvitations();
    } catch (error: any) {
      toast.error(error.message || "Failed to create invitation");
    } finally {
      setCreating(false);
    }
  };

  const handleCopyInviteLink = (code: string) => {
    const inviteLink = `${window.location.origin}/register?invite=${code}`;
    copyToClipboard(inviteLink, "Invitation link copied to clipboard!");
  };

  const handleCopyInviteCode = (code: string) => {
    copyToClipboard(code, "Invitation code copied to clipboard!");
  };

  const handleDeleteInvitation = async (code: string) => {
    if (!confirm("Are you sure you want to delete this invitation?")) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/admin/invitations/${code}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete invitation");
      }

      toast.success("Invitation deleted successfully");
      fetchInvitations();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete invitation");
    }
  };

  // Fallback copy method with better error handling
  const copyToClipboard = async (text: string, successMessage: string) => {
    // Skip clipboard API entirely in iframe/blocked contexts - use fallback directly
    // Only try clipboard API if explicitly available and not in an iframe
    if (navigator.clipboard && window.isSecureContext && window.parent === window) {
      try {
        await navigator.clipboard.writeText(text);
        toast.success(successMessage);
        return;
      } catch (err) {
        // Silently fall through to fallback method
      }
    }
    
    // Fallback method using execCommand
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      try {
        const successful = document.execCommand('copy');
        if (successful) {
          toast.success(successMessage);
          document.body.removeChild(textArea);
          return;
        }
      } catch (e) {
        // execCommand failed
      }
      
      document.body.removeChild(textArea);
    } catch (e) {
      // Fallback creation failed
    }
    
    // Final fallback: show text in alert for manual copy
    toast.info("Please copy the text manually from the input field");
  };

  const getStatusBadge = (invitation: Invitation) => {
    const now = new Date();
    const expiresAt = new Date(invitation.expiresAt);
    
    if (invitation.status === "accepted") {
      return <Badge className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" /> Accepted</Badge>;
    }
    
    if (now > expiresAt) {
      return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Expired</Badge>;
    }
    
    return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();
    
    if (diff <= 0) return "Expired";
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">User Invitations</h1>
        <p className="text-muted-foreground">
          Invite team members to join your organization
        </p>
      </div>

      {/* Create Invitation Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Create New Invitation
          </CardTitle>
          <CardDescription>
            Generate an invitation link for a new user
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateInvitation} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">
                  Email Address (Optional)
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-input-background"
                />
                <p className="text-xs text-muted-foreground">
                  If specified, only this email can use the invitation
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Viewer - Read-only access</SelectItem>
                    <SelectItem value="field_user">Field User - Capture data</SelectItem>
                    <SelectItem value="supervisor">Supervisor - Review & approve</SelectItem>
                    <SelectItem value="admin">Admin - Full access</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiry">Expiration</Label>
                <Select value={expiryDays} onValueChange={setExpiryDays}>
                  <SelectTrigger id="expiry">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 day</SelectItem>
                    <SelectItem value="3">3 days</SelectItem>
                    <SelectItem value="7">7 days (recommended)</SelectItem>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button type="submit" disabled={creating} className="w-full md:w-auto">
              {creating ? "Generating..." : "Generate Invitation"}
            </Button>
          </form>

          {/* Generated Invitation Display */}
          {generatedInvite && (
            <Alert className="mt-6 border-primary bg-primary/10">
              <Mail className="h-4 w-4 text-primary" />
              <AlertDescription>
                <p className="font-semibold mb-3 text-primary">Invitation Created!</p>
                
                <div className="space-y-3">
                  {/* Invitation Link */}
                  <div>
                    <Label className="text-xs text-muted-foreground">Invitation Link</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        value={`${window.location.origin}/register?invite=${generatedInvite}`}
                        readOnly
                        className="bg-background font-mono text-sm"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopyInviteLink(generatedInvite)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Invitation Code */}
                  <div>
                    <Label className="text-xs text-muted-foreground">Invitation Code</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        value={generatedInvite}
                        readOnly
                        className="bg-background font-mono text-sm"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopyInviteCode(generatedInvite)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Share this link or code with the user. They can use it to register their account.
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Invitations List */}
      <Card>
        <CardHeader>
          <CardTitle>Active Invitations</CardTitle>
          <CardDescription>
            Manage and track invitation status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading invitations...</p>
            </div>
          ) : invitations.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-semibold mb-2">No Invitations Yet</h3>
              <p className="text-sm text-muted-foreground">
                Create your first invitation to invite team members
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((invitation) => (
                    <TableRow key={invitation.code}>
                      <TableCell className="font-medium">
                        {invitation.email || (
                          <span className="text-muted-foreground italic">Any email</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {invitation.role.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(invitation)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(invitation.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-1">
                          {invitation.status === "pending" && (
                            <AlertCircle className="w-3 h-3 text-muted-foreground" />
                          )}
                          {getTimeRemaining(invitation.expiresAt)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedInvitation(invitation);
                              setViewDialogOpen(true);
                            }}
                            title="View invitation details"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {invitation.status === "pending" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleCopyInviteLink(invitation.code)}
                              title="Copy invitation link"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteInvitation(invitation.code)}
                            title="Delete invitation"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Invitation Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Invitation Details</DialogTitle>
            <DialogDescription>
              View full invitation information
            </DialogDescription>
          </DialogHeader>
          
          {selectedInvitation && (
            <div className="space-y-4">
              {/* Status */}
              <div>
                <Label className="text-xs text-muted-foreground">Status</Label>
                <div className="mt-1">{getStatusBadge(selectedInvitation)}</div>
              </div>

              {/* Invitation Link */}
              <div>
                <Label className="text-xs text-muted-foreground">Invitation Link</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={`${window.location.origin}/register?invite=${selectedInvitation.code}`}
                    readOnly
                    className="bg-input-background font-mono text-sm"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopyInviteLink(selectedInvitation.code)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Invitation Code */}
              <div>
                <Label className="text-xs text-muted-foreground">Invitation Code</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={selectedInvitation.code}
                    readOnly
                    className="bg-input-background font-mono text-sm"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopyInviteCode(selectedInvitation.code)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Email */}
              <div>
                <Label className="text-xs text-muted-foreground">Email Restriction</Label>
                <p className="text-sm mt-1">
                  {selectedInvitation.email || (
                    <span className="text-muted-foreground italic">Any email can use this invitation</span>
                  )}
                </p>
              </div>

              {/* Role */}
              <div>
                <Label className="text-xs text-muted-foreground">Role</Label>
                <div className="mt-1">
                  <Badge variant="outline" className="capitalize">
                    {selectedInvitation.role.replace("_", " ")}
                  </Badge>
                </div>
              </div>

              {/* Created */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Created At</Label>
                  <p className="text-sm mt-1">
                    {new Date(selectedInvitation.createdAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Expires At</Label>
                  <p className="text-sm mt-1">
                    {new Date(selectedInvitation.expiresAt).toLocaleString()}
                    <span className="text-muted-foreground ml-2">
                      ({getTimeRemaining(selectedInvitation.expiresAt)})
                    </span>
                  </p>
                </div>
              </div>

              {/* Invited By */}
              <div>
                <Label className="text-xs text-muted-foreground">Invited By</Label>
                <p className="text-sm mt-1">{selectedInvitation.invitedBy}</p>
              </div>

              {/* Accepted Info (if accepted) */}
              {selectedInvitation.status === "accepted" && (
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <Label className="text-xs text-muted-foreground">Accepted At</Label>
                    <p className="text-sm mt-1">
                      {selectedInvitation.acceptedAt
                        ? new Date(selectedInvitation.acceptedAt).toLocaleString()
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Accepted By</Label>
                    <p className="text-sm mt-1">{selectedInvitation.acceptedBy || "N/A"}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}