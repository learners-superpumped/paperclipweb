"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { DashboardHeader } from "@/components/dashboard/header";
import { StatCard } from "@/components/dashboard/stat-card";
import { UsageChart } from "@/components/dashboard/usage-chart";
import { Server, Zap, Activity, Plus, ArrowUpRight, Loader2 } from "lucide-react";
import { trackPageView, trackEvent } from "@/lib/analytics";
import { PLANS } from "@/lib/constants";

interface DashboardData {
  plan: string;
  creditsUsed: number;
  creditsTotal: number;
  creditsBalance: number;
  activeInstances: number;
  actionsToday: number;
  instances: Array<{
    id: string;
    name: string;
    status: string;
    creditsUsed: number;
    createdAt: string;
  }>;
}

const FALLBACK: DashboardData = {
  plan: "free",
  creditsUsed: 0,
  creditsTotal: 100,
  creditsBalance: 100,
  instances: [],
  activeInstances: 0,
  actionsToday: 0,
};

const statusColors: Record<string, "accent" | "secondary" | "default" | "destructive"> = {
  running: "accent",
  stopped: "secondary",
  provisioning: "default",
  error: "destructive",
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>(FALLBACK);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // Use fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    trackPageView("dashboard");
    fetchData();
  }, [fetchData]);

  const planConfig = PLANS[data.plan as keyof typeof PLANS] ?? PLANS.free;
  const maxCompanies = planConfig.companies;

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
        title="Dashboard"
        description="Monitor your Paperclip instances and usage"
        plan={data.plan}
        actions={
          <Link href="/dashboard/instances">
            <Button
              size="sm"
              className="gap-1"
              onClick={() =>
                trackEvent("feature_used", { feature: "create_instance" })
              }
            >
              <Plus className="h-4 w-4" />
              New Instance
            </Button>
          </Link>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Active Instances"
          value={data.activeInstances}
          sublabel={`of ${maxCompanies} allowed`}
          icon={Server}
        />
        <StatCard
          label="Credits Used"
          value={`${data.creditsUsed} / ${data.creditsTotal}`}
          sublabel="this month"
          icon={Zap}
        />
        <StatCard
          label="Actions Today"
          value={data.actionsToday}
          icon={Activity}
        />
      </div>

      {/* Credit usage bar */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-secondary-700">
                Monthly Credit Usage
              </p>
              <p className="text-xs text-secondary-400">
                {data.creditsUsed} of {data.creditsTotal} credits used
              </p>
            </div>
            <Link href="/dashboard/billing">
              <Button variant="outline" size="sm" className="gap-1">
                Top Up
                <ArrowUpRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
          <Progress value={data.creditsUsed} max={data.creditsTotal} />
          <p className="mt-2 text-xs text-secondary-400">
            {data.creditsBalance} credits remaining
          </p>
        </CardContent>
      </Card>

      {/* Chart */}
      <div className="mb-8">
        <UsageChart />
      </div>

      {/* Recent instances */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Active Instances</CardTitle>
          <Link href="/dashboard/instances">
            <Button variant="ghost" size="sm" className="gap-1">
              View All
              <ArrowUpRight className="h-3 w-3" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {data.instances.length === 0 ? (
            <div className="text-center py-8">
              <Server className="h-10 w-10 text-secondary-300 mx-auto mb-3" />
              <p className="text-sm text-secondary-500">No instances yet</p>
              <Link href="/dashboard/instances">
                <Button size="sm" className="mt-3 gap-1">
                  <Plus className="h-4 w-4" />
                  Create your first instance
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {data.instances.slice(0, 5).map((instance) => (
                <div
                  key={instance.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-secondary-100 hover:border-secondary-200 transition-colors duration-150 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-md bg-primary-50 flex items-center justify-center">
                      <Server className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-secondary-800">
                        {instance.name}
                      </p>
                      <p className="text-xs text-secondary-400">
                        {instance.creditsUsed} credits used
                      </p>
                    </div>
                  </div>
                  <Badge variant={statusColors[instance.status] ?? "secondary"}>
                    {instance.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
