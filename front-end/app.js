/* ======= Config ======= */
const PUBLISHED_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRhxfldSPR9yy77elKQo2wImUxn77G4Hjkaaus23VUt4V1c4duyjYi1lZK88vpjxIWxl_XrKberInpe/pub?gid=1387792899&single=true&output=csv";
const LIVE_DASHBOARD_LINK = "https://docs.google.com/spreadsheets/d/1BKuJwrcSrV1bJuyF-kOxoDBRfsTmFmr4AxT5_krYRvk/edit?gid=738679946#gid=738679946";
const SHEET_VIEW_LINK     = "https://docs.google.com/spreadsheets/d/1BKuJwrcSrV1bJuyF-kOxoDBRfsTmFmr4AxT5_krYRvk/edit?resourcekey=&gid=1387792899#gid=1387792899";

const PROXIES = [
  { name:'allorigins-raw', template:'https://api.allorigins.win/raw?url={url}', type:'text' },
  { name:'allorigins-json', template:'https://api.allorigins.win/get?url={url}', type:'json' },
  { name:'thingproxy', template:'https://thingproxy.freeboard.io/fetch/{url}', type:'text' },
  { name:'rjina', template:'https://r.jina.ai/http://{url}', type:'text' }
];

const UPDATE_INTERVAL = 15000;
const FETCH_TIMEOUT_MS = 10000;
const MAX_RETRIES_PER_PROXY = 2;

/* ======= Estado & Variáveis Globais ======= */
let currentMaxPoints = 200; // Valor padrão inicial
let lastRawCsv = "";        // Cache do último CSV baixado para trocas rápidas
let chartMain = null;
let lastGood = null;
let timerWidth = 0;
let timerHandle = null;

/* ======= Setup live button ======= */
const liveButton = document.getElementById('live-button');
liveButton.href = LIVE_DASHBOARD_LINK;
liveButton.className = 'button-link';
liveButton.style.cssText = 'display:inline-block;padding:8px 12px;border-radius:8px;background:var(--accent);color:#fff;text-decoration:none;font-weight:700';

const sheetEdit = document.getElementById('sheet-edit');
sheetEdit.href = SHEET_VIEW_LINK;

/* ======= Listener do Seletor de Pontos ======= */
document.getElementById('points-selector').addEventListener('change', (e) => {
  const val = parseInt(e.target.value);
  currentMaxPoints = val; // Atualiza estado
  
  // Se já temos dados em cache, reprocessa imediatamente sem baixar de novo
  if (lastRawCsv) {
    try {
      const parsed = parseCsvText(lastRawCsv);
      updateUI(parsed);
    } catch(err) { console.error("Erro ao mudar pontos:", err); }
  }
});

