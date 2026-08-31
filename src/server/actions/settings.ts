"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import sharp from "sharp";
import pngToIco from "png-to-ico";
import type {
  SettingsValues,
  SettingsValidation,
} from "@/lib/validation/settings";
import { parseDbError } from "@/lib/supabase/error";

export async function saveSettings(
  values: SettingsValues,
): Promise<SettingsValidation> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      ok: false,
      values: null,
      errors: { labor_rate: "Unauthorized - please log in." },
    };
  }

  // The DB columns and UI both use percentages for markups
  const dbPayload = {
    labor_rate: values.labor_rate,
    fab_markup_percent: values.fab_markup_percent,
    component_markup_percent: values.component_markup_percent,
    cushion_percent: values.cushion_percent,
    commission_percent: values.commission_percent,
    margin_floor_percent: values.margin_floor_percent,
    freshness_warning_months: values.freshness_warning_months,
    freshness_requote_months: values.freshness_requote_months,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("settings")
    .update(dbPayload)
    .eq("id", true);

  if (error) {
    return { ok: false, values: null, errors: { root: parseDbError(error) } };
  }

  // Revalidate everything because settings dictate global pricing calculation
  revalidatePath("/", "layout");
  return { ok: true, values, errors: {} };
}

export async function uploadBrandingAsset(
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, error: "Unauthorized - please log in." };
  }

  const assetType = formData.get("assetType") as string;
  const file = formData.get("file") as File | null;

  if (!file || !(file instanceof File)) {
    return { ok: false, error: "No file provided" };
  }

  if (file.size > 2 * 1024 * 1024) {
    return { ok: false, error: "File exceeds 2MB limit" };
  }

  let buffer: Uint8Array = Buffer.from(await file.arrayBuffer());
  let uploadContentType = file.type;
  let uploadKey = "";

  try {
    if (assetType === "logo") {
      if (!["image/png", "image/svg+xml"].includes(file.type)) {
        return { ok: false, error: "Logo must be PNG or SVG" };
      }
      uploadKey = "logo.png";
    } else if (assetType === "favicon") {
      if (
        !["image/png", "image/x-icon", "image/vnd.microsoft.icon"].includes(
          file.type,
        )
      ) {
        return { ok: false, error: "Favicon must be PNG or ICO" };
      }
      uploadKey = "favicon.ico";
      uploadContentType = "image/x-icon";

      // If it's a PNG, we convert it to ICO.
      // If it's already an ICO, we might still want to ensure it's multi-res, but
      // for simplicity, we'll convert PNGs to multi-res ICO using sharp + pngToIco.
      if (file.type === "image/png") {
        // Generate 16, 32, 48, 256 sizes
        const sizes = [16, 32, 48, 256];
        const resizedBuffers = await Promise.all(
          sizes.map((size) =>
            sharp(buffer).resize(size, size, { fit: "contain" }).toBuffer(),
          ),
        );
        // png-to-ico accepts an array of buffers
        buffer = await pngToIco(resizedBuffers as unknown as Buffer[]);
      }
    } else {
      return { ok: false, error: "Invalid asset type" };
    }

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("branding")
      .upload(uploadKey, buffer as unknown as Uint8Array, {
        contentType: uploadContentType,
        upsert: true,
        cacheControl: "0", // We'll rely on URL versioning
      });

    if (uploadError) {
      return {
        ok: false,
        error: "Failed to upload to storage: " + uploadError.message,
      };
    }

    // Log the event to settings_history
    const { error: historyError } = await supabase
      .from("settings_history")
      .insert({
        changed_field: assetType === "logo" ? "logo_url" : "favicon_url",
        old_value: "uploaded", // We don't track old url since it's constant
        new_value: "uploaded",
        actor: user.id,
      });

    if (historyError) {
      console.error("Failed to insert history log:", historyError);
      // We don't fail the upload just because history failed, but we log it
    }

    // Revalidate everything
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred";
    return { ok: false, error: message };
  }
}
