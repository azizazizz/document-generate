# Generator Invoice A5 / A4

Website sederhana (HTML + CSS + JavaScript murni, tanpa library) untuk membuat **Purchase Order / Invoice** ukuran **A5** (kertas invoice NCR pink/putih) atau **A4**.

## Fitur

- Pilihan ukuran kertas **A5** atau **A4**, portrait atau landscape
- Kop surat: logo (upload), nama perusahaan, alamat/kontak
- Nomor invoice, tanggal, dan nama penerima/supplier
- Tabel barang (qty, harga, jumlah), dengan total barang dan total harga otomatis
- Dua kolom tanda tangan: "Yang Memberi" di pojok kanan bawah dan "Penerima" di kiri bawah (bisa disembunyikan)
- Opsi **kosongkan** nomor, tanggal, penerima, total, atau catatan, serta kolom tabel (nama barang, qty, harga, jumlah) secara terpisah, dicetak kosong untuk diisi pulpen
- Opsi garis tabel/bingkai
- Data tersimpan otomatis di browser (`localStorage`)

## Cara pakai

1. Buka `invoice/index.html` di browser (atau buka versi yang sudah di-hosting).
2. Isi form di sisi kiri, preview di kanan akan ikut berubah.
3. Pilih **Ukuran kertas** (A5 atau A4) di bagian Kertas.
4. Klik **Cetak**. Di dialog print pilih kertas yang sama dengan ukuran yang dipilih, skala **100%**, dan matikan header/footer browser.

Hanya tinta hitam yang tercetak. Warna kertas (pink/putih) berasal dari kertas aslinya, sedangkan opsi "Warna preview" hanya berlaku di layar.

## Struktur

```
invoice/
├── index.html
├── README.md
├── css/style.css
└── js/script.js
```

Hosting dan struktur keseluruhan ada di [README utama](../README.md).
