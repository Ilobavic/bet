// PickAI — script.js

// ── Service Worker Registration ──
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .catch((err) => console.warn("SW registration failed:", err));
  });
}

// ── Constants ──
const STEPS = [
  "Pulling today's fixtures across all leagues...",
  "Analyzing recent form & goal trends...",
  "Cross-checking head-to-head records...",
  "Scanning injury reports & team news...",
  "Evaluating odds for value...",
  "Ranking picks by confidence...",
];

const BADGE_COLORS = ["green", "blue", "orange", "green", "blue", "orange"];

const SESSION_KEY = "pickai_last_slip";

// ── Utility: delay ──
function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Utility: WAT time (UTC+1 fixed offset) ──
function getWATTime() {
  const now = new Date();
  // WAT is UTC+1 — always add exactly 60 minutes to UTC
  const watMs = now.getTime() + now.getTimezoneOffset() * 60000 + 60 * 60000;
  const wat = new Date(watMs);
  const pad = (n) => String(n).padStart(2, "0");
  const h = wat.getHours();
  const m = wat.getMinutes();
  const timeStr = pad(h) + ":" + pad(m) + " WAT";
  const dateStr = wat.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  // Earliest kickoff = now + 90 mins
  const bufMin = h * 60 + m + 90;
  const earliestKO =
    pad(Math.floor(bufMin / 60) % 24) + ":" + pad(bufMin % 60) + " WAT";
  return { timeStr, dateStr, earliestKO };
}

// ── Input Validation ──
function validateInputs() {
  const stake = parseInt(document.getElementById("stake").value);
  const errEl = document.getElementById("validationError");

  if (!stake || isNaN(stake) || stake < 100) {
    errEl.textContent = "⚠ Stake must be at least ₦100.";
    errEl.style.display = "block";
    document.getElementById("stake").focus();
    return false;
  }
  if (stake > 10000000) {
    errEl.textContent = "⚠ Stake cannot exceed ₦10,000,000.";
    errEl.style.display = "block";
    document.getElementById("stake").focus();
    return false;
  }

  errEl.style.display = "none";
  return true;
}

// ── Debounce ──
let analyzeTimeout = null;
function debouncedAnalyze() {
  clearTimeout(analyzeTimeout);
  analyzeTimeout = setTimeout(analyze, 300);
}

// ── Restore last session ──
function restoreSession() {
  try {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (!saved) return;
    const { slip, stake, timeStr } = JSON.parse(saved);
    const results = document.getElementById("results");
    const empty = document.getElementById("empty");
    empty.style.display = "none";
    render(slip, stake, timeStr);
    results.classList.add("on");
  } catch (_) {
    // silently ignore corrupt session data
  }
}

