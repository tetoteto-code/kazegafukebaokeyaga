// UMD globals
const { useState, useEffect, useRef, useCallback } = React;
const { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } = Recharts;

// -- STORES ----------------------------------------------
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

// -- BASELINE DATA ----------------------------------------
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

// -- KEYWORD SCORING ENGINE -------------------------------
// Analyzes news headlines and scores WH pressure & store impact
const IMPACT_RULES = [
  // Negative signals (reduce scores)
  { pattern: /shutdown|government.clos|government.shut/i,    pressure:+3, delta:-12, label:"政府閉鎖" },
  { pattern: /national.guard|military.dc|troops.dc|federal.troops/i, pressure:+3, delta:-10, label:"軍/警備隊展開" },
  { pattern: /federal.layoff|doge.cut|job.cut.federal|fired.federal/i, pressure:+2, delta:-7,  label:"連邦職員削減" },
  { pattern: /tariff|import.tax|food.cost.rise/i,            pressure:+1, delta:-4,  label:"関税/食材コスト上昇" },
  { pattern: /protest|demonstrat/i,                          pressure:+2, delta:-5,  label:"抗議活動" },
  { pattern: /evacuati|security.alert|lockdown/i,            pressure:+4, delta:-14, label:"セキュリティ警報" },
  { pattern: /tourism.down|visitors.declin/i,                pressure:+1, delta:-4,  label:"観光客減少" },
  { pattern: /restaurant.clos|restaurant.shut/i,             pressure:0,  delta:-5,  label:"飲食店閉鎖増加" },
  // Positive signals (boost scores)
  { pattern: /inaugurat|state.dinner|white.house.event/i,    pressure:-1, delta:+6,  label:"WH公式イベント" },
  { pattern: /anniversary|celebration|250.year|semiquincent/i, pressure:-2, delta:+10, label:"建国250周年関連" },
  { pattern: /tourism.record|visitors.up|tourism.boom/i,     pressure:-1, delta:+5,  label:"観光客増加" },
  { pattern: /restaurant.week|dining.boom|food.festival/i,   pressure:-1, delta:+4,  label:"飲食イベント" },
];

function analyzeHeadlines(items) {
  let pressureDelta = 0;
  let saleDelta = 0;
  const matched = [];

  items.forEach(item => {
    const text = (item.title + ' ' + (item.description || '')).toLowerCase();
    IMPACT_RULES.forEach(rule => {
      if (rule.pattern.test(text)) {
        pressureDelta += rule.pressure;
        saleDelta += rule.delta;
        if (!matched.find(m => m.label === rule.label)) {
          matched.push({ label: rule.label, delta: rule.delta, title: item.title });
        }
      }
    });
  });

  // Base pressure level (mid-2026 baseline ~4)
  const basePressure = 4;
  const pressure = Math.max(1, Math.min(10, basePressure + pressureDelta));

  // Base signal (Jun'26 baseline ~87)
  const baseSignal = 87;
  const signal = Math.max(40, Math.min(100, baseSignal + saleDelta));

  // Per-store adjustments based on type
  const storeAdj = {};
  STORES.forEach(s => {
    let adj = saleDelta * 0.5;
    if (s.id === 'slicepie') adj *= 1.4;   // most sensitive to federal workers
    if (s.id === 'wawa')     adj *= -0.3;  // inverse: stable in crises
    if (s.id === 'chickfila') adj *= 0.8;
    if (s.id === 'shakeshack') adj *= 1.1;
    storeAdj[s.id] = Math.round(adj);
  });

  return { pressure, signal, storeAdj, matched, itemCount: items.length };
}

