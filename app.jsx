/* ═══════════════════════════════════════════════════════
   BASELINE DATA — 2025 historical + 2026 rolling
═══════════════════════════════════════════════════════ */
const STORES = [
  { id:"mcd17",     short:"McD 17th St",  emoji:"🍔", dist:400,  color:"#FFCC00", type:"fast_food"   },
  { id:"slicepie",  short:"Slice & Pie",  emoji:"🍕", dist:500,  color:"#f97316", type:"pizza"       },
  { id:"giordanos", short:"Giordano's",   emoji:"🍕", dist:550,  color:"#e11d48", type:"pizza"       },
  { id:"mcd13",     short:"McD 13th St",  emoji:"🍔", dist:700,  color:"#facc15", type:"fast_food"   },
  { id:"wawa",      short:"Wawa 24h",     emoji:"🏪", dist:750,  color:"#06b6d4", type:"convenience" },
  { id:"chickfila", short:"Chick-fil-A",  emoji:"🐔", dist:1200, color:"#E51636", type:"fast_food"   },
  { id:"shakeshack",short:"Shake Shack",  emoji:"🍔", dist:1100, color:"#84cc16", type:"fast_food"   },
  { id:"wiseguy",   short:"Wiseguy Pizza",emoji:"🍕", dist:1500, color:"#a78bfa", type:"pizza"       },
];

const BASELINE = [
  { m:"Jan'25", mcd17:100,slicepie:100,giordanos:100,mcd13:100,wawa:100,chickfila:100,shakeshack:100,wiseguy:100 },
  { m:"Feb'25", mcd17:96, slicepie:91, giordanos:97, mcd13:96, wawa:98, chickfila:99, shakeshack:97, wiseguy:98  },
  { m:"Mar'25", mcd17:93, slicepie:87, giordanos:95, mcd13:93, wawa:96, chickfila:97, shakeshack:94, wiseguy:96  },
  { m:"Apr'25", mcd17:91, slicepie:84, giordanos:93, mcd13:91, wawa:94, chickfila:96, shakeshack:92, wiseguy:94  },
  { m:"May'25", mcd17:90, slicepie:82, giordanos:92, mcd13:90, wawa:93, chickfila:95, shakeshack:91, wiseguy:93  },
  { m:"Jun'25", mcd17:89, slicepie:81, giordanos:91, mcd13:89, wawa:92, chickfila:94, shakeshack:90, wiseguy:92  },
  { m:"Jul'25", mcd17:92, slicepie:80, giordanos:90, mcd13:91, wawa:93, chickfila:96, shakeshack:92, wiseguy:93  },
  { m:"Aug'25", mcd17:79, slicepie:66, giordanos:78, mcd13:79, wawa:96, chickfila:84, shakeshack:78, wiseguy:81  },
  { m:"Sep'25", mcd17:78, slicepie:64, giordanos:77, mcd13:78, wawa:95, chickfila:83, shakeshack:76, wiseguy:80  },
  { m:"Oct'25", mcd17:70, slicepie:53, giordanos:72, mcd13:70, wawa:90, chickfila:76, shakeshack:68, wiseguy:74  },
  { m:"Nov'25", mcd17:74, slicepie:58, giordanos:75, mcd13:73, wawa:92, chickfila:79, shakeshack:71, wiseguy:77  },
  { m:"Dec'25", mcd17:79, slicepie:62, giordanos:79, mcd13:78, wawa:94, chickfila:83, shakeshack:75, wiseguy:81  },
  { m:"Jan'26", mcd17:81, slicepie:63, giordanos:81, mcd13:80, wawa:94, chickfila:84, shakeshack:76, wiseguy:82  },
  { m:"Feb'26", mcd17:82, slicepie:65, giordanos:82, mcd13:81, wawa:94, chickfila:85, shakeshack:77, wiseguy:83  },
  { m:"Mar'26", mcd17:83, slicepie:67, giordanos:83, mcd13:82, wawa:95, chickfila:86, shakeshack:78, wiseguy:84  },
  { m:"Apr'26", mcd17:84, slicepie:68, giordanos:84, mcd13:83, wawa:95, chickfila:87, shakeshack:79, wiseguy:85  },
  { m:"May'26", mcd17:85, slicepie:70, giordanos:85, mcd13:84, wawa:95, chickfila:87, shakeshack:80, wiseguy:86  },
  { m:"Jun'26", mcd17:87, slicepie:73, giordanos:87, mcd13:86, wawa:96, chickfila:89, shakeshack:82, wiseguy:88  },
];

