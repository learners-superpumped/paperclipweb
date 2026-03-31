"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardHeader } from "@/components/dashboard/header";
import {
  Server,
  Plus,
  ExternalLink,
  Loader2,
  Zap,
  Globe,
  Trash2,
} from "lucide-react";
import {
  trackInstanceCreated,
  trackFirstInstanceCreated,
  trackInstanceDeleted,
} from "@/lib/analytics";

interface Instance {
  id: string;
  name: string;
  status: string;
  instanceUrl: string | null;
  creditsUsed: number;
  createdAt: string;
}

const statusColors: Record<string, "accent" | "secondary" | "default" | "destructive"> = {
  running: "accent",
  stopped: "secondary",
  provisioning: "default",
  error: "destructive",
};

export default function InstancesPage() {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInstances = useCallback(async () => {
    try {
      const res = await fetch("/api/companies");
      if (res.ok) {
        const json = await res.json();
        setInstances(json.companies ?? []);
      }
    } catch {
      // Keep empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // page_view handled by AnalyticsProvider
    fetchInstances();
  }, [fetchInstances]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setError(null);

    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create instance");
        setCreating(false);
        return;
      }

      const isFirst = instances.length === 0;
      trackInstanceCreated(newName.trim(), isFirst);
      if (isFirst) {
        trackFirstInstanceCreated(newName.trim());
      }

      setShowCreate(false);
      setNewName("");
      await fetchInstances();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this instance?")) return;

    try {
      const res = await fetch(`/api/companies?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        trackInstanceDeleted(id);
        await fetchInstances();
      }
    } catch {
      // Ignore
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <DashboardHeader
        title="Instances"
        description="Manage your Paperclip instances"
        actions={
          <Button
            size="sm"
            className="gap-1"
            onClick={() => setShowCreate(!showCreate)}
          >
            <Plus className="h-4 w-4" />
            New Instance
          </Button>
        }
      />

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive-50 p-3 text-sm text-destructive">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Create new instance */}
      {showCreate && (
        <Card className="mb-6 border-primary/20">
          <CardHeader>
            <CardTitle className="text-base">Create New Instance</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="flex gap-3">
              <div className="flex-1">
                <label htmlFor="instance-name" className="sr-only">
                  Instance Name
                </label>
                <Input
                  id="instance-name"
                  placeholder="e.g., My AI Company"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={creating}>
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create"
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowCreate(false)}
              >
                Cancel
              </Button>
            </form>
            <p className="mt-2 text-xs text-secondary-400">
              Your instance will be ready in about 60 seconds.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Instance list */}
      {instances.length > 0 ? (
        <div className="space-y-4">
          {instances.map((instance) => (
            <Card
              key={instance.id}
              className="hover:shadow-md transition-shadow duration-200"
            >
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                      <Server className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-secondary-800">
                          {instance.name}
                        </h3>
                        <Badge variant={statusColors[instance.status] ?? "secondary"}>
                          {instance.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        {instance.instanceUrl && (
                          <span className="flex items-center gap-1 text-xs text-secondary-400">
                            <Globe className="h-3 w-3" />
                            {instance.instanceUrl.replace("https://", "")}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-xs text-secondary-400">
                          <Zap className="h-3 w-3" />
                          {instance.creditsUsed} credits used
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {instance.status === "running" && instance.instanceUrl && (
                      <a
                        href={instance.instanceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="outline" size="sm" className="gap-1">
                          <ExternalLink className="h-3 w-3" />
                          Open
                        </Button>
                      </a>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-secondary-400 hover:text-destructive"
                      onClick={() => handleDelete(instance.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="py-16 text-center">
          <CardContent>
            <Server className="h-12 w-12 text-secondary-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-secondary-700">
              No instances yet
            </h3>
            <p className="mt-2 text-sm text-secondary-400">
              Create your first Paperclip instance to get started.
            </p>
            <Button
              className="mt-6 gap-1"
              onClick={() => setShowCreate(true)}
            >
              <Plus className="h-4 w-4" />
              Create Instance
            </Button>
          </CardContent>
        </Card>
      )}
    </>
  );
}
