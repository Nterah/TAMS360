import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Download, FileSpreadsheet, Info, Upload, CheckCircle2, FileText, RefreshCw } from "lucide-react";
import { Badge } from "../ui/badge";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Alert, AlertDescription } from "../ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

interface TemplateInfo {
  id: string;
  name: string;
  description: string;
  category: "assets" | "inspections" | "maintenance";
  assetType?: string;
  columns: ColumnDef[];
  exampleData: any[];
  icon: any;
  color: string;
}

interface ColumnDef {
  name: string;
  description: string;
  type: "text" | "number" | "date" | "select";
  required: boolean;
  options?: string[];
  example: string;
}

export default function TemplateLibraryPage() {
  const [downloading, setDownloading] = useState<string | null>(null);

  // Define all available templates
  const templates: TemplateInfo[] = [
    {
      id: "signage-assets",
      name: "Road Signage Assets",
      description: "Import traffic signs and road signage",
      category: "assets",
      assetType: "Signage",
      icon: FileSpreadsheet,
      color: "text-blue-500",
      columns: [
        { name: "Reference Number", description: "Unique asset identifier", type: "text", required: true, example: "SG-2024-001" },
        { name: "Asset Type", description: "Must be 'Signage'", type: "text", required: true, example: "Signage" },
        { name: "Name", description: "Descriptive name", type: "text", required: false, example: "Speed Limit 60 km/h" },
        { name: "Installer", description: "Installation contractor", type: "text", required: false, example: "ABC Roads Ltd" },
        { name: "Region", description: "Depot or region", type: "text", required: false, example: "North Region" },
        { name: "Road Number", description: "Road identifier", type: "text", required: false, example: "A1" },
        { name: "Road Name", description: "Road name", type: "text", required: false, example: "Main Highway" },
        { name: "Kilometer", description: "Chainage in KM", type: "number", required: false, example: "12.5" },
        { name: "Latitude", description: "GPS latitude", type: "number", required: false, example: "-1.286389" },
        { name: "Longitude", description: "GPS longitude", type: "number", required: false, example: "36.817223" },
        { name: "Install Date", description: "Installation date (YYYY-MM-DD)", type: "date", required: false, example: "2024-01-15" },
        { name: "Expected Life", description: "Expected lifespan in years", type: "number", required: false, example: "15" },
        { name: "Original Cost", description: "Unit cost in currency", type: "number", required: false, example: "2500" },
        { name: "Notes", description: "Additional remarks", type: "text", required: false, example: "Reflective coating applied" },
      ],
      exampleData: [
        {
          "Reference Number": "SG-2024-001",
          "Asset Type": "Signage",
          "Name": "Speed Limit 60 km/h",
          "Installer": "ABC Roads Ltd",
          "Region": "North Region",
          "Road Number": "A1",
          "Road Name": "Main Highway",
          "Kilometer": 12.5,
          "Latitude": -1.286389,
          "Longitude": 36.817223,
          "Install Date": "2024-01-15",
          "Expected Life": 15,
          "Original Cost": 2500,
          "Notes": "Reflective coating applied",
        },
        {
          "Reference Number": "SG-2024-002",
          "Asset Type": "Signage",
          "Name": "Stop Sign",
          "Installer": "ABC Roads Ltd",
          "Region": "North Region",
          "Road Number": "A1",
          "Road Name": "Main Highway",
          "Kilometer": 15.2,
          "Latitude": -1.290123,
          "Longitude": 36.820456,
          "Install Date": "2024-02-20",
          "Expected Life": 15,
          "Original Cost": 1800,
          "Notes": "",
        },
      ],
    },
    {
      id: "guardrail-assets",
      name: "Guardrails",
      description: "Import guardrails and safety barriers",
      category: "assets",
      assetType: "Guardrail",
      icon: FileSpreadsheet,
      color: "text-green-500",
      columns: [
        { name: "Reference Number", description: "Unique asset identifier", type: "text", required: true, example: "GR-2024-001" },
        { name: "Asset Type", description: "Must be 'Guardrail'", type: "text", required: true, example: "Guardrail" },
        { name: "Name", description: "Descriptive name", type: "text", required: false, example: "W-Beam Guardrail Section A" },
        { name: "Installer", description: "Installation contractor", type: "text", required: false, example: "SafeRoads Inc" },
        { name: "Region", description: "Depot or region", type: "text", required: false, example: "Central Region" },
        { name: "Road Number", description: "Road identifier", type: "text", required: false, example: "B2" },
        { name: "Road Name", description: "Road name", type: "text", required: false, example: "Mountain Pass Road" },
        { name: "Kilometer", description: "Chainage in KM", type: "number", required: false, example: "8.3" },
        { name: "Latitude", description: "GPS latitude", type: "number", required: false, example: "-1.295678" },
        { name: "Longitude", description: "GPS longitude", type: "number", required: false, example: "36.825432" },
        { name: "Install Date", description: "Installation date (YYYY-MM-DD)", type: "date", required: false, example: "2023-11-10" },
        { name: "Expected Life", description: "Expected lifespan in years", type: "number", required: false, example: "25" },
        { name: "Original Cost", description: "Unit cost in currency", type: "number", required: false, example: "15000" },
        { name: "Notes", description: "Additional remarks", type: "text", required: false, example: "50m section" },
      ],
      exampleData: [
        {
          "Reference Number": "GR-2024-001",
          "Asset Type": "Guardrail",
          "Name": "W-Beam Guardrail Section A",
          "Installer": "SafeRoads Inc",
          "Region": "Central Region",
          "Road Number": "B2",
          "Road Name": "Mountain Pass Road",
          "Kilometer": 8.3,
          "Latitude": -1.295678,
          "Longitude": 36.825432,
          "Install Date": "2023-11-10",
          "Expected Life": 25,
          "Original Cost": 15000,
          "Notes": "50m section",
        },
      ],
    },
    {
      id: "traffic-signal-assets",
      name: "Traffic Signals",
      description: "Import traffic lights and signals",
      category: "assets",
      assetType: "Traffic Signal",
      icon: FileSpreadsheet,
      color: "text-yellow-500",
      columns: [
        { name: "Reference Number", description: "Unique asset identifier", type: "text", required: true, example: "TS-2024-001" },
        { name: "Asset Type", description: "Must be 'Traffic Signal'", type: "text", required: true, example: "Traffic Signal" },
        { name: "Name", description: "Descriptive name", type: "text", required: false, example: "4-Way Traffic Light" },
        { name: "Installer", description: "Installation contractor", type: "text", required: false, example: "Smart Traffic Solutions" },
        { name: "Region", description: "Depot or region", type: "text", required: false, example: "City Center" },
        { name: "Road Number", description: "Road identifier", type: "text", required: false, example: "R3" },
        { name: "Road Name", description: "Road name", type: "text", required: false, example: "Junction Avenue" },
        { name: "Kilometer", description: "Chainage in KM", type: "number", required: false, example: "0.5" },
        { name: "Latitude", description: "GPS latitude", type: "number", required: false, example: "-1.283456" },
        { name: "Longitude", description: "GPS longitude", type: "number", required: false, example: "36.823789" },
        { name: "Install Date", description: "Installation date (YYYY-MM-DD)", type: "date", required: false, example: "2024-03-01" },
        { name: "Expected Life", description: "Expected lifespan in years", type: "number", required: false, example: "20" },
        { name: "Original Cost", description: "Unit cost in currency", type: "number", required: false, example: "45000" },
        { name: "Notes", description: "Additional remarks", type: "text", required: false, example: "Solar powered with battery backup" },
      ],
      exampleData: [
        {
          "Reference Number": "TS-2024-001",
          "Asset Type": "Traffic Signal",
          "Name": "4-Way Traffic Light",
          "Installer": "Smart Traffic Solutions",
          "Region": "City Center",
          "Road Number": "R3",
          "Road Name": "Junction Avenue",
          "Kilometer": 0.5,
          "Latitude": -1.283456,
          "Longitude": 36.823789,
          "Install Date": "2024-03-01",
          "Expected Life": 20,
          "Original Cost": 45000,
          "Notes": "Solar powered with battery backup",
        },
      ],
    },
    {
      id: "general-assets",
      name: "General Assets (All Types)",
      description: "Universal template for any asset type",
      category: "assets",
      icon: FileSpreadsheet,
      color: "text-slate-500",
      columns: [
        { name: "Reference Number", description: "Unique asset identifier", type: "text", required: true, example: "ASSET-001" },
        { name: "Asset Type", description: "Asset type (Signage, Guardrail, Traffic Signal, Safety Barrier)", type: "text", required: true, example: "Signage" },
        { name: "Name", description: "Descriptive name", type: "text", required: false, example: "Speed Limit Sign" },
        { name: "Installer", description: "Installation contractor", type: "text", required: false, example: "ABC Roads Ltd" },
        { name: "Region", description: "Depot or region", type: "text", required: false, example: "North Region" },
        { name: "Road Number", description: "Road identifier", type: "text", required: false, example: "A1" },
        { name: "Road Name", description: "Road name", type: "text", required: false, example: "Main Highway" },
        { name: "Kilometer", description: "Chainage in KM", type: "number", required: false, example: "12.5" },
        { name: "Latitude", description: "GPS latitude", type: "number", required: false, example: "-1.286389" },
        { name: "Longitude", description: "GPS longitude", type: "number", required: false, example: "36.817223" },
        { name: "Install Date", description: "Installation date (YYYY-MM-DD)", type: "date", required: false, example: "2024-01-15" },
        { name: "Expected Life", description: "Expected lifespan in years", type: "number", required: false, example: "15" },
        { name: "Original Cost", description: "Unit cost in currency", type: "number", required: false, example: "2500" },
        { name: "Notes", description: "Additional remarks", type: "text", required: false, example: "Additional notes here" },
      ],
      exampleData: [
        {
          "Reference Number": "SG-001",
          "Asset Type": "Signage",
          "Name": "Speed Limit 60 km/h",
          "Installer": "ABC Roads Ltd",
          "Region": "North Region",
          "Road Number": "A1",
          "Road Name": "Main Highway",
          "Kilometer": 12.5,
          "Latitude": -1.286389,
          "Longitude": 36.817223,
          "Install Date": "2024-01-15",
          "Expected Life": 15,
          "Original Cost": 2500,
          "Notes": "",
        },
        {
          "Reference Number": "GR-001",
          "Asset Type": "Guardrail",
          "Name": "W-Beam Section A",
          "Installer": "SafeRoads Inc",
          "Region": "Central Region",
          "Road Number": "B2",
          "Road Name": "Mountain Pass",
          "Kilometer": 8.3,
          "Latitude": -1.295678,
          "Longitude": 36.825432,
          "Install Date": "2023-11-10",
          "Expected Life": 25,
          "Original Cost": 15000,
          "Notes": "50m section",
        },
        {
          "Reference Number": "TS-001",
          "Asset Type": "Traffic Signal",
          "Name": "4-Way Traffic Light",
          "Installer": "Smart Traffic Solutions",
          "Region": "City Center",
          "Road Number": "R3",
          "Road Name": "Junction Avenue",
          "Kilometer": 0.5,
          "Latitude": -1.283456,
          "Longitude": 36.823789,
          "Install Date": "2024-03-01",
          "Expected Life": 20,
          "Original Cost": 45000,
          "Notes": "Solar powered",
        },
      ],
    },
  ];

  const downloadTemplate = (template: TemplateInfo, format: "xlsx" | "csv") => {
    setDownloading(template.id);
    
    try {
      // Create worksheet with column headers
      const headers = template.columns.map(col => col.name);
      
      // Create instructions row
      const instructions = template.columns.map(col => 
        `${col.description} (${col.required ? 'REQUIRED' : 'optional'}) - Example: ${col.example}`
      );
      
      // Create the worksheet data
      const wsData = [
        headers,
        instructions,
        ...template.exampleData,
      ];
      
      const ws = XLSX.utils.aoa_to_sheet([headers]);
      XLSX.utils.sheet_add_aoa(ws, [instructions], { origin: 1 });
      XLSX.utils.sheet_add_json(ws, template.exampleData, { origin: 2, skipHeader: true });
      
      // Set column widths
      const colWidths = template.columns.map(col => ({
        wch: Math.max(col.name.length, 20)
      }));
      ws['!cols'] = colWidths;
      
      // Style the header row (bold)
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const address = XLSX.utils.encode_col(C) + "1";
        if (!ws[address]) continue;
        ws[address].s = {
          font: { bold: true },
          fill: { fgColor: { rgb: "CCCCCC" } }
        };
      }
      
      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Template");
      
      // Add Instructions sheet
      const instructionsWs = XLSX.utils.aoa_to_sheet([
        ["Template Instructions"],
        [""],
        ["Template Name:", template.name],
        ["Description:", template.description],
        [""],
        ["Column Definitions:"],
        ["Column Name", "Type", "Required", "Description", "Example"],
        ...template.columns.map(col => [
          col.name,
          col.type,
          col.required ? "Yes" : "No",
          col.description,
          col.example
        ]),
        [""],
        ["Important Notes:"],
        ["1. Do not delete or rename the column headers"],
        ["2. You can delete row 2 (instructions) before importing"],
        ["3. Required fields must have values"],
        ["4. Date format must be YYYY-MM-DD"],
        ["5. Delete the example rows and add your own data"],
        ["6. You can add as many rows as needed"],
      ]);
      
      XLSX.utils.book_append_sheet(wb, instructionsWs, "Instructions");
      
      // Generate filename
      const filename = `${template.name.replace(/\s+/g, '_')}_Template.${format}`;
      
      // Download
      if (format === "xlsx") {
        XLSX.writeFile(wb, filename);
      } else {
        XLSX.writeFile(wb, filename, { bookType: 'csv' });
      }
      
      toast.success(`Template downloaded: ${filename}`);
    } catch (error) {
      console.error("Error downloading template:", error);
      toast.error("Failed to download template");
    } finally {
      setDownloading(null);
    }
  };

  const assetTemplates = templates.filter(t => t.category === "assets");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Template Library</h1>
        <p className="text-muted-foreground">
          Download pre-formatted templates to simplify data imports
        </p>
      </div>

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>How to use templates:</strong> Download a template, fill it with your data, then upload it in the{" "}
          <a href="/data" className="underline font-medium">Data Management</a> page. 
          Each template includes example data and instructions.
        </AlertDescription>
      </Alert>

      {/* Templates Grid */}
      <Tabs defaultValue="assets" className="space-y-6">
        <TabsList>
          <TabsTrigger value="assets">Asset Templates</TabsTrigger>
          <TabsTrigger value="guide">Import Guide</TabsTrigger>
        </TabsList>

        <TabsContent value="assets" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {assetTemplates.map((template) => {
              const Icon = template.icon;
              return (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <Icon className={`w-6 h-6 ${template.color} flex-shrink-0 mt-1`} />
                        <div>
                          <CardTitle className="text-lg">{template.name}</CardTitle>
                          <CardDescription className="mt-1">
                            {template.description}
                          </CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Template Info */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="w-4 h-4" />
                      <span>{template.columns.length} columns</span>
                      <span>•</span>
                      <span>{template.exampleData.length} example{template.exampleData.length !== 1 ? 's' : ''}</span>
                    </div>

                    {/* Required Fields */}
                    <div>
                      <p className="text-sm font-medium mb-2">Required Fields:</p>
                      <div className="flex flex-wrap gap-1">
                        {template.columns
                          .filter(col => col.required)
                          .map(col => (
                            <Badge key={col.name} variant="secondary" className="text-xs">
                              {col.name}
                            </Badge>
                          ))}
                      </div>
                    </div>

                    {/* Download Buttons */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={() => downloadTemplate(template, "xlsx")}
                        disabled={downloading === template.id}
                        className="flex-1"
                      >
                        {downloading === template.id ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Downloading...
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4 mr-2" />
                            Download Excel
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => downloadTemplate(template, "csv")}
                        disabled={downloading === template.id}
                        variant="outline"
                      >
                        CSV
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="guide" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Step-by-Step Import Guide</CardTitle>
              <CardDescription>Follow these steps for successful data imports</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Step 1 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  1
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Download Template</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Choose the template that matches your asset type or use the General Assets template for mixed imports.
                  </p>
                  <Button size="sm" variant="outline" onClick={() => downloadTemplate(templates[3], "xlsx")}>
                    <Download className="w-4 h-4 mr-2" />
                    Download General Template
                  </Button>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Fill in Your Data</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Open the template in Excel or Google Sheets. Delete the example rows and add your own data.
                  </p>
                  <Alert className="mt-2">
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      <strong>Tips:</strong>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        <li>Keep column headers exactly as shown</li>
                        <li>Fill all required fields (marked in row 2)</li>
                        <li>Use date format: YYYY-MM-DD (e.g., 2024-01-15)</li>
                        <li>Asset Type must match exactly: Signage, Guardrail, Traffic Signal, or Safety Barrier</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  3
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Upload Template</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Save your file and upload it in the Data Management page.
                  </p>
                  <Button size="sm" variant="outline" asChild>
                    <a href="/data">
                      <Upload className="w-4 h-4 mr-2" />
                      Go to Data Management
                    </a>
                  </Button>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  4
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Review Results</h3>
                  <p className="text-sm text-muted-foreground">
                    After upload, check the import summary. Any errors will be displayed with specific row information.
                  </p>
                </div>
              </div>

              {/* Common Issues */}
              <div className="mt-6 pt-6 border-t">
                <h3 className="font-semibold mb-3">Common Issues & Solutions</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="font-medium text-destructive">❌ "Invalid asset type"</p>
                    <p className="text-muted-foreground">
                      Solution: Asset Type must be exactly one of: Signage, Guardrail, Traffic Signal, Safety Barrier
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-destructive">❌ "Missing required fields"</p>
                    <p className="text-muted-foreground">
                      Solution: Ensure Reference Number and Asset Type are filled for every row
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-destructive">❌ "Duplicate asset reference"</p>
                    <p className="text-muted-foreground">
                      Solution: Each Reference Number must be unique across all assets
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
