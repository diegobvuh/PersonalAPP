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

export const cashflowData = [
  { month: "May", income: 5150, spending: 3820 },
  { month: "Jun", income: 5150, spending: 4050 },
  { month: "Jul", income: 5380, spending: 3960 },
  { month: "Aug", income: 5220, spending: 4310 },
  { month: "Sep", income: 5480, spending: 4010 },
  { month: "Oct", income: 5480, spending: 3740 },
];

export const spendingData = [
  { name: "Home", value: 1540, color: "#4d95ff" },
  { name: "Food", value: 620, color: "#64cf80" },
  { name: "Life", value: 490, color: "#f5b940" },
  { name: "Travel", value: 340, color: "#9e7aff" },
  { name: "Other", value: 260, color: "#72cad9" },
];

export const transactions: Transaction[] = [
  { id: "t1", merchant: "Whole Foods Market", category: "Groceries", amount: -84.26, date: "Today", icon: "🥑" },
  { id: "t2", merchant: "Direct Deposit", category: "Income", amount: 2740, date: "Oct 25", icon: "↗" },
  { id: "t3", merchant: "Pacific Electric", category: "Utilities", amount: -116.42, date: "Oct 24", icon: "⚡", recurring: true },
  { id: "t4", merchant: "Blue Bottle", category: "Dining", amount: -7.8, date: "Oct 24", icon: "☕" },
  { id: "t5", merchant: "Adobe", category: "Software", amount: -22.99, date: "Oct 23", icon: "A", recurring: true },
];

export const initialAllocations: Allocation[] = [
  { id: "needs", label: "Bills & needs", amount: 1320, target: 1320, color: "#4d95ff", icon: "⌂" },
  { id: "savings", label: "Savings", amount: 550, target: 650, color: "#57bd78", icon: "✦" },
  { id: "invest", label: "Investments", amount: 350, target: 400, color: "#8d72e8", icon: "↗" },
  { id: "spend", label: "Flexible spending", amount: 420, target: 420, color: "#efa941", icon: "◉" },
];

export const portfolioData = [
  { name: "US stocks", value: 58, color: "#477ff0" },
  { name: "International", value: 18, color: "#73c994" },
  { name: "Bonds", value: 14, color: "#ebb257" },
  { name: "Cash", value: 10, color: "#9b86df" },
];

export const holdings = [
  { ticker: "FXAIX", name: "Fidelity 500 Index", value: 18342.1, change: 1.21 },
  { ticker: "FTIHX", name: "Total Intl Index", value: 5926.44, change: 0.48 },
  { ticker: "FXNAX", name: "US Bond Index", value: 4417.02, change: -0.12 },
  { ticker: "SPAXX", name: "Govt Money Market", value: 3184.77, change: 0.01 },
];
