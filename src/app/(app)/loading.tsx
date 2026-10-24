export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Carregando">
      <div className="page-header">
        <div className="skeleton h-7 w-48" />
        <div className="skeleton mt-2 h-4 w-80 max-w-full" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card flex flex-col gap-3 p-5">
            <div className="skeleton h-4 w-24" />
            <div className="skeleton h-8 w-16" />
          </div>
        ))}
      </div>
      <div className="card flex flex-col gap-3 p-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton h-9 w-full" />
        ))}
      </div>
    </div>
  );
}
