import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowUp, Bot, Sparkles, Loader2, Mic, MicOff, Volume2, VolumeX, Settings2 } from "lucide-react";
import { motion } from "motion/react";
import { useColors } from "./ThemeContext";

// n8n webhook URL — replace with your actual n8n webhook endpoint
const N8N_WEBHOOK_URL = "https://liam-n8n-ca-ne.politeground-57293d7f.northeurope.azurecontainerapps.io:5678/webhook/skyspot-assistant/chat";

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: Date;
}

const suggestedQuestions = [
  "Will I get a spot if I arrive at 9?",
  "What's the best time to park today?",
  "How does rain affect parking?",
  "Is it busy on Fridays at 10 AM?",
  "When does the car park empty out?",
];

// ─── Speech State (singleton, shared across renders) ───
const speechState = {
  utterance: null as SpeechSynthesisUtterance | null,
  speaking: false,
  speakingMsgId: null as string | null,
};

function stopSpeaking() {
  window.speechSynthesis?.cancel();
  speechState.speaking = false;
  speechState.speakingMsgId = null;
  speechState.utterance = null;
}

// ─── Simulated responses (fallback when n8n is not connected) ───
function getSimulatedResponse(query: string): string {
  const q = query.toLowerCase();
  if (q.includes("spot") && (q.includes("9") || q.includes("nine"))) {
    return "Based on historical data and today's weather (light rain expected), arriving at 9:00 AM gives you roughly a **35% chance** of finding a spot immediately. The car park typically hits 90%+ occupancy by 8:50 AM on rainy days. I'd recommend arriving by **8:30 AM** for a much better chance (~78%). Alternatively, try after **12:30 PM** when the lunchtime turnover begins.";
  }
  if (q.includes("best time") || q.includes("when should")) {
    return "Today (Wednesday), the **optimal windows** are:\n\n• **Before 8:30 AM** — ~80% chance of a spot\n• **12:30 - 1:15 PM** — lunchtime turnover\n• **After 4:00 PM** — occupancy drops below 60%\n\nGiven today's dry weather, demand should be slightly lower than a rainy day, so you have a bit more flexibility.";
  }
  if (q.includes("rain") || q.includes("weather")) {
    return "Rain has a **significant impact** on Barrier Car Park. On rainy days, occupancy peaks ~25-30% earlier and stays higher throughout the day. People who normally walk or cycle tend to drive instead. Historical data shows:\n\n• Dry days: Peak occupancy ~88% at 9:15 AM\n• Rainy days: Peak occupancy ~97% at 8:45 AM\n\nToday's forecast shows clearing skies, so expect moderate demand.";
  }
  if (q.includes("friday") || q.includes("fri")) {
    return "Fridays are generally **quieter** at Barrier Car Park. At 10 AM on a typical Friday, occupancy is around **72%** compared to ~92% on Tuesdays. Many students don't have Friday lectures. You should be able to find a spot arriving at 10 AM most Fridays without any issue.";
  }
  if (q.includes("empty") || q.includes("clear") || q.includes("leave")) {
    return "The car park typically starts emptying after **3:30 PM** as afternoon lectures end. By **5:00 PM**, occupancy usually drops to ~30%. The fastest emptying happens between **4:00-4:30 PM**. On Fridays, this shift happens about an hour earlier.";
  }
  if (q.includes("busy") || q.includes("full") || q.includes("peak")) {
    return "Barrier Car Park is busiest on **Tuesdays and Wednesdays** between **8:45 - 11:30 AM**, when occupancy regularly hits 95%+. The absolute peak is typically **Tuesday at 9:15 AM**. Today being Wednesday, expect high demand until about 11 AM.";
  }
  return `Great question! Based on my analysis of weather data, historical patterns, and current live occupancy at Barrier Car Park:\n\nThe car park is currently at moderate occupancy. For the most accurate real-time prediction, I cross-reference today's weather conditions, the day of week, and time-of-day patterns from the past 12 weeks.\n\nCould you be more specific about what time you're planning to arrive? I can give you a precise probability estimate.`;
}

// ─── Strip markdown bold for TTS ───
function stripBold(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, "$1");
}

