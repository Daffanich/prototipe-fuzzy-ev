# Implementasi Kuota Energi (kWh) & Billing Dinamis SPKLU (Rp 2.500/kWh)

Rencana penambahan fitur penentuan kuota energi pengisian (kWh) dan kalkulasi tarif dinamis berbasis Rp 2.500 per kWh di setiap Kios SPKLU (Kios 1–4), lengkap dengan tombol preset cepat, sinkronisasi tagihan QRIS, dan penghentian otomatis saat kuota energi yang dibeli terpenuhi.

> [!IMPORTANT]
> **Keputusan Kunci Terkonfirmasi (Phase 1):**
> 1. **Penempatan Input Kuota**: Ditempatkan pada **Langkah 2 (Pilih Urgensi & Kuota kWh)** di layar Kios sebelum melanjutkan ke pembayaran.
> 2. **Metode Pemilihan Kuota**: Menyediakan **Tombol Preset Cepat** (10 kWh, 20 kWh, 30 kWh, dan Isi Penuh/Full) serta **Input Angka Bebas / Stepper Manual**.
> 3. **Tarif & Formula Biaya**: Tarif tetap $\text{Rp } 2.500\text{ / kWh}$. Total tagihan dihitung secara real-time:
>    $$\text{Total Biaya (Rp)} = \text{Target Kuota (kWh)} \times 2.500$$
> 4. **Limitasi Keamanan Baterai**: Kuota maksimal otomatis dibatasi sesuai sisa kapasitas baterai kosong mobil hingga 100% agar tidak terjadi *overcharging*.
> 5. **Otomasi Penghentian (Cut-off)**: Saat energi yang disalurkan mencapai kuota kWh yang dibeli, sesi charging otomatis berhenti (*Target Kuota Terpenuhi*).

---

## 1. Overview & Core Concept

- **Apa yang Dibangun**: Penambahan modul komersial billing dan meteran energi digital pada setiap dispenser Kios SPKLU. Pengemudi dapat menentukan seberapa banyak daya yang ingin dibeli, melihat total tagihan rupiah secara transparan, dan membayar tepat sesuai kebutuhan.
- **Nilai Portofolio**: Menggabungkan kecerdasan buatan sistem fuzzy logic dalam pembagian daya (kW) dengan logika transaksi energi nyata ($\text{kWh} \times \text{Tarif} = \text{Total Tagihan}$), memberikan nuansa aplikasi SPKLU komersial siap produksi (*production-grade*).

---

## 2. User Experience & Visual Design

### Alur Kios yang Diperbarui:
- **Langkah 1: Identifikasi Kendaraan**:
  - Membaca sisa baterai (SoC), kapasitas baterai total, dan sisa daya yang dapat ditampung hingga 100% (misal: "Baterai 18%, Kapasitas 72.6 kWh, Sisa Ruang: 59.5 kWh").
- **Langkah 2: Pilih Urgensi & Kuota Energi (kWh)**:
  - *Bagian A*: 3 Tombol Besar Urgensi (SANTAI, SEDANG, BURU-BURU).
  - *Bagian B*: Kartu Pemilihan Kuota Energi:
    - Tombol Preset: `10 kWh`, `20 kWh`, `30 kWh`, dan `Isi Penuh (Max)`.
    - Input angka manual dengan tombol kontrol plus/minus (+/- 1 kWh).
    - Ringkasan Biaya Real-time: Nilai rupiah terformat rapi (misal: "20.0 kWh × Rp 2.500 = **Rp 50.000**") dan estimasi persentase SoC akhir yang akan didapat.
- **Langkah 3: Pembayaran QRIS Dinamis**:
  - Mockup barcode QRIS secara dinamis menampilkan nominal pembayaran eksak sesuai kuota kWh yang dipilih pada Langkah 2.
  - Rincian invoice: Kuota kWh, Tarif Dasar (Rp 2.500/kWh), PPN/Admin (Rp 0), dan Total Tagihan.
- **Langkah 4: Proses Charging Berbasis Target Kuota**:
  - Progress bar ganda: Progress persentase baterai SoC dan Progress Kuota Energi (`[X] / [Target] kWh`).
  - Indikator rupiah berjalan: Jumlah biaya yang telah terserap secara real-time.
  - Otomatis beralih ke status `COMPLETED` saat target kWh tercapai.

---

## 3. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        KIOSK COMMERCIAL DATA MODEL                     │
│  - targetKwh: number (kuota yang dipilih pengemudi)                    │
│  - tariffPerKwh: 2500 (Rp 2.500 / kWh standar)                         │
│  - totalPriceRp: targetKwh * 2500                                      │
│  - energyDeliveredKwh: akumulasi real-time energi tersalurkan          │
│  - currentCostRp: energyDeliveredKwh * 2500                            │
└──────────────────┬─────────────────────────────────┬───────────────────┘
                   │                                 │
                   ▼                                 ▼
   ┌──────────────────────────────┐   ┌──────────────────────────────┐
   │    WIZARD STEP 2 HANDLER     │   │      STEP 4 CUT-OFF LOOP     │
   │  Preset 10 / 20 / 30 / Full  │   │  if (energyDelivered >=      │
   │  Manual Stepper (+/- 1 kWh)  │   │      targetKwh) {            │
   │  Capped at (100-SoC)% cap    │   │    stopCharging();           │
   └───────────────┬──────────────┘   │  }                           │
                   │                  └──────────────────────────────┘
                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     STEP 3 DYNAMIC QRIS INVOICE                        │
│  - NMID: ID10293847[Port]                                              │
│  - Total Deposit Tagihan: Rp [targetKwh * 2500]                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Rencana Eksekusi Kode
1. **Pembaruan Tipe & Store (`src/store.ts`)**:
   - Menambahkan `targetKwh: number` pada `PortState` (default $20\text{ kWh}$).
   - Menambahkan konstanta `TARIFF_PER_KWH = 2500`.
2. **Pembaruan Kios Wizard (`src/components/KioskView.tsx`)**:
   - Di Langkah 2: Menyisipkan komponen pemilih kuota kWh (preset 10, 20, 30, Full, dan input manual) serta kalkulator tarif Rp 2.500.
   - Di Langkah 3: Mengaitkan nominal QRIS secara dinamis dengan hasil kali $\text{kWh} \times 2.500$.
   - Di Langkah 4: Menampilkan meteran kWh terserap versus target kuota yang dibeli serta rupiah berjalan.
3. **Pembaruan Simulation Engine (`src/App.tsx`)**:
   - Memeriksa batas `energyDeliveredKwh >= targetKwh`. Jika tercapai, secara otomatis menyelesaikan sesi pengisian (`COMPLETED`).
4. **Pembaruan File Standalone (`public/spklu_standalone.html`)**:
   - Memperbarui file standalone HTML dengan kalkulator kuota kWh dan tarif Rp 2.500 yang identik.
5. **Verifikasi Build**:
   - Uji kompilasi TypeScript dan fungsionalitas billing.
