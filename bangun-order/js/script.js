"use strict";

const STORAGE_KEY = "bangunOrder.v1";
const MM_TO_PX = 96 / 25.4;

/* ---------- data blok plan ----------
   Sumber: blok plan Jayasampurna, skala 1 : 1000. Jumlah dan nomor kavling dibaca dari gambar
   dan cocok dengan tabel luasan: Blok A 17 unit (1.224 m2), B 9 unit (646 m2), C 20 unit (1.440 m2).
   Semua kavling 72 m2, kecuali B.2 nomor 2 (70 m2). C.1 punya nomor 12A. */
const seq = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => ({ no: String(from + i), area: 72 }));
const BLOCKS = [
  { id: "A.1", lots: seq(1, 6) },
  { id: "A.2", lots: seq(1, 11) },
  { id: "B.1", lots: seq(1, 7) },
  { id: "B.2", lots: [{ no: "1", area: 72 }, { no: "2", area: 70 }] },
  { id: "C.1", lots: [...seq(1, 12), { no: "12A", area: 72 }] },
  { id: "C.2", lots: seq(1, 7) },
];
const ALL_LOTS = BLOCKS.flatMap((b) => b.lots.map((l) => ({ block: b.id, no: l.no, area: l.area })));

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const defaults = () => ({
  scope: "one",
  block: "A.1",
  lot: "1",
  desa: "Jayasampurna",
  kec: "Serang Baru",
  kab: "Bekasi",
  company: "",
  address: "",
  logo: "",
  title: "ORDER BANGUN",
  prefix: "OB/",
  date: today(),
  project: "",
  buildType: "",
  contractor: "",
  startDate: "",
  duration: "",
  value: 0,
  termsTitle: "Ketentuan",
  // kalimat awal hanya contoh umum, ganti sesuai kesepakatan. Tiap baris menjadi satu butir ketentuan.
  terms: [
    "Pelaksana membangun rumah pada kavling tersebut sesuai gambar kerja dan spesifikasi dari pemberi order.",
    "Pekerjaan dimulai dan diselesaikan sesuai jadwal yang tertera pada order ini.",
    "Perubahan pekerjaan harus disetujui pemberi order secara tertulis.",
    "Pembayaran dilakukan sesuai kesepakatan kedua belah pihak.",
  ].join("\n"),
  termsNumbered: true,
  note: "",
  giverLabel: "Pemberi Order,",
  giver: "",
  doerLabel: "Pelaksana,",
  doer: "",
  showKnow: true,
  knowLabel: "Mengetahui,",
  know: "",
  size: "a4",
  blankKop: false,
  blankLot: false,
  blankArea: false,
  blankNo: false,
  blankDate: false,
  blankProject: false,
  blankLocation: false,
  blankType: false,
  blankContractor: false,
  blankSchedule: false,
  blankValue: false,
  blankTerms: false,
  blankNote: false,
  blankSigners: false,
});

/* isian yang bisa dicetak kosong (garis tulis) untuk diisi pulpen */
const BLANK_KEYS = ["blankKop", "blankLot", "blankArea", "blankNo", "blankDate", "blankProject", "blankLocation", "blankType",
  "blankContractor", "blankSchedule", "blankValue", "blankTerms", "blankNote", "blankSigners"];

let state = load();

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved) {
      delete saved.items; // tabel rincian pekerjaan sudah diganti bagian Ketentuan
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
const num = (n) => Math.round(n || 0).toLocaleString("id-ID");
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function formatDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  const bulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  return `${+d} ${bulan[+m - 1]} ${y}`;
}

const blockOf = (id) => BLOCKS.find((b) => b.id === id) || BLOCKS[0];
const orderNo = (k) => `${state.prefix}${k.block}-${String(k.no).padStart(2, "0")}`;

/* kavling yang dicetak sesuai pilihan "Cetak untuk" */
function scopeLots() {
  if (state.scope === "all") return ALL_LOTS;
  if (state.scope === "block") return ALL_LOTS.filter((k) => k.block === state.block);
  const found = ALL_LOTS.find((k) => k.block === state.block && k.no === state.lot);
  return [found || ALL_LOTS[0]];
}

