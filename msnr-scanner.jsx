import { useState, useCallback, useEffect } from "react";

const SYSTEM_PROMPT = `You are an institutional Malaysian SNR trader. Analyze the given market using ONLY the Malaysian SNR system.

CORE RULES:
- ONLY use OPEN and CLOSE for SNR levels — IGNORE wicks
- Resistance: Bullish candle CLOSE → next bearish OPEN
- Support: Bearish candle CLOSE → next bullish OPEN
- Fresh SNR = not broken by candle body → STRONG
- Unfresh SNR = touched/broken → WEAK
- Only trade fresh SNR

SNR TYPES: Classic A (Resistance), Classic V (Support), RBS (Resistance Becomes Support), SBR (Support Becomes Resistance), Gap SNR

STORYLINE SYSTEM:
- MRM = Monthly Rejects Monthly, WRW = Weekly Rejects Weekly, DRD = Daily Rejects Daily
- HTF rejection MUST lead to LTF breakout for confirmation

ENTRY MODELS:
- Model 1: Rejection Entry (touch + rejection + breakout)
- Model 2: MISS Entry (no touch + breakout — STRONGER)
- Model 3: Trendline Entry (3rd touch + SNR confluence)

TRENDLINE TYPES: Continuation TL, Breakout Type 1 (1 tap before, 2 after), Breakout Type 2 (2 taps before, 1 after), 411 TL (R-S-R or S-R-S), HNS/Quasimodo

You MUST respond ONLY in valid JSON. No markdown, no code blocks, no extra text. Return this exact structure:
{
  "symbol": "string",
  "currentPrice": "string",
  "marketDirection": "Bullish" | "Bearish" | "Neutral",
  "htfSNR": [
    { "level": "string", "type": "Classic A|Classic V|RBS|SBR|Gap SNR", "freshness": "Fresh" | "Unfresh", "timeframe": "Monthly|Weekly|Daily", "significance": "string" }
  ],
  "storyline": { "pattern": "string", "status": "Running|Completed|Forming", "description": "string" },
  "trendlineContext": { "type": "string", "description": "string" },
  "breakoutConfirmation": { "confirmed": true | false, "description": "string" },
  "roadblocks": ["string"],
  "entryModel": "Model 1: Rejection Entry" | "Model 2: MISS Entry" | "Model 3: Trendline Entry" | "No Valid Setup",
  "entryType": "Rejection" | "MISS" | "Trendline" | "N/A",
  "entryPrice": "string",
  "stopLoss": "string",
  "takeProfit": "string",
  "riskReward": "string",
  "tradeStrength": "Weak" | "Normal" | "Strong",
  "tradeValidity": "Valid" | "Invalid" | "Wait for Confirmation",
  "keyLevels": { "majorSupport": "string", "majorResistance": "string", "pivot": "string" },
  "institutionalNote": "string"
}`;

const SYMBOLS = ["XAUUSD", "EURUSD", "GBPUSD", "USDJPY", "BTCUSD", "NASDAQ", "US30", "USOIL"];

const directionColor = (d) =>
  d === "Bullish" ? "#00e5a0" : d === "Bearish" ? "#ff4d6d" : "#f5c518";

const strengthColor = (s) =>
  s === "Strong" ? "#00e5a0" : s === "Normal" ? "#f5c518" : "#ff4d6d";

const validityColor = (v) =>
  v === "Valid" ? "#00e5a0" : v === "Wait for Confirmation" ? "#f5c518" : "#ff4d6d";

function PulsingDot({ color }) {
  return (
    <span style={{ position: "relative", display: "inline-block", width: 10, height: 10 }}>
      <span style={{
        position: "absolute", inset: 0, borderRadius: "50%",
        background: color, opacity: 0.4,
        animation: "ping 1.4s ease-in-out infinite"
      }} />
      <span style={{
        position: "absolute", inset: 1, borderRadius: "50%",
        background: color
      }} />
    </span>
  );
}

