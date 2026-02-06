/**
 * TAMS360 Report Generation Utilities
 * Generates PDF, CSV, and Excel reports with tenant branding
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

export interface TenantSettings {
  organizationName?: string;
  logoUrl?: string;
  primaryColor?: string;
  regionName?: string;
  currency?: string;
  tagline?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
}

export interface ReportOptions {
  title: string;
  data: any[];
  columns: { header: string; key: string; width?: number }[];
  tenant: TenantSettings;
  fileName: string;
  includeDate?: boolean;
  includeFooter?: boolean;
  includePhotos?: boolean; // New flag for photo reports
}

/**
 * Load image as base64 data URL
 */
async function loadImageAsDataURL(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        } else {
          reject(new Error('Failed to get canvas context'));
        }
      } catch (error) {
        reject(error);
      }
    };
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

/**
 * Generate PDF Report with Tenant Branding
 */
export async function generatePDFReport(options: ReportOptions): Promise<void> {
  const { title, data, columns, tenant, fileName, includeDate = true, includeFooter = true, includePhotos = false } = options;
  
  // Debug logging
  console.log('[PDF Generator] Starting PDF generation');
  console.log('[PDF Generator] Tenant data received:', tenant);
  console.log('[PDF Generator] Organization Name:', tenant.organizationName);
  console.log('[PDF Generator] Logo URL:', tenant.logoUrl);
  console.log('[PDF Generator] Primary Color:', tenant.primaryColor);
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const primaryColor = tenant.primaryColor || '#010D13';
  
  // Convert hex to RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 1, g: 13, b: 19 };
  };
  
  const color = hexToRgb(primaryColor);
  
  let yPosition = 20;
  
  // Add logo if available
  if (tenant.logoUrl) {
    try {
      // Try to load logo
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = tenant.logoUrl!;
      });
      
      // Calculate dimensions preserving aspect ratio
      const maxWidth = 35;
      const maxHeight = 20;
      const aspectRatio = img.width / img.height;
      
      let logoWidth = maxWidth;
      let logoHeight = maxWidth / aspectRatio;
      
      // If height exceeds max, scale down based on height
      if (logoHeight > maxHeight) {
        logoHeight = maxHeight;
        logoWidth = maxHeight * aspectRatio;
      }
      
      console.log(`[PDF Generator] Logo dimensions: ${img.width}x${img.height}, Rendered as: ${logoWidth}x${logoHeight}`);
      doc.addImage(img, 'PNG', 15, yPosition, logoWidth, logoHeight);
      yPosition += logoHeight + 5;
    } catch (error) {
      console.warn('Could not load logo:', error);
    }
  }
  
  // Add organization name
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(color.r, color.g, color.b);
  if (tenant.organizationName) {
    doc.text(tenant.organizationName, 15, yPosition);
    yPosition += 7;
  }
  
  // Add tagline if available
  if (tenant.tagline) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text(tenant.tagline, 15, yPosition);
    yPosition += 6;
  }
  
  // Add address if available
  if (tenant.address) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    const addressLines = doc.splitTextToSize(tenant.address, pageWidth - 30);
    doc.text(addressLines, 15, yPosition);
    yPosition += (addressLines.length * 4) + 4;
  }
  
  // Add contact details if available
  const contactParts = [];
  if (tenant.phone) contactParts.push(`Tel: ${tenant.phone}`);
  if (tenant.email) contactParts.push(`Email: ${tenant.email}`);
  if (tenant.website) contactParts.push(`Web: ${tenant.website}`);
  
  if (contactParts.length > 0) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text(contactParts.join('  |  '), 15, yPosition);
    yPosition += 5;
  }
  
  // Add region if available
  if (tenant.regionName) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(tenant.regionName, 15, yPosition);
    yPosition += 10;
  }
  
  // Add divider line
  doc.setDrawColor(color.r, color.g, color.b);
  doc.setLineWidth(0.5);
  doc.line(15, yPosition, pageWidth - 15, yPosition);
  yPosition += 8;
  
  // Add title
  doc.setFontSize(18);
  doc.setTextColor(color.r, color.g, color.b);
  doc.text(title, 15, yPosition);
  yPosition += 10;
  
  // Add date
  if (includeDate) {
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-ZA', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`, 15, yPosition);
    yPosition += 10;
  }
  
  // Prepare table data
  const tableData = data.map(row => 
    columns.map(col => {
      const value = row[col.key];
      // Format currency values
      if (col.key.includes('cost') || col.key.includes('value') || col.key.includes('price')) {
        return typeof value === 'number' ? `R ${value.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : value || '-';
      }
      // Format dates
      if (col.key.includes('date') || col.key.includes('Date')) {
        return value ? new Date(value).toLocaleDateString('en-ZA') : '-';
      }
      return value || '-';
    })
  );
  
  // Add table
  autoTable(doc, {
    head: [columns.map(col => col.header)],
    body: tableData,
    startY: yPosition,
    theme: 'striped',
    headStyles: {
      fillColor: [color.r, color.g, color.b],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10,
    },
    bodyStyles: {
      fontSize: 9,
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    columnStyles: columns.reduce((acc, col, index) => {
      if (col.width) {
        acc[index] = { cellWidth: col.width };
      }
      return acc;
    }, {} as any),
    margin: { top: 10, right: 15, bottom: 20, left: 15 },
  });
  
  // Add footer
  if (includeFooter) {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // Left: Tenant name and page number
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `${tenant.organizationName || 'TAMS360'} | Page ${i} of ${pageCount}`,
        15,
        pageHeight - 10
      );
      
      // Right: "Created by TAMS360"
      doc.setFontSize(7);
      doc.setTextColor(180, 180, 180);
      doc.text(
        'Created by TAMS360',
        pageWidth - 15,
        pageHeight - 10,
        { align: 'right' }
      );
    }
  }
  
  // Save PDF
  doc.save(`${fileName}.pdf`);
}

/**
 * Generate Excel Report
 */
export function generateExcelReport(options: ReportOptions): void {
  const { title, data, columns, tenant, fileName } = options;
  
  // Create workbook
  const wb = XLSX.utils.book_new();
  
  // Prepare data with headers
  const wsData = [
    // Header rows
    [tenant.organizationName || 'TAMS360'],
    [title],
    [`Generated: ${new Date().toLocaleString('en-ZA')}`],
    [], // Empty row
    // Column headers
    columns.map(col => col.header),
    // Data rows
    ...data.map(row => 
      columns.map(col => {
        const value = row[col.key];
        // Format currency values
        if (col.key.includes('cost') || col.key.includes('value') || col.key.includes('price')) {
          return typeof value === 'number' ? value : value || '';
        }
        // Format dates
        if (col.key.includes('date') || col.key.includes('Date')) {
          return value ? new Date(value).toLocaleDateString('en-ZA') : '';
        }
        return value || '';
      })
    )
  ];
  
  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  
  // Set column widths
  const colWidths = columns.map(col => ({ wch: col.width || 15 }));
  ws['!cols'] = colWidths;
  
  // Style header rows (Excel styling is limited in XLSX library)
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, title.substring(0, 31)); // Excel sheet name limit
  
  // Generate Excel file
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}

/**
 * Generate CSV Report
 */
export function generateCSVReport(options: ReportOptions): void {
  const { title, data, columns, tenant, fileName } = options;
  
  // Prepare header lines as comments
  const headerComments = [
    `# Organization: ${tenant.organizationName || 'TAMS360'}`,
    `# Report: ${title}`,
    `# Generated: ${new Date().toLocaleString('en-ZA')}`,
    '', // Empty line
  ].join('\n');
  
  // Prepare actual data rows with proper column mapping
  const csvRows = data.map(row => {
    const csvRow: any = {};
    columns.forEach(col => {
      const value = row[col.key];
      // Format currency values
      if (col.key.includes('cost') || col.key.includes('value') || col.key.includes('price')) {
        csvRow[col.header] = typeof value === 'number' ? `R ${value.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : value || '';
      }
      // Format dates
      else if (col.key.includes('date') || col.key.includes('Date')) {
        csvRow[col.header] = value ? new Date(value).toLocaleDateString('en-ZA') : '';
      }
      else {
        csvRow[col.header] = value || '';
      }
    });
    return csvRow;
  });
  
  // Generate CSV from data rows only
  const csv = Papa.unparse(csvRows, {
    columns: columns.map(col => col.header),
  });
  
  // Combine header comments with CSV data
  const fullCsv = headerComments + '\n' + csv;
  
  // Download CSV
  const blob = new Blob([fullCsv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${fileName}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Generate Photo Report PDF with embedded images
 */
export async function generatePhotoPDFReport(options: ReportOptions): Promise<void> {
  const { title, data, columns, tenant, fileName, includeDate = true, includeFooter = true } = options;
  
  console.log('[Photo PDF Generator] Starting photo PDF generation');
  console.log('[Photo PDF Generator] Processing', data.length, 'assets with photos');
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const primaryColor = tenant.primaryColor || '#010D13';
  
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 1, g: 13, b: 19 };
  };
  
  const color = hexToRgb(primaryColor);
  let yPosition = 20;
  
  // Add logo if available
  if (tenant.logoUrl) {
    try {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = tenant.logoUrl!;
      });
      
      const maxWidth = 35;
      const maxHeight = 20;
      const aspectRatio = img.width / img.height;
      
      let logoWidth = maxWidth;
      let logoHeight = maxWidth / aspectRatio;
      
      if (logoHeight > maxHeight) {
        logoHeight = maxHeight;
        logoWidth = maxHeight * aspectRatio;
      }
      
      doc.addImage(img, 'PNG', 15, yPosition, logoWidth, logoHeight);
      yPosition += logoHeight + 5;
    } catch (error) {
      console.warn('Could not load logo:', error);
    }
  }
  
  // Add header
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(color.r, color.g, color.b);
  if (tenant.organizationName) {
    doc.text(tenant.organizationName, 15, yPosition);
    yPosition += 7;
  }
  
  if (tenant.tagline) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text(tenant.tagline, 15, yPosition);
    yPosition += 6;
  }
  
  doc.setDrawColor(color.r, color.g, color.b);
  doc.setLineWidth(0.5);
  doc.line(15, yPosition, pageWidth - 15, yPosition);
  yPosition += 8;
  
  doc.setFontSize(18);
  doc.setTextColor(color.r, color.g, color.b);
  doc.text(title, 15, yPosition);
  yPosition += 10;
  
  if (includeDate) {
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-ZA', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`, 15, yPosition);
    yPosition += 15;
  }
  
  // Process each asset with photos
  for (let i = 0; i < data.length; i++) {
    const asset = data[i];
    const photos = asset.photos || [];
    
    if (photos.length === 0) continue;
    
    // Check if we need a new page
    if (yPosition > pageHeight - 100) {
      doc.addPage();
      yPosition = 20;
    }
    
    // Draw asset card border
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    const cardStartY = yPosition;
    
    // Asset header
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(color.r, color.g, color.b);
    doc.text(asset.asset_ref || 'Unknown Asset', 20, yPosition);
    yPosition += 6;
    
    // Asset details in two columns
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    
    const leftCol = 20;
    const rightCol = pageWidth / 2 + 10;
    
    doc.text(`Road: ${asset.route_road || '-'}`, leftCol, yPosition);
    doc.text(`CI: ${asset.condition_index || '-'}`, rightCol, yPosition);
    yPosition += 4;
    
    doc.text(`Coordinates: ${asset.coordinates || '-'}`, leftCol, yPosition);
    doc.text(`Urgency: ${asset.urgency_category || '-'}`, rightCol, yPosition);
    yPosition += 4;
    
    doc.text(`Description: ${asset.description || '-'}`, leftCol, yPosition);
    doc.text(`Status: ${asset.status || '-'}`, rightCol, yPosition);
    yPosition += 6;
    
    // Load and embed photos
    const photoWidth = 40;
    const photoHeight = 30;
    const photosPerRow = 4;
    const photoSpacing = 5;
    
    let photoX = 20;
    let photoY = yPosition;
    let photosInRow = 0;
    
    for (let j = 0; j < Math.min(photos.length, 8); j++) { // Limit to 8 photos per asset
      try {
        const photoUrl = photos[j].signedUrl;
        console.log(`[Photo PDF] Loading photo ${j + 1}/${photos.length} for asset ${asset.asset_ref}`);
        
        const imgDataUrl = await loadImageAsDataURL(photoUrl);
        
        // Add photo to PDF
        doc.addImage(imgDataUrl, 'JPEG', photoX, photoY, photoWidth, photoHeight);
        
        // Add photo label
        doc.setFontSize(6);
        doc.setTextColor(100, 100, 100);
        doc.text(photos[j].name || `Photo ${j + 1}`, photoX, photoY + photoHeight + 3);
        
        photosInRow++;
        photoX += photoWidth + photoSpacing;
        
        // Move to next row after photosPerRow photos
        if (photosInRow >= photosPerRow) {
          photosInRow = 0;
          photoX = 20;
          photoY += photoHeight + 8;
        }
      } catch (error) {
        console.error(`Failed to load photo ${j} for asset ${asset.asset_ref}:`, error);
      }
    }
    
    // Move yPosition past the photos
    if (photosInRow > 0) {
      yPosition = photoY + photoHeight + 8;
    } else {
      yPosition = photoY;
    }
    
    // Draw card border
    const cardHeight = yPosition - cardStartY + 5;
    doc.rect(15, cardStartY - 5, pageWidth - 30, cardHeight);
    
    yPosition += 10; // Space between asset cards
  }
  
  // Add footer
  if (includeFooter) {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `${tenant.organizationName || 'TAMS360'} | Page ${i} of ${pageCount}`,
        15,
        pageHeight - 10
      );
      
      doc.setFontSize(7);
      doc.setTextColor(180, 180, 180);
      doc.text(
        'Created by TAMS360',
        pageWidth - 15,
        pageHeight - 10,
        { align: 'right' }
      );
    }
  }
  
  doc.save(`${fileName}.pdf`);
  console.log('[Photo PDF Generator] PDF generation complete');
}

/**
 * Generate Photo Report Excel with image references
 */
export async function generatePhotoExcelReport(options: ReportOptions): Promise<void> {
  const { title, data, columns, tenant, fileName } = options;
  
  console.log('[Photo Excel Generator] Starting photo Excel generation');
  
  const wb = XLSX.utils.book_new();
  
  // Prepare data with headers
  const wsData: any[][] = [
    [tenant.organizationName || 'TAMS360'],
    [title],
    [`Generated: ${new Date().toLocaleString('en-ZA')}`],
    [],
    // Column headers including photo columns
    [...columns.map(col => col.header), 'Photo URLs'],
  ];
  
  // Data rows with photo URLs
  data.forEach(row => {
    const rowData = columns.map(col => {
      const value = row[col.key];
      if (col.key.includes('cost') || col.key.includes('value') || col.key.includes('price')) {
        return typeof value === 'number' ? value : value || '';
      }
      if (col.key.includes('date') || col.key.includes('Date')) {
        return value ? new Date(value).toLocaleDateString('en-ZA') : '';
      }
      return value || '';
    });
    
    // Add photo URLs as a comma-separated list
    const photos = row.photos || [];
    const photoUrls = photos.map((p: any) => p.signedUrl).join(', ');
    rowData.push(photoUrls);
    
    wsData.push(rowData);
  });
  
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  
  // Set column widths
  const colWidths = [...columns.map(col => ({ wch: col.width || 15 })), { wch: 50 }];
  ws['!cols'] = colWidths;
  
  XLSX.utils.book_append_sheet(wb, ws, title.substring(0, 31));
  XLSX.writeFile(wb, `${fileName}.xlsx`);
  
  console.log('[Photo Excel Generator] Excel generation complete');
}

/**
 * Download helper to determine format
 */
export async function downloadReport(
  format: 'pdf' | 'excel' | 'csv',
  options: ReportOptions
): Promise<void> {
  try {
    switch (format.toLowerCase()) {
      case 'pdf':
        await generatePDFReport(options);
        break;
      case 'excel':
        generateExcelReport(options);
        break;
      case 'csv':
        generateCSVReport(options);
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  } catch (error) {
    console.error(`Error generating ${format} report:`, error);
    throw error;
  }
}