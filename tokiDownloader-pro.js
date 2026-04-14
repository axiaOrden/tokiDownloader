// ==UserScript==
// @name         tokiDownloader PRO SAFE v3.1
// @namespace    tokiDownloader-pro
// @version      3.1.0
// @description  Safe downloader with sidebar, queue, retry, range select, anti-ban
// @match        https://*.com/novel/*
// @grant        GM_registerMenuCommand
// @run-at       document-end
// ==/UserScript==

(function () {
'use strict';

if (!/^https:\/\/booktoki[0-9]+\.com\/novel\/[0-9]+/.test(location.href)) return;

/* ================= CONFIG ================= */
const CONFIG = {
    delay: 4000,
    delayRand: 3000,
    retryDelay: 8000,
    retryRand: 4000,
    maxRetry: 2,
    storageKey: 'toki_sel_' + location.pathname.match(/\d+/)[0]
};

/* ================= UTILS ================= */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rand = (b, r) => b + Math.random() * r;

const safeText = t => (t || '').replace(/[\\/:*?"<>|]/g, '_').substring(0, 80);

/* ================= STORAGE ================= */
function saveSel() {
    const data = [...document.querySelectorAll('.toki-cb:checked')]
        .map(c => c.dataset.url);
    localStorage.setItem(CONFIG.storageKey, JSON.stringify(data));
}

function loadSel() {
    const data = new Set(JSON.parse(localStorage.getItem(CONFIG.storageKey)||'[]'));
    document.querySelectorAll('.toki-cb').forEach(cb => cb.checked = data.has(cb.dataset.url));
}

/* ================= CHECKBOX ================= */
function injectCB() {
    document.querySelectorAll('.list-body li').forEach(row => {
        if (row.querySelector('.toki-cb')) return;
        const a = row.querySelector('a');
        if (!a) return;

        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.className = 'toki-cb';
        cb.dataset.url = a.href;
        cb.style.marginRight = '6px';

        cb.onchange = saveSel;
        row.querySelector('.wr-subject').prepend(cb);
    });
    loadSel();
}

/* ================= RANGE ================= */
function parseRange(input) {
    const set = new Set();
    input.split(',').forEach(p => {
        p = p.trim();
        if (p.includes('-')) {
            let [s,e] = p.split('-').map(Number);
            if (isNaN(s)||isNaN(e)) return;
            if (s>e) [s,e]=[e,s];
            for (let i=s;i<=e;i++) set.add(i);
        } else {
            const n = Number(p);
            if (!isNaN(n)) set.add(n);
        }
    });
    return set;
}

function applyRange(input, append=false) {
    const set = parseRange(input);
    if (!set.size) return alert("Invalid input (e.g. 1,2,10-20)");

    document.querySelectorAll('.list-body li').forEach(row=>{
        const num = parseInt(row.querySelector('.wr-num')?.innerText);
        const cb = row.querySelector('.toki-cb');
        if (!cb) return;

        if (set.has(num)) cb.checked = true;
        else if (!append) cb.checked = false;
    });

    saveSel();
}

/* ================= DOWNLOAD ================= */
async function fetchChapter(url) {
    const iframe = document.createElement('iframe');
    iframe.style.display='none';
    document.body.appendChild(iframe);

    await new Promise(res=>{ iframe.onload=res; iframe.src=url; });

    for (let i=0;i<20;i++) {
        const doc = iframe.contentWindow.document;

        if (doc.body.innerText.match(/captcha|cloudflare|forbidden/i)) {
            iframe.remove();
            throw "BLOCKED";
        }

        const el = doc.querySelector('#novel_content');
        if (el && el.innerText.length > 100) {
            const text = el.innerText;
            iframe.remove();
            return text;
        }

        try { iframe.contentWindow.scrollTo(0, Math.random()*1000); } catch {}
        await sleep(1000);
    }

    iframe.remove();
    throw "EMPTY";
}

function saveFile(name, txt) {
    const blob = new Blob([txt]);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
}

/* ================= QUEUE ================= */
const Q = {
    list: [],
    failed: [],
    idx: 0,
    run: false,
    pause: false
};

async function runQueue(retry=false) {
    if (Q.run) return;
    Q.run = true;

    const novelId = location.pathname.match(/\d+/)[0];
    const list = retry ? Q.failed : Q.list;

    // init stats if first run
    if (!retry) {
        Q.success = 0;
        Q.fail = 0;
    }

    document.getElementById('retry').innerText = retry ? "YES" : "NO";
    document.getElementById('stat').innerText = retry ? "Retry Mode" : "Running";

    while (Q.idx < list.length) {
        if (Q.pause) {
            document.getElementById('stat').innerText = "Paused";
            updateTracker();
            await sleep(1000);
            continue;
        }

        const ch = list[Q.idx];

        // update UI
        document.getElementById('curr').innerText = ch.title;
        document.getElementById('prog').innerText = `${Q.idx+1}/${list.length}`;

        try {
            const txt = await fetchChapter(ch.url);

            // ✅ FIXED filename format
            saveFile(`${novelId}_${ch.num}_${safeText(ch.title)}${retry?'_retry':''}.txt`, txt);

            Q.success = (Q.success || 0) + 1;

        } catch (e) {
            if (e === "BLOCKED") {
                alert("Captcha detected → solve manually then Resume");
                Q.pause = true;
                Q.run = false;
                return;
            }

            Q.fail = (Q.fail || 0) + 1;

            if (!retry && ch.retry++ < CONFIG.maxRetry) {
                Q.failed.push(ch);
            }
        }

        Q.idx++;

        // update tracker
        updateTracker();

        // delay
        const d = rand(CONFIG.delay, CONFIG.delayRand);
        document.getElementById('delay').innerText = (d/1000).toFixed(1) + "s";

        await sleep(d);
    }

    // 🔁 retry phase
    if (!retry && Q.failed.length) {
        document.getElementById('stat').innerText = "Retry Queue";
        document.getElementById('retry').innerText = "YES";

        Q.idx = 0;
        Q.run = false;

        // longer delay before retry (anti-ban)
        await sleep(rand(CONFIG.retryDelay, CONFIG.retryRand));

        return runQueue(true);
    }

    // done
    document.getElementById('stat').innerText = "Done";
    document.getElementById('curr').innerText = "-";
    document.getElementById('delay').innerText = "-";

    Q.run = false;
}

/* ================= START ================= */
function start() {
    const sel = [];
    document.querySelectorAll('.toki-cb:checked').forEach(cb=>{
        const row = cb.closest('li');
        sel.push({
            num: row.querySelector('.wr-num').innerText.padStart(3,'0'),
            title: row.querySelector('a').innerText,
            url: cb.dataset.url,
            retry:0
        });
    });

    if (!sel.length) return alert("No selection");

    Q.list = sel;
    Q.failed = [];
    Q.idx = 0;
    Q.pause = false;

    runQueue(false);
}

/* ================= UI ================= */
function createUI() {
    const box = document.createElement('div');

    box.style = `
        position:fixed;
        top:0;
        right:0;
        width:300px;
        height:100%;
        background:#121212;
        color:#e8f5e9;
        font-family:monospace;
        font-size:12px;
        padding:12px;
        z-index:9999;
        border-left:2px solid #333;
    `;

    box.innerHTML = `
        <div style="font-size:16px;font-weight:bold;margin-bottom:10px;">tokiDownloader</div>

        <div>Novel ID: <span id="nid">-</span></div>
        <div>Novel: <span id="ntitle">-</span></div>

        <hr>

        <div>Status: <span id="stat">Idle</span></div>
        <div>Paused: <span id="paused">NO</span></div>
        <div>Retry Mode: <span id="retry">NO</span></div>
        <div>Progress: <span id="prog">0/0</span></div>
        <div>Selected: <span id="sel">0</span></div>
        <div>Total Tasks: <span id="total">0</span></div>
        <div>Success: <span id="succ">0</span></div>
        <div>Failed: <span id="fail">0</span></div>
        <div>Retry Queue: <span id="rq">0</span></div>
        <div>Current Delay: <span id="delay">-</span></div>

        <hr>

        <div>Current Task:</div>
        <div id="curr" style="color:#fff;min-height:30px;">-</div>

        <hr>

        <input id="toki-range-input"
            placeholder="1,2,10-20"
            style="width:100%;margin-top:4px;padding:4px;background:#222;color:#fff;border:1px solid #444;">

        <button id="toki-range-apply"
            style="margin-top:6px;width:100%;padding:6px;background:#9333ea;color:#fff;border:0;border-radius:4px;">
            Apply Range
        </button>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px;">
            <button id="toki-range-append"
                style="padding:6px;background:#16a34a;color:#fff;border:0;border-radius:4px;">
                Append
            </button>

            <button id="toki-btn-select-all"
                style="padding:6px;background:#1f6feb;color:#fff;border:0;border-radius:4px;">
                Select All
            </button>

            <button id="toki-btn-unselect-all"
                style="padding:6px;background:#6b7280;color:#fff;border:0;border-radius:4px;">
                Clear
            </button>

            <button id="toki-btn-start"
                style="padding:6px;background:#15803d;color:#fff;border:0;border-radius:4px;">
                Start
            </button>

            <button id="toki-btn-pause"
                style="padding:6px;background:#b45309;color:#fff;border:0;border-radius:4px;">
                Pause
            </button>

            <button id="toki-btn-resume"
                style="padding:6px;background:#2563eb;color:#fff;border:0;border-radius:4px;">
                Resume
            </button>

            <button id="toki-btn-reset"
                style="grid-column:span 2;padding:6px;background:#991b1b;color:#fff;border:0;border-radius:4px;">
                Reset
            </button>
        </div>
    `;

    document.body.appendChild(box);

    // bind
    document.getElementById('toki-range-apply').onclick = () =>
        applyRange(document.getElementById('toki-range-input').value, false);

    document.getElementById('toki-range-append').onclick = () =>
        applyRange(document.getElementById('toki-range-input').value, true);

    document.getElementById('toki-btn-select-all').onclick = () => selectAll(true);
    document.getElementById('toki-btn-unselect-all').onclick = () => selectAll(false);
    document.getElementById('toki-btn-start').onclick = start;
    document.getElementById('toki-btn-pause').onclick = () => Q.pause = true;
    document.getElementById('toki-btn-resume').onclick = () => Q.pause = false;
    document.getElementById('toki-btn-reset').onclick = resetQueue;

    // init header info
    document.getElementById('nid').innerText = location.pathname.match(/\d+/)[0];
    document.getElementById('ntitle').innerText =
        document.querySelector('.page-title .page-desc')?.innerText || "-";
}

function updateUI(ch) {
    document.getElementById('curr').innerText = ch.title;
}

function updateTracker() {
    document.getElementById('prog').innerText = `${Q.idx}/${Q.list.length}`;
    document.getElementById('sel').innerText =
        document.querySelectorAll('.toki-cb:checked').length;

    document.getElementById('total').innerText = Q.list.length;
    document.getElementById('succ').innerText = Q.success || 0;
    document.getElementById('fail').innerText = Q.fail || 0;
    document.getElementById('rq').innerText = Q.failed.length;
    document.getElementById('paused').innerText = Q.pause ? "YES" : "NO";
}

/* ================= INIT ================= */
injectCB();
createUI();

})();