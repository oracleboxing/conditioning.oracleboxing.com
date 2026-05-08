"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase/auth-server";

const PRODUCTION_APP_ORIGIN = "https://conditioning.oracleboxing.com";

function safeNext(value: FormDataEntryValue | null) {
  const next = typeof value === "string" ? value : "/app";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/app";
}

function authRedirectOrigin(headerStore: Awaited<ReturnType<typeof headers>>) {
  if (process.env.VERCEL_ENV === "production") {
    return PRODUCTION_APP_ORIGIN;
  }

  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (configuredUrl && !configuredUrl.includes("localhost")) {
    return configuredUrl.replace(/\/$/, "");
  }

  const forwardedHost = headerStore.get("x-forwarded-host");
  if (forwardedHost && !forwardedHost.includes("localhost")) {
    const forwardedProto = headerStore.get("x-forwarded-proto") ?? "https";
    return `${forwardedProto}://${forwardedHost}`;
  }

  return headerStore.get("origin") ?? configuredUrl ?? "http://localhost:3000";
}

export async function signInWithEmail(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const next = safeNext(formData.get("next"));

  if (!email) {
    redirect(`/login?state=error&message=${encodeURIComponent("Enter your email first")}&next=${encodeURIComponent(next)}`);
  }

  const headerStore = await headers();
  const origin = authRedirectOrigin(headerStore);
  const supabase = await createAuthClient();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    redirect(`/login?state=error&message=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`);
  }

  redirect(`/login?state=sent&email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`);
}

export async function signOut() {
  const supabase = await createAuthClient();
  await supabase.auth.signOut();
  redirect("/");
}
