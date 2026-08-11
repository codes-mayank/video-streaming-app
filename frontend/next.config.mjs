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
};

export default nextConfig;
