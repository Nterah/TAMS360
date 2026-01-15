/**
 * Comprehensive Validation Rules for TAMS360
 * 
 * This module provides validation functions for all data entry forms
 * to ensure data integrity across the asset management system.
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface AssetValidationData {
  assetNumber?: string;
  name?: string;
  type?: string;
  latitude?: number | string;
  longitude?: number | string;
  installationDate?: string;
  status?: string;
  condition?: string;
  [key: string]: any;
}

export interface InspectionValidationData {
  assetId?: string;
  inspectorId?: string;
  inspectionDate?: string;
  overallCondition?: string;
  componentScores?: Array<{ rating?: number | string }>;
  [key: string]: any;
}

export interface MaintenanceValidationData {
  assetId?: string;
  type?: string;
  status?: string;
  scheduledDate?: string;
  completedDate?: string;
  cost?: number | string;
  [key: string]: any;
}

/**
 * Asset Validation Rules
 */
export function validateAsset(data: AssetValidationData): ValidationResult {
  const errors: string[] = [];

  // Asset Number validation
  if (!data.assetNumber || data.assetNumber.trim() === '') {
    errors.push('Asset Number is required');
  } else if (data.assetNumber.length > 50) {
    errors.push('Asset Number must not exceed 50 characters');
  } else if (!/^[A-Z0-9-_]+$/i.test(data.assetNumber)) {
    errors.push('Asset Number must contain only letters, numbers, hyphens, and underscores');
  }

  // Asset Name validation
  if (!data.name || data.name.trim() === '') {
    errors.push('Asset Name is required');
  } else if (data.name.length < 3) {
    errors.push('Asset Name must be at least 3 characters');
  } else if (data.name.length > 200) {
    errors.push('Asset Name must not exceed 200 characters');
  }

  // Asset Type validation
  if (!data.type || data.type.trim() === '') {
    errors.push('Asset Type is required');
  }

  // GPS Coordinates validation
  if (data.latitude !== undefined && data.latitude !== null && data.latitude !== '') {
    const lat = parseFloat(data.latitude.toString());
    if (isNaN(lat)) {
      errors.push('Latitude must be a valid number');
    } else if (lat < -90 || lat > 90) {
      errors.push('Latitude must be between -90 and 90');
    }
  }

  if (data.longitude !== undefined && data.longitude !== null && data.longitude !== '') {
    const lng = parseFloat(data.longitude.toString());
    if (isNaN(lng)) {
      errors.push('Longitude must be a valid number');
    } else if (lng < -180 || lng > 180) {
      errors.push('Longitude must be between -180 and 180');
    }
  }

  // Installation Date validation
  if (data.installationDate) {
    const installDate = new Date(data.installationDate);
    const today = new Date();
    
    if (isNaN(installDate.getTime())) {
      errors.push('Installation Date must be a valid date');
    } else if (installDate > today) {
      errors.push('Installation Date cannot be in the future');
    } else {
      // Check if date is reasonable (not more than 100 years ago)
      const hundredYearsAgo = new Date();
      hundredYearsAgo.setFullYear(today.getFullYear() - 100);
      if (installDate < hundredYearsAgo) {
        errors.push('Installation Date seems too far in the past');
      }
    }
  }

  // Status validation
  const validStatuses = ['active', 'inactive', 'maintenance', 'decommissioned', 'planned'];
  if (data.status && !validStatuses.includes(data.status.toLowerCase())) {
    errors.push(`Status must be one of: ${validStatuses.join(', ')}`);
  }

  // Condition validation
  const validConditions = ['excellent', 'good', 'fair', 'poor', 'critical'];
  if (data.condition && !validConditions.includes(data.condition.toLowerCase())) {
    errors.push(`Condition must be one of: ${validConditions.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Inspection Validation Rules
 */
export function validateInspection(data: InspectionValidationData): ValidationResult {
  const errors: string[] = [];

  // Asset ID validation
  if (!data.assetId || data.assetId.trim() === '') {
    errors.push('Asset selection is required');
  }

  // Inspector ID validation
  if (!data.inspectorId || data.inspectorId.trim() === '') {
    errors.push('Inspector must be assigned');
  }

  // Inspection Date validation
  if (!data.inspectionDate) {
    errors.push('Inspection Date is required');
  } else {
    const inspectionDate = new Date(data.inspectionDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today

    if (isNaN(inspectionDate.getTime())) {
      errors.push('Inspection Date must be a valid date');
    } else if (inspectionDate > today) {
      errors.push('Inspection Date cannot be in the future');
    }
  }

  // Overall Condition validation
  if (data.overallCondition) {
    const validConditions = ['excellent', 'good', 'fair', 'poor', 'critical'];
    if (!validConditions.includes(data.overallCondition.toLowerCase())) {
      errors.push(`Overall Condition must be one of: ${validConditions.join(', ')}`);
    }
  }

  // Component Scores validation
  if (data.componentScores && Array.isArray(data.componentScores)) {
    data.componentScores.forEach((component, index) => {
      if (component.rating !== undefined && component.rating !== null && component.rating !== '') {
        const rating = parseFloat(component.rating.toString());
        if (isNaN(rating)) {
          errors.push(`Component ${index + 1}: Rating must be a number`);
        } else if (rating < 0 || rating > 100) {
          errors.push(`Component ${index + 1}: Rating must be between 0 and 100`);
        }
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Maintenance Record Validation Rules
 */
export function validateMaintenance(data: MaintenanceValidationData): ValidationResult {
  const errors: string[] = [];

  // Asset ID validation
  if (!data.assetId || data.assetId.trim() === '') {
    errors.push('Asset selection is required');
  }

  // Maintenance Type validation
  if (!data.type || data.type.trim() === '') {
    errors.push('Maintenance Type is required');
  }

  // Status validation
  const validStatuses = ['scheduled', 'in_progress', 'completed', 'cancelled', 'on_hold'];
  if (data.status && !validStatuses.includes(data.status.toLowerCase())) {
    errors.push(`Status must be one of: ${validStatuses.join(', ')}`);
  }

  // Scheduled Date validation
  if (data.scheduledDate) {
    const scheduledDate = new Date(data.scheduledDate);
    
    if (isNaN(scheduledDate.getTime())) {
      errors.push('Scheduled Date must be a valid date');
    }
  }

  // Completed Date validation
  if (data.completedDate) {
    const completedDate = new Date(data.completedDate);
    const today = new Date();
    
    if (isNaN(completedDate.getTime())) {
      errors.push('Completed Date must be a valid date');
    } else if (completedDate > today) {
      errors.push('Completed Date cannot be in the future');
    }

    // If both scheduled and completed dates exist, validate order
    if (data.scheduledDate) {
      const scheduledDate = new Date(data.scheduledDate);
      if (completedDate < scheduledDate) {
        errors.push('Completed Date cannot be before Scheduled Date');
      }
    }
  }

  // Cost validation
  if (data.cost !== undefined && data.cost !== null && data.cost !== '') {
    const cost = parseFloat(data.cost.toString());
    if (isNaN(cost)) {
      errors.push('Cost must be a valid number');
    } else if (cost < 0) {
      errors.push('Cost cannot be negative');
    } else if (cost > 10000000) {
      errors.push('Cost seems unreasonably high (max: 10,000,000)');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * User Validation Rules
 */
export function validateUser(data: {
  email?: string;
  name?: string;
  password?: string;
  role?: string;
}): ValidationResult {
  const errors: string[] = [];

  // Email validation
  if (!data.email || data.email.trim() === '') {
    errors.push('Email is required');
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      errors.push('Email must be a valid email address');
    } else if (data.email.length > 255) {
      errors.push('Email must not exceed 255 characters');
    }
  }

  // Name validation
  if (!data.name || data.name.trim() === '') {
    errors.push('Name is required');
  } else if (data.name.length < 2) {
    errors.push('Name must be at least 2 characters');
  } else if (data.name.length > 100) {
    errors.push('Name must not exceed 100 characters');
  }

  // Password validation (only if provided)
  if (data.password) {
    if (data.password.length < 8) {
      errors.push('Password must be at least 8 characters');
    } else if (data.password.length > 128) {
      errors.push('Password must not exceed 128 characters');
    } else if (!/[A-Z]/.test(data.password)) {
      errors.push('Password must contain at least one uppercase letter');
    } else if (!/[a-z]/.test(data.password)) {
      errors.push('Password must contain at least one lowercase letter');
    } else if (!/[0-9]/.test(data.password)) {
      errors.push('Password must contain at least one number');
    }
  }

  // Role validation
  const validRoles = ['admin', 'supervisor', 'field_user', 'viewer'];
  if (data.role && !validRoles.includes(data.role)) {
    errors.push(`Role must be one of: ${validRoles.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Generic field validators
 */
export const validators = {
  required: (value: any, fieldName: string): string | null => {
    if (value === undefined || value === null || value === '') {
      return `${fieldName} is required`;
    }
    return null;
  },

  minLength: (value: string, min: number, fieldName: string): string | null => {
    if (value && value.length < min) {
      return `${fieldName} must be at least ${min} characters`;
    }
    return null;
  },

  maxLength: (value: string, max: number, fieldName: string): string | null => {
    if (value && value.length > max) {
      return `${fieldName} must not exceed ${max} characters`;
    }
    return null;
  },

  email: (value: string): string | null => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (value && !emailRegex.test(value)) {
      return 'Must be a valid email address';
    }
    return null;
  },

  number: (value: any, fieldName: string): string | null => {
    if (value !== undefined && value !== null && value !== '' && isNaN(Number(value))) {
      return `${fieldName} must be a valid number`;
    }
    return null;
  },

  range: (value: number, min: number, max: number, fieldName: string): string | null => {
    if (value < min || value > max) {
      return `${fieldName} must be between ${min} and ${max}`;
    }
    return null;
  },

  date: (value: string, fieldName: string): string | null => {
    if (value && isNaN(new Date(value).getTime())) {
      return `${fieldName} must be a valid date`;
    }
    return null;
  },

  futureDate: (value: string, fieldName: string): string | null => {
    if (value) {
      const date = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (date < today) {
        return `${fieldName} must be in the future`;
      }
    }
    return null;
  },

  pastDate: (value: string, fieldName: string): string | null => {
    if (value) {
      const date = new Date(value);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      
      if (date > today) {
        return `${fieldName} cannot be in the future`;
      }
    }
    return null;
  }
};

/**
 * Run multiple validators on a field
 */
export function validateField(
  value: any,
  fieldName: string,
  validatorFunctions: Array<(val: any, name: string) => string | null>
): string[] {
  const errors: string[] = [];
  
  for (const validator of validatorFunctions) {
    const error = validator(value, fieldName);
    if (error) {
      errors.push(error);
    }
  }
  
  return errors;
}
