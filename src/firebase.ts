import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';
import { Booking } from './types';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Configure Google OAuth Provider
export const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');

// Cache the access token in-memory
let cachedAccessToken: string | null = null;
let isSigningIn = false;

// Initialize Authentication listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // If logged in but token is not in cache (e.g. page reload), We can ask to sign in again or try silent refresh.
        // For client applet, we handle state gracefully and let them click Connect.
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Google Sign-In trigger for sheets authorization
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Gagal mendapatkan access token dari Firebase Google login.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Error Google Sign-in:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const setCustomAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

/**
 * Google Sheets API Integration helper functions
 */

// Create a new spreadsheet with two sheets: Bookings & Financial Summary
export const createSpreadsheet = async (title: string, token: string): Promise<{ id: string; url: string }> => {
  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      properties: {
        title: title,
      },
      sheets: [
        {
          properties: {
            title: 'Daftar Booking',
          }
        },
        {
          properties: {
            title: 'Ringkasan Keuangan',
          }
        }
      ]
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gagal membuat spreadsheet baru: ${errText}`);
  }

  const data = await response.json();
  return {
    id: data.spreadsheetId,
    url: data.spreadsheetUrl,
  };
};

// Write current local data to Google Sheets spreadsheet
export const syncDataToSheets = async (
  spreadsheetId: string,
  bookings: Booking[],
  operationalCost: number,
  token: string
): Promise<void> => {
  // Prepare bookings data matrix
  const bookingsHeader = [
    'ID Booking',
    'Nama Pelanggan',
    'Nomor WhatsApp',
    'Lapangan',
    'Tanggal',
    'Jam',
    'Total Bayar (IDR)',
    'Metode Pembayaran',
    'Status Pembayaran',
    'Waktu Transaksi'
  ];

  const bookingsRows = bookings.map(b => [
    b.id,
    b.customerName,
    b.phone,
    b.court,
    b.date,
    b.timeSlot,
    b.amount,
    b.paymentMethod,
    b.paymentStatus,
    b.createdAt
  ]);

  const rawBookingValues = [bookingsHeader, ...bookingsRows];

  // Prepare financial report calculations
  const totalBookings = bookings.length;
  const grossRevenue = bookings
    .filter(b => b.paymentStatus === 'Paid')
    .reduce((sum, b) => sum + b.amount, 0);
  const netRevenue = grossRevenue - operationalCost;

  const summaryValues = [
    ['METRIK KEUANGAN', 'NILAI', 'DESKRIPSI'],
    ['Total Transaksi Pemesanan', totalBookings, 'Banyaknya pesanan dibuat pelanggan'],
    ['Pendapatan Kotor (Gross)', grossRevenue, 'Total pendapatan dari booking lunas'],
    ['Biaya Operasional Lapangan', operationalCost, 'Biaya listrik, kok bulutangkis, perawatan'],
    ['Pendapatan Bersih (Net)', netRevenue, 'Pendapatan kotor dikurangi biaya operasional'],
    [],
    ['Waktu Sinkronisasi Terakhir', new Date().toLocaleString('id-ID'), 'Sinkron otomatis via Aplikasi']
  ];

  // API Call: Clear and Write "Daftar Booking"
  await updateSheetValues(spreadsheetId, 'Daftar Booking!A1:J1000', rawBookingValues, token);

  // API Call: Clear and Write "Ringkasan Keuangan"
  await updateSheetValues(spreadsheetId, 'Ringkasan Keuangan!A1:C100', summaryValues, token);
};

// Update spreadsheet range helper
const updateSheetValues = async (
  spreadsheetId: string,
  range: string,
  values: any[][],
  token: string
): Promise<any> => {
  // First clear the range
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:clear`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    }
  });

  // Then update values
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      values: values,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gagal menulis data ke sheets (${range}): ${text}`);
  }

  return response.json();
};

// Find existing spreadsheet in Google Drive by title
export const findSpreadsheetInDrive = async (title: string, token: string): Promise<{ id: string; url: string } | null> => {
  const query = encodeURIComponent(`name = '${title}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`);
  const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink)`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    console.warn(`Gagal mencari file di Google Drive: ${errText}`);
    return null;
  }

  const data = await response.json();
  if (data.files && data.files.length > 0) {
    const file = data.files[0];
    return {
      id: file.id,
      url: file.webViewLink || `https://docs.google.com/spreadsheets/d/${file.id}/edit`,
    };
  }
  return null;
};

// Fetch bookings list from connected Google Sheet spreadsheet file
export const fetchBookingsFromSheets = async (spreadsheetId: string, token: string): Promise<Booking[]> => {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Daftar%20Booking!A2:J1000`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  if (!response.ok) {
    // If the spreadsheet exists but the specific sheet tab is not found or empty, return empty array
    if (response.status === 404 || response.status === 400) return [];
    throw new Error(`Gagal membaca booking dari Google Sheets: ${await response.text()}`);
  }
  const data = await response.json();
  const rows = data.values || [];
  return rows.map((row: any[]) => ({
    id: row[0] || '',
    customerName: row[1] || '',
    phone: row[2] || '',
    court: row[3] || '',
    date: row[4] || '',
    timeSlot: row[5] || '',
    amount: Number(row[6]) || 0,
    paymentMethod: row[7] || '',
    paymentStatus: row[8] as 'Paid' | 'Unpaid',
    createdAt: row[9] || ''
  }));
};

