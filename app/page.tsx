"use client";

import { useEffect, useState } from "react";

type SaveState = "idle" | "saving" | "saved" | "error";
type GenState = "idle" | "generating" | "sent" | "error";

export default function Dashboard() {
  const [description, setDescription] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  const [genState, setGenState] = useState<GenState>("idle");
  const [genError, setGenError] = useState<string | null>(null);
  const [genResult, setGenResult] = useState<{
    clusters: number;
    stories: number;
    sentTo: string;
  } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/interests", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setDescription(data.description ?? "");
          setKeywords(Array.isArray(data.keywords) ? data.keywords : []);
          setUpdatedAt(data.updatedAt ?? null);
        }
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  function addKeywordFromInput() {
    const raw = keywordInput.trim().replace(/,$/, "");
    if (!raw) return;
    if (keywords.includes(raw)) {
      setKeywordInput("");
      return;
    }
    setKeywords([...keywords, raw]);
    setKeywordInput("");
  }

  function handleKeywordKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addKeywordFromInput();
    } else if (e.key === "Backspace" && !keywordInput && keywords.length) {
      setKeywords(keywords.slice(0, -1));
    }
  }

  function removeKeyword(k: string) {
    setKeywords(keywords.filter((x) => x !== k));
  }

  async function handleSave() {
    setSaveState("saving");
    setSaveError(null);
    try {
      const res = await fetch("/api/interests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, keywords }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setUpdatedAt(data.updatedAt);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch (err) {
      setSaveError((err as Error).message);
      setSaveState("error");
    }
  }

  async function handleGenerate() {
    setGenState("generating");
    setGenError(null);
    setGenResult(null);
    try {
      const res = await fetch("/api/generate", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setGenResult({
        clusters: data.clusters,
        stories: data.stories,
        sentTo: data.sentTo,
      });
      setGenState("sent");
    } catch (err) {
      setGenError((err as Error).message);
      setGenState("error");
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <header className="mb-10">
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">
          briefd
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900">
          Your personal daily brief
        </h1>
        <p className="mt-2 text-sm text-neutral-600">
          Tell briefd what you care about. Hit generate. Get a human-quality
          brief in your inbox.
        </p>
      </header>

      <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <label className="block text-sm font-medium text-neutral-800">
          What are you into?
        </label>
        <p className="mt-1 text-xs text-neutral-500">
          Be specific. Name the sub-fields, the debates, the companies, the
          people you follow. The more context you give, the sharper the brief.
        </p>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. I'm a staff infra engineer going deep on LLM inference, Kubernetes scheduling, and chip economics. I follow what Nvidia, Groq, and Cerebras are doing on hardware, and I care about pricing wars and capex flows. I also read US macro closely — Fed minutes, Treasury issuance, dollar liquidity."
          rows={8}
          disabled={!loaded}
          className="mt-3 w-full resize-y rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
        />

        <label className="mt-6 block text-sm font-medium text-neutral-800">
          Keywords
        </label>
        <p className="mt-1 text-xs text-neutral-500">
          Hit Enter or comma to add. These sharpen search.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 focus-within:border-blue-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100">
          {keywords.map((k) => (
            <span
              key={k}
              className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700"
            >
              {k}
              <button
                type="button"
                onClick={() => removeKeyword(k)}
                className="text-blue-500 hover:text-blue-700"
                aria-label={`Remove ${k}`}
              >
                &times;
              </button>
            </span>
          ))}
          <input
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={handleKeywordKeyDown}
            onBlur={addKeywordFromInput}
            placeholder={keywords.length ? "" : "inference, fed, tsmc…"}
            disabled={!loaded}
            className="min-w-[120px] flex-1 bg-transparent py-1 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none disabled:opacity-50"
          />
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div className="text-xs text-neutral-500">
            {updatedAt && new Date(updatedAt).getTime() > 0
              ? `Last saved ${new Date(updatedAt).toLocaleString()}`
              : "Not saved yet"}
          </div>
          <button
            onClick={handleSave}
            disabled={saveState === "saving" || !loaded}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {saveState === "saving"
              ? "Saving…"
              : saveState === "saved"
              ? "Saved"
              : "Save interests"}
          </button>
        </div>
        {saveState === "error" && saveError && (
          <p className="mt-3 text-xs text-red-600">{saveError}</p>
        )}
      </section>

      <section className="mt-8 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">
              Generate today&apos;s brief
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              Researches the last 24–72 hours against your interests and
              emails you a personalized digest. Takes ~30–60 seconds.
            </p>
          </div>
          <button
            onClick={handleGenerate}
            disabled={genState === "generating" || !loaded}
            className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {genState === "generating"
              ? "Generating…"
              : "Generate & send"}
          </button>
        </div>

        {genState === "generating" && (
          <p className="mt-4 text-xs text-neutral-500">
            Researching with Perplexity and composing your brief… don&apos;t
            close this tab.
          </p>
        )}
        {genState === "sent" && genResult && (
          <div className="mt-4 rounded-md bg-green-50 px-4 py-3 text-sm text-green-800">
            Sent to <strong>{genResult.sentTo}</strong> —{" "}
            {genResult.stories} stories across {genResult.clusters} clusters.
          </div>
        )}
        {genState === "error" && genError && (
          <div className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-800">
            {genError}
          </div>
        )}
      </section>

      <footer className="mt-10 text-center text-xs text-neutral-400">
        Need to check Gmail SMTP?{" "}
        <a href="/api/test-email" className="underline hover:text-neutral-600">
          /api/test-email
        </a>
      </footer>
    </main>
  );
}
