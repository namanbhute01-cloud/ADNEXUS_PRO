export default function AdminLoading() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={index}
          className="h-36 animate-pulse rounded-[1.5rem] border border-slate-200 bg-white/80"
        />
      ))}
    </div>
  );
}
