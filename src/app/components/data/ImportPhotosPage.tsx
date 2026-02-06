import { useState, useCallback, useEffect } from "react";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Progress } from "@/app/components/ui/progress";
import { Alert, AlertDescription } from "@/app/components/ui/alert";
import { Upload, FolderOpen, Image as ImageIcon, CheckCircle2, XCircle, AlertCircle, FileImage, LogIn } from "lucide-react";
import { toast } from "sonner";
import { supabase, API_URL } from "@/lib/supabaseClient";
import { getValidSession } from "@/app/utils/authHelper";

// Helper function to compress images in the browser
async function compressImage(file: File, maxSizeMB = 1): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Calculate new dimensions (max 1920x1920)
        const maxDim = 1920;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = (height / width) * maxDim;
            width = maxDim;
          } else {
            width = (width / height) * maxDim;
            height = maxDim;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Compress to JPEG with quality adjustment
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          'image/jpeg',
          0.8 // 80% quality
        );
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

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
  const [sessionValid, setSessionValid] = useState<boolean | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);

  // Check session status on mount
  useEffect(() => {
    checkSession();
  }, []);

  // Check session status
  const checkSession = async () => {
    const result = await getValidSession();
    if (result.ok) {
      setSessionValid(true);
      setSessionError(null);
    } else {
      setSessionValid(false);
      setSessionError(result.reason === "missing_session" 
        ? "No active session. Please log in to upload photos." 
        : "Session expired. Please log in again.");
    }
    return result.ok;
  };

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
    if (parsedPhotos.length === 0) {
      toast.warning("No photos found in this folder. Please select the top 'Inspection Photos' folder that contains asset-type subfolders.");
    } else {
      const assetRefs = new Set(parsedPhotos.map(p => p.assetRef));
      toast.success(`Parsed ${parsedPhotos.length} photos for ${assetRefs.size} assets`);

      if (invalidFiles.length > 0) {
        console.warn("Invalid files skipped:", invalidFiles);
        toast.warning(`Skipped ${invalidFiles.length} files with invalid structure`);
      }
    }
  }, []);

  const uploadPhotos = async () => {
    if (selectedFiles.length === 0) {
      toast.error("No photos selected");
      return;
    }

    // Check session validity
    const sessionResult = await getValidSession();
    if (!sessionResult.ok) {
      // Session is invalid - show error and don't upload
      if (sessionResult.reason === "missing_session") {
        toast.error("No active session. Please log in to upload photos.");
      } else {
        toast.error("Session expired. Please log in again.");
      }
      setSessionValid(false);
      setSessionError(sessionResult.reason === "missing_session" 
        ? "No active session. Please log in to upload photos." 
        : "Session expired. Please log in again.");
      return;
    }
    
    let accessToken = sessionResult.access_token;
    console.log("🔑 Using valid access token from session");
    setSessionValid(true);
    setSessionError(null);

    setUploading(true);
    setUploadProgress(0);
    setUploadResults([]);

    const results: UploadResult[] = [];

    // Upload ONE photo at a time with compression
    for (let i = 0; i < selectedFiles.length; i++) {
      const photo = selectedFiles[i];
      let lastError: any = null;

      // Refresh session every 20 uploads to prevent expiration during long uploads
      if (i % 20 === 0 && i > 0) {
        console.log("🔄 Refreshing session...");
        const refreshedResult = await getValidSession();
        if (refreshedResult.ok) {
          accessToken = refreshedResult.access_token;
          console.log("✅ Session refreshed successfully");
        }
      }

      try {
        console.log(`📤 Uploading ${i + 1}/${selectedFiles.length}: ${photo.assetRef}/${photo.photoNumber}`);

        // 🔧 FIX: Convert folder naming (R01, R02, etc.) to database naming (001, 002, etc.)
        let normalizedAssetRef = photo.assetRef;
        
        // Check if asset ref ends with -R## (e.g., -R01, -R1, -R001)
        const rMatch = photo.assetRef.match(/-R(\d+)$/i);
        if (rMatch) {
          const number = rMatch[1]; // "01" or "1" or "001"
          const paddedNumber = number.padStart(3, '0'); // Ensure 3 digits: "001"
          normalizedAssetRef = photo.assetRef.replace(/-R\d+$/i, `-${paddedNumber}`);
          console.log(`🔄 Asset ref normalized: ${photo.assetRef} → ${normalizedAssetRef}`);
        }

        // Step 1: Compress the image in the browser
        let fileToUpload: Blob;
        const originalSize = photo.file.size;
        
        try {
          console.log(`🗜️ Compressing ${photo.file.name} (${(originalSize / 1024 / 1024).toFixed(2)}MB)`);
          fileToUpload = await compressImage(photo.file);
          const compressedSize = fileToUpload.size;
          console.log(`✅ Compressed to ${(compressedSize / 1024 / 1024).toFixed(2)}MB (${((1 - compressedSize / originalSize) * 100).toFixed(0)}% reduction)`);
        } catch (compressionError) {
          console.warn(`⚠️ Compression failed, using original file:`, compressionError);
          fileToUpload = photo.file;
        }

        // Step 2: Get signed upload URL from backend
        const fileExt = photo.file.name.split(".").pop() || "jpg";
        const urlResponse = await fetch(`${API_URL}/photos/get-upload-url`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            assetRef: normalizedAssetRef,  // Use normalized name for lookup!
            photoNumber: photo.photoNumber,
            fileExt: fileExt,
            fileType: photo.file.type,
          }),
        });

        if (!urlResponse.ok) {
          const errorData = await urlResponse.json();
          
          // If unauthorized, session expired - stop and ask user to re-login
          if (urlResponse.status === 401) {
            toast.error("Session expired. Please log in again and retry failed uploads.");
            throw new Error("Session expired - please log in again");
          }
          
          throw new Error(errorData.error || errorData.message || `HTTP ${urlResponse.status}`);
        }

        const { uploadUrl, filePath, assetRef, tenantId } = await urlResponse.json();

        // Step 3: Upload directly to Supabase Storage (bypasses Edge Function!)
        console.log(`☁️ Uploading to storage...`);
        const uploadResponse = await fetch(uploadUrl, {
          method: "PUT",
          body: fileToUpload,
          headers: {
            "Content-Type": photo.file.type,
            "x-upsert": "true",
          },
        });

        if (!uploadResponse.ok) {
          throw new Error(`Storage upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
        }

        // Step 4: Save metadata in database
        const metadataResponse = await fetch(`${API_URL}/photos/save-metadata`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            assetRef,  // Changed from assetId
            tenantId,
            filePath,
            photoNumber: photo.photoNumber,
            photoType: photo.photoType,
            componentNumber: photo.componentNumber,
            subNumber: photo.subNumber,
            fileSize: fileToUpload.size,
            fileType: photo.file.type,
          }),
        });

        if (!metadataResponse.ok) {
          const errorData = await metadataResponse.json();
          throw new Error(errorData.error || "Failed to save metadata");
        }

        const { url } = await metadataResponse.json();

        // ✅ Success!
        console.log(`✅ Success: ${photo.assetRef}/${photo.photoNumber}`);
        results.push({
          assetRef: photo.assetRef,
          photoNumber: photo.photoNumber,
          success: true,
          url: url,
        });

      } catch (error: any) {
        lastError = error;
        console.error(`❌ Failed: ${photo.assetRef}/${photo.photoNumber}:`, error);
        results.push({
          assetRef: photo.assetRef,
          photoNumber: photo.photoNumber,
          success: false,
          error: error.message || String(error),
        });

        // If session expired, stop uploading
        if (error.message?.includes("Session expired")) {
          setUploadResults([...results]);
          setUploading(false);
          return;
        }
      }

      // Update progress after each photo
      const progress = Math.round(((i + 1) / selectedFiles.length) * 100);
      setUploadProgress(progress);
      setUploadResults([...results]); // Update results in real-time
    }

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
            {/* Session Status Banner */}
            {sessionValid === false && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>
                    <strong>Session Expired:</strong> {sessionError}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-4"
                    onClick={() => {
                      window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
                    }}
                  >
                    <LogIn className="h-4 w-4 mr-2" />
                    Log In
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* Session Warning */}
            {failedCount > 200 && uploadResults.some(r => r.error?.includes("Unauthorized")) && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Session Expired:</strong> Your login session has expired. Please{" "}
                  <strong>log out and log back in</strong>, then click "Retry Failed Photos" to continue.
                </AlertDescription>
              </Alert>
            )}

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
              <label htmlFor="folder-input">\n                <Button
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
            {/* Asset Summary Stats */}
            {(() => {
              const assetGroups = uploadResults.reduce((acc, result) => {
                if (!acc[result.assetRef]) {
                  acc[result.assetRef] = [];
                }
                acc[result.assetRef].push(result);
                return acc;
              }, {} as Record<string, UploadResult[]>);

              const completeAssets = Object.values(assetGroups).filter(
                results => results.every(r => r.success)
              ).length;
              const partialAssets = Object.values(assetGroups).filter(
                results => results.some(r => r.success) && results.some(r => !r.success)
              ).length;
              const failedAssets = Object.values(assetGroups).filter(
                results => results.every(r => !r.success)
              ).length;

              return (
                <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-muted/30 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{completeAssets}</div>
                    <div className="text-xs text-muted-foreground">✅ Complete Assets</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{partialAssets}</div>
                    <div className="text-xs text-muted-foreground">⚠️ Partial Assets</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{failedAssets}</div>
                    <div className="text-xs text-muted-foreground">❌ Failed Assets</div>
                  </div>
                </div>
              );
            })()}

            {/* Grouped by Asset View */}
            <div className="max-h-96 overflow-y-auto space-y-3">
              {Object.entries(
                uploadResults.reduce((acc, result) => {
                  if (!acc[result.assetRef]) {
                    acc[result.assetRef] = [];
                  }
                  acc[result.assetRef].push(result);
                  return acc;
                }, {} as Record<string, UploadResult[]>)
              ).map(([assetRef, results]) => {
                const assetSuccess = results.filter(r => r.success).length;
                const assetFailed = results.filter(r => !r.success).length;
                const isComplete = assetFailed === 0;

                return (
                  <div
                    key={assetRef}
                    className={`border rounded-lg p-3 ${
                      isComplete ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {isComplete ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-yellow-600" />
                        )}
                        <span className="font-semibold font-mono">{assetRef}</span>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="bg-white">
                          ✅ {assetSuccess}
                        </Badge>
                        {assetFailed > 0 && (
                          <Badge variant="outline" className="bg-white text-red-600">
                            ❌ {assetFailed}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Show failed photos only */}
                    {assetFailed > 0 && (
                      <div className="mt-2 space-y-1">
                        {results
                          .filter(r => !r.success)
                          .map((result, idx) => (
                            <div
                              key={idx}
                              className="text-xs bg-white p-2 rounded border border-red-200"
                            >
                              <span className="font-mono text-red-700">
                                Photo {result.photoNumber}
                              </span>
                              {": "}
                              <span className="text-red-600">{result.error}</span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Retry Failed Button */}
            {failedCount > 0 && !uploading && (
              <div className="mt-4 pt-4 border-t">
                <Button
                  onClick={() => {
                    // Filter to only failed photos
                    const failedPhotos = uploadResults
                      .filter(r => !r.success)
                      .map(r => selectedFiles.find(
                        f => f.assetRef === r.assetRef && f.photoNumber === r.photoNumber
                      ))
                      .filter(Boolean) as ParsedPhoto[];
                    
                    setSelectedFiles(failedPhotos);
                    setUploadResults([]);
                    toast.info(`Retrying ${failedPhotos.length} failed photos...`);
                  }}
                  variant="outline"
                  className="w-full"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Retry {failedCount} Failed Photos Only
                </Button>
              </div>
            )}
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