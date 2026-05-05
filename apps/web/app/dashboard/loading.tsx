export default function DashboardLoading() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="h-32 animate-pulse rounded-[1.5rem] border border-slate-200 bg-white/80"
        />
      ))}
    </div>
  );
}