// ── Main analyze function ──
async function analyze() {
  if (!validateInputs()) return;

  const btn = document.getElementById("goBtn");
  const loader = document.getElementById("loader");
  const empty = document.getElementById("empty");
  const results = document.getElementById("results");
  const lsteps = document.getElementById("lsteps");

  btn.disabled = true;
  empty.style.display = "none";
  results.classList.remove("on");
  loader.classList.add("on");
  lsteps.innerHTML = "";

  // Animate loading steps
  for (let i = 0; i < STEPS.length; i++) {
    await delay(550 + i * 380);
    const el = document.createElement("div");
    el.className = "lstep";
    el.style.animationDelay = "0s";
    el.textContent = "› " + STEPS[i];
    lsteps.appendChild(el);
    if (i > 0) {
      lsteps.children[i - 1].classList.add("done");
      lsteps.children[i - 1].textContent = "✓ " + STEPS[i - 1];
    }
  }

  const betType = document.getElementById("betType").value;
  const count = document.getElementById("count").value;
  const risk = document.getElementById("risk").value;
  const stake = parseInt(document.getElementById("stake").value) || 1000;

  const { timeStr, dateStr, earliestKO } = getWATTime();

  const prompt =
    "You are an elite football betting analyst. Today is " +
    dateStr +
    ". Current WAT time is " +
    timeStr +
    ".\n\nCRITICAL: You must ONLY recommend matches that have NOT yet kicked off. The earliest allowed kickoff time is " +
    earliestKO +
    " (90 minutes from now). If there are not enough matches today after this time, use TOMORROW fixtures instead. NEVER suggest a match that has already started or is finished. Set date field to Today or Tomorrow accordingly.\n\nGenerate " +
    count +
    " smart match picks for Sportybet Nigeria users to review and manually place.\n\nSettings:\n- Bet type: " +
    betType +
    " (accumulator = 1X2 match result picks; overunder = Over/Under goals picks; mixed = combination of both)\n- Risk level: " +
    risk +
    " (low = favourites/safe picks; medium = balanced value; high = higher odds/upsets)\n- Stake: NGN " +
    stake +
    '\n\nReturn ONLY raw JSON - no markdown, no explanation, no code fences. Exactly this structure:\n{\n  "picks": [\n    {\n      "league": "Competition name",\n      "home": "Home Team",\n      "away": "Away Team",\n      "date": "Today or Tomorrow",\n      "time": "HH:MM WAT",\n      "pick": "e.g. Home Win / Over 2.5 / Draw / BTTS Yes",\n      "odd": 1.85,\n      "confidence": 74,\n      "form_analysis": "2 sentences about recent team form and goal scoring trends",\n      "value_reason": "1 sentence on why the odds offer value"\n    }\n  ],\n  "combined_odds": 14.2,\n  "potential_return": 14200,\n  "analyst_note": "One overall tip or caution for this slip"\n}\n\nRules:\n- Use real leagues: EPL, La Liga, Serie A, Bundesliga, Ligue 1, Champions League, NPFL, CAF Champions League, MLS, Eredivisie\n- Every kickoff time MUST be after ' +
    earliestKO +
    " - strictly no past or live matches\n- Prefer evening fixtures 18:00-22:00 WAT when available\n- Odds per match: low=1.25-1.65, medium=1.65-2.60, high=2.50-5.00\n- confidence: 58-91 (integer)\n- combined_odds = product of all odds rounded to 2 decimal places\n- potential_return = stake x combined_odds rounded to nearest 50\n- Make analysis feel genuine and data-driven";

  try {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1800,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(`${res.status}: ${e?.error?.message || "API error"}`);
    }

    const data = await res.json();
    const raw = data.content.map((b) => b.text || "").join("");
    const clean = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();
    const slip = JSON.parse(clean);

    // Save to session
    try {
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ slip, stake, timeStr })
      );
    } catch (_) {}

    loader.classList.remove("on");
    render(slip, stake, timeStr);
    results.classList.add("on");
  } catch (err) {
    console.error("PickAI error:", err);
    loader.classList.remove("on");
    const friendly =
      err.message === "API key not configured on server"
        ? "API key is missing on the server. Add ANTHROPIC_API_KEY."
        : err.message;
    results.innerHTML = `
      <div style="text-align:center;padding:50px 0;font-family:'JetBrains Mono',monospace;font-size:.78rem;color:#ef4444;">
        ⚠ Could not generate picks<br><br>
        <span style="color:var(--muted);font-size:.68rem;">${friendly}</span><br><br>
        <button onclick="analyze()" style="background:var(--s2);border:1px solid var(--border2);color:var(--text);padding:9px 20px;border-radius:7px;cursor:pointer;font-family:'Syne',sans-serif;font-size:.8rem;">Try Again</button>
      </div>`;
    results.classList.add("on");
  }

  btn.disabled = false;
}

// ── Badge color by index ──
function pickColor(i) {
  return BADGE_COLORS[i % BADGE_COLORS.length];
}

// ── Share / Copy ──
function buildShareText(slip, stake, timeStr) {
  const lines = [
    "🎯 PickAI — Match Picks",
    `Generated: ${timeStr}`,
    "",
  ];
  slip.picks.forEach((p, i) => {
    lines.push(
      `${i + 1}. ${p.home} vs ${p.away} (${p.league})`,
      `   Pick: ${p.pick}  |  Odds: ${p.odd}  |  Conf: ${p.confidence}%`,
      `   📅 ${p.date} · ⏰ ${p.time}`,
      ""
    );
  });
  lines.push(
    `Combined Odds: ${slip.combined_odds}x`,
    `Stake: ₦${Number(stake).toLocaleString()}`,
    `Potential Return: ₦${Number(slip.potential_return).toLocaleString()}`,
    "",
    "⚠ AI-generated picks for review only. Gamble responsibly."
  );
  return lines.join("\n");
}

