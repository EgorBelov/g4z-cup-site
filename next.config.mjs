// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  cacheComponents: true,
  // Официальная документация Next.js рекомендует true при использовании cacheComponents.
  // Значение false было временной мерой для миграции старых приложений.
  partialPrefetching: true,
};

export default nextConfig;
