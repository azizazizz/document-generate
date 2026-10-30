"use strict";

const STORAGE_KEY = "invoiceA5.v1";
const MM_TO_PX = 96 / 25.4;

const today = () => new Date().toISOString().slice(0, 10);

const defaults = () => ({
  company: "Nama Perusahaan Anda",
  address: "Jl. Contoh No. 1, Kota\nTelp. 0812-3456-7890",
  title: "PURCHASE ORDER",
  invoiceNo: "PO-001",
  date: today(),
  customer: "",
  customerAddr: "",
  note: "",
  signLabel: "Yang Memberi,",
  signer: "",
  showReceiver: true,
  receiverLabel: "Penerima,",
  receiver: "",
  size: "ncr",
  ncrDefault: true,
  customW: 148,
  customH: 210,
  orientation: "portrait",
  mT: 9,
  mB: 9,
  mL: 9,
  mR: 6,
  lockPage: false,
  scale: 100,
  offsetX: 0,
  offsetY: 0,
  paper: "white",
  border: false,
  blankInvoiceNo: false,
  blankDate: false,
  blankCustomer: false,
  hideToLabel: false,
  blankName: false,
  blankQty: false,
  blankUnit: false,
  showSpare: false,
  hidePrice: false,
  hideSum: false,
  hideGrand: false,
  blankPrice: false,
  blankSum: false,
  blankTotal: false,
  blankNote: false,
  logo: "",
  items: [{ name: "", qty: 1, unit: "", price: 0 }],
});

let state = load();
let testMode = false; // lembar uji posisi, tidak disimpan

const toNum = (v, fallback) => { const x = parseFloat(v); return Number.isFinite(x) ? x : fallback; };

const NCR = [137, 215]; // kertas NCR yang dipakai: lebar 13,7 cm x panjang 21,5 cm

/* ukuran lembar (mm) dan faktor skala huruf */
function pageDims() {
  const base = state.size === "a4" ? [210, 297]
    : state.size === "ncr" ? NCR
    : state.size === "custom" ? [Math.max(50, toNum(state.customW, 148)), Math.max(50, toNum(state.customH, 210))]
    : [148, 210];
  const k = state.size === "a4" ? 1.2 : state.size === "a5" ? 1.08 : Math.min(base[0], base[1]) / 148 * 1.08;
  const landscape = state.orientation === "landscape";
  return { w: landscape ? base[1] : base[0], h: landscape ? base[0] : base[1], k, landscape };
}

const sizeName = (d) => state.size === "a4" ? "A4" : state.size === "a5" ? "A5"
  : `${state.size === "ncr" ? "NCR " : ""}${d.landscape ? d.h : d.w} × ${d.landscape ? d.w : d.h} mm`;

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved) {
      // data lama: satu opsi "daftar barang kosong" kini dipecah per kolom
      if (saved.blankItems) saved.blankName = saved.blankQty = saved.blankPrice = saved.blankSum = true;
      delete saved.blankItems;
      // label bawaan lama diganti ke "Yang Memberi" / "Penerima"
      if (saved.signLabel === "Hormat kami,") delete saved.signLabel;
      if (saved.receiverLabel === "Diterima oleh,") delete saved.receiverLabel;
      // bawaan ukuran kertas pindah dari A5 ke NCR 137 x 215 mm (sekali saja)
      if (!saved.ncrDefault) { if (saved.size === "a5") saved.size = "ncr"; saved.ncrDefault = true; }
      return Object.assign(defaults(), saved);
    }
  } catch (e) { /* abaikan */ }
  return defaults();
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) { /* mis. logo terlalu besar atau storage diblokir */ }
}

/* ---------- helpers ---------- */
const $ = (sel) => document.querySelector(sel);
const rupiah = (n) => "Rp " + Math.round(n || 0).toLocaleString("id-ID");
const num = (n) => (Math.round(n || 0)).toLocaleString("id-ID");
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* garis kosong untuk diisi pulpen */
const TABLE_COLS = ["blankName", "blankQty", "blankPrice", "blankSum"];
const BLANK_KEYS = ["blankInvoiceNo", "blankDate", "blankCustomer", ...TABLE_COLS, "blankUnit", "blankTotal", "blankNote"];
const fill = (cls = "") => `<span class="fill ${cls}"></span>`;

function formatDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  const bulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  return `${+d} ${bulan[+m - 1]} ${y}`;
}

