/**
 * Audit Logging System for TAMS360
 * 
 * Tracks all critical data changes across the system with:
 * - User who made the change
 * - Timestamp
 * - Action type
 * - Before/After values
 * - Entity type and ID
 */

import * as kv from "./kv_store.tsx";
import { v4 as uuidv4 } from "npm:uuid@9";

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  tenantId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  action: AuditAction;
  entityType: EntityType;
  entityId: string;
  entityName?: string;
  before?: any;
  after?: any;
  changes?: Record<string, { old: any; new: any }>;
  ipAddress?: string;
  userAgent?: string;
  notes?: string;
}

export enum AuditAction {
  // Asset Actions
  ASSET_CREATED = 'asset_created',
  ASSET_UPDATED = 'asset_updated',
  ASSET_DELETED = 'asset_deleted',
  ASSET_STATUS_CHANGED = 'asset_status_changed',
  
  // Inspection Actions
  INSPECTION_CREATED = 'inspection_created',
  INSPECTION_UPDATED = 'inspection_updated',
  INSPECTION_DELETED = 'inspection_deleted',
  INSPECTION_SUBMITTED = 'inspection_submitted',
  
  // Maintenance Actions
  MAINTENANCE_CREATED = 'maintenance_created',
  MAINTENANCE_UPDATED = 'maintenance_updated',
  MAINTENANCE_COMPLETED = 'maintenance_completed',
  MAINTENANCE_CANCELLED = 'maintenance_cancelled',
  
  // User Management Actions
  USER_CREATED = 'user_created',
  USER_UPDATED = 'user_updated',
  USER_DELETED = 'user_deleted',
  USER_STATUS_CHANGED = 'user_status_changed',
  USER_ROLE_CHANGED = 'user_role_changed',
  USER_LOGGED_IN = 'user_logged_in',
  USER_LOGGED_OUT = 'user_logged_out',
  
  // Invitation Actions
  INVITATION_CREATED = 'invitation_created',
  INVITATION_ACCEPTED = 'invitation_accepted',
  INVITATION_DELETED = 'invitation_deleted',
  
  // Tenant Actions
  TENANT_CREATED = 'tenant_created',
  TENANT_SETTINGS_UPDATED = 'tenant_settings_updated',
  
  // Bulk Operations
  BULK_IMPORT = 'bulk_import',
  BULK_UPDATE = 'bulk_update',
  BULK_DELETE = 'bulk_delete',
  BULK_ASSIGNMENT = 'bulk_assignment',
  
  // Data Migration
  DATA_MIGRATION = 'data_migration',
  DATA_EXPORT = 'data_export',
}

export enum EntityType {
  ASSET = 'asset',
  INSPECTION = 'inspection',
  MAINTENANCE = 'maintenance',
  USER = 'user',
  INVITATION = 'invitation',
  TENANT = 'tenant',
  TEMPLATE = 'template',
  SETTINGS = 'settings',
}

/**
 * Log an audit entry
 */
export async function logAudit(params: {
  tenantId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  action: AuditAction;
  entityType: EntityType;
  entityId: string;
  entityName?: string;
  before?: any;
  after?: any;
  changes?: Record<string, { old: any; new: any }>;
  ipAddress?: string;
  userAgent?: string;
  notes?: string;
}): Promise<void> {
  try {
    const logEntry: AuditLogEntry = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      tenantId: params.tenantId,
      userId: params.userId,
      userName: params.userName,
      userEmail: params.userEmail,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      entityName: params.entityName,
      before: params.before,
      after: params.after,
      changes: params.changes,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      notes: params.notes,
    };

    // Store in KV with composite key for efficient querying
    const key = `audit:${params.tenantId}:${Date.now()}:${logEntry.id}`;
    await kv.set(key, logEntry);

    console.log(`[AUDIT] ${params.action} by user ${params.userId} on ${params.entityType} ${params.entityId}`);
  } catch (error) {
    console.error("Failed to write audit log:", error);
    // Don't throw - audit logging should never break the main flow
  }
}

/**
 * Calculate changes between before and after objects
 */
export function calculateChanges(
  before: Record<string, any>,
  after: Record<string, any>,
  fieldsToTrack?: string[]
): Record<string, { old: any; new: any }> {
  const changes: Record<string, { old: any; new: any }> = {};
  
  const fields = fieldsToTrack || Object.keys({ ...before, ...after });
  
  for (const field of fields) {
    const oldValue = before[field];
    const newValue = after[field];
    
    // Skip if values are the same
    if (JSON.stringify(oldValue) === JSON.stringify(newValue)) {
      continue;
    }
    
    changes[field] = {
      old: oldValue,
      new: newValue,
    };
  }
  
  return changes;
}

/**
 * Get audit logs for a tenant
 */
