"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase/auth-server";
import { getServerSupabaseClient } from "@/lib/supabase/server";

const PRODUCTION_APP_ORIGIN = "https://conditioning.oracleboxing.com";

function safeNext(value: FormDataEntryValue | null) {
  const next = typeof value === "string" ? value : "/app";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/app";
}


async function sendMagicLinkEmail(email: string, actionLink: string) {
  const sendgridApiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.AUTH_EMAIL_FROM ?? "team@oracleboxing.com";

  if (!sendgridApiKey) {
    throw new Error("SENDGRID_API_KEY is not configured");
  }

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sendgridApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email }] }],
      from: { email: fromEmail, name: "Oracle Boxing" },
      subject: "Your Oracle Boxing sign-in link",
      content: [
        {
          type: "text/plain",
          value: `Click this link to sign in to Oracle Boxing Conditioning:\n\n${actionLink}\n\nIf you did not request this, ignore this email.`,
        },
        {
          type: "text/html",
          value: `<p>Click the button below to sign in to Oracle Boxing Conditioning.</p><p><a href="${actionLink}" style="display:inline-block;background:#007AFF;color:#fff;padding:12px 18px;border-radius:999px;text-decoration:none;font-weight:700">Sign in</a></p><p>If the button does not work, copy this link:<br><a href="${actionLink}">${actionLink}</a></p><p>If you did not request this, ignore this email.</p>`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`SendGrid failed: ${message}`);
  }
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
  const supabase = getServerSupabaseClient();
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next)}`;

  const { data, error } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo },
  });

  const tokenHash = data.properties?.hashed_token;
  const verificationType = data.properties?.verification_type;

  if (error || !tokenHash || !verificationType) {
    redirect(`/login?state=error&message=${encodeURIComponent(error?.message ?? "Could not create sign-in link")}&next=${encodeURIComponent(next)}`);
  }

  const actionLink = `${origin}/auth/callback?token_hash=${encodeURIComponent(tokenHash)}&type=${encodeURIComponent(verificationType)}&next=${encodeURIComponent(next)}`;

  try {
    await sendMagicLinkEmail(email, actionLink);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not send sign-in email";
    redirect(`/login?state=error&message=${encodeURIComponent(message)}&next=${encodeURIComponent(next)}`);
  }

  redirect(`/login?state=sent&email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`);
}

export async function signOut() {
  const supabase = await createAuthClient();
  await supabase.auth.signOut();
  redirect("/");
}
