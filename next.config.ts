import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://rrsnvssbimcfotyuaare.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJyc252c3NiaW1jZm90eXVhYXJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzNzI0NzgsImV4cCI6MjEwMzk0ODQ3OH0.fPVrEnoqOlg1G_iOTYnM0tl2Yu0EOq_BMJxQ0NQja08",
  },
};

export default nextConfig;
