# tokiDownloader PRO SAFE

A browser userscript for downloading web novel chapters from BookToki with **anti-ban protection, queue system, and UI control panel**.

---

## ✨ Features

- ✅ Checkbox selection for chapters
- ✅ Smart range selection (`1,2,10-20`)
- ✅ Append selection mode
- ✅ Sidebar control panel (real-time tracker)
- ✅ Queue-based downloader (batch = 1)
- ✅ Retry failed downloads automatically
- ✅ Anti-ban protection (random delay + human-like behavior)
- ✅ Pause / Resume support
- ✅ Persistent selection (localStorage)
- ✅ Clean filename format: [series_id]_[chapter_id]_[chapter_title].txt





---

## 📦 Installation

1. Install a userscript manager:
   - Tampermonkey (recommended)
   - Violentmonkey

2. Create a new script

3. Paste the script (`tokiDownloader PRO SAFE v3.1`)

4. Save and reload BookToki page

---

## 🚀 Usage

### 1. Select Chapters

#### Manual
- Tick checkboxes beside chapters

#### Range Selection
Input: 1,2,3,10-20



Click:
- `Apply` → replace selection
- `Append` → add to selection

---

### 2. Start Download

Click: Start



---

### 3. Control Execution

| Button  | Action |
|--------|--------|
| Pause  | Stop queue temporarily |
| Resume | Continue queue |
| Reset  | Clear queue |

---

## 📊 Sidebar Tracker
tokiDownloader
Novel ID: 17799666
Novel: 히로인에게 회귀를 빼앗겼다
Status: Running
Paused: NO
Retry Mode: NO
Progress: 3/10
Selected: 10
Total Tasks: 10
Success: 2
Failed: 1
Retry Queue: 1
Current Delay: 5.2s
Current Task:
Chapter Title


---

## 🔁 Queue Logic


---

## 🛡 Anti-Ban Strategy

To avoid Cloudflare / site detection:

### ✔ Recommended
- Download **3–10 chapters per run**
- Use **default delay (4–7 seconds)**
- Pause when captcha appears

### ❌ Avoid
- Downloading entire novel (1000+ chapters)
- Running multiple tabs
- Reducing delay

---

## ⚠️ Captcha Handling

When detected: ⚠ Captcha detected → solve manually → click Resume


---

## 📁 Output Format

Files are saved as: 17799666_127_히로인에게 회귀를 빼앗겼다 126화.txt


Location:
- Browser default download folder

---

## ⚙️ Configuration

Inside script:


```javascript
const CONFIG = {
    delay: 4000,
    delayRand: 3000,
    retryDelay: 8000,
    retryRand: 4000,
    maxRetry: 2
};
```

🧠 How It Works
Extract chapter list from .list-body
Queue selected chapters
Load each chapter via iframe
Extract #novel_content
Save as .txt
Retry failures later
🚧 Limitations
Cannot bypass Cloudflare completely
Requires manual captcha solving
Browser cannot save directly to custom folder paths
Site structure changes may break script
🔮 Future Improvements
📊 Download speed monitor
🧠 Adaptive delay (auto anti-ban)
📚 EPUB builder
🔗 Integration with translation pipeline (AxiaMTL)
📜 Disclaimer

This tool is for personal use only.

Use responsibly and respect the website’s terms of service.

🧑‍💻 Author

Built and refined with ❤️ for efficient web novel reading workflow.
