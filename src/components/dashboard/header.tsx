"use client";

import { Badge } from "@/components/ui/badge";

interface DashboardHeaderProps {
  title: string;
  description?: string;
  plan?: string;
  actions?: React.ReactNode;
}

export function DashboardHeader({
  title,
  description,
  plan,
  actions,
}: DashboardHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-secondary-800">{title}</h1>
          {plan && (
            <Badge variant="secondary" className="capitalize">
              {plan}
            </Badge>
          )}
        </div>
        {description && (
          <p className="mt-1 text-sm text-secondary-500">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}
