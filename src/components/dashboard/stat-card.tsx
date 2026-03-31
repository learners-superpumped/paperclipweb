import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  className?: string;
}

export function StatCard({
  label,
  value,
  sublabel,
  icon: Icon,
  trend,
  className,
}: StatCardProps) {
  return (
    <Card className={cn("hover:shadow-md transition-shadow duration-200", className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-bold text-secondary-800">
              {value}
            </p>
            {sublabel && (
              <p className="mt-1 text-xs text-secondary-400">{sublabel}</p>
            )}
            {trend && (
              <p
                className={cn(
                  "mt-1 text-xs font-medium",
                  trend.value >= 0 ? "text-accent" : "text-destructive"
                )}
              >
                {trend.value >= 0 ? "+" : ""}
                {trend.value}% {trend.label}
              </p>
            )}
          </div>
          <div className="h-10 w-10 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
