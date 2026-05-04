/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
      remotePatterns: [
        { protocol: "https", hostname: "randomuser.me" },
        { protocol: "https", hostname: "img.freepik.com" },
        { protocol: "https", hostname: "goldenglobes.com" },
        { protocol: "https", hostname: "www.womentech.net" },
      ],
    },
  };
  
  export default nextConfig;
  