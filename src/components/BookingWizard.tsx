import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { COURTS, Court, Booking } from '../types';
import { Smartphone, CheckCircle, Copy, Send, Loader2, ArrowRight, ShieldCheck, Wallet, Landmark } from 'lucide-react';

interface BookingWizardProps {
  selectedSlots: { courtId: string; slot: string }[];
  selectedDate: string;
  onClearSlots: () => void;
  onAddBookings: (newBookings: Booking[]) => void;
  isCustomerOnly?: boolean;
  onExitCustomerOnly?: () => void;
}

export default function BookingWizard({
  selectedSlots,
  selectedDate,
  onClearSlots,
  onAddBookings,
  isCustomerOnly = false,
  onExitCustomerOnly
}: BookingWizardProps) {
  // Wizard steps: 'info' -> 'payment' -> 'processing' -> 'success'
  const [step, setStep] = useState<'info' | 'payment' | 'processing' | 'success'>('info');
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [createdBookings, setCreatedBookings] = useState<Booking[]>([]);
  const [simulationCountdown, setSimulationCountdown] = useState(3);
  const [showSimulatedWA, setShowSimulatedWA] = useState(false);
  const [copied, setCopied] = useState(false);

  // Group selected slots by court to display nicely
  const getSubtotal = () => {
    return selectedSlots.reduce((sum, item) => {
      const court = COURTS.find(c => c.id === item.courtId);
      return sum + (court ? court.pricePerHour : 0);
    }, 0);
  };

  const handleNextToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !phone.trim()) {
      alert('Mohon isi nama lengkap dan nomor WhatsApp Anda.');
      return;
    }
    setStep('payment');
  };

  const handleStartPayment = () => {
    if (!paymentMethod) {
      alert('Silakan pilih salah satu metode pembayaran cepat otomatis.');
      return;
    }
    setStep('processing');

    // Simulate automatic payment verification after 3 seconds
    let secondsLeft = 3;
    setSimulationCountdown(3);
    const interval = setInterval(() => {
      secondsLeft -= 1;
      setSimulationCountdown(secondsLeft);
      if (secondsLeft <= 0) {
        clearInterval(interval);
        finalizeBooking();
      }
    }, 1000);
  };

  const finalizeBooking = () => {
    const freshBookings: Booking[] = selectedSlots.map(item => {
      const court = COURTS.find(c => c.id === item.courtId)!;
      const bId = 'BK-' + Math.floor(100000 + Math.random() * 900000);
      return {
        id: bId,
        customerName: customerName.trim(),
        phone: phone.trim(),
        court: court.name,
        date: selectedDate,
        timeSlot: item.slot,
        amount: court.pricePerHour,
        paymentMethod: paymentMethod,
        paymentStatus: 'Paid', // Instantly paid in automatic simulator
        createdAt: new Date().toLocaleString('id-ID')
      };
    });

    onAddBookings(freshBookings);
    setCreatedBookings(freshBookings);
    setStep('success');
  };

  // Generate WhatsApp text
  const getWAText = () => {
    if (createdBookings.length === 0) return '';
    const dateFormatted = new Date(selectedDate).toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const slotsList = createdBookings.map(b => `  • ${b.court} [${b.timeSlot}] (ID: #${b.id})`).join('\n');
    const totalAmount = createdBookings.reduce((sum, b) => sum + b.amount, 0);

    return `*🏸 SMASHARENA BOOKING CONFIRMATION 🏸*

Halo *${customerName}*, pemesanan lapangan bulu tangkis Anda berhasil dikonfirmasi!

📆 *Tanggal Main:* ${dateFormatted}
📋 *Detail Lapangan:*
${slotsList}

💳 *Total Pembayaran:* Rp ${totalAmount.toLocaleString('id-ID')} (LUNAS via ${paymentMethod})

_Silakan tunjukkan chat ini di meja resepsionis saat tiba di lapangan bulutangkis. Selamat bertanding dan junjung sportivitas!_ 🚀🏆`;
  };

  const handleCopyWA = () => {
    navigator.clipboard.writeText(getWAText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendWAUrl = () => {
    const formattedPhone = phone.replace(/[^0-9]/g, '');
    const cleanPhone = formattedPhone.startsWith('0') ? '62' + formattedPhone.slice(1) : formattedPhone;
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(getWAText())}`;
    window.open(url, '_blank');
  };

  if (selectedSlots.length === 0) {
    return (
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 text-center shadow-lg" id="empty-wizard-placeholder">
        <div className="text-4xl mb-3">🏸</div>
        <h3 className="font-bold text-white text-base">Mulai Pemesanan Lapangan</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-[280px] mx-auto">
          Klik tombol <span className="text-emerald-400 font-semibold">Pilih</span> pada salah satu slot kosong di tabel kiri untuk menyusun jadwal sewa Anda.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative" id="booking-wizard-layout">
      {/* Header Summary */}
      <div className="bg-gradient-to-r from-teal-900 to-indigo-950 p-4 sm:p-5 border-b border-slate-800">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-semibold tracking-wider text-teal-300 font-mono uppercase">Formulir Checkout</h3>
            <p className="text-lg font-bold text-white mt-0.5">Sewa Lapangan Bulu Tangkis</p>
          </div>
          <button
            onClick={onClearSlots}
            className="text-[10px] bg-slate-950 hover:bg-red-950 text-slate-400 hover:text-red-400 px-2.5 py-1 rounded-md border border-slate-800 hover:border-red-900 transition-colors cursor-pointer"
          >
            Batal
          </button>
        </div>
      </div>

      <div className="p-5">
        {/* Step Indicator Progress Bar */}
        <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4">
          <span className={`text-xs font-mono font-medium ${step === 'info' ? 'text-emerald-400' : 'text-slate-500'}`}>01. Informasi</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-700" />
          <span className={`text-xs font-mono font-medium ${step === 'payment' ? 'text-emerald-400' : 'text-slate-500'}`}>02. Pembayaran</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-700" />
          <span className={`text-xs font-mono font-medium ${step === 'processing' || step === 'success' ? 'text-emerald-400' : 'text-slate-500'}`}>03. Selesai</span>
        </div>

        <AnimatePresence mode="wait">
          {/* STEP 1: Enter Customer Info */}
          {step === 'info' && (
            <motion.form
              key="step-info"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleNextToPayment}
              className="space-y-4"
              id="wizard-form-info"
            >
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-1.5 mb-4">
                <span className="text-[10px] font-mono text-slate-500 leading-none">KERANJANG JADWAL PEMESANAN</span>
                {selectedSlots.map((item, idx) => {
                  const court = COURTS.find(c => c.id === item.courtId);
                  return (
                    <div key={idx} className="flex justify-between items-center text-xs font-mono border-b border-slate-900 last:border-0 pb-1.5 last:pb-0">
                      <span className="text-slate-300 font-sans font-medium">{court?.name}</span>
                      <div className="text-right">
                        <div className="text-emerald-400">{item.slot}</div>
                        <div className="text-[10px] text-slate-500">Rp {court?.pricePerHour.toLocaleString('id-ID')}</div>
                      </div>
                    </div>
                  );
                })}
                <div className="border-t border-slate-800 pt-3 flex justify-between items-center text-sm font-bold text-white">
                  <span>Total Biaya ({selectedSlots.length} Jam)</span>
                  <span className="text-base text-teal-300">Rp {getSubtotal().toLocaleString('id-ID')}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Nama Lengkap Anda</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Andi Wijaya"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-slate-950 text-white rounded-lg border border-slate-850 px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500 font-medium placeholder-slate-600 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex justify-between">
                  <span>Nomor WhatsApp Aktif</span>
                  <span className="text-[10px] text-amber-400 lowercase font-mono">Simulasi chat WA</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Misal: 081234567890"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-950 text-white rounded-lg border border-slate-850 px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500 font-medium placeholder-slate-600 transition-colors"
                />
                <p className="text-[10px] text-slate-500 mt-1">Kami akan mensimulasikan notifikasi bukti jadwal langsung ke nomor WA ini.</p>
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-3 px-4 rounded-lg shadow-md transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer"
              >
                Pilih Metode Pembayaran
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.form>
          )}

          {/* STEP 2: Choose Payment Method */}
          {step === 'payment' && (
            <motion.div
              key="step-payment"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
              id="wizard-form-payment"
            >
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-850/60 mb-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Penyewa:</span>
                  <span className="text-white font-bold">{customerName}</span>
                </div>
                <div className="flex justify-between items-center text-xs mt-1">
                  <span className="text-slate-400">Total Tagihan:</span>
                  <span className="text-emerald-400 font-bold text-sm">Rp {getSubtotal().toLocaleString('id-ID')}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2 text-center">PILIH METODE PEMBAYARAN OTOMATIS (SIMULASI)</label>
                
                {/* Instant Methods list */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    onClick={() => setPaymentMethod('OVO / GoPay / ShopeePay')}
                    className={`p-3 rounded-xl border flex items-center gap-2.5 transition-all text-left cursor-pointer ${
                      paymentMethod === 'OVO / GoPay / ShopeePay'
                        ? 'border-emerald-500 bg-emerald-500/10 text-white'
                        : 'border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-300'
                    }`}
                  >
                    <Wallet className="w-4 h-4 text-emerald-400" />
                    <div>
                      <div className="text-xs font-bold font-sans">E-Wallet Instan</div>
                      <span className="text-[9px] text-slate-500">GoPay, OVO, QRIS Code</span>
                    </div>
                  </button>

                  <button
                    onClick={() => setPaymentMethod('MANDIRI / BCA / BRI VA')}
                    className={`p-3 rounded-xl border flex items-center gap-2.5 transition-all text-left cursor-pointer ${
                      paymentMethod === 'MANDIRI / BCA / BRI VA'
                        ? 'border-emerald-500 bg-emerald-500/10 text-white'
                        : 'border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-300'
                    }`}
                  >
                    <Landmark className="w-4 h-4 text-emerald-400" />
                    <div>
                      <div className="text-xs font-bold">Virtual Account</div>
                      <span className="text-[9px] text-slate-500">BCA, Mandiri, BRI Transfer</span>
                    </div>
                  </button>
                </div>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-850 rounded-lg flex items-start gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  <span className="text-slate-200 font-bold">Gerbang Pembayaran Otomatis:</span> Setelah proses pembayaran berjalan, simulasi Gateway akan memeriksa pembayaran listrik/bank secara real-time dan menerbitkan tanda terima otomatis.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setStep('info')}
                  className="w-1/3 border border-slate-800 text-slate-300 py-2.5 rounded-lg text-xs font-semibold hover:bg-slate-950 transition-colors cursor-pointer"
                >
                  Kembali
                </button>
                <button
                  onClick={handleStartPayment}
                  className="w-2/3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2.5 rounded-lg text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  Bayar Sekarang
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Processing automatic payments */}
          {step === 'processing' && (
            <motion.div
              key="step-processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-6 space-y-4"
              id="wizard-form-processing"
            >
              <div className="relative inline-block">
                <div className="w-14 h-14 border-4 border-slate-700 border-t-emerald-400 rounded-full animate-spin"></div>
              </div>
              <div>
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">Memproses Pembayaran Otomatis</h4>
                <p className="text-xs text-indigo-300 mt-1 max-w-sm mx-auto">
                  Menghubungkan ke API Finansial SmashArena... Menunggu status pembayaran Anda lunas dalam <span className="font-bold text-emerald-400 text-sm font-mono">{simulationCountdown}</span> detik.
                </p>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-900 max-w-xs mx-auto animate-pulse">
                <p className="text-[10px] text-slate-400">Total Biaya: <span className="font-bold text-white">Rp {getSubtotal().toLocaleString('id-ID')}</span></p>
                <p className="text-[10px] text-slate-400">Metode: <span className="font-bold text-white font-mono text-[9px]">{paymentMethod}</span></p>
              </div>
              <button
                onClick={finalizeBooking}
                className="text-[11px] text-emerald-400 hover:underline "
              >
                Lewati Tunggu & Simulasikan Sukses Instan ↗
              </button>
            </motion.div>
          )}

          {/* STEP 4: Checkout Success & WhatsApp notification panel */}
          {step === 'success' && (
            <motion.div
              key="step-success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4 text-center"
              id="wizard-form-success"
            >
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl flex flex-col items-center gap-2">
                <CheckCircle className="w-10 h-10 text-emerald-400 animate-bounce" />
                <h4 className="text-sm font-bold text-white">Pembayaran & Booking Berhasil!</h4>
                <p className="text-xs text-slate-300">Data sewa lapangan telah terbit di database lokal dan siap disinkronisasikan ke Google Spreadsheet oleh Pemilik Usaha.</p>
              </div>

              {/* Booking Information Receipts summary */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 text-left space-y-1.5 max-h-[160px] overflow-y-auto">
                <p className="text-[10px] text-slate-500 font-mono tracking-wider border-b border-slate-900 pb-1">INVOICE PEMESANAN</p>
                <div className="text-xs text-slate-400 grid grid-cols-2 gap-y-1 font-mono">
                  <span>Penyewa:</span><span className="text-slate-200 text-right">{customerName}</span>
                  <span>WhatsApp:</span><span className="text-slate-200 text-right">{phone}</span>
                  <span>Pembayaran:</span><span className="text-emerald-400 text-right font-bold uppercase">{paymentMethod}</span>
                  <span>Status:</span><span className="text-emerald-400 text-right font-bold">LUNAS</span>
                </div>
                <div className="border-t border-slate-900 pt-1.5 text-xs text-slate-300 font-mono">
                  <div className="font-bold text-slate-400 text-[10px] mb-1">Tiket Lapangan:</div>
                  {createdBookings.map((b, i) => (
                    <div key={i} className="flex justify-between items-center text-[11px]">
                      <span>{b.court}</span>
                      <span className="text-emerald-400 text-[10px]">{b.timeSlot}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Simulated WhatsApp Notification Hub */}
              <div className="border border-teal-500/30 bg-teal-950/20 p-4 rounded-xl space-y-3">
                <div className="flex items-center gap-2 justify-center">
                  <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></div>
                  <h5 className="text-[11px] font-bold text-teal-300 uppercase tracking-widest font-mono">WhatsApp Schedule Notification</h5>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed px-1">
                  Kirim notifikasi jadwal langsung melalui simulasi pesan otomatis ke pelanggan SmashArena.
                </p>

                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={handleCopyWA}
                    className="flex-1 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-200 text-xs py-2 px-3 rounded-lg font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {copied ? 'Tersalin' : 'Salin Pesan'}
                  </button>

                  <button
                    onClick={handleSendWAUrl}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs py-2 px-3 rounded-lg font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Kirim Real WA ↗
                  </button>
                </div>

                <button
                  onClick={() => setShowSimulatedWA(true)}
                  className="text-[11px] text-teal-400 underline font-semibold flex items-center gap-1 justify-center mx-auto"
                >
                  <Smartphone className="w-3.5 h-3.5" /> Lihat Pesan di Simulator HP 📱
                </button>
              </div>

              <button
                onClick={() => {
                  setStep('info');
                  onClearSlots();
                }}
                className="w-full bg-slate-800 hover:bg-slate-750 text-white font-semibold py-2.5 rounded-lg text-xs"
              >
                Pesan Lapangan Lagi
              </button>

              {isCustomerOnly && onExitCustomerOnly && (
                <button
                  onClick={onExitCustomerOnly}
                  className="w-full mt-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold py-2.5 rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 shadow"
                >
                  Keluar dari Portal Pelanggan 🚪
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Simulated Phone WhatsApp UI Overlay PopUp modal */}
      {showSimulatedWA && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl border-4 border-slate-750 max-w-sm w-full overflow-hidden shadow-2xl relative" id="wa-phone-simulator">
            
            {/* Phone Notch/Speaker Header */}
            <div className="bg-slate-950 h-5 w-full flex justify-center items-center">
              <div className="w-20 h-3.5 bg-slate-900 rounded-b-xl border-x border-b border-slate-800 flex items-center justify-center">
                <span className="w-8 h-1 bg-slate-700 rounded-full"></span>
              </div>
            </div>

            {/* Simulated WA Title Bar banner */}
            <div className="bg-[#075e54] text-white p-3.5 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center text-sm font-bold">🏸</div>
              <div>
                <p className="text-xs font-bold leading-tight">SmashArena Notifikasi</p>
                <p className="text-[9px] text-[#128c7e] font-medium leading-none">Online • Pengirim Otomatis</p>
              </div>
            </div>

            {/* WA Chat body background wallpaper */}
            <div className="bg-[#ece5dd] p-4 min-h-[300px] max-h-[380px] overflow-y-auto space-y-3 font-sans relative">
              {/* Floating Date sign */}
              <div className="text-center">
                <span className="bg-[#d4e4f7] text-[#506175] text-[9px] font-bold px-2 py-0.5 rounded-md shadow-sm">HARI INI</span>
              </div>

              {/* Simulated message block bubbles */}
              <div className="bg-white text-slate-800 text-xs p-3 rounded-tr-none rounded-2xl shadow-md max-w-[85%] ml-auto border-l-4 border-emerald-500 font-sans leading-relaxed whitespace-pre-wrap relative">
                {getWAText()}
                <div className="text-right text-[8px] text-slate-400 mt-1 font-mono">11:08 ✓✓</div>
              </div>
            </div>

            {/* Simulated Phone Footer controls */}
            <div className="bg-slate-950 p-3 text-center border-t border-slate-850">
              <button
                onClick={() => setShowSimulatedWA(false)}
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer"
              >
                Selesai & Tutup Simulator
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
