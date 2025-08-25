import { useState } from "react";

export default function App() {
  const [file, setFile] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const onFile = (e) => setFile(e.target.files?.[0] || null);

  const submit = async () => {
    setError("");
    setResult(null);
    if (!prompt)
      return setError("Please add a brief or question for the review.");
    setLoading(true);
    try {
      const fd = new FormData();
      if (file) fd.append("file", file);
      fd.append("prompt", prompt);

      const res = await fetch("http://localhost:5000/review", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "API error");
      setResult(data.result);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-violet-900 text-white p-6">
      <div className="max-w-3xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold">AI Design Review</h1>
          <p className="text-sm text-violet-200/80 mt-1">
            Upload (optional), add prompt, get structured critique.
          </p>
        </header>

        <div className="grid gap-4">
          <div className="bg-gray-900/60 border border-violet-700/40 rounded-2xl p-4">
            <label className="block text-sm mb-2">
              Upload Design (optional)
            </label>
            <input
              type="file"
              onChange={onFile}
              className="block w-full text-sm text-gray-300
                         file:mr-4 file:py-2 file:px-4
                         file:rounded-lg file:border-0
                         file:bg-violet-700 file:text-white
                         hover:file:bg-violet-600
                         cursor-pointer"
            />
            {file && (
              <div className="mt-2 text-xs text-gray-300">
                Selected: {file.name}{" "}
                <span className="text-gray-400">
                  ({file.type || "unknown"})
                </span>
              </div>
            )}
          </div>

          <div className="bg-gray-900/60 border border-violet-700/40 rounded-2xl p-4">
            <label className="block text-sm mb-2">Your brief / prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={5}
              placeholder="e.g., Evaluate landing page hero for clarity, visual hierarchy, accessibility, and emotional tone for a premium fintech product."
              className="w-full p-3 rounded-lg bg-black/50 border border-gray-700 text-gray-100 placeholder-gray-500"
            />
          </div>

          <button
            onClick={submit}
            disabled={loading}
            className="justify-self-start bg-violet-700 hover:bg-violet-600 disabled:opacity-60 px-6 py-2 rounded-xl font-semibold"
          >
            {loading ? "Analyzing..." : "Get Review"}
          </button>

          {error && (
            <div className="bg-red-900/40 border border-red-600/40 text-red-200 rounded-xl p-3">
              {error}
            </div>
          )}

          {result && (
            <div className="bg-gray-900/60 border border-violet-700/40 rounded-2xl p-4 space-y-3">
              <h2 className="text-xl font-semibold">Summary</h2>
              <p className="text-gray-200">{result.summary}</p>

              <h3 className="text-lg font-semibold mt-2">Scores</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                {Object.entries(result.scores).map(([k, v]) => (
                  <div
                    key={k}
                    className="bg-black/40 rounded-lg p-2 border border-gray-700"
                  >
                    <div className="text-gray-400">{k}</div>
                    <div className="font-bold">
                      {typeof v === "number" ? `${v}/10` : v}
                    </div>
                  </div>
                ))}
              </div>

              <h3 className="text-lg font-semibold mt-2">Product Value</h3>
              <p className="text-gray-200">{result.product_value}</p>

              <h3 className="text-lg font-semibold mt-2">Priority Fixes</h3>
              <ul className="list-disc pl-5 text-gray-200">
                {result.priority_fixes.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>

              <h3 className="text-lg font-semibold mt-2">Suggestions</h3>
              <ul className="list-disc pl-5 text-gray-200">
                {result.suggestions.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
