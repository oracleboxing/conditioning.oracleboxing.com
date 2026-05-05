type Direction = {
  id: string;
  label: string;
  recommendation: string;
  name: string;
  positioning: string;
  typography: string;
  vibe: string;
  palette: { name: string; hex: string; use: string }[];
  buttons: { primary: string; secondary: string; ghost: string };
  bg: string;
  panel: string;
  panelAlt: string;
  text: string;
  muted: string;
  accent: string;
  accent2: string;
  border: string;
  tradeoffs: string[];
};

const directions: Direction[] = [
  {
    id: "lab",
    label: "Direction 01",
    recommendation: "Recommended",
    name: "Oracle Performance Lab",
    positioning: "Premium S&C intelligence for serious boxers. Sharp, clinical, confident.",
    typography: "Space Grotesk style headings, clean grotesk body, compact data labels.",
    vibe: "Feels like WHOOP met a fight camp clipboard, but with better taste.",
    palette: [
      { name: "Black canvas", hex: "#05070A", use: "App background" },
      { name: "Oracle blue", hex: "#007AFF", use: "Primary action" },
      { name: "Ice white", hex: "#F6FAFF", use: "High contrast text" },
      { name: "Steel", hex: "#7A8799", use: "Secondary copy" },
      { name: "Acid metric", hex: "#B8FF3D", use: "Readiness scores" },
    ],
    buttons: { primary: "Build my session", secondary: "View plan logic", ghost: "Adjust constraints" },
    bg: "#05070A",
    panel: "#0B111A",
    panelAlt: "#101A28",
    text: "#F6FAFF",
    muted: "#9AA7B8",
    accent: "#007AFF",
    accent2: "#B8FF3D",
    border: "rgba(246,250,255,0.12)",
    tradeoffs: ["Most premium and scalable", "Best fit for AI workout builder", "Less warm/community-led than the other routes"],
  },
  {
    id: "club",
    label: "Direction 02",
    recommendation: "Best for community warmth",
    name: "Fight Science Club",
    positioning: "A high-touch coaching product with human taste, proof, and community energy.",
    typography: "Editorial serif-style headlines, strong condensed labels, readable body copy.",
    vibe: "Private members club for boxers who track their work and actually improve.",
    palette: [
      { name: "Canvas", hex: "#F4EFE6", use: "Background" },
      { name: "Ink", hex: "#19140F", use: "Primary text" },
      { name: "Ox blood", hex: "#9C1B1E", use: "Brand punch" },
      { name: "Brass", hex: "#B8862B", use: "Premium accents" },
      { name: "Moss", hex: "#33483A", use: "Recovery states" },
    ],
    buttons: { primary: "Start this week", secondary: "See coach notes", ghost: "Browse community" },
    bg: "#F4EFE6",
    panel: "#FFF9EF",
    panelAlt: "#E8DCC9",
    text: "#19140F",
    muted: "#675D50",
    accent: "#9C1B1E",
    accent2: "#B8862B",
    border: "rgba(25,20,15,0.16)",
    tradeoffs: ["Most distinctive against generic SaaS", "Great for testimonials and community", "Slightly less obvious as an AI product"],
  },
  {
    id: "corner",
    label: "Direction 03",
    recommendation: "Boldest visual system",
    name: "Neon Corner System",
    positioning: "Fast, aggressive, app-native conditioning for members who want momentum.",
    typography: "Tight uppercase headings, mono stats, chunky mobile cards.",
    vibe: "Fight night dashboard, neon wraps, brutal little training cards.",
    palette: [
      { name: "Midnight", hex: "#070A1A", use: "Background" },
      { name: "Electric blue", hex: "#245BFF", use: "Primary action" },
      { name: "Volt", hex: "#D7FF2F", use: "Highlights" },
      { name: "Hot coral", hex: "#FF4D5E", use: "Warnings" },
      { name: "Mist", hex: "#DDE6FF", use: "Text" },
    ],
    buttons: { primary: "Generate sweat", secondary: "Swap equipment", ghost: "Save template" },
    bg: "#070A1A",
    panel: "#111735",
    panelAlt: "#17224A",
    text: "#DDE6FF",
    muted: "#94A3C7",
    accent: "#245BFF",
    accent2: "#D7FF2F",
    border: "rgba(221,230,255,0.14)",
    tradeoffs: ["Most memorable on mobile", "Strong for streaks and challenge mechanics", "Can become gimmicky if overused"],
  },
];

