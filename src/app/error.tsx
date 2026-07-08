"use client";

import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Page error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Something went wrong</h2>
        <p className="text-slate-600 mb-4">{error.message || "An unexpected error occurred"}</p>
        <div className="flex gap-2 justify-center">
          <button onClick={reset} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-500">Try Again</button>
          <button onClick={() => (window.location.href = "/dashboard")} className="px-6 py-2 border border-slate-300 rounded-lg hover:bg-slate-50">Go Home</button>
        </div>
      </div>
    </div>
  );
}
