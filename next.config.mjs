/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `
              default-src 'self';
              script-src 'self' 'unsafe-eval' 'unsafe-inline';
              style-src 'self' 'unsafe-inline';
              img-src * blob: data:;
              connect-src 'self' https://www.googleapis.com https://accounts.google.com https://sheets.googleapis.com;
              frame-src 'self' https://drive.google.com https://docs.google.com https://dl.dropboxusercontent.com https://www.dropbox.com;
              media-src 'self' blob:;
            `.replace(/\s{2,}/g, " ").trim(),
          },
        ],
      },
    ]
  },
}

export default nextConfig
