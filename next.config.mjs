/** @type {import('next').NextConfig} */
const backend = (process.env.API_BACKEND_URL ||
  (process.env.NODE_ENV === "development" ? process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4050/api/v1" :
    "https://trade-client-app.vercel.app/api/v1")).replace(/\/$/, "");
if (!/^https?:\/\//.test(backend)) throw new Error("API_BACKEND_URL must be an absolute backend URL including /api/v1");
const nextConfig = {
  reactStrictMode: true,
  // Integration checks must never overwrite a running developer's build files.
  distDir: process.env.TRADE_PROXY_TEST_WORKER === "1" ? ".next-proxy-test" : ".next",
  typescript: {
    tsconfigPath: process.env.TRADE_PROXY_TEST_WORKER === "1" ? "test/tsconfig.proxy.json" : "tsconfig.json",
  },
  async rewrites() {
    return [{ source: "/api/v1/:path*", destination: `${backend}/:path*` }];
  },
};
export default nextConfig;
