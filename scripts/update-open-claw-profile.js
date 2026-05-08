#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

function loadEnv(file) {
  try {
    const raw = fs.readFileSync(file, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const match = trimmed.match(/^([A-Z0-9_]+)=(.*)$/i);
      if (!match) continue;
      const key = match[1];
      let value = match[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {}
}

loadEnv(path.join(process.cwd(), '.env.local'));
loadEnv(path.join(process.cwd(), '.env'));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const email = 'claw-demo@oracleboxing.local';

if (!supabaseUrl || !serviceKey) {
  console.error('Missing Supabase URL or service role key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

async function makeLogo() {
  const svg = `
    <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#007AFF"/>
          <stop offset="1" stop-color="#111827"/>
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="128" fill="url(#g)"/>
      <circle cx="256" cy="256" r="178" fill="rgba(255,255,255,0.10)"/>
      <text x="256" y="292" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="132" font-weight="800" fill="#fff" letter-spacing="-10">OC</text>
      <path d="M158 346c48 30 148 30 196 0" fill="none" stroke="#fff" stroke-opacity="0.72" stroke-width="18" stroke-linecap="round"/>
    </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

(async () => {
  const { data: list, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) throw listError;

  let user = list.users.find((candidate) => candidate.email === email);
  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { first_name: 'Open', last_name: 'Claw', full_name: 'Open Claw', name: 'Open Claw' },
    });
    if (error) throw error;
    user = data.user;
  } else {
    const { error } = await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: { first_name: 'Open', last_name: 'Claw', full_name: 'Open Claw', name: 'Open Claw' },
    });
    if (error) throw error;
  }

  const logo = await makeLogo();
  const logoPath = `${user.id}/open-claw-logo.png`;
  const { error: uploadError } = await supabase.storage.from('profile-images').upload(logoPath, logo, {
    contentType: 'image/png',
    cacheControl: '3600',
    upsert: true,
  });
  if (uploadError) throw uploadError;

  const { data: publicData } = supabase.storage.from('profile-images').getPublicUrl(logoPath);
  const avatarUrl = `${publicData.publicUrl}?v=${Date.now()}`;

  const { error: profileError } = await supabase.from('profiles').upsert({
    id: user.id,
    email,
    first_name: 'Open',
    last_name: 'Claw',
    display_name: 'Open Claw',
    avatar_url: avatarUrl,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' });
  if (profileError) throw profileError;

  console.log(JSON.stringify({ userId: user.id, displayName: 'Open Claw', avatarUrl }, null, 2));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
