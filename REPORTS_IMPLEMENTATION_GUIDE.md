# Implementation Guide: Reports Section (Option C)

## Overview
This guide provides detailed instructions for implementing the missing Reports section (Option C) in TAMS360.

**Current Status:** Not Implemented (0/7 reports)  
**Estimated Effort:** 2-3 days for full implementation  
**Priority:** HIGH (Critical for compliance and stakeholder reporting)

---

## What Already Exists

### ✅ Available Resources:
- `xlsx` package already installed and working
- Template download examples in `/src/app/components/data/TemplateLibraryPage.tsx`
- Excel import/export functionality in `/src/app/components/data/DataManagementPage.tsx`
- All backend data endpoints working
- UI components (Card, Button, Badge, etc.) available

### ✅ Working Examples to Reference:
- **Template Library**: Lines 258-339 show XLSX export with multiple sheets
- **Data Management**: Lines 37-40 show XLSX import
- Both files demonstrate proper XLSX.utils usage

---

## Required Reports (7 Total)

### 1. Asset Register Report
**Purpose:** Complete list of all assets with current status  
**Format:** XLSX / PDF  
**Columns:** Asset Ref, Type, Location, GPS, Region, Depot, Status, CI, Urgency, Owner, Installed Date, Value

### 2. Inspection Summary Report
**Purpose:** Overview of all inspections by period  
**Format:** XLSX / PDF  
**Columns:** Asset Ref, Type, Inspector, Date, CI, DERU, Urgency, Components Assessed, Photos Count, Total Cost

### 3. Asset Condition Report
**Purpose:** Condition analysis by CI bands  
**Format:** XLSX / PDF with charts  
**Sections:**
- CI Distribution Summary
- Assets by Condition Band (0-19, 20-39, 40-59, 60-79, 80-100)
- Worst Performing Assets (CI < 40)
- Recommendations

### 4. Urgency/Risk Report
**Purpose:** Risk analysis and prioritization  
**Format:** XLSX / PDF  
**Sections:**
- Urgency Distribution
- Immediate Action Items (Urgency 4)
- High Priority Items (Urgency 3)
- Risk Heat Map (if implementing PDF)

### 5. Remedial Works & Costing Report
**Purpose:** Budget planning and work prioritization  
**Format:** XLSX / PDF  
**Columns:** Asset Ref, Type, Location, CI, Urgency, Remedial Cost (ZAR), Component Details, Photos, Estimated Timeline

### 6. Maintenance Backlog Report
**Purpose:** Maintenance tracking and scheduling  
**Format:** XLSX / PDF  
**Columns:** Work Order ID, Asset Ref, Type, Location, Maintenance Type, Status, Scheduled Date, Due Date, Priority, Cost, Assigned To

### 7. Compliance/Audit Report
**Purpose:** Regulatory compliance and audit trail  
**Format:** XLSX / PDF  
**Sections:**
- Inspection Compliance (% assets inspected)
- Overdue Inspections List
- Data Quality Issues
- Maintenance Completion Rates
- Asset Valuation Summary
- Inspector Activity Log

---

## Implementation Steps

### Step 1: Create Reports Page Component

**File:** `/src/app/components/reports/ReportsPage.tsx`

