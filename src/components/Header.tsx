import React from 'react';
import { LayoutDashboard, Calendar, RefreshCw, LogOut, CheckCircle2, ShieldAlert } from 'lucide-react';
import { GoogleSheetsInfo } from '../types';

interface HeaderProps {
  currentRole: 'customer' | 'owner';
  onChangeRole: (role: 'customer' | 'owner') => void;
  selectedDate: string;
  onDateChange: (date: string) => void;
  sheetsInfo: GoogleSheetsInfo;
  onConnectSheets: () => void;
  onDisconnectSheets: () => void;
  onSyncNow: () => void;
  userEmail: string | null;
  isCustomerOnly?: boolean;
  onExitCustomerOnly?: () => void;
}

export default function Header({
  currentRole,
  onChangeRole,
  selectedDate,
  onDateChange,
  sheetsInfo,
  onConnectSheets,
  onDisconnectSheets,
  onSyncNow,
  userEmail,
  isCustomerOnly = false,
  onExitCustomerOnly
}: HeaderProps) {
  // Get formatted Indonesian date
  const getIndonesianDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  // Generate date options (next 7 days starting today)
  const getDateOptions = () => {
    const options = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const nextDate = new Date(today);
      nextDate.setDate(today.getDate() + i);
      const isoString = nextDate.toISOString().split('T')[0];
      const displayString = nextDate.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
      options.push({ iso: isoString, label: i === 0 ? `Hari Ini (${displayString})` : displayString });
    }
    return options;
  };

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-xl" id="app-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-4 gap-4">
          
          {/* Logo & Slogan */}
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 text-slate-950 p-2.5 rounded-xl shadow-md flex items-center justify-center font-bold text-lg animate-pulse" id="court-logo">
              🏸
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">
                SmashArena
              </h1>
              <p className="text-xs text-slate-400 font-mono">Rent Badminton Court Web App</p>
            </div>
          </div>

          {/* Quick Date Picker (Always relevant) */}
          <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-lg border border-slate-800 max-w-full overflow-x-auto self-start md:self-center">
            <Calendar className="w-4 h-4 text-emerald-400 ml-2 shrink-0" />
            <select
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="bg-transparent text-slate-200 text-sm focus:outline-none pr-6 font-medium cursor-pointer"
              id="global-date-picker"
            >
              {getDateOptions().map((opt) => (
                <option key={opt.iso} value={opt.iso} className="bg-slate-950 text-slate-200">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Core Controls & Sheets Integration Panel */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Role Switcher or Customer Only Scanner Indicator */}
            {isCustomerOnly ? (
              <div className="flex items-center gap-2 bg-emerald-950/80 border border-emerald-500/30 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-emerald-400 animate-pulse shadow-md" id="mobile-barcode-active">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                <span>Portal Pelanggan (QR Berhasil)</span>
                {onExitCustomerOnly && (
                  <button
                    onClick={onExitCustomerOnly}
                    className="ml-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white px-2 py-0.5 rounded-md text-[10px] transition-colors"
                    title="Kembali ke mode penuh (Untuk Owner)"
                  >
                    Keluar ×
                  </button>
                )}
              </div>
            ) : (
              <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 shrink-0">
                <button
                  onClick={() => onChangeRole('customer')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all ${
                    currentRole === 'customer'
                      ? 'bg-emerald-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  id="role-btn-customer"
                >
                  👤 Pelanggan
                </button>
                <button
                  onClick={() => onChangeRole('owner')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all ${
                    currentRole === 'owner'
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  id="role-btn-owner"
                >
                  💼 Pemilik Usaha
                </button>
              </div>
            )}

            {/* Google Sheets Status & Interactive Button */}
            {currentRole === 'owner' && (
              <div className="flex items-center gap-2 border-l border-slate-800 pl-3">
                {sheetsInfo.status === 'disconnected' ? (
                  <button
                    onClick={onConnectSheets}
                    className="flex items-center gap-1.5 bg-emerald-600/25 hover:bg-emerald-600 text-emerald-400 hover:text-white text-xs font-semibold py-1.5 px-3 rounded-lg border border-emerald-500/30 transition-all cursor-pointer"
                    id="sheets-connect-btn"
                  >
                    <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
                      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 9h-4v4h-2v-4H8v-2h4V6h2v4h4v2z" />
                    </svg>
                    Tautkan Google Sheets
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    {/* Status Badge */}
                    <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 px-2.5 py-1.5 rounded-lg text-xs" id="sheets-active-badge">
                      <span className={`w-2 h-2 rounded-full ${sheetsInfo.status === 'syncing' ? 'bg-indigo-400 animate-pulse' : 'bg-emerald-400'}`}></span>
                      <span className="text-slate-300 font-mono text-[10px]">
                        {sheetsInfo.status === 'syncing' ? 'Sinkronisasi...' : 'Tersambung (GSheets)'}
                      </span>
                    </div>

                    {/* Sync Button */}
                    <button
                      onClick={onSyncNow}
                      disabled={sheetsInfo.status === 'syncing'}
                      className="bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 p-1.5 rounded-lg hover:shadow-lg transition-all shrink-0 cursor-pointer"
                      title="Sinkronisasi ke Google Sheets Sekarang"
                      id="sheets-sync-btn"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${sheetsInfo.status === 'syncing' ? 'animate-spin' : ''}`} />
                    </button>

                    {/* Open Sheets Link if available */}
                    {sheetsInfo.spreadsheetUrl && (
                      <a
                        href={sheetsInfo.spreadsheetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-[11px] font-bold py-1.5 px-2.5 rounded-lg shadow transition-all shrink-0"
                        title="Buka File Google Spreadsheet"
                      >
                        Buka Sheets ↗
                      </a>
                    )}

                    {/* Sign Out Sheets */}
                    <button
                      onClick={onDisconnectSheets}
                      className="text-slate-400 hover:text-red-400 p-1.5 rounded-lg transition-all shrink-0"
                      title="Putuskan Hubungan Spreadsheet"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>

        {/* Selected Date Header Display */}
        <div className="border-t border-slate-800 py-2.5 flex items-center justify-between text-xs text-slate-400" id="sub-header-bar">
          <div>
            Menampilkan Jadwal Pada: <span className="text-emerald-400 font-semibold">{getIndonesianDate(selectedDate)}</span>
          </div>
          {currentRole === 'owner' && sheetsInfo.lastSync && (
            <div className="font-mono text-[10px]">
              Last Sync: <span className="text-slate-300">{sheetsInfo.lastSync}</span>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
