import { create } from "zustand";
import type { ConsultationType } from "@/lib/consultation-types";

interface ConsultationStore {
  selectedType: ConsultationType | null;
  setSelectedType: (type: ConsultationType | null) => void;
}

export const useConsultationStore = create<ConsultationStore>((set) => ({
  selectedType: null,
  setSelectedType: (type) => set({ selectedType: type }),
}));
