"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardHeader } from "@/components/dashboard/header";
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  Server,
  Globe,
  Zap,
  Trash2,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

interface CompanyDetail {
  id: string;
  name: string;
  status: string;
  paperclipCompanyId: string | null;
  instanceUrl: string | null;
  creditsUsed: number;
  createdAt: string;
  updatedAt: string;
}

const statusColors: Record<
  string,
  "accent" | "secondary" | "default" | "destructive"
> = {
  running: "accent",
  stopped: "secondary",
  provisioning: "default",
  error: "destructive",
};

export default function InstanceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [paperclipStatus, setPaperclipStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCompany = useCallback(async () => {
    try {
      const res = await fetch(`/api/companies/${id}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError("Instance not found.");
          return;
        }
        setError("Failed to load instance.");
        return;
      }
      const data = await res.json();
      setCompany(data.company);
      setPaperclipStatus(data.paperclipStatus);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCompany();
  }, [fetchCompany]);

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this instance? This action cannot be undone."
      )
    )
      return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/companies/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/dashboard/instances");
      } else {
        setError("Failed to delete instance.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !company) {
    return (
      <>
        <DashboardHeader
          title="Instance"
          description=""
          actions={
            <Button
              variant="ghost"
              size="sm"
              className="gap-1"
              onClick={() => router.push("/dashboard/instances")}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          }
        />
        <Card className="py-16 text-center">
          <CardContent>
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-secondary-600">{error}</p>
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => router.push("/dashboard/instances")}
            >
              Back to Instances
            </Button>
          </CardContent>
        </Card>
      </>
    );
  }

  if (!company) return null;

  const isConnected = !!company.paperclipCompanyId && !!company.instanceUrl;
  const liveStatus = paperclipStatus ?? company.status;

  return (
    <>
      <DashboardHeader
        title={company.name}
        description="Instance details and management"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1"
              onClick={() => router.push("/dashboard/instances")}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1"
              onClick={() => {
                setLoading(true);
                fetchCompany();
              }}
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        }
      />

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive-50 p-3 text-sm text-destructive flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Instance info cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Server className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-secondary-400">Status</p>
                <Badge
                  variant={statusColors[liveStatus] ?? "secondary"}
                  className="mt-1"
                >
                  {liveStatus}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Zap className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-secondary-400">Credits Used</p>
                <p className="text-sm font-semibold text-secondary-800">
                  {company.creditsUsed}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-secondary-400">Connection</p>
                <p className="text-sm font-semibold text-secondary-800">
                  {isConnected ? "Connected" : "Demo Mode"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Paperclip embed or link */}
      {isConnected && company.instanceUrl ? (
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Paperclip Dashboard</CardTitle>
            <a
              href={company.instanceUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm" className="gap-1">
                <ExternalLink className="h-3 w-3" />
                Open in New Tab
              </Button>
            </a>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-secondary-200 overflow-hidden bg-white">
              <iframe
                src={company.instanceUrl}
                className="w-full border-0"
                style={{ height: "600px" }}
                title={`Paperclip - ${company.name}`}
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
              />
            </div>
            <p className="mt-2 text-xs text-secondary-400">
              If the embedded view does not load, use the &quot;Open in New Tab&quot; button above.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-6">
          <CardContent className="py-12 text-center">
            <Server className="h-10 w-10 text-secondary-300 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-secondary-700 mb-1">
              Demo Mode
            </h3>
            <p className="text-xs text-secondary-400 max-w-md mx-auto">
              This instance is running in demo mode because no Paperclip
              backend is configured. Set <code className="bg-secondary-100 px-1 rounded">PAPERCLIP_API_URL</code> and{" "}
              <code className="bg-secondary-100 px-1 rounded">PAPERCLIP_API_KEY</code> environment
              variables to connect to a real Paperclip instance.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Instance metadata */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-secondary-400">Instance ID</dt>
              <dd className="font-mono text-secondary-700 text-xs mt-1">
                {company.id}
              </dd>
            </div>
            {company.paperclipCompanyId && (
              <div>
                <dt className="text-secondary-400">Paperclip Company ID</dt>
                <dd className="font-mono text-secondary-700 text-xs mt-1">
                  {company.paperclipCompanyId}
                </dd>
              </div>
            )}
            {company.instanceUrl && (
              <div>
                <dt className="text-secondary-400">Instance URL</dt>
                <dd className="font-mono text-secondary-700 text-xs mt-1">
                  <a
                    href={company.instanceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {company.instanceUrl}
                  </a>
                </dd>
              </div>
            )}
            <div>
              <dt className="text-secondary-400">Created</dt>
              <dd className="text-secondary-700 mt-1">
                {new Date(company.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="text-base text-destructive">
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-secondary-700">
                Delete Instance
              </p>
              <p className="text-xs text-secondary-400">
                This will archive the Paperclip company and remove the instance
                from your dashboard.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              className="gap-1"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
