/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['res.cloudinary.com', 'via.placeholder.com'],
    formats: ['image/webp', 'image/avif'],
  },
  // 禁用静态导出时的预渲染错误
  output: 'standalone',
  // 禁用某些页面的静态生成
  trailingSlash: true,
  // 确保在构建时不会尝试预渲染动态页面
  experimental: {
    esmExternals: true,
  }
};

module.exports = nextConfig;
