"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardHeader } from "@/components/dashboard/header";
import {
  Server,
  Plus,
  ExternalLink,
  MoreVertical,
  Loader2,
  Zap,
  Globe,
} from "lucide-react";
import { trackPageView, trackEvent } from "@/lib/analytics";

// Mock data
const MOCK_INSTANCES = [
  {
    id: "1",
    name: "CS Bot",
    status: "running" as const,
    url: "https://cs-bot.paperclipweb.app",
    creditsUsed: 180,
    createdAt: "2026-03-15",
  },
  {
    id: "2",
    name: "Content Generator",
    status: "running" as const,
    url: "https://content-gen.paperclipweb.app",
    creditsUsed: 95,
    createdAt: "2026-03-20",
  },
  {
    id: "3",
    name: "Data Analyzer",
    status: "stopped" as const,
    url: "https://data-analyzer.paperclipweb.app",
    creditsUsed: 65,
    createdAt: "2026-03-22",
  },
];

const statusColors = {
  running: "accent",
  stopped: "secondary",
  provisioning: "default",
  error: "destructive",
} as const;

export default function InstancesPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    trackPageView("instances");
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    trackEvent("feature_used", {
      feature: "create_instance",
      instance_name: newName,
    });
    // TODO: Call POST /api/companies
    await new Promise((r) => setTimeout(r, 2000));
    setCreating(false);
    setShowCreate(false);
    setNewName("");
  };

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
                    Provisioning...
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
      <div className="space-y-4">
        {MOCK_INSTANCES.map((instance) => (
          <Card
            key={instance.id}
            className="hover:shadow-md transition-shadow duration-200 cursor-pointer"
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
                      <Badge
                        variant={statusColors[instance.status]}
                      >
                        {instance.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1 text-xs text-secondary-400">
                        <Globe className="h-3 w-3" />
                        {instance.url.replace("https://", "")}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-secondary-400">
                        <Zap className="h-3 w-3" />
                        {instance.creditsUsed} credits used
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {instance.status === "running" && (
                    <a
                      href={instance.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" size="sm" className="gap-1">
                        <ExternalLink className="h-3 w-3" />
                        Open
                      </Button>
                    </a>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {MOCK_INSTANCES.length === 0 && (
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
