export type Transaction = {
  id: string;
  merchant: string;
  category: string;
  amount: number;
  date: string;
  icon: string;
  recurring?: boolean;
};

export type Allocation = {
  id: string;
  label: string;
  amount: number;
  target: number;
  color: string;
  icon: string;
};

export const cashflowData: { month: string; income: number; spending: number }[] = [];

export const spendingData: { name: string; value: number; color: string }[] = [];

export const transactions: Transaction[] = [];

export const initialAllocations: Allocation[] = [];

export const portfolioData: { name: string; value: number; color: string }[] = [];

export const holdings: { ticker: string; name: string; value: number; change: number }[] = [];
