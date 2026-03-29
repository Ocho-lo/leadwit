import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

/** @type {import('next').NextConfig} */
const nextConfig = {};

// 仅本地 `next dev` 需要：与 OpenNext + wrangler 对齐。Vercel / `next build` 为 production，不调用，避免构建时拉取 wrangler。
if (process.env.NODE_ENV !== "production") {
  initOpenNextCloudflareForDev();
}

export default nextConfig;
