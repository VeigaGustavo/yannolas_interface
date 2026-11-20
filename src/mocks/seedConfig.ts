import type { Settings } from "../types/studio";

export interface SeedConfig {
  names: string[];
  surnames: string[];
  ddd: string;
  projects: string[];
  tags: string[];
  details: (i: number) => Record<string, string>;
  pricesCents: number[];
  depositCents: number;
  durations: number[];
  procedures: Settings["procedures"];
  stock: {
    name: string;
    unit: string;
    qty: number;
    min: number;
    costCents: number;
  }[];
  coupon: string;
  promotion: string;
  raffle: string;
  rentCents: number;
  settings: Pick<Settings, "studio" | "artist" | "hours" | "policies">;
  firstReference?: string;
}
