import React, { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Badge } from '@/app/components/ui/badge';
import {
  UserPlus,
  Mail,
  Pencil,
  Trash2,
  Power,
  PowerOff,
  Send,
  Copy,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../../../../utils/supabase/info';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

interface Invitation {
  code: string;
  email: string | null;
  role: string;
  status: 'pending' | 'accepted' | 'expired';
  tenantId: string;
  invitedBy: string;
  createdAt: string;
  expiresAt: string;
  acceptedAt?: string;
}

export function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showInviteUrlDialog, setShowInviteUrlDialog] = useState(false);
  const [generatedInviteUrl, setGeneratedInviteUrl] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'invitations'>('users');

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('field_user');
  const [inviteExpiry, setInviteExpiry] = useState('7');

  // Edit form state
  const [editRole, setEditRole] = useState('');
  const [editStatus, setEditStatus] = useState('');

  useEffect(() => {
    fetchUsers();
    fetchInvitations();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const accessToken = localStorage.getItem('tams360_token');
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c894a9ff/admin/users-v2`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        console.error('Failed to fetch users:', data);
        throw new Error(data.error || 'Failed to fetch users');
      }

      setUsers(data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const fetchInvitations = async () => {
    try {
      const accessToken = localStorage.getItem('tams360_token');
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c894a9ff/admin/invitations`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        console.error('Failed to fetch invitations:', data);
        throw new Error(data.error || 'Failed to fetch invitations');
      }

      setInvitations(data.invitations || []);
    } catch (error) {
      console.error('Error fetching invitations:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load invitations');
    }
  };

  const handleCreateInvite = async () => {
    try {
      const accessToken = localStorage.getItem('tams360_token');
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c894a9ff/admin/invitations/create`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            email: inviteEmail || null,
            role: inviteRole,
            expiryDays: parseInt(inviteExpiry),
          }),
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        console.error('Invitation creation failed:', data);
        throw new Error(data.error || 'Failed to create invitation');
      }

      const inviteUrl = `${window.location.origin}/signup?invite=${data.inviteCode}`;

      // Show URL in dialog instead of copying (clipboard API is blocked)
      setGeneratedInviteUrl(inviteUrl);
      setShowInviteDialog(false);
      setShowInviteUrlDialog(true);
      
      setInviteEmail('');
      setInviteRole('field_user');
      setInviteExpiry('7');
      fetchInvitations();
      
      toast.success('Invitation created successfully!');
    } catch (error) {
      console.error('Error creating invitation:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create invitation');
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    try {
      const accessToken = localStorage.getItem('tams360_token');
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c894a9ff/admin/users-v2/${selectedUser.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            role: editRole,
            status: editStatus,
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to update user');

      toast.success('User updated successfully');
      setShowEditDialog(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user');
    }
  };

  const handleToggleUserStatus = async (userId: string) => {
    try {
      const accessToken = localStorage.getItem('tams360_token');
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c894a9ff/admin/users-v2/${userId}/toggle-status`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to toggle user status');

      toast.success('User status updated');
      fetchUsers();
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast.error('Failed to update user status');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.'))
      return;

    try {
      const accessToken = localStorage.getItem('tams360_token');
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c894a9ff/admin/users-v2/${userId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to delete user');

      toast.success('User deleted successfully');
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    }
  };

  const handleResendInvite = async (code: string) => {
    try {
      const accessToken = localStorage.getItem('tams360_token');
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c894a9ff/admin/invitations/${code}/resend`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to resend invitation');

      toast.success('Invitation resent successfully');
    } catch (error) {
      console.error('Error resending invitation:', error);
      toast.error('Failed to resend invitation');
    }
  };

  const handleCopyInviteUrl = async (code: string) => {
    const inviteUrl = `${window.location.origin}/signup?invite=${code}`;
    
    // Skip clipboard API entirely in iframe/blocked contexts - use fallback directly
    let clipboardSuccess = false;
    
    // Only try clipboard API if explicitly available and not in an iframe
    if (navigator.clipboard && window.isSecureContext && window.parent === window) {
      try {
        await navigator.clipboard.writeText(inviteUrl);
        toast.success('Invitation URL copied to clipboard');
        return;
      } catch (err) {
        // Silently fall through to fallback method
        clipboardSuccess = false;
      }
    }
    
    // Fallback method using execCommand
    try {
      const textArea = document.createElement("textarea");
      textArea.value = inviteUrl;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        toast.success('Invitation URL copied to clipboard');
      } else {
        // Show the URL in a prompt for manual copying
        toast.info('Copy this URL manually: ' + inviteUrl);
        prompt('Copy invitation URL:', inviteUrl);
      }
    } catch (e) {
      // Final fallback: show in prompt
      prompt('Copy invitation URL:', inviteUrl);
      toast.info('Please copy the invitation URL manually');
    }
  };

  const handleDeleteInvite = async (code: string) => {
    if (!confirm('Are you sure you want to delete this invitation?')) return;

    try {
      const accessToken = localStorage.getItem('tams360_token');
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c894a9ff/admin/invitations/${code}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to delete invitation');

      toast.success('Invitation deleted');
      fetchInvitations();
    } catch (error) {
      console.error('Error deleting invitation:', error);
      toast.error('Failed to delete invitation');
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'supervisor':
        return 'bg-blue-100 text-blue-800';
      case 'field_user':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'inactive':
        return <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'deleted':
        return <Badge className="bg-red-100 text-red-800">Deleted</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getInviteStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'accepted':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'expired':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">
            Manage users and invitations for your organization
          </p>
        </div>
        <Button onClick={() => setShowInviteDialog(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Invite User
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'users'
              ? 'border-b-2 border-[#39AEDF] text-[#39AEDF]'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Users ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('invitations')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'invitations'
              ? 'border-b-2 border-[#39AEDF] text-[#39AEDF]'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Invitations ({invitations.filter((i) => i.status === 'pending').length})
        </button>
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Loading users...
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge className={getRoleBadgeColor(user.role)}>
                        {user.role.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(user.status)}</TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            setEditRole(user.role);
                            setEditStatus(user.status);
                            setShowEditDialog(true);
                          }}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleUserStatus(user.id)}
                        >
                          {user.status === 'active' ? (
                            <PowerOff className="w-4 h-4 text-gray-600" />
                          ) : (
                            <Power className="w-4 h-4 text-green-600" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Invitations Tab */}
      {activeTab === 'invitations' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No invitations found
                  </TableCell>
                </TableRow>
              ) : (
                invitations.map((invite) => (
                  <TableRow key={invite.code}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getInviteStatusIcon(invite.status)}
                        <span className="capitalize">{invite.status}</span>
                      </div>
                    </TableCell>
                    <TableCell>{invite.email || 'Any email'}</TableCell>
                    <TableCell>
                      <Badge className={getRoleBadgeColor(invite.role)}>
                        {invite.role.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(invite.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {new Date(invite.expiresAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {invite.status === 'pending' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopyInviteUrl(invite.code)}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleResendInvite(invite.code)}
                            >
                              <Send className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteInvite(invite.code)}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Invite User Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite New User</DialogTitle>
            <DialogDescription>
              Create an invitation link to add a new user to your organization
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email (optional)</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Leave blank to create a generic invite link
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="field_user">Field User</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiry">Expires In (days)</Label>
              <Input
                id="expiry"
                type="number"
                min="1"
                max="30"
                value={inviteExpiry}
                onChange={(e) => setInviteExpiry(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateInvite}>Create Invitation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user role and status for {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-role">Role</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="field_user">Field User</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateUser}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite URL Dialog */}
      <Dialog open={showInviteUrlDialog} onOpenChange={setShowInviteUrlDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invitation Link</DialogTitle>
            <DialogDescription>
              Share this link with the new user to invite them to your organization
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="invite-url">Invite URL</Label>
              <Input
                id="invite-url"
                type="text"
                value={generatedInviteUrl}
                readOnly
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowInviteUrlDialog(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}