// -- RSS FETCH via rss2json (no CORS) --------------------
async function fetchNewsAndAnalyze() {
  const queries = [
    'Washington+DC+restaurant+White+House',
    'federal+layoff+DC+2026',
    'White+House+news+today',
  ];

  const allItems = [];
  const API = 'https://api.rss2json.com/v1/api.json?rss_url=';

  for (const q of queries) {
    const rssUrl = encodeURIComponent(`https://news.google.com/rss/search?q=${q}&hl=en-US&gl=US&ceid=US:en`);
    try {
      const res = await fetch(`${API}${rssUrl}&count=5`);
      const data = await res.json();
      if (data.items) allItems.push(...data.items);
    } catch (e) {
      // skip failed query silently
    }
  }

  if (allItems.length === 0) throw new Error('No news items fetched');

  const analysis = analyzeHeadlines(allItems);

  // Top headlines as alerts
  const alerts = allItems
    .slice(0, 4)
    .map(item => item.title.length > 60 ? item.title.slice(0, 57) + '...' : item.title);

  // Most impactful matched rule
  const topEvent = analysis.matched.length > 0
    ? analysis.matched[0].label + ': ' + analysis.matched[0].title.slice(0, 50)
    : allItems[0]?.title?.slice(0, 60) || 'No major events detected';

  const recoveryScore = Math.round((analysis.signal / 100) * 95);
  const touristIndex  = Math.max(40, Math.min(95, 70 + (analysis.signal - 87)));

  return {
    date: new Date().toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' }),
    whPressureLevel: analysis.pressure,
    overallSignal:   analysis.signal,
    storeAdjustments: analysis.storeAdj,
    topEvent,
    alerts,
    outlook: `Analyzed ${analysis.itemCount} live news items. ${
      analysis.matched.length > 0
        ? 'Key factors: ' + analysis.matched.slice(0,2).map(m => m.label).join(', ') + '.'
        : 'No major disruptive events detected in current news cycle.'
    } Recovery from 2025 lows continues at +2-3pt/month pace.`,
    recoveryScore,
    touristIndex,
    source: 'Google News RSS',
  };
}

// -- HELPERS ---------------------------------------------
function heatColor(v) {
  if (v >= 93) return '#22c55e';
  if (v >= 85) return '#86efac';
  if (v >= 77) return '#fde68a';
  if (v >= 68) return '#fdba74';
  if (v >= 60) return '#f97316';
  return '#ef4444';
}

function PulseDot({ color, size }) {
  size = size || 8;
  return React.createElement('span', {
    style: { position:'relative', display:'inline-block', width:size, height:size, flexShrink:0 }
  },
    React.createElement('span', {
      style: { position:'absolute', inset:0, borderRadius:'50%', background:color, opacity:0.5,
        animation:'wh-ping 1.5s cubic-bezier(0,0,0.2,1) infinite' }
    }),
    React.createElement('span', {
      style: { position:'absolute', inset:0, borderRadius:'50%', background:color }
    })
  );
}

function CountdownRing({ secondsLeft, total }) {
  const r = 18, circ = 2 * Math.PI * r;
  const dash = circ * (secondsLeft / total);
  return React.createElement('svg', { width:44, height:44, style:{ transform:'rotate(-90deg)' } },
    React.createElement('circle', { cx:22, cy:22, r, fill:'none', stroke:'#0f2040', strokeWidth:3 }),
    React.createElement('circle', { cx:22, cy:22, r, fill:'none', stroke:'#3b82f6', strokeWidth:3,
      strokeDasharray:`${dash} ${circ}`, style:{ transition:'stroke-dasharray 1s linear' } }),
    React.createElement('text', { x:22, y:26, textAnchor:'middle',
      style:{ fill:'#64748b', fontSize:9, fontFamily:'monospace',
        transform:'rotate(90deg)', transformOrigin:'22px 22px' } },
      Math.ceil(secondsLeft / 60) + 'm'
    )
  );
}

// -- CUSTOM TOOLTIP ---------------------------------------
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return React.createElement('div', {
    style: { background:'rgba(4,8,15,0.97)', border:'1px solid #1e3a5f', borderRadius:6,
      padding:'10px 14px', fontSize:10, fontFamily:"'Courier New',monospace", color:'#e2e8f0' }
  },
    React.createElement('div', { style:{ color:'#475569', marginBottom:6 } }, label),
    ...payload.map((p, i) =>
      React.createElement('div', { key:i,
        style:{ display:'flex', justifyContent:'space-between', gap:12, marginBottom:3 } },
        React.createElement('span', { style:{ color:p.color } }, p.name),
        React.createElement('span', { style:{ fontWeight:700, color:heatColor(p.value) } }, p.value)
      )
    )
  );
}

// -- MAIN APP ---------------------------------------------
const INTERVAL_SEC = 30 * 60;