async function shareSlip(slip, stake, timeStr) {
  const text = buildShareText(slip, stake, timeStr);
  const btn = document.getElementById("shareBtn");

  // Try native share first (mobile)
  if (navigator.share) {
    try {
      await navigator.share({ title: "PickAI Picks", text });
      return;
    } catch (_) {}
  }

  // Fallback: copy to clipboard
  try {
    await navigator.clipboard.writeText(text);
    btn.textContent = "✓ Copied!";
    btn.classList.add("copied");
    setTimeout(() => {
      btn.textContent = "⬆ Share Picks";
      btn.classList.remove("copied");
    }, 2000);
  } catch (_) {
    btn.textContent = "⚠ Could not copy";
    setTimeout(() => (btn.textContent = "⬆ Share Picks"), 2000);
  }
}

// ── Render results ──
function render(slip, stake, timeStr) {
  const avgConf = Math.round(
    slip.picks.reduce((a, p) => a + p.confidence, 0) / slip.picks.length
  );

  const cards = slip.picks
    .map((p, i) => {
      const color = pickColor(i);
      return `
        <div class="match-card" style="animation-delay:${i * 80}ms">
          <div class="card-top">
            <div>
              <div class="card-league">${p.league}</div>
              <div class="card-teams">${p.home} <span class="vs">vs</span> ${p.away}</div>
              <div class="card-time">📅 ${p.date} · ⏰ ${p.time}</div>
            </div>
            <div class="card-pick">
              <span class="pick-badge ${color}">${p.pick}</span>
              <span class="odd-val">@ ${p.odd}</span>
              <div class="conf-wrap">
                <div class="conf-bar"><div class="conf-fill" style="width:${p.confidence}%"></div></div>
                <span class="conf-pct">${p.confidence}% confidence</span>
              </div>
            </div>
          </div>
          <div class="card-analysis">
            <div class="analysis-block">
              <div class="analysis-label">Form &amp; Trends</div>
              <div class="analysis-text">${p.form_analysis}</div>
            </div>
            <div class="analysis-block">
              <div class="analysis-label">Odds Value</div>
              <div class="analysis-text">${p.value_reason}</div>
            </div>
          </div>
        </div>`;
    })
    .join("");

  document.getElementById("results").innerHTML = `
    <div class="results-header">
      <div>
        <div class="results-title">Today's Recommended Picks</div>
        <div class="results-meta">Generated ${timeStr} · ${slip.picks.length} upcoming picks</div>
      </div>
      <button
        id="shareBtn"
        class="share-btn"
        onclick="shareSlip(${JSON.stringify(slip).replace(/"/g, '&quot;')}, ${stake}, '${timeStr}')"
        aria-label="Share or copy picks"
      >⬆ Share Picks</button>
    </div>

    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-val" style="color:var(--green)">${slip.combined_odds}x</div>
        <div class="stat-lbl">Combined Odds</div>
      </div>
      <div class="stat-card">
        <div class="stat-val" style="color:var(--orange)">₦${Number(slip.potential_return).toLocaleString()}</div>
        <div class="stat-lbl">Potential Return</div>
      </div>
      <div class="stat-card">
        <div class="stat-val" style="color:var(--blue)">${avgConf}%</div>
        <div class="stat-lbl">Avg Confidence</div>
      </div>
      <div class="stat-card">
        <div class="stat-val" style="color:var(--text)">₦${Number(stake).toLocaleString()}</div>
        <div class="stat-lbl">Your Stake</div>
      </div>
    </div>

    <div class="howto">
      <div class="howto-icon">📋</div>
      <div class="howto-text">
        <strong>How to place on Sportybet:</strong> Open Sportybet → tap each match → select the recommended pick → add to bet slip → enter your stake → review and confirm. You stay in full control.
      </div>
    </div>

    ${cards}

    ${
      slip.analyst_note
        ? `<div class="analyst-note"><strong>🧠 Analyst Note</strong> ${slip.analyst_note}</div>`
        : ""
    }

    <div class="disclaimer">
      ⚠ DISCLAIMER: PickAI provides AI-generated match analysis for informational purposes only. These are not guarantees. Football is unpredictable — always review picks yourself before placing. Only stake what you can comfortably afford to lose. Gamble responsibly.
    </div>
  `;
}

// ── On page load: restore last session if available ──
window.addEventListener("DOMContentLoaded", restoreSession);
