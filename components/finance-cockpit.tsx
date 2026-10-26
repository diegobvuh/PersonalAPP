"use client";

import { ChangeEvent, CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowDownLeft,
  ArrowLeft,
  ArrowRight,
  Bell,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  CircleDollarSign,
  Cloud,
  FileText,
  Folder,
  FolderOpen,
  Gauge,
  LayoutGrid,
  Lightbulb,
  LockKeyhole,
  MoreHorizontal,
  Pause,
  PiggyBank,
  Play,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Upload,
  WalletCards,
  Wifi,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Allocation,
  cashflowData,
  holdings,
  initialAllocations,
  portfolioData,
  spendingData,
  transactions,
} from "@/lib/finance-data";
import { supabase, supabaseConfigured } from "@/lib/supabase";

type View = "home" | "paycheck" | "activity" | "portfolio" | "documents";

const modules: { id: View; label: string; kicker: string; icon: typeof Gauge; tone: string }[] = [
  { id: "home", label: "Overview", kicker: "Your money today", icon: Gauge, tone: "blue" },
  { id: "paycheck", label: "Paycheck", kicker: "Plan your income", icon: CircleDollarSign, tone: "green" },
  { id: "activity", label: "Activity", kicker: "No transactions yet", icon: Activity, tone: "orange" },
  { id: "portfolio", label: "Portfolio", kicker: "Connect an account", icon: TrendingUp, tone: "purple" },
  { id: "documents", label: "Job files", kicker: "No documents yet", icon: BriefcaseBusiness, tone: "cyan" },
];

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function useSyncedState<T>(key: string, initialValue: T) {
  const [value, setValue] = useState(initialValue);
  const initialValueRef = useRef(initialValue);
  const ready = useRef(false);
  const cloudUserId = useRef<string | null>(null);
  const storageKey = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    ready.current = false;

    const scopedKey = (userId: string | null) => userId ? `finance:user:${userId}:${key}` : `finance:guest:${key}`;

    const hydrateCloud = async (userId: string) => {
      if (!supabase) return;
      cloudUserId.current = userId;
      const userStorageKey = scopedKey(userId);
      storageKey.current = userStorageKey;
      let localValue = initialValueRef.current;
      const stored = window.localStorage.getItem(userStorageKey);
      if (stored) {
        try { localValue = JSON.parse(stored) as T; } catch { /* keep blank default */ }
      }
      const { data } = await supabase.from("user_app_state").select("value").eq("user_id", userId).eq("data_key", key).maybeSingle();
      if (!active) return;
      if (data?.value !== undefined) {
        setValue(data.value as T);
        window.localStorage.setItem(userStorageKey, JSON.stringify(data.value));
      } else {
        setValue(localValue);
        window.localStorage.setItem(userStorageKey, JSON.stringify(localValue));
        await supabase.from("user_app_state").upsert({ user_id: userId, data_key: key, value: localValue, updated_at: new Date().toISOString() });
      }
      ready.current = true;
    };

    if (!supabase) {
      storageKey.current = scopedKey(null);
      setValue(initialValueRef.current);
      ready.current = true;
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session?.user.id) hydrateCloud(data.session.user.id);
      else {
        cloudUserId.current = null;
        storageKey.current = scopedKey(null);
        setValue(initialValueRef.current);
        ready.current = true;
      }
    });
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user.id) hydrateCloud(session.user.id);
      else {
        cloudUserId.current = null;
        storageKey.current = scopedKey(null);
        setValue(initialValueRef.current);
        ready.current = true;
      }
    });
    return () => { active = false; authListener.subscription.unsubscribe(); };
  }, [key]);

  useEffect(() => {
    if (!ready.current || !storageKey.current) return;
    window.localStorage.setItem(storageKey.current, JSON.stringify(value));
    if (!cloudUserId.current || !supabase) return;
    const client = supabase;
    const userId = cloudUserId.current;
    const timer = window.setTimeout(() => {
      client.from("user_app_state").upsert({ user_id: userId, data_key: key, value, updated_at: new Date().toISOString() }).then(({ error }) => {
        if (error) console.error("Supabase sync failed", error.message);
      });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [key, value]);

  return [value, setValue] as const;
}

export function FinanceCockpit() {
  const [view, setView] = useState<View>("home");
  const [wheelIndex, setWheelIndex] = useState(0);
  const [smartMode, setSmartMode] = useSyncedState("finance-v2-smart-mode", true);
  const [soundOn, setSoundOn] = useSyncedState("finance-v2-sound-mode", false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [accountUserId, setAccountUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(!supabaseConfigured);
  const [authError, setAuthError] = useState<string | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const wheelStart = useRef<number | null>(null);
  const wheelElement = useRef<HTMLDivElement | null>(null);
  const lastWheelAngle = useRef<number | null>(null);
  const wheelTravel = useRef(0);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [wheelDragging, setWheelDragging] = useState(false);
  const [reserveMode, setReserveMode] = useSyncedState("finance-v2-reserve-mode", 1);
  const [displayLevel, setDisplayLevel] = useSyncedState("finance-v2-display-level", 1);
  const [syncing, setSyncing] = useState(false);
  const reserveLevels = [300, 420, 650];
  const displayLevels = [0.82, 1, 1.12];
  const reserveTarget = reserveLevels[reserveMode] ?? reserveLevels[1];

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setAccountEmail(data.session?.user.email ?? null);
      setAccountUserId(data.session?.user.id ?? null);
      setAuthChecked(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setAccountEmail(session?.user.email ?? null);
      setAccountUserId(session?.user.id ?? null);
      setAuthChecked(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const openCommands = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }
    };
    window.addEventListener("keydown", openCommands);
    return () => window.removeEventListener("keydown", openCommands);
  }, []);

  const selectModule = (next: View) => {
    playTone();
    setView(next);
    setWheelIndex(Math.max(0, modules.findIndex((module) => module.id === next)));
  };

  const rotateWheel = (direction: number) => {
    playTone(soundOn, 520, 0.025);
    setWheelIndex((current) => (current + direction + modules.length) % modules.length);
  };

  const playTone = (enabled = soundOn, frequency = 660, duration = 0.045) => {
    if (!enabled) return;
    const AudioContextClass = window.AudioContext;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.035, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
    oscillator.addEventListener("ended", () => context.close());
  };

  const wheelAngle = (clientX: number, clientY: number) => {
    const bounds = wheelElement.current?.getBoundingClientRect();
    if (!bounds) return 0;
    return Math.atan2(clientY - (bounds.top + bounds.height / 2), clientX - (bounds.left + bounds.width / 2)) * 180 / Math.PI;
  };

  const beginWheelTurn = (event: React.PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    lastWheelAngle.current = wheelAngle(event.clientX, event.clientY);
    wheelTravel.current = 0;
    setWheelDragging(true);
  };

  const turnWheel = (event: React.PointerEvent<HTMLDivElement>) => {
    if (lastWheelAngle.current === null) return;
    const nextAngle = wheelAngle(event.clientX, event.clientY);
    let delta = nextAngle - lastWheelAngle.current;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    lastWheelAngle.current = nextAngle;
    wheelTravel.current += delta;
    setWheelRotation((current) => current + delta);

    const detents = Math.trunc(wheelTravel.current / 24);
    if (detents !== 0) {
      rotateWheel(detents);
      wheelTravel.current -= detents * 24;
    }
  };

  const finishWheelTurn = () => {
    lastWheelAngle.current = null;
    wheelTravel.current = 0;
    setWheelDragging(false);
  };

  const handleWheel = (event: React.WheelEvent) => {
    if (wheelStart.current && Date.now() - wheelStart.current < 180) return;
    wheelStart.current = Date.now();
    rotateWheel(event.deltaY > 0 ? 1 : -1);
  };

  const refreshAccounts = () => {
    if (syncing) return;
    playTone(soundOn, 760, 0.06);
    setSyncing(true);
    setToast("Accounts refreshed · balances are current");
    window.setTimeout(() => setSyncing(false), 900);
  };

  const signInWithGoogle = async () => {
    if (!supabase) return;
    setAuthError(null);
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
    if (error) setAuthError(error.message);
  };

  const signOut = async () => {
    await supabase?.auth.signOut();
    setAccountUserId(null);
    setAccountEmail(null);
    setAccountOpen(false);
    setToast("Signed out");
  };

  if (!supabaseConfigured) return <AuthGate mode="setup" onSignIn={signInWithGoogle} error={authError} />;
  if (!authChecked) return <AuthGate mode="loading" onSignIn={signInWithGoogle} error={authError} />;
  if (!accountUserId) return <AuthGate mode="signin" onSignIn={signInWithGoogle} error={authError} />;

  return (
    <main className="app-shell">
      <div className="aero-orb orb-one" />
      <div className="aero-orb orb-two" />
      <header className="topbar">
        <button className="brand" onClick={() => selectModule("home")} aria-label="Go home">
          <span className="brand-orb"><span /></span>
          <span><b>My cockpit</b><small>Personal finance</small></span>
        </button>
        <div className="system-status">
          <button className={`status-pill ${accountEmail ? "synced" : ""}`} onClick={() => setAccountOpen((open) => !open)}><Cloud size={14} /> {accountEmail ? "Cloud synced" : supabaseConfigured ? "Sign in to sync" : "Local mode"}</button>
          <span className="icon-status"><Wifi size={16} /><span>3</span></span>
          <button className="top-icon" aria-label="Notifications"><Bell size={18} /><i /></button>
          <button className="avatar" onClick={() => setAccountOpen((open) => !open)} aria-label="Open account">{accountEmail ? accountEmail.slice(0,2).toUpperCase() : "DB"}</button>
        </div>
      </header>
      {accountOpen && <div className="account-popover">
        <span className="account-orb"><Cloud size={17}/></span>
        <div className="account-copy"><b>{accountEmail ?? (supabaseConfigured ? "Connect your account" : "Supabase setup needed")}</b><small>{accountEmail ? "Your finance data syncs automatically." : supabaseConfigured ? "Use Google to keep your data private and portable." : "Add the two public values from .env.example."}</small></div>
        {accountEmail ? <button className="account-action secondary" onClick={signOut}>Sign out</button> : supabaseConfigured ? <button className="account-action" onClick={signInWithGoogle}>Continue with Google</button> : <span className="account-code">NEXT_PUBLIC_SUPABASE_…</span>}
      </div>}

      <div className="workspace">
        <aside className="cockpit-panel">
          <div className="console-label"><span>PERSONAL SYSTEM</span><b>FINANCE DECK</b></div>
          <div className="device-chassis">
            <span className="case-screw screw-nw" /><span className="case-screw screw-ne" />
            <span className="case-screw screw-sw" /><span className="case-screw screw-se" />
            <div className="device-screen">
              <div className="screen-glare" />
              <div className="screen-bar"><span>FINANCE</span><span>{wheelIndex + 1} / {modules.length}</span></div>
              <div className="mini-menu">
                {modules.map((module, index) => (
                  <button key={module.id} className={index === wheelIndex ? "selected" : ""} onClick={() => selectModule(module.id)}>
                    <module.icon size={15} />
                    <span>{module.label}</span>
                    <ChevronRight size={14} />
                  </button>
                ))}
              </div>
            </div>

            <section className="systems-console" aria-label="Finance system controls">
              <header className="systems-title"><span>FINANCE CONTROL</span><b>SYS 01</b></header>
              <div className="systems-readout" aria-live="polite">
                <span><small>RESERVE</small><b>${reserveTarget}</b></span>
                <span><small>SMART PLAN</small><b className={smartMode ? "readout-good" : "readout-idle"}>{smartMode ? "ACTIVE" : "PAUSED"}</b></span>
              </div>
              <div className="systems-hardware">
                <button className={`toggle-control ${smartMode ? "is-on" : ""}`} onClick={() => { playTone(); setSmartMode(!smartMode); setToast(`Smart mode ${smartMode ? "paused" : "active"}`); }} aria-label="Toggle smart recommendations" aria-pressed={smartMode}>
                  <span className="toggle-label">SMART</span><i className="toggle-stem" /><small>{smartMode ? "ON" : "OFF"}</small>
                </button>
                <button className={`toggle-control ${soundOn ? "is-on" : ""}`} onClick={() => { const next = !soundOn; setSoundOn(next); playTone(next, 720, 0.07); }} aria-label="Toggle control sounds" aria-pressed={soundOn}>
                  <span className="toggle-label">AUDIO</span><i className="toggle-stem" /><small>{soundOn ? "ON" : "OFF"}</small>
                </button>
                <button className={`reserve-lever reserve-${reserveMode}`} onClick={() => { playTone(); setReserveMode((reserveMode + 1) % reserveLevels.length); }} aria-label={`Reserve target ${money.format(reserveTarget)}. Press to change.`}>
                  <span className="lever-track"><i /></span><span className="lever-label">RESERVE</span><small>{["LOW", "STD", "MAX"][reserveMode]}</small>
                </button>
                <button className="dimmer-control" onClick={() => { playTone(soundOn, 580, 0.035); setDisplayLevel((displayLevel + 1) % displayLevels.length); }} aria-label={`Display brightness ${Math.round(displayLevels[displayLevel] * 100)} percent`}>
                  <i style={{ transform: `rotate(${-42 + displayLevel * 42}deg)` }} /><span>DISPLAY</span><small>{["DIM", "NORM", "HIGH"][displayLevel]}</small>
                </button>
                <button className={`sync-control ${syncing ? "is-syncing" : ""}`} onClick={refreshAccounts} aria-label="Refresh account balances">
                  <RefreshCw size={12} /><span>SYNC</span><small>{syncing ? "BUSY" : "PULL"}</small>
                </button>
              </div>
            </section>

            <div
              ref={wheelElement}
              className={`click-wheel ${wheelDragging ? "turning" : ""}`}
              onWheel={handleWheel}
              onPointerDown={beginWheelTurn}
              onPointerMove={turnWheel}
              onPointerUp={finishWheelTurn}
              onPointerCancel={finishWheelTurn}
              style={{ "--wheel-rotation": `${wheelRotation}deg` } as CSSProperties}
              aria-label="Rotary navigation wheel"
            >
              <span className="wheel-grain" />
              <button className="wheel-menu" onClick={() => selectModule("home")}>MENU</button>
              <button className="wheel-prev" onClick={() => rotateWheel(-1)} aria-label="Previous"><ArrowLeft size={17} /><span /></button>
              <button className="wheel-next" onClick={() => rotateWheel(1)} aria-label="Next"><span /><ArrowRight size={17} /></button>
              <button className="wheel-play" onClick={() => setSmartMode(!smartMode)} aria-label="Pause smart mode">{smartMode ? <Pause size={14} /> : <Play size={14} />}</button>
              <button className="wheel-center" onClick={() => selectModule(modules[wheelIndex].id)} aria-label={`Open ${modules[wheelIndex].label}`}><span>OK</span></button>
            </div>
            <div className="wheel-hint"><span /> SPIN TO SELECT · PRESS OK</div>
            <div className="device-footer"><LockKeyhole size={12} /> Local prototype · encrypted cloud later</div>
          </div>
        </aside>

        <section className="monitor-unit" aria-label="Finance workstation monitor" style={{ "--screen-level": displayLevels[displayLevel] } as CSSProperties}>
          <div className="monitor-bezel">
            <span className="monitor-camera" />
            <div className="monitor-status-bank" aria-label="Display status indicators"><i /><i className={smartMode ? "" : "amber"} /><i className={soundOn ? "blue" : ""} /></div>
            <div className="content-stage">
              <div className="monitor-glass" />
              <div className="content-toolbar">
                <nav className="breadcrumb"><LayoutGrid size={15} /><span>Finance</span><ChevronRight size={14} /><b>{modules.find((item) => item.id === view)?.label}</b></nav>
                <div className="toolbar-actions">
                  <button className="search-button" onClick={() => setCommandOpen(true)}><Search size={16} /><span>Find anything</span><kbd>⌘ K</kbd></button>
                  <button className="round-button" aria-label="Account and settings" onClick={() => setAccountOpen((open) => !open)}><Settings size={17} /></button>
                </div>
              </div>
              <div key={view} className="view-enter">
                {view === "home" && <Overview onNavigate={selectModule} smartMode={smartMode} setToast={setToast} />}
                {view === "paycheck" && <PaycheckView setToast={setToast} />}
                {view === "activity" && <ActivityView />}
                {view === "portfolio" && <PortfolioView />}
                {view === "documents" && <DocumentsView setToast={setToast} />}
              </div>
            </div>
            <div className="monitor-chin"><span>PERSONAL DISPLAY</span><b>FINANCE OS</b><i aria-label="Monitor powered on" /></div>
          </div>
        </section>
      </div>

      {commandOpen && <CommandPalette onClose={() => setCommandOpen(false)} onNavigate={(next) => { selectModule(next); setCommandOpen(false); }} />}
      {toast && <div className="toast"><Check size={16} />{toast}</div>}
    </main>
  );
}

function AuthGate({ mode, onSignIn, error }: { mode: "setup" | "loading" | "signin"; onSignIn: () => void; error: string | null }) {
  const isLoading = mode === "loading";
  const isSetup = mode === "setup";
  return <main className="auth-gate"><div className="auth-card"><span className="auth-mark"><Cloud size={24} /></span><span className="eyebrow">PRIVATE FINANCE DECK</span><h1>{isLoading ? "Checking your account" : isSetup ? "Supabase setup needed" : "Sign in to continue"}</h1><p>{isLoading ? "Preparing your private workspace…" : isSetup ? "Add the Supabase public values to .env.local before opening the app." : "Your accounts, documents, and financial data are private to your account."}</p>{!isLoading && !isSetup && <button className="account-action auth-signin" onClick={onSignIn}>Continue with Google</button>}{error && <small className="auth-error">{error}</small>}</div></main>;
}

function Overview({ onNavigate, smartMode, setToast }: { onNavigate: (view: View) => void; smartMode: boolean; setToast: (text: string) => void }) {
  return (
    <div className="overview-page">
      <div className="hero-row">
        <div>
          <span className="eyebrow">PRIVATE FINANCE WORKSPACE</span>
          <h1>Welcome to your cockpit.</h1>
          <p>Connect an account or add your first piece of information to get started.</p>
        </div>
      </div>

      <section className="launcher-grid">
        {modules.slice(1).map((module) => (
          <button className={`launcher-tile ${module.tone}`} key={module.id} onClick={() => onNavigate(module.id)}>
            <span className="tile-glow" />
            <span className="launcher-icon"><module.icon size={28} strokeWidth={1.8} /></span>
            <span className="launcher-copy"><b>{module.label}</b><small>{module.kicker}</small></span>
            <ChevronRight className="tile-arrow" size={18} />
          </button>
        ))}
      </section>

      <section className="metric-row">
        <MetricCard label="Available to spend" value="$0" delta="Connect an account to begin" icon={<WalletCards size={18} />} />
        <MetricCard label="Net worth" value="$0" delta="No accounts connected" icon={<TrendingUp size={18} />} />
        <MetricCard label="Monthly cash flow" value="$0" delta="Waiting for your first account" icon={<PiggyBank size={18} />} />
      </section>

      <section className="dashboard-grid">
        <article className="panel cashflow-panel">
          <PanelHeader title="Cash flow" subtitle="Six month trend" action="Details" />
          <div className="chart-summary"><span><i className="income-dot" />Income <b>$0</b></span><span><i className="spend-dot" />Spending <b>$0</b></span></div>
          <div className="cashflow-chart">
            {cashflowData.length ? <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cashflowData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                <defs><linearGradient id="income" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4d95ff" stopOpacity={0.28} /><stop offset="100%" stopColor="#4d95ff" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid stroke="#dce7ef" strokeDasharray="3 5" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#789" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#8a9ba9" }} tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip contentStyle={{ borderRadius: 14, border: "1px solid #dce7ef", boxShadow: "0 12px 32px #2e526622" }} formatter={(value) => money.format(Number(value))} />
                <Area type="monotone" dataKey="income" stroke="#4d95ff" strokeWidth={3} fill="url(#income)" />
                <Line type="monotone" dataKey="spending" stroke="#69c487" strokeWidth={2.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer> : <div className="empty-state">Connect an account to see your cash flow.</div>}
          </div>
        </article>

        <article className="panel spending-panel">
          <PanelHeader title="Where it went" subtitle="October spending" action="Budget" />
          <div className="donut-wrap">
            <div className="donut-chart">{spendingData.length ? <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={spendingData} dataKey="value" innerRadius={53} outerRadius={71} paddingAngle={4} stroke="none">{spendingData.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie></PieChart></ResponsiveContainer> : <div className="empty-state">No spending yet.</div>}<div className="donut-center"><b>$0</b><small>spent</small></div></div>
            <div className="legend">{spendingData.slice(0, 4).map((item) => <span key={item.name}><i style={{ background: item.color }} />{item.name}<b>{Math.round(item.value / 32.5)}%</b></span>)}</div>
          </div>
        </article>

        <article className="panel insight-panel">
          <PanelHeader title="Smart briefing" subtitle={smartMode ? "Watching your cash flow" : "Smart mode is paused"} />
          {smartMode ? <>
            <div className="insight-icon"><Lightbulb size={21} /></div>
            <h3>Connect an account to unlock smart planning</h3>
            <p>Your private recommendations will appear here after your first account is connected.</p>
            <div className="confidence"><span><ShieldCheck size={14} /> High confidence</span><span>Based on 4 recurring bills</span></div>
            <div className="insight-actions"><button onClick={() => setToast("Suggestion approved and logged")}>Approve plan</button><button onClick={() => setToast("Suggestion dismissed")}>Not now</button></div>
          </> : <div className="paused-state"><Pause size={26} /><p>Use the green cockpit button to resume recommendations.</p></div>}
        </article>

        <article className="panel recent-panel">
          <PanelHeader title="Recent activity" subtitle="Across 3 connected accounts" action="See all" />
          <div className="transactions">{transactions.length ? transactions.slice(0, 4).map((transaction) => <TransactionRow key={transaction.id} transaction={transaction} />) : <div className="empty-state">No activity yet. Connect an account to get started.</div>}</div>
        </article>
      </section>
    </div>
  );
}

function MetricCard({ label, value, delta, positive, icon }: { label: string; value: string; delta: string; positive?: boolean; icon: React.ReactNode }) {
  return <article className="metric-card"><span className="metric-icon">{icon}</span><div><small>{label}</small><strong>{value}</strong><span className={positive ? "positive" : ""}>{delta}</span></div></article>;
}

function PanelHeader({ title, subtitle, action }: { title: string; subtitle: string; action?: string }) {
  return <header className="panel-header"><div><h2>{title}</h2><p>{subtitle}</p></div>{action && <button>{action}<ChevronRight size={14} /></button>}</header>;
}

function TransactionRow({ transaction }: { transaction: (typeof transactions)[number] }) {
  return <div className="transaction-row"><span className="transaction-icon">{transaction.icon}</span><div><b>{transaction.merchant}</b><small>{transaction.category}{transaction.recurring ? " · Recurring" : ""}</small></div><span className="transaction-date">{transaction.date}</span><strong className={transaction.amount > 0 ? "positive" : ""}>{transaction.amount > 0 ? "+" : ""}{money.format(transaction.amount)}</strong></div>;
}

function PaycheckView({ setToast }: { setToast: (text: string) => void }) {
  const paycheck = 0;
  const [allocations, setAllocations] = useSyncedState<Allocation[]>("finance-v2-allocations", initialAllocations);
  const allocated = allocations.reduce((sum, item) => sum + item.amount, 0);
  const remaining = paycheck - allocated;

  const updateAmount = (id: string, amount: number) => setAllocations((items) => items.map((item) => item.id === id ? { ...item, amount: Math.max(0, Math.min(paycheck, amount)) } : item));
  const applyRecommended = () => {
    setAllocations(initialAllocations);
    setToast("Add a paycheck amount to create a plan");
  };

  return <div className="subpage">
    <div className="hero-row compact"><div><span className="eyebrow">NEXT MOVE</span><h1>Plan your paycheck</h1><p>Every dollar gets a clear job before you spend it.</p></div><button className="ghost-action" onClick={applyRecommended}><Sparkles size={16} /> Use smart plan</button></div>
    <div className="paycheck-layout">
      <section className="panel allocation-panel">
        <div className="paycheck-source"><span className="source-icon"><ArrowDownLeft /></span><div><small>NO PAYCHECK CONNECTED</small><h2>$0.00</h2><p>Connect an account or add income to start planning.</p></div></div>
        <div className="allocation-head"><div><h3>Give it a purpose</h3><p>Drag or type to fine-tune your plan.</p></div><span className={remaining < 0 ? "over" : ""}><b>{money.format(remaining)}</b> left to assign</span></div>
        <div className="allocation-list">
          {allocations.length ? allocations.map((item) => <div className="allocation-item" key={item.id}>
            <span className="allocation-icon" style={{ "--accent": item.color } as CSSProperties}>{item.icon}</span>
            <div className="allocation-control"><div><b>{item.label}</b><small>{item.amount >= item.target ? "Target covered" : `${money.format(item.target - item.amount)} below target`}</small></div><div className="slider-row"><input type="range" min="0" max={Math.min(1600, paycheck)} step="10" value={item.amount} onChange={(e) => updateAmount(item.id, Number(e.target.value))} style={{ "--fill": `${Math.min(100, item.amount / 16)}%`, "--accent": item.color } as CSSProperties} /><label>$<input inputMode="numeric" value={item.amount} onChange={(e) => updateAmount(item.id, Number(e.target.value) || 0)} /></label></div></div>
          </div>) : <div className="empty-state">Your paycheck plan will appear here after you connect an account.</div>}
        </div>
        <div className="allocation-footer"><span><i style={{ width: `${Math.max(0, Math.min(100, allocated / paycheck * 100))}%` }} /></span><div><b>{money.format(allocated)} assigned</b><small>of {money.format(paycheck)}</small></div><button disabled={remaining !== 0} onClick={() => setToast("Paycheck plan saved")}>Confirm plan</button></div>
      </section>
      <aside className="paycheck-side">
        <article className="panel projection-card"><span className="eyebrow">AFTER THIS PLAN</span><h3>Your November runway</h3><div className="runway-number">29<small>days covered</small></div><div className="projection-line"><span>Bills funded</span><b>100%</b></div><div className="projection-line"><span>Emergency fund</span><b>2.4 months</b></div><div className="projection-line"><span>Free to enjoy</span><b>{money.format(allocations.find((item) => item.id === "spend")?.amount || 0)}</b></div></article>
        <article className="smart-note"><Sparkles size={18} /><div><b>Why this plan?</b><p>It covers four bills, keeps your minimum cushion, and advances both savings goals.</p></div></article>
      </aside>
    </div>
  </div>;
}

function ActivityView() {
  const [filter, setFilter] = useState("All");
  const visible = filter === "All" ? transactions : transactions.filter((item) => filter === "Income" ? item.amount > 0 : item.category === filter);
  return <div className="subpage"><div className="hero-row compact"><div><span className="eyebrow">MONEY IN MOTION</span><h1>Activity</h1><p>Searchable, categorized, and easy to correct.</p></div><button className="primary-action"><Plus size={16} /> Add transaction</button></div>
    <section className="panel activity-panel"><div className="activity-tools"><div className="filter-tabs">{["All", "Income", "Groceries", "Utilities"].map((item) => <button className={filter === item ? "active" : ""} onClick={() => setFilter(item)} key={item}>{item}</button>)}</div><button className="round-button"><MoreHorizontal size={17} /></button></div><div className="transactions large">{visible.map((transaction) => <TransactionRow key={transaction.id} transaction={transaction} />)}{!visible.length && <div className="empty-state">No matching transactions.</div>}</div></section>
  </div>;
}

function PortfolioView() {
  return <div className="subpage"><div className="hero-row compact"><div><span className="eyebrow">INVESTMENT SNAPSHOT</span><h1>Your portfolio</h1><p>Connect an account to see your investments here.</p></div></div>
    <section className="portfolio-hero"><div><small>TOTAL INVESTED</small><h2>$0.00</h2><span>No connected investment accounts</span></div></section>
    <div className="portfolio-grid"><article className="panel holdings-panel"><PanelHeader title="Holdings" subtitle="No accounts connected"/><div className="empty-state">Your holdings will appear here once you connect an investment account.</div></article>
      <article className="panel allocation-chart"><PanelHeader title="Allocation" subtitle="Across your portfolio"/><div className="empty-state">No allocation data yet.</div></article></div>
  </div>;
}

type UploadedDocument = { name: string; type: string; size: string; date: string; status: string };
function DocumentsView({ setToast }: { setToast: (text: string) => void }) {
  const [documents, setDocuments] = useSyncedState<UploadedDocument[]>("finance-v2-documents", []);
  const [activeFolder, setActiveFolder] = useState("All documents");
  const [selectedName, setSelectedName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const folders = [
    { name: "All documents", match: () => true },
    { name: "Pay & payroll", match: (doc: UploadedDocument) => ["Pay stub", "Payroll"].includes(doc.type) },
    { name: "Tax records", match: (doc: UploadedDocument) => doc.type === "Tax" },
    { name: "Benefits", match: (doc: UploadedDocument) => doc.type === "Benefits" },
    { name: "Career files", match: (doc: UploadedDocument) => ["Career", "Employment"].includes(doc.type) },
    { name: "New uploads", match: (doc: UploadedDocument) => doc.type === "New upload" },
  ];
  const currentFolder = folders.find((folder) => folder.name === activeFolder) ?? folders[0];
  const visibleDocuments = documents.filter(currentFolder.match);
  const selectedDocument = visibleDocuments.find((doc) => doc.name === selectedName) ?? visibleDocuments[0] ?? documents[0];
  const upload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const cleanName = file.name.replace(/\.[^/.]+$/, "");
    setDocuments((items) => [{ name: cleanName, type: "New upload", size: `${Math.max(1, Math.round(file.size / 1024))} KB`, date: "Today", status: "Ready to review" }, ...items]);
    setActiveFolder("New uploads");
    setSelectedName(cleanName);
    setToast("Document analyzed and ready to review");
    event.target.value = "";
  };
  return <div className="subpage"><div className="hero-row compact"><div><span className="eyebrow">WORK VAULT</span><h1>Job documents</h1><p>Browse your work files like a personal media library.</p></div><button className="primary-action" onClick={() => fileRef.current?.click()}><Upload size={16}/> Upload file</button><input className="hidden-input" type="file" ref={fileRef} onChange={upload} accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"/></div>
    <section className="panel document-browser">
      <header className="library-bar"><div><span className="library-mark"><BriefcaseBusiness size={15}/></span><span><b>Work library</b><small>Private workspace · {documents.length} files</small></span></div><span className="library-sync"><i/> PRIVATE LIBRARY</span></header>
      <div className="library-layout">
        <aside className="folder-browser"><span className="folder-heading">LIBRARY</span>{folders.map((folder) => { const count = documents.filter(folder.match).length; const active = folder.name === activeFolder; return <button key={folder.name} className={active ? "active" : ""} onClick={() => setActiveFolder(folder.name)}>{active ? <FolderOpen size={15}/> : <Folder size={15}/>}<span>{folder.name}</span><small>{count}</small><ChevronRight size={13}/></button>; })}</aside>
        <div className="file-library">
          <div className="file-path"><span>WORK</span><ChevronRight size={12}/><b>{activeFolder.toUpperCase()}</b><small>{visibleDocuments.length} ITEMS</small></div>
          <div className="file-columns"><span>#</span><span>NAME</span><span>KIND</span><span>ADDED</span><span>STATUS</span></div>
          <div className="file-tracks">{visibleDocuments.map((doc, index) => <button className={`file-track ${selectedDocument?.name === doc.name ? "selected" : ""}`} key={`${doc.name}-${index}`} onClick={() => setSelectedName(doc.name)}><span className="track-number">{String(index + 1).padStart(2,"0")}</span><span className="track-file-icon"><FileText size={15}/></span><span className="track-name"><b>{doc.name}</b><small>{doc.size}</small></span><span>{doc.type}</span><span>{doc.date}</span><span className={doc.status.includes("Action") ? "track-status action" : "track-status"}>{doc.status}</span><ChevronRight className="track-chevron" size={14}/></button>)}{!visibleDocuments.length && <div className="library-empty"><Folder size={25}/><span>This folder is empty</span></div>}</div>
          {selectedDocument && <div className="selected-file-strip"><span className="selected-art"><FileText size={20}/></span><div><small>SELECTED DOCUMENT</small><b>{selectedDocument.name}</b><span>{selectedDocument.type} · {selectedDocument.size} · Added {selectedDocument.date}</span></div><button onClick={() => setToast(`${selectedDocument.name} opened`)}>OPEN <Play size={12} fill="currentColor"/></button></div>}
        </div>
      </div>
    </section>
    {!documents.length && <article className="document-smart"><Sparkles size={20}/><div><b>Your private document vault is ready</b><p>Upload your first document to keep it organized in this account.</p></div><button onClick={() => fileRef.current?.click()}>Upload now</button></article>}
  </div>;
}

function CommandPalette({ onClose, onNavigate }: { onClose: () => void; onNavigate: (view: View) => void }) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => modules.filter(item => item.label.toLowerCase().includes(query.toLowerCase())), [query]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler); return () => document.removeEventListener("keydown", handler);
  }, [onClose]);
  return <div className="command-overlay" onMouseDown={onClose}><div className="command-box" onMouseDown={(e) => e.stopPropagation()}><div className="command-search"><Search size={19}/><input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Jump to a module…"/><button onClick={onClose}><X size={17}/></button></div><div className="command-results">{results.map((item) => <button key={item.id} onClick={() => onNavigate(item.id)}><span className={`command-icon ${item.tone}`}><item.icon size={18}/></span><div><b>{item.label}</b><small>{item.kicker}</small></div><span>↵</span></button>)}</div></div></div>;
}
