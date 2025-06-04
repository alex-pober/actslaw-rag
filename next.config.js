/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      sharp$: false,
      'onnxruntime-node$': false,
    };
    return config;
  },
  // Enable React Strict Mode
  reactStrictMode: true,
  // Enable SWC minification for better performance
  swcMinify: true,
};

module.exports = nextConfig;
