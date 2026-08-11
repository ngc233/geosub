function SkeletonLine({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-slate-200 ${className}`} />;
}

export default function AdminLoading() {
  return (
    <div aria-live="polite" aria-busy="true" className="space-y-6">
      <span className="sr-only">正在加载后台页面</span>

      <div className="border-b border-slate-200 pb-7">
        <SkeletonLine className="h-4 w-24" />
        <SkeletonLine className="mt-3 h-9 w-64 max-w-full" />
        <SkeletonLine className="mt-4 h-4 w-[min(38rem,100%)]" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <SkeletonLine className="h-4 w-24" />
            <SkeletonLine className="mt-4 h-8 w-20" />
            <SkeletonLine className="mt-3 h-3 w-32 max-w-full" />
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <SkeletonLine className="h-5 w-40" />
            <SkeletonLine className="mt-3 h-3 w-72 max-w-full" />
          </div>
          <SkeletonLine className="h-9 w-24" />
        </div>
        <div className="mt-6 space-y-3">
          {Array.from({ length: 5 }, (_, index) => (
            <SkeletonLine key={index} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
