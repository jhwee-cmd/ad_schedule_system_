import { create } from 'zustand';

type DateRange = { from?: Date; to?: Date } | null;

type S = {
  draft: DateRange;
  committed: DateRange;
  setDraft: (r: DateRange) => void;
  commit: (r: DateRange) => void;
  clearDraft: () => void;
};

export const useDateRangeStore = create<S>((set) => ({
  draft: null,
  committed: null,
  setDraft: (r) => set({ draft: r }),
  commit: (r) => set({ committed: r, draft: null }),
  clearDraft: () => set({ draft: null }),
}));
