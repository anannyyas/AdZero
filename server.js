const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const PORT = 3300;

// Connect to SQLite database
const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) {
    console.error('❌ Error opening database', err.message);
  } else {
    console.log('✅ Connected to SQLite database for server.');
  }
});

// Initialize Tables
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      app_bundle_id TEXT NOT NULL,
      ad_title TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS campaign_fallbacks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id INTEGER,
      fallback_title TEXT NOT NULL,
      fallback_bundle_id TEXT,
      priority INTEGER,
      FOREIGN KEY(campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_token TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS device_installed_apps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id INTEGER,
      app_bundle_id TEXT NOT NULL,
      FOREIGN KEY(device_id) REFERENCES devices(id) ON DELETE CASCADE
    )
  `);
});

// Dashboard UI with Real-Time SDK App Scanner Checkboxes
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Ad-Exclusion SDK Simulator</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style> body { font-family: 'Inter', sans-serif; } </style>
    </head>
    <body class="bg-[#F4F6FC] text-slate-700 min-h-screen p-6 md:p-10">
      <div class="max-w-4xl mx-auto">
        <header class="mb-10 text-center">
          <div class="inline-block bg-[#E0E7FF] text-[#4338CA] text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-3">
            SDK Device Scanner Simulator
          </div>
          <h1 class="text-3xl md:text-4xl font-bold text-slate-800">Ad-Exclusion Engine</h1>
          <p class="text-slate-500 mt-2 text-sm md:text-base">Simulating real device package scans and cascading fallback decisions.</p>
        </header>

        <div class="grid md:grid-cols-2 gap-8">
          <!-- Campaign Creator -->
          <div class="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-indigo-50 flex flex-col justify-between">
            <div>
              <div class="flex items-center space-x-3 mb-4">
                <div class="w-8 h-8 rounded-full bg-[#E0E7FF] text-[#4338CA] flex items-center justify-center font-bold text-sm">1</div>
                <h2 class="text-lg font-bold text-slate-800">Create Campaign & Cascades</h2>
              </div>
              <form id="campaignForm" class="space-y-4">
                <div>
                  <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Primary App Bundle ID (To Exclude)</label>
                  <input type="text" id="appBundleId" value="com.google.android.apps.bard" class="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl p-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#818CF8]" required>
                </div>
                <div>
                  <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Primary Ad Title</label>
                  <input type="text" id="adTitle" value="Download Google Gemini Pro Today!" class="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl p-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#818CF8]" required>
                </div>
                
                <hr class="border-slate-100 my-2">

                <div>
                  <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Fallback 1 (Title | Bundle ID)</label>
                  <input type="text" id="fb1Title" value="Try ChatGPT!" class="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 mb-1">
                  <input type="text" id="fb1Bundle" value="com.openai.chatgpt" class="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800">
                </div>

                <div>
                  <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Fallback 2 (Title | Bundle ID)</label>
                  <input type="text" id="fb2Title" value="Try Notion AI!" class="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 mb-1">
                  <input type="text" id="fb2Bundle" value="com.notion.id" class="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800">
                </div>

                <button type="submit" class="w-full bg-[#818CF8] hover:bg-[#6366F1] text-white font-semibold py-3 rounded-xl transition shadow-sm text-sm mt-2">
                  Publish Campaign
                </button>
              </form>
            </div>
            <p id="campaignResult" class="mt-4 text-xs font-medium text-[#10B981]"></p>
          </div>

          <!-- Device SDK Scanner -->
          <div class="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-indigo-50 flex flex-col justify-between">
            <div>
              <div class="flex items-center space-x-3 mb-4">
                <div class="w-8 h-8 rounded-full bg-[#D1FAE5] text-[#065F46] flex items-center justify-center font-bold text-sm">2</div>
                <h2 class="text-lg font-bold text-slate-800">Device App Scanner SDK</h2>
              </div>
              <form id="testForm" class="space-y-4">
                <div>
                  <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Device Token / ID</label>
                  <input type="text" id="deviceToken" value="sdk_device_01" class="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl p-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#34D399]" required>
                </div>

                <div>
                  <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Apps Installed on Device (Checked = Downloaded):</label>
                  <div class="space-y-2 bg-[#F8FAFC] p-3 rounded-xl border border-slate-200 text-xs">
                    <label class="flex items-center space-x-2 cursor-pointer">
                      <input type="checkbox" name="appCheck" value="com.google.android.apps.bard" checked class="rounded text-indigo-600 focus:ring-indigo-500">
                      <span class="font-medium text-slate-700">Google Gemini (<code class="text-slate-400">com.google.android.apps.bard</code>)</span>
                    </label>
                    <label class="flex items-center space-x-2 cursor-pointer">
                      <input type="checkbox" name="appCheck" value="com.openai.chatgpt" checked class="rounded text-indigo-600 focus:ring-indigo-500">
                      <span class="font-medium text-slate-700">ChatGPT (<code class="text-slate-400">com.openai.chatgpt</code>)</span>
                    </label>
                    <label class="flex items-center space-x-2 cursor-pointer">
                      <input type="checkbox" name="appCheck" value="com.spotify.music" class="rounded text-indigo-600 focus:ring-indigo-500">
                      <span class="font-medium text-slate-700">Spotify (<code class="text-slate-400">com.spotify.music</code>)</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Campaign ID to Test</label>
                  <input type="number" id="testCampaignId" value="1" class="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl p-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#34D399]" required>
                </div>

                <button type="submit" class="w-full bg-[#34D399] hover:bg-[#10B981] text-slate-900 font-semibold py-3 rounded-xl transition shadow-sm text-sm">
                  Scan Device & Check Ad
                </button>
              </form>
            </div>
          </div>
        </div>

        <!-- Result Box -->
        <div class="mt-8 bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-indigo-50">
          <h2 class="text-base font-bold text-slate-800 mb-3 flex items-center">
            <span class="w-2.5 h-2.5 rounded-full bg-[#FBBF24] inline-block mr-2"></span>
            SDK Decision Result
          </h2>
          <pre id="apiOutput" class="bg-[#1E293B] text-[#38BDF8] p-4 rounded-xl font-mono text-xs md:text-sm overflow-x-auto shadow-inner">Click "Scan Device & Check Ad" above to run SDK inspection...</pre>
        </div>
      </div>

      <script>
        document.getElementById('campaignForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const res = await fetch('/api/campaigns', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              appBundleId: document.getElementById('appBundleId').value,
              adTitle: document.getElementById('adTitle').value,
              fallbacks: [
                { title: document.getElementById('fb1Title').value, bundleId: document.getElementById('fb1Bundle').value, priority: 1 },
                { title: document.getElementById('fb2Title').value, bundleId: document.getElementById('fb2Bundle').value, priority: 2 }
              ]
            })
          });
          const data = await res.json();
          document.getElementById('campaignResult').innerText = 'Success! Created Campaign ID: ' + data.campaignId;
          document.getElementById('testCampaignId').value = data.campaignId;
        });

        document.getElementById('testForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const deviceToken = document.getElementById('deviceToken').value;
          const checkboxes = document.querySelectorAll('input[name="appCheck"]:checked');
          const installedApps = Array.from(checkboxes).map(cb => cb.value);
          const campaignId = parseInt(document.getElementById('testCampaignId').value);

          await fetch('/api/devices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deviceToken, installedApps })
          });

          const adRes = await fetch('/api/get-ad', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deviceToken, campaignId })
          });
          const adData = await adRes.json();

          document.getElementById('apiOutput').innerText = JSON.stringify({
            sdkScannedAppsOnDevice: installedApps,
            adDecision: adData
          }, null, 2);
        });
      </script>
    </body>
    </html>
  `);
});