const workoutBlocks = ["Primer", "Power", "Engine", "Armor", "Cooldown"];
const gallery = ["4 week shoulder rebuild", "Hotel room conditioning", "Heavy legs, light bag day"];

function Palette({ direction }: { direction: Direction }) {
  return (
    <div className="grid gap-3 sm:grid-cols-5">
      {direction.palette.map((color) => (
        <div key={color.hex} className="rounded-3xl border p-3" style={{ borderColor: direction.border, background: direction.panelAlt }}>
          <div className="mb-4 h-16 rounded-2xl border" style={{ background: color.hex, borderColor: direction.border }} />
          <p className="text-sm font-black uppercase tracking-[0.18em]" style={{ color: direction.text }}>{color.name}</p>
          <p className="mt-1 font-mono text-xs" style={{ color: direction.muted }}>{color.hex}</p>
          <p className="mt-2 text-xs" style={{ color: direction.muted }}>{color.use}</p>
        </div>
      ))}
    </div>
  );
}

function Buttons({ direction }: { direction: Direction }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <button className="rounded-full px-5 py-4 text-sm font-black uppercase tracking-[0.16em] shadow-2xl" style={{ background: direction.accent, color: "#FFFFFF" }}>{direction.buttons.primary}</button>
      <button className="rounded-full border px-5 py-4 text-sm font-black uppercase tracking-[0.16em]" style={{ borderColor: direction.border, color: direction.text, background: direction.panelAlt }}>{direction.buttons.secondary}</button>
      <button className="rounded-full px-5 py-4 text-sm font-black uppercase tracking-[0.16em]" style={{ color: direction.accent2 }}>{direction.buttons.ghost}</button>
    </div>
  );
}

function ChatMock({ direction }: { direction: Direction }) {
  return (
    <div className="overflow-hidden rounded-[2rem] border" style={{ borderColor: direction.border, background: direction.panel }}>
      <div className="flex items-center justify-between border-b p-4" style={{ borderColor: direction.border }}>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: direction.accent2 }}>AI builder</p>
          <h3 className="text-xl font-black" style={{ color: direction.text }}>Today&apos;s constraints</h3>
        </div>
        <div className="rounded-full px-3 py-1 text-xs font-black" style={{ background: direction.accent, color: "#fff" }}>Live</div>
      </div>
      <div className="space-y-3 p-4">
        <div className="max-w-[85%] rounded-3xl rounded-tl-md p-4" style={{ background: direction.panelAlt, color: direction.text }}>
          I&apos;ve got 35 minutes, no rack, left shoulder still touchy. Need boxing S&C, not random burpees.
        </div>
        <div className="ml-auto max-w-[88%] rounded-3xl rounded-tr-md p-4" style={{ background: direction.accent, color: "#fff" }}>
          Built around legs, trunk rotation, scap control, and low-risk conditioning. No overhead pressing today.
        </div>
        <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs font-black uppercase tracking-[0.12em]">
          {['35 min', 'RPE 7', 'Shoulder safe'].map((item) => <div key={item} className="rounded-2xl border p-3" style={{ borderColor: direction.border, color: direction.text }}>{item}</div>)}
        </div>
      </div>
    </div>
  );
}

