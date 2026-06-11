export default function GlassCard({ children, className = "" }) {
  return (
    <div className={`bg-white/60 backdrop-blur-xl border border-white/30 rounded-lg p-6 shadow-lg ${className}`}>
      {children}
    </div>
  );
}