function calcSignal(row) {
  const ids = ["mcd17","slicepie","giordanos","mcd13","chickfila","shakeshack","wiseguy"];
  const avg = ids.reduce((s,id) => s + (row[id]||85), 0) / ids.length;
  return Math.round((avg - 60) * 1.3 + 42);
}

function heatColor(v) {
  if (v >= 93) return "#22c55e";
  if (v >= 85) return "#86efac";
  if (v >= 77) return "#fde68a";
  if (v >= 68) return "#fdba74";
  if (v >= 60) return "#f97316";
  return "#ef4444";
}

/* ═══════════════════════════════════════════════════════
   CLAUDE API — fetch latest WH/DC food news & score
═══════════════════════════════════════════════════════ */
async function fetchIntelligenceUpdate() {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { month:"long", day:"numeric", year:"numeric" });

  const prompt = `You are a Washington DC restaurant intelligence analyst. Today is ${dateStr}.

Analyze the current situation around the White House (Pennsylvania Ave area, DC) for fast food and pizza restaurants. Consider:
1. Any recent White House political activity, federal workforce news, or government actions that affect foot traffic
2. DC tourism trends right now
3. Any specific events near the White House corridor this week

Return ONLY a valid JSON object (no markdown, no explanation) with this exact structure:
{
  "date": "${dateStr}",
  "whPressureLevel": <integer 1-10, where 10=maximum political disruption to restaurants>,
  "overallSignal": <integer 40-100, 100=normal pre-2025 baseline, lower=worse>,
  "storeAdjustments": {
    "mcd17": <integer delta -15 to +5>,
    "slicepie": <integer delta -20 to +5>,
    "giordanos": <integer delta -15 to +5>,
    "mcd13": <integer delta -15 to +5>,
    "wawa": <integer delta -5 to +8>,
    "chickfila": <integer delta -12 to +5>,
    "shakeshack": <integer delta -15 to +5>,
    "wiseguy": <integer delta -12 to +5>
  },
  "topEvent": "<one most impactful current event in 15 words or less>",
  "alerts": ["<alert 1 in 12 words>", "<alert 2 in 12 words>"],
  "outlook": "<2-sentence outlook for DC restaurant corridor>",
  "recoveryScore": <integer 0-100 where 100=full recovery to 2024 levels>,
  "touristIndex": <integer 0-100>
}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await response.json();

  // Extract text from all content blocks
  const textBlocks = (data.content || [])
    .filter(b => b.type === "text")
    .map(b => b.text)
    .join("\n");

  // Parse JSON from response
  const jsonMatch = textBlocks.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in response");
  return JSON.parse(jsonMatch[0]);
}

/* ═══════════════════════════════════════════════════════
   PULSE ANIMATION component
═══════════════════════════════════════════════════════ */
function PulseDot({ color = "#22c55e", size = 8 }) {
  return (
    <span style={{ position:"relative", display:"inline-block", width:size, height:size }}>
      <span style={{
        position:"absolute", inset:0, borderRadius:"50%",
        background:color, opacity:0.4,
        animation:"ping 1.5s cubic-bezier(0,0,0.2,1) infinite"
      }}/>
      <span style={{ position:"absolute", inset:0, borderRadius:"50%", background:color }}/>
    </span>
  );
}

/* ═══════════════════════════════════════════════════════
   COUNTDOWN RING
═══════════════════════════════════════════════════════ */
function CountdownRing({ secondsLeft, total }) {
  const pct = secondsLeft / total;
  const r = 18, c = 2 * Math.PI * r;
  const dash = c * pct;
  return (
    <svg width={44} height={44} style={{ transform:"rotate(-90deg)" }}>
      <circle cx={22} cy={22} r={r} fill="none" stroke="#1e293b" strokeWidth={3}/>
      <circle cx={22} cy={22} r={r} fill="none" stroke="#3b82f6"
        strokeWidth={3} strokeDasharray={`${dash} ${c}`}
        style={{ transition:"stroke-dasharray 1s linear" }}/>
      <text x={22} y={26} textAnchor="middle"
        style={{ fill:"#94a3b8", fontSize:9, fontFamily:"monospace", transform:"rotate(90deg)", transformOrigin:"22px 22px" }}>
        {Math.ceil(secondsLeft / 60)}m
      </text>
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════ */
const REFRESH_INTERVAL = 30 * 60; // 30 minutes in seconds

export default function WHRealtimeMonitor() {
  const [intel, setIntel]         = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const [history, setHistory]     = useState([]);
  const [liveData, setLiveData]   = useState(BASELINE);
  const [selectedStore, setSelectedStore] = useState("mcd17");
  const [pulseActive, setPulseActive] = useState(false);
  const intervalRef = useRef(null);
  const countdownRef = useRef(null);

  const doFetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    setPulseActive(true);
    try {
      const result = await fetchIntelligenceUpdate();
      setIntel(result);
      setLastUpdate(new Date());
      setCountdown(REFRESH_INTERVAL);

      // Apply adjustments to latest month's data
      const latest = { ...BASELINE[BASELINE.length - 1] };
      const adj = result.storeAdjustments || {};
      STORES.forEach(s => {
        if (adj[s.id] !== undefined) {
          latest[s.id] = Math.max(30, Math.min(105, latest[s.id] + adj[s.id]));
        }
      });
      latest.m = `NOW`;
      latest.live = true;

      setLiveData(prev => {
        const base = BASELINE.filter(d => d.m !== "NOW");
        return [...base, latest];
      });

      setHistory(prev => [
        { time: new Date().toLocaleTimeString("ja-JP", { hour:"2-digit", minute:"2-digit" }),
          signal: result.overallSignal,
          event: result.topEvent,
          pressure: result.whPressureLevel },
        ...prev.slice(0, 11)
      ]);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setTimeout(() => setPulseActive(false), 2000);
    }
  }, []);

  // Auto-refresh timer
  useEffect(() => {
    doFetch();
    intervalRef.current = setInterval(doFetch, REFRESH_INTERVAL * 1000);
    return () => clearInterval(intervalRef.current);
  }, [doFetch]);

  // Countdown ticker
  useEffect(() => {
    countdownRef.current = setInterval(() => {
      setCountdown(c => c > 0 ? c - 1 : REFRESH_INTERVAL);
    }, 1000);
    return () => clearInterval(countdownRef.current);
  }, []);

  const store = STORES.find(s => s.id === selectedStore);
  const currentRow = liveData[liveData.length - 1];
  const currentSignal = intel?.overallSignal ?? calcSignal(currentRow);
  const pressureLevel = intel?.whPressureLevel ?? 4;

  const pressureColor = pressureLevel >= 8 ? "#ef4444"
    : pressureLevel >= 6 ? "#f97316"
    : pressureLevel >= 4 ? "#facc15"
    : "#22c55e";

  return (
    <div style={{
      background:"#04080F",
      minHeight:"100vh",
      color:"#e2e8f0",
      fontFamily:"'Courier New',monospace",
    }}>
      <style>{`
        @keyframes ping { 0%{transform:scale(1);opacity:.7} 75%,100%{transform:scale(2);opacity:0} }
        @keyframes scanline { 0%{top:-10%} 100%{top:110%} }
        @keyframes blink { 0%,49%{opacity:1} 50%,100%{opacity:0} }
        @keyframes fadeInUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .alert-row { animation: fadeInUp 0.4s ease forwards; }
        .scan-effect::after {
          content:''; position:absolute; left:0; right:0; height:2px;
          background:linear-gradient(90deg,transparent,rgba(59,130,246,0.4),transparent);
          animation: scanline 3s linear infinite; pointer-events:none;
        }
      `}</style>

      {/* ── HEADER BAR ── */}
      <div style={{
        background:"linear-gradient(180deg,#060e1c,#040810)",
        borderBottom:"1px solid #0f2040",
        padding:"14px 24px",
        display:"flex", alignItems:"center", justifyContent:"space-between",
        flexWrap:"wrap", gap:10,
        position:"relative", overflow:"hidden"
      }} className="scan-effect">
        {/* Grid overlay */}
        <div style={{
          position:"absolute", inset:0, opacity:0.03,
          backgroundImage:"linear-gradient(#3b82f6 1px,transparent 1px),linear-gradient(90deg,#3b82f6 1px,transparent 1px)",
          backgroundSize:"20px 20px", pointerEvents:"none"
        }}/>

        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          <PulseDot color={loading ? "#facc15" : "#22c55e"} size={10} />
          <div>
            <div style={{ fontSize:8, letterSpacing:4, color:"#1e4080", marginBottom:2 }}>
              CLASSIFIED INTELLIGENCE FEED — LIVE
            </div>
            <div style={{ fontSize:14, fontWeight:700, color:"#60a5fa", letterSpacing:1 }}>
              WH FOOD CORRIDOR MONITOR
            </div>
          </div>
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:20, flexWrap:"wrap" }}>
          {/* Pressure gauge */}
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:7, color:"#334155", letterSpacing:2, marginBottom:2 }}>WH PRESSURE</div>
            <div style={{ fontSize:26, fontWeight:800, color:pressureColor, lineHeight:1 }}>
              {pressureLevel}<span style={{ fontSize:10, color:"#475569" }}>/10</span>
            </div>
          </div>

          {/* Signal score */}
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:7, color:"#334155", letterSpacing:2, marginBottom:2 }}>SIGNAL INDEX</div>
            <div style={{ fontSize:26, fontWeight:800, color:heatColor(currentSignal), lineHeight:1 }}>
              {currentSignal}
            </div>
          </div>

          {/* Countdown ring */}
          <div style={{ textAlign:"center" }}>
            <CountdownRing secondsLeft={countdown} total={REFRESH_INTERVAL} />
            <div style={{ fontSize:7, color:"#334155", marginTop:2 }}>NEXT FETCH</div>
          </div>

          {/* Manual refresh */}
          <button onClick={doFetch} disabled={loading} style={{
            background: loading ? "#0f2040" : "rgba(59,130,246,0.15)",
            border:"1px solid #1e3a5f",
            borderRadius:6, padding:"8px 16px",
            color: loading ? "#334155" : "#60a5fa",
            fontSize:9, cursor: loading ? "not-allowed" : "pointer",
            letterSpacing:2, fontFamily:"'Courier New',monospace"
          }}>
            {loading ? "▶ FETCHING..." : "▶ REFRESH NOW"}
          </button>
        </div>
      </div>

      {/* ── STATUS BAR ── */}
      <div style={{
        background:"#060e1c", borderBottom:"1px solid #0a1628",
        padding:"6px 24px",
        display:"flex", alignItems:"center", gap:16, fontSize:8, flexWrap:"wrap"
      }}>
        <span style={{ color:"#22c55e" }}>● LIVE</span>
        <span style={{ color:"#334155" }}>|</span>
        <span style={{ color:"#475569" }}>
          LAST UPDATE: {lastUpdate ? lastUpdate.toLocaleTimeString("ja-JP") : "—"}
        </span>
        <span style={{ color:"#334155" }}>|</span>
        <span style={{ color:"#475569" }}>
          SOURCE: CLAUDE API + WEB SEARCH
        </span>
        <span style={{ color:"#334155" }}>|</span>
        <span style={{ color:"#475569" }}>
          INTERVAL: 30 MIN AUTO-REFRESH
        </span>
        {intel?.topEvent && (
          <>
            <span style={{ color:"#334155" }}>|</span>
            <span style={{ color:"#fbbf24", animation:"blink 2s step-end infinite" }}>⚡</span>
            <span style={{ color:"#fbbf24" }}>{intel.topEvent}</span>
          </>
        )}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 320px", gap:0, minHeight:"calc(100vh - 100px)" }}>

        {/* ── LEFT PANEL ── */}
        <div style={{ padding:"20px 24px", borderRight:"1px solid #0a1628" }}>

          {/* Error banner */}
          {error && (
            <div style={{
              background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)",
              borderRadius:6, padding:"10px 14px", marginBottom:16,
              fontSize:9, color:"#fca5a5"
            }}>
              ⚠ API ERROR: {error} — ベースラインデータで継続表示中
            </div>
          )}

          {/* Store grid — current live scores */}
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:8, letterSpacing:3, color:"#1e4080", marginBottom:10 }}>
              LIVE STORE INDEX — SORTED BY WH PROXIMITY
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:8 }}>
              {[...STORES].sort((a,b) => a.dist - b.dist).map(s => {
                const v = currentRow[s.id] ?? 85;
                const prev = BASELINE[BASELINE.length-2][s.id] ?? v;
                const delta = v - prev;
                const isSelected = selectedStore === s.id;
                return (
                  <button key={s.id} onClick={() => setSelectedStore(s.id)} style={{
                    background: isSelected ? `rgba(${s.color==='#FFCC00'?'255,204,0':s.color==='#f97316'?'249,115,22':s.color==='#e11d48'?'225,29,72':s.color==='#facc15'?'250,204,21':s.color==='#06b6d4'?'6,182,212':s.color==='#E51636'?'229,22,54':s.color==='#84cc16'?'132,204,22':'167,139,250'},0.12)` : "rgba(255,255,255,0.02)",
                    border:`1px solid ${isSelected ? s.color+'66' : "#0a1628"}`,
                    borderTop:`2px solid ${isSelected ? s.color : heatColor(v)}`,
                    borderRadius:6, padding:"10px 12px",
                    cursor:"pointer", textAlign:"left",
                    transition:"all 0.2s",
                    animation: pulseActive && delta !== 0 ? "fadeInUp 0.5s ease" : "none"
                  }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                      <span style={{ fontSize:9, color:s.color, fontWeight:700 }}>{s.emoji} {s.short}</span>
                      <span style={{ fontSize:8, color:"#334155" }}>{s.dist}m</span>
                    </div>
                    <div style={{ display:"flex", alignItems:"baseline", gap:8 }}>
                      <span style={{ fontSize:22, fontWeight:800, color:heatColor(v) }}>{v}</span>
                      <span style={{ fontSize:9, color: delta>0?"#22c55e":delta<0?"#ef4444":"#475569", fontWeight:600 }}>
                        {delta>0?`▲+${delta}`:delta<0?`▼${delta}`:"—"}
                      </span>
                    </div>
                    <div style={{ marginTop:4, background:"#060e1c", borderRadius:2, height:3 }}>
                      <div style={{ width:`${v}%`, background:heatColor(v), height:3, borderRadius:2,
                        transition:"width 0.8s ease" }}/>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected store chart */}
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:8, letterSpacing:3, color:"#1e4080", marginBottom:10 }}>
              {store.emoji} {store.short.toUpperCase()} — 18M TREND + LIVE
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={liveData} margin={{ top:5, right:10, left:0, bottom:0 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="#0a1628" />
                <XAxis dataKey="m" tick={{ fill:"#334155", fontSize:7 }} axisLine={{ stroke:"#0a1628" }}
                  interval="preserveStartEnd" />
                <YAxis domain={[40,105]} tick={{ fill:"#334155", fontSize:8 }} axisLine={{ stroke:"#0a1628" }} />
                <Tooltip
                  contentStyle={{ background:"rgba(4,8,15,0.97)", border:"1px solid #1e3a5f",
                    borderRadius:6, fontSize:9, fontFamily:"'Courier New',monospace" }}
                  labelStyle={{ color:"#64748b" }}
                  formatter={(v) => [<span style={{ color:heatColor(v), fontWeight:700 }}>{v}</span>, store.short]}
                />
                <ReferenceLine y={100} stroke="#0f2040" strokeDasharray="3 3" />
                <ReferenceLine x="Aug'25" stroke="#ef444433" strokeWidth={1} />
                <ReferenceLine x="Oct'25" stroke="#a855f433" strokeWidth={1} />
                {liveData.some(d => d.live) &&
                  <ReferenceLine x="NOW" stroke={store.color} strokeWidth={1.5}
                    label={{ value:"LIVE", fill:store.color, fontSize:7, position:"top" }} />
                }
                <Line type="monotone" dataKey={selectedStore}
                  stroke={store.color} strokeWidth={2}
                  dot={(props) => {
                    const { cx, cy, payload } = props;
                    if (payload.live) {
                      return <circle key="live" cx={cx} cy={cy} r={5} fill={store.color}
                        stroke="#04080F" strokeWidth={2} />;
                    }
                    return <circle key={payload.m} cx={cx} cy={cy} r={2} fill={store.color} />;
                  }}
                  activeDot={{ r:5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Intel outlook */}
          {intel && (
            <div style={{
              background:"rgba(59,130,246,0.04)",
              border:"1px solid #0f2040",
              borderLeft:"3px solid #3b82f6",
              borderRadius:6, padding:"12px 16px"
            }}>
              <div style={{ fontSize:8, letterSpacing:3, color:"#1e4080", marginBottom:8 }}>
                AI OUTLOOK — {intel.date}
              </div>
              <div style={{ fontSize:10, color:"#94a3b8", lineHeight:1.8, marginBottom:10 }}>
                {intel.outlook}
              </div>
              <div style={{ display:"flex", gap:20, flexWrap:"wrap" }}>
                <div>
                  <div style={{ fontSize:7, color:"#334155", marginBottom:2 }}>RECOVERY SCORE</div>
                  <div style={{ fontSize:18, fontWeight:700, color:"#60a5fa" }}>
                    {intel.recoveryScore}<span style={{ fontSize:9, color:"#334155" }}>/100</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize:7, color:"#334155", marginBottom:2 }}>TOURIST INDEX</div>
                  <div style={{ fontSize:18, fontWeight:700, color:"#a78bfa" }}>
                    {intel.touristIndex}<span style={{ fontSize:9, color:"#334155" }}>/100</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL ── */}
        <div style={{ padding:"20px 20px", display:"flex", flexDirection:"column", gap:16 }}>

          {/* Alerts feed */}
          <div>
            <div style={{ fontSize:8, letterSpacing:3, color:"#1e4080", marginBottom:10 }}>
              ⚡ LIVE ALERTS
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {intel?.alerts?.map((a, i) => (
                <div key={i} className="alert-row" style={{
                  background:"rgba(251,191,36,0.05)",
                  border:"1px solid rgba(251,191,36,0.15)",
                  borderLeft:"2px solid #fbbf24",
                  borderRadius:4, padding:"7px 10px",
                  fontSize:9, color:"#fde68a", lineHeight:1.5
                }}>
                  {a}
                </div>
              )) ?? (
                <div style={{ fontSize:9, color:"#1e4080" }}>— データ取得中 —</div>
              )}
            </div>
          </div>

          {/* History log */}
          <div style={{ flex:1 }}>
            <div style={{ fontSize:8, letterSpacing:3, color:"#1e4080", marginBottom:10 }}>
              📋 FETCH HISTORY LOG
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:4, maxHeight:300, overflowY:"auto" }}>
              {history.length === 0 && (
                <div style={{ fontSize:8, color:"#1e3060" }}>— 初回フェッチ完了後に記録開始 —</div>
              )}
              {history.map((h, i) => (
                <div key={i} style={{
                  background:i===0?"rgba(59,130,246,0.06)":"transparent",
                  border:`1px solid ${i===0?"#1e3a5f":"#060e1c"}`,
                  borderRadius:4, padding:"6px 10px",
                  fontSize:8
                }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                    <span style={{ color:"#60a5fa" }}>{h.time}</span>
                    <span style={{ color:heatColor(h.signal), fontWeight:700 }}>IDX:{h.signal}</span>
                    <span style={{ color:h.pressure>=7?"#ef4444":h.pressure>=5?"#f97316":"#22c55e" }}>
                      P:{h.pressure}/10
                    </span>
                  </div>
                  <div style={{ color:"#475569", lineHeight:1.4 }}>{h.event}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Signal heat bar */}
          <div>
            <div style={{ fontSize:8, letterSpacing:3, color:"#1e4080", marginBottom:8 }}>
              SIGNAL HEATMAP — ALL STORES NOW
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
              {[...STORES].sort((a,b) => a.dist - b.dist).map(s => {
                const v = currentRow[s.id] ?? 85;
                return (
                  <div key={s.id} style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:8, color:"#334155", minWidth:86, textAlign:"right" }}>
                      {s.emoji} {s.short.slice(0,9)}
                    </span>
                    <div style={{ flex:1, background:"#060e1c", borderRadius:2, height:8, position:"relative" }}>
                      <div style={{
                        width:`${v}%`, background:heatColor(v), height:8, borderRadius:2,
                        transition:"width 1s ease",
                        boxShadow:`0 0 6px ${heatColor(v)}66`
                      }}/>
                    </div>
                    <span style={{ fontSize:8, fontWeight:700, color:heatColor(v), minWidth:22 }}>{v}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Meta */}
          <div style={{
            background:"rgba(255,255,255,0.01)", border:"1px solid #060e1c",
            borderRadius:4, padding:"10px 12px", fontSize:7, color:"#1e4080", lineHeight:1.8
          }}>
            <div style={{ color:"#334155", marginBottom:4 }}>SYSTEM INFO</div>
            REFRESH INTERVAL: 30 MIN<br />
            DATA SOURCE: CLAUDE + WEB<br />
            STORES TRACKED: {STORES.length}<br />
            BASELINE PERIOD: JAN 2025<br />
            COVERAGE: WH RADIUS 1.5KM<br />
            <span style={{ color:"#22c55e" }}>STATUS: OPERATIONAL</span>
          </div>
        </div>
      </div>
    </div>
  );
}
const rootElement = document.getElementById("root");
const root = ReactDOM.createRoot(rootElement);
root.render(<App />);
