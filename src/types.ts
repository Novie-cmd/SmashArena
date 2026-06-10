export interface Booking {
  id: string;
  customerName: string;
  phone: string;
  court: string;
  date: string; // YYYY-MM-DD
  timeSlot: string; // "08:00 - 09:00"
  amount: number;
  paymentMethod: string;
  paymentStatus: 'Pending' | 'Paid' | 'Failed';
  createdAt: string;
}

export interface Court {
  id: string;
  name: string;
  type: 'Regular' | 'Premium';
  pricePerHour: number;
}

export interface FinancialSummary {
  grossRevenue: number;
  netRevenue: number;
  operationalCost: number;
  bookingsCount: number;
  occupancyRate: number;
}

export interface GoogleSheetsInfo {
  spreadsheetId: string | null;
  spreadsheetUrl: string | null;
  status: 'disconnected' | 'connected' | 'syncing' | 'error';
  lastSync: string | null;
  error?: string;
}

export const TIME_SLOTS = [
  "06:00 - 07:00",
  "07:00 - 08:00",
  "08:00 - 09:00",
  "09:00 - 10:00",
  "10:00 - 11:00",
  "11:00 - 12:00",
  "12:00 - 13:00",
  "13:00 - 14:00",
  "14:00 - 15:00",
  "15:00 - 16:00",
  "16:00 - 17:00",
  "17:00 - 18:00",
  "18:00 - 19:00",
  "19:00 - 20:00",
  "20:00 - 21:00",
  "21:00 - 22:00",
];

export const COURTS: Court[] = [
  { id: 'court-1', name: 'Lapangan A (Reguler)', type: 'Regular', pricePerHour: 50000 },
  { id: 'court-2', name: 'Lapangan B', type: 'Regular', pricePerHour: 50000 },
];
