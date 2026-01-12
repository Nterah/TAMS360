import { UserPlus, Users, Shield, Activity, CheckCircle, XCircle, Clock, Stethoscope, Settings2, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../../App";
import { projectId, publicAnonKey } from "../../../../utils/supabase/info";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Badge } from "../ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";

export default function AdminConsolePage() {
  const { accessToken } = useContext(AuthContext);
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-c894a9ff`;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pendingRes, usersRes, auditRes, invitationsRes] = await Promise.all([
        fetch(`${API_URL}/admin/registrations/pending`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        fetch(`${API_URL}/admin/users`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        fetch(`${API_URL}/admin/audit`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        fetch(`${API_URL}/admin/invitations`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      ]);

      if (pendingRes.ok) {
        const data = await pendingRes.json();
        setPendingUsers(data.registrations || []);
      }

      if (usersRes.ok) {
        const data = await usersRes.json();
        setAllUsers(data.users || []);
      }

      if (auditRes.ok) {
        const data = await auditRes.json();
        setAuditLogs(data.logs || []);
      }

      if (invitationsRes.ok) {
        const data = await invitationsRes.json();
        // Filter for pending invitations only
        const pending = (data.invitations || []).filter(
          (inv: any) => inv.status === "pending" && new Date(inv.expiresAt) > new Date()
        );
        setPendingInvitations(pending);
      }
    } catch (error) {
      console.error("Error fetching admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveUser = async (userId: string, role: string, tier: string) => {
    try {
      const response = await fetch(`${API_URL}/admin/users/${userId}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ role, tier }),
      });

      if (response.ok) {
        toast.success("User approved successfully!");
        fetchData();
      } else {
        toast.error("Failed to approve user");
      }
    } catch (error) {
      toast.error("Error approving user");
    }
  };

  const handleDenyUser = async (userId: string) => {
    try {
      const response = await fetch(`${API_URL}/admin/users/${userId}/deny`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        toast.success("User registration denied");
        fetchData();
      } else {
        toast.error("Failed to deny user");
      }
    } catch (error) {
      toast.error("Error denying user");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Admin Console</h1>
          <p className="text-muted-foreground">Manage users, permissions, and system settings</p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/user-invitations">
            <Button variant="outline">
              <UserPlus className="mr-2 size-4" />
              Invite Users
            </Button>
          </Link>
          <Link to="/admin/bulk-asset-assignment">
            <Button variant="outline">
              <ArrowRightLeft className="mr-2 size-4" />
              Bulk Asset Assignment
            </Button>
          </Link>
          <Link to="/admin/tenant-settings">
            <Button variant="outline">
              <Settings2 className="mr-2 size-4" />
              Tenant Settings
            </Button>
          </Link>
          <Link to="/admin/component-templates">
            <Button variant="outline">
              <Settings2 className="mr-2 size-4" />
              Inspection Templates
            </Button>
          </Link>
          <Link to="/admin/system-health">
            <Button variant="outline">
              <Stethoscope className="mr-2 size-4" />
              System Health
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Pending Invitations</CardTitle>
            <UserPlus className="w-4 h-4 text-[#F8D227]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingInvitations.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active invite codes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Pending Approvals</CardTitle>
            <Clock className="w-4 h-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingUsers.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Awaiting review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Total Users</CardTitle>
            <Users className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allUsers.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Active Users</CardTitle>
            <CheckCircle className="w-4 h-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {allUsers.filter(u => u.status === "approved").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Admins</CardTitle>
            <Shield className="w-4 h-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {allUsers.filter(u => u.role === "admin").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            Pending Approvals
            {pendingUsers.length > 0 && (
              <Badge className="ml-2 bg-warning">{pendingUsers.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="users">All Users</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        {/* Pending Approvals */}
        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Registration Approvals</CardTitle>
              <CardDescription>Review and approve new user registrations</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading...</p>
                </div>
              ) : pendingUsers.length === 0 ? (
                <div className="text-center py-12">
                  <UserPlus className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-semibold mb-2">No Pending Approvals</h3>
                  <p className="text-sm text-muted-foreground">All user registrations have been processed</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingUsers.map((user) => (
                    <div key={user.userId} className="p-4 border rounded-lg space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-lg">{user.name}</h4>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                          {user.organization && (
                            <p className="text-sm text-muted-foreground mt-1">{user.organization}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            Submitted: {new Date(user.submittedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant="outline">Pending</Badge>
                      </div>

                      <div className="flex gap-4 items-end">
                        <div className="flex-1">
                          <label className="text-sm font-medium mb-2 block">Assign Role</label>
                          <Select defaultValue="field_user">
                            <SelectTrigger id={`role-${user.userId}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="viewer">Viewer</SelectItem>
                              <SelectItem value="field_user">Field User</SelectItem>
                              <SelectItem value="supervisor">Supervisor</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            onClick={() => {
                              const roleSelect = document.getElementById(`role-${user.userId}`) as any;
                              const role = roleSelect?.getAttribute("data-state") || "field_user";
                              handleApproveUser(user.userId, role, "standard");
                            }}
                            size="sm"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            onClick={() => handleDenyUser(user.userId)}
                            variant="destructive"
                            size="sm"
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Deny
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Users */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage user roles and permissions</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {user.role?.replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.status === "approved" ? "default" : "secondary"}>
                              {user.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Log */}
        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle>Audit Log</CardTitle>
              <CardDescription>System activity and user actions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {auditLogs.length === 0 ? (
                  <div className="text-center py-12">
                    <Activity className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="font-semibold mb-2">No Audit Logs</h3>
                    <p className="text-sm text-muted-foreground">Activity will appear here</p>
                  </div>
                ) : (
                  auditLogs.slice(0, 20).map((log, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 border rounded-lg text-sm">
                      <Activity className="w-4 h-4 text-primary mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium capitalize">{log.action?.replace("_", " ")}</p>
                        <p className="text-muted-foreground text-xs mt-1">
                          {new Date(log.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}