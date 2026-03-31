"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Server,
  CreditCard,
  Settings,
  Paperclip,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Overview" },
  { href: "/dashboard/instances", icon: Server, label: "Instances" },
  { href: "/dashboard/billing", icon: CreditCard, label: "Billing" },
  { href: "/dashboard/settings", icon: Settings, label: "Settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col border-r border-secondary-200 bg-white transition-all duration-200",
        collapsed ? "w-16" : "w-60"
      )}
    >
      <div className="flex items-center justify-between h-16 px-4 border-b border-secondary-200">
        {!collapsed && (
          <Link href="/" className="flex items-center gap-2 cursor-pointer">
            <Paperclip className="h-5 w-5 text-primary shrink-0" />
            <span className="font-bold text-secondary-800 text-sm">
              paperclipweb
            </span>
          </Link>
        )}
        {collapsed && (
          <Paperclip className="h-5 w-5 text-primary mx-auto" />
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded hover:bg-secondary-100 cursor-pointer transition-colors"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4 text-secondary-400" />
          ) : (
            <ChevronLeft className="h-4 w-4 text-secondary-400" />
          )}
        </button>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 cursor-pointer",
                isActive
                  ? "bg-primary-50 text-primary"
                  : "text-secondary-500 hover:text-secondary-800 hover:bg-secondary-50"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-2 border-t border-secondary-100">
        <button
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md text-sm text-secondary-500 hover:text-secondary-800 hover:bg-secondary-50 w-full transition-colors duration-150 cursor-pointer",
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Log out</span>}
        </button>
      </div>
    </aside>
  );
}
