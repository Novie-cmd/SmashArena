import React from 'react';
import { TIME_SLOTS, COURTS, Court, Booking } from '../types';
import { Clock, Check, CalendarDays, Ban } from 'lucide-react';

interface CourtGridProps {
  selectedDate: string;
  bookings: Booking[];
  selectedSlots: { courtId: string; slot: string }[];
  onToggleSlot: (courtId: string, slot: string) => void;
}

export default function CourtGrid({ selectedDate, bookings, selectedSlots, onToggleSlot }: CourtGridProps) {
  
  // Helper to determine status under selectedDate
  const getSlotStatus = (courtId: string, slot: string) => {
    const court = COURTS.find(c => c.id === courtId);
    if (!court) return { status: 'unknown' };

    // Check if slot is already booked for this court and date
    const booking = bookings.find(
      b => b.court === court.name && b.date === selectedDate && b.timeSlot === slot
    );

    if (booking) {
      return {
        status: 'booked',
        booking,
        label: booking.paymentStatus === 'Paid' ? 'Lunas' : 'Belum Bayar'
      };
    }

    // Check if slot is currently selected in wizard
    const isSelected = selectedSlots.some(s => s.courtId === courtId && s.slot === slot);
    if (isSelected) {
      return { status: 'selected' };
    }

    // Check if today and in the past
    const todayStr = new Date().toISOString().split('T')[0];
    if (selectedDate === todayStr) {
      const currentHour = new Date().getHours();
      const slotStartHour = parseInt(slot.split(':')[0], 10);
      if (slotStartHour <= currentHour) {
        return { status: 'past' };
      }
    }

    return { status: 'available' };
  };

  return (
    <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl border border-slate-800 p-4 sm:p-6" id="court-grid-container">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-emerald-400" />
            Matriks Ketersediaan Lapangan
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Silakan pilih satu atau beberapa slot hijau untuk memesan.</p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 bg-emerald-500/15 border border-emerald-500/40 rounded"></div>
            <span className="text-slate-300">Tersedia</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 bg-indigo-500/90 rounded"></div>
            <span className="text-slate-300">Pilihan Anda</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 bg-red-950/40 border border-red-500/30 rounded"></div>
            <span className="text-slate-300">Terisi (Lunas)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 bg-amber-950/40 border border-amber-500/30 rounded"></div>
            <span className="text-slate-300">Harap Bayar</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 bg-slate-800/60 rounded"></div>
            <span className="text-slate-400">Lewat Jam</span>
          </div>
        </div>
      </div>

      {/* Grid Layout (Responsive card grid for mobile, table on desktop) */}
      <div className="overflow-x-auto rounded-xl border border-slate-800/50 bg-slate-950/50">
        <table className="w-full text-left border-collapse min-w-[640px]">
          <thead>
            <tr className="border-b border-slate-800/80 bg-slate-900/60 font-mono text-[11px] text-slate-400 uppercase tracking-wider">
              <th className="py-3.5 px-4 text-center w-24 border-r border-slate-800/60">
                <div className="flex items-center justify-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-500" /> Waktu
                </div>
              </th>
              {COURTS.map(court => (
                <th key={court.id} className="py-3.5 px-6 text-center">
                  <div className="font-bold text-slate-200">{court.name}</div>
                  <div className="text-[10px] text-slate-400 tracking-normal mt-0.5 font-sans lowercase">
                    Rp {court.pricePerHour.toLocaleString('id-ID')}/jam • {court.type}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {TIME_SLOTS.map((slot) => (
              <tr key={slot} className="hover:bg-slate-900/20 transition-colors">
                {/* Time Indicator column */}
                <td className="py-2.5 px-3 text-center border-r border-slate-800/50 text-[12px] font-mono font-medium text-slate-400 bg-slate-900/10">
                  {slot}
                </td>

                {/* Court Columns */}
                {COURTS.map((court) => {
                  const { status, booking, label } = getSlotStatus(court.id, slot);

                  // Colors and interactivity based on status
                  if (status === 'past') {
                    return (
                      <td key={court.id} className="p-1 px-2 text-center select-none bg-slate-850/10 h-11">
                        <div className="text-[10px] text-slate-600 bg-slate-900/45 border border-slate-850/60 py-2 rounded-lg flex items-center justify-center gap-1 font-medium select-none">
                          <Ban className="w-3 h-3 text-slate-700" /> Selesai
                        </div>
                      </td>
                    );
                  }

                  if (status === 'booked' && booking) {
                    const isPaid = booking.paymentStatus === 'Paid';
                    return (
                      <td key={court.id} className="p-1 px-2 text-center h-11">
                        <div 
                          className={`text-[11px] py-1 px-2 rounded-lg border flex flex-col justify-center items-center transition-all ${
                            isPaid
                              ? 'bg-red-950/20 hover:bg-red-950/30 border-red-900/30 text-red-300'
                              : 'bg-amber-950/20 hover:bg-amber-950/30 border-amber-900/30 text-amber-300'
                          }`}
                        >
                          <div className="font-semibold truncate max-w-[130px]" title={booking.customerName}>
                            🔒 {booking.customerName}
                          </div>
                          <span className={`text-[9px] px-1 border mt-0.5 rounded-sm uppercase tracking-wide font-mono scale-95 leading-none py-0.5 ${
                            isPaid ? 'border-red-800/30 bg-red-950/30 text-red-400' : 'border-amber-800/30 bg-amber-950/30 text-amber-400'
                          }`}>
                            {label}
                          </span>
                        </div>
                      </td>
                    );
                  }

                  if (status === 'selected') {
                    return (
                      <td key={court.id} className="p-1 px-2 text-center h-11">
                        <button
                          onClick={() => onToggleSlot(court.id, slot)}
                          className="w-full text-[11px] font-bold py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all text-center cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3px]" /> Terpilih
                        </button>
                      </td>
                    );
                  }

                  // Default status === 'available'
                  return (
                    <td key={court.id} className="p-1 px-2 text-center h-11">
                      <button
                        onClick={() => onToggleSlot(court.id, slot)}
                        className="w-full text-[11px] py-2 rounded-lg border bg-emerald-500/5 hover:bg-emerald-500/20 border-emerald-500/20 hover:border-emerald-500/40 text-emerald-400 hover:text-emerald-300 transition-all font-medium active:scale-98 cursor-pointer"
                      >
                        Pilih • Rp {court.pricePerHour / 1000}K
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