function WorkoutMock({ direction }: { direction: Direction }) {
  return (
    <div className="rounded-[2rem] border p-4" style={{ borderColor: direction.border, background: direction.panel }}>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: direction.accent2 }}>Generated workout</p>
          <h3 className="mt-1 text-3xl font-black tracking-tight" style={{ color: direction.text }}>Boxer Engine 35</h3>
        </div>
        <div className="rounded-2xl px-4 py-3 text-right" style={{ background: direction.panelAlt }}>
          <p className="font-mono text-2xl font-black" style={{ color: direction.accent2 }}>87</p>
          <p className="text-xs uppercase tracking-[0.16em]" style={{ color: direction.muted }}>fit score</p>
        </div>
      </div>
      <div className="space-y-3">
        {workoutBlocks.map((block, index) => (
          <div key={block} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-3xl border p-3" style={{ borderColor: direction.border, background: direction.panelAlt }}>
            <div className="flex size-10 items-center justify-center rounded-2xl font-black" style={{ background: index === 2 ? direction.accent : direction.bg, color: index === 2 ? "#fff" : direction.text }}>{index + 1}</div>
            <div>
              <p className="font-black" style={{ color: direction.text }}>{block}</p>
              <p className="text-sm" style={{ color: direction.muted }}>{index === 0 ? "Mobility, tissue prep, movement quality" : index === 1 ? "Explosive legs and rotational power" : index === 2 ? "Intervals matched to boxing rounds" : index === 3 ? "Neck, trunk, fascia, shoulder capacity" : "Breathing and downshift"}</p>
            </div>
            <p className="font-mono text-sm" style={{ color: direction.accent2 }}>{index === 0 ? "06m" : index === 4 ? "05m" : "08m"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function GalleryMock({ direction }: { direction: Direction }) {
  return (
    <div className="rounded-[2rem] border p-4" style={{ borderColor: direction.border, background: direction.panel }}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: direction.accent2 }}>Community gallery</p>
          <h3 className="text-2xl font-black" style={{ color: direction.text }}>Members are building</h3>
        </div>
        <span className="rounded-full px-3 py-1 text-xs font-black" style={{ background: direction.panelAlt, color: direction.muted }}>Proof feed</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {gallery.map((item, index) => (
          <article key={item} className="min-h-44 rounded-3xl border p-4" style={{ borderColor: direction.border, background: `linear-gradient(145deg, ${direction.panelAlt}, ${direction.bg})` }}>
            <div className="mb-12 h-2 w-16 rounded-full" style={{ background: index === 1 ? direction.accent : direction.accent2 }} />
            <p className="font-black" style={{ color: direction.text }}>{item}</p>
            <p className="mt-2 text-sm" style={{ color: direction.muted }}>{index === 0 ? "Saved by 42 members" : index === 1 ? "Built for travel weeks" : "Coach approved variation"}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

function ComponentCards({ direction }: { direction: Direction }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="rounded-[2rem] border p-5" style={{ borderColor: direction.border, background: direction.panel }}>
        <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: direction.accent2 }}>Readiness</p>
        <div className="mt-8 flex items-end justify-between">
          <p className="font-mono text-6xl font-black" style={{ color: direction.text }}>74%</p>
          <p className="rounded-full px-3 py-1 text-xs font-black" style={{ background: direction.accent2, color: direction.bg }}>Train</p>
        </div>
        <p className="mt-4 text-sm" style={{ color: direction.muted }}>Lower volume on pressing. Push legs and engine.</p>
      </div>
      <div className="rounded-[2rem] border p-5" style={{ borderColor: direction.border, background: direction.panel }}>
        <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: direction.accent2 }}>Plan card</p>
        <h3 className="mt-8 text-2xl font-black" style={{ color: direction.text }}>3 day microcycle</h3>
        <p className="mt-3 text-sm" style={{ color: direction.muted }}>Power today, recovery tomorrow, boxing-specific conditioning after sparring.</p>
      </div>
      <div className="rounded-[2rem] border p-5" style={{ borderColor: direction.border, background: direction.panel }}>
        <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: direction.accent2 }}>Coach note</p>
        <blockquote className="mt-8 text-xl font-black leading-tight" style={{ color: direction.text }}>&ldquo;Strong work. Next time film the split squat from the side.&rdquo;</blockquote>
      </div>
    </div>
  );
}

