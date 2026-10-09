const $ = (id) => document.getElementById(id);
const typeSelect = $('qrType');
const fields = $('fields');
const errorBox = $('error');
const qrOutput = $('qrOutput');
const placeholder = $('placeholder');
const downloadBtn = $('download');
const recentList = $('recentList');
let currentPayload = '';
let currentCanvas = null;
let debounceTimer = null;
let toastTimer = null;

const fieldDefinitions = {
  url: [
    { id: 'url', label: 'Website URL', placeholder: 'https://example.com', type: 'url', help: 'Include https:// for the best results.' }
  ],
  text: [
    { id: 'text', label: 'Your text', placeholder: 'Type a message...', type: 'text', help: 'Add any message, note, or short piece of text.' }
  ],
  email: [
    { id: 'email', label: 'Email address', placeholder: 'hello@example.com', type: 'email' },
    { id: 'subject', label: 'Subject (optional)', placeholder: 'Hello!', type: 'text' },
    { id: 'body', label: 'Message (optional)', placeholder: 'Write your message...', type: 'text' }
  ],
  phone: [
    { id: 'phone', label: 'Phone number', placeholder: '+91 98765 43210', type: 'tel', help: 'Use a country code when possible.' }
  ],
  wifi: [
    { id: 'ssid', label: 'Wi-Fi network name (SSID)', placeholder: 'My Wi-Fi', type: 'text' },
    { id: 'password', label: 'Wi-Fi password', placeholder: 'Enter password', type: 'text' },
    { id: 'encryption', label: 'Security type', type: 'select', options: [['WPA','WPA / WPA2'],['WEP','WEP'],['nopass','No password']] },
    { id: 'hidden', label: 'Hidden network?', type: 'select', options: [['false','No'],['true','Yes']] }
  ]
};

function renderFields() {
  fields.innerHTML = '';
  fieldDefinitions[typeSelect.value].forEach((f) => {
    const wrap = document.createElement('div');
    const label = document.createElement('label');
    label.htmlFor = f.id;
    label.textContent = f.label;
    wrap.appendChild(label);
    let input;
    if (f.type === 'select') {
      input = document.createElement('select');
      f.options.forEach(([value, text]) => {
        const opt = document.createElement('option');
        opt.value = value; opt.textContent = text; input.appendChild(opt);
      });
    } else {
      input = document.createElement('input');
      input.type = f.type; input.placeholder = f.placeholder; input.autocomplete = 'off';
      input.className = 'field-input';
    }
    input.id = f.id;
    input.addEventListener('input', scheduleGenerate);
    input.addEventListener('change', scheduleGenerate);
    wrap.appendChild(input);
    if (f.help) {
      const help = document.createElement('p');
      help.className = 'field-help'; help.textContent = f.help; wrap.appendChild(help);
    }
    fields.appendChild(wrap);
  });
  generateQR();
}

