import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const bucketUrl = `${supabaseUrl}/storage/v1/object/public/branding/favicon.ico`;

  try {
    const res = await fetch(bucketUrl, { method: "HEAD" });
    if (res.ok) {
      // Add a timestamp query param to bust aggressive browser favicon caching
      return NextResponse.redirect(`${bucketUrl}?v=${Date.now()}`);
    }
  } catch (e) {
    // Ignore fetch errors and fallback
  }

  return NextResponse.redirect(new URL("/favicon.ico", request.url));
}
