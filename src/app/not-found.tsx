import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-blue-950 p-4">
      <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 max-w-md w-full text-center border border-white/10">
        <div className="text-6xl mb-4">🔍</div>
        <h2 className="text-3xl font-bold text-white mb-2">404 - Page Not Found</h2>
        <p className="text-slate-300 mb-6">The page you're looking for doesn't exist.</p>
        <Link href="/dashboard" className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-500">
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
