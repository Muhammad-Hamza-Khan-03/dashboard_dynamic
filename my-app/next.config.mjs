import { EventEmitter } from 'events';
EventEmitter.defaultMaxListeners = 20;

const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    return config;
  },
};

export default nextConfig;
