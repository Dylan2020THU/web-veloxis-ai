const LOGO_BASE = import.meta.env.BASE_URL + "brand/logo-base.png";

export function TopBar() {
  return (
    <header className="absolute left-6 top-6 z-10 rounded-2xl bg-white/90 p-2 shadow-soft backdrop-blur">
      <img
        src={LOGO_BASE}
        alt="大川激流人工智能基地"
        className="block h-8 w-auto select-none"
        draggable={false}
      />
    </header>
  );
}