/* ======= Utils ======= */
function timeoutPromise(ms){ return new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')), ms)); }

function computeYAxisRange(arrays) {
  let min=Infinity, max=-Infinity;
  for (const arr of arrays) for (const v of (arr||[])) {
    if (v===null||v===undefined||isNaN(v)) continue;
    if (v<min) min=v;
    if (v>max) max=v;
  }
  if (!isFinite(min)||!isFinite(max)) return {min:0,max:100};
  if (min===max) { const d = Math.abs(min)>1?Math.abs(min)*0.02:1; return {min:min-d,max:max+d}; }
  const range = max-min; const pad = Math.max(range*0.08,1);
  let ymin = min-pad, ymax = max+pad; if (ymin<0 && min>=0) ymin=0;
  return {min:ymin,max:ymax};
}

/* ======= Fetch ======= */
async function fetchCsvWithFallback() {
  const urlComCacheBuster = PUBLISHED_CSV + "&t=" + new Date().getTime();
  const targetEncoded = encodeURIComponent(urlComCacheBuster);
  for (const proxy of PROXIES) {
    const url = proxy.template.replace('{url}', targetEncoded);
    for (let attempt=1; attempt<=MAX_RETRIES_PER_PROXY; attempt++) {
      try {
        console.log(`[fetch] try proxy=${proxy.name} attempt=${attempt}`);
        const respPromise = fetch(url);
        const res = await Promise.race([respPromise, timeoutPromise(FETCH_TIMEOUT_MS)]);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        let text;
        if (proxy.type === 'json') {
          const j = await res.json();
          if (j && typeof j.contents === 'string') text = j.contents;
          else if (typeof j === 'string') text = j;
          else throw new Error('JSON sem contents');
        } else {
          text = await res.text();
        }
        if (typeof text === 'string' && text.startsWith('data:') && text.indexOf('base64,') !== -1) {
          text = decodeURIComponent(escape(window.atob(text.split('base64,')[1])));
        }
        return text;
      } catch (err) {
        console.warn(`[fetch] proxy ${proxy.name} failed attempt ${attempt}:`, err.message || err);
        await new Promise(r=>setTimeout(r, 300 * attempt));
        continue;
      }
    }
    console.info(`[fetch] proxy ${proxy.name} exhausted, next proxy`);
  }
  throw new Error('Todas tentativas de proxy falharam');
}

/* ======= CSV parser (Adaptado para currentMaxPoints) ======= */
function parseCsvText(csv) {
  const lines = csv.split(/\r\n|\n/).filter(l=>l.trim()!=='');
  if (lines.length < 2) throw new Error('CSV sem linhas suficientes');
  const dataLines = lines.slice(1);
  const labels = [], temps = [], hums = [], luxs = [], mini = [];
  for (const row of dataLines) {
    const cols = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(s=>s.replace(/^"|"$/g,'').trim());
    if (cols.length < 4) {
      const colsSemi = row.split(/;(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(s=>s.replace(/^"|"$/g,'').trim());
      if (colsSemi.length >= 4) { cols.length = 0; cols.push(...colsSemi); } else continue;
    }
    const dateRaw = cols[0];
    const hum = parseFloat((cols[1]||'').replace(',','.'));
    const lux = parseFloat((cols[2]||'').replace(',','.'));
    const temp = parseFloat((cols[3]||'').replace(',','.'));
    if (isNaN(hum) && isNaN(lux) && isNaN(temp)) continue;
    const hora = (dateRaw.split(' ')[1] || dateRaw);
    labels.push(hora);
    temps.push(isNaN(temp)? null: temp);
    hums.push(isNaN(hum)? null: hum);
    luxs.push(isNaN(lux)? null: lux);
    mini.push({hora:hora, hum:isNaN(hum)?'':hum, lux:isNaN(lux)?'':lux, temp:isNaN(temp)?'':temp});
  }

  // LOGICA NOVA DE CORTE
  let limit = currentMaxPoints;
  if (limit === 0) limit = labels.length; // Se 0, pega tudo
  const start = Math.max(0, labels.length - limit);

  return {
    labels: labels.slice(start),
    temps: temps.slice(start),
    hums: hums.slice(start),
    luxs: luxs.slice(start),
    mini: mini.slice(-8).reverse()
  };
}

/* ======= Update UI & Chart ======= */
function updateUI(parsed) {
  if (!parsed) return;
  lastGood = parsed;
  // KPIs
  const lastIdx = parsed.temps.length - 1;
  if (lastIdx >= 0) {
    if (parsed.temps[lastIdx] !== null && parsed.temps[lastIdx] !== undefined) document.getElementById('val-temp').innerText = Number(parsed.temps[lastIdx]).toFixed(1);
    if (parsed.hums[lastIdx] !== null && parsed.hums[lastIdx] !== undefined)  document.getElementById('val-hum').innerText  = Math.round(parsed.hums[lastIdx]);
    if (parsed.luxs[lastIdx] !== null && parsed.luxs[lastIdx] !== undefined)  document.getElementById('val-lux').innerText  = Math.round(parsed.luxs[lastIdx]);
  }
  // mini table
  const tbody = document.querySelector('#mini-table tbody'); tbody.innerHTML = '';
  for (const r of parsed.mini) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${r.hora}</td><td>${r.hum===''?'-':r.hum}</td><td>${r.lux===''?'-':r.lux}</td><td>${r.temp===''?'-':r.temp}</td>`;
    tbody.appendChild(tr);
  }
  // chart
  const arrays = [parsed.temps, parsed.hums, parsed.luxs];
  const yr = computeYAxisRange(arrays);
  const ctx = document.getElementById('mainChart').getContext('2d');
  const datasets = [
    { label:'Temperatura (°C)', data: parsed.temps, borderColor:'#ef4444', backgroundColor:'rgba(239,68,68,0.08)', tension:0.2, fill:true },
    { label:'Umidade (%)', data: parsed.hums, borderColor:'#3b82f6', backgroundColor:'rgba(59,130,246,0.08)', tension:0.2, fill:true },
    { label:'Luminosidade', data: parsed.luxs, borderColor:'#f59e0b', backgroundColor:'rgba(245,158,11,0.06)', tension:0.2, fill:false }
  ];
  if (chartMain) {
    chartMain.options.animation = { duration: 0 };
    chartMain.data.labels = parsed.labels;
    chartMain.data.datasets = datasets;
    chartMain.options.scales.y.min = yr.min;
    chartMain.options.scales.y.max = yr.max;
    chartMain.update('none');
  } else {
    chartMain = new Chart(ctx, {
      type:'line',
      data:{ labels: parsed.labels, datasets: datasets },
      options:{
        responsive:true, maintainAspectRatio:false, animation:{ duration:0 },
        interaction:{ mode:'index', intersect:false },
        plugins:{ legend:{ position:'top' } },
        scales:{ x:{ grid:{ color:'rgba(255,255,255,0.03)' }, ticks:{ color:'rgba(230,238,246,0.9)' } },
                 y:{ type:'linear', display:true, min: yr.min, max: yr.max, ticks:{ color:'rgba(230,238,246,0.9)' } } }
      }
    });
  }
  document.getElementById('scale-note').innerText = `Escala Y: ${yr.min.toFixed(1)} — ${yr.max.toFixed(1)}`;
  document.getElementById('status').innerText = `Online • ${parsed.labels.length} pts`;
  document.getElementById('status').className = 'status-badge status-ok';
  document.getElementById('last-update').innerText = new Date().toLocaleTimeString();
}

/* ======= Main routine ======= */
async function runOnce() {
  try {
    const csvText = await fetchCsvWithFallback();
    lastRawCsv = csvText; // Salva no cache para uso do filtro
    const parsed = parseCsvText(csvText);
    updateUI(parsed);
  } catch (err) {
    console.error('[runOnce] erro:', err.message || err);
    document.getElementById('status').innerText = 'Erro sincr.'; document.getElementById('status').className = 'status-badge status-err';
    if (lastGood) updateUI(lastGood);
  }
}

/* ======= Timer visual ======= */
function startTimer() {
  if (timerHandle) clearInterval(timerHandle);
  timerWidth = 0; document.getElementById('timer-bar').style.width = '0%';
  const step = 100 / (UPDATE_INTERVAL / 100);
  timerHandle = setInterval(() => {
    timerWidth += step;
    document.getElementById('timer-bar').style.width = Math.min(timerWidth,100) + '%';
    if (timerWidth >= 100) {
      clearInterval(timerHandle); timerWidth = 0;
      runOnce().then(()=>startTimer());
    }
  }, 100);
}

/* ======= Start ======= */
runOnce().then(()=>startTimer()).catch(()=>startTimer());