/* ---------- form binding ---------- */
function bindFields() {
  document.querySelectorAll("[data-key]").forEach((el) => {
    const key = el.dataset.key;
    if (el.type === "checkbox") el.checked = !!state[key];
    else el.value = state[key] ?? "";

    el.addEventListener("input", () => {
      state[key] = el.type === "checkbox" ? el.checked : el.value;
      render();
    });
  });

  $("#logoFile").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { state.logo = reader.result; render(); };
    reader.readAsDataURL(file);
  });

  $("#removeLogo").addEventListener("click", () => {
    state.logo = "";
    $("#logoFile").value = "";
    render();
  });

  $("#addItem").addEventListener("click", () => {
    state.items.push({ name: "", qty: 1, unit: "", price: 0 });
    renderItemForm();
    render();
    const rows = document.querySelectorAll(".item-row");
    rows[rows.length - 1].querySelector("input").focus();
  });

  const setAllBlank = (value) => {
    BLANK_KEYS.forEach((k) => { state[k] = value; });
    syncFormFromState();
    render();
  };
  const setMoneyHidden = (value) => {
    ["hidePrice", "hideSum", "hideGrand"].forEach((k) => { state[k] = value; });
    syncFormFromState();
    render();
  };
  $("#hideMoneyAll").addEventListener("click", () => setMoneyHidden(true));
  $("#hideMoneyNone").addEventListener("click", () => setMoneyHidden(false));
  $("#blankAll").addEventListener("click", () => setAllBlank(true));
  $("#blankNone").addEventListener("click", () => setAllBlank(false));

  $("#printBtn").addEventListener("click", () => window.print());

  $("#testBtn").addEventListener("click", () => {
    testMode = true;
    render();
    window.print();
  });
  window.addEventListener("beforeprint", () => setPageSize(pageDims())); // pastikan @page sesuai pilihan terakhir
  window.addEventListener("afterprint", () => {
    if (testMode) { testMode = false; render(); }
  });

  $("#newBtn").addEventListener("click", () => {
    if (!confirm("Mulai dokumen baru? Barang & data penerima akan dikosongkan (kop & logo tetap).")) return;
    state.invoiceNo = nextNumber(state.invoiceNo);
    state.date = today();
    state.customer = "";
    state.customerAddr = "";
    state.note = "";
    state.items = [{ name: "", qty: 1, unit: "", price: 0 }];
    syncFormFromState();
    render();
  });
}

function syncFormFromState() {
  document.querySelectorAll("[data-key]").forEach((el) => {
    if (el.type === "checkbox") el.checked = !!state[el.dataset.key];
    else el.value = state[el.dataset.key] ?? "";
  });
  renderItemForm();
}

// "PO-009" -> "PO-010"
function nextNumber(s) {
  const m = String(s).match(/^(.*?)(\d+)(\D*)$/);
  if (!m) return s;
  return m[1] + String(+m[2] + 1).padStart(m[2].length, "0") + m[3];
}

/* input harga: hanya angka, otomatis diberi titik ribuan (1.000.000), kursor tetap di tempat */
function formatPriceInput(el) {
  const digitsBeforeCaret = el.value.slice(0, el.selectionStart).replace(/\D/g, "").length;
  const digits = el.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  const value = digits ? parseInt(digits, 10) : 0;
  el.value = digits ? num(value) : "";

  let pos = 0, seen = 0;
  while (pos < el.value.length && seen < digitsBeforeCaret) {
    if (/\d/.test(el.value[pos])) seen++;
    pos++;
  }
  el.setSelectionRange(pos, pos);
  return value;
}

/* ---------- daftar barang di form ---------- */
function renderItemForm() {
  const box = $("#itemList");
  box.innerHTML = '<div class="item-row item-head"><span>Nama barang</span><span>Qty</span><span>Satuan</span><span>Harga</span><span></span></div>';

  state.items.forEach((item, i) => {
    const row = document.createElement("div");
    row.className = "item-row";
    row.innerHTML = `
      <input type="text" aria-label="Nama barang" placeholder="Nama barang" value="${esc(item.name)}">
      <input type="number" aria-label="Qty" min="0" step="any" value="${item.qty}">
      <input type="text" aria-label="Satuan" placeholder="Satuan" value="${esc(item.unit)}">
      <input type="text" aria-label="Harga" inputmode="numeric" autocomplete="off" placeholder="Harga" value="${item.price ? num(item.price) : ""}">
      <button type="button" class="del" title="Hapus" aria-label="Hapus barang">✕</button>`;

    const [nameEl, qtyEl, unitEl, priceEl] = row.querySelectorAll("input");
    nameEl.addEventListener("input", () => { item.name = nameEl.value; render(); });
    qtyEl.addEventListener("input", () => { item.qty = parseFloat(qtyEl.value) || 0; render(); });
    unitEl.addEventListener("input", () => { item.unit = unitEl.value; render(); });
    priceEl.addEventListener("input", () => {
      item.price = formatPriceInput(priceEl);
      render();
    });
    row.querySelector(".del").addEventListener("click", () => {
      state.items.splice(i, 1);
      if (!state.items.length) state.items.push({ name: "", qty: 1, unit: "", price: 0 });
      renderItemForm();
      render();
    });
    box.appendChild(row);
  });
}

