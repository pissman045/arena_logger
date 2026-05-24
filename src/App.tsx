import { useState } from "react";
import { DebugWorkspace } from "./components/DebugWorkspace";
import { MainWorkspace } from "./components/MainWorkspace";

type ViewMode = "main" | "debug";

export default function App() {
  const [mode, setMode] = useState<ViewMode>("main");
  const [error, setError] = useState<string | null>(null);

  return (
    <main className="app-shell">
      <section className="workspace">
        <header className="workspace-header">
          <div>
            <h1>Arena Logger</h1>
            <p>スクリーンショットから TSV を生成するための作業台です。</p>
          </div>
          <div className="mode-switch" aria-label="表示モード">
            <button
              className={mode === "main" ? "is-active" : ""}
              type="button"
              onClick={() => {
                setMode("main");
                setError(null);
              }}
            >
              メイン
            </button>
            <button
              className={mode === "debug" ? "is-active" : ""}
              type="button"
              onClick={() => {
                setMode("debug");
                setError(null);
              }}
            >
              デバッグ
            </button>
          </div>
        </header>

        {mode === "main" ? (
          <MainWorkspace error={error} setError={setError} />
        ) : (
          <DebugWorkspace error={error} setError={setError} />
        )}
      </section>
    </main>
  );
}
