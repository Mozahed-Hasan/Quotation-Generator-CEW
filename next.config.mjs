/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  compress: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ["xlsx", "xlsx-js-style", "jspdf", "jspdf-autotable"],
  },
};

export default nextConfig;


