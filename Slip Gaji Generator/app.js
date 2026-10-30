(() => {
  'use strict';

  const STORAGE_KEY = 'slipGajiGenerator.v1';
  const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const $ = (id) => document.getElementById(id);

  const TEXT_FIELDS = ['coAddress','empName', 'empId', 'empPosition',
    'year', 'a5w', 'a5h', 'a5ml', 'a5mr', 'payDate', 'payMethod', 'notes', 'signer', 'signerPos', 'capKes', 'capJp'];

  const defaults = () => {
    const now = new Date();
    return {
      coAddress: '', coLogo: '',
      empName: '', empId: '', empPosition: '',
      month: now.getMonth(), year: now.getFullYear(), payDate: '', payMethod: '',
      earnings: [{ label: 'Gaji Pokok', amount: 0 }, { label: 'Tunjangan Transport', amount: 0 }, { label: 'Tunjangan Makan', amount: 0 }],
      deductions: [{ label: 'PPh 21', amount: 0 }],
      paper: 'A4', a5w: 215, a5h: 137, a5ml: 8, a5mr: 8,
      autoBpjs: false, capKes: 12000000, capJp: 10547400,
      notes: '', signer: '', signerPos: '',
    };
  };

  let state = load() || defaults();

  // ---------- helpers ----------
  const toNum = (v) => Math.max(0, Math.round(Number(v) || 0));
  const rupiah = (n) => 'Rp ' + n.toLocaleString('id-ID');
  const fmtDate = (iso) => {
    if (!iso) return '';
    const [y, m, d] = iso.split('-').map(Number);
    return `${d} ${MONTHS[m - 1]} ${y}`;
  };

  const SATUAN = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
  function terbilang(n) {
    n = Math.floor(n);
    if (n < 12) return SATUAN[n];
    if (n < 20) return terbilang(n - 10) + ' belas';
    if (n < 100) return terbilang(Math.floor(n / 10)) + ' puluh' + (n % 10 ? ' ' + terbilang(n % 10) : '');
    if (n < 200) return 'seratus' + (n > 100 ? ' ' + terbilang(n - 100) : '');
    if (n < 1000) return terbilang(Math.floor(n / 100)) + ' ratus' + (n % 100 ? ' ' + terbilang(n % 100) : '');
    if (n < 2000) return 'seribu' + (n > 1000 ? ' ' + terbilang(n - 1000) : '');
    if (n < 1e6) return terbilang(Math.floor(n / 1e3)) + ' ribu' + (n % 1e3 ? ' ' + terbilang(n % 1e3) : '');
    if (n < 1e9) return terbilang(Math.floor(n / 1e6)) + ' juta' + (n % 1e6 ? ' ' + terbilang(n % 1e6) : '');
    if (n < 1e12) return terbilang(Math.floor(n / 1e9)) + ' miliar' + (n % 1e9 ? ' ' + terbilang(n % 1e9) : '');
    return terbilang(Math.floor(n / 1e12)) + ' triliun' + (n % 1e12 ? ' ' + terbilang(n % 1e12) : '');
  }
  const terbilangRupiah = (n) => (n === 0 ? 'nol' : terbilang(n)).replace(/^./, (c) => c.toUpperCase()) + ' rupiah';

  // Gaji pokok = baris pendapatan pertama; BPJS dihitung dari upah tersebut.
  function bpjsItems() {
    const base = toNum(state.earnings[0] && state.earnings[0].amount);
    const kes = Math.round(Math.min(base, toNum(state.capKes)) * 0.01);
    const jht = Math.round(base * 0.02);
    const jp = Math.round(Math.min(base, toNum(state.capJp)) * 0.01);
    return [
      { label: 'BPJS Kesehatan (1%)', amount: kes, auto: true },
      { label: 'BPJS JHT (2%)', amount: jht, auto: true },
      { label: 'BPJS JP (1%)', amount: jp, auto: true },
    ];
  }
  const allDeductions = () => (state.autoBpjs ? bpjsItems() : []).concat(state.deductions);

  // ---------- persistence ----------
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? Object.assign(defaults(), JSON.parse(raw)) : null;
    } catch { return null; }
  }
  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* quota / private mode */ }
  }

  // ---------- form <-> state ----------
  function buildStatic() {
    $('month').innerHTML = MONTHS.map((m, i) => `<option value="${i}">${m}</option>`).join('');
  }

  function fillForm() {
    TEXT_FIELDS.forEach((id) => { $(id).value = state[id] ?? ''; });
    $('month').value = state.month;
    $('paper').value = state.paper;
    $('autoBpjs').checked = !!state.autoBpjs;
    renderRows('earnings');
    renderRows('deductions');
    toggleBpjsCap();
  }

  function toggleBpjsCap() {
    document.querySelector('.bpjs-cap').hidden = !state.autoBpjs;
  }

  function renderRows(kind) {
    const box = $(kind);
    box.innerHTML = '';
    const rows = state[kind];
    const autoRows = kind === 'deductions' && state.autoBpjs ? bpjsItems() : [];
    autoRows.forEach((it) => {
      const el = document.createElement('div');
      el.className = 'row auto';
      el.innerHTML = '<input type="text" disabled><input type="text" disabled><span></span>';
      el.children[0].value = it.label;
      el.children[1].value = it.amount.toLocaleString('id-ID');
      el.dataset.auto = '1';
      box.appendChild(el);
    });
    rows.forEach((it, i) => {
      const el = document.createElement('div');
      el.className = 'row';
      el.innerHTML = '<input type="text" placeholder="Keterangan" data-f="label"><input type="number" min="0" step="1000" placeholder="0" data-f="amount"><button type="button" class="del" title="Hapus">&times;</button>';
      el.children[0].value = it.label;
      el.children[1].value = it.amount || '';
      el.children[0].addEventListener('input', (e) => { rows[i].label = e.target.value; update(); });
      el.children[1].addEventListener('input', (e) => { rows[i].amount = toNum(e.target.value); update(true); });
      el.children[2].addEventListener('click', () => { rows.splice(i, 1); renderRows(kind); update(); });
      box.appendChild(el);
    });
  }

  // Refresh read-only BPJS rows in place so typing in the amount field keeps focus.
  function refreshAutoRows() {
    if (!state.autoBpjs) return;
    const items = bpjsItems();
    [...$('deductions').querySelectorAll('.row.auto')].forEach((el, i) => {
      el.children[1].value = items[i].amount.toLocaleString('id-ID');
    });
  }

  // ---------- preview ----------
  function itemRows(items) {
    const shown = items.filter((it) => it.amount > 0 || it.label.trim());
    if (!shown.length) return '<tr><td colspan="2" style="color:#999">-</td></tr>';
    return shown.map((it) => `<tr><td>${esc(it.label)}</td><td class="num">${rupiah(toNum(it.amount))}</td></tr>`).join('');
  }
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function applyPaper() {
    const paper = state.paper === 'A5' ? 'A5' : 'A4';
    $('slip').dataset.paper = paper;
    // A4 = HVS tegak; A5 = NCR continuous form mendatar, ukuran bisa diatur (default 215 x 137 mm).
    const clamp0 = (v, lo, hi, d) => (v === '' || v == null || isNaN(v) ? d : Math.min(hi, Math.max(lo, Number(v))));
    const clamp = (v, lo, hi, d) => Math.min(hi, Math.max(lo, Number(v) || d));
    const w = clamp(state.a5w, 100, 300, 215);
    const h = clamp(state.a5h, 80, 300, 137);
    const ml = clamp0(state.a5ml, 0, 80, 8);
    const mr = clamp0(state.a5mr, 0, 80, 8);
    const slip = $('slip');
    // Tinggi slip 1mm lebih kecil dari kertas supaya tidak lari ke halaman 2.
    slip.style.width = paper === 'A5' ? `${w}mm` : '';
    slip.style.height = paper === 'A5' ? `${h - 1}mm` : '';
    slip.style.paddingLeft = paper === 'A5' ? `${ml}mm` : '';
    slip.style.paddingRight = paper === 'A5' ? `${mr}mm` : '';
    $('a5size').hidden = paper !== 'A5';
    const size = paper === 'A5' ? `${w}mm ${h}mm` : 'A4 portrait';
    $('pageStyle').textContent = `@page { size: ${size}; margin: 0; }`;
  }

  function renderPreview() {
    applyPaper();
    const earn = state.earnings.map((e) => ({ ...e, amount: toNum(e.amount) }));
    const ded = allDeductions().map((d) => ({ ...d, amount: toNum(d.amount) }));
    const totalEarn = earn.reduce((s, e) => s + e.amount, 0);
    const totalDed = ded.reduce((s, d) => s + d.amount, 0);
    const net = totalEarn - totalDed;

    $('pCoAddress').textContent = state.coAddress;
    $('pPeriod').textContent = `Periode ${MONTHS[state.month]} ${state.year}`;
    const logo = $('pLogo');
    logo.hidden = !state.coLogo;
    if (state.coLogo) logo.src = state.coLogo;

    $('pEmpName').textContent = state.empName || '-';
    $('pEmpId').textContent = state.empId || '-';
    $('pEmpPosition').textContent = state.empPosition || '-';
    $('pPayDate').textContent = fmtDate(state.payDate) || '-';
    $('pPayMethod').textContent = state.payMethod || '-';

    $('pEarnings').innerHTML = itemRows(earn);
    $('pDeductions').innerHTML = itemRows(ded);
    $('pTotalEarn').textContent = rupiah(totalEarn);
    $('pTotalDed').textContent = rupiah(totalDed);

    const netEl = $('pNet');
    netEl.textContent = (net < 0 ? '-' : '') + rupiah(Math.abs(net));
    $('pWords').textContent = net < 0 ? 'Potongan melebihi pendapatan.' : `Terbilang: ${terbilangRupiah(net)}`;

    $('pNotes').textContent = state.notes;
    $('pSignEmp').textContent = state.empName;
    $('pSignDate').textContent = state.payDate ? fmtDate(state.payDate) : `${MONTHS[state.month]} ${state.year}`;
    $('pSigner').textContent = state.signer;
    $('pSignerPos').textContent = state.signerPos;
    const slip = $('slip');
    $('warn').hidden = !(state.paper === 'A5' && slip.scrollHeight > slip.clientHeight + 1);
    document.title = state.empName ? `Slip Gaji - ${state.empName} - ${MONTHS[state.month]} ${state.year}` : 'Slip Gaji Generator';
    fitPreview();
  }

  // Layar sempit: kecilkan preview kertas supaya muat tanpa geser ke samping. Cetak tidak terpengaruh (zoom dikembalikan di CSS print).
  function fitPreview() {
    const slip = $('slip');
    slip.style.zoom = '';
    const avail = slip.parentElement.clientWidth;
    if (slip.offsetWidth > avail) slip.style.zoom = avail / slip.offsetWidth;
  }
  window.addEventListener('resize', fitPreview);

  function update(amountEdit) {
    if (amountEdit) refreshAutoRows();
    renderPreview();
    persist();
  }

  // ---------- events ----------
  function bind() {
    TEXT_FIELDS.forEach((id) => {
      $(id).addEventListener('input', (e) => {
        state[id] = ['year', 'capKes', 'capJp', 'a5w', 'a5h', 'a5ml', 'a5mr'].includes(id) ? Number(e.target.value) || 0 : e.target.value;
        update(true);
      });
    });
    $('month').addEventListener('change', (e) => { state.month = Number(e.target.value); update(); });
    $('paper').addEventListener('change', (e) => { state.paper = e.target.value; update(); });
    $('autoBpjs').addEventListener('change', (e) => {
      state.autoBpjs = e.target.checked;
      toggleBpjsCap();
      renderRows('deductions');
      update();
    });

    document.querySelectorAll('[data-add]').forEach((btn) => btn.addEventListener('click', () => {
      const kind = btn.dataset.add;
      state[kind].push({ label: '', amount: 0 });
      renderRows(kind);
      const inputs = $(kind).querySelectorAll('.row:not(.auto) input[data-f="label"]');
      inputs[inputs.length - 1].focus();
      update();
    }));

    $('coLogo').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) { state.coLogo = ''; update(); return; }
      const reader = new FileReader();
      reader.onload = () => { state.coLogo = reader.result; update(); };
      reader.readAsDataURL(file);
    });

    $('btnPrint').addEventListener('click', () => window.print());

    $('btnReset').addEventListener('click', () => {
      if (!confirm('Hapus semua data dan mulai dari awal?')) return;
      state = defaults();
      $('coLogo').value = '';
      fillForm();
      update();
    });

    $('btnSave').addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      const who = (state.empName || 'karyawan').replace(/[^\w-]+/g, '_');
      a.download = `slip-gaji_${who}_${state.year}-${String(state.month + 1).padStart(2, '0')}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    });

    $('fileLoad').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          state = Object.assign(defaults(), JSON.parse(reader.result));
          fillForm();
          update();
        } catch { alert('File tidak valid.'); }
      };
      reader.readAsText(file);
      e.target.value = '';
    });
  }

  buildStatic();
  fillForm();
  bind();
  renderPreview();
})();
