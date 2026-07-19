/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Allow the image optimizer to fetch from localhost (API gateway) in dev
    dangerouslyAllowLocalIP: true,
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "*.r2.cloudflarestorage.com" },
      { protocol: "http", hostname: "localhost", port: "8090" },
      { protocol: "https", hostname: "placehold.co" },
    ],
  },
};

export default nextConfig;
