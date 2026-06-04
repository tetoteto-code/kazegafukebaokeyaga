// UMD globals — no import/export needed when loaded via CDN + Babel
const { useState, useEffect, useRef, useCallback } = React;
const { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } = Recharts;


// STORES sorted by distance from White House
const STORES = [
  { id:"mcd17",     short:"McD 17th St",   emoji:"🍔", dist:400,  color:"#FFCC00" },
  { id:"slicepie",  short:"Slice & Pie",   emoji:"🍕", dist:500,  color:"#f97316" },
  { id:"giordanos", short:"Giordano's",    emoji:"🍕", dist:550,  color:"#e11d48" },
  { id:"mcd13",     short:"McD 13th St",   emoji:"🍔", dist:700,  color:"#facc15" },
  { id:"wawa",      short:"Wawa 24h",      emoji:"🏪", dist:750,  color:"#06b6d4" },
  { id:"chickfila", short:"Chick-fil-A",   emoji:"🐔", dist:1200, color:"#E51636" },
  { id:"shakeshack",short:"Shake Shack",   emoji:"🍔", dist:1100, color:"#84cc16" },
  { id:"wiseguy",   short:"Wiseguy Pizza", emoji:"🍕", dist:1500, color:"#a78bfa" },
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

function heatColor(v) {
  if (v >= 93) return "#22c55e";
  if (v >= 85) return "#86efac";
  if (v >= 77) return "#fde68a";
  if (v >= 68) return "#fdba74";
  if (v >= 60) return "#f97316";
  return "#ef4444";
}

async function fetchIntelligence() {
  const dateStr = new Date().toLocaleDateString("en-US", { month:"long", day:"numeric", year:"numeric" });
  const prompt = `You are a Washington DC restaurant intelligence analyst. Today is ${dateStr}.

Analyze the current situation around the White House (Pennsylvania Ave area, DC) for fast food and pizza restaurants. Consider recent White House political activity, federal workforce news, DC tourism trends, and any events near the White House corridor.

Return ONLY a valid JSON object with NO markdown formatting, NO backticks, NO explanation. Just raw JSON:
{"date":"${dateStr}","whPressureLevel":5,"overallSignal":85,"storeAdjustments":{"mcd17":0,"slicepie":0,"giordanos":0,"mcd13":0,"wawa":0,"chickfila":0,"shakeshack":0,"wiseguy":0},"topEvent":"brief current event description here","alerts":["alert one about DC restaurants","alert two about White House area"],"outlook":"Two sentence outlook for DC restaurant corridor near White House.","recoveryScore":72,"touristIndex":65}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 800,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("\n");
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON in response");
  return JSON.parse(match[0]);
}

function PulseDot({ color, size = 8 }) {
  return (
    <span style={{ position:"relative", display:"inline-block", width:size, height:size, flexShrink:0 }}>
      <span style={{
        position:"absolute", inset:0, borderRadius:"50%", background:color, opacity:0.5,
        animation:"wh-ping 1.5s cubic-bezier(0,0,0.2,1) infinite"
      }} />
      <span style={{ position:"absolute", inset:0, borderRadius:"50%", background:color }} />
    </span>
  );
}

function CountdownRing({ secondsLeft, total }) {
  const r = 18, circ = 2 * Math.PI * r;
  const dash = circ * (secondsLeft / total);
  return (
    <svg width={44} height={44} style={{ transform:"rotate(-90deg)" }}>
      <circle cx={22} cy={22} r={r} fill="none" stroke="#0f2040" strokeWidth={3} />
      <circle cx={22} cy={22} r={r} fill="none" stroke="#3b82f6" strokeWidth={3}
        strokeDasharray={`${dash} ${circ}`} style={{ transition:"stroke-dasharray 1s linear" }} />
      <text x={22} y={26} textAnchor="middle"
        style={{ fill:"#64748b", fontSize:9, fontFamily:"monospace",
          transform:"rotate(90deg)", transformOrigin:"22px 22px" }}>
        {Math.ceil(secondsLeft / 60)}m
      </text>
    </svg>
  );
}

const INTERVAL_SEC = 30 * 60;

function App() {
  const [intel, setIntel] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [countdown, setCountdown] = useState(INTERVAL_SEC);
  const [history, setHistory] = useState([]);
  const [liveData, setLiveData] = useState(BASELINE);
  const [selStore, setSelStore] = useState("slicepie");
  const [flash, setFlash] = useState(false);
  const timerRef = useRef(null);
  const cdRef = useRef(null);

  const doFetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchIntelligence();
      setIntel(result);
      setLastUpdate(new Date());
      setCountdown(INTERVAL_SEC);
      setFlash(true);
      setTimeout(() => setFlash(false), 1500);

      const latest = { ...BASELINE[BASELINE.length - 1], m: "NOW", live: true };
      const adj = result.storeAdjustments || {};
      STORES.forEach(s => {
        if (adj[s.id] != null) {
          latest[s.id] = Math.max(30, Math.min(105, latest[s.id] + adj[s.id]));
        }
      });
      setLiveData([...BASELINE, latest]);
      setHistory(prev => [{
        time: new Date().toLocaleTimeString("ja-JP", { hour:"2-digit", minute:"2-digit" }),
        signal: result.overallSignal,
        pressure: result.whPressureLevel,
        event: result.topEvent,
      }, ...prev.slice(0, 9)]);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    doFetch();
    timerRef.current = setInterval(doFetch, INTERVAL_SEC * 1000);
    return () => clearInterval(timerRef.current);
  }, [doFetch]);

  useEffect(() => {
    cdRef.current = setInterval(() => setCountdown(c => c > 0 ? c - 1 : INTERVAL_SEC), 1000);
    return () => clearInterval(cdRef.current);
  }, []);

  const store = STORES.find(s => s.id === selStore);
  const currentRow = liveData[liveData.length - 1];
  const signal = intel?.overallSignal ?? 85;
  const pressure = intel?.whPressureLevel ?? 4;
  const pColor = pressure >= 8 ? "#ef4444" : pressure >= 6 ? "#f97316" : pressure >= 4 ? "#facc15" : "#22c55e";

  return (
    <div style={{ background:"#04080F", minHeight:"100vh", color:"#e2e8f0", fontFamily:"'Courier New',monospace" }}>
      <style>{`
        @keyframes wh-ping { 0%{transform:scale(1);opacity:.7} 75%,100%{transform:scale(2.2);opacity:0} }
        @keyframes wh-blink { 0%,49%{opacity:1} 50%,100%{opacity:0} }
        @keyframes wh-scan { 0%{top:-5%} 100%{top:105%} }
        @keyframes wh-fadein { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        .wh-flash { animation: wh-fadein 0.4s ease; }
      `}</style>

      {/* HEADER */}
      <div style={{
        background:"linear-gradient(180deg,#06101e,#040810)",
        borderBottom:"1px solid #0d1e38",
        padding:"12px 20px",
        display:"flex", alignItems:"center", justifyContent:"space-between",
        flexWrap:"wrap", gap:10, position:"relative", overflow:"hidden"
      }}>
        <div style={{
          position:"absolute", inset:0, opacity:0.025,
          backgroundImage:"linear-gradient(#3b82f6 1px,transparent 1px),linear-gradient(90deg,#3b82f6 1px,transparent 1px)",
          backgroundSize:"24px 24px", pointerEvents:"none"
        }} />
        <div style={{ display:"flex", alignItems:"center", gap:14, position:"relative" }}>
          <PulseDot color={loading ? "#facc15" : "#22c55e"} size={10} />
          <div>
            <div style={{ fontSize:7, letterSpacing:4, color:"#1e4080" }}>LIVE INTELLIGENCE FEED</div>
            <div style={{ fontSize:15, fontWeight:700, color:"#60a5fa", letterSpacing:1 }}>
              WH FOOD CORRIDOR MONITOR
            </div>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:18, flexWrap:"wrap", position:"relative" }}>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:7, color:"#1e4080", letterSpacing:2 }}>WH PRESSURE</div>
            <div style={{ fontSize:24, fontWeight:800, color:pColor, lineHeight:1 }}>
              {pressure}<span style={{ fontSize:9, color:"#334155" }}>/10</span>
            </div>
          </div>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:7, color:"#1e4080", letterSpacing:2 }}>SIGNAL</div>
            <div style={{ fontSize:24, fontWeight:800, color:heatColor(signal), lineHeight:1 }}>{signal}</div>
          </div>
          <CountdownRing secondsLeft={countdown} total={INTERVAL_SEC} />
          <button onClick={doFetch} disabled={loading} style={{
            background: loading ? "#0a1628" : "rgba(59,130,246,0.12)",
            border:"1px solid #1e3a5f", borderRadius:5, padding:"7px 14px",
            color: loading ? "#334155" : "#60a5fa",
            fontSize:8, cursor: loading ? "not-allowed" : "pointer",
            letterSpacing:2, fontFamily:"'Courier New',monospace"
          }}>
            {loading ? "FETCHING..." : "REFRESH NOW"}
          </button>
        </div>
      </div>

      {/* STATUS BAR */}
      <div style={{
        background:"#050c18", borderBottom:"1px solid #081428",
        padding:"5px 20px", display:"flex", alignItems:"center", gap:12,
        fontSize:8, flexWrap:"wrap", color:"#334155"
      }}>
        <span style={{ color:"#22c55e" }}>● LIVE</span>
        <span>|</span>
        <span>LAST: {lastUpdate ? lastUpdate.toLocaleTimeString("ja-JP") : "--:--:--"}</span>
        <span>|</span>
        <span>AUTO-REFRESH: 30 MIN</span>
        <span>|</span>
        <span>SOURCE: CLAUDE API + WEB SEARCH</span>
        {intel?.topEvent && (
          <>
            <span>|</span>
            <span style={{ color:"#fbbf24", animation:"wh-blink 2s step-end infinite" }}>⚡</span>
            <span style={{ color:"#fbbf24" }}>{intel.topEvent}</span>
          </>
        )}
      </div>

      {error && (
        <div style={{ background:"rgba(239,68,68,0.08)", borderBottom:"1px solid rgba(239,68,68,0.2)",
          padding:"7px 20px", fontSize:8, color:"#fca5a5" }}>
          API ERROR: {error} — ベースラインデータで表示継続
        </div>
      )}

      {/* MAIN GRID */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 300px", minHeight:"calc(100vh - 90px)" }}>

        {/* LEFT */}
        <div style={{ padding:"18px 20px", borderRight:"1px solid #080f1e" }}>

          {/* Store cards */}
          <div style={{ fontSize:7, letterSpacing:3, color:"#1e4080", marginBottom:10 }}>
            LIVE STORE INDEX — WH PROXIMITY ORDER
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(145px,1fr))", gap:8, marginBottom:20 }}>
            {[...STORES].sort((a,b) => a.dist - b.dist).map(s => {
              const v = currentRow[s.id] ?? 85;
              const base = BASELINE[BASELINE.length - 1][s.id];
              const delta = v - base;
              const isSel = selStore === s.id;
              return (
                <button key={s.id} onClick={() => setSelStore(s.id)} style={{
                  background: isSel ? `rgba(59,130,246,0.08)` : "rgba(255,255,255,0.015)",
                  border:`1px solid ${isSel ? "#1e3a5f" : "#080f1e"}`,
                  borderTop:`2px solid ${isSel ? s.color : heatColor(v)}`,
                  borderRadius:6, padding:"9px 11px", cursor:"pointer", textAlign:"left",
                  transition:"all 0.2s",
                  animation: flash ? "wh-fadein 0.5s ease" : "none"
                }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                    <span style={{ fontSize:8, color:s.color, fontWeight:700 }}>{s.emoji} {s.short}</span>
                    <span style={{ fontSize:7, color:"#1e4080" }}>{s.dist}m</span>
                  </div>
                  <div style={{ display:"flex", alignItems:"baseline", gap:6 }}>
                    <span style={{ fontSize:20, fontWeight:800, color:heatColor(v) }}>{v}</span>
                    <span style={{ fontSize:9, fontWeight:600,
                      color: delta > 0 ? "#22c55e" : delta < 0 ? "#ef4444" : "#334155" }}>
                      {delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : "-"}
                    </span>
                  </div>
                  <div style={{ marginTop:4, background:"#060e1c", borderRadius:2, height:3 }}>
                    <div style={{ width:`${v}%`, background:heatColor(v), height:3, borderRadius:2,
                      transition:"width 0.8s ease" }} />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Chart */}
          <div style={{ fontSize:7, letterSpacing:3, color:"#1e4080", marginBottom:8 }}>
            {store.emoji} {store.short.toUpperCase()} — 18M TREND + LIVE
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={liveData} margin={{ top:5, right:10, left:-10, bottom:0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="#080f1e" />
              <XAxis dataKey="m" tick={{ fill:"#1e4080", fontSize:7 }} axisLine={{ stroke:"#080f1e" }}
                interval="preserveStartEnd" />
              <YAxis domain={[40, 105]} tick={{ fill:"#1e4080", fontSize:8 }} axisLine={{ stroke:"#080f1e" }} />
              <Tooltip
                contentStyle={{ background:"rgba(4,8,15,0.97)", border:"1px solid #1e3a5f",
                  borderRadius:6, fontSize:9, fontFamily:"'Courier New',monospace" }}
                labelStyle={{ color:"#475569" }}
                formatter={(v) => [<span style={{ color:heatColor(v), fontWeight:700 }}>{v}</span>, store.short]}
              />
              <ReferenceLine y={100} stroke="#0d1e38" strokeDasharray="3 3" />
              <ReferenceLine x="Aug'25" stroke="#ef444422" strokeWidth={1} />
              <ReferenceLine x="Oct'25" stroke="#a855f422" strokeWidth={1} />
              {liveData.some(d => d.live) && (
                <ReferenceLine x="NOW" stroke={store.color} strokeWidth={1}
                  label={{ value:"LIVE", fill:store.color, fontSize:7, position:"top" }} />
              )}
              <Line type="monotone" dataKey={selStore} stroke={store.color} strokeWidth={2.5}
                dot={(props) => {
                  const { cx, cy, payload } = props;
                  if (payload.live) {
                    return <circle key="live-dot" cx={cx} cy={cy} r={6}
                      fill={store.color} stroke="#04080F" strokeWidth={2} />;
                  }
                  return <circle key={payload.m} cx={cx} cy={cy} r={2} fill={store.color} opacity={0.7} />;
                }}
                activeDot={{ r:5 }}
              />
            </LineChart>
          </ResponsiveContainer>

          {/* Outlook */}
          {intel && (
            <div style={{ marginTop:16, background:"rgba(59,130,246,0.04)",
              border:"1px solid #0d1e38", borderLeft:"3px solid #1e4080",
              borderRadius:6, padding:"12px 14px" }}>
              <div style={{ fontSize:7, letterSpacing:3, color:"#1e4080", marginBottom:6 }}>AI OUTLOOK — {intel.date}</div>
              <div style={{ fontSize:9, color:"#94a3b8", lineHeight:1.8, marginBottom:10 }}>{intel.outlook}</div>
              <div style={{ display:"flex", gap:20 }}>
                <div>
                  <div style={{ fontSize:7, color:"#1e4080" }}>RECOVERY SCORE</div>
                  <div style={{ fontSize:18, fontWeight:700, color:"#60a5fa" }}>
                    {intel.recoveryScore}<span style={{ fontSize:8, color:"#334155" }}>/100</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize:7, color:"#1e4080" }}>TOURIST INDEX</div>
                  <div style={{ fontSize:18, fontWeight:700, color:"#a78bfa" }}>
                    {intel.touristIndex}<span style={{ fontSize:8, color:"#334155" }}>/100</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL */}
        <div style={{ padding:"18px 16px", display:"flex", flexDirection:"column", gap:16 }}>

          {/* Alerts */}
          <div>
            <div style={{ fontSize:7, letterSpacing:3, color:"#1e4080", marginBottom:8 }}>LIVE ALERTS</div>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {intel?.alerts?.length ? intel.alerts.map((a, i) => (
                <div key={i} className="wh-flash" style={{
                  background:"rgba(251,191,36,0.04)",
                  border:"1px solid rgba(251,191,36,0.12)",
                  borderLeft:"2px solid #fbbf24",
                  borderRadius:4, padding:"7px 10px",
                  fontSize:9, color:"#fde68a", lineHeight:1.5
                }}>{a}</div>
              )) : (
                <div style={{ fontSize:8, color:"#1e3060", padding:"6px 0" }}>
                  {loading ? "取得中..." : "データ待機中"}
                </div>
              )}
            </div>
          </div>

          {/* Heatbars */}
          <div>
            <div style={{ fontSize:7, letterSpacing:3, color:"#1e4080", marginBottom:8 }}>STORE HEATMAP NOW</div>
            <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
              {[...STORES].sort((a,b) => a.dist - b.dist).map(s => {
                const v = currentRow[s.id] ?? 85;
                return (
                  <div key={s.id} style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:7, color:"#1e4080", minWidth:84, textAlign:"right",
                      whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                      {s.emoji} {s.short}
                    </span>
                    <div style={{ flex:1, background:"#060e1c", borderRadius:2, height:8 }}>
                      <div style={{ width:`${v}%`, background:heatColor(v), height:8, borderRadius:2,
                        transition:"width 1s ease", boxShadow:`0 0 4px ${heatColor(v)}55` }} />
                    </div>
                    <span style={{ fontSize:8, fontWeight:700, color:heatColor(v), minWidth:20 }}>{v}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* History log */}
          <div style={{ flex:1 }}>
            <div style={{ fontSize:7, letterSpacing:3, color:"#1e4080", marginBottom:8 }}>FETCH LOG</div>
            <div style={{ display:"flex", flexDirection:"column", gap:4, maxHeight:240, overflowY:"auto" }}>
              {history.length === 0 ? (
                <div style={{ fontSize:7, color:"#0d1e38" }}>初回フェッチ後に記録開始</div>
              ) : history.map((h, i) => (
                <div key={i} style={{
                  background: i === 0 ? "rgba(59,130,246,0.05)" : "transparent",
                  border:`1px solid ${i === 0 ? "#0d1e38" : "#050c18"}`,
                  borderRadius:4, padding:"5px 8px", fontSize:7,
                  animation: i === 0 ? "wh-fadein 0.4s ease" : "none"
                }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:2 }}>
                    <span style={{ color:"#3b82f6" }}>{h.time}</span>
                    <span style={{ color:heatColor(h.signal), fontWeight:700 }}>IDX:{h.signal}</span>
                    <span style={{ color:h.pressure >= 7 ? "#ef4444" : h.pressure >= 5 ? "#f97316" : "#22c55e" }}>
                      P:{h.pressure}
                    </span>
                  </div>
                  <div style={{ color:"#334155", lineHeight:1.4 }}>{h.event}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Sys info */}
          <div style={{ background:"rgba(255,255,255,0.01)", border:"1px solid #060e1c",
            borderRadius:4, padding:"8px 10px", fontSize:7, color:"#1e4080", lineHeight:1.9 }}>
            INTERVAL: 30 MIN AUTO<br />
            SOURCE: CLAUDE + WEB SEARCH<br />
            STORES: {STORES.length} / WH: 1.5KM RADIUS<br />
            BASELINE: JAN 2025 = 100<br />
            <span style={{ color:"#22c55e" }}>STATUS: OPERATIONAL</span>
          </div>
        </div>
      </div>
    </div>
  );
}


// Mount
const _root = ReactDOM.createRoot(document.getElementById('root'));
_root.render(React.createElement(App));