/* ---------- render lembar A5 ---------- */
function render() {
  const sheet = $("#sheet");
  const d = pageDims();
  const landscape = d.landscape;
  const a4 = state.size === "a4";
  const minRows = a4 ? (landscape ? 8 : 16)
    : state.size === "a5" ? (landscape ? 4 : 10)
    : Math.max(3, Math.round(4 + (d.h / d.k - 148) * 6 / 62));

  sheet.className = "sheet" +
    (a4 ? " a4" : "") +
    (landscape ? " landscape" : "") +
    (state.paper === "pink" ? " pink" : "") +
    (state.border ? " border" : "");
  sheet.style.setProperty("--w", d.w + "mm");
  sheet.style.setProperty("--h", d.h + "mm");
  sheet.style.setProperty("--k", d.k);
  [["--mt", "mT"], ["--mb", "mB"], ["--ml", "mL"], ["--mr", "mR"]].forEach(([v, key]) =>
    sheet.style.setProperty(v, Math.max(0, toNum(state[key], 9))));
  sheet.style.setProperty("--ps", toNum(state.scale, 100) / 100);
  sheet.style.setProperty("--ox", toNum(state.offsetX, 0));
  sheet.style.setProperty("--oy", toNum(state.offsetY, 0));
  $("#customSize").hidden = state.size !== "custom";

  setPageSize(d);
  const sizeLabel = sizeName(d);
  $("#printHint").textContent = state.lockPage
    ? `Halaman dikunci ${sizeLabel} ${landscape ? "landscape" : "portrait"}. Di dialog print: margin None, skala 100%.`
    : `Di dialog print atur sendiri: Layout ${landscape ? "Landscape" : "Portrait"}, Paper size ${sizeLabel} (di More settings), margin None, skala 100%.`;

  if (testMode) {
    renderTest(sheet, d);
    fitPreview();
    $("#overflowWarn").hidden = true;
    return;
  }

  const items = state.items.filter((it) => it.name.trim() || it.price || it.qty > 1);
  let totalQty = 0, grand = 0;

  // kolom yang dikosongkan tetap dicetak sebagai sel kosong; kalau semua kosong, daftar barang tidak dipakai
  // kolom rupiah yang disembunyikan dihapus dari tabel, bukan dikosongkan
  const showPrice = !state.hidePrice;
  const showSum = !state.hideSum;
  const cols = TABLE_COLS.filter((c) => (c !== "blankPrice" || showPrice) && (c !== "blankSum" || showSum)).map((c) => state[c]);
  const allBlank = cols.every(Boolean);
  const anyBlank = cols.some(Boolean) || state.blankUnit;

  let rows = (allBlank ? [] : items).map((it, i) => {
    const sum = it.qty * it.price;
    totalQty += it.qty;
    grand += sum;
    return `<tr>
      <td class="no">${i + 1}</td>
      <td class="name">${state.blankName ? "" : esc(it.name)}</td>
      <td class="qty">${state.blankQty ? "" : num(it.qty)}</td>
      <td class="unit">${state.blankUnit ? "" : esc(it.unit)}</td>
      ${showPrice ? `<td class="price">${state.blankPrice ? "" : num(it.price)}</td>` : ""}
      ${showSum ? `<td class="sum">${state.blankSum ? "" : num(sum)}</td>` : ""}
    </tr>`;
  });
  // baris cadangan diberi nomor hanya kalau belum ada barang yang diisi (untuk ditulis tangan)
  const numberSpare = anyBlank && rows.length === 0;
  const spareCells = "<td></td>".repeat(3 + (showPrice ? 1 : 0) + (showSum ? 1 : 0));
  // baris cadangan hanya kalau diminta, atau kalau belum ada barang sama sekali (kertas kosong untuk pulpen)
  const spare = state.showSpare || rows.length === 0;
  while (spare && rows.length < minRows) {
    const no = numberSpare ? rows.length + 1 : "&nbsp;";
    rows.push(`<tr><td class="no">${no}</td>${spareCells}</tr>`);
  }

  sheet.innerHTML = `
    <header class="s-head">
      <div class="s-brand">
        ${state.logo ? `<img class="s-logo" src="${state.logo}" alt="Logo">` : ""}
        <div>
          <div class="s-company">${esc(state.company)}</div>
          <div class="s-address">${esc(state.address)}</div>
        </div>
      </div>
      <div class="s-doc">
        <div class="s-title">${esc(state.title)}</div>
        <table>
          <tr><td>No.</td><td>: ${state.blankInvoiceNo ? fill() : esc(state.invoiceNo)}</td></tr>
          <tr><td>Tanggal</td><td>: ${state.blankDate ? fill() : esc(formatDate(state.date))}</td></tr>
        </table>
      </div>
    </header>

    <div class="s-to">
      ${state.hideToLabel ? "" : '<div class="lbl">Kepada Yth.</div>'}
      ${state.blankCustomer
        ? '<div class="space"></div>'
        : `<div class="name">${esc(state.customer) || "&nbsp;"}</div>
      <div class="addr">${esc(state.customerAddr)}</div>`}
    </div>

    <table class="s-table${spare ? "" : " compact"}">
      <thead>
        <tr><th class="no">No</th><th class="name">Nama Barang</th><th class="qty">Qty</th><th class="unit">Satuan</th>${showPrice ? '<th class="price">Harga</th>' : ""}${showSum ? '<th class="sum">Jumlah</th>' : ""}</tr>
      </thead>
      <tbody>${rows.join("")}</tbody>
    </table>

    <footer class="s-foot">
      <div class="s-left">
        <div class="s-note">${state.blankNote
          ? `<b>Catatan:</b>${fill("block").repeat(landscape ? 2 : 3)}`
          : state.note ? `<b>Catatan:</b>${esc(state.note)}` : ""}</div>
        ${state.showReceiver ? `
        <div class="s-sign s-recv">
          <div>${esc(state.receiverLabel)}</div>
          <div class="space"></div>
          <div class="line">${esc(state.receiver)}</div>
        </div>` : ""}
      </div>
      <div class="s-right">
        <table class="s-total${state.hideGrand ? " only" : ""}">
          <tr><td>Total Barang</td><td>${state.blankTotal ? fill("short") : num(totalQty)}</td></tr>
          ${state.hideGrand ? "" : `<tr class="grand"><td>TOTAL</td><td>${state.blankTotal ? "Rp " + fill("short") : rupiah(grand)}</td></tr>`}
        </table>
        <div class="s-sign">
          <div>${esc(state.signLabel)}</div>
          <div class="space"></div>
          <div class="line">${esc(state.signer)}</div>
        </div>
      </div>
    </footer>`;

  save();
  fitPreview();
  $("#overflowWarn").hidden = sheet.scrollHeight <= sheet.clientHeight + 1;
}

