export default function CreateLoading() {
  return (
    <main className="flex h-screen flex-col bg-white px-4 text-black">
      <div className="pt-3">
        <div className="h-10 w-20 animate-pulse rounded-full bg-zinc-100" />
      </div>
      <section className="mx-auto flex min-h-0 flex-1 w-full max-w-5xl flex-col items-center justify-center pb-28">
        <div className="w-full max-w-3xl -translate-y-10 text-center sm:-translate-y-14">
          <div className="mx-auto h-7 w-72 max-w-full animate-pulse rounded-full bg-zinc-100" />
          <div className="mx-auto mt-7 h-[60px] w-full max-w-3xl animate-pulse rounded-full bg-zinc-100 shadow-[0_8px_30px_rgba(0,0,0,0.06)]" />
        </div>
      </section>
    </main>
  );
}
