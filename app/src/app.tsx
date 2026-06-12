import { useUiStore } from "@/store";

export function App() {
  const view = useUiStore((s) => s.view);

  return (
    <div className="grid min-h-screen place-items-center bg-[var(--si-bg)] text-[var(--si-ink)]">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold tracking-tight">Tabula</h1>
        <p className="mt-2 text-sm text-[var(--si-gray)]">
          vista corrente: <code>{view}</code>
        </p>
      </div>
    </div>
  );
}