/* lembar uji: bingkai di tepi kertas, penggaris mm, dan huruf A-D di tiap sudut,
   supaya kelihatan sisi mana yang terpotong printer */
function renderTest(sheet, d) {
  sheet.classList.add("test");
  let ticks = "";
  for (let x = 10; x < d.w - 5; x += 10) ticks += `<span class="t-x" style="left:${x}mm">${x}</span>`;
  for (let y = 10; y < d.h - 5; y += 10) ticks += `<span class="t-y" style="top:${y}mm">${y}</span>`;
  sheet.innerHTML = `
    <div class="t-frame"></div><div class="t-frame in"></div>
    ${ticks}
    <b class="t-c tl">A</b><b class="t-c tr">B</b><b class="t-c bl">C</b><b class="t-c br">D</b>
    <div class="t-info">
      <b>TES POSISI CETAK</b><br>
      ${sizeName(d)} ${d.landscape ? "landscape" : "portrait"}, halaman ${d.w} × ${d.h} mm<br>
      Skala ${toNum(state.scale, 100)}%, geser ${toNum(state.offsetX, 0)} / ${toNum(state.offsetY, 0)} mm<br>
      Angka di tepi atas dan kiri adalah jarak dalam mm.<br>
      Catat huruf sudut dan sisi yang tidak tercetak.
    </div>`;
}

/* @page diatur dinamis supaya cetak sesuai ukuran & orientasi */
function setPageSize(d) {
  let tag = $("#pageStyle");
  if (!tag) {
    tag = document.createElement("style");
    tag.id = "pageStyle";
    document.head.appendChild(tag);
  }
  // size: auto = kertas & orientasi ditentukan dialog print, jadi tombol Portrait/Landscape di dialog bekerja normal
  const size = !state.lockPage ? "auto"
    : state.size === "custom" || state.size === "ncr" ? `${d.w}mm ${d.h}mm`
    : `${state.size === "a4" ? "A4" : "A5"} ${d.landscape ? "landscape" : "portrait"}`;
  tag.textContent = `@page { size: ${size}; margin: 0; }`;
}

/* perkecil preview kalau layar sempit */
function fitPreview() {
  const avail = $("#previewArea").clientWidth - 24;
  $("#zoomBox").style.zoom = Math.min(1.3, avail / (pageDims().w * MM_TO_PX));
}

/* ---------- start ---------- */
bindFields();
renderItemForm();
render();
window.addEventListener("resize", fitPreview);
