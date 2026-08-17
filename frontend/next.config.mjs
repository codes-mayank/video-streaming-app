/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Allow the image optimizer to fetch from localhost (API gateway) in dev
    dangerouslyAllowLocalIP: true,
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "*.r2.cloudflarestorage.com" },
      { protocol: "https", hostname: "placehold.co" },
      // API-proxied thumbnails: /videos/{id}/thumbnail via gateway / custom domain
      { protocol: "http", hostname: "localhost", port: "8090" },
      { protocol: "https", hostname: "wetubevideo.tech" },
      { protocol: "https", hostname: "www.wetubevideo.tech" },
      { protocol: "https", hostname: "*.azurecontainerapps.io" },
    ],
  },

  async rewrites() {
    const AUTH_SERVICE = process.env.AUTH_SERVICE;
    const VIDEO_SERVICE = process.env.VIDEO_SERVICE;

    if (!AUTH_SERVICE || !VIDEO_SERVICE) {
      throw new Error("AUTH_SERVICE and VIDEO_SERVICE must be set");
    }

    return [
      {
        // Browser: /api/users/auth/me → auth-service: /auth/me
        source: "/api/users/:path*",
        destination: `${AUTH_SERVICE}/:path*`,
      },
      {
        source: "/api/videos",
        destination: `${VIDEO_SERVICE}/videos`,
      },
      {
        source: "/api/videos/:path*",
        destination: `${VIDEO_SERVICE}/videos/:path*`,
      },
    ];
  },
};

export default nextConfig;