export default function Assistant() {
  const c = useColors();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Speech state
  const [listening, setListening] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [autoRead, setAutoRead] = useState(() => localStorage.getItem("skyspot-autoread") === "true");
  const [selectedVoice, setSelectedVoice] = useState(() => localStorage.getItem("skyspot-voice") || "");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Load available voices
  useEffect(() => {
    function loadVoices() {
      const v = window.speechSynthesis?.getVoices() || [];
      // Filter to English voices, prioritise en-IE and en-GB
      const english = v.filter((voice) => voice.lang.startsWith("en"));
      const sorted = english.sort((a, b) => {
        const priority = (v: SpeechSynthesisVoice) => {
          if (v.lang === "en-IE") return 0;
          if (v.lang === "en-GB") return 1;
          if (v.lang === "en-US") return 2;
          return 3;
        };
        return priority(a) - priority(b);
      });
      setVoices(sorted);
      // Auto-select first en-IE voice if none persisted
      if (!selectedVoice && sorted.length > 0) {
        const irish = sorted.find((v) => v.lang === "en-IE");
        const pick = irish || sorted[0];
        setSelectedVoice(pick.name);
        localStorage.setItem("skyspot-voice", pick.name);
      }
    }
    loadVoices();
    window.speechSynthesis?.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis?.removeEventListener("voiceschanged", loadVoices);
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // ─── TTS: Speak a message ───
  const speakMessage = useCallback(
    (msgId: string, text: string) => {
      // If already speaking this message, stop
      if (speechState.speakingMsgId === msgId) {
        stopSpeaking();
        setSpeakingId(null);
        return;
      }
      // Stop anything currently playing
      stopSpeaking();

      const cleaned = stripBold(text);
      const utterance = new SpeechSynthesisUtterance(cleaned);
      const voice = voices.find((v) => v.name === selectedVoice);
      if (voice) utterance.voice = voice;
      utterance.lang = voice?.lang || "en-IE";
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      utterance.onend = () => {
        speechState.speaking = false;
        speechState.speakingMsgId = null;
        setSpeakingId(null);
      };
      utterance.onerror = () => {
        speechState.speaking = false;
        speechState.speakingMsgId = null;
        setSpeakingId(null);
      };

      speechState.utterance = utterance;
      speechState.speaking = true;
      speechState.speakingMsgId = msgId;
      setSpeakingId(msgId);

      window.speechSynthesis.speak(utterance);
    },
    [voices, selectedVoice]
  );

  // ─── Auto-read new assistant messages ───
  const lastMsgCountRef = useRef(0);
  useEffect(() => {
    if (!autoRead) return;
    if (messages.length <= lastMsgCountRef.current) {
      lastMsgCountRef.current = messages.length;
      return;
    }
    lastMsgCountRef.current = messages.length;
    const last = messages[messages.length - 1];
    if (last?.role === "assistant") {
      // Small delay so the message renders before speaking
      setTimeout(() => speakMessage(last.id, last.text), 300);
    }
  }, [messages, autoRead, speakMessage]);

  // ─── STT: Speech recognition ───
  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Try Chrome or Edge.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-IE";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput((prev) => (prev ? prev + " " + transcript : transcript));
      setListening(false);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  // ─── Send message (stops any playing speech first) ───
  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    stopSpeaking();
    setSpeakingId(null);

    const userMsg: Message = { id: Date.now().toString(), role: "user", text: text.trim(), timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text.trim(), timestamp: new Date().toISOString() }),
        signal: AbortSignal.timeout(15000),
      });
      const data = await res.json();
      const reply: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        text: data.response || data.output || data.message,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, reply]);
    } catch {
      await new Promise((r) => setTimeout(r, 800 + Math.random() * 1200));
      const reply: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        text: getSimulatedResponse(text),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, reply]);
    }
    setLoading(false);
  };

  const formatTime = (d: Date) => d.toLocaleTimeString("en-IE", { hour: "2-digit", minute: "2-digit" });

  const renderText = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={i} style={{ fontWeight: 700 }}>
            {part.slice(2, -2)}
          </strong>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  const toggleAutoRead = () => {
    const next = !autoRead;
    setAutoRead(next);
    localStorage.setItem("skyspot-autoread", String(next));
  };

  const handleVoiceChange = (name: string) => {
    setSelectedVoice(name);
    localStorage.setItem("skyspot-voice", name);
  };

  const scrollbarThumb = c.dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)";
  const scrollbarHover = c.dark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)";

  return (
    <div className="flex flex-col w-full" style={{ height: "calc(100vh - 56px)" }}>
      <style>{`
        .skyspot-chat-scroll::-webkit-scrollbar { width: 4px; }
        .skyspot-chat-scroll::-webkit-scrollbar-track { background: transparent; }
        .skyspot-chat-scroll::-webkit-scrollbar-thumb { background: ${scrollbarThumb}; border-radius: 4px; }
        .skyspot-chat-scroll::-webkit-scrollbar-thumb:hover { background: ${scrollbarHover}; }
        .skyspot-chat-scroll { scrollbar-width: thin; scrollbar-color: ${scrollbarThumb} transparent; }
        @keyframes pulse-ring { 0% { transform: scale(1); opacity: 0.6; } 100% { transform: scale(1.8); opacity: 0; } }
        .mic-pulse::before {
          content: ''; position: absolute; inset: -4px; border-radius: 50%;
          background: #EF4444; animation: pulse-ring 1.2s ease-out infinite;
        }
      `}</style>

      {/* Header */}
      <div className="px-4 lg:px-8 pt-4 lg:pt-8 pb-3 border-b" style={{ borderColor: c.cardBorder }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #2D7EFF, #8B5CF6)" }}
            >
              <Sparkles size={18} color="white" />
            </div>
            <div>
              <div style={{ color: c.text, fontSize: 16, fontWeight: 600 }}>SkySpot Assistant</div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                <span style={{ color: c.textFaint }} className="text-[11px]">
                  Powered by n8n · Live
                </span>
              </div>
            </div>
          </div>

          {/* Voice settings button */}
          <button
            onClick={() => setShowVoiceSettings(!showVoiceSettings)}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ background: showVoiceSettings ? c.accentBg : "transparent" }}
          >
            <Settings2 size={16} color={showVoiceSettings ? "#2D7EFF" : c.textMuted} />
          </button>
        </div>

        {/* Voice settings panel */}
        {showVoiceSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 p-3 rounded-xl"
            style={{ background: c.card, border: `1px solid ${c.cardBorder}` }}
          >
            <div className="flex items-center justify-between mb-2">
              <span style={{ color: c.textSecondary }} className="text-[12px] font-medium">
                Voice settings
              </span>
              {/* Auto-read toggle */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <span style={{ color: c.textMuted }} className="text-[11px]">
                  Auto-read
                </span>
                <button
                  onClick={toggleAutoRead}
                  className="w-9 h-5 rounded-full relative transition-colors"
                  style={{ background: autoRead ? "#2D7EFF" : c.inputBorder }}
                >
                  <div
                    className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                    style={{ left: autoRead ? 18 : 2 }}
                  />
                </button>
              </label>
            </div>
            {/* Voice dropdown */}
            <select
              value={selectedVoice}
              onChange={(e) => handleVoiceChange(e.target.value)}
              className="w-full px-2 py-1.5 rounded-lg text-[12px] outline-none"
              style={{
                background: c.bg,
                color: c.text,
                border: `1px solid ${c.cardBorder}`,
              }}
            >
              {voices.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name} ({v.lang})
                </option>
              ))}
              {voices.length === 0 && <option>No voices available</option>}
            </select>
            {/* Preview button */}
            <button
              onClick={() => {
                stopSpeaking();
                const u = new SpeechSynthesisUtterance("Hello! I'm your SkySpot parking assistant.");
                const voice = voices.find((v) => v.name === selectedVoice);
                if (voice) u.voice = voice;
                u.lang = voice?.lang || "en-IE";
                window.speechSynthesis.speak(u);
              }}
              className="mt-2 w-full py-1.5 rounded-lg text-[11px] transition-colors"
              style={{ background: c.accentBg, color: "#2D7EFF", border: `1px solid ${c.accentBorder}` }}
            >
              Preview voice
            </button>
          </motion.div>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4 skyspot-chat-scroll">
        {messages.length === 0 && (
          <div className="flex flex-col items-center pt-8">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{
                background: `linear-gradient(135deg, ${c.accent}20, ${c.accent}08)`,
                border: `1px solid ${c.accent}30`,
              }}
            >
              <Bot size={32} color={c.accent} />
            </div>
            <p style={{ color: c.text, fontWeight: 600, fontSize: 16 }} className="mb-1">
              Ask me anything
            </p>
            <p style={{ color: c.textMuted }} className="text-[12px] text-center mb-6 px-4">
              I reason across live occupancy, weather, and historical data to help you park smarter. You can also tap the mic to speak.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {suggestedQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="px-3 py-2 rounded-xl text-[12px] transition-colors"
                  style={{ background: c.card, border: `1px solid ${c.cardBorder}`, color: c.textSecondary }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div className={`max-w-[85%] ${msg.role === "user" ? "" : "flex gap-2"}`}>
              {msg.role === "assistant" && (
                <div
                  className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center mt-1"
                  style={{ background: "linear-gradient(135deg, #2D7EFF, #8B5CF6)" }}
                >
                  <Sparkles size={12} color="white" />
                </div>
              )}
              <div>
                <div
                  className="px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed whitespace-pre-line"
                  style={
                    msg.role === "user"
                      ? { background: "#2D7EFF", color: "white", borderBottomRightRadius: 4 }
                      : { background: c.card, border: `1px solid ${c.cardBorder}`, color: c.text, borderBottomLeftRadius: 4 }
                  }
                >
                  {renderText(msg.text)}
                </div>
                <div className="flex items-center gap-1.5 mt-1 px-1">
                  <span
                    className="text-[9px]"
                    style={{ color: c.textFaint, textAlign: msg.role === "user" ? "right" : "left" }}
                  >
                    {formatTime(msg.timestamp)}
                  </span>
                  {/* TTS button on assistant messages */}
                  {msg.role === "assistant" && (
                    <button
                      onClick={() => speakMessage(msg.id, msg.text)}
                      className="w-5 h-5 rounded-full flex items-center justify-center transition-colors"
                      style={{
                        background: speakingId === msg.id ? "rgba(45,126,255,0.15)" : "transparent",
                      }}
                      title={speakingId === msg.id ? "Stop reading" : "Read aloud"}
                    >
                      {speakingId === msg.id ? (
                        <VolumeX size={11} color="#2D7EFF" />
                      ) : (
                        <Volume2 size={11} color={c.textFaint} />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}

        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2">
            <div
              className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #2D7EFF, #8B5CF6)" }}
            >
              <Sparkles size={12} color="white" />
            </div>
            <div
              className="px-4 py-3 rounded-2xl flex items-center gap-2"
              style={{ background: c.card, border: `1px solid ${c.cardBorder}`, borderBottomLeftRadius: 4 }}
            >
              <Loader2 size={14} color={c.accent} className="animate-spin" />
              <span style={{ color: c.textMuted }} className="text-[12px]">
                Reasoning...
              </span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Input area */}
      <div className="px-4 pb-4 pt-2 border-t" style={{ borderColor: c.cardBorder }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="flex items-center gap-2 p-1.5 rounded-2xl"
          style={{ background: c.card, border: `1px solid ${c.cardBorder}` }}
        >
          {/* Mic button */}
          <button
            type="button"
            onClick={listening ? stopListening : startListening}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all relative ${listening ? "mic-pulse" : ""}`}
            style={{
              background: listening ? "#EF4444" : "transparent",
            }}
            title={listening ? "Stop listening" : "Speak"}
          >
            {listening ? <MicOff size={16} color="white" /> : <Mic size={16} color={c.textMuted} />}
          </button>

          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={listening ? "Listening..." : "Ask about parking..."}
            className="flex-1 bg-transparent outline-none px-1 py-2 text-[13px]"
            style={{ color: c.text }}
            disabled={loading}
          />

          {/* Send button */}
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-opacity"
            style={{
              background: input.trim() ? "#2D7EFF" : c.inputBorder,
              opacity: input.trim() ? 1 : 0.5,
            }}
          >
            <ArrowUp size={16} color="white" />
          </button>
        </form>
      </div>
    </div>
  );
}