function pageDims() {
  return state.size === "a5" ? { w: 148, h: 210, k: 0.72 } : { w: 210, h: 297, k: 1 };
}

/* ---------- form ---------- */
function fillBlockSelect() {
  $("#blockSel").innerHTML = BLOCKS.map((b) => `<option value="${b.id}">Blok ${b.id} (${b.lots.length})</option>`).join("");
}

function fillLotSelect() {
  const b = blockOf(state.block);
  if (!b.lots.some((l) => l.no === state.lot)) state.lot = b.lots[0].no;
  $("#lotSel").innerHTML = b.lots.map((l) => `<option value="${l.no}">No. ${l.no} (${l.area} m²)</option>`).join("");
  $("#lotSel").value = state.lot;
}

function syncFormFromState() {
  document.querySelectorAll("[data-key]").forEach((el) => {
    const key = el.dataset.key;
    if (el.type === "checkbox") el.checked = !!state[key];
    else if (key === "value") el.value = state.value ? num(state.value) : "";
    else el.value = state[key] ?? "";
  });
  fillLotSelect();
}

function bindFields() {
  fillBlockSelect();
  syncFormFromState();

  document.querySelectorAll("[data-key]").forEach((el) => {
    const key = el.dataset.key;
    el.addEventListener("input", () => {
      if (key === "value") {
        state.value = formatMoneyInput(el);
      } else {
        state[key] = el.type === "checkbox" ? el.checked : el.value;
      }
      if (key === "block") { fillLotSelect(); }
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

  const setAllBlank = (value) => {
    BLANK_KEYS.forEach((k) => { state[k] = value; });
    syncFormFromState();
    render();
  };
  $("#blankAll").addEventListener("click", () => setAllBlank(true));
  $("#blankNone").addEventListener("click", () => setAllBlank(false));

  $("#printBtn").addEventListener("click", () => window.print());

  $("#newBtn").addEventListener("click", () => {
    if (!confirm("Mulai data baru? Nama pelaksana, jadwal, nilai, dan catatan akan dikosongkan (kop, ketentuan, dan pilihan kavling tetap).")) return;
    Object.assign(state, { date: today(), contractor: "", startDate: "", duration: "", value: 0, note: "" });
    syncFormFromState();
    render();
  });
}

/* input rupiah: hanya angka, diberi titik ribuan, kursor tetap di tempat */
function formatMoneyInput(el) {
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

/* ---------- satu lembar order untuk satu kavling ---------- */
function sheetHTML(k, d) {
  // tiap baris di kotak Ketentuan menjadi satu butir; kalau kosong, dicetak garis tulis untuk tulisan tangan
  const lines = state.terms.split("\n").map((l) => l.trim()).filter(Boolean);
  const termsHTML = lines.length && !state.blankTerms
    ? `<${state.termsNumbered ? "ol" : "ul"} class="s-terms${state.termsNumbered ? "" : " plain"}">${lines.map((l) => `<li>${esc(l)}</li>`).join("")}</${state.termsNumbered ? "ol" : "ul"}>`
    : '<div class="wl"></div>'.repeat(state.size === "a5" ? 6 : 10);

  // isian yang dikosongkan dicetak sebagai garis titik-titik
  const val = (text, blank) => `<div class="val">${!blank && text ? esc(text) : "&nbsp;"}</div>`;
  const fill = '<span class="fill"></span>';
  const location = [
    state.desa && `Desa ${state.desa}`,
    state.kec && `Kec. ${state.kec}`,
    state.kab && `Kab. ${state.kab}`,
  ].filter(Boolean).join(", ");
  const duration = state.duration ? `${esc(state.duration)} hari` : "";
  const start = formatDate(state.startDate);
  const info = [
    ["Proyek / Perumahan", val(state.project, state.blankProject)],
    ["Lokasi", val(location, state.blankLocation)],
    ["Tipe bangunan", val(state.buildType, state.blankType)],
    ["Pelaksana / Mandor", val(state.contractor, state.blankContractor)],
    ["Mulai kerja / Durasi", val([start, duration].filter(Boolean).join(" / "), state.blankSchedule)],
    ["Nilai order", val(state.value ? "Rp " + num(state.value) : "", state.blankValue)],
  ].map(([label, v]) => `<tr><td>${label}</td><td>:</td><td>${v}</td></tr>`).join("");

  const cols = state.showKnow ? 3 : 2;
  const sign = (label, name) => `
    <div>
      <div>${esc(label)}</div>
      <div class="space"></div>
      <div class="line">${esc(name)}</div>
    </div>`;

  return `
  <section class="sheet" style="--w:${d.w}mm;--h:${d.h}mm;--k:${d.k}">
    <header class="s-head">
      <div class="s-brand">
        ${state.logo && !state.blankKop ? `<img class="s-logo" src="${state.logo}" alt="Logo">` : ""}
        <div>
          <div class="s-company">${state.blankKop ? "" : esc(state.company)}</div>
          <div class="s-address">${state.blankKop ? "" : esc(state.address)}</div>
        </div>
      </div>
      <div class="s-doc">
        <div class="s-title">${esc(state.title)}</div>
        <table>
          <tr><td>No.</td><td>: ${state.blankNo ? fill : esc(orderNo(k))}</td></tr>
          <tr><td>Tanggal</td><td>: ${state.blankDate ? fill : esc(formatDate(state.date))}</td></tr>
        </table>
      </div>
    </header>

    <div class="s-lot">
      <div>
        <div class="lbl">Alamat kavling</div>
        <div class="addr">${state.blankLot ? `Blok ${fill} No. ${fill}` : `Blok ${esc(k.block)} No. ${esc(k.no)}`}</div>
      </div>
      <div class="area">
        <div class="lbl">Luas tanah</div>
        <b>${state.blankArea ? `${fill} m²` : `${k.area} m²`}</b>
      </div>
    </div>

    <table class="s-info">${info}</table>

    ${state.termsTitle.trim() ? `<div class="s-sec">${esc(state.termsTitle)}</div>` : ""}
    ${termsHTML}

    ${state.blankNote
      ? `<div class="s-note"><b>Catatan:</b>${'<div class="wl"></div>'.repeat(3)}</div>`
      : state.note ? `<div class="s-note"><b>Catatan:</b>${esc(state.note)}</div>` : ""}

    <footer class="s-sign cols-${cols}">
      ${sign(state.giverLabel, state.blankSigners ? "" : state.giver)}
      ${sign(state.doerLabel, state.blankSigners ? "" : state.doer)}
      ${state.showKnow ? sign(state.knowLabel, state.blankSigners ? "" : state.know) : ""}
    </footer>
  </section>`;
}

/* ---------- render ---------- */
function render() {
  const d = pageDims();
  const list = scopeLots();
  $("#sheets").innerHTML = list.map((k) => sheetHTML(k, d)).join("");

  $("#blockBox").hidden = state.scope === "all";
  $("#lotBox").hidden = state.scope !== "one";
  $("#scopeInfo").textContent = state.scope === "one"
    ? `Mencetak 1 halaman: Blok ${list[0].block} No. ${list[0].no}.`
    : `Mencetak ${list.length} halaman, satu halaman per kavling.`;
  $("#noExample").textContent = `Contoh nomor: ${orderNo(list[0])}. Nomor tiap kavling dibuat otomatis dari awalan dan alamatnya.`;
  const sizeLabel = state.size === "a5" ? "A5" : "A4";
  $("#printHint").textContent = `Di dialog print atau Simpan PDF: Paper size ${sizeLabel}, Layout Portrait, margin None, skala 100%.`;

  save();
  fitPreview();
  $("#overflowWarn").hidden = ![...$("#sheets").children].some((s) => s.scrollHeight > s.clientHeight + 1);
}

/* perkecil preview kalau layar sempit */
function fitPreview() {
  const avail = $("#previewArea").clientWidth - 24;
  $("#zoomBox").style.zoom = Math.min(1.3, avail / (pageDims().w * MM_TO_PX));
}

/* ---------- start ---------- */
bindFields();
render();
window.addEventListener("resize", fitPreview);
