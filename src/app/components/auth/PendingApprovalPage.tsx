import { Link } from "react-router-dom";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Clock } from "lucide-react";
import logoImage from "figma:asset/64eb9bc8e330e96a962c9d775073b6c24bad7ae0.png";

export default function PendingApprovalPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#010D13] via-[#1a2d32] to-[#010D13] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <Clock className="w-16 h-16 text-warning animate-pulse" />
              </div>
            </div>
            <CardTitle>Pending Approval</CardTitle>
            <CardDescription>
              Your registration has been successfully submitted
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <p className="text-sm">
                <strong>What's next?</strong>
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>An administrator will review your registration</li>
                <li>You'll receive an email notification once approved</li>
                <li>You can then sign in with your credentials</li>
              </ul>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                This process typically takes 1-2 business days. Please check your email for updates.
              </p>
            </div>
          </CardContent>

          <CardFooter>
            <Link to="/login" className="w-full">
              <Button variant="outline" className="w-full">
                Return to Login
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}