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
}

/**
 * Generate PDF Report with Tenant Branding
 */
export async function generatePDFReport(options: ReportOptions): Promise<void> {
  const { title, data, columns, tenant, fileName, includeDate = true, includeFooter = true } = options;
  
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