function SNRBadge({ type }) {
  const colors = {
    "Classic A": { bg: "#ff4d6d22", border: "#ff4d6d", text: "#ff4d6d" },
    "Classic V": { bg: "#00e5a022", border: "#00e5a0", text: "#00e5a0" },
    "RBS": { bg: "#a78bfa22", border: "#a78bfa", text: "#a78bfa" },
    "SBR": { bg: "#f5c51822", border: "#f5c518", text: "#f5c518" },
    "Gap SNR": { bg: "#60a5fa22", border: "#60a5fa", text: "#60a5fa" },
  };
  const c = colors[type] || colors["Gap SNR"];
  return (
    <span style={{
      padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700,
      fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 1,
      background: c.bg, border: `1px solid ${c.border}`, color: c.text
    }}>{type}</span>
  );
}

function AnalysisCard({ data, symbol }) {
  if (!data) return null;
  const dc = directionColor(data.marketDirection);
  return (
    <div style={{
      background: "linear-gradient(135deg, #0d1117 0%, #161b22 100%)",
      border: "1px solid #30363d",
      borderRadius: 16, padding: 28, marginTop: 20,
      boxShadow: `0 0 40px ${dc}18`,
      fontFamily: "'IBM Plex Mono', monospace",
      animation: "fadeSlideIn 0.5s ease"
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 26, fontWeight: 800, color: "#e6edf3", letterSpacing: 2 }}>{data.symbol || symbol}</span>
            <PulsingDot color={dc} />
            <span style={{
              padding: "4px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700,
              background: `${dc}22`, border: `1px solid ${dc}`, color: dc
            }}>{data.marketDirection}</span>
          </div>
          <div style={{ color: "#8b949e", fontSize: 12, marginTop: 4 }}>Current Price: <span style={{ color: "#e6edf3", fontWeight: 700 }}>{data.currentPrice}</span></div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: "#8b949e", marginBottom: 4 }}>TRADE VALIDITY</div>
          <div style={{
            padding: "6px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700,
            background: `${validityColor(data.tradeValidity)}22`,
            border: `1px solid ${validityColor(data.tradeValidity)}`,
            color: validityColor(data.tradeValidity)
          }}>{data.tradeValidity}</div>
        </div>
      </div>

      {/* Key Metrics Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "ENTRY", val: data.entryPrice, color: "#60a5fa" },
          { label: "STOP LOSS", val: data.stopLoss, color: "#ff4d6d" },
          { label: "TAKE PROFIT", val: data.takeProfit, color: "#00e5a0" },
          { label: "RISK:REWARD", val: data.riskReward, color: "#f5c518" },
        ].map(m => (
          <div key={m.label} style={{
            background: "#21262d", borderRadius: 10, padding: "12px 16px",
            border: `1px solid ${m.color}44`
          }}>
            <div style={{ fontSize: 9, color: "#8b949e", letterSpacing: 2, marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: m.color }}>{m.val}</div>
          </div>
        ))}
      </div>

      {/* Storyline + Entry */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
        <div style={{ background: "#21262d", borderRadius: 10, padding: 16, border: "1px solid #30363d" }}>
          <div style={{ fontSize: 9, color: "#8b949e", letterSpacing: 2, marginBottom: 8 }}>STORYLINE</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#a78bfa" }}>{data.storyline?.pattern}</div>
          <div style={{ fontSize: 11, color: "#8b949e", marginTop: 4 }}>Status: <span style={{ color: "#e6edf3" }}>{data.storyline?.status}</span></div>
          <div style={{ fontSize: 11, color: "#8b949e", marginTop: 6, lineHeight: 1.5 }}>{data.storyline?.description}</div>
        </div>
        <div style={{ background: "#21262d", borderRadius: 10, padding: 16, border: "1px solid #30363d" }}>
          <div style={{ fontSize: 9, color: "#8b949e", letterSpacing: 2, marginBottom: 8 }}>ENTRY MODEL</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#60a5fa" }}>{data.entryModel}</div>
          <div style={{ fontSize: 11, color: "#8b949e", marginTop: 4 }}>Type: <span style={{ color: "#e6edf3" }}>{data.entryType}</span></div>
          <div style={{ marginTop: 8 }}>
            <span style={{ fontSize: 9, color: "#8b949e", letterSpacing: 2 }}>STRENGTH: </span>
            <span style={{
              fontSize: 12, fontWeight: 700,
              color: strengthColor(data.tradeStrength)
            }}>● {data.tradeStrength}</span>
          </div>
        </div>
      </div>

      {/* HTF SNR Levels */}
      {data.htfSNR?.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 9, color: "#8b949e", letterSpacing: 2, marginBottom: 10 }}>HTF SNR LEVELS</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.htfSNR.map((s, i) => (
              <div key={i} style={{
                background: "#21262d", borderRadius: 8, padding: "10px 14px",
                border: "1px solid #30363d",
                display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <SNRBadge type={s.type} />
                  <span style={{ fontSize: 13, color: "#e6edf3", fontWeight: 600 }}>{s.level}</span>
                  <span style={{ fontSize: 10, color: "#8b949e" }}>[{s.timeframe}]</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700,
                    color: s.freshness === "Fresh" ? "#00e5a0" : "#ff4d6d"
                  }}>◆ {s.freshness}</span>
                  <span style={{ fontSize: 10, color: "#8b949e" }}>{s.significance}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Breakout + Trendline */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
        <div style={{ background: "#21262d", borderRadius: 10, padding: 16, border: "1px solid #30363d" }}>
          <div style={{ fontSize: 9, color: "#8b949e", letterSpacing: 2, marginBottom: 6 }}>BREAKOUT</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{
              fontSize: 11, fontWeight: 700,
              color: data.breakoutConfirmation?.confirmed ? "#00e5a0" : "#ff4d6d"
            }}>
              {data.breakoutConfirmation?.confirmed ? "✓ CONFIRMED" : "✗ NOT CONFIRMED"}
            </span>
          </div>
          <div style={{ fontSize: 11, color: "#8b949e", lineHeight: 1.5 }}>{data.breakoutConfirmation?.description}</div>
        </div>
        <div style={{ background: "#21262d", borderRadius: 10, padding: 16, border: "1px solid #30363d" }}>
          <div style={{ fontSize: 9, color: "#8b949e", letterSpacing: 2, marginBottom: 6 }}>TRENDLINE</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#f5c518", marginBottom: 4 }}>{data.trendlineContext?.type}</div>
          <div style={{ fontSize: 11, color: "#8b949e", lineHeight: 1.5 }}>{data.trendlineContext?.description}</div>
        </div>
      </div>

      {/* Roadblocks */}
      {data.roadblocks?.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 9, color: "#8b949e", letterSpacing: 2, marginBottom: 8 }}>ROADBLOCKS</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {data.roadblocks.map((r, i) => (
              <span key={i} style={{
                fontSize: 11, padding: "4px 10px", borderRadius: 6,
                background: "#ff4d6d18", border: "1px solid #ff4d6d44", color: "#ff9eb0"
              }}>⚠ {r}</span>
            ))}
          </div>
        </div>
      )}

      {/* Key Levels */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 20 }}>
        {[
          { label: "MAJOR SUPPORT", val: data.keyLevels?.majorSupport, color: "#00e5a0" },
          { label: "PIVOT", val: data.keyLevels?.pivot, color: "#f5c518" },
          { label: "MAJOR RESISTANCE", val: data.keyLevels?.majorResistance, color: "#ff4d6d" },
        ].map(k => (
          <div key={k.label} style={{
            background: "#21262d", borderRadius: 8, padding: "10px 12px",
            border: `1px solid ${k.color}33`, textAlign: "center"
          }}>
            <div style={{ fontSize: 9, color: "#8b949e", letterSpacing: 1, marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: k.color }}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* Institutional Note */}
      {data.institutionalNote && (
        <div style={{
          background: "#a78bfa11", border: "1px solid #a78bfa33",
          borderRadius: 10, padding: "12px 16px"
        }}>
          <div style={{ fontSize: 9, color: "#a78bfa", letterSpacing: 2, marginBottom: 6 }}>INSTITUTIONAL NOTE</div>
          <div style={{ fontSize: 12, color: "#c9d1d9", lineHeight: 1.7 }}>{data.institutionalNote}</div>
        </div>
      )}
    </div>
  );
}

