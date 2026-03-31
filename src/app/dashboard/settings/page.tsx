"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { DashboardHeader } from "@/components/dashboard/header";
import { Copy, Eye, EyeOff, Trash2, AlertTriangle, Loader2, Check } from "lucide-react";
import { trackPageView, trackEvent } from "@/lib/analytics";

export default function SettingsPage() {
  const { data: session } = useSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch("/api/user");
      if (res.ok) {
        const data = await res.json();
        setName(data.name || "");
        setEmail(data.email || "");
      }
    } catch {
      // Use session data as fallback
      if (session?.user) {
        setName(session.user.name || "");
        setEmail(session.user.email || "");
      }
    }
  }, [session]);

  useEffect(() => {
    trackPageView("settings");
    fetchUser();
  }, [fetchUser]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {
      // Ignore
    } finally {
      setSaving(false);
    }
  };

  // Generate a deterministic "API key" from user id for display
  const apiKey = session?.user?.id
    ? `pweb_sk_live_${session.user.id.replace(/-/g, "").slice(0, 24)}`
    : "pweb_sk_live_***";

  const handleCopyKey = () => {
    navigator.clipboard.writeText(apiKey);
    trackEvent("feature_used", { feature: "copy_api_key" });
  };

  return (
    <>
      <DashboardHeader
        title="Settings"
        description="Manage your account and preferences"
      />

      {/* Profile */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your personal information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-w-md">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-secondary-700 mb-1.5"
              >
                Display Name
              </label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-secondary-700 mb-1.5"
              >
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                disabled
                className="bg-secondary-50"
              />
              <p className="mt-1 text-xs text-secondary-400">
                Contact support to change your email address.
              </p>
            </div>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : saved ? (
                <>
                  <Check className="h-4 w-4" />
                  Saved
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* API Keys */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>
            Use API keys for programmatic access to your Paperclip instances
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 flex items-center gap-2 rounded-md border border-secondary-200 bg-secondary-50 px-3 py-2">
                <code className="text-sm text-secondary-600 font-mono flex-1 overflow-hidden">
                  {showApiKey
                    ? apiKey
                    : apiKey.replace(/./g, "*").slice(0, 20) + "..."}
                </code>
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="p-1 hover:bg-secondary-200 rounded cursor-pointer transition-colors"
                  aria-label={showApiKey ? "Hide API key" : "Show API key"}
                >
                  {showApiKey ? (
                    <EyeOff className="h-4 w-4 text-secondary-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-secondary-400" />
                  )}
                </button>
                <button
                  onClick={handleCopyKey}
                  className="p-1 hover:bg-secondary-200 rounded cursor-pointer transition-colors"
                  aria-label="Copy API key"
                >
                  <Copy className="h-4 w-4 text-secondary-400" />
                </button>
              </div>
            </div>
            <p className="text-xs text-secondary-400">
              Keep your API key secret. Do not share it or expose it in client-side code.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible actions. Proceed with caution.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!showDeleteConfirm ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete Account
            </Button>
          ) : (
            <div className="rounded-lg border border-destructive/20 bg-destructive-50 p-4 max-w-md">
              <p className="text-sm text-secondary-700 mb-3">
                This will permanently delete your account, all instances, and
                data. This action cannot be undone.
              </p>
              <p className="text-sm text-secondary-700 mb-2">
                Type{" "}
                <span className="font-mono font-semibold">delete my account</span>{" "}
                to confirm:
              </p>
              <Input
                value={deleteInput}
                onChange={(e) => setDeleteInput(e.target.value)}
                placeholder="delete my account"
                className="mb-3"
              />
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={deleteInput !== "delete my account"}
                  onClick={() => {
                    trackEvent("feature_used", {
                      feature: "delete_account",
                    });
                    // TODO: Call DELETE /api/user
                  }}
                >
                  Permanently Delete
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteInput("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
