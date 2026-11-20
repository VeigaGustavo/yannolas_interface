import { seed } from "../../mocks/studio";
import type { StudioData } from "../../types/studio";

let counter = 0;
export const newId = () => "id" + ++counter;

export function emptyStudio(): StudioData {
  const d = seed();
  return {
    ...d,
    clients: d.clients.slice(0, 5).map((c) => ({
      ...c,
      history: [],
      birthday: undefined,
      referredBy: undefined,
    })),
    quotes: [],
    sessions: [],
    payments: [],
    expenses: [],
    benefits: [],
    coupons: [],
    promotions: [],
    followUps: [],
    stock: [],
  };
}