function DesignDeck({ direction }: { direction: Direction }) {
  return (
    <section id={direction.id} className="overflow-hidden rounded-[2.5rem] border" style={{ background: direction.bg, borderColor: direction.border, color: direction.text }}>
      <div className="grid gap-8 p-5 sm:p-8 lg:grid-cols-[0.95fr_1.05fr] lg:p-10">
        <div className="flex flex-col justify-between gap-10">
          <div>
            <div className="mb-5 flex flex-wrap gap-2">
              <span className="rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.2em]" style={{ borderColor: direction.border, color: direction.muted }}>{direction.label}</span>
              <span className="rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.2em]" style={{ background: direction.accent2, color: direction.bg }}>{direction.recommendation}</span>
            </div>
            <h2 className="max-w-3xl text-5xl font-black leading-[0.92] tracking-[-0.06em] sm:text-7xl">{direction.name}</h2>
            <p className="mt-5 max-w-xl text-lg leading-7" style={{ color: direction.muted }}>{direction.positioning}</p>
            <p className="mt-4 max-w-xl text-sm font-bold uppercase tracking-[0.18em]" style={{ color: direction.accent2 }}>{direction.vibe}</p>
          </div>
          <div className="rounded-[2rem] border p-5" style={{ borderColor: direction.border, background: direction.panel }}>
            <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: direction.accent2 }}>Type system</p>
            <p className="mt-3 text-lg font-black" style={{ color: direction.text }}>{direction.typography}</p>
            <p className="mt-4 text-sm" style={{ color: direction.muted }}>Use giant confident headings, short plain-English labels, and enough contrast that Jordan can review it without squinting like he&apos;s reading a dodgy takeaway menu.</p>
          </div>
        </div>
        <div className="rounded-[2rem] border p-4" style={{ borderColor: direction.border, background: `radial-gradient(circle at top right, ${direction.accent}55, transparent 35%), ${direction.panel}` }}>
          <ChatMock direction={direction} />
        </div>
      </div>

      <div className="space-y-8 border-t p-5 sm:p-8 lg:p-10" style={{ borderColor: direction.border }}>
        <div>
          <SectionTitle direction={direction} kicker="Palette" title="Colours with jobs, not decoration" />
          <Palette direction={direction} />
        </div>
        <div>
          <SectionTitle direction={direction} kicker="Components" title="Buttons, cards, and product surfaces" />
          <Buttons direction={direction} />
          <div className="mt-4"><ComponentCards direction={direction} /></div>
        </div>
        <div className="grid gap-5 xl:grid-cols-2">
          <div>
            <SectionTitle direction={direction} kicker="Workout page" title="Generated plan mock" />
            <WorkoutMock direction={direction} />
          </div>
          <div>
            <SectionTitle direction={direction} kicker="Community" title="Gallery mock" />
            <GalleryMock direction={direction} />
          </div>
        </div>
        <div className="rounded-[2rem] border p-5" style={{ borderColor: direction.border, background: direction.panel }}>
          <SectionTitle direction={direction} kicker="Tradeoffs" title="What Jordan should know" />
          <div className="grid gap-3 sm:grid-cols-3">
            {direction.tradeoffs.map((tradeoff) => (
              <div key={tradeoff} className="rounded-3xl border p-4 text-sm font-bold" style={{ borderColor: direction.border, background: direction.panelAlt, color: direction.text }}>{tradeoff}</div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionTitle({ direction, kicker, title }: { direction: Direction; kicker: string; title: string }) {
  return (
    <div className="mb-4">
      <p className="text-xs font-black uppercase tracking-[0.22em]" style={{ color: direction.accent2 }}>{kicker}</p>
      <h3 className="mt-1 text-2xl font-black tracking-tight" style={{ color: direction.text }}>{title}</h3>
    </div>
  );
}

export default function DesignDecksPage() {
  return (
    <main className="min-h-screen bg-[#05070A] px-4 py-6 text-white sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 sm:p-8 lg:p-10">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#B8FF3D]">Oracle Conditioning</p>
          <div className="mt-4 grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <h1 className="max-w-5xl text-5xl font-black leading-[0.92] tracking-[-0.06em] sm:text-7xl lg:text-8xl">Brand and UI design decks</h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">Three live Next.js/Tailwind design directions for the premium AI S&C workout builder. Built mobile-first, but wide enough for desktop review.</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">My take</p>
              <p className="mt-3 text-2xl font-black text-white">Pick Performance Lab as the base, steal Fight Science Club&apos;s proof/community warmth, and keep Neon Corner for campaign moments.</p>
            </div>
          </div>
          <nav className="mt-6 flex flex-wrap gap-3">
            {directions.map((direction) => (
              <a key={direction.id} href={`#${direction.id}`} className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-black uppercase tracking-[0.14em] text-white hover:bg-white/[0.12]">{direction.name}</a>
            ))}
          </nav>
        </header>
        <div className="space-y-8">
          {directions.map((direction) => <DesignDeck key={direction.id} direction={direction} />)}
        </div>
      </div>
    </main>
  );
}
