export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="text-center">
        <div className="animate-spin text-6xl mb-4">🔧</div>
        <p className="text-slate-600">Loading Workshop Manager...</p>
      </div>
    </div>
  );
}
