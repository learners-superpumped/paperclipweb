"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Mock data for demo
const data = [
  { date: "Mar 1", credits: 12 },
  { date: "Mar 5", credits: 34 },
  { date: "Mar 10", credits: 78 },
  { date: "Mar 15", credits: 145 },
  { date: "Mar 20", credits: 210 },
  { date: "Mar 25", credits: 287 },
  { date: "Mar 31", credits: 340 },
];

export function UsageChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Credit Usage</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="creditGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4F46E5" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#4F46E5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: "#94A3B8" }}
                axisLine={{ stroke: "#E2E8F0" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "#94A3B8" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #E2E8F0",
                  borderRadius: "8px",
                  fontSize: "13px",
                }}
              />
              <Area
                type="monotone"
                dataKey="credits"
                stroke="#4F46E5"
                strokeWidth={2}
                fill="url(#creditGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