function App() {
  const [intel, setIntel]         = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [countdown, setCountdown] = useState(INTERVAL_SEC);
  const [history, setHistory]     = useState([]);
  const [liveData, setLiveData]   = useState(BASELINE);
  const [selStore, setSelStore]   = useState('slicepie');
  const [flash, setFlash]         = useState(false);
  const timerRef = useRef(null);
  const cdRef    = useRef(null);

  const doFetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchNewsAndAnalyze();
      setIntel(result);
      setLastUpdate(new Date());
      setCountdown(INTERVAL_SEC);
      setFlash(true);
      setTimeout(() => setFlash(false), 1500);

      const latest = { ...BASELINE[BASELINE.length - 1], m:'NOW', live:true };
      const adj = result.storeAdjustments || {};
      STORES.forEach(s => {
        if (adj[s.id] != null) {
          latest[s.id] = Math.max(30, Math.min(105, latest[s.id] + adj[s.id]));
        }
      });
      setLiveData([...BASELINE, latest]);
      setHistory(prev => [{
        time: new Date().toLocaleTimeString('ja-JP', { hour:'2-digit', minute:'2-digit' }),
        signal: result.overallSignal,
        pressure: result.whPressureLevel,
        event: result.topEvent.slice(0, 55),
        source: result.source,
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
    cdRef.current = setInterval(() =>
      setCountdown(c => c > 0 ? c - 1 : INTERVAL_SEC), 1000);
    return () => clearInterval(cdRef.current);
  }, []);

  const store    = STORES.find(s => s.id === selStore);
  const curRow   = liveData[liveData.length - 1];
  const signal   = intel ? intel.overallSignal   : 87;
  const pressure = intel ? intel.whPressureLevel : 4;
  const pColor   = pressure >= 8 ? '#ef4444' : pressure >= 6 ? '#f97316' : pressure >= 4 ? '#facc15' : '#22c55e';

  return React.createElement('div', {
    style: { background:'#04080F', minHeight:'100vh', color:'#e2e8f0',
      fontFamily:"'Courier New',monospace" }
  },
    // CSS keyframes via style tag
    React.createElement('style', {}, `
      @keyframes wh-ping { 0%{transform:scale(1);opacity:.7} 75%,100%{transform:scale(2.2);opacity:0} }
      @keyframes wh-blink { 0%,49%{opacity:1} 50%,100%{opacity:0} }
      @keyframes wh-fadein { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }
    `),

    // -- HEADER
    React.createElement('div', {
      style: { background:'linear-gradient(180deg,#06101e,#040810)',
        borderBottom:'1px solid #0d1e38', padding:'12px 20px',
        display:'flex', alignItems:'center', justifyContent:'space-between',
        flexWrap:'wrap', gap:10, position:'relative', overflow:'hidden' }
    },
      React.createElement('div', {
        style: { position:'absolute', inset:0, opacity:0.025,
          backgroundImage:'linear-gradient(#3b82f6 1px,transparent 1px),linear-gradient(90deg,#3b82f6 1px,transparent 1px)',
          backgroundSize:'24px 24px', pointerEvents:'none' }
      }),
      // Left: logo
      React.createElement('div', { style:{ display:'flex', alignItems:'center', gap:14, position:'relative' } },
        React.createElement(PulseDot, { color: loading ? '#facc15' : '#22c55e', size:10 }),
        React.createElement('div', {},
          React.createElement('div', { style:{ fontSize:7, letterSpacing:4, color:'#1e4080' } }, 'LIVE NEWS INTELLIGENCE FEED'),
          React.createElement('div', { style:{ fontSize:15, fontWeight:700, color:'#60a5fa', letterSpacing:1 } },
            'WH FOOD CORRIDOR MONITOR')
        )
      ),
      // Right: gauges
      React.createElement('div', { style:{ display:'flex', alignItems:'center', gap:18, flexWrap:'wrap', position:'relative' } },
        React.createElement('div', { style:{ textAlign:'center' } },
          React.createElement('div', { style:{ fontSize:7, color:'#1e4080', letterSpacing:2 } }, 'WH PRESSURE'),
          React.createElement('div', { style:{ fontSize:24, fontWeight:800, color:pColor, lineHeight:1 } },
            pressure, React.createElement('span', { style:{ fontSize:9, color:'#334155' } }, '/10')
          )
        ),
        React.createElement('div', { style:{ textAlign:'center' } },
          React.createElement('div', { style:{ fontSize:7, color:'#1e4080', letterSpacing:2 } }, 'SIGNAL'),
          React.createElement('div', { style:{ fontSize:24, fontWeight:800, color:heatColor(signal), lineHeight:1 } }, signal)
        ),
        React.createElement(CountdownRing, { secondsLeft:countdown, total:INTERVAL_SEC }),
        React.createElement('button', {
          onClick: doFetch, disabled: loading,
          style: { background: loading ? '#0a1628' : 'rgba(59,130,246,0.12)',
            border:'1px solid #1e3a5f', borderRadius:5, padding:'7px 14px',
            color: loading ? '#334155' : '#60a5fa',
            fontSize:8, cursor: loading ? 'not-allowed' : 'pointer',
            letterSpacing:2, fontFamily:"'Courier New',monospace" }
        }, loading ? 'FETCHING...' : 'REFRESH NOW')
      )
    ),

    // -- STATUS BAR
    React.createElement('div', {
      style: { background:'#050c18', borderBottom:'1px solid #081428',
        padding:'5px 20px', display:'flex', alignItems:'center', gap:12,
        fontSize:8, flexWrap:'wrap', color:'#334155' }
    },
      React.createElement('span', { style:{ color:'#22c55e' } }, '● LIVE'),
      React.createElement('span', {}, '|'),
      React.createElement('span', {}, 'LAST: ' + (lastUpdate ? lastUpdate.toLocaleTimeString('ja-JP') : '--:--:--')),
      React.createElement('span', {}, '|'),
      React.createElement('span', { style:{ color:intel ? '#60a5fa' : '#334155' } },
        'SOURCE: ' + (intel?.source || 'WAITING')),
      React.createElement('span', {}, '|'),
      React.createElement('span', {}, 'AUTO-REFRESH: 30 MIN'),
      intel?.topEvent ? React.createElement(React.Fragment, {},
        React.createElement('span', {}, '|'),
        React.createElement('span', { style:{ color:'#fbbf24', animation:'wh-blink 2s step-end infinite' } }, '⚡'),
        React.createElement('span', { style:{ color:'#fbbf24' } }, intel.topEvent.slice(0,70))
      ) : null
    ),

    // -- ERROR BAR
    error ? React.createElement('div', {
      style: { background:'rgba(239,68,68,0.08)', borderBottom:'1px solid rgba(239,68,68,0.2)',
        padding:'6px 20px', fontSize:8, color:'#fca5a5' }
    }, 'FETCH ERROR: ' + error + '  —  ベースラインデータで継続表示') : null,

    // -- MAIN GRID
    React.createElement('div', {
      style: { display:'grid', gridTemplateColumns:'1fr 300px', minHeight:'calc(100vh - 90px)' }
    },

      // LEFT PANEL
      React.createElement('div', { style:{ padding:'18px 20px', borderRight:'1px solid #080f1e' } },

        React.createElement('div', { style:{ fontSize:7, letterSpacing:3, color:'#1e4080', marginBottom:10 } },
          'LIVE STORE INDEX — WH PROXIMITY ORDER'),

        // Store cards grid
        React.createElement('div', {
          style: { display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(145px,1fr))', gap:8, marginBottom:20 }
        },
          ...[...STORES].sort((a,b) => a.dist - b.dist).map(s => {
            const v     = curRow[s.id] ?? 85;
            const base  = BASELINE[BASELINE.length - 1][s.id];
            const delta = v - base;
            const isSel = selStore === s.id;
            return React.createElement('button', {
              key: s.id,
              onClick: () => setSelStore(s.id),
              style: {
                background: isSel ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.015)',
                border: `1px solid ${isSel ? '#1e3a5f' : '#080f1e'}`,
                borderTop: `2px solid ${isSel ? s.color : heatColor(v)}`,
                borderRadius:6, padding:'9px 11px', cursor:'pointer', textAlign:'left',
                transition:'all 0.2s',
                animation: flash ? 'wh-fadein 0.5s ease' : 'none'
              }
            },
              React.createElement('div', { style:{ display:'flex', justifyContent:'space-between', marginBottom:4 } },
                React.createElement('span', { style:{ fontSize:8, color:s.color, fontWeight:700 } }, s.emoji + ' ' + s.short),
                React.createElement('span', { style:{ fontSize:7, color:'#1e4080' } }, s.dist + 'm')
              ),
              React.createElement('div', { style:{ display:'flex', alignItems:'baseline', gap:6 } },
                React.createElement('span', { style:{ fontSize:20, fontWeight:800, color:heatColor(v) } }, v),
                React.createElement('span', {
                  style: { fontSize:9, fontWeight:600,
                    color: delta > 0 ? '#22c55e' : delta < 0 ? '#ef4444' : '#334155' }
                }, delta > 0 ? '+' + delta : delta < 0 ? String(delta) : '-')
              ),
              React.createElement('div', { style:{ marginTop:4, background:'#060e1c', borderRadius:2, height:3 } },
                React.createElement('div', {
                  style: { width: v + '%', background:heatColor(v), height:3, borderRadius:2,
                    transition:'width 0.8s ease' }
                })
              )
            );
          })
        ),

        // Chart label
        React.createElement('div', { style:{ fontSize:7, letterSpacing:3, color:'#1e4080', marginBottom:8 } },
          store.emoji + ' ' + store.short.toUpperCase() + ' — 18M TREND + LIVE'),

        // Line chart
        React.createElement(ResponsiveContainer, { width:'100%', height:200 },
          React.createElement(LineChart, { data:liveData, margin:{ top:5, right:10, left:-10, bottom:0 } },
            React.createElement(CartesianGrid, { strokeDasharray:'2 4', stroke:'#080f1e' }),
            React.createElement(XAxis, { dataKey:'m', tick:{ fill:'#1e4080', fontSize:7 },
              axisLine:{ stroke:'#080f1e' }, interval:'preserveStartEnd' }),
            React.createElement(YAxis, { domain:[40,105], tick:{ fill:'#1e4080', fontSize:8 },
              axisLine:{ stroke:'#080f1e' } }),
            React.createElement(Tooltip, { content: CustomTooltip }),
            React.createElement(ReferenceLine, { y:100, stroke:'#0d1e38', strokeDasharray:'3 3' }),
            React.createElement(ReferenceLine, { x:"Aug'25", stroke:'#ef444422', strokeWidth:1 }),
            React.createElement(ReferenceLine, { x:"Oct'25", stroke:'#a855f422', strokeWidth:1 }),
            liveData.some(d => d.live) ? React.createElement(ReferenceLine, {
              x:'NOW', stroke:store.color, strokeWidth:1,
              label:{ value:'LIVE', fill:store.color, fontSize:7, position:'top' }
            }) : null,
            React.createElement(Line, {
              type:'monotone', dataKey:selStore, stroke:store.color, strokeWidth:2.5,
              dot: (props) => {
                const { cx, cy, payload } = props;
                if (payload.live) {
                  return React.createElement('circle', { key:'live', cx, cy, r:6,
                    fill:store.color, stroke:'#04080F', strokeWidth:2 });
                }
                return React.createElement('circle', { key:payload.m, cx, cy, r:2,
                  fill:store.color, opacity:0.7 });
              },
              activeDot:{ r:5 }
            })
          )
        ),

        // Outlook box
        intel ? React.createElement('div', {
          style: { marginTop:16, background:'rgba(59,130,246,0.04)',
            border:'1px solid #0d1e38', borderLeft:'3px solid #1e4080',
            borderRadius:6, padding:'12px 14px' }
        },
          React.createElement('div', { style:{ fontSize:7, letterSpacing:3, color:'#1e4080', marginBottom:6 } },
            'AI ANALYSIS — ' + intel.date),
          React.createElement('div', { style:{ fontSize:9, color:'#94a3b8', lineHeight:1.8, marginBottom:10 } },
            intel.outlook),
          React.createElement('div', { style:{ display:'flex', gap:20 } },
            React.createElement('div', {},
              React.createElement('div', { style:{ fontSize:7, color:'#1e4080' } }, 'RECOVERY SCORE'),
              React.createElement('div', { style:{ fontSize:18, fontWeight:700, color:'#60a5fa' } },
                intel.recoveryScore,
                React.createElement('span', { style:{ fontSize:8, color:'#334155' } }, '/100'))
            ),
            React.createElement('div', {},
              React.createElement('div', { style:{ fontSize:7, color:'#1e4080' } }, 'TOURIST INDEX'),
              React.createElement('div', { style:{ fontSize:18, fontWeight:700, color:'#a78bfa' } },
                intel.touristIndex,
                React.createElement('span', { style:{ fontSize:8, color:'#334155' } }, '/100'))
            )
          )
        ) : null
      ),

      // RIGHT PANEL
      React.createElement('div', {
        style: { padding:'18px 16px', display:'flex', flexDirection:'column', gap:16 }
      },

        // Alerts
        React.createElement('div', {},
          React.createElement('div', { style:{ fontSize:7, letterSpacing:3, color:'#1e4080', marginBottom:8 } },
            'LIVE NEWS ALERTS'),
          React.createElement('div', { style:{ display:'flex', flexDirection:'column', gap:6 } },
            ...(intel?.alerts?.length ? intel.alerts.map((a, i) =>
              React.createElement('div', { key:i,
                style: { background:'rgba(251,191,36,0.04)',
                  border:'1px solid rgba(251,191,36,0.12)',
                  borderLeft:'2px solid #fbbf24', borderRadius:4,
                  padding:'6px 10px', fontSize:8, color:'#fde68a', lineHeight:1.5,
                  animation:'wh-fadein 0.4s ease' } }, a)
            ) : [React.createElement('div', { key:'wait',
              style:{ fontSize:8, color:'#1e3060', padding:'4px 0' } },
              loading ? 'ニュース取得中...' : '初回フェッチ待機中')])
          )
        ),

        // Heatbars
        React.createElement('div', {},
          React.createElement('div', { style:{ fontSize:7, letterSpacing:3, color:'#1e4080', marginBottom:8 } },
            'STORE HEATMAP NOW'),
          React.createElement('div', { style:{ display:'flex', flexDirection:'column', gap:5 } },
            ...[...STORES].sort((a,b) => a.dist - b.dist).map(s => {
              const v = curRow[s.id] ?? 85;
              return React.createElement('div', { key:s.id,
                style:{ display:'flex', alignItems:'center', gap:8 } },
                React.createElement('span', {
                  style:{ fontSize:7, color:'#1e4080', minWidth:84, textAlign:'right',
                    whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }
                }, s.emoji + ' ' + s.short),
                React.createElement('div', { style:{ flex:1, background:'#060e1c', borderRadius:2, height:8 } },
                  React.createElement('div', {
                    style: { width: v + '%', background:heatColor(v), height:8, borderRadius:2,
                      transition:'width 1s ease', boxShadow:`0 0 4px ${heatColor(v)}55` }
                  })
                ),
                React.createElement('span', {
                  style:{ fontSize:8, fontWeight:700, color:heatColor(v), minWidth:20 }
                }, v)
              );
            })
          )
        ),

        // History log
        React.createElement('div', { style:{ flex:1 } },
          React.createElement('div', { style:{ fontSize:7, letterSpacing:3, color:'#1e4080', marginBottom:8 } },
            'FETCH LOG'),
          React.createElement('div', {
            style: { display:'flex', flexDirection:'column', gap:4,
              maxHeight:220, overflowY:'auto' }
          },
            ...(history.length === 0
              ? [React.createElement('div', { key:'empty',
                  style:{ fontSize:7, color:'#0d1e38' } }, '初回フェッチ後に記録開始')]
              : history.map((h, i) =>
                  React.createElement('div', { key:i,
                    style: { background: i === 0 ? 'rgba(59,130,246,0.05)' : 'transparent',
                      border: `1px solid ${i === 0 ? '#0d1e38' : '#050c18'}`,
                      borderRadius:4, padding:'5px 8px', fontSize:7,
                      animation: i === 0 ? 'wh-fadein 0.4s ease' : 'none' } },
                    React.createElement('div', {
                      style:{ display:'flex', justifyContent:'space-between', marginBottom:2 } },
                      React.createElement('span', { style:{ color:'#3b82f6' } }, h.time),
                      React.createElement('span', { style:{ color:heatColor(h.signal), fontWeight:700 } },
                        'IDX:' + h.signal),
                      React.createElement('span', {
                        style:{ color: h.pressure >= 7 ? '#ef4444' : h.pressure >= 5 ? '#f97316' : '#22c55e' }
                      }, 'P:' + h.pressure)
                    ),
                    React.createElement('div', { style:{ color:'#334155', lineHeight:1.4 } }, h.event)
                  )
                )
            )
          )
        ),

        // System info
        React.createElement('div', {
          style: { background:'rgba(255,255,255,0.01)', border:'1px solid #060e1c',
            borderRadius:4, padding:'8px 10px', fontSize:7, color:'#1e4080', lineHeight:1.9 }
        },
          'INTERVAL: 30 MIN AUTO', React.createElement('br'),
          'SOURCE: GOOGLE NEWS RSS', React.createElement('br'),
          'STORES: ' + STORES.length + ' / WH: 1.5KM RADIUS', React.createElement('br'),
          'BASELINE: JAN 2025 = 100', React.createElement('br'),
          'ENGINE: KEYWORD SCORING', React.createElement('br'),
          React.createElement('span', { style:{ color:'#22c55e' } }, 'STATUS: OPERATIONAL')
        )
      )
    )
  );
}

// Mount
const _root = ReactDOM.createRoot(document.getElementById('root'));
_root.render(React.createElement(App));