function getValue(id) { const el = $(id); return el ? el.value.trim() : ''; }
function makePayload() {
  switch (typeSelect.value) {
    case 'url': {
      const value = getValue('url');
      if (!value) return { error: 'Enter a website URL to generate a QR code.' };
      try {
        const parsed = new URL(value);
        if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname.includes('.')) throw new Error();
        return { payload: parsed.href, label: parsed.href };
      } catch { return { error: 'Enter a valid URL, such as https://example.com.' }; }
    }
    case 'text': {
      const value = getValue('text');
      return value ? { payload: value, label: value } : { error: 'Enter some text first.' };
    }
    case 'email': {
      const email = getValue('email');
      if (!email) return { error: 'Enter an email address.' };
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Enter a valid email address.' };
      const subject = getValue('subject'), body = getValue('body');
      const params = new URLSearchParams();
      if (subject) params.set('subject', subject);
      if (body) params.set('body', body);
      const query = params.toString();
      const payload = `mailto:${email}${query ? '?' + query : ''}`;
      return { payload, label: email };
    }
    case 'phone': {
      const phone = getValue('phone');
      if (!phone) return { error: 'Enter a phone number.' };
      if (!/^\+?[0-9\s().-]{7,20}$/.test(phone) || phone.replace(/\D/g, '').length < 7) return { error: 'Enter a valid phone number (at least 7 digits).' };
      const normalized = phone.replace(/[^\d+]/g, '');
      return { payload: `tel:${normalized}`, label: phone };
    }
    case 'wifi': {
      const ssid = getValue('ssid');
      const password = getValue('password');
      const encryption = getValue('encryption');
      const hidden = getValue('hidden');
      if (!ssid) return { error: 'Enter the Wi-Fi network name.' };
      if (encryption !== 'nopass' && !password) return { error: 'Enter the Wi-Fi password, or choose “No password”.' };
      const esc = (s) => s.replace(/([\\;,:"])/g, '\\$1');
      const payload = `WIFI:T:${encryption};S:${esc(ssid)};P:${esc(encryption === 'nopass' ? '' : password)};H:${hidden};;`;
      return { payload, label: `Wi-Fi: ${ssid}` };
    }
  }
}

function getCorrection() {
  const map = { L: QRCode.CorrectLevel.L, M: QRCode.CorrectLevel.M, Q: QRCode.CorrectLevel.Q, H: QRCode.CorrectLevel.H };
  return map[$('correction').value] ?? QRCode.CorrectLevel.H;
}
function scheduleGenerate() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(generateQR, 180);
}
function generateQR(save = false) {
  const result = makePayload();
  errorBox.textContent = '';
  qrOutput.innerHTML = '';
  currentCanvas = null;
  currentPayload = '';
  downloadBtn.disabled = true;
  if (result.error) {
    errorBox.textContent = result.error;
    placeholder.style.display = 'block';
    $('scanNote').textContent = 'Add valid information to create your QR code.';
    return;
  }
  if (typeof QRCode === 'undefined') {
    errorBox.textContent = 'The QR library did not load. Check your internet connection and refresh.';
    placeholder.style.display = 'block';
    return;
  }
  const size = Number($('size').value);
  const margin = Number($('margin').value);
  const fg = $('foreground').value;
  const bg = $('background').value;
  const hiddenQR = document.createElement('div');
  hiddenQR.style.position = 'absolute';
  hiddenQR.style.left = '-9999px';
  document.body.appendChild(hiddenQR);
  new QRCode(hiddenQR, {
    text: result.payload, width: size, height: size,
    colorDark: fg, colorLight: bg, correctLevel: getCorrection()
  });
  const sourceCanvas = hiddenQR.querySelector('canvas');
  const sourceImage = hiddenQR.querySelector('img');
  const finish = (source) => {
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = size + margin * 2;
    outputCanvas.height = size + margin * 2;
    const ctx = outputCanvas.getContext('2d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, outputCanvas.width, outputCanvas.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(source, margin, margin, size, size);
    qrOutput.innerHTML = '';
    qrOutput.appendChild(outputCanvas);
    currentCanvas = outputCanvas;
    currentPayload = result.payload;
    placeholder.style.display = 'none';
    downloadBtn.disabled = false;
    $('scanNote').textContent = `${size}px QR code · ${$('correction').value} correction · ${margin}px margin`;
    document.body.removeChild(hiddenQR);
    if (save) addRecent({ label: result.label, type: typeSelect.value, payload: result.payload, dataUrl: outputCanvas.toDataURL('image/png'), settings: { size, margin, fg, bg, correction: $('correction').value } });
  };
  if (sourceCanvas) finish(sourceCanvas);
  else if (sourceImage) {
    if (sourceImage.complete) finish(sourceImage);
    else sourceImage.onload = () => finish(sourceImage);
  } else {
    setTimeout(() => {
      const canvas = hiddenQR.querySelector('canvas');
      if (canvas) finish(canvas);
      else { document.body.removeChild(hiddenQR); errorBox.textContent = 'Could not create this QR code. Try shorter text.'; }
    }, 100);
  }
}

function downloadPNG() {
  if (!currentCanvas) return;
  const link = document.createElement('a');
  link.download = `qr-studio-${Date.now()}.png`;
  link.href = currentCanvas.toDataURL('image/png');
  link.click();
  addCurrentToRecent();
  showToast('PNG downloaded and saved to recent codes.');
}
function addCurrentToRecent() {
  const result = makePayload();
  if (!result.error && currentCanvas) {
    addRecent({ label: result.label, type: typeSelect.value, payload: result.payload, dataUrl: currentCanvas.toDataURL('image/png'), settings: { size: Number($('size').value), margin: Number($('margin').value), fg: $('foreground').value, bg: $('background').value, correction: $('correction').value } });
  }
}
function readRecent() {
  try { return JSON.parse(localStorage.getItem('qrStudioRecent') || '[]'); } catch { return []; }
}
function addRecent(item) {
  const list = readRecent().filter(x => x.payload !== item.payload);
  list.unshift({ ...item, createdAt: Date.now() });
  localStorage.setItem('qrStudioRecent', JSON.stringify(list.slice(0, 5)));
  renderRecent();
}
function renderRecent() {
  const items = readRecent();
  recentList.innerHTML = '';
  if (!items.length) {
    const p = document.createElement('p'); p.className = 'empty-recent'; p.textContent = 'Your recent codes will appear here.'; recentList.appendChild(p); return;
  }
  items.forEach((item) => {
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'recent-item';
    const thumb = document.createElement('span'); thumb.className = 'recent-thumb';
    const img = document.createElement('img'); img.src = item.dataUrl; img.alt = ''; thumb.appendChild(img);
    const info = document.createElement('span'); info.className = 'recent-info';
    const title = document.createElement('span'); title.className = 'recent-title'; title.textContent = item.label;
    const sub = document.createElement('span'); sub.className = 'recent-sub'; sub.textContent = `${item.type.toUpperCase()} · ${new Date(item.createdAt).toLocaleDateString()}`;
    info.append(title, sub);
    const arrow = document.createElement('span'); arrow.className = 'recent-arrow'; arrow.textContent = '↗';
    btn.append(thumb, info, arrow);
    btn.addEventListener('click', () => restoreRecent(item));
    recentList.appendChild(btn);
  });
}
function restoreRecent(item) {
  typeSelect.value = item.type;
  renderFields();
  const data = item.payload;
  if (item.type === 'url') $('url').value = data;
  else if (item.type === 'text') $('text').value = data;
  else if (item.type === 'email') {
    const match = data.match(/^mailto:([^?]+)(?:\?(.*))?$/);
    if (match) {
      $('email').value = match[1];
      const params = new URLSearchParams(match[2] || '');
      $('subject').value = params.get('subject') || '';
      $('body').value = params.get('body') || '';
    }
  } else if (item.type === 'phone') $('phone').value = data.replace(/^tel:/, '');
  else if (item.type === 'wifi') {
    const matches = Object.fromEntries([...data.matchAll(/([TSPH]):((?:\\.|[^;])*)/g)].map(m => [m[1], m[2].replace(/\\([\\;,:"])/g, '$1')]));
    $('ssid').value = matches.S || '';
    $('password').value = matches.P || '';
    if ($('encryption')) $('encryption').value = matches.T || 'WPA';
    if ($('hidden')) $('hidden').value = matches.H || 'false';
  }
  if (item.settings) {
    $('size').value = item.settings.size;
    $('margin').value = item.settings.margin;
    $('foreground').value = item.settings.fg;
    $('background').value = item.settings.bg;
    $('correction').value = item.settings.correction;
    updateLabels();
  }
  generateQR();
  showToast('Recent QR code restored.');
}
function updateLabels() {
  $('sizeValue').textContent = `${$('size').value} px`;
  $('marginValue').textContent = `${$('margin').value} px`;
  $('fgText').textContent = $('foreground').value.toUpperCase();
  $('bgText').textContent = $('background').value.toUpperCase();
}
function applyPreset(name) {
  const presets = {
    classic: ['#111827', '#ffffff'],
    ocean: ['#075985', '#e0f2fe'],
    berry: ['#86198f', '#fdf4ff']
  };
  const [fg, bg] = presets[name];
  $('foreground').value = fg; $('background').value = bg;
  document.querySelectorAll('.preset').forEach(b => b.classList.toggle('active', b.dataset.preset === name));
  updateLabels(); generateQR();
}
function showToast(message) {
  const toast = $('toast'); toast.textContent = message; toast.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

typeSelect.addEventListener('change', renderFields);
['size','margin','foreground','background','correction'].forEach(id => {
  $(id).addEventListener('input', () => { updateLabels(); generateQR(); });
  $(id).addEventListener('change', () => { updateLabels(); generateQR(); });
});
document.querySelectorAll('.preset').forEach(btn => btn.addEventListener('click', () => applyPreset(btn.dataset.preset)));
downloadBtn.addEventListener('click', downloadPNG);
$('clearRecent').addEventListener('click', () => { localStorage.removeItem('qrStudioRecent'); renderRecent(); showToast('Recent codes cleared.'); });

renderFields();
updateLabels();
renderRecent();
