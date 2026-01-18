import { useState, useCallback } from "react";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Progress } from "@/app/components/ui/progress";
import { Alert, AlertDescription } from "@/app/components/ui/alert";
import { Upload, FolderOpen, Image as ImageIcon, CheckCircle2, XCircle, AlertCircle, FileImage } from "lucide-react";
import { toast } from "sonner";
import { publicAnonKey, projectId } from "/utils/supabase/info";

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-c894a9ff`;

interface ParsedPhoto {
  file: File;
  assetRef: string;
  assetTypeFolder: string;
  photoNumber: string; // "0", "1", "1.1", "6", etc.
  photoType: "main" | "location" | "component" | "sub-component";
  componentNumber?: number;
  subNumber?: number;
  path: string;
}

interface UploadResult {
  assetRef: string;
  photoNumber: string;
  success: boolean;
  url?: string;
  error?: string;
}

export function ImportPhotosPage() {
  const [selectedFiles, setSelectedFiles] = useState<ParsedPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const [parsing, setParsing] = useState(false);

  const parsePhotoMetadata = (file: File): ParsedPhoto | null => {
    // Extract path components
    const pathParts = file.webkitRelativePath.split("/");
    
    // Support TWO folder structures:
    // 1. Full path: [...]/Inspection Photos/[AssetTypeFolder]/[AssetRef]/[PhotoNumber].jpg
    // 2. Short path: [AssetTypeFolder]/[AssetRef]/[PhotoNumber].jpg (when selecting subfolder)
    // 3. Minimal path: [AssetRef]/[PhotoNumber].jpg (when selecting asset type folder directly)
    
    let assetTypeFolder: string;
    let assetRef: string;
    let fileName: string;
    
    const inspectionPhotosIndex = pathParts.findIndex(p => p === "Inspection Photos");
    
    if (inspectionPhotosIndex !== -1 && pathParts.length >= inspectionPhotosIndex + 4) {
      // Full path structure
      assetTypeFolder = pathParts[inspectionPhotosIndex + 1]; // e.g., "D1 - Traffic Signs photos M2"
      assetRef = pathParts[inspectionPhotosIndex + 2]; // e.g., "TS-001"
      fileName = pathParts[pathParts.length - 1]; // e.g., "1.1.jpg"
    } else if (pathParts.length === 3) {
      // Short path: [AssetTypeFolder]/[AssetRef]/[PhotoNumber].jpg
      assetTypeFolder = pathParts[0];
      assetRef = pathParts[1];
      fileName = pathParts[2];
    } else if (pathParts.length === 2) {
      // Minimal path: [AssetRef]/[PhotoNumber].jpg (selected asset type folder directly)
      assetTypeFolder = "Unknown"; // We don't have this info
      assetRef = pathParts[0];
      fileName = pathParts[1];
    } else {
      console.warn("⚠️ Invalid path structure:", file.webkitRelativePath, "- Expected 2-4 folder levels");
      return null;
    }
    
    // Extract photo number (remove extension)
    const photoNumber = fileName.replace(/\.(jpg|jpeg|png|heic)$/i, "");
    
    // Determine photo type
    let photoType: ParsedPhoto["photoType"] = "component";
    let componentNumber: number | undefined;
    let subNumber: number | undefined;

    if (photoNumber === "6") {
      photoType = "main";
    } else if (photoNumber === "0") {
      photoType = "location";
    } else if (photoNumber.includes(".")) {
      // Sub-component (e.g., "1.1", "1.2")
      photoType = "sub-component";
      const [comp, sub] = photoNumber.split(".");
      componentNumber = parseInt(comp);
      subNumber = parseInt(sub);
    } else {
      // Regular component (e.g., "1", "2", "3")
      photoType = "component";
      componentNumber = parseInt(photoNumber);
    }

    return {
      file,
      assetRef,
      assetTypeFolder,
      photoNumber,
      photoType,
      componentNumber,
      subNumber,
      path: file.webkitRelativePath,
    };
  };

  const handleFolderSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setParsing(true);
    toast.info(`Parsing ${files.length} files...`);

    const parsedPhotos: ParsedPhoto[] = [];
    const invalidFiles: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Only process image files
      if (!file.type.match(/^image\/(jpeg|jpg|png|heic)/i)) {
        continue;
      }

      const parsed = parsePhotoMetadata(file);
      if (parsed) {
        parsedPhotos.push(parsed);
      } else {
        invalidFiles.push(file.webkitRelativePath);
      }
    }

    setSelectedFiles(parsedPhotos);
    setParsing(false);

    // Show summary
    const assetRefs = new Set(parsedPhotos.map(p => p.assetRef));
    toast.success(`Parsed ${parsedPhotos.length} photos for ${assetRefs.size} assets`);

    if (invalidFiles.length > 0) {
      console.warn("Invalid files skipped:", invalidFiles);
      toast.warning(`Skipped ${invalidFiles.length} files with invalid structure`);
    }
  }, []);

  const uploadPhotos = async () => {
    if (selectedFiles.length === 0) {
      toast.error("No photos selected");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadResults([]);

    const accessToken = localStorage.getItem("access_token");
    const results: UploadResult[] = [];

    // Upload in batches of 10
    const batchSize = 10;
    for (let i = 0; i < selectedFiles.length; i += batchSize) {
      const batch = selectedFiles.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (photo) => {
        try {
          // Create form data
          const formData = new FormData();
          formData.append("file", photo.file);
          formData.append("assetRef", photo.assetRef);
          formData.append("photoNumber", photo.photoNumber);
          formData.append("photoType", photo.photoType);
          if (photo.componentNumber !== undefined) {
            formData.append("componentNumber", photo.componentNumber.toString());
          }
          if (photo.subNumber !== undefined) {
            formData.append("subNumber", photo.subNumber.toString());
          }

          const response = await fetch(`${API_URL}/photos/upload`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken || publicAnonKey}`,
            },
            body: formData,
          });

          if (!response.ok) {
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            try {
              const errorData = await response.json();
              errorMessage = errorData.error || errorData.message || errorMessage;
              if (errorData.hint) {
                errorMessage += ` (${errorData.hint})`;
              }
            } catch {
              // If JSON parsing fails, try text
              const errorText = await response.text();
              if (errorText) {
                errorMessage = errorText;
              }
            }
            throw new Error(errorMessage);
          }

          const data = await response.json();

          return {
            assetRef: photo.assetRef,
            photoNumber: photo.photoNumber,
            success: true,
            url: data.url,
          };
        } catch (error: any) {
          console.error(`❌ Failed to upload ${photo.assetRef}/${photo.photoNumber}:`, error);
          return {
            assetRef: photo.assetRef,
            photoNumber: photo.photoNumber,
            success: false,
            error: error.message || String(error),
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Update progress
      const progress = Math.round(((i + batch.length) / selectedFiles.length) * 100);
      setUploadProgress(progress);
    }

    setUploadResults(results);
    setUploading(false);

    // Show summary
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    if (failed === 0) {
      toast.success(`✅ Successfully uploaded ${successful} photos!`);
    } else {
      toast.warning(`Uploaded ${successful} photos, ${failed} failed`);
    }
  };

  const groupedPhotos = selectedFiles.reduce((acc, photo) => {
    if (!acc[photo.assetRef]) {
      acc[photo.assetRef] = [];
    }
    acc[photo.assetRef].push(photo);
    return acc;
  }, {} as Record<string, ParsedPhoto[]>);

  const assetCount = Object.keys(groupedPhotos).length;
  const mainPhotos = selectedFiles.filter(p => p.photoType === "main").length;
  const componentPhotos = selectedFiles.filter(p => p.photoType === "component" || p.photoType === "sub-component").length;
  const locationPhotos = selectedFiles.filter(p => p.photoType === "location").length;

  const successCount = uploadResults.filter(r => r.success).length;
  const failedCount = uploadResults.filter(r => !r.success).length;

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Import Inspection Photos</h1>
        <p className="text-muted-foreground">
          Bulk upload photos from your local folder structure
        </p>
      </div>

      {/* Upload Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Select Inspection Photos Folder
          </CardTitle>
          <CardDescription>
            Select the "Inspection Photos" folder containing asset type subfolders and individual asset folders
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Folder Structure Info */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Expected Structure:</strong>
                <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto">
{`Inspection Photos/
  ├── 01 - Traffic Signs photos M2/
  │   ├── HN-TEST-0001/
  │   │   ├── 0.jpg (location photo)
  │   │   ├── 1.jpg (component 1)
  │   │   ├── 1.1.jpg (component 1, sub-photo)
  │   │   ├── 6.jpg (main asset photo)
  │   │   └── ...
  ├── 02 - Traffic Signals M2 Photos/
  └── ...`}
                </pre>
              </AlertDescription>
            </Alert>

            {/* Folder Selector */}
            <div className="flex items-center gap-4">
              <input
                type="file"
                id="folder-input"
                // @ts-ignore - webkitdirectory is not in TypeScript types
                webkitdirectory=""
                directory=""
                multiple
                onChange={handleFolderSelect}
                className="hidden"
                disabled={uploading}
              />
              <label htmlFor="folder-input">
                <Button
                  type="button"
                  size="lg"
                  disabled={uploading || parsing}
                  onClick={() => document.getElementById("folder-input")?.click()}
                  asChild
                >
                  <span>
                    <Upload className="mr-2 h-5 w-5" />
                    {parsing ? "Parsing..." : "Select Folder"}
                  </span>
                </Button>
              </label>

              {selectedFiles.length > 0 && !uploading && (
                <Button
                  size="lg"
                  onClick={uploadPhotos}
                  className="bg-[#5DB32A] hover:bg-[#4a9022]"
                >
                  <Upload className="mr-2 h-5 w-5" />
                  Upload {selectedFiles.length} Photos
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      {selectedFiles.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Parsed Photos Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-[#010D13]">{selectedFiles.length}</div>
                <div className="text-sm text-muted-foreground">Total Photos</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-[#39AEDF]">{assetCount}</div>
                <div className="text-sm text-muted-foreground">Assets</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-[#F8D227]">{mainPhotos}</div>
                <div className="text-sm text-muted-foreground">Main Photos</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-[#5DB32A]">{componentPhotos}</div>
                <div className="text-sm text-muted-foreground">Component Photos</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-[#455B5E]">{locationPhotos}</div>
                <div className="text-sm text-muted-foreground">Location Photos</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Progress */}
      {uploading && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Uploading Photos...</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Progress value={uploadProgress} className="w-full" />
              <p className="text-sm text-muted-foreground text-center">
                {uploadProgress}% - Uploaded {Math.round((uploadProgress / 100) * selectedFiles.length)} of {selectedFiles.length} photos
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Results */}
      {uploadResults.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Upload Results</span>
              <div className="flex gap-2">
                <Badge variant="outline" className="bg-green-50">
                  <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />
                  {successCount} Success
                </Badge>
                {failedCount > 0 && (
                  <Badge variant="outline" className="bg-red-50">
                    <XCircle className="h-3 w-3 mr-1 text-red-600" />
                    {failedCount} Failed
                  </Badge>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto space-y-2">
              {uploadResults.map((result, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-2 rounded border ${
                    result.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {result.success ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className="font-mono text-sm">
                      {result.assetRef} / {result.photoNumber}
                    </span>
                  </div>
                  {result.error && (
                    <span className="text-xs text-red-600">{result.error}</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview (first 50 assets) */}
      {selectedFiles.length > 0 && !uploading && (
        <Card>
          <CardHeader>
            <CardTitle>Preview - First 50 Assets</CardTitle>
            <CardDescription>
              Review the parsed photo structure before uploading
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {Object.entries(groupedPhotos)
                .slice(0, 50)
                .map(([assetRef, photos]) => (
                  <div key={assetRef} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-lg">{assetRef}</h3>
                      <Badge variant="outline">{photos.length} photos</Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                      {photos.map((photo, idx) => (
                        <div key={idx} className="relative group">
                          <div className="aspect-square bg-muted rounded flex items-center justify-center overflow-hidden">
                            <img
                              src={URL.createObjectURL(photo.file)}
                              alt={`${photo.assetRef} - ${photo.photoNumber}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity rounded flex flex-col items-center justify-center text-white text-xs p-2">
                            <FileImage className="h-4 w-4 mb-1" />
                            <div className="font-semibold">{photo.photoNumber}</div>
                            <Badge
                              variant="secondary"
                              className={`mt-1 text-[10px] ${
                                photo.photoType === "main"
                                  ? "bg-yellow-500"
                                  : photo.photoType === "location"
                                  ? "bg-blue-500"
                                  : "bg-green-500"
                              }`}
                            >
                              {photo.photoType}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}