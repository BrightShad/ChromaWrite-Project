import { useState, useEffect } from "react";
import { Terminal, Cpu, Play, CheckCircle2, XCircle, ChevronDown, ChevronUp } from "lucide-react";

export default function PipelineInspector({ onClose }) {
  const [logs, setLogs] = useState([]);
  const [selectedLogId, setSelectedLogId] = useState(null);
  const [activeTab, setActiveTab] = useState("logs");

  useEffect(() => {
    const fetchLogs = () => {
      fetch("/api/telemetry-logs")
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch logs");
          return res.json();
        })
        .then((data) => setLogs(data))
        .catch((err) => console.warn("[ChromaWrite] Telemetry log fetch failed:", err));
    };

    fetchLogs();
    const timer = setInterval(fetchLogs, 1500);
    return () => clearInterval(timer);
  }, []);

  const toggleLog = (id) => {
    setSelectedLogId((prev) => (prev === id ? null : id));
  };

  const chainDefinitions = [
    {
      name: "Custom Emotion Mapping Chain",
      lcel: "prompt.pipe(model.withStructuredOutput(EmotionMapping, method=\"json_mode\"))",
      description: "Maps user-defined creative emotional mood text into one of the 48 standard primary emotions.",
      prompt: "System: You map a user-described emotion to the nearest entry in a fixed vocabulary.\nHuman: Map this emotion: \"{rawLabel}\"",
      output: "JSON Object: { emotion: string, confidence: number }"
    },
    {
      name: "Creative Nudge Chain",
      lcel: "prompt.pipe(model).pipe(new StrOutputParser())",
      description: "Generates dramatic creative prompts based on current emotional context and text direction.",
      prompt: "System: You are a creative writing companion... The detected emotional tone is: {dominant}.\nHuman: {textWindow}",
      output: "Plain text sentence nudge"
    },
    {
      name: "Emotion Refinement Chain",
      lcel: "prompt.pipe(model.withStructuredOutput(Refinement, method=\"json_mode\"))",
      description: "Resolves conflicting local keyword scores by analyzing semantic context of the last 150 words.",
      prompt: "System: You identify the dominant emotional tone... Choose from: {candidates}.\nHuman: {textWindow}",
      output: "JSON Object: { dominantEmotion: string }"
    },
    {
      name: "Session Fingerprint Chain",
      lcel: "prompt.pipe(model).pipe(new StrOutputParser())",
      description: "Synthesizes story theme, word count, emotional shifts, and distribution into an evocative phrase.",
      prompt: "System: Write a single evocative sentence capturing the emotional fingerprint of a writing session...\nHuman: dominant: {dominantEmotion}, shifts: {shiftCount}, wordCount: {wordCount}, distribution: {distSummary}",
      output: "Evocative summary sentence"
    },
    {
      name: "Creative Continuations Chain",
      lcel: "prompt.pipe(model.withStructuredOutput(Continuations, method=\"json_mode\"))",
      description: "Suggests 3 distinct, stylistically aligned path options to continue the story.",
      prompt: "System: Write exactly 3 brief continuation options... Return JSON with 'continuations' array.\nHuman: {textWindow}",
      output: "JSON Object: { continuations: string[] }"
    }
  ];

  return (
    <div className="flex flex-col h-full bg-background/95 border-l border-foreground/10 text-foreground w-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-foreground/10">
        <div className="flex items-center gap-2">
          <Cpu className="h-5 w-5 text-primary" />
          <h2 className="font-mono text-sm uppercase tracking-wider font-semibold">LangChain Pipeline Inspector</h2>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-foreground/40 hover:text-foreground transition-colors font-mono text-xs border border-foreground/20 rounded px-2 py-1"
          >
            Close
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-foreground/10 font-mono text-xs">
        <button
          onClick={() => setActiveTab("logs")}
          className={`flex-1 py-3 text-center border-b-2 transition-all ${
            activeTab === "logs"
              ? "border-primary text-primary font-medium bg-foreground/5"
              : "border-transparent text-foreground/50 hover:text-foreground"
          }`}
        >
          Live Telemetry Logs
        </button>
        <button
          onClick={() => setActiveTab("architecture")}
          className={`flex-1 py-3 text-center border-b-2 transition-all ${
            activeTab === "architecture"
              ? "border-primary text-primary font-medium bg-foreground/5"
              : "border-transparent text-foreground/50 hover:text-foreground"
          }`}
        >
          Chain Architectures
        </button>
      </div>

      {/* Main Panel Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ scrollbarWidth: "thin" }}>
        {activeTab === "logs" ? (
          <div className="space-y-3">
            {logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-foreground/30">
                <Terminal className="h-8 w-8 mb-2" />
                <p className="font-mono text-xs">Waiting for LangChain events...</p>
                <p className="font-serif italic text-xs mt-1">Start writing or request continuations to trigger chains.</p>
              </div>
            ) : (
              logs.map((log) => {
                const isOpen = selectedLogId === log.id;
                return (
                  <div
                    key={log.id}
                    className="border border-foreground/10 rounded-md overflow-hidden bg-background/50 hover:border-foreground/20 transition-all"
                  >
                    {/* Log Titlebar */}
                    <button
                      onClick={() => toggleLog(log.id)}
                      className="w-full flex items-center justify-between p-3 font-mono text-xs text-left"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {log.success ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-rose-500 flex-shrink-0" />
                        )}
                        <span className="font-semibold truncate">{log.chainName}</span>
                        {log.isMock && (
                          <span className="px-1.5 py-0.5 text-[10px] bg-foreground/10 text-foreground/60 rounded">
                            local
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-foreground/45 flex-shrink-0">
                        <span>{log.latencyMs}ms</span>
                        {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </div>
                    </button>

                    {/* Log Details */}
                    {isOpen && (
                      <div className="border-t border-foreground/10 p-4 space-y-3 bg-background/70 font-mono text-xs">
                        {/* Time */}
                        <div className="text-[10px] text-foreground/40">
                          Executed at: {new Date(log.timestamp).toLocaleTimeString()}
                        </div>

                        {/* Input */}
                        <div>
                          <div className="text-foreground/50 border-b border-foreground/10 pb-0.5 mb-1 font-semibold">
                            Input Variables:
                          </div>
                          <pre className="p-2 bg-foreground/5 rounded text-[11px] overflow-x-auto whitespace-pre-wrap">
                            {JSON.stringify(log.input, null, 2)}
                          </pre>
                        </div>

                        {/* Prompt Template Schema */}
                        <div>
                          <div className="text-foreground/50 border-b border-foreground/10 pb-0.5 mb-1 font-semibold">
                            Prompt Template:
                          </div>
                          <pre className="p-2 bg-foreground/5 rounded text-[11px] overflow-x-auto whitespace-pre-wrap text-foreground/75">
                            {log.promptSchema}
                          </pre>
                        </div>

                        {/* Rendered Prompt */}
                        <div>
                          <div className="text-foreground/50 border-b border-foreground/10 pb-0.5 mb-1 font-semibold">
                            Rendered Prompt (Fed to LLM):
                          </div>
                          <pre className="p-2 bg-foreground/5 rounded text-[11px] overflow-x-auto whitespace-pre-wrap text-foreground/90 max-h-48 overflow-y-auto">
                            {log.renderedPrompt}
                          </pre>
                        </div>

                        {/* Output */}
                        <div>
                          <div className="text-foreground/50 border-b border-foreground/10 pb-0.5 mb-1 font-semibold">
                            Parsed Output:
                          </div>
                          <pre className="p-2 bg-foreground/5 rounded text-[11px] overflow-x-auto whitespace-pre-wrap text-foreground/90">
                            {JSON.stringify(log.parsedResponse, null, 2)}
                          </pre>
                        </div>

                        {/* Raw response */}
                        {log.rawResponse && (
                          <div>
                            <div className="text-foreground/50 border-b border-foreground/10 pb-0.5 mb-1 font-semibold">
                              Raw LLM Response:
                            </div>
                            <pre className="p-2 bg-foreground/5 rounded text-[11px] overflow-x-auto whitespace-pre-wrap text-foreground/60 max-h-32 overflow-y-auto">
                              {log.rawResponse}
                            </pre>
                          </div>
                        )}

                        {/* Error message */}
                        {log.error && (
                          <div className="p-2 bg-rose-950/20 border border-rose-900/40 rounded text-rose-300">
                            <div className="font-semibold mb-0.5">Pipeline Error:</div>
                            <div className="text-[11px] break-words">{log.error}</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="space-y-4 font-mono text-xs">
            {chainDefinitions.map((chain, index) => (
              <div
                key={index}
                className="border border-foreground/10 rounded-md p-4 bg-background/50 space-y-3"
              >
                <div className="font-bold border-b border-foreground/10 pb-1 text-primary flex items-center justify-between">
                  <span>{chain.name}</span>
                  <Play className="h-3.5 w-3.5 opacity-40" />
                </div>
                
                <div>
                  <div className="text-foreground/50 font-semibold mb-0.5">Description:</div>
                  <div className="text-foreground/75 leading-relaxed font-serif italic text-[13px]">
                    {chain.description}
                  </div>
                </div>

                <div>
                  <div className="text-foreground/50 font-semibold mb-0.5">LCEL Declaration:</div>
                  <pre className="p-2 bg-foreground/5 rounded text-[11px] overflow-x-auto text-primary/80 font-medium">
                    {chain.lcel}
                  </pre>
                </div>

                <div>
                  <div className="text-foreground/50 font-semibold mb-0.5">Prompt Template Structure:</div>
                  <pre className="p-2 bg-foreground/5 rounded text-[11px] overflow-x-auto text-foreground/80 whitespace-pre-wrap">
                    {chain.prompt}
                  </pre>
                </div>

                <div>
                  <div className="text-foreground/50 font-semibold mb-0.5">Output Format:</div>
                  <pre className="p-2 bg-foreground/5 rounded text-[11px] overflow-x-auto text-foreground/60">
                    {chain.output}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