```typescript
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Download, FileText, FileSpreadsheet, Filter } from "lucide-react";
import * as XLSX from "xlsx";
import { projectId, publicAnonKey } from "../../../../utils/supabase/info";
import { toast } from "sonner";

export default function ReportsPage() {
  const [generating, setGenerating] = useState<string | null>(null);

  const reports = [
    {
      id: "asset-register",
      title: "Asset Register Report",
      description: "Complete list of all assets with current status",
      icon: FileText,
      formats: ["xlsx", "pdf"],
    },
    {
      id: "inspection-summary",
      title: "Inspection Summary Report",
      description: "Overview of all inspections by period",
      icon: FileSpreadsheet,
      formats: ["xlsx", "pdf"],
    },
    // ... Add all 7 reports
  ];

  const generateReport = async (reportId: string, format: string) => {
    setGenerating(`${reportId}-${format}`);
    try {
      // Implementation for each report type
      switch (reportId) {
        case "asset-register":
          await generateAssetRegister(format);
          break;
        case "inspection-summary":
          await generateInspectionSummary(format);
          break;
        // ... other cases
      }
      toast.success(`Report generated successfully`);
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Failed to generate report");
    } finally {
      setGenerating(null);
    }
  };

  const generateAssetRegister = async (format: string) => {
    // Fetch data from backend
    const response = await fetch(`${API_URL}/assets`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const { assets } = await response.json();

    if (format === "xlsx") {
      // Create Excel workbook
      const wb = XLSX.utils.book_new();
      
      // Format data for export
      const data = assets.map((asset: any) => ({
        "Asset Reference": asset.asset_ref,
        "Asset Type": asset.asset_type_name,
        "Road Name": asset.road_name,
        "Road Number": asset.road_number,
        "GPS Coordinates": `${asset.latitude}, ${asset.longitude}`,
        "Region": asset.region,
        "Depot": asset.depot,
        "Latest CI": asset.latest_ci,
        "Urgency": asset.latest_urgency,
        "Replacement Value (ZAR)": `R ${(asset.replacement_value || 0).toLocaleString()}`,
        "Installation Date": asset.installation_date,
        "Owner": asset.owner,
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      
      // Set column widths
      ws['!cols'] = [
        { wch: 15 }, // Asset Reference
        { wch: 20 }, // Asset Type
        { wch: 25 }, // Road Name
        // ... etc
      ];

      XLSX.utils.book_append_sheet(wb, ws, "Asset Register");
      
      // Add summary sheet
      const summary = [
        ["Asset Register Report"],
        ["Generated:", new Date().toLocaleDateString()],
        ["Total Assets:", assets.length],
        [""],
        ["Summary by Type:"],
        // ... add summary calculations
      ];
      const summaryWs = XLSX.utils.aoa_to_sheet(summary);
      XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

      XLSX.writeFile(wb, `Asset_Register_${Date.now()}.xlsx`);
    } else if (format === "pdf") {
      // PDF generation (requires jspdf or similar)
      toast.info("PDF export coming soon");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Reports</h1>
        <p className="text-muted-foreground">
          Generate comprehensive reports for compliance, planning, and stakeholder communication
        </p>
      </div>

      {/* Report Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Report Filters</CardTitle>
          <CardDescription>Configure date range and filters for reports</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Add date pickers, region filters, etc. */}
        </CardContent>
      </Card>

      {/* Report Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => (
          <Card key={report.id}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <report.icon className="w-6 h-6 text-primary" />
                <CardTitle className="text-lg">{report.title}</CardTitle>
              </div>
              <CardDescription>{report.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {report.formats.includes("xlsx") && (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => generateReport(report.id, "xlsx")}
                  disabled={generating === `${report.id}-xlsx`}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download XLSX
                </Button>
              )}
              {report.formats.includes("pdf") && (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => generateReport(report.id, "pdf")}
                  disabled={generating === `${report.id}-pdf`}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

### Step 2: Add Route to App.tsx

**File:** `/src/app/App.tsx`

```typescript
// Add import
import ReportsPage from "./components/reports/ReportsPage";

// Add route in Routes section
<Route path="/reports" element={
  <AppLayout>
    <ReportsPage />
  </AppLayout>
} />
```

### Step 3: Add Navigation Link

**File:** `/src/app/components/layout/AppLayout.tsx`

```typescript
// Add to navigation items
<Link to="/reports" className={navLinkClass("/reports")}>
  <FileText className="w-5 h-5" />
  <span>Reports</span>
</Link>
```

### Step 4: Create Backend Endpoints (Optional)

**File:** `/supabase/functions/server/index.tsx`

```typescript
// Option A: Frontend generates reports from existing endpoints (simpler)
// Option B: Create dedicated report endpoints (more efficient)

app.get("/make-server-c894a9ff/reports/asset-register", async (c) => {
  try {
    // Fetch all assets with related data
    const { data: assets, error } = await supabase
      .from("tams360_assets_v")
      .select(`
        asset_id,
        asset_ref,
        asset_type_name,
        road_name,
        road_number,
        latitude,
        longitude,
        region,
        depot,
        latest_ci,
        latest_urgency,
        replacement_value,
        installation_date,
        owner
      `)
      .order("asset_ref");

    if (error) throw error;

    // Return formatted data ready for Excel/PDF
    return c.json({ 
      assets,
      summary: {
        totalAssets: assets.length,
        byType: groupByType(assets),
        byRegion: groupByRegion(assets),
        avgCI: calculateAvgCI(assets),
      },
      generated: new Date().toISOString(),
    });
  } catch (error) {
    return c.json({ error: "Failed to generate report" }, 500);
  }
});

