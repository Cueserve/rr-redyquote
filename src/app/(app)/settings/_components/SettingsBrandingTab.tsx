"use client";

import { useState, useRef } from "react";
import { ReadOnlyNotice } from "@/components/layout/admin-only";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { uploadBrandingAsset } from "@/server/actions/settings";

export function SettingsBrandingTab({ readOnly }: { readOnly: boolean }) {
  const [logoVersion, setLogoVersion] = useState(0);
  const [faviconVersion, setFaviconVersion] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const baseStorageUrl = `${supabaseUrl}/storage/v1/object/public/branding`;

  const handleUpload = async (file: File, type: "logo" | "favicon") => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append("assetType", type);
    formData.append("file", file);

    const promise = uploadBrandingAsset(formData);

    toast.promise(promise, {
      loading: `Uploading ${type}...`,
      success: (res) => {
        if (!res.ok) throw new Error(res.error || "Upload failed");
        if (type === "logo") setLogoVersion(Date.now());
        else setFaviconVersion(Date.now());
        return `${type === "logo" ? "Logo" : "Favicon"} uploaded successfully`;
      },
      error: (err) => err.message,
    });

    try {
      await promise;
      // Force a full page reload so the layout sidebar logo and browser
      // favicon re-fetch the newly uploaded assets across the entire app.
      if (window.location.search !== "?tab=branding") {
        window.location.search = "?tab=branding";
      } else {
        window.location.reload();
      }
    } finally {
      setIsUploading(false);
      if (type === "logo" && logoInputRef.current)
        logoInputRef.current.value = "";
      if (type === "favicon" && faviconInputRef.current)
        faviconInputRef.current.value = "";
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file, "logo");
  };

  const handleFaviconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file, "favicon");
  };

  return (
    <div className="flex flex-col gap-6">
      {readOnly ? <ReadOnlyNotice what="Branding" /> : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="flex flex-col gap-5 p-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-md font-semibold tracking-tight">Logo</h2>
            <p className="text-sm text-muted-foreground">
              PNG or SVG, max 2MB.
            </p>
          </div>

          <div className="flex min-h-40 items-center justify-center rounded-md border border-border bg-muted p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${baseStorageUrl}/logo.png?v=${logoVersion}`}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = "/redyref-logo.png";
              }}
              alt="Organisation logo preview"
              className="h-auto max-h-28 w-auto max-w-full object-contain"
            />
          </div>
          {!readOnly && (
            <div className="flex justify-end">
              <input
                type="file"
                accept="image/png, image/svg+xml"
                className="hidden"
                ref={logoInputRef}
                onChange={handleLogoChange}
                disabled={isUploading}
              />
              <Button
                variant="outline"
                disabled={isUploading}
                onClick={() => logoInputRef.current?.click()}
              >
                Upload Logo
              </Button>
            </div>
          )}
        </Card>

        <Card className="flex flex-col gap-5 p-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-md font-semibold tracking-tight">Favicon</h2>
            <p className="text-sm text-muted-foreground">
              PNG or ICO, max 2MB.
            </p>
          </div>

          <div className="flex min-h-40 items-center justify-center rounded-md border border-border bg-muted p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${baseStorageUrl}/favicon.ico?v=${faviconVersion}`}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = "/favicon.ico";
              }}
              alt="Favicon preview"
              className="size-16 rounded-sm border border-border"
            />
          </div>
          {!readOnly && (
            <div className="flex justify-end">
              <input
                type="file"
                accept="image/png, image/x-icon, image/vnd.microsoft.icon"
                className="hidden"
                ref={faviconInputRef}
                onChange={handleFaviconChange}
                disabled={isUploading}
              />
              <Button
                variant="outline"
                disabled={isUploading}
                onClick={() => faviconInputRef.current?.click()}
              >
                Upload Favicon
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
