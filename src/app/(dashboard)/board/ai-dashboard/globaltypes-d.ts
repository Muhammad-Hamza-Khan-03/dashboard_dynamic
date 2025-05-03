import { AiDashboardConfig } from './aiDashboardModal';

declare global {
  interface Window {
    aiDashboardConfig?: AiDashboardConfig;
  }
}


export {};