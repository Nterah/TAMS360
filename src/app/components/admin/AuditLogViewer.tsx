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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import {
  Activity,
  Filter,
  Download,
  Eye,
  Search,
  RefreshCw,
  Calendar,
  User,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { projectId } from '../../../../utils/supabase/info';

interface AuditLog {
  id: string;
  timestamp: string;
  tenantId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  action: string;
  entityType: string;
  entityId: string;
  entityName?: string;
  before?: any;
  after?: any;
  changes?: Record<string, { old: any; new: any }>;
}

interface AuditLogViewerProps {
  entityType?: string;
  entityId?: string;
  title?: string;
  description?: string;
}

export function AuditLogViewer({
  entityType,
  entityId,
  title = 'Audit Log',
  description = 'Complete history of all system changes',
}: AuditLogViewerProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterUser, setFilterUser] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    fetchAuditLogs();
  }, [entityType, entityId]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const accessToken = localStorage.getItem('accessToken');
      
      let url = `https://${projectId}.supabase.co/functions/v1/make-server-c894a9ff/admin/audit?limit=500`;
      
      if (entityType && entityId) {
        url = `https://${projectId}.supabase.co/functions/v1/make-server-c894a9ff/admin/audit/${entityType}/${entityId}`;
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch audit logs');

      const data = await response.json();
      setLogs(data.logs || data.history || []);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    // Filter by action
    if (filterAction !== 'all' && log.action !== filterAction) {
      return false;
    }

    // Filter by user
    if (filterUser && log.userId !== filterUser && !log.userName?.toLowerCase().includes(filterUser.toLowerCase())) {
      return false;
    }

    // Search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        log.action.toLowerCase().includes(search) ||
        log.entityType.toLowerCase().includes(search) ||
        log.entityName?.toLowerCase().includes(search) ||
        log.userName?.toLowerCase().includes(search) ||
        log.userEmail?.toLowerCase().includes(search)
      );
    }

    return true;
  });

  const exportToCSV = () => {
    const headers = ['Timestamp', 'User', 'Action', 'Entity Type', 'Entity', 'Changes'];
    const rows = filteredLogs.map((log) => [
      new Date(log.timestamp).toLocaleString(),
      log.userName || log.userEmail || log.userId,
      log.action,
      log.entityType,
      log.entityName || log.entityId,
      log.changes ? Object.keys(log.changes).join(', ') : 'N/A',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success('Audit log exported successfully');
  };

  const getActionBadgeColor = (action: string) => {
    if (action.includes('created')) return 'bg-green-100 text-green-800';
    if (action.includes('updated')) return 'bg-blue-100 text-blue-800';
    if (action.includes('deleted')) return 'bg-red-100 text-red-800';
    if (action.includes('login')) return 'bg-purple-100 text-purple-800';
    return 'bg-gray-100 text-gray-800';
  };

  const formatActionName = (action: string) => {
    return action
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const viewLogDetails = (log: AuditLog) => {
    setSelectedLog(log);
    setShowDetails(true);
  };

  const uniqueActions = Array.from(new Set(logs.map((log) => log.action)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6 text-[#39AEDF]" />
            {title}
          </h2>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchAuditLogs}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={exportToCSV} disabled={filteredLogs.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Filter className="w-4 h-4" />
          Filters
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Action Type</label>
            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger>
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {uniqueActions.map((action) => (
                  <SelectItem key={action} value={action}>
                    {formatActionName(action)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">User Filter</label>
            <Input
              placeholder="Filter by user..."
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            {filteredLogs.length} of {logs.length} entries
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-[#39AEDF] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading audit logs...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-12">
            <Activity className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-semibold mb-2">No Audit Logs Found</h3>
            <p className="text-sm text-muted-foreground">
              {logs.length === 0
                ? 'No activity has been logged yet'
                : 'No logs match your current filters'}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Timestamp
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    User
                  </div>
                </TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Changes</TableHead>
                <TableHead className="text-right">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(log.timestamp).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium text-sm">{log.userName || 'Unknown'}</div>
                      <div className="text-xs text-muted-foreground">{log.userEmail}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getActionBadgeColor(log.action)}>
                      {formatActionName(log.action)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium text-sm capitalize">{log.entityType}</div>
                      <div className="text-xs text-muted-foreground">
                        {log.entityName || log.entityId}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {log.changes ? (
                      <div className="space-y-1">
                        {Object.keys(log.changes)
                          .slice(0, 2)
                          .map((key) => (
                            <div key={key} className="text-xs">
                              <span className="font-medium">{key}</span>: {String(log.changes![key].old)} →{' '}
                              {String(log.changes![key].new)}
                            </div>
                          ))}
                        {Object.keys(log.changes).length > 2 && (
                          <div className="text-xs text-muted-foreground">
                            +{Object.keys(log.changes).length - 2} more
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => viewLogDetails(log)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Details Modal */}
      {showDetails && selectedLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowDetails(false)}>
          <div
            className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[80vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">Audit Log Details</h3>
                <Button variant="ghost" onClick={() => setShowDetails(false)}>
                  ×
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Timestamp</div>
                  <div className="text-sm">{new Date(selectedLog.timestamp).toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">User</div>
                  <div className="text-sm">
                    {selectedLog.userName} ({selectedLog.userEmail})
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Action</div>
                  <Badge className={getActionBadgeColor(selectedLog.action)}>
                    {formatActionName(selectedLog.action)}
                  </Badge>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Entity</div>
                  <div className="text-sm capitalize">
                    {selectedLog.entityType}: {selectedLog.entityName || selectedLog.entityId}
                  </div>
                </div>
              </div>

              {selectedLog.changes && Object.keys(selectedLog.changes).length > 0 && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">Changes</div>
                  <div className="bg-gray-50 rounded p-4 space-y-2">
                    {Object.entries(selectedLog.changes).map(([key, value]) => (
                      <div key={key} className="text-sm">
                        <span className="font-medium capitalize">{key.replace(/_/g, ' ')}:</span>
                        <div className="ml-4 mt-1">
                          <div className="text-red-600">- {JSON.stringify(value.old)}</div>
                          <div className="text-green-600">+ {JSON.stringify(value.new)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedLog.before && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">Before</div>
                  <pre className="bg-gray-50 rounded p-4 text-xs overflow-auto">
                    {JSON.stringify(selectedLog.before, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.after && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">After</div>
                  <pre className="bg-gray-50 rounded p-4 text-xs overflow-auto">
                    {JSON.stringify(selectedLog.after, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
