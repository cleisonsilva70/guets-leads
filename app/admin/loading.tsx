/** Esqueleto mostrado enquanto o painel espera a planilha responder. */
export default function AdminLoading() {
  const block = "animate-pulse rounded-2xl bg-smoke";
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Carregando">
      <div className="space-y-2">
        <div className={`${block} h-7 w-40`} />
        <div className={`${block} h-4 w-64`} />
      </div>
      <div className={`${block} h-[72px]`} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`${block} h-[116px]`} />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className={`${block} h-56`} />
        <div className={`${block} h-56`} />
      </div>
    </div>
  );
}
