// stores/modalStore.ts
import { create } from 'zustand';

type ModalState = {
    showModal: boolean;
    chartType: string;
    openModal: () => void;
    closeModal: () => void;
    setChartType: (type: string) => void;
};

export const useModalStore = create<ModalState>((set) => ({
    showModal: false,
    chartType: 'line',
    openModal: () => set({ showModal: true }),
    closeModal: () => set({ showModal: false }),
    setChartType: (type: string) => set({ chartType: type }),
}));
