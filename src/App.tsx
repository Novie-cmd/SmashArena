import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import CourtGrid from './components/CourtGrid';
import BookingWizard from './components/BookingWizard';
import OwnerPortal from './components/OwnerPortal';
import { Booking, GoogleSheetsInfo } from './types';
import { 
  initAuth, 
  googleSignIn, 
  logout, 
  createSpreadsheet, 
  syncDataToSheets,
  subscribeBookings,
  saveBookingToFirestore,
  deleteBookingFromFirestore
} from './firebase';
import { FileSpreadsheet, ShieldCheck, CheckCircle, Smartphone, Info, RefreshCw, Camera, QrCode } from 'lucide-react';

export default function App() {
  // Barcode / Scanner Mode states
  const [isCustomerOnly, setIsCustomerOnly] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const isLockedParam = params.get('portal') === 'customer' || params.get('scanner') === 'true';
      const isLockedLocal = localStorage.getItem('smasharena_customer_only') === 'true';
      return isLockedParam || isLockedLocal;
    }
    return false;
  });

  // Application Roles and Dates
  const [currentRole, setCurrentRole] = useState<'customer' | 'owner'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const isLockedParam = params.get('portal') === 'customer' || params.get('scanner') === 'true';
      const isLockedLocal = localStorage.getItem('smasharena_customer_only') === 'true';
      if (isLockedParam || isLockedLocal) {
        return 'customer';
      }
    }
    return 'customer';
  });

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Scanner Simulator States
  const [showScanner, setShowScanner] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'success'>('idle');
  const [showExitModal, setShowExitModal] = useState<boolean>(false);

  // State Management
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<{ courtId: string; slot: string }[]>([]);
  const [operationalCost, setOperationalCost] = useState<number>(430000);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Google Sheets Sync state
  const [sheetsInfo, setSheetsInfo] = useState<GoogleSheetsInfo>({
    spreadsheetId: null,
    spreadsheetUrl: null,
    status: 'disconnected',
    lastSync: null
  });

  // UI Toast indicators
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Helper to show custom alerts
  const showAlert = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  // Scan trigger
  const handleStartScan = () => {
    setShowScanner(true);
    setScanStatus('scanning');
    setScanProgress(0);
  };

  // Simulator hook to increment scanning progress with audio feedback
  useEffect(() => {
    let interval: any;
    if (showScanner && scanStatus === 'scanning') {
      interval = setInterval(() => {
        setScanProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setScanStatus('success');
            
            // Premium audio oscillator beep
            try {
              const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
              const osc = audioCtx.createOscillator();
              const gain = audioCtx.createGain();
              osc.connect(gain);
              gain.connect(audioCtx.destination);
              osc.type = 'sine';
              osc.frequency.setValueAtTime(880, audioCtx.currentTime);
              gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
              osc.start();
              setTimeout(() => osc.stop(), 150);
            } catch (e) {}

            setTimeout(() => {
              setShowScanner(false);
              setIsCustomerOnly(true);
              localStorage.setItem('smasharena_customer_only', 'true');
              setCurrentRole('customer');
              showAlert('Scan Barcode Meja Berhasil! Portal khusus Pelanggan telah siap sewa.', 'success');
            }, 800);
            return 100;
          }
          return prev + 20;
        });
      }, 200);
    }
    return () => clearInterval(interval);
  }, [showScanner, scanStatus]);

  // Seed Initial database bookings if none exist & Subscribe to real-time updates
  useEffect(() => {
    const localCost = localStorage.getItem('smasharena_operational_cost');
    const localSheets = localStorage.getItem('smasharena_sheets_info');

    // 1. Load operational costs
    if (localCost) {
      setOperationalCost(parseFloat(localCost));
    }

    // 2. Load sheets connection state
    if (localSheets) {
      try {
        setSheetsInfo(JSON.parse(localSheets));
      } catch (e) {
        console.error('Failed to parse sheets info', e);
      }
    }

    // 3. Subscribe to Firestore for real-time bookings
    const unsubscribeBookings = subscribeBookings((fbBookings) => {
      if (fbBookings && fbBookings.length > 0) {
        // Sort bookings by creation/transaction time or ID
        setBookings(fbBookings);
        localStorage.setItem('smasharena_bookings', JSON.stringify(fbBookings));
      } else {
        // If Firestore is empty, see if we have local bookings to upload, otherwise seed the default ones
        const localBk = localStorage.getItem('smasharena_bookings');
        if (localBk) {
          try {
            const parsed = JSON.parse(localBk);
            if (parsed.length > 0) {
              setBookings(parsed);
              parsed.forEach((b: Booking) => {
                saveBookingToFirestore(b);
              });
              return;
            }
          } catch (e) {}
        }

        // Seed beautiful, rich initial data to make the app look stunning and busy!
        const today = new Date();
        const formatOffset = (days: number) => {
          const d = new Date(today);
          d.setDate(today.getDate() + days);
          return d.toISOString().split('T')[0];
        };

        const seedData: Booking[] = [
          {
            id: 'BK-789012',
            customerName: 'Budi Santoso',
            phone: '081234567890',
            court: 'Lapangan A (Reguler)',
            date: formatOffset(0), // Today
            timeSlot: '07:00 - 08:00',
            amount: 50000,
            paymentMethod: 'ShopeePay',
            paymentStatus: 'Paid',
            createdAt: new Date().toLocaleString('id-ID')
          },
          {
            id: 'BK-123456',
            customerName: 'Siti Rahma',
            phone: '085712345678',
            court: 'Lapangan B',
            date: formatOffset(0), // Today
            timeSlot: '19:00 - 20:00',
            amount: 50000,
            paymentMethod: 'GoPay',
            paymentStatus: 'Paid',
            createdAt: new Date().toLocaleString('id-ID')
          },
          {
            id: 'BK-556677',
            customerName: 'Hafiz Pratama',
            phone: '082199887766',
            court: 'Lapangan B',
            date: formatOffset(0), // Today
            timeSlot: '20:00 - 21:00',
            amount: 50000,
            paymentMethod: 'BCA Virtual Account',
            paymentStatus: 'Paid',
            createdAt: new Date().toLocaleString('id-ID')
          },
          {
            id: 'BK-991122',
            customerName: 'Rian Wijaya',
            phone: '089911223344',
            court: 'Lapangan A (Reguler)',
            date: formatOffset(1), // Tomorrow
            timeSlot: '10:00 - 11:00',
            amount: 50000,
            paymentMethod: 'Mandiri Transfer',
            paymentStatus: 'Paid',
            createdAt: new Date().toLocaleString('id-ID')
          }
        ];

        setBookings(seedData);
        localStorage.setItem('smasharena_bookings', JSON.stringify(seedData));
        seedData.forEach((b) => {
          saveBookingToFirestore(b);
        });
      }
    });

    // Initialize Firebase Auth listener
    initAuth(
      (user, token) => {
        setUserEmail(user.email);
        // If logged in, restore or update sheets status to connected if we have a spreadsheet ID in local storage
        if (localSheets) {
          try {
            const parsed = JSON.parse(localSheets);
            if (parsed.spreadsheetId) {
              setSheetsInfo(prev => ({ ...prev, status: 'connected' }));
            }
          } catch (e) {}
        }
      },
      () => {
        setUserEmail(null);
        // If Auth fails or logs out, set sheets status to disconnected
        setSheetsInfo(prev => ({ ...prev, status: 'disconnected' }));
      }
    );

    return () => {
      unsubscribeBookings();
    };
  }, []);

  // Auto trigger Google Sheets sync in the background on the admin's device when bookings or costs change!
  useEffect(() => {
    if (sheetsInfo.status === 'connected' && sheetsInfo.spreadsheetId && bookings.length > 0) {
      autoSyncData(sheetsInfo.spreadsheetId, bookings, operationalCost);
    }
  }, [bookings, sheetsInfo.status, sheetsInfo.spreadsheetId, operationalCost]);

  // Sync to database whenever bookings are added
  const handleAddBookings = async (newBookings: Booking[]) => {
    try {
      for (const b of newBookings) {
        await saveBookingToFirestore(b);
      }
      showAlert(`Berhasil menyewa ${newBookings.length} jam lapangan!`, 'success');
    } catch (e: any) {
      console.error('Failed to save bookings:', e);
      showAlert('Gagal menyimpan booking ke awan: ' + e.message, 'error');
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    try {
      await deleteBookingFromFirestore(bookingId);
      showAlert('Booking berhasil dibatalkan.', 'info');
    } catch (e: any) {
      console.error('Failed to delete booking:', e);
      showAlert('Gagal membatalkan booking di awan: ' + e.message, 'error');
    }
  };

  const handleUpdateOperationalCost = (cost: number) => {
    setOperationalCost(cost);
    localStorage.setItem('smasharena_operational_cost', cost.toString());
    showAlert('Biaya operasional diperbarui.', 'success');

    // Auto update Sheets in the background if connected
    if (sheetsInfo.status === 'connected' && sheetsInfo.spreadsheetId) {
      autoSyncData(sheetsInfo.spreadsheetId, bookings, cost);
    }
  };

  // Toggle Matrix cell selection (Customer Booking workflow)
  const handleToggleSlot = (courtId: string, slot: string) => {
    const isSelected = selectedSlots.some(s => s.courtId === courtId && s.slot === slot);
    if (isSelected) {
      setSelectedSlots(selectedSlots.filter(s => !(s.courtId === courtId && s.slot === slot)));
    } else {
      setSelectedSlots([...selectedSlots, { courtId, slot }]);
    }
  };

  // Interactive Sheets Connection via Firebase Auth Google Sign In
  const handleConnectSheets = async () => {
    try {
      showAlert('Menghubungkan ke Akun Google Anda...', 'info');
      const res = await googleSignIn();
      if (!res) return;

      setUserEmail(res.user.email);
      setSheetsInfo(prev => ({ ...prev, status: 'syncing' }));

      // Create a brand new beautiful Spreadsheet!
      const sheetTitle = `SmashArena - Pembukuan & Booking Lapangan`;
      const doc = await createSpreadsheet(sheetTitle, res.accessToken);

      const newInfo: GoogleSheetsInfo = {
        spreadsheetId: doc.id,
        spreadsheetUrl: doc.url,
        status: 'connected',
        lastSync: new Date().toLocaleString('id-ID')
      };

      setSheetsInfo(newInfo);
      localStorage.setItem('smasharena_sheets_info', JSON.stringify(newInfo));

      // Initial populate data
      await syncDataToSheets(doc.id, bookings, operationalCost, res.accessToken);
      showAlert('Spreadsheet Berhasil Dibuat & Sinkronisasi Selesai!', 'success');

    } catch (error: any) {
      console.error('Error connecting Google Sheets:', error);
      setSheetsInfo(prev => ({ ...prev, status: 'disconnected', error: error.message }));
      showAlert('Gagal menyambung ke Google Sheets: ' + error.message, 'error');
    }
  };

  // Disconnect Google Sheets account
  const handleDisconnectSheets = async () => {
    await logout();
    setUserEmail(null);
    const cleared: GoogleSheetsInfo = {
      spreadsheetId: null,
      spreadsheetUrl: null,
      status: 'disconnected',
      lastSync: null
    };
    setSheetsInfo(cleared);
    localStorage.setItem('smasharena_sheets_info', JSON.stringify(cleared));
    showAlert('Hubungan Google Sheets diputuskan.', 'info');
  };

  // Trigger manual sync
  const handleManualSyncNow = async () => {
    if (sheetsInfo.status === 'disconnected' || !sheetsInfo.spreadsheetId) {
      handleConnectSheets();
      return;
    }

    try {
      setSheetsInfo(prev => ({ ...prev, status: 'syncing' }));
      showAlert('Sedang mengunggah data ke Google Sheets...', 'info');

      // Re-sign in or use cached token
      const res = await googleSignIn();
      if (!res) throw new Error('Otorisasi Google diperlukan untuk menulis data.');

      await syncDataToSheets(sheetsInfo.spreadsheetId, bookings, operationalCost, res.accessToken);

      const updatedInfo: GoogleSheetsInfo = {
        ...sheetsInfo,
        status: 'connected',
        lastSync: new Date().toLocaleString('id-ID')
      };
      setSheetsInfo(updatedInfo);
      localStorage.setItem('smasharena_sheets_info', JSON.stringify(updatedInfo));
      showAlert('Data Google Sheets sukses disinkronkan!', 'success');

    } catch (err: any) {
      console.error(err);
      setSheetsInfo(prev => ({ ...prev, status: 'connected', error: err.message }));
      showAlert('Sinkronisasi gagal: ' + err.message, 'error');
    }
  };

  // Automatic Background update helper (requires active connection)
  const autoSyncData = async (sheetId: string, currentBookings: Booking[], currentCost: number) => {
    try {
      // Re-authenticate silently if possible or check cached token access
      const res = await googleSignIn();
      if (res) {
        await syncDataToSheets(sheetId, currentBookings, currentCost, res.accessToken);
        setSheetsInfo(prev => ({
          ...prev,
          lastSync: new Date().toLocaleString('id-ID'),
          status: 'connected'
        }));
      }
    } catch (err) {
      console.error('Background auto-sync failed silently:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans" id="app-root-layout">
      
      {/* HEADER SECTION WITH INTEGRATED NAVIGATION */}
      <Header
        currentRole={currentRole}
        onChangeRole={setCurrentRole}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        sheetsInfo={sheetsInfo}
        onConnectSheets={handleConnectSheets}
        onDisconnectSheets={handleDisconnectSheets}
        onSyncNow={handleManualSyncNow}
        userEmail={userEmail}
        isCustomerOnly={isCustomerOnly}
        onExitCustomerOnly={() => {
          setShowExitModal(true);
        }}
      />

      {/* TOAST SYSTEM ALERTS */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm" id="alert-toast">
          <div className={`p-4 rounded-xl border flex items-start gap-3 shadow-2xl ${
            toast.type === 'success' ? 'bg-emerald-950/95 border-emerald-500/30 text-emerald-300 shadow-emerald-950/55' :
            toast.type === 'error' ? 'bg-red-950/95 border-red-500/30 text-red-300 shadow-red-950/55' :
            'bg-slate-900/95 border-slate-700 text-slate-300'
          }`}>
            <Info className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
            <p className="text-xs font-semibold leading-relaxed">{toast.message}</p>
          </div>
        </div>
      )}

      {/* MAIN APPLICATION CONTAINER BODY */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* UPPER BANNER ABOUT GOOGLE SHEETS */}
        {sheetsInfo.status === 'connected' && sheetsInfo.spreadsheetUrl && (
          <div className="mb-6 bg-gradient-to-r from-emerald-950/40 to-slate-900 border border-emerald-500/20 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md" id="sheets-banner-connected">
            <div className="flex items-start gap-2.5">
              <FileSpreadsheet className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-200">Database & Keuangan Sinkron dengan Google Sheets!</p>
                <p className="text-[10px] text-slate-400">Setiap pemesanan, pembatalan, dan pengeluaran operasional otomatis diekspor langsung ke spreadsheet Anda.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleManualSyncNow}
                className="text-[10px] bg-slate-950 hover:bg-slate-900 text-amber-400 hover:text-amber-300 font-bold py-1.5 px-3 rounded-lg border border-slate-800 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" /> Sinkron Ulang
              </button>
              <a
                href={sheetsInfo.spreadsheetUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-1.5 px-3 rounded-lg flex items-center gap-1 shadow transition-all"
              >
                Buka Link Spreadsheet ↗
              </a>
            </div>
          </div>
        )}

        {/* COMPONENT BODY ROUTER BASED ON ACTIVE TAB & ROLE */}
        {currentRole === 'customer' ? (
          
          /* ROLE 1: PELANGGAN (CUSTOMER SEWA LAPANGAN) */
          <div className="space-y-6">
            {/* SCANNER TRIGGER BANNER FOR CUSTOMERS */}
            {!isCustomerOnly && (
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col lg:flex-row items-center justify-between gap-6 shadow-xl" id="customer-scan-advert">
                <div className="space-y-4 flex-1">
                  <span className="bg-emerald-950 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase tracking-wide">
                    QR Barcode Meja Pelanggan
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                      📲 Portal Pelanggan QR Mandiri
                    </h3>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed max-w-xl">
                      Pindai QR Code di sebelah kanan dengan HP Anda, atau klik tombol di bawah untuk mengaktifkan **Portal Pelanggan Mandiri**. Lakukan pemesanan mandiri secara cepat dan praktis!
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={handleStartScan}
                      className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold py-2.5 px-5 rounded-xl text-xs flex items-center gap-2 transition-transform active:scale-95 cursor-pointer shadow-lg shrink-0"
                    >
                      <Camera className="w-4 h-4" /> Mulai Pindai QR Barcode (Simulasi)
                    </button>
                  </div>
                </div>

                {/* Explicit Customer QR Barcode Card */}
                <div className="border border-slate-750 bg-white p-4 rounded-xl flex flex-col items-center justify-center text-slate-950 shadow-2xl relative shrink-0">
                  <div className="border-4 border-slate-100 p-1.5 bg-white rounded-lg">
                    {typeof window !== 'undefined' ? (
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&color=020617&data=${encodeURIComponent(`${window.location.origin}${window.location.pathname}?portal=customer`)}`}
                        alt="SmashArena Real Scannable QR Code"
                        className="w-28 h-28 cursor-pointer hover:scale-105 transition-transform"
                        referrerPolicy="no-referrer"
                        onClick={handleStartScan}
                        title="Pindai dengan kamera HP Anda untuk masuk Portal Pelanggan, atau klik untuk simulasikan pemindaian langsung!"
                      />
                    ) : (
                      <div className="w-28 h-28 bg-slate-100 flex items-center justify-center text-[10px] text-slate-400 font-mono">
                        Generating...
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] font-mono tracking-widest font-bold mt-2 uppercase text-slate-800 text-center">
                    SMASHARENA-PORTAL
                  </span>
                  <span className="text-[8px] font-semibold text-slate-500 mt-0.5 text-center">
                    PINDAI DENGAN HP / KLIK QR
                  </span>
                </div>
              </div>
            )}

            {isCustomerOnly && (
              <div className="bg-emerald-950/20 border border-emerald-500/20 px-4 py-3.5 rounded-2xl flex items-center gap-3" id="customer-scan-active-info">
                <Smartphone className="w-5 h-5 text-emerald-400 animate-bounce shrink-0" />
                <p className="text-xs text-emerald-300 leading-normal">
                  <strong>Anda terhubung via QR Code Meja Resepsionis.</strong> Akses menu pemilik usaha telah ditutup demi keamanan administrasi. Untuk mengaktifkan mode penuh, klik <strong>Keluar ×</strong> di bar menu atas.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="customer-view-grid">
              
              {/* Left large block: Real-time Court availability selector */}
              <div className="lg:col-span-2">
                <CourtGrid
                  selectedDate={selectedDate}
                  bookings={bookings}
                  selectedSlots={selectedSlots}
                  onToggleSlot={handleToggleSlot}
                />
              </div>

              {/* Right block: Reservation wizard */}
              <div className="lg:col-span-1">
                <BookingWizard
                  selectedSlots={selectedSlots}
                  selectedDate={selectedDate}
                  onClearSlots={() => setSelectedSlots([])}
                  onAddBookings={handleAddBookings}
                  isCustomerOnly={isCustomerOnly}
                  onExitCustomerOnly={() => setShowExitModal(true)}
                />
              </div>

            </div>
          </div>

        ) : (
          
          /* ROLE 2: PEMILIK USAHA (ADMIN PORTAL & REPORTS) */
          <div className="space-y-6" id="owner-view-grid">
            <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl border border-slate-800 p-5 sm:p-6">
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 pb-4 mb-6 gap-3">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    🛡️ Dasbor Administrasi Bisnis Arena
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">Kelola pembukuan pengeluaran operasional dan sinkronisasikan laporan laba rugi bulanan.</p>
                </div>

                {/* Database connectivity quick help */}
                {sheetsInfo.status === 'disconnected' && (
                  <button
                    onClick={handleConnectSheets}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-lg cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4" /> Hubungkan Ke Spreadsheets ↗
                  </button>
                )}
              </div>

              {/* Owner Portal Component Panel */}
              <OwnerPortal
                bookings={bookings}
                onCancelBooking={handleCancelBooking}
                operationalCost={operationalCost}
                onUpdateOperationalCost={handleUpdateOperationalCost}
                onSyncNow={handleManualSyncNow}
                spreadsheetUrl={sheetsInfo.spreadsheetUrl}
              />

            </div>
          </div>

        )}

      </main>

      {/* FOOTER SECTION BRAND */}
      <footer className="bg-slate-950 text-slate-600 py-6 border-t border-slate-900 mt-auto text-center text-xs" id="app-footer">
        <p>© 2026 SmashArena Inc. • Built with real-time automatic business models & Google Sheets Spreadsheet Sync.</p>
      </footer>

      {/* SCANNING MODAL OVERLAY */}
      {showScanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fade-in" id="qrcode-scanner-overlay">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 text-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-800">
              <div className="h-full bg-emerald-500 transition-all duration-200" style={{ width: `${scanProgress}%` }}></div>
            </div>

            <h3 className="text-base font-bold text-slate-100 flex items-center justify-center gap-2 mt-2">
              <Camera className="w-5 h-5 text-emerald-400 animate-pulse" />
              Menghubungkan Kamera & Memindai...
            </h3>
            <p className="text-xs text-slate-400 mt-1">Arahkan kamera ke QR/Barcode meja SmashArena di resepsionis</p>

            {/* Viewfinder Target graphic */}
            <div className="my-8 relative w-56 h-56 mx-auto border border-slate-800 rounded-2xl overflow-hidden flex items-center justify-center bg-slate-950/90 shadow-inner">
              {/* Corner brackets */}
              <div className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-emerald-400"></div>
              <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-emerald-400"></div>
              <div className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-emerald-400"></div>
              <div className="absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-emerald-400"></div>

              {/* Laser line animation */}
              {scanStatus === 'scanning' && (
                <div className="absolute top-0 left-0 w-full h-[3px] bg-red-500 shadow-[0_0_12px_#f87171] animate-bounce"></div>
              )}

              {/* Barcode/QR Mock Icon vector */}
              <div className="text-slate-700 flex flex-col items-center gap-2">
                <QrCode className={`w-20 h-20 transition-all ${scanStatus === 'scanning' ? 'text-emerald-500/25' : 'text-emerald-400 scale-110'}`} />
                <span className="text-[10px] font-mono tracking-widest font-bold">{scanStatus === 'scanning' ? 'MEMINDAI...' : 'KODE COCOK!'}</span>
              </div>
            </div>

            {/* Scan Progress Output */}
            <div className="text-xs font-mono text-slate-400">
              {scanStatus === 'scanning' ? `Memproses data barcode: ${scanProgress}%` : 'Beep! Barcode Terverifikasi!'}
            </div>

            <button
              onClick={() => { setShowScanner(false); setScanStatus('idle'); }}
              className="mt-6 bg-slate-950 hover:bg-slate-850 hover:text-white text-slate-400 text-xs font-semibold py-2 px-5 rounded-xl border border-slate-800 transition-colors cursor-pointer"
            >
              Batalkan
            </button>
          </div>
        </div>
      )}

      {/* GOOGLE EXIT REDIRECT MODAL */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-fade-in" id="customer-exit-modal">
          <div className="bg-slate-900 border border-emerald-500/30 w-full max-w-md rounded-2xl p-6 text-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-emerald-500"></div>

            <div className="my-4 p-4 bg-emerald-500/10 text-emerald-400 rounded-full w-16 h-16 mx-auto flex items-center justify-center border border-emerald-500/20">
              <CheckCircle className="w-8 h-8 text-emerald-400 animate-pulse" />
            </div>

            <h3 className="text-base font-bold text-slate-100 mt-2">
              Pemesanan Selesai
            </h3>
            <p className="text-sm text-slate-300 mt-3 px-2 leading-relaxed font-semibold">
              Terima Kasih telah melakukan Pemesanan Sewa Lapangan di Smash Arena
            </p>

            <button
              onClick={() => {
                // Reset state
                setIsCustomerOnly(false);
                setShowExitModal(false);
                localStorage.removeItem('smasharena_customer_only');
                // Redirect to Google
                try {
                  window.location.href = 'https://www.google.com';
                } catch (e) {
                  try {
                    window.parent.location.href = 'https://www.google.com';
                  } catch (err) {
                    window.open('https://www.google.com', '_self');
                  }
                }
              }}
              className="mt-6 w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold py-3 px-6 rounded-xl text-xs transition-colors cursor-pointer shadow-lg shadow-emerald-500/10"
              id="confirm-exit-google-btn"
            >
              OK
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