// Similar endpoints for other report types
```

---

## PDF Generation (Optional Enhancement)

If PDF support is required, install and configure:

```bash
npm install jspdf jspdf-autotable
```

Example PDF generation:

```typescript
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const generatePDF = (data: any[], title: string) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(18);
  doc.text(title, 14, 22);
  doc.setFontSize(11);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);

  // Table
  autoTable(doc, {
    head: [Object.keys(data[0])],
    body: data.map(row => Object.values(row)),
    startY: 40,
    theme: 'grid',
    headStyles: { fillColor: [1, 13, 19] }, // Deep Navy
  });

  // Footer
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }

  doc.save(`${title.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
};
```

---

## Data Formatting Guidelines

### Currency Formatting:
```typescript
const formatCurrency = (value: number) => {
  return `R ${value.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
};
```

### Date Formatting:
```typescript
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};
```

### CI Band Classification:
```typescript
const getCIBand = (ci: number) => {
  if (ci >= 80) return "Excellent (80-100)";
  if (ci >= 60) return "Good (60-79)";
  if (ci >= 40) return "Fair (40-59)";
  if (ci >= 20) return "Poor (20-39)";
  return "Critical (0-19)";
};
```

---

## Testing Checklist

After implementation:

- [ ] All 7 report types generate XLSX without errors
- [ ] Excel files open correctly in Microsoft Excel / LibreOffice
- [ ] Currency displayed in ZAR with R symbol
- [ ] Dates formatted correctly
- [ ] Column widths appropriate
- [ ] Summary sheets include calculations
- [ ] Large datasets (1000+ assets) export successfully
- [ ] File names include timestamp
- [ ] PDF exports work (if implemented)
- [ ] Navigation link visible and working
- [ ] Loading states show during generation
- [ ] Error handling works for failed exports
- [ ] Reports page responsive on mobile

---

## Example Report Structures

### Asset Register (Excel Structure):

**Sheet 1: Asset Data**
| Asset Ref | Type | Road | GPS | Region | CI | Urgency | Value (ZAR) | Owner |
|-----------|------|------|-----|--------|----|---------|-|-------|
| A-001 | Traffic Light | N1 | -26.2, 28.0 | Gauteng | 85 | Low | R 250,000 | SANRAL |

**Sheet 2: Summary**
```
Asset Register Summary
Generated: 01 January 2026
Total Assets: 1,250

By Type:
- Traffic Lights: 450
- Guardrails: 350
- Road Signs: 300
- Safety Barriers: 150

By Condition:
- Excellent (80-100): 600
- Good (60-79): 400
- Fair (40-59): 200
- Poor (20-39): 40
- Critical (0-19): 10
```

---

## Estimated Implementation Time

| Task | Time Estimate |
|------|---------------|
| Create ReportsPage component | 4 hours |
| Implement XLSX export for all 7 reports | 8 hours |
| Add routing and navigation | 1 hour |
| Create backend endpoints (optional) | 4 hours |
| Implement filters and date pickers | 3 hours |
| PDF generation (optional) | 4 hours |
| Testing and bug fixes | 4 hours |
| **Total** | **2-3 days** |

---

## Priority Order

If implementing incrementally:

1. **Phase 1** (High Priority - 1 day):
   - Asset Register Report (XLSX)
   - Inspection Summary Report (XLSX)
   - Basic ReportsPage UI with navigation

2. **Phase 2** (Medium Priority - 1 day):
   - Asset Condition Report
   - Urgency/Risk Report
   - Remedial Works Report
   - Add filters and date pickers

3. **Phase 3** (Nice to Have - 1 day):
   - Maintenance Backlog Report
   - Compliance/Audit Report
   - PDF export capability
   - Advanced formatting and charts in Excel

---

## Support Resources

- **XLSX Documentation**: https://docs.sheetjs.com/
- **jsPDF Documentation**: https://artskydj.github.io/jsPDF/docs/
- **Existing Templates**: See `/src/app/components/data/TemplateLibraryPage.tsx`
- **Date Formatting**: Use Intl.DateTimeFormat for ZA locale

---

**Next Steps:**
1. Review this implementation guide
2. Decide on XLSX-only or XLSX + PDF
3. Choose incremental phases or full implementation
4. Create ReportsPage component
5. Implement one report at a time
6. Test each report thoroughly
7. Deploy and gather user feedback