export default function MSNRScanner() {
  const [selectedSymbol, setSelectedSymbol] = useState("XAUUSD");
  const [customSymbol, setCustomSymbol] = useState("");
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [scanHistory, setScanHistory] = useState([]);
  const [streamText, setStreamText] = useState("");

  const runAnalysis = useCallback(async (sym) => {
    const symbol = sym || selectedSymbol;
    setLoading(true);
    setError(null);
    setAnalysisData(null);
    setStreamText("");

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: [{
            role: "user",
            content: `Analyze ${symbol} using the Malaysian SNR Institutional system. Use current known price levels and structure for ${symbol}. Return ONLY valid JSON, no other text.`
          }]
        })
      });

      const data = await response.json();
      const raw = data.content?.[0]?.text || "";

      let clean = raw.trim();
      // Strip markdown code fences if present
      clean = clean.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();

      const parsed = JSON.parse(clean);
      setAnalysisData(parsed);
      setScanHistory(prev => [{
        symbol,
        direction: parsed.marketDirection,
        validity: parsed.tradeValidity,
        strength: parsed.tradeStrength,
        time: new Date().toLocaleTimeString(),
        entry: parsed.entryPrice
      }, ...prev.slice(0, 9)]);
    } catch (e) {
      setError("Analysis failed. Please retry.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedSymbol]);

  // Auto-run XAUUSD on mount
  useEffect(() => {
    runAnalysis("XAUUSD");
  }, []);

  const handleScan = () => {
    const sym = customSymbol.trim().toUpperCase() || selectedSymbol;
    runAnalysis(sym);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0d1117",
      padding: "24px 20px",
      fontFamily: "'IBM Plex Mono', monospace",
      color: "#e6edf3"
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&display=swap');
        @keyframes ping {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #161b22; }
        ::-webkit-scrollbar-thumb { background: #30363d; border-radius: 2px; }
      `}</style>

      {/* Header */}
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ marginBottom: 28, animation: "fadeSlideIn 0.4s ease" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: "linear-gradient(135deg, #f5c518, #ff8c00)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18
            }}>◈</div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: 3, color: "#e6edf3" }}>MSNR SCANNER</div>
              <div style={{ fontSize: 9, color: "#8b949e", letterSpacing: 3 }}>MALAYSIAN SNR INSTITUTIONAL PRO</div>
            </div>
          </div>
        </div>

        {/* Scanner Controls */}
        <div style={{
          background: "#161b22", border: "1px solid #30363d",
          borderRadius: 14, padding: 20, marginBottom: 8,
          animation: "fadeSlideIn 0.5s ease 0.1s both"
        }}>
          <div style={{ fontSize: 9, color: "#8b949e", letterSpacing: 2, marginBottom: 12 }}>SELECT MARKET</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {SYMBOLS.map(s => (
              <button key={s} onClick={() => { setSelectedSymbol(s); setCustomSymbol(""); }}
                style={{
                  padding: "6px 14px", borderRadius: 7, fontSize: 11, fontWeight: 700,
                  fontFamily: "'IBM Plex Mono', monospace", cursor: "pointer",
                  transition: "all 0.15s",
                  background: selectedSymbol === s && !customSymbol ? "#f5c51822" : "#21262d",
                  border: selectedSymbol === s && !customSymbol ? "1px solid #f5c518" : "1px solid #30363d",
                  color: selectedSymbol === s && !customSymbol ? "#f5c518" : "#8b949e"
                }}>{s}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <input
              value={customSymbol}
              onChange={e => setCustomSymbol(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === "Enter" && handleScan()}
              placeholder="Custom symbol… (e.g. GBPJPY)"
              style={{
                flex: 1, background: "#21262d", border: "1px solid #30363d",
                borderRadius: 8, padding: "10px 14px", fontSize: 12,
                color: "#e6edf3", fontFamily: "'IBM Plex Mono', monospace",
                outline: "none"
              }}
            />
            <button onClick={handleScan} disabled={loading}
              style={{
                padding: "10px 24px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                fontFamily: "'IBM Plex Mono', monospace", cursor: loading ? "not-allowed" : "pointer",
                background: loading ? "#21262d" : "linear-gradient(135deg, #f5c518, #ff8c00)",
                border: "none", color: loading ? "#8b949e" : "#0d1117",
                transition: "all 0.2s", whiteSpace: "nowrap"
              }}>
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{
                    width: 12, height: 12, border: "2px solid #8b949e",
                    borderTopColor: "transparent", borderRadius: "50%",
                    display: "inline-block",
                    animation: "spin 0.8s linear infinite"
                  }} />
                  SCANNING…
                </span>
              ) : "▶ SCAN"}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: "#ff4d6d18", border: "1px solid #ff4d6d44",
            borderRadius: 10, padding: "12px 16px", marginTop: 12,
            color: "#ff9eb0", fontSize: 12
          }}>⚠ {error}</div>
        )}

        {/* Loading State */}
        {loading && (
          <div style={{
            background: "#161b22", border: "1px solid #30363d",
            borderRadius: 14, padding: 40, marginTop: 20, textAlign: "center",
            animation: "fadeSlideIn 0.3s ease"
          }}>
            <div style={{
              width: 40, height: 40, border: "3px solid #30363d",
              borderTopColor: "#f5c518", borderRadius: "50%",
              margin: "0 auto 16px",
              animation: "spin 0.9s linear infinite"
            }} />
            <div style={{ fontSize: 13, color: "#8b949e", letterSpacing: 2 }}>ANALYZING {customSymbol || selectedSymbol}…</div>
            <div style={{ fontSize: 10, color: "#484f58", marginTop: 6 }}>Applying Malaysian SNR Institutional system</div>
          </div>
        )}

        {/* Analysis Result */}
        {!loading && analysisData && (
          <AnalysisCard data={analysisData} symbol={customSymbol || selectedSymbol} />
        )}

        {/* Scan History */}
        {scanHistory.length > 0 && (
          <div style={{
            background: "#161b22", border: "1px solid #30363d",
            borderRadius: 14, padding: 20, marginTop: 20,
            animation: "fadeSlideIn 0.4s ease"
          }}>
            <div style={{ fontSize: 9, color: "#8b949e", letterSpacing: 2, marginBottom: 12 }}>SCAN HISTORY</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {scanHistory.map((h, i) => (
                <div key={i} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  background: "#21262d", borderRadius: 7, padding: "8px 12px",
                  fontSize: 11, flexWrap: "wrap", gap: 6
                }}>
                  <span style={{ color: "#e6edf3", fontWeight: 700, minWidth: 80 }}>{h.symbol}</span>
                  <span style={{ color: directionColor(h.direction) }}>● {h.direction}</span>
                  <span style={{ color: strengthColor(h.strength) }}>{h.strength}</span>
                  <span style={{ color: validityColor(h.validity) }}>{h.validity}</span>
                  <span style={{ color: "#60a5fa" }}>@ {h.entry}</span>
                  <span style={{ color: "#484f58" }}>{h.time}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: 20, fontSize: 9, color: "#484f58", letterSpacing: 2 }}>
          MSNR SCANNER v2.0 · MALAYSIAN SNR INSTITUTIONAL PRO · FOR EDUCATIONAL USE ONLY
        </div>
      </div>
    </div>
  );
}
