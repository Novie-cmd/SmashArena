import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot,
  getDocFromServer
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { Booking } from './types';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Critical validation of connection to Firestore as mandated by SKILL.md
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

// Error handler as strictly mandated by SKILL.md
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Subscribe to real-time updates of bookings
export const subscribeBookings = (onNext: (bookings: Booking[]) => void) => {
  const path = 'bookings';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const list: Booking[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as Booking);
      });
      onNext(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
};

// Save single booking
export const saveBookingToFirestore = async (booking: Booking): Promise<void> => {
  const path = `bookings/${booking.id}`;
  try {
    await setDoc(doc(db, 'bookings', booking.id), booking);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

// Delete single booking
export const deleteBookingFromFirestore = async (bookingId: string): Promise<void> => {
  const path = `bookings/${bookingId}`;
  try {
    await deleteDoc(doc(db, 'bookings', bookingId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

// Configure Google OAuth Provider
export const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');

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