// Register Device API
app.post('/api/devices', (req, res) => {
  const { deviceToken, installedApps } = req.body; 
  
  db.run(`INSERT OR IGNORE INTO devices (device_token) VALUES (?)`, [deviceToken], function(err) {
    if (err) return res.status(500).json({ error: err.message });

    db.get(`SELECT id FROM devices WHERE device_token = ?`, [deviceToken], (err, device) => {
      if (err || !device) return res.status(500).json({ error: "Device error" });

      const deviceId = device.id;
      db.run(`DELETE FROM device_installed_apps WHERE device_id = ?`, [deviceId], () => {
        if (installedApps && Array.isArray(installedApps)) {
          const stmt = db.prepare(`INSERT INTO device_installed_apps (device_id, app_bundle_id) VALUES (?, ?)`);
          installedApps.forEach(appId => stmt.run(deviceId, appId));
          stmt.finalize();
        }
        res.json({ message: "Device apps synced successfully!", deviceId });
      });
    });
  });
});

// Create Campaign with Cascades API
app.post('/api/campaigns', (req, res) => {
  const { appBundleId, adTitle, fallbacks } = req.body;

  db.run(
    `INSERT INTO campaigns (app_bundle_id, ad_title) VALUES (?, ?)`,
    [appBundleId, adTitle],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      const campaignId = this.lastID;

      if (fallbacks && Array.isArray(fallbacks)) {
        const stmt = db.prepare(`INSERT INTO campaign_fallbacks (campaign_id, fallback_title, fallback_bundle_id, priority) VALUES (?, ?, ?, ?)`);
        fallbacks.forEach(fb => {
          stmt.run(campaignId, fb.title, fb.bundleId || null, fb.priority);
        });
        stmt.finalize();
      }

      res.json({ message: "Campaign created!", campaignId });
    }
  );
});

