"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { DashboardHeader } from "@/components/dashboard/header";
import { StatCard } from "@/components/dashboard/stat-card";
import { UsageChart } from "@/components/dashboard/usage-chart";
import { Server, Zap, Activity, Plus, ArrowUpRight } from "lucide-react";
import { trackPageView, trackEvent } from "@/lib/analytics";

// Mock data
const MOCK_USER = {
  plan: "starter",
  creditsUsed: 340,
  creditsTotal: 1000,
  instances: [
    { id: "1", name: "CS Bot", status: "running" },
    { id: "2", name: "Content Gen", status: "running" },
  ],
  actionsToday: 42,
};

export default function DashboardPage() {
  useEffect(() => {
    trackPageView("dashboard");
  }, []);

  const creditPercent = (MOCK_USER.creditsUsed / MOCK_USER.creditsTotal) * 100;

  return (
    <>
      <DashboardHeader
        title="Dashboard"
        description="Monitor your Paperclip instances and usage"
        plan={MOCK_USER.plan}
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
          value={MOCK_USER.instances.length}
          sublabel={`of 3 allowed`}
          icon={Server}
        />
        <StatCard
          label="Credits Used"
          value={`${MOCK_USER.creditsUsed} / ${MOCK_USER.creditsTotal}`}
          sublabel="this month"
          icon={Zap}
        />
        <StatCard
          label="Actions Today"
          value={MOCK_USER.actionsToday}
          icon={Activity}
          trend={{ value: 12, label: "vs yesterday" }}
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
                {MOCK_USER.creditsUsed} of {MOCK_USER.creditsTotal} credits used
              </p>
            </div>
            <Link href="/dashboard/billing">
              <Button variant="outline" size="sm" className="gap-1">
                Top Up
                <ArrowUpRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
          <Progress value={MOCK_USER.creditsUsed} max={MOCK_USER.creditsTotal} />
          <p className="mt-2 text-xs text-secondary-400">
            {MOCK_USER.creditsTotal - MOCK_USER.creditsUsed} credits remaining.
            Resets on Apr 1.
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
          <div className="space-y-3">
            {MOCK_USER.instances.map((instance) => (
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
                      instance-{instance.id}
                    </p>
                  </div>
                </div>
                <Badge variant="accent">{instance.status}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
