/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:8000/api/:path*",
      },
      {
        source: "/socket.io/:path*",
        destination: "http://localhost:8000/socket.io/:path*",
      },
    ];
  },
};

export default nextConfig;