// Core Cascading Ad Exclusion API
app.post('/api/get-ad', (req, res) => {
  const { deviceToken, campaignId } = req.body;

  db.get(`SELECT * FROM campaigns WHERE id = ?`, [campaignId], (err, campaign) => {
    if (err || !campaign) return res.status(404).json({ error: "Campaign not found" });

    db.get(`SELECT id FROM devices WHERE device_token = ?`, [deviceToken], (err, device) => {
      if (err || !device) {
        return res.json({ status: "SERVED", adTitle: campaign.ad_title, reason: "Device not found." });
      }

      db.get(
        `SELECT * FROM device_installed_apps WHERE device_id = ? AND app_bundle_id = ?`,
        [device.id, campaign.app_bundle_id],
        (err, primaryInstalled) => {
          if (!primaryInstalled) {
            return res.json({ status: "SERVED", adTitle: campaign.ad_title, savedAdSpend: false });
          }

          db.all(
            `SELECT * FROM campaign_fallbacks WHERE campaign_id = ? ORDER BY priority ASC`,
            [campaignId],
            (err, fallbacks) => {
              if (err || !fallbacks || fallbacks.length === 0) {
                return res.json({ status: "EXCLUDED", savedAdSpend: true, fallbackAd: "Default fallback" });
              }

              const checkNextFallback = (index) => {
                if (index >= fallbacks.length) {
                  return res.json({ status: "EXCLUDED", savedAdSpend: true, fallbackAd: "All fallbacks installed on device." });
                }

                const fb = fallbacks[index];
                if (!fb.fallback_bundle_id) {
                  return res.json({ status: "EXCLUDED", savedAdSpend: true, fallbackAd: fb.fallback_title });
                }

                db.get(
                  `SELECT * FROM device_installed_apps WHERE device_id = ? AND app_bundle_id = ?`,
                  [device.id, fb.fallback_bundle_id],
                  (err, fbInstalled) => {
                    if (fbInstalled) {
                      checkNextFallback(index + 1);
                    } else {
                      return res.json({ status: "EXCLUDED", savedAdSpend: true, fallbackAd: fb.fallback_title });
                    }
                  }
                );
              };

              checkNextFallback(0);
            }
          );
        }
      );
    });
  });
});

app.listen(PORT, () => {
  console.log(`🚀 SDK Device Scanner Server running on http://localhost:${PORT}`);
});