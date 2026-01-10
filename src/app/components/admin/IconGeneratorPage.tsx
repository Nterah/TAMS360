import { Badge } from "../ui/badge";
import { Download, ExternalLink, CheckCircle, AlertCircle, Info } from "lucide-react";
import { Alert, AlertDescription } from "../ui/alert";
import Logo from "../ui/Logo";

export default function IconGeneratorPage() {
  const downloadLogo = () => {
    // Create SVG blob and download
    const svgElement = document.getElementById('tams360-logo-svg');
    if (svgElement) {
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const blob = new Blob([svgData], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "tams360-logo.svg";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const iconStatus = [
    { name: "favicon.svg", status: "complete", path: "/public/favicon.svg" },
    { name: "favicon.ico", status: "needed", path: "/public/favicon.ico" },
    { name: "icon-192x192.png", status: "needed", path: "/public/icon-192x192.png" },
    { name: "icon-512x512.png", status: "needed", path: "/public/icon-512x512.png" },
    { name: "apple-touch-icon.png", status: "needed", path: "/public/apple-touch-icon.png" },
  ];

  const tools = [
    {
      name: "RealFaviconGenerator",
      url: "https://realfavicongenerator.net/",
      description: "Generate all icon sizes with one upload",
      recommended: true,
    },
    {
      name: "Favicon.io",
      url: "https://favicon.io/favicon-converter/",
      description: "Simple favicon converter tool",
      recommended: false,
    },
    {
      name: "PWA Builder",
      url: "https://www.pwabuilder.com/imageGenerator",
      description: "PWA-specific icon generator",
      recommended: false,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Icon & Favicon Generator</h1>
        <p className="text-muted-foreground">
          Generate PWA icons and favicons from your TAMS360 logo
        </p>
      </div>

      {/* Alert */}
      <Alert>
        <Info className="w-4 h-4" />
        <AlertDescription>
          <strong>Quick Start:</strong> Download your logo below, upload it to{" "}
          <a
            href="https://realfavicongenerator.net/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline"
          >
            RealFaviconGenerator.net
          </a>
          , then place the generated files in the <code className="bg-muted px-1 py-0.5 rounded">/public</code> folder.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Logo Preview & Download */}
        <Card>
          <CardHeader>
            <CardTitle>TAMS360 Logo</CardTitle>
            <CardDescription>Download your logo to generate icons</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-[#010D13] p-8 rounded-lg flex items-center justify-center">
              <div id="tams360-logo-svg">
                <Logo width={200} height={80} />
              </div>
            </div>
            <Button onClick={downloadLogo} className="w-full">
              <Download className="w-4 h-4 mr-2" />
              Download Logo (SVG)
            </Button>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>
                <strong>Format:</strong> PNG with transparency
              </p>
              <p>
                <strong>Design:</strong> Circular logo with location pin and TAMS360 branding
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Icon Status */}
        <Card>
          <CardHeader>
            <CardTitle>Required Icon Files</CardTitle>
            <CardDescription>Status of PWA and browser icons</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {iconStatus.map((icon) => (
                <div
                  key={icon.name}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {icon.status === "complete" ? (
                      <CheckCircle className="w-5 h-5 text-success" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-warning" />
                    )}
                    <div>
                      <p className="font-medium text-sm">{icon.name}</p>
                      <p className="text-xs text-muted-foreground">{icon.path}</p>
                    </div>
                  </div>
                  <Badge variant={icon.status === "complete" ? "default" : "secondary"}>
                    {icon.status === "complete" ? "Ready" : "Needed"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Generation Tools */}
      <Card>
        <CardHeader>
          <CardTitle>Online Icon Generators</CardTitle>
          <CardDescription>Upload your logo to these tools to generate all required sizes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {tools.map((tool) => (
              <Card key={tool.name} className={tool.recommended ? "border-primary" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{tool.name}</CardTitle>
                    {tool.recommended && (
                      <Badge className="bg-success text-xs">Recommended</Badge>
                    )}
                  </div>
                  <CardDescription className="text-xs">
                    {tool.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => window.open(tool.url, "_blank")}
                  >
                    <ExternalLink className="w-3 h-3 mr-2" />
                    Open Tool
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Step-by-Step Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm shrink-0">
                1
              </div>
              <div>
                <p className="font-medium">Download the Logo</p>
                <p className="text-sm text-muted-foreground">
                  Click "Download Logo" above to save the TAMS360 logo to your computer
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm shrink-0">
                2
              </div>
              <div>
                <p className="font-medium">Upload to Icon Generator</p>
                <p className="text-sm text-muted-foreground">
                  Go to{" "}
                  <a
                    href="https://realfavicongenerator.net/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    RealFaviconGenerator.net
                  </a>{" "}
                  and upload your logo
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm shrink-0">
                3
              </div>
              <div>
                <p className="font-medium">Configure Settings</p>
                <p className="text-sm text-muted-foreground">
                  Use background color <code className="bg-muted px-1 py-0.5 rounded">#010D13</code> for iOS and Android icons
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm shrink-0">
                4
              </div>
              <div>
                <p className="font-medium">Download & Extract</p>
                <p className="text-sm text-muted-foreground">
                  Download the generated package and extract the files
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm shrink-0">
                5
              </div>
              <div>
                <p className="font-medium">Place Files in /public Folder</p>
                <p className="text-sm text-muted-foreground">
                  Rename files to match the required names and place them in your project's{" "}
                  <code className="bg-muted px-1 py-0.5 rounded">/public</code> folder
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm shrink-0">
                6
              </div>
              <div>
                <p className="font-medium">Test & Verify</p>
                <p className="text-sm text-muted-foreground">
                  Clear browser cache (Ctrl+Shift+R) and check that icons appear correctly in browser tabs, PWA
                  install prompt, and when added to home screen
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Technical Details */}
      <Card>
        <CardHeader>
          <CardTitle>Technical Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div>
              <p className="font-medium mb-1">Brand Colors:</p>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-[#010D13]">Deep Navy #010D13</Badge>
                <Badge className="bg-[#39AEDF]">Sky Blue #39AEDF</Badge>
                <Badge className="bg-[#5DB32A]">Green #5DB32A</Badge>
                <Badge className="bg-[#F8D227] text-black">Yellow #F8D227</Badge>
                <Badge className="bg-[#455B5E]">Slate Grey #455B5E</Badge>
              </div>
            </div>
            <div>
              <p className="font-medium mb-1">Icon Sizes:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>
                  <code>favicon.ico</code> - 32×32px (classic browser favicon)
                </li>
                <li>
                  <code>icon-192x192.png</code> - 192×192px (PWA standard icon)
                </li>
                <li>
                  <code>icon-512x512.png</code> - 512×512px (PWA high-res icon)
                </li>
                <li>
                  <code>apple-touch-icon.png</code> - 180×180px (iOS home screen with 20px padding)
                </li>
              </ul>
            </div>
            <div>
              <p className="font-medium mb-1">Important Notes:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Use solid background (#010D13) for iOS icons - no transparency</li>
                <li>Keep logo centered and maintain aspect ratio</li>
                <li>Test on both light and dark system themes</li>
                <li>Clear browser cache after updating icons</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}