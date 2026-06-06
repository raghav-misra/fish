import { useState, type FormEvent } from "react";
import { GameButton } from "./GameButton.js";

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? "http://localhost:3000";

interface KeyGateProps {
  onUnlock: (key: string) => void;
}

export function KeyGate({ onUnlock }: KeyGateProps) {
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = key.trim();
    if (!trimmed) {
      setError("Key required");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${SERVER_URL}/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: trimmed }),
      });
      if (res.ok) {
        onUnlock(trimmed);
      } else {
        setError("Invalid key");
      }
    } catch {
      setError("Cannot reach server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-zinc-950">
      <form
        onSubmit={handleSubmit}
        className="flex w-72 flex-col gap-4 rounded-xl bg-zinc-900 p-6 shadow-xl"
      >
        <h1 className="text-center text-lg font-semibold text-zinc-100">
          Enter Access Key
        </h1>
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="Access key"
          autoFocus
          className={`rounded-lg border bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:ring-2 focus:ring-emerald-600 ${
            error ? "border-rose-500" : "border-zinc-700"
          }`}
        />
        {error && (
          <p className="text-center text-xs text-rose-400">{error}</p>
        )}
        <GameButton type="submit" variant="primary" disabled={loading}>
          {loading ? "Checking..." : "Enter"}
        </GameButton>
      </form>
    </div>
  );
}
