'use strict';

const VERSION = 'v1.0.4';
const LS_KEY = 'angel_change_react_v1';
const LS_QUOTES = 'angel_change_quotes_v1';

const FORM_URL = 'https://forms.gle/wyWJ9KpaKx6HGXvP7';

/* ✅ 你的影片連結 */
const VIDEO_URL = 'https://youtu.be/pEm1sZS9g4g?si=6qftr0EIWiUyFIEa';

const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

function toast(msg){
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(()=> el.classList.remove('show'), 1600);
}

function safeJsonParse(str, fallback){
  try{ return JSON.parse(str); }catch(e){ return fallback; }
}

function nowISO(){
  const d = new Date();
  const pad = n => String(n).padStart(2,'0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* ---------------- Tabs ---------------- */
function setTab(which){
  const isTool = which === 'tool';
  $('#tab-tool').classList.toggle('is-active', isTool);
  $('#tab-about').classList.toggle('is-active', !isTool);
  $('#tab-tool').setAttribute('aria-selected', isTool ? 'true' : 'false');
  $('#tab-about').setAttribute('aria-selected', !isTool ? 'true' : 'false');
  $('#panel-tool').classList.toggle('is-active', isTool);
  $('#panel-about').classList.toggle('is-active', !isTool);
  if(!isTool) window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ---------------- Install prompt ---------------- */
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const btn = $('#btnInstall');
  btn.hidden = false;
});

async function doInstall(){
  if(!deferredPrompt){
    toast('此瀏覽器暫時無法顯示安裝提示（可到「說明與安裝」看手動步驟）。');
    return;
  }
  deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
  deferredPrompt = null;
  if(choice && choice.outcome === 'accepted'){
    toast('已送出安裝指令。');
    $('#btnInstall').hidden = true;
  }else{
    toast('沒關係，需要時再安裝。');
  }
}

/* ---------------- Data model ---------------- */
const defaultState = {
  meta: { version: VERSION, createdAt: nowISO(), updatedAt: nowISO() },
  s1: { feel: '', seconds: 45, phraseCustom: '' },
  s2: { thought: '', body: '', score: 5, phraseCustom: '' },
  s3: { old: '', next: '', ten: false, phraseCustom: '' },
};

let state = loadState();

function loadState(){
  const raw = localStorage.getItem(LS_KEY);
  if(!raw) return structuredClone(defaultState);
  const data = safeJsonParse(raw, null);
  if(!data) return structuredClone(defaultState);

  return {
    ...structuredClone(defaultState),
    ...data,
    meta: { ...structuredClone(defaultState.meta), ...(data.meta||{}) },
    s1: { ...structuredClone(defaultState.s1), ...(data.s1||{}) },
    s2: { ...structuredClone(defaultState.s2), ...(data.s2||{}) },
    s3: { ...structuredClone(defaultState.s3), ...(data.s3||{}) },
  };
}

function saveState(){
  state.meta.updatedAt = nowISO();
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

function bindAutosave(){
  const map = [
    ['#s1_feel', v => state.s1.feel = v],
    ['#s1_seconds', v => state.s1.seconds = Number(v)],
    ['#s1_phraseCustom', v => state.s1.phraseCustom = v],

    ['#s2_thought', v => state.s2.thought = v],
    ['#s2_body', v => state.s2.body = v],
    ['#s2_score', v => state.s2.score = Number(v)],
    ['#s2_phraseCustom', v => state.s2.phraseCustom = v],

    ['#s3_old', v => state.s3.old = v],
    ['#s3_new', v => state.s3.next = v],
    ['#s3_ten', v => state.s3.ten = Boolean(v)],
    ['#s3_phraseCustom', v => state.s3.phraseCustom = v],
  ];

  map.forEach(([sel, write]) => {
    const el = $(sel);
    if(!el) return;

    const handler = () => {
      if(el.type === 'checkbox') write(el.checked);
      else write(el.value);
      saveState();
    };

    el.addEventListener('input', handler);
    el.addEventListener('change', handler);
  });
}

function hydrateUI(){
  $('#s1_feel').value = state.s1.feel;
  $('#s1_seconds').value = String(state.s1.seconds);
  $('#s1_secondsLabel').textContent = String(state.s1.seconds);
  $('#s1_phraseCustom').value = state.s1.phraseCustom || '';

  $('#s2_thought').value = state.s2.thought;
  $('#s2_body').value = state.s2.body;
  $('#s2_score').value = String(state.s2.score);
  $('#s2_scoreLabel').textContent = String(state.s2.score);
  $('#s2_phraseCustom').value = state.s2.phraseCustom || '';

  $('#s3_old').value = state.s3.old;
  $('#s3_new').value = state.s3.next;
  $('#s3_ten').checked = Boolean(state.s3.ten);
  $('#s3_phraseCustom').value = state.s3.phraseCustom || '';
}

/* ---------------- Copy helpers ---------------- */
async function copyText(text){
  try{
    await navigator.clipboard.writeText(text);
    toast('已複製');
  }catch(e){
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try{
      document.execCommand('copy');
      toast('已複製');
    }catch(err){
      toast('複製失敗（請手動選取）。');
    }
    document.body.removeChild(ta);
  }
}

function bindCopyButtons(){
  $$('.copy').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-copy-from');
      const el = document.getElementById(id);
      if(!el) return;

      let text = '';
      if(el.tagName === 'SELECT') text = el.value;
      else text = (el.value || '').trim();

      if(!text){
        toast('目前沒有內容可複製');
        return;
      }
      copyText(text);
    });
  });

  $('#btnCopySummary').addEventListener('click', () => {
    copyText(makeSummaryText());
  });

  $('#btnCopyQuote').addEventListener('click', () => {
    const t = ($('#quoteText').textContent || '').trim();
    if(t && t !== '—') copyText(t);
    else toast('目前沒有金句');
  });

  $('#btnCopyLink').addEventListener('click', () => {
    const msg = '把這個工具頁的網址複製起來，到手機瀏覽器中「複製網址貼到瀏覽器」開啟，接著用「加入主畫面/安裝」即可。';
    copyText(msg);
  });
}

