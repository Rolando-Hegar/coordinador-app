export default function Spinner({ text = 'Cargando…' }: { text?: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-srv-text-muted">
      <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-srv-accent animate-spin" />
      <span className="text-sm">{text}</span>
    </div>
  );
}