export async function getAuditLogs(params: {
  tenantId: string;
  limit?: number;
  entityType?: EntityType;
  entityId?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
}): Promise<AuditLogEntry[]> {
  try {
    // Get all audit logs for the tenant
    const prefix = `audit:${params.tenantId}:`;
    const allLogs = await kv.getByPrefix(prefix);
    
    let filtered = allLogs as AuditLogEntry[];
    
    // Filter by entity type
    if (params.entityType) {
      filtered = filtered.filter(log => log.entityType === params.entityType);
    }
    
    // Filter by entity ID
    if (params.entityId) {
      filtered = filtered.filter(log => log.entityId === params.entityId);
    }
    
    // Filter by user ID
    if (params.userId) {
      filtered = filtered.filter(log => log.userId === params.userId);
    }
    
    // Filter by date range
    if (params.startDate) {
      filtered = filtered.filter(log => new Date(log.timestamp) >= params.startDate!);
    }
    
    if (params.endDate) {
      filtered = filtered.filter(log => new Date(log.timestamp) <= params.endDate!);
    }
    
    // Sort by timestamp descending (newest first)
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    // Apply limit
    if (params.limit) {
      filtered = filtered.slice(0, params.limit);
    }
    
    return filtered;
  } catch (error) {
    console.error("Failed to get audit logs:", error);
    return [];
  }
}

/**
 * Get audit history for a specific entity
 */
export async function getEntityHistory(
  tenantId: string,
  entityType: EntityType,
  entityId: string
): Promise<AuditLogEntry[]> {
  return getAuditLogs({
    tenantId,
    entityType,
    entityId,
  });
}

/**
 * Helper to log asset changes
 */
export async function logAssetChange(params: {
  tenantId: string;
  userId: string;
  userName?: string;
  action: AuditAction;
  assetId: string;
  assetName?: string;
  before?: any;
  after?: any;
}): Promise<void> {
  const changes = params.before && params.after
    ? calculateChanges(params.before, params.after, [
        'name', 'type', 'status', 'condition', 'location', 
        'latitude', 'longitude', 'installer', 'owner'
      ])
    : undefined;

  await logAudit({
    tenantId: params.tenantId,
    userId: params.userId,
    userName: params.userName,
    action: params.action,
    entityType: EntityType.ASSET,
    entityId: params.assetId,
    entityName: params.assetName,
    before: params.before,
    after: params.after,
    changes,
  });
}

/**
 * Helper to log inspection changes
 */
export async function logInspectionChange(params: {
  tenantId: string;
  userId: string;
  userName?: string;
  action: AuditAction;
  inspectionId: string;
  assetId?: string;
  before?: any;
  after?: any;
}): Promise<void> {
  const changes = params.before && params.after
    ? calculateChanges(params.before, params.after, [
        'status', 'condition_index', 'overall_condition', 
        'inspection_date', 'notes'
      ])
    : undefined;

  await logAudit({
    tenantId: params.tenantId,
    userId: params.userId,
    userName: params.userName,
    action: params.action,
    entityType: EntityType.INSPECTION,
    entityId: params.inspectionId,
    entityName: params.assetId ? `Inspection for Asset ${params.assetId}` : undefined,
    before: params.before,
    after: params.after,
    changes,
  });
}

/**
 * Helper to log maintenance changes
 */
export async function logMaintenanceChange(params: {
  tenantId: string;
  userId: string;
  userName?: string;
  action: AuditAction;
  maintenanceId: string;
  assetId?: string;
  before?: any;
  after?: any;
}): Promise<void> {
  const changes = params.before && params.after
    ? calculateChanges(params.before, params.after, [
        'type', 'status', 'priority', 'scheduled_date', 
        'completed_date', 'cost', 'assigned_to'
      ])
    : undefined;

  await logAudit({
    tenantId: params.tenantId,
    userId: params.userId,
    userName: params.userName,
    action: params.action,
    entityType: EntityType.MAINTENANCE,
    entityId: params.maintenanceId,
    entityName: params.assetId ? `Maintenance for Asset ${params.assetId}` : undefined,
    before: params.before,
    after: params.after,
    changes,
  });
}

/**
 * Helper to log user management changes
 */
export async function logUserChange(params: {
  tenantId: string;
  userId: string;
  userName?: string;
  action: AuditAction;
  targetUserId: string;
  targetUserEmail?: string;
  before?: any;
  after?: any;
}): Promise<void> {
  const changes = params.before && params.after
    ? calculateChanges(params.before, params.after, [
        'role', 'status', 'name', 'email'
      ])
    : undefined;

  await logAudit({
    tenantId: params.tenantId,
    userId: params.userId,
    userName: params.userName,
    action: params.action,
    entityType: EntityType.USER,
    entityId: params.targetUserId,
    entityName: params.targetUserEmail,
    before: params.before,
    after: params.after,
    changes,
  });
}

/**
 * Clean up old audit logs (optional - for data retention policies)
 */
export async function cleanupOldLogs(
  tenantId: string,
  olderThanDays: number = 365
): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    const prefix = `audit:${tenantId}:`;
    const allLogs = await kv.getByPrefix(prefix);
    
    let deletedCount = 0;
    
    for (const log of allLogs) {
      if (new Date(log.timestamp) < cutoffDate) {
        // Delete the log
        const key = `audit:${tenantId}:${new Date(log.timestamp).getTime()}:${log.id}`;
        await kv.del(key);
        deletedCount++;
      }
    }
    
    console.log(`Cleaned up ${deletedCount} audit logs older than ${olderThanDays} days`);
    return deletedCount;
  } catch (error) {
    console.error("Failed to cleanup old logs:", error);
    return 0;
  }
}
