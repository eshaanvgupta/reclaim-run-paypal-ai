import React, { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowUpRight,
  ArrowRight,
  ShoppingBag,
  X,
  Plus,
  Minus,
  ArrowLeft,
  Check,
  ShieldCheck,
  Zap,
  Box,
  SlidersHorizontal,
  Search,
  ChevronDown,
  Activity,
  LogOut,
  Menu,
  KeyRound,
  LoaderCircle,
  ExternalLink,
  Command,
  Mail,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Printer,
  RefreshCw,
} from 'lucide-react';
import '@fontsource/bungee/latin-400.css';
import '@fontsource/space-grotesk/latin-400.css';
import '@fontsource/space-grotesk/latin-500.css';
import '@fontsource/space-grotesk/latin-600.css';
import '@fontsource/space-grotesk/latin-700.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-500.css';
import { api, usd, cats, setCsrf, csrf, type Product, type Config } from './api';
import { ProductArt, Warehouse } from './art';
import './styles.css';
const Merchant = React.lazy(() => import('./merchant').then((m) => ({ default: m.Merchant })));
type CartLine = { productId: string; quantity: number };
export type Navigate = (path: string) => void;
const scenarios = [
  {
    title: 'The creator reset',
    tag: 'BUILD YOUR SETUP',
    description: 'Better light. Clearer sound. A desk that works as hard as you do.',
    budget: 16000,
    required: ['Lighting', 'Audio', 'Organization'],
    goal: 'Upgrade my creator desk with better lighting, audio, and cable organization. I already have a laptop.',
    category: 'Lighting',
    code: '01',
    color: 'lime',
  },
  {
    title: 'Office inventory rescue',
    tag: 'EQUIP YOUR TEAM',
    description: 'Small team, smarter workspace. Get the essentials in one run.',
    budget: 24000,
    required: ['Desk', 'Stationery', 'Organization'],
    quantity: 3,
    goal: 'Equip three remote workers with desk accessories, stationery, and organization.',
    category: 'Desk',
    code: '02',
    color: 'orange',
  },
  {
    title: 'The hobby vault',
    tag: 'MAKE SOMETHING',
    description: 'A fresh creative obsession. All the right tools to get started.',
    budget: 9500,
    required: ['Hobby', 'Stationery'],
    goal: 'Build a beginner hobby and sketching kit with stationery for my next creative project.',
    category: 'Hobby',
    code: '03',
    color: 'pink',
  },
];
function App() {
  const [path, setPath] = useState(location.pathname),
    [session, setSession] = useState<any>(null),
    [products, setProducts] = useState<Product[]>([]),
    [status, setStatus] = useState<any>({}),
    [cart, setCart] = useState<CartLine[]>([]),
    [cartBudget, setCartBudget] = useState<number | null>(null),
    [cartOpen, setCartOpen] = useState(false),
    [selected, setSelected] = useState<Product | null>(null),
    [providerOpen, setProviderOpen] = useState(false),
    [config, setConfig] = useState<Config | null>(null),
    [authOpen, setAuthOpen] = useState(false),
    [toast, setToast] = useState(''),
    [ready, setReady] = useState(false),
    [preset, setPreset] = useState(0),
    [filter, setFilter] = useState('All');
  const navigate: Navigate = useCallback((p) => {
    history.pushState({}, '', p);
    setPath(p.split('?')[0]);
    window.scrollTo({ top: 0, behavior: 'instant' });
    setCartOpen(false);
  }, []);
  const notify = useCallback((text: string) => setToast(text), []);
  const reload = useCallback(async () => {
    const [p, s] = await Promise.all([api<Product[]>('/catalog'), api('/status')]);
    setProducts(p);
    setStatus(s);
  }, []);
  const reloadSession = useCallback(async () => {
    const s = await api('/session');
    setSession(s);
    setCsrf(s.csrf);
  }, []);
  useEffect(() => {
    reloadSession()
      .then(() => reload())
      .then(() => setReady(true))
      .catch((e) => notify(e.message));
    const pop = () => setPath(location.pathname);
    addEventListener('popstate', pop);
    return () => removeEventListener('popstate', pop);
  }, [reload, reloadSession, notify]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 7000);
    return () => clearTimeout(timer);
  }, [toast]);
  const add = (p: Product, quantity = 1) => {
    setCart((old) => {
      const line = old.find((l) => l.productId === p.id);
      return line
        ? old.map((l) =>
            l.productId === p.id
              ? { ...l, quantity: Math.min(p.available, l.quantity + quantity) }
              : l,
          )
        : [...old, { productId: p.id, quantity: Math.min(p.available, quantity) }];
    });
    notify(`${p.name} added to your bundle.`);
  };
  const explore = (category: string) => {
    setFilter(category);
    navigate('/stock');
  };
  const startMission = (index = 0) => {
    setPreset(index);
    navigate('/run');
  };
  const choose = (offer: any) => {
    setCartBudget(offer.total + offer.remaining);
    setCart(offer.lines.map((l: any) => ({ productId: l.productId, quantity: l.quantity })));
    setCartOpen(true);
  };
  const logout = async () => {
    try {
      await api('/auth/logout', {});
      await reloadSession();
      notify('Signed out.');
      navigate('/');
    } catch (e) {
      notify((e as Error).message);
    }
  };
  return (
    <>
      <div className="system-bar">
        <span>
          <i className="live-dot" /> AN INVENTORY RESCUE EXPERIMENT
        </span>
        <span>
          PAYPAL SANDBOX <span className="bar-separator">/</span> SYNTHETIC CATALOG
        </span>
      </div>
      <header className="header">
        <a
          className="brand"
          href="/"
          onClick={(e) => {
            e.preventDefault();
            navigate('/');
          }}
        >
          <span className="brand-icon">
            R<span>↗</span>
          </span>
          <span>
            RECLAIM<span className="brand-slashes">//</span>RUN
            <small>THE INVENTORY RESCUE ARCADE</small>
          </span>
        </a>
        <nav aria-label="Main navigation">
          <button className={path === '/run' ? 'nav-active' : ''} onClick={() => navigate('/run')}>
            Rescue run
          </button>
          <button className={path === '/stock' ? 'nav-active' : ''} onClick={() => explore('All')}>
            Explore stock
          </button>
          <button
            className={path === '/orders' ? 'nav-active' : ''}
            onClick={() => navigate('/orders')}
          >
            My missions
          </button>
        </nav>
        <div className="header-actions">
          <button className="merchant-link" onClick={() => navigate('/merchant')}>
            <Command size={15} /> Merchant command <ArrowUpRight size={14} />
          </button>
          <button
            className="icon-button bag-button"
            aria-label="Open bundle"
            onClick={() => setCartOpen(true)}
          >
            <ShoppingBag size={20} />
            {cart.length > 0 && <span>{cart.reduce((s, l) => s + l.quantity, 0)}</span>}
          </button>
          <button
            className="icon-button account-button"
            aria-label={session?.email ? 'Sign out' : 'Sign in'}
            onClick={() => (session?.email ? logout() : setAuthOpen(true))}
          >
            {session?.email ? <LogOut size={18} /> : <KeyRound size={18} />}
          </button>
        </div>
      </header>
      {!ready ? (
        <div className="page-loading">
          <LoaderCircle className="spin" /> Connecting to the vault…
        </div>
      ) : path === '/merchant' || path.startsWith('/merchant/') ? (
        <React.Suspense fallback={<div className="page-loading">Opening merchant command…</div>}>
          <Merchant
            session={session}
            status={status}
            onLogin={() => setAuthOpen(true)}
            notify={notify}
            onProvider={() => setProviderOpen(true)}
            config={config}
          />
        </React.Suspense>
      ) : path === '/run' ? (
        <MissionBuilder
          preset={preset}
          config={config}
          onProvider={() => setProviderOpen(true)}
          choose={choose}
          notify={notify}
        />
      ) : path === '/stock' ? (
        <Stock
          products={products}
          filter={filter}
          setFilter={setFilter}
          onSelect={setSelected}
          add={add}
        />
      ) : path === '/orders' ? (
        <History navigate={navigate} notify={notify} />
      ) : path.startsWith('/checkout') ? (
        <Checkout navigate={navigate} status={status} reload={reload} notify={notify} />
      ) : (
        <Landing
          products={products}
          start={startMission}
          explore={explore}
          navigate={navigate}
          onSelect={setSelected}
        />
      )}
      <footer>
        <div className="footer-brand">
          RECLAIM<span>//</span>RUN<small>Good products deserve another run.</small>
        </div>
        <div>
          <button onClick={() => navigate('/run')}>Start a mission</button>
          <button onClick={() => navigate('/merchant')}>For merchants</button>
          <a
            href="https://github.com/eshaanvgupta/reclaim-run-paypal-ai"
            target="_blank"
            rel="noreferrer"
          >
            Open source <ArrowUpRight size={13} />
          </a>
        </div>
        <p>
          BUILT FOR THE PAYPAL AI HACKATHON
          <br />
          SANDBOX ONLY · NO PHYSICAL GOODS SHIPPED
        </p>
      </footer>
      {cartOpen && (
        <Cart
          products={products}
          cart={cart}
          setCart={setCart}
          budget={cartBudget}
          setBudget={setCartBudget}
          close={() => setCartOpen(false)}
          navigate={navigate}
          notify={notify}
        />
      )}
      {selected && (
        <Modal title="Inside the vault" close={() => setSelected(null)}>
          <div className="detail-art">
            <ProductArt category={selected.category} />
          </div>
          <span className="eyebrow">
            {selected.category} / {selected.sku}
          </span>
          <h2>{selected.name}</h2>
          <p>{selected.description}</p>
          <div className="detail-price">
            <strong>{usd(selected.price)}</strong>
            <del>{usd(selected.retail)}</del>
            <span>{selected.available} available</span>
          </div>
          <p className="muted small">
            Configured quality: {selected.quality}/100 · Stock age: {selected.ageDays} days.
            Synthetic demo inventory.
          </p>
          <button
            className="button primary full"
            disabled={!selected.available}
            onClick={() => {
              add(selected);
              setSelected(null);
            }}
          >
            Add to bundle <Plus size={17} />
          </button>
        </Modal>
      )}
      {providerOpen && (
        <ProviderModal
          initial={config}
          models={status.models || []}
          close={() => setProviderOpen(false)}
          save={(c) => {
            setConfig(c);
            setProviderOpen(false);
            notify(
              c
                ? 'Provider ready for this tab. Your key is held in memory only.'
                : 'Provider disconnected. Key cleared from app state.',
            );
          }}
        />
      )}
      {authOpen && (
        <AuthModal
          close={() => setAuthOpen(false)}
          done={async () => {
            await reloadSession();
            setAuthOpen(false);
            notify('Signed in.');
          }}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          <Activity size={17} />
          <span>{toast}</span>
          <button aria-label="Dismiss notification" onClick={() => setToast('')}>
            <X size={15} />
          </button>
        </div>
      )}
    </>
  );
}
function Landing({
  products,
  start,
  explore,
  navigate,
  onSelect,
}: {
  products: Product[];
  start: (i?: number) => void;
  explore: (c: string) => void;
  navigate: Navigate;
  onSelect: (p: Product) => void;
}) {
  return (
    <main>
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="tiny-box">R/R</span> OVERLOOKED STOCK. UNLOCKED POTENTIAL.
          </div>
          <h1>
            GOOD
            <br />
            PRODUCTS.
            <br />
            <span>
              SECOND
              <br />
              CHANCES.
            </span>
          </h1>
          <p className="hero-intro">Turn forgotten stock into extraordinary deals.</p>
          <p className="hero-body">
            The good stuff doesn't stop being good.
            <br />
            Give it a mission. Build your bundle. Make your move.
          </p>
          <div className="hero-actions">
            <button className="button primary" onClick={() => start()}>
              Start a rescue run <ArrowUpRight size={20} />
            </button>
            <button className="text-button" onClick={() => explore('All')}>
              Scout the stock <ArrowRight size={17} />
            </button>
          </div>
          <div className="hero-trust">
            <ShieldCheck size={17} />
            <span>REAL INVENTORY</span>
            <span className="dot-divider">·</span>
            <span>PROTECTED PRICING</span>
            <span className="dot-divider">·</span>
            <span>PAYPAL CHECKOUT</span>
          </div>
        </div>
        <div className="hero-visual">
          <div className="visual-label">
            THE STOCK IS WAITING.
            <br />
            <strong>GIVE IT A SECOND ACT.</strong>
            <span className="crosshair">+</span>
          </div>
          <Warehouse products={products} onSelect={explore} />
          <div className="visual-caption">
            <span>01—06</span>
            <p>
              One merchant. Six inventory zones.
              <br />A better way to find your next setup.
            </p>
            <span className="vertical-type">SCOUT / FORGE / RECLAIM</span>
          </div>
        </div>
      </section>
      <div className="manifesto-clip">
        <div className="manifesto-strip">
          <span>NOT LANDFILL MATERIAL.</span>
          <span className="strip-star">✳</span>
          <span>YOUR NEXT GREAT FIND.</span>
          <span className="strip-star">✳</span>
          <span>MAKE EVERY ITEM COUNT.</span>
          <span className="strip-star">✳</span>
        </div>
      </div>
      <section className="section missions-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">
              <span className="index">01 /</span> PICK YOUR PURPOSE
            </span>
            <h2>
              Every great deal
              <br />
              starts with a mission<span>.</span>
            </h2>
          </div>
          <p>
            Don't scroll through things you don't need.
            <br />
            Tell us what you're building. We'll find the pieces.
          </p>
        </div>
        <div className="mission-cards">
          {scenarios.map((s, i) => (
            <button key={s.code} className={'mission-card ' + s.color} onClick={() => start(i)}>
              <div className="mission-card-top">
                <span>MISSION_{s.code}</span>
                <ArrowUpRight size={23} />
              </div>
              <div className="mission-card-art">
                <ProductArt category={s.category} />
                <span className="art-ring" />
              </div>
              <span className="tiny">{s.tag}</span>
              <h3>{s.title}</h3>
              <p>{s.description}</p>
              <div className="mission-card-bottom">
                <span>SET BUDGET · {usd(s.budget)}</span>
                <span>ENTER RUN →</span>
              </div>
            </button>
          ))}
        </div>
      </section>
      <section className="process-section section" id="how-it-works">
        <div className="section-heading">
          <div>
            <span className="eyebrow">
              <span className="index">02 /</span> LESS SCROLL. MORE PURPOSE.
            </span>
            <h2>
              One run.
              <br />A smarter way to shop<span>.</span>
            </h2>
          </div>
          <span className="process-stamp">
            SAVE THE STOCK.
            <br />
            FORGE A DEAL.
            <br />
            <b>PAY FOR REAL.</b>
          </span>
        </div>
        <div className="process-grid">
          {[
            {
              n: '01',
              name: 'Set the mission',
              text: 'Your goal. Your budget. Your non-negotiables. Start with what you actually need.',
              icon: <Command />,
            },
            {
              n: '02',
              name: 'Forge your bundle',
              text: 'Compare catalog-backed offers. Every price respects real stock and merchant rules.',
              icon: <Zap />,
            },
            {
              n: '03',
              name: 'Make it yours',
              text: 'Review the full total, then approve through PayPal. A confirmed capture completes the run.',
              icon: <ShieldCheck />,
            },
          ].map((s) => (
            <div className="process-step" key={s.n}>
              <span>{s.n}</span>
              {s.icon}
              <h3>{s.name}</h3>
              <p>{s.text}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="section featured">
        <div className="section-heading">
          <div>
            <span className="eyebrow">
              <span className="index">03 /</span> STILL GOOD. STILL GOT IT.
            </span>
            <h2>
              Fresh from the vault<span>.</span>
            </h2>
          </div>
          <button className="text-button" onClick={() => explore('All')}>
            Explore all stock <ArrowUpRight size={18} />
          </button>
        </div>
        <div className="product-grid home-products">
          {products.slice(0, 4).map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} onSelect={() => onSelect(p)} />
          ))}
        </div>
      </section>
      <section className="merchant-banner section">
        <div>
          <span className="eyebrow">FOR THE OTHER SIDE OF THE COUNTER</span>
          <h2>
            Your stock has
            <br />
            more stories in it.
          </h2>
          <p>
            Recover value from slow movers with offers that protect your margins. Clear visibility,
            real inventory, confirmed payments.
          </p>
          <button className="button dark" onClick={() => navigate('/merchant')}>
            Open merchant command <ArrowUpRight size={19} />
          </button>
        </div>
        <div className="merchant-banner-art">
          <Box size={120} strokeWidth={0.6} />
          <span>STOCK → OPPORTUNITY</span>
          <div className="barcode">▌▎▌▌▏▌▎▌▏▌▌▎▌▏▌▌▏</div>
        </div>
      </section>
      <section className="section honest-section">
        <ShieldCheck />
        <div>
          <h3>A real experiment. Clear boundaries.</h3>
          <p>
            You're exploring synthetic inventory in a PayPal sandbox. No real money moves, and no
            goods are shipped. AI runs with your own provider key or a local Ollama model; the
            deterministic offer engine remains available without either. Every merchant figure comes
            from the workspace's actual records.
          </p>
        </div>
        <a
          href="https://github.com/eshaanvgupta/reclaim-run-paypal-ai#verification"
          target="_blank"
          rel="noreferrer"
        >
          See what's verified <ArrowUpRight size={16} />
        </a>
      </section>
    </main>
  );
}
function ProductCard({
  product: p,
  index = 0,
  onSelect,
  add,
}: {
  product: Product;
  index?: number;
  onSelect: () => void;
  add?: () => void;
}) {
  return (
    <article className="product-card">
      <button className="product-image" onClick={onSelect} aria-label={`View ${p.name}`}>
        <span className="product-badge">{p.ageDays}D IN THE VAULT</span>
        <ProductArt category={p.category} variant={index} />
        <span className="product-view">
          <ArrowUpRight size={17} />
        </span>
      </button>
      <div className="product-info">
        <span className="tiny muted">
          {p.category.toUpperCase()} / {p.sku}
        </span>
        <button className="product-title" onClick={onSelect}>
          {p.name}
        </button>
        <div className="product-price">
          <strong>{usd(p.price)}</strong>
          <del>{usd(p.retail)}</del>
          <span>{p.available} available</span>
        </div>
        {add && (
          <button
            className="button outline small-button full"
            onClick={add}
            disabled={!p.available}
          >
            Add to bundle <Plus size={15} />
          </button>
        )}
      </div>
    </article>
  );
}
function Stock({
  products,
  filter,
  setFilter,
  onSelect,
  add,
}: {
  products: Product[];
  filter: string;
  setFilter: (s: string) => void;
  onSelect: (p: Product) => void;
  add: (p: Product) => void;
}) {
  const [query, setQuery] = useState(''),
    [sort, setSort] = useState('age');
  const list = products
    .filter(
      (p) =>
        (filter === 'All' || p.category === filter) &&
        (p.name + ' ' + p.tags).toLowerCase().includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      sort === 'price'
        ? a.price - b.price
        : sort === 'name'
          ? a.name.localeCompare(b.name)
          : b.ageDays - a.ageDays,
    );
  return (
    <main className="section app-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">SCOUT THE STOCK / LIVE SQLITE CATALOG</span>
          <h1>
            The stock galaxy<span>.</span>
          </h1>
          <p>Perfectly good products. A whole new purpose.</p>
        </div>
        <span className="count-tag">
          {products.reduce((s, p) => s + p.available, 0)} UNITS AVAILABLE
        </span>
      </div>
      <div className="catalog-toolbar">
        <div className="search-field">
          <Search size={17} />
          <input
            aria-label="Search products"
            placeholder="Search the vault…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select aria-label="Sort products" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="age">Oldest stock first</option>
          <option value="price">Lowest price first</option>
          <option value="name">Name A–Z</option>
        </select>
      </div>
      <div className="category-tabs">
        {['All', ...cats].map((c) => (
          <button key={c} className={filter === c ? 'active' : ''} onClick={() => setFilter(c)}>
            {c}
            <span>{products.filter((p) => c === 'All' || p.category === c).length}</span>
          </button>
        ))}
      </div>
      <p className="tiny muted catalog-count">
        {list.length} PRODUCTS FOUND / SYNTHETIC DEMO INVENTORY
      </p>
      <div className="product-grid">
        {list.map((p, i) => (
          <ProductCard
            key={p.id}
            product={p}
            index={i}
            onSelect={() => onSelect(p)}
            add={() => add(p)}
          />
        ))}
      </div>
      {!list.length && (
        <Empty title="No stock in this sector." text="Try another search or category." />
      )}
    </main>
  );
}
function MissionBuilder({
  preset,
  config,
  onProvider,
  choose,
  notify,
}: {
  preset: number;
  config: Config | null;
  onProvider: () => void;
  choose: (o: any) => void;
  notify: (s: string) => void;
}) {
  const scenario = scenarios[preset],
    [goal, setGoal] = useState(scenario.goal),
    [budget, setBudget] = useState(scenario.budget),
    [quantity, setQuantity] = useState(scenario.quantity || 1),
    [required, setRequired] = useState<string[]>(scenario.required),
    [result, setResult] = useState<any>(null),
    [logs, setLogs] = useState<any[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [table, setTable] = useState(false),
    [exclude, setExclude] = useState('');
  const launch = async (ai = false) => {
    if (ai && !config) {
      onProvider();
      return;
    }
    setBusy(true);
    setError('');
    setResult(null);
    setLogs([]);
    const mission = {
      goal,
      budget,
      quantity,
      required,
      excluded: exclude
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    };
    try {
      if (!ai) {
        const r = await api('/missions', mission);
        setLogs([
          { name: 'optimize_bundle', summary: 'Merchant rules, stock, and budget verified' },
        ]);
        setResult(r);
      } else {
        const r = await fetch('/api/agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf },
          body: JSON.stringify({ mission, config }),
        });
        if (!r.ok) {
          const d = await r.json();
          throw new Error(d.error || 'Agent request failed.');
        }
        const reader = r.body!.getReader(),
          decoder = new TextDecoder();
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let end;
          while ((end = buffer.indexOf('\n\n')) !== -1) {
            const block = buffer.slice(0, end);
            buffer = buffer.slice(end + 2);
            if (!block.startsWith('data: ')) continue;
            const event = JSON.parse(block.slice(6));
            if (event.type === 'error') throw new Error(event.message);
            if (event.type === 'done')
              setResult({ ...event, source: `${event.provider} / ${event.model}` });
            else setLogs((old) => [...old, event]);
          }
        }
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="section app-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">MISSION CONTROL / OFFER FORGE</span>
          <h1>
            What's your next move<span>?</span>
          </h1>
          <p>Tell us the outcome. We'll scout the pieces.</p>
        </div>
        <button className="provider-status" onClick={onProvider}>
          <span className={config ? 'live-dot' : 'offline-dot'} />
          {config ? `${config.provider} connected` : 'Connect your AI'}
          <SlidersHorizontal size={16} />
        </button>
      </div>
      <div className="run-layout">
        <section className="mission-form panel">
          <div className="panel-title">
            <Command size={17} />
            <span>YOUR MISSION BRIEF</span>
            <span>01</span>
          </div>
          <label htmlFor="goal">What are we building?</label>
          <textarea
            id="goal"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            rows={4}
            maxLength={2000}
          />
          <div className="budget-title">
            <label htmlFor="budget">Your maximum budget</label>
            <div>
              <span>USD</span>
              <input
                id="budget"
                aria-label="Budget in dollars"
                type="number"
                min="1"
                max="100000"
                step="1"
                value={budget / 100}
                onChange={(e) => setBudget(Math.round(Number(e.target.value) * 100))}
              />
            </div>
          </div>
          <input
            type="range"
            aria-label="Budget slider"
            min="1000"
            max="50000"
            step="500"
            value={Math.min(50000, budget)}
            onChange={(e) => setBudget(Number(e.target.value))}
          />
          <div className="range-labels">
            <span>$10</span>
            <span>$500</span>
          </div>
          <label>Required inventory zones</label>
          <div className="requirement-chips">
            {cats.map((c) => (
              <button
                key={c}
                aria-pressed={required.includes(c)}
                className={required.includes(c) ? 'selected' : ''}
                onClick={() =>
                  setRequired((old) => (old.includes(c) ? old.filter((x) => x !== c) : [...old, c]))
                }
              >
                {required.includes(c) ? <Check size={13} /> : <Plus size={13} />} {c}
              </button>
            ))}
          </div>
          <div className="form-row">
            <label>
              People / sets
              <input
                aria-label="Number of sets"
                type="number"
                value={quantity}
                min="1"
                max="20"
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
            </label>
            <label>
              Exclude words
              <input
                value={exclude}
                onChange={(e) => setExclude(e.target.value)}
                placeholder="e.g. headphones"
                maxLength={200}
              />
            </label>
          </div>
          <button
            className="button primary full"
            onClick={() => launch(false)}
            disabled={busy || !required.length || budget < 100 || !goal.trim()}
          >
            {busy ? <LoaderCircle className="spin" size={18} /> : <Zap size={18} />} Forge bundles{' '}
            <ArrowRight size={18} />
          </button>
          <button
            className="button outline full"
            onClick={() => launch(true)}
            disabled={busy || !required.length}
          >
            <Activity size={17} />
            {config ? 'Launch AI agent' : 'Connect AI & launch agent'}
            <ArrowUpRight size={16} />
          </button>
          <p className="form-footnote">
            <ShieldCheck size={14} /> Every price is computed on the server. Zero overspend.
          </p>
        </section>
        <div className="run-content">
          {logs.length > 0 && (
            <div className="activity-log">
              <span className="eyebrow">
                <Activity size={13} /> {result?.source || 'AGENT ACTIVITY'}
              </span>
              {logs.slice(-8).map((l, i) => (
                <div key={i}>
                  <span>{String(i + 1).padStart(2, '0')}</span>
                  <code>{l.name || 'provider_request'}</code>
                  <small>{l.summary || l.message}</small>
                  <Check size={13} />
                </div>
              ))}
            </div>
          )}
          {error && (
            <div className="error-box" role="alert">
              <AlertTriangle size={18} />
              <div>
                <strong>Mission needs a change</strong>
                <p>{error}</p>
              </div>
            </div>
          )}
          {busy && (
            <div className="forging">
              <div className="forge-orbit">
                <Box />
                <span />
                <span />
              </div>
              <h3>Finding your second chances.</h3>
              <p>Inspecting the catalog. Enforcing the boundaries.</p>
            </div>
          )}
          {!result && !busy && !error && (
            <div className="run-empty">
              <div className="run-reticle">
                <Command size={45} />
              </div>
              <span className="tiny">AWAITING MISSION PARAMETERS</span>
              <h2>
                Good deals start
                <br />
                with a clear objective.
              </h2>
              <p>
                Select your needs, set a budget, and forge your options.
                <br />
                Use your own AI provider for natural-language assistance.
              </p>
              <div>
                <span>
                  <Check size={14} /> Stock checked
                </span>
                <span>
                  <Check size={14} /> Floors protected
                </span>
                <span>
                  <Check size={14} /> Your call
                </span>
              </div>
            </div>
          )}
          {result && (
            <>
              <div className="duel-heading">
                <div>
                  <span className="eyebrow">OFFER UNLOCKED / DEAL DUEL</span>
                  <h2>Pick your play.</h2>
                </div>
                <button className="text-button" onClick={() => setTable(!table)}>
                  {table ? 'Card view' : 'Accessible table view'} <SlidersHorizontal size={15} />
                </button>
              </div>
              {result.explanation && <p className="agent-explanation">{result.explanation}</p>}
              {table ? (
                <div className="table-wrap">
                  <table>
                    <caption>Server-calculated bundle comparison</caption>
                    <thead>
                      <tr>
                        <th>Strategy</th>
                        <th>Total</th>
                        <th>Savings</th>
                        <th>Needs met</th>
                        <th>Remaining</th>
                        <th>Select</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.offers.map((o: any) => (
                        <tr key={o.id}>
                          <td>{o.strategy}</td>
                          <td>{usd(o.total)}</td>
                          <td>{usd(o.savings)}</td>
                          <td>
                            {o.needs}/{o.required}
                          </td>
                          <td>{usd(o.remaining)}</td>
                          <td>
                            <button
                              className="button small-button outline"
                              onClick={() => choose(o)}
                            >
                              Choose
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="offer-grid">
                  {result.offers.map((o: any, i: number) => (
                    <article
                      className={'offer-card ' + (i === 1 ? 'featured-offer' : '')}
                      key={o.id}
                    >
                      <div className="offer-kicker">
                        <span>STRATEGY_0{i + 1}</span>
                        {i === 1 ? <Zap size={16} /> : <Box size={16} />}
                      </div>
                      <h3>{o.strategy}</h3>
                      <p className="offer-objective">{o.objective}</p>
                      <div className="offer-total">
                        {usd(o.total)}
                        <small>USD / FULL BUNDLE</small>
                      </div>
                      <div className="offer-saving">
                        Save {usd(o.savings)} from configured retail
                      </div>
                      <ul>
                        {o.lines.map((l: any) => (
                          <li key={l.productId}>
                            <span>
                              {l.quantity}× {l.name}
                            </span>
                            <b>{usd(l.unitPrice * l.quantity)}</b>
                          </li>
                        ))}
                      </ul>
                      <div className="offer-metrics">
                        <span>
                          <Check size={13} /> {o.needs}/{o.required} needs met
                        </span>
                        <span>{usd(o.remaining)} left</span>
                      </div>
                      <button
                        className={'button full ' + (i === 1 ? 'primary' : 'outline')}
                        onClick={() => choose(o)}
                      >
                        Choose & customize <ArrowRight size={16} />
                      </button>
                    </article>
                  ))}
                </div>
              )}
              <p className="small muted">
                Offers are proposals. Stock is reserved when you create a quote.{' '}
                {result.offers.length < 3
                  ? 'Fewer than three distinct feasible combinations were found.'
                  : ''}
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
export function Modal({
  title,
  close,
  children,
  wide = false,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    const old = document.activeElement as HTMLElement;
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'Tab') {
        const els = ref.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),input,select,textarea,a[href]',
        );
        if (!els?.length) return;
        const first = els[0],
          last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handle);
    ref.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handle);
      document.body.style.overflow = overflow;
      old?.focus();
    };
  }, [close]);
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        className={'modal ' + (wide ? 'modal-wide' : '')}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={ref}
      >
        <div className="modal-heading">
          <span className="eyebrow">{title}</span>
          <button className="icon-button" aria-label="Close dialog" onClick={close}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
const providers = [
  { id: 'openai', name: 'OpenAI', model: 'gpt-4.1-mini' },
  { id: 'anthropic', name: 'Anthropic', model: 'claude-sonnet-4-5' },
  { id: 'gemini', name: 'Google Gemini', model: 'gemini-2.5-flash' },
  { id: 'groq', name: 'Groq', model: 'llama-3.3-70b-versatile' },
  { id: 'openrouter', name: 'OpenRouter', model: 'qwen/qwen3-4b:free' },
  { id: 'mistral', name: 'Mistral', model: 'mistral-small-latest' },
  { id: 'custom', name: 'Custom · OpenAI-compatible', model: '' },
  { id: 'ollama', name: 'Ollama · local, no API key', model: 'qwen3:4b' },
];
export function ProviderModal({
  initial,
  models,
  close,
  save,
}: {
  initial: Config | null;
  models: string[];
  close: () => void;
  save: (c: Config | null) => void;
}) {
  const [form, setForm] = useState<Config>(
      initial || {
        provider: 'openai',
        apiKey: '',
        model: 'gpt-4.1-mini',
        maxTokens: 1500,
        maxSteps: 5,
      },
    ),
    [show, setShow] = useState(false);
  const update = (k: string, v: any) => setForm((old) => ({ ...old, [k]: v }));
  return (
    <Modal title="YOUR AGENT. YOUR PROVIDER." close={close}>
      <div className="provider-icon">
        <KeyRound size={27} />
      </div>
      <h2>Bring your own intelligence.</h2>
      <p>
        Choose a provider and use your own key. You control the model and what each run can use.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save(form);
        }}
      >
        <label>
          AI provider
          <select
            value={form.provider}
            onChange={(e) =>
              setForm({
                ...form,
                provider: e.target.value,
                model: providers.find((p) => p.id === e.target.value)!.model,
                apiKey: '',
              })
            }
          >
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        {form.provider !== 'ollama' && (
          <label>
            API key
            <div className="key-input">
              <input
                autoComplete="off"
                spellCheck={false}
                name="provider-key"
                aria-label="API key"
                type={show ? 'text' : 'password'}
                value={form.apiKey}
                onChange={(e) => update('apiKey', e.target.value)}
                placeholder="Your provider API key"
                required
                maxLength={500}
              />
              <button type="button" onClick={() => setShow(!show)}>
                {show ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>
        )}
        {form.provider === 'custom' && (
          <label>
            OpenAI-compatible base URL
            <input
              type="url"
              value={form.endpoint || ''}
              onChange={(e) => update('endpoint', e.target.value)}
              placeholder="https://api.example.com/v1"
              required
            />
            <small>Public HTTPS endpoints only. We append /chat/completions.</small>
          </label>
        )}
        <label>
          Model ID
          <input
            value={form.model}
            onChange={(e) => update('model', e.target.value)}
            required
            placeholder="Exact tool-capable model ID"
            list={form.provider === 'ollama' ? 'local-models' : undefined}
          />
          <datalist id="local-models">
            {models.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </datalist>
          <small>Examples are editable. Availability and pricing depend on your provider.</small>
        </label>
        <div className="form-row">
          <label>
            Output tokens / request
            <input
              type="number"
              min="256"
              max="4096"
              value={form.maxTokens}
              onChange={(e) => update('maxTokens', Number(e.target.value))}
            />
          </label>
          <label>
            Max requests / run
            <input
              type="number"
              min="2"
              max="8"
              value={form.maxSteps}
              onChange={(e) => update('maxSteps', Number(e.target.value))}
            />
          </label>
        </div>
        <div className="privacy-note">
          <ShieldCheck size={20} />
          <div>
            <strong>We do not store or save API keys.</strong>
            <p>
              Your key stays in memory in this tab and during requests. It is forwarded to your
              selected provider; it is never saved in our database, browser storage, or logs.
              Refresh or disconnect to clear it. Your provider's own data policies apply.
            </p>
          </div>
        </div>
        <p className="small muted">
          Limits bound output and request count, not a guaranteed spending cap. Provider charges,
          input tokens, and account limits remain under your control.
        </p>
        <button className="button primary full" type="submit">
          Use this provider <ArrowRight size={17} />
        </button>
        {initial && (
          <button className="text-button full danger-text" type="button" onClick={() => save(null)}>
            Disconnect & clear key <Trash2 size={15} />
          </button>
        )}
      </form>
    </Modal>
  );
}
function AuthModal({ close, done }: { close: () => void; done: () => void }) {
  const [register, setRegister] = useState(false),
    [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  return (
    <Modal title="WORKSPACE ACCESS" close={close}>
      <h2>{register ? 'Save your next run.' : 'Welcome back.'}</h2>
      <p>
        {register
          ? 'Create a buyer account to keep your order history across sessions.'
          : 'Sign in as a buyer or with your merchant setup credentials.'}
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError('');
          try {
            await api('/auth/' + (register ? 'register' : 'login'), { email, password });
            done();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Email
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete={register ? 'new-password' : 'current-password'}
            minLength={10}
            maxLength={128}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
        <button className="button primary full" disabled={busy}>
          {busy ? (
            <LoaderCircle className="spin" size={17} />
          ) : register ? (
            'Create buyer account'
          ) : (
            'Sign in'
          )}
          <ArrowRight size={17} />
        </button>
        <button className="text-button full" type="button" onClick={() => setRegister(!register)}>
          {register ? 'Already have an account? Sign in' : 'New buyer? Create an account'}
        </button>
      </form>
      <p className="small muted">
        Merchant owners are created locally with <code>npm run setup</code>. Guest shopping requires
        no account.
      </p>
    </Modal>
  );
}
function Cart({
  products,
  cart,
  setCart,
  budget,
  setBudget,
  close,
  navigate,
  notify,
}: {
  products: Product[];
  cart: CartLine[];
  setCart: React.Dispatch<React.SetStateAction<CartLine[]>>;
  budget: number | null;
  setBudget: (n: number | null) => void;
  close: () => void;
  navigate: Navigate;
  notify: (s: string) => void;
}) {
  const [busy, setBusy] = useState(false),
    [preview, setPreview] = useState<any>(null),
    [pricing, setPricing] = useState(false),
    [pricingError, setPricingError] = useState(''),
    total =
      preview?.total ??
      cart.reduce(
        (s, l) => s + (products.find((p) => p.id === l.productId)?.price || 0) * l.quantity,
        0,
      ),
    retail = cart.reduce(
      (s, l) => s + (products.find((p) => p.id === l.productId)?.retail || 0) * l.quantity,
      0,
    );
  useEffect(() => {
    let cancelled = false;
    setPricing(true);
    setPricingError('');
    const timer = setTimeout(() => {
      if (!cart.length) {
        setPricing(false);
        setPreview(null);
        return;
      }
      api('/bundles/evaluate', { lines: cart, budget: budget ?? 10000000 })
        .then((r) => {
          if (!cancelled) setPreview(r);
        })
        .catch((e) => {
          if (!cancelled) setPricingError(e.message);
        })
        .finally(() => {
          if (!cancelled) setPricing(false);
        });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [cart, budget]);
  const reserve = async () => {
    setBusy(true);
    try {
      const q = await api('/quotes', { lines: cart, budget: budget ?? total });
      close();
      navigate('/checkout/' + q.id);
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title="YOUR BUNDLE / CUSTOMIZE & REVIEW" close={close}>
      <h2>Make it your own.</h2>
      <p>Change quantities or remove a piece. The server verifies the final quote.</p>
      {cart.length ? (
        <>
          <div className="cart-lines">
            {cart.map((l) => {
              const p = products.find((p) => p.id === l.productId);
              if (!p) return null;
              return (
                <div className="cart-line" key={l.productId}>
                  <div className="cart-art">
                    <ProductArt category={p.category} />
                  </div>
                  <div>
                    <strong>{p.name}</strong>
                    <span>{usd(p.price)} each</span>
                    <div className="quantity-controls">
                      <button
                        aria-label={`Decrease ${p.name}`}
                        onClick={() =>
                          setCart((old) =>
                            old
                              .map((x) =>
                                x.productId === p.id ? { ...x, quantity: x.quantity - 1 } : x,
                              )
                              .filter((x) => x.quantity > 0),
                          )
                        }
                      >
                        <Minus size={12} />
                      </button>
                      <span>{l.quantity}</span>
                      <button
                        aria-label={`Increase ${p.name}`}
                        disabled={l.quantity >= Math.min(20, p.available)}
                        onClick={() =>
                          setCart((old) =>
                            old.map((x) =>
                              x.productId === p.id ? { ...x, quantity: x.quantity + 1 } : x,
                            ),
                          )
                        }
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                  <b>{usd(p.price * l.quantity)}</b>
                  <button
                    className="icon-button"
                    aria-label={`Remove ${p.name}`}
                    onClick={() => setCart((old) => old.filter((x) => x.productId !== p.id))}
                  >
                    <X size={15} />
                  </button>
                </div>
              );
            })}
          </div>
          <div className="totals">
            <div>
              <span>Configured retail</span>
              <del>{usd(retail)}</del>
            </div>
            <div>
              <span>Bundle savings</span>
              <b className="lime-text">−{usd(retail - total)}</b>
            </div>
            <div>
              <span>Shipping & tax</span>
              <span>$0.00 · sandbox goods</span>
            </div>
            <div className="grand-total">
              <span>{pricing ? 'Recalculating…' : 'Server-calculated total'}</span>
              <strong>{usd(total)}</strong>
            </div>
          </div>
          <label className="cart-budget">
            Maximum bundle budget / USD
            <input
              aria-label="Maximum bundle budget in dollars"
              type="number"
              min="1"
              max="100000"
              step=".01"
              value={budget === null ? '' : budget / 100}
              placeholder="Optional for manual shopping"
              onChange={(e) =>
                setBudget(e.target.value ? Math.round(Number(e.target.value) * 100) : null)
              }
            />
          </label>
          {pricingError && (
            <p className="error-text" role="alert">
              {pricingError}
            </p>
          )}
          <button
            className="button primary full"
            onClick={reserve}
            disabled={busy || pricing || !!pricingError}
          >
            {busy ? <LoaderCircle className="spin" size={18} /> : <ShieldCheck size={18} />} Reserve
            & review quote <ArrowRight size={17} />
          </button>
          <p className="small muted">
            No charge yet. A server quote reserves stock for 15 minutes before payment begins. Final
            prices are shown next.
          </p>
        </>
      ) : (
        <Empty
          title="An empty crate. Endless potential."
          text="Explore the stock or start a mission to build your bundle."
        />
      )}
    </Modal>
  );
}
function Checkout({
  navigate,
  status,
  reload,
  notify,
}: {
  navigate: Navigate;
  status: any;
  reload: () => Promise<void>;
  notify: (s: string) => void;
}) {
  const id = location.pathname.split('/')[2],
    quoteId = ['return', 'cancel'].includes(id)
      ? new URLSearchParams(location.search).get('quote')
      : id;
  const [quote, setQuote] = useState<any>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [consent, setConsent] = useState(false);
  const load = useCallback(async () => {
    try {
      setQuote(await api('/quotes/' + quoteId));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [quoteId]);
  useEffect(() => {
    load();
  }, [load]);
  const action = async (type: string) => {
    setBusy(true);
    setError('');
    try {
      const result = await api('/quotes/' + quoteId + '/' + type, {});
      if (type === 'paypal' && result.approvalUrl) {
        location.assign(result.approvalUrl);
        return;
      }
      await load();
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  if (!quote)
    return (
      <main className="section app-page">
        {error ? <div className="error-box">{error}</div> : <LoaderCircle className="spin" />}
      </main>
    );
  const completed = quote.order?.status === 'COMPLETED' || quote.order?.status === 'REFUNDED',
    pending = quote.status === 'PAYMENT_PENDING';
  return (
    <main className="section app-page checkout-page">
      <button className="text-button" onClick={() => navigate('/orders')}>
        <ArrowLeft size={15} /> My orders
      </button>
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            {completed ? 'VERIFIED RECEIPT' : 'CHECKOUT GATE'} / PAYPAL SANDBOX
          </span>
          <h1>{completed ? 'Rescue complete.' : 'A clear deal.'}</h1>
          <p>
            {completed
              ? 'Provider confirmation received. Inventory settled exactly once.'
              : 'Review every line. Approve only when you’re ready.'}
          </p>
        </div>
        <ShieldCheck className="checkout-shield" size={48} />
      </div>
      <div className="checkout-layout">
        <section className="panel checkout-summary">
          <div className="panel-title">
            <ShoppingBag size={17} />
            <span>YOUR SERVER-CREATED QUOTE</span>
          </div>
          {quote.lines.map((l: any) => (
            <div key={l.product_id} className="checkout-line">
              <ProductArt category={l.category} />
              <div>
                <strong>{l.name}</strong>
                <small>
                  {l.quantity} × {usd(l.unit_price)}
                </small>
              </div>
              <b>{usd(l.unit_price * l.quantity)}</b>
            </div>
          ))}
          <div className="totals">
            <div>
              <span>Retail reference</span>
              <del>{usd(quote.retail)}</del>
            </div>
            <div>
              <span>Discount</span>
              <b className="lime-text">−{usd(quote.retail - quote.total)}</b>
            </div>
            <div>
              <span>Shipping</span>
              <span>$0.00</span>
            </div>
            <div>
              <span>Tax · sandbox demonstration</span>
              <span>$0.00</span>
            </div>
            <div className="grand-total">
              <span>Total USD</span>
              <strong>{usd(quote.total)}</strong>
            </div>
          </div>
          <p className="small muted">
            Synthetic demonstration goods. No shipping address is collected and nothing is
            physically fulfilled.
          </p>
        </section>
        <section className="panel checkout-payment">
          <span className="eyebrow">{completed ? 'PAYMENT VERIFIED' : 'SECURE PAYMENT'}</span>
          {completed ? (
            <>
              <CheckCircle2 size={54} className="lime-text receipt-check" />
              <h2>
                {quote.order.status === 'REFUNDED' ? 'Payment refunded.' : 'Your run, recorded.'}
              </h2>
              <div className="receipt-details">
                <span>Internal order</span>
                <code>{quote.order.id}</code>
                <span>PayPal order</span>
                <code>{quote.order.paypal_id}</code>
                <span>PayPal capture</span>
                <code>{quote.order.capture_id}</code>
                <span>Payment state</span>
                <b>{quote.order.status}</b>
                <span>Created</span>
                <time>{quote.order.created_at} UTC</time>
              </div>
              <button className="button outline full" onClick={() => window.print()}>
                <Printer size={16} /> Print receipt
              </button>
            </>
          ) : (
            <>
              <div className="paypal-wordmark">
                Pay<span>Pal</span>
                <small>SANDBOX</small>
              </div>
              <h2>You're in control.</h2>
              <p>
                You'll approve on PayPal's own sandbox. Returning here alone does not confirm
                payment.
              </p>
              <div className="payment-state">
                <span>QUOTE</span>
                <b>{quote.status}</b>
                {quote.order && (
                  <>
                    <span>PAYPAL</span>
                    <b>{quote.order.status}</b>
                  </>
                )}
              </div>
              {!status.paypal && (
                <div className="setup-note">
                  <AlertTriangle size={18} />
                  <p>
                    Merchant sandbox credentials are not configured. No payment will be attempted.
                    Add them to <code>.env</code> to activate checkout.
                  </p>
                </div>
              )}
              {quote.status === 'RESERVED' && (
                <p className="small muted">
                  Quote expires {new Date(quote.expires).toLocaleTimeString()}. Starting PayPal
                  keeps the reservation until provider reconciliation.
                </p>
              )}
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                <span>
                  I reviewed the {usd(quote.total)} USD total and understand this is a sandbox
                  purchase.
                </span>
              </label>
              {!quote.order?.paypal_id && (
                <button
                  className="button paypal-button full"
                  disabled={
                    busy ||
                    !consent ||
                    !status.paypal ||
                    !['RESERVED', 'PAYMENT_PENDING'].includes(quote.status)
                  }
                  onClick={() => action('paypal')}
                >
                  {busy ? <LoaderCircle size={17} className="spin" /> : <Lock size={16} />} Continue
                  to PayPal <ExternalLink size={15} />
                </button>
              )}
              {quote.order?.paypal_id && (
                <>
                  <button
                    className="button primary full"
                    disabled={busy || !consent}
                    onClick={() => action('capture')}
                  >
                    {busy ? <LoaderCircle size={17} className="spin" /> : <ShieldCheck size={17} />}{' '}
                    Complete approved payment
                  </button>
                  <button
                    className="button outline full"
                    disabled={busy}
                    onClick={() => action('paypal')}
                  >
                    Reopen PayPal approval <ExternalLink size={15} />
                  </button>
                  <button
                    className="text-button full"
                    disabled={busy}
                    onClick={() => action('reconcile')}
                  >
                    <RefreshCw size={15} /> Check provider status
                  </button>
                </>
              )}
              {quote.status === 'RESERVED' && (
                <button
                  className="text-button full"
                  disabled={busy}
                  onClick={async () => {
                    await action('cancel');
                    notify('Unpaid reservation released.');
                    navigate('/run');
                  }}
                >
                  Release quote & return
                </button>
              )}
              {pending && (
                <p className="small muted">
                  Payment-started reservations are held for reconciliation, even if you close the
                  PayPal window. This prevents another buyer claiming stock while payment status is
                  uncertain.
                </p>
              )}
            </>
          )}
          {error && (
            <div className="error-box" role="alert">
              {error}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
export function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty-state">
      <Box size={38} />
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
function History({ navigate, notify }: { navigate: Navigate; notify: (s: string) => void }) {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(''),
    [returnOrder, setReturnOrder] = useState<any>(null),
    [reason, setReason] = useState('');
  const load = () =>
    api('/history')
      .then(setData)
      .catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);
  return (
    <main className="section app-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">YOUR FIELD NOTES / PERSISTENT HISTORY</span>
          <h1>
            Every run counts<span>.</span>
          </h1>
          <p>Your missions, quotes, and provider-confirmed purchases.</p>
        </div>
        <button className="button primary" onClick={() => navigate('/run')}>
          Start another run <ArrowUpRight size={17} />
        </button>
      </div>
      {error && <p className="error-text">{error}</p>}
      {data && (
        <>
          <div className="section-mini-heading">
            <h2>Payment history</h2>
            <span className="tiny">{data.orders.length} ORDERS</span>
          </div>
          {!data.orders.length ? (
            <Empty
              title="Your first rescue is still out there."
              text="Saved payment attempts and confirmed captures appear here. Guest history belongs to this browser session; register to keep it across devices."
            />
          ) : (
            <div className="order-list">
              {data.orders.map((o: any) => (
                <article className="panel order-row" key={o.id}>
                  <div>
                    <span className={'status-pill ' + (o.status === 'COMPLETED' ? 'success' : '')}>
                      {o.status}
                    </span>
                    <h3>{o.lines.map((l: any) => l.name).join(' + ')}</h3>
                    <code>{o.id}</code>
                    <p className="small muted">
                      {o.created_at} UTC ·{' '}
                      {o.lines.reduce((s: number, l: any) => s + l.quantity, 0)} units
                    </p>
                  </div>
                  <div>
                    <strong>{usd(o.total)}</strong>
                    <button
                      className="button outline small-button"
                      onClick={() => navigate('/checkout/' + o.quote_id)}
                    >
                      View order <ArrowUpRight size={14} />
                    </button>
                    {o.status === 'COMPLETED' && !o.returnRequest && (
                      <button className="text-button small" onClick={() => setReturnOrder(o)}>
                        Request return
                      </button>
                    )}
                    {o.returnRequest && <small>Return: {o.returnRequest.status}</small>}
                  </div>
                </article>
              ))}
            </div>
          )}
          <div className="section-mini-heading">
            <h2>Mission history</h2>
            <span className="tiny">{data.missions.length} MISSIONS</span>
          </div>
          <div className="mission-history">
            {data.missions.slice(0, 30).map((m: any) => (
              <div key={m.id}>
                <Command size={18} />
                <div>
                  <h3>{m.goal}</h3>
                  <p>
                    {JSON.parse(m.required).join(' · ')} / {m.quantity} set(s)
                  </p>
                </div>
                <b>{usd(m.budget)}</b>
              </div>
            ))}
          </div>
        </>
      )}
      {returnOrder && (
        <Modal title="REQUEST A RETURN" close={() => setReturnOrder(null)}>
          <h2>Tell the merchant.</h2>
          <p>
            A request does not issue a refund. The merchant reviews and authorizes it through
            PayPal.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await api('/orders/' + returnOrder.id + '/return', { reason });
                setReturnOrder(null);
                load();
                notify('Return request recorded.');
              } catch (e) {
                notify((e as Error).message);
              }
            }}
          >
            <label>
              Reason
              <textarea
                required
                minLength={5}
                maxLength={1000}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            <button className="button primary full">
              Send return request <ArrowRight size={16} />
            </button>
          </form>
        </Modal>
      )}
    </main>
  );
}
createRoot(document.getElementById('root')!).render(<App />);
