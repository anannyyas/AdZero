# AdZero 🚀
> **Stop Wasting Ad Spend on Existing Users.** A full-stack ad-tech optimization engine that blocks redundant app-install ads and cascades to uninstalled alternatives in milliseconds.

---

## 💡 Why AdZero? (The Business Impact)
Traditional ad networks frequently waste **15–30% of user-acquisition budgets** showing install ads to users who *already have* the app downloaded. AdZero solves this by:
* **Eliminates Wasted Spend:** Automatically blocks redundant impressions for active app holders.
* **Maximizes Revenue:** Recursively cascades blocked impressions to alternative, uninstalled apps.
* **Lowers Acquisition Costs (CAC):** Ensures marketing budgets are spent exclusively on fresh, high-value prospects.

---

## ⚙️ How It Works
1. **Device Scan:** The SDK simulates scanning a user's phone for installed app bundle IDs.
2. **Smart Exclusion:** The backend checks if the user already owns the advertised app.
3. **Recursive Cascade:** If owned, it skips the primary ad and automatically falls back through alternative uninstalled apps.

---

## 🛠️ Tech Stack
* **Backend:** Node.js, Express.js
* **Database:** SQLite
* **Architecture:** REST APIs, Recursive Cascading Logic, SDK Simulator Dashboard

---

## 🚀 Quick Start (Run Locally)
1. Install dependencies:
   ```bash
   npm install