/* ---------------- Smooth scroll ---------------- */
function bindScroll(){
  $$('[data-scroll]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const target = btn.getAttribute('data-scroll');
      if(target === '#top'){
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      const el = document.querySelector(target);
      if(el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  $('#btnStart').addEventListener('click', ()=>{
    const el = $('#step1');
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(()=> $('#s1_feel')?.focus(), 450);
  });

  $('#btnJumpQuotes').addEventListener('click', ()=>{
    $('#quotesBlock')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

/* ---------------- Timer (Step 1) ---------------- */
let timer = { running:false, left:0, id:null };

function renderTimer(){
  const btn = $('#btnTimer');
  const hint = $('#timerHint');
  const secs = timer.running ? timer.left : Number($('#s1_seconds').value);
  $('#s1_secondsLabel').textContent = String(secs);

  if(timer.running){
    btn.textContent = '暫停中…';
    hint.textContent = '你已經在切回系統管理員模式。就先待在呼吸裡。';
  }else{
    btn.textContent = '開始暫停';
    hint.textContent = '現在，先什麼都不做。讓身體先回來。';
  }
}

function stopTimer(reset=false){
  timer.running = false;
  clearInterval(timer.id);
  timer.id = null;
  if(reset) timer.left = 0;
  renderTimer();
}

function startTimer(){
  const total = Number($('#s1_seconds').value);
  timer.running = true;
  timer.left = total;
  renderTimer();

  timer.id = setInterval(()=>{
    timer.left -= 1;
    if(timer.left <= 0){
      stopTimer(true);
      toast('完成：你已經為系統下了「暫停指令」。');
      setTimeout(()=> $('#step2')?.scrollIntoView({ behavior:'smooth', block:'start' }), 500);
      return;
    }
    $('#s1_secondsLabel').textContent = String(timer.left);
  }, 1000);
}

function bindTimer(){
  $('#s1_seconds').addEventListener('input', ()=>{
    if(!timer.running){
      $('#s1_secondsLabel').textContent = $('#s1_seconds').value;
      state.s1.seconds = Number($('#s1_seconds').value);
      saveState();
    }
  });

  $('#btnTimer').addEventListener('click', ()=>{
    if(timer.running){
      stopTimer(false);
      toast('已停止暫停（需要時再開始）。');
      return;
    }
    startTimer();
  });

  $('#btnTimerReset').addEventListener('click', ()=>{
    stopTimer(true);
    $('#s1_seconds').value = String(state.s1.seconds || 45);
    $('#s1_secondsLabel').textContent = String(state.s1.seconds || 45);
    toast('已重設');
  });
}

/* ---------------- Step 2 chips ---------------- */
function bindChips(){
  $('#bodyChips').addEventListener('click', (e)=>{
    const btn = e.target.closest('.chip');
    if(!btn) return;
    const val = btn.getAttribute('data-chip');
    const input = $('#s2_body');
    const cur = (input.value || '').trim();
    const parts = cur ? cur.split(/[,，、]/).map(s=>s.trim()).filter(Boolean) : [];
    if(!parts.includes(val)) parts.push(val);
    input.value = parts.join('、');
    input.dispatchEvent(new Event('input'));
  });
}

/* ---------------- Quotes ---------------- */
const defaultQuotes = [
  '先停一下，你就已經在改變了。',
  '不用完美，只要不要再走同一條老路。',
  '你不是反應本身，你是看見反應的人。',
  '做到 10% 也算，系統就會開始更新。',
  '把方向盤交回你手上，一切就會慢慢變好。',
];

let quotes = loadQuotes();

function loadQuotes(){
  const raw = localStorage.getItem(LS_QUOTES);
  if(!raw) return { enabled: true, list: [...defaultQuotes], last: '' };
  const data = safeJsonParse(raw, null);
  if(!data) return { enabled: true, list: [...defaultQuotes], last: '' };
  const list = Array.isArray(data.list) && data.list.length ? data.list : [...defaultQuotes];
  return { enabled: !!data.enabled, list, last: data.last || '' };
}

function saveQuotes(){
  localStorage.setItem(LS_QUOTES, JSON.stringify(quotes));
}

function pickQuote(next=false){
  if(!quotes.list.length) return '—';
  if(next){
    const idx = Math.max(0, quotes.list.indexOf(quotes.last));
    const n = (idx + 1) % quotes.list.length;
    quotes.last = quotes.list[n];
  }else{
    const pool = quotes.list.filter(q => q !== quotes.last);
    const arr = pool.length ? pool : quotes.list;
    quotes.last = arr[Math.floor(Math.random()*arr.length)];
  }
  saveQuotes();
  return quotes.last;
}

function renderQuotes(){
  $('#quotesEnabled').checked = quotes.enabled;
  $('#quotesBlock').style.display = quotes.enabled ? '' : 'none';
  $('#quoteText').textContent = quotes.enabled ? (quotes.last || pickQuote(false)) : '—';
  renderQuoteList();
}

function renderQuoteList(){
  const box = $('#quoteList');
  box.innerHTML = '';
  quotes.list.forEach((q, i)=>{
    const item = document.createElement('div');
    item.className = 'quoteItem';
    item.innerHTML = `
      <div class="quoteItemTxt">${escapeHtml(q)}</div>
      <div class="quoteItemActions">
        <button class="btn ghost" data-act="copy" data-i="${i}" type="button">複製</button>
        <button class="btn ghost" data-act="del" data-i="${i}" type="button">刪除</button>
      </div>
    `;
    box.appendChild(item);
  });
}

function bindQuotes(){
  $('#quotesEnabled').addEventListener('change', ()=>{
    quotes.enabled = $('#quotesEnabled').checked;
    saveQuotes();
    $('#quotesBlock').style.display = quotes.enabled ? '' : 'none';
    toast(quotes.enabled ? '已啟用金句' : '已關閉金句');
  });

  $('#btnNextQuote').addEventListener('click', ()=>{
    $('#quoteText').textContent = pickQuote(true);
  });

  $('#btnAddQuote').addEventListener('click', ()=>{
    const input = $('#quoteNew');
    const val = (input.value || '').trim();
    if(!val){ toast('請先輸入一句'); return; }
    quotes.list.unshift(val);
    input.value = '';
    quotes.last = val;
    saveQuotes();
    renderQuotes();
    toast('已新增');
  });

  $('#quoteList').addEventListener('click', (e)=>{
    const btn = e.target.closest('button');
    if(!btn) return;
    const i = Number(btn.getAttribute('data-i'));
    const act = btn.getAttribute('data-act');
    const q = quotes.list[i];
    if(act === 'copy'){
      copyText(q);
    }else if(act === 'del'){
      quotes.list.splice(i,1);
      if(quotes.last === q) quotes.last = '';
      saveQuotes();
      renderQuotes();
      toast('已刪除');
    }
  });
}

/* ---------------- Export / Reset ---------------- */
function makeSummaryText(){
  const lines = [];
  lines.push('改變｜換一個反應｜三步紀錄');
  lines.push(`時間：${nowISO()}`);
  lines.push('');
  lines.push('STEP 1｜暫停');
  lines.push(`- 此刻感受：${state.s1.feel || '（未填）'}`);
  lines.push(`- 暫停秒數：${state.s1.seconds || 45} 秒`);
  lines.push('');
  lines.push('STEP 2｜看見');
  lines.push(`- 第一個念頭：${state.s2.thought || '（未填）'}`);
  lines.push(`- 身體感受：${state.s2.body || '（未填）'}`);
  lines.push(`- 情緒分數：${state.s2.score ?? 5}/10`);
  lines.push('');
  lines.push('STEP 3｜換路');
  lines.push(`- 舊路反應：${state.s3.old || '（未填）'}`);
  lines.push(`- 新路選擇：${state.s3.next || '（未填）'}`);
  lines.push(`- 先做到10%：${state.s3.ten ? '是' : '否'}`);
  return lines.join('\n');
}

function exportToFile(){
  const text = makeSummaryText();
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0,10);
  a.href = url;
  a.download = `angel-change-${stamp}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  toast('已匯出');
}

function doReset(){
  if(!confirm('確定要清空所有自填內容與今日狀態嗎？（金句不會刪）')) return;
  state = structuredClone(defaultState);
  saveState();
  hydrateUI();
  toast('已清空');
}

/* ---------------- Form ---------------- */
function openForm(){
  window.open(FORM_URL, '_blank', 'noopener');
}

function bindForm(){
  const btns = ['#btnOpenForm', '#btnOpenFormTop', '#btnOpenFormBottom']
    .map(id => $(id))
    .filter(Boolean);

  btns.forEach(btn=>{
    btn.disabled = !FORM_URL;
    btn.addEventListener('click', openForm);
  });

  if(!FORM_URL){
    btns.forEach(btn => btn.textContent = '回饋（未設定）');
  }
}

/* ✅ Video */
function openVideo(){
  window.open(VIDEO_URL, '_blank', 'noopener');
}
function bindVideo(){
  const btn = $('#btnVideo');
  if(!btn) return;
  btn.addEventListener('click', openVideo);
}

/* ---------------- Utils ---------------- */
function escapeHtml(str){
  return String(str)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');
}

/* ---------------- Init ---------------- */
function init(){
  if('serviceWorker' in navigator){
    window.addEventListener('load', () => {
  navigator.serviceWorker
    .register(`./sw.js?v=${VERSION}`)
    .catch(() => {});
});
    }
}

init();

  $('#tab-tool').addEventListener('click', ()=> setTab('tool'));
  $('#tab-about').addEventListener('click', ()=> setTab('about'));

  $('#btnInstall').addEventListener('click', doInstall);
  $('#btnExport').addEventListener('click', exportToFile);
  $('#btnReset').addEventListener('click', doReset);
  $('#btnSave').addEventListener('click', ()=>{ saveState(); toast('已保存'); });

  $('#s2_score').addEventListener('input', ()=>{
    $('#s2_scoreLabel').textContent = $('#s2_score').value;
  });

  renderQuotes();
  bindQuotes();

  hydrateUI();
  bindAutosave();

  bindCopyButtons();
  bindScroll();
  bindTimer();
  bindChips();
  bindForm();
  bindVideo();

  toast('已就緒：按一下就能開始。');
}

init();
const btnVideo = document.getElementById('btnVideo');
if (btnVideo) {
  btnVideo.addEventListener('click', () => {
    window.open('https://youtu.be/pEm1sZS9g4g', '_blank');
  });
}