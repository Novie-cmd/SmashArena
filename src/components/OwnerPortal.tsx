import React, { useState } from 'react';
import { Booking, COURTS, TIME_SLOTS } from '../types';
import { 
  DollarSign, TrendingUp, Users, Calendar, Search, 
  Trash2, Plus, AlertCircle, FileSpreadsheet, Percent, BarChart3, HelpCircle 
} from 'lucide-react';

interface OwnerPortalProps {
  bookings: Booking[];
  onCancelBooking: (bookingId: string) => void;
  operationalCost: number;
  onUpdateOperationalCost: (cost: number) => void;
  onSyncNow: () => void;
  spreadsheetUrl: string | null;
}

export default function OwnerPortal({
  bookings,
  onCancelBooking,
  operationalCost,
  onUpdateOperationalCost,
  onSyncNow,
  spreadsheetUrl
}: OwnerPortalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourtFilter, setSelectedCourtFilter] = useState('All');
  const [newExpenseName, setNewExpenseName] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [expenses, setExpenses] = useState<{ name: string; amount: number }[]>([
    { name: 'Sewa Gedung (Bulanan Pro-rata)', amount: 200000 },
    { name: 'Listrik & Penerangan Lapangan', amount: 80000 },
    { name: 'Shuttlecock Supply (1 Pak)', amount: 150000 },
  ]);

  // Handle local operational expense additions
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpenseName.trim() || !newExpenseAmount) return;
    const amountNum = parseFloat(newExpenseAmount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    const updated = [...expenses, { name: newExpenseName.trim(), amount: amountNum }];
    setExpenses(updated);
    
    // Auto calculate cumulative operational cost
    const totalExp = updated.reduce((sum, item) => sum + item.amount, 0);
    onUpdateOperationalCost(totalExp);

    setNewExpenseName('');
    setNewExpenseAmount('');
  };

  const handleRemoveExpense = (idx: number) => {
    const updated = expenses.filter((_, i) => i !== idx);
    setExpenses(updated);
    const totalExp = updated.reduce((sum, item) => sum + item.amount, 0);
    onUpdateOperationalCost(totalExp);
  };

  // Calculations
  const grossRevenue = bookings
    .filter(b => b.paymentStatus === 'Paid')
    .reduce((sum, item) => sum + item.amount, 0);

  const netProfit = grossRevenue - operationalCost;

  // Filter Bookings list
  const filteredBookings = bookings.filter(b => {
    const matchesSearch = 
      b.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      b.phone.includes(searchTerm) || 
      b.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCourt = selectedCourtFilter === 'All' || b.court === selectedCourtFilter;
    
    return matchesSearch && matchesCourt;
  });

  // Calculate court occupancies
  const getCourtOccupancy = (courtName: string) => {
    const totalSlots = TIME_SLOTS.length;
    const bookedCount = bookings.filter(b => b.court === courtName).length;
    return Math.round((bookedCount / totalSlots) * 100);
  };

  // Peak Hour distribution statistics
  const getPeakHoursData = () => {
    const counts: { [hour: string]: number } = {};
    TIME_SLOTS.forEach(slot => {
      counts[slot] = 0;
    });
    bookings.forEach(b => {
      if (counts[b.timeSlot] !== undefined) {
        counts[b.timeSlot] += 1;
      }
    });

    return TIME_SLOTS.map(slot => ({
      hour: slot.split(' ')[0], // just 06:00
      count: counts[slot]
    }));
  };

  const peakHours = getPeakHoursData();
  const maxBookingInSlot = Math.max(...peakHours.map(p => p.count), 1);

  // Safe delete handler with user confirmation as mandated
  const handleConfirmCancel = (bId: string, customerName: string) => {
    const confirmed = window.confirm(
      `PENTING: Apakah Anda yakin ingin membatalkan & menghapus data booking atas nama "${customerName}" (ID: ${bId})? Tindakan ini tidak dapat dibatalkan, dan perubahan akan diunggah ke Google Sheets setelah sinkronisasi.`
    );
    if (confirmed) {
      onCancelBooking(bId);
    }
  };

  return (
    <div className="space-y-6" id="owner-portal-layout">
      
      {/* SECTION 1: Finance Summary Cards */}
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest font-mono">Daftar Laporan Keuangan Usaha</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Gross Revenue */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-lg">
          <div>
            <span className="text-xs text-slate-400 font-medium">Pendapatan Kotor (Gross)</span>
            <h4 className="text-2xl font-bold font-mono text-emerald-400 mt-1">
              Rp {grossRevenue.toLocaleString('id-ID')}
            </h4>
            <p className="text-[10px] text-slate-500 mt-1 font-sans">Semua pembayaran berhasil</p>
          </div>
          <div className="bg-emerald-500/10 p-3 rounded-xl text-emerald-400">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Operating Overhead */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-lg">
          <div>
            <span className="text-xs text-slate-400 font-medium">Biaya Operasional Lapangan</span>
            <h4 className="text-2xl font-bold font-mono text-red-400 mt-1">
              Rp {operationalCost.toLocaleString('id-ID')}
            </h4>
            <p className="text-[10px] text-slate-500 mt-1 font-sans">Perawatan, kok, listrik, sewa</p>
          </div>
          <div className="bg-red-500/10 p-3 rounded-xl text-red-400">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Net Profit */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-lg">
          <div>
            <span className="text-xs text-slate-400 font-medium">Pendapatan Bersih (Net)</span>
            <h4 className={`text-2xl font-bold font-mono mt-1 ${netProfit >= 0 ? 'text-teal-400' : 'text-rose-500'}`}>
              Rp {netProfit.toLocaleString('id-ID')}
            </h4>
            <p className="text-[10px] text-slate-500 mt-1 font-sans">Gross dikurangi biaya operasional</p>
          </div>
          <div className={`p-3 rounded-xl ${netProfit >= 0 ? 'bg-teal-500/10 text-teal-400' : 'bg-rose-500/10 text-rose-400'}`}>
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Total Bookings Count */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-lg">
          <div>
            <span className="text-xs text-slate-400 font-medium">Volume Pemesanan</span>
            <h4 className="text-2xl font-bold font-mono text-teal-400 mt-1">
              {bookings.length} Transaksi
            </h4>
            <p className="text-[10px] text-slate-500 mt-1 font-sans">Total jam bermain disewa</p>
          </div>
          <div className="bg-teal-500/10 p-3 rounded-xl text-teal-400">
            <Users className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* SECTION 2: Interactive SVG occupancy and peak hours metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Custom SVG Peak Hour Distribution bar Chart */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl lg:col-span-2">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
            <div>
              <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                Grafik Kepadatan Jam Sewa Terpopuler
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Membantu pemilik memahami jam sibuk sewa lapangan.</p>
            </div>
            <div className="text-[10px] font-mono text-slate-500">
              Maksimum slot: {maxBookingInSlot} booking
            </div>
          </div>

          {/* SVG Histograms */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-850/50">
            <div className="h-44 w-full flex items-end justify-between gap-1.5 pt-4">
              {peakHours.map((p, idx) => {
                const pct = (p.count / maxBookingInSlot) * 100;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                    
                    {/* Tooltip on hover */}
                    <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-[10px] text-slate-200 px-2 py-1 rounded border border-slate-800 pointer-events-none whitespace-nowrap z-20 shadow-md">
                      Pukul {p.hour}: {p.count} Booking
                    </div>

                    {/* Bar graphic representation */}
                    <div className="w-full bg-slate-800/80 rounded-t-md overflow-hidden relative" style={{ height: `${Math.max(pct, 5)}%` }}>
                      <div className={`absolute inset-0 bg-gradient-to-t ${p.count > 0 ? 'from-emerald-600 to-emerald-400' : 'from-slate-800 to-slate-700'}`}></div>
                    </div>

                    {/* X-Axis labels */}
                    <span className="text-[9px] text-slate-500 font-mono mt-1.5 tracking-tighter truncate w-full text-center">
                      {p.hour}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Circular Court Occupancy Progress dials */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-white text-sm flex items-center gap-1.5 mb-1">
              <Percent className="w-4 h-4 text-emerald-400" />
              Tingkat Okupansi Lapangan
            </h4>
            <p className="text-[11px] text-slate-400 mb-4">Efektivitas masing-masing lapangan.</p>
          </div>

          <div className="space-y-4">
            {COURTS.map(court => {
              const occ = getCourtOccupancy(court.name);
              return (
                <div key={court.id} className="bg-slate-950 border border-slate-850 p-3 rounded-xl">
                  <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                    <span>{court.name}</span>
                    <span className="text-emerald-400 font-mono">{occ}% Okupansi</span>
                  </div>
                  {/* Progress Line */}
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full bg-gradient-to-r ${occ >= 70 ? 'from-emerald-500 to-teal-400' : occ >= 30 ? 'from-amber-500 to-yellow-400' : 'from-indigo-500 to-teal-500'}`}
                      style={{ width: `${occ}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* SECTION 3: Cost Management Center */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Managed Operational overhead logging */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl lg:col-span-1">
          <h4 className="font-bold text-white text-sm mb-1 flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-emerald-400" />
            Atur Pengeluaran Operasional
          </h4>
          <p className="text-[11px] text-slate-400 mb-4">Catat biaya riil (listrik, kok, kebersihan) untuk keakuratan laporan keuangan.</p>

          <form onSubmit={handleAddExpense} className="space-y-3 mb-4">
            <div>
              <label className="block text-[10px] font-mono text-slate-400 mb-1 uppercase">Deskripsi Biaya</label>
              <input
                type="text"
                placeholder="Misal: Pembelian Shuttlecock Yonex"
                value={newExpenseName}
                onChange={(e) => setNewExpenseName(e.target.value)}
                className="w-full bg-slate-950 text-white border border-slate-850 px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-[10px] font-mono text-slate-400 mb-1 uppercase">Jumlah (IDR)</label>
                <input
                  type="number"
                  placeholder="IDR"
                  value={newExpenseAmount}
                  onChange={(e) => setNewExpenseAmount(e.target.value)}
                  className="w-full bg-slate-950 text-white border border-slate-850 px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
              <button
                type="submit"
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-4 rounded-lg font-bold text-xs mt-5 transition-colors cursor-pointer"
              >
                Tambah
              </button>
            </div>
          </form>

          {/* Expenses Ledger list */}
          <div className="space-y-1.5 max-h-[170px] overflow-y-auto pr-1">
            <span className="text-[10px] font-mono text-slate-500 uppercase leading-none">Rincian Pengeluaran Terdaftar</span>
            {expenses.map((item, idx) => (
              <div key={idx} className="bg-slate-950 p-2 rounded-lg border border-slate-850 flex justify-between items-center text-xs">
                <div>
                  <p className="font-medium text-slate-300">{item.name}</p>
                  <p className="text-[10px] text-red-400 font-mono">Rp {item.amount.toLocaleString('id-ID')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveExpense(idx)}
                  className="text-slate-500 hover:text-red-400 p-1 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 4: Ledger Bookings search and table */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                Buku Besar Pemesanan Lapangan
              </h4>
              <p className="text-[11px] text-slate-400">Total {filteredBookings.length} booking dari kueri Anda.</p>
            </div>

            {/* Quick sheets download / link help */}
            {spreadsheetUrl && (
              <a
                href={spreadsheetUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs bg-emerald-600/10 select-none border border-emerald-500/30 text-emerald-300 hover:text-emerald-200 hover:bg-emerald-600/20 py-1.5 px-3 rounded-lg flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> Buka di Google Sheets
              </a>
            )}
          </div>

          {/* Search controls */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="flex-1 bg-slate-950 border border-slate-850 rounded-lg px-3 py-1.5 flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-500 shrink-0" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari ID Booking, Nama Pelanggan, atau No HP..."
                className="bg-transparent w-full focus:outline-none text-xs text-white placeholder-slate-600"
              />
            </div>

            <select
              value={selectedCourtFilter}
              onChange={(e) => setSelectedCourtFilter(e.target.value)}
              className="bg-slate-950 text-white border border-slate-850 px-3 py-1.5 rounded-lg text-xs focus:outline-none cursor-pointer"
            >
              <option value="All">Semua Lapangan</option>
              {COURTS.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Bookings log table */}
          {filteredBookings.length === 0 ? (
            <div className="bg-slate-950/40 p-10 text-center rounded-xl border border-dashed border-slate-850">
              <AlertCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-400">Tidak ada data transaksi sewa lapangan yang sesuai pencarian.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-850/60 bg-slate-950/40 max-h-[220px]">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-850">
                    <th className="py-2.5 px-3">ID Booking</th>
                    <th className="py-2.5 px-3">Pelanggan</th>
                    <th className="py-2.5 px-3">Lp. / Slot</th>
                    <th className="py-2.5 px-3">Tanggal Main</th>
                    <th className="py-2.5 px-3">Harga</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850/30">
                  {filteredBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-900/40 text-slate-300">
                      <td className="py-2.5 px-3 font-mono font-medium text-emerald-400">#{b.id}</td>
                      <td className="py-2.5 px-3 font-medium">
                        <p className="text-slate-200">{b.customerName}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{b.phone}</p>
                      </td>
                      <td className="py-2.5 px-3 font-mono">
                        <p className="text-[11px] text-slate-300">{b.court.replace(' Bulu Tangkis', '')}</p>
                        <p className="text-[10px] text-emerald-400">{b.timeSlot}</p>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-400">{b.date}</td>
                      <td className="py-2.5 px-3 font-mono text-white">Rp {b.amount.toLocaleString('id-ID')}</td>
                      <td className="py-2.5 px-3">
                        <span className="bg-emerald-950/65 text-emerald-400 border border-emerald-900/40 px-2 py-0.5 rounded text-[10px] font-bold">
                          {b.paymentStatus}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => handleConfirmCancel(b.id, b.customerName)}
                          className="text-slate-600 hover:text-red-400 p-1 rounded hover:bg-red-950/20 transition-colors"
                          title="Batalkan Booking"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* BARCODE & QR CODE MEJA SECTION */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-6" id="owner-barcode-section">
        <div className="space-y-2 flex-1">
          <span className="bg-emerald-950 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase tracking-wide">
            Sistem QR Code Meja Resepsionis
          </span>
          <h4 className="font-bold text-white text-base flex items-center gap-2">
            📲 QR Code Cetak Mandiri untuk Meja & Dinding Lapangan
          </h4>
          <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
            Tingkatkan kenyamanan pelanggan dengan menempelkan QR Barcode ini di meja depan atau dinding lapangan. 
            Saat pelanggan memindainya, mereka akan dialihkan **otomatis ke Portal Pelanggan Mandiri** (tanpa menu atau tombol ganti peran pemilik/dashboard admin, menjaga kerahasiaan pembukuan Anda).
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <button
              onClick={() => {
                // Simulate opening in customer-only mode by adding parameter
                const url = `${window.location.origin}${window.location.pathname}?portal=customer`;
                window.open(url, '_blank');
              }}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold py-2 px-4 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              Simulasikan Pindai QR di Tab Baru ↗
            </button>
            <button
              onClick={() => {
                window.print();
              }}
              className="bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-300 text-xs font-bold py-2 px-4 rounded-xl transition-all border border-slate-700 cursor-pointer"
            >
              Cetak / Print Halaman Barcode
            </button>
          </div>
        </div>

        {/* QR Code graphic mockup */}
        <div className="border border-slate-800 bg-white p-4 rounded-2xl flex flex-col items-center justify-center text-slate-950 shadow-2xl relative shrink-0">
          <div className="border-4 border-slate-100 p-1 bg-white rounded-lg">
            <svg className="w-28 h-28 text-slate-950" viewBox="0 0 100 100" fill="currentColor">
              {/* Outer corner squares */}
              <path d="M0,0 h30 v30 h-30 z M10,10 h10 v10 h-10 z" />
              <path d="M70,0 h30 v30 h-30 z M80,10 h10 v10 h-10 z" />
              <path d="M0,70 h30 v30 h-30 z M10,80 h10 v10 h-10 z" />
              {/* Inner alignment pattern squares and random looking QR barcode data */}
              <rect x="35" y="5" width="8" height="8" />
              <rect x="48" y="15" width="12" height="6" />
              <rect x="5" y="35" width="10" height="10" />
              <rect x="45" y="35" width="20" height="15" />
              <rect x="80" y="35" width="15" height="10" />
              <rect x="35" y="55" width="12" height="12" />
              <rect x="55" y="55" width="10" height="6" />
              <rect x="75" y="55" width="20" height="10" />
              <rect x="35" y="75" width="25" height="20" />
              <rect x="75" y="75" width="10" height="10" />
              <rect x="90" y="85" width="10" height="10" />
              <rect x="15" y="50" width="10" height="4" />
            </svg>
          </div>
          <span className="text-[10px] font-mono tracking-widest font-bold mt-2 uppercase text-slate-800 text-center">
            SMASHARENA-REG-2B
          </span>
          <span className="text-[8px] font-semibold text-slate-500 mt-0.5 text-center">
            SCAN ME TO BOOK COURT
          </span>
        </div>
      </div>

    </div>
  );
}
