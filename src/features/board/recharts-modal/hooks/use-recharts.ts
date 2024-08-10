import { create } from 'zustand';

type RechartsModalStore = {
  isOpen: boolean;
  chartType: string;
  openModal: () => void;
  closeModal: () => void;
  setChartType: (type: string) => void;
};

export const useRechartsModalStore = create<RechartsModalStore>((set) => ({
  isOpen: false,
  chartType: 'line',
  openModal: () => set({ isOpen: true }),
  closeModal: () => set({ isOpen: false }),
  setChartType: (type) => set({ chartType: type }),
}));