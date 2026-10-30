# Aplikasi Cetak Dokumen

Kumpulan website sederhana (HTML + CSS + JavaScript murni, tanpa library dan tanpa build) untuk membuat dan mencetak dokumen. Tiap aplikasi punya foldernya sendiri.

| Folder | Isi |
|---|---|
| [invoice/](invoice/) | Generator Purchase Order / Invoice A5 & A4 |
| [Slip Gaji Generator/](Slip%20Gaji%20Generator/) | Generator slip gaji A4 dan NCR 215 × 137 mm |

Menambah aplikasi baru (misalnya `slip-gaji/`): buat folder sendiri berisi `index.html`, `css/`, `js/`, lalu tambahkan satu baris tautan di [index.html](index.html) pada root.

## Struktur

```
.
├── index.html          # halaman menu, tautan ke tiap aplikasi
├── README.md
├── .gitignore
├── invoice/
│   ├── index.html
│   ├── README.md
│   ├── css/style.css
│   └── js/script.js
└── Slip Gaji Generator/
    ├── index.html
    ├── style.css
    ├── app.js
    └── data/           # file .json hasil "Simpan Data", berisi data gaji asli
```
