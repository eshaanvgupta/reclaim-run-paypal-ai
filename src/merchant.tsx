import { useState, useEffect, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, themeQuartz, type ColDef } from 'ag-grid-community';
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Box,
  ChartNoAxesCombined,
  Check,
  ChevronRight,
  Command,
  Download,
  FileUp,
  Grid2X2,
  KeyRound,
  Layers,
  LoaderCircle,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Target,
  TrendingUp,
  Wallet,
  X,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { api, usd, cats, csrf, type Config, type Product } from './api';
import { Modal, Empty } from './main';
ModuleRegistry.registerModules([AllCommunityModule]);
const gridTheme = themeQuartz.withParams({
  backgroundColor: '#121720',
  foregroundColor: '#f8f4e8',
  headerBackgroundColor: '#19212b',
  headerTextColor: '#8d99ab',
  borderColor: '#2b333d',
  rowHoverColor: '#202b2b',
  fontFamily: 'Space Grotesk',
  fontSize: 13,
  headerFontSize: 11,
  accentColor: '#cfff52',
  wrapperBorderRadius: 0,
  spacing: 7,
});
const tabs = [
  { id: 'command', label: 'Recovery command', icon: Command },
  { id: 'inventory', label: 'Inventory vault', icon: Box },
  { id: 'campaigns', label: 'Campaign forge', icon: Layers },
  { id: 'radar', label: 'Recovery radar', icon: ChartNoAxesCombined },
  { id: 'ledger', label: 'Payment ledger', icon: Wallet },
  { id: 'demand', label: 'Demand map', icon: Target },
  { id: 'settings', label: 'Workspace settings', icon: Settings },
];
export function Merchant({
  session,
  status,
  onLogin,
  notify,
  onProvider,
  config,
}: {
  session: any;
  status: any;
  onLogin: () => void;
  notify: (s: string) => void;
  onProvider: () => void;
  config: Config | null;
}) {
  const [tab, setTab] = useState('command'),
    [data, setData] = useState<any>(null),
    [error, setError] = useState(''),
    [search, setSearch] = useState(''),
    [edit, setEdit] = useState<Product | 'new' | null>(null),
    [importOpen, setImportOpen] = useState(false),
    [confirm, setConfirm] = useState<{ order: any; action: string } | null>(null),
    [busy, setBusy] = useState(false),
    [agentText, setAgentText] = useState(''),
    [agentLogs, setAgentLogs] = useState<string[]>([]);
  const isMerchant = ['owner', 'staff'].includes(session?.role),
    isOwner = session?.role === 'owner';
  const load = () =>
    api('/merchant')
      .then(setData)
      .catch((e) => setError(e.message));
  useEffect(() => {
    if (isMerchant) load();
  }, [isMerchant]);
  const cols = useMemo<ColDef<Product>[]>(
    () => [
      { field: 'sku', headerName: 'SKU', width: 115, pinned: 'left' },
      { field: 'name', headerName: 'Product', minWidth: 190, flex: 1 },
      { field: 'category', width: 130 },
      { field: 'available', headerName: 'Available', width: 110 },
      { field: 'reserved', headerName: 'Reserved', width: 110 },
      {
        field: 'ageDays',
        headerName: 'Age / days',
        width: 110,
        cellClassRules: { 'cell-warning': (p) => (p.value || 0) > 150 },
      },
      { field: 'retail', headerName: 'Retail', width: 110, valueFormatter: (p) => usd(p.value) },
      {
        field: 'price',
        headerName: 'Offer price',
        width: 120,
        valueFormatter: (p) => usd(p.value),
      },
      { field: 'cost', headerName: 'Unit cost', width: 110, valueFormatter: (p) => usd(p.value) },
      {
        field: 'floor',
        headerName: 'Price floor',
        width: 110,
        valueFormatter: (p) => usd(p.value),
      },
      {
        headerName: 'Est. margin',
        width: 120,
        valueGetter: (p) =>
          p.data ? Math.round(((p.data.price - p.data.cost!) / p.data.price) * 100) + '%' : '',
      },
    ],
    [],
  );
  const mutate = async (path: string, body: unknown = {}) => {
    setBusy(true);
    try {
      await api(path, body);
      await load();
      notify('Merchant records updated.');
      setConfirm(null);
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const analyze = async () => {
    if (!config) {
      onProvider();
      return;
    }
    setBusy(true);
    setAgentText('');
    setAgentLogs([]);
    try {
      const r = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf },
        body: JSON.stringify({
          config,
          mission: {
            goal: 'Analyze slow moving inventory with analyze_slow_moving_inventory. Propose a constrained useful office bundle and explain recovery tradeoffs. Do not change prices or campaigns.',
            budget: 20000,
            required: ['Lighting', 'Organization'],
            quantity: 1,
            excluded: [],
          },
        }),
      });
      if (!r.ok) throw new Error((await r.json()).error);
      const reader = r.body!.getReader(),
        decoder = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let e;
        while ((e = buf.indexOf('\n\n')) !== -1) {
          const block = buf.slice(0, e);
          buf = buf.slice(e + 2);
          if (!block.startsWith('data: ')) continue;
          const d = JSON.parse(block.slice(6));
          if (d.type === 'error') throw new Error(d.message);
          if (d.type === 'tool') setAgentLogs((old) => [...old, d.name + ' · ' + d.summary]);
          if (d.type === 'done')
            setAgentText(
              d.explanation ||
                `${d.toolCalls} tool calls completed. Offers generated from real inventory.`,
            );
        }
      }
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  if (!isMerchant)
    return (
      <main className="section app-page">
        <div className="merchant-login">
          <div className="run-reticle">
            <Command size={48} />
          </div>
          <span className="eyebrow">THE OTHER SIDE OF THE COUNTER</span>
          <h1>
            Merchant command<span>.</span>
          </h1>
          <p>
            Your stock, your rules, your recovery.
            <br />
            Sign in with the merchant account created during local setup.
          </p>
          <button className="button primary" onClick={onLogin}>
            Sign in to your workspace <KeyRound size={18} />
          </button>
          <p className="small muted">
            First time here? Run <code>npm run setup</code> in the project directory.
            <br />
            It creates a local owner account and prints a generated password.
          </p>
        </div>
      </main>
    );
  return (
    <main className="merchant-shell">
      <aside className="merchant-sidebar">
        <div className="workspace-badge">
          <span>R/R</span>
          <div>
            <strong>Reclaim Supply Co.</strong>
            <small>SYNTHETIC DEMO WORKSPACE</small>
          </div>
        </div>
        <div className="sidebar-label">MERCHANT OPERATIONS</div>
        <nav aria-label="Merchant navigation">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={tab === t.id ? 'active' : ''}
            >
              <t.icon size={17} />
              {t.label}
              {tab === t.id && <ChevronRight size={14} />}
            </button>
          ))}
        </nav>
        <div className="sidebar-health">
          <span>
            <i className={status.paypal ? 'live-dot' : 'offline-dot'} /> PayPal{' '}
            {status.paypal ? 'configured' : 'needs setup'}
          </span>
          <span>
            <i className={config ? 'live-dot' : 'offline-dot'} /> AI{' '}
            {config ? 'ready for this tab' : 'disconnected'}
          </span>
          <button onClick={onProvider}>
            Provider settings <SlidersHorizontal size={13} />
          </button>
        </div>
        <div className="sidebar-user">
          <span className="avatar">{session.role === 'owner' ? 'O' : 'S'}</span>
          <div>
            <strong>{session.email}</strong>
            <small>MERCHANT {session.role.toUpperCase()}</small>
          </div>
        </div>
      </aside>
      <div className="merchant-main">
        <div className="merchant-topline">
          <span className="tiny">
            WORKSPACE / {tabs.find((t) => t.id === tab)?.label.toUpperCase()}
          </span>
          <span className="sandbox-tag">SANDBOX MODE</span>
        </div>
        <div className="page-heading">
          <div>
            <span className="eyebrow">
              MERCHANT_{String(tabs.findIndex((t) => t.id === tab) + 1).padStart(2, '0')} / RECLAIM
              SUPPLY CO.
            </span>
            <h1>
              {tabs.find((t) => t.id === tab)?.label}
              <span>.</span>
            </h1>
            <p>
              {tab === 'command'
                ? 'Good stock. Better decisions. A second chance at value.'
                : tab === 'inventory'
                  ? 'Live quantities, approved prices, and margin boundaries.'
                  : tab === 'ledger'
                    ? 'Provider states are authoritative. Every financial event leaves a trail.'
                    : tab === 'campaigns'
                      ? 'Set the boundaries. Let useful offers do the work.'
                      : tab === 'radar'
                        ? 'Actual workspace records. Explicit assumptions. No invented sales.'
                        : tab === 'demand'
                          ? 'Aggregate mission needs, without personal buyer details.'
                          : 'One merchant of record. Clear roles. Secrets stay local.'}
            </p>
          </div>
          {tab === 'inventory' ? (
            <button className="button primary" onClick={() => setEdit('new')}>
              <Plus size={17} /> Add product
            </button>
          ) : (
            <button
              className="icon-button refresh-button"
              aria-label="Refresh merchant records"
              onClick={load}
            >
              <RefreshCw size={18} />
            </button>
          )}
        </div>
        {error && <div className="error-box">{error}</div>}
        {!data ? (
          <LoaderCircle className="spin" />
        ) : (
          <>
            {tab === 'command' && (
              <>
                <div className="metrics-grid">
                  {[
                    {
                      label: 'CONFIRMED NET REVENUE',
                      value: usd(data.metrics.revenue),
                      note: 'Captured totals less completed refunds',
                      icon: Wallet,
                    },
                    {
                      label: 'AGING STOCK AT COST',
                      value: usd(data.metrics.agingValue),
                      note: 'Available inventory aged 90+ days',
                      icon: Box,
                    },
                    {
                      label: 'VERIFIED SALES',
                      value: data.metrics.completed,
                      note: 'Orders with a confirmed capture',
                      icon: ShieldCheck,
                    },
                    {
                      label: 'EST. GROSS MARGIN',
                      value: data.metrics.grossMargin + '%',
                      note: 'Revenue less sold-item cost; not net profit',
                      icon: TrendingUp,
                    },
                  ].map((m) => (
                    <div className="metric-card" key={m.label}>
                      <div>
                        <span>{m.label}</span>
                        <m.icon size={16} />
                      </div>
                      <strong>{m.value}</strong>
                      <small>{m.note}</small>
                    </div>
                  ))}
                </div>
                <div className="merchant-two-col">
                  <section className="panel recovery-chart">
                    <div className="panel-title">
                      <span>STOCK AGING / AVAILABLE UNITS</span>
                      <span>LIVE</span>
                    </div>
                    <AgingChart products={data.products} />
                    <p className="small muted">
                      Days since synthetic stock arrival. Color indicates age, not predicted demand.
                    </p>
                  </section>
                  <section className="panel opportunities">
                    <div className="panel-title">
                      <span>RECOVERY SIGNALS</span>
                      <Activity size={16} />
                    </div>
                    <h2>
                      {data.products.filter((p: Product) => p.ageDays >= 150).length} SKUs
                      <br />
                      ready for a new mission.
                    </h2>
                    <p>
                      Oldest stock is eligible for discovery. Configured floors still protect every
                      offer.
                    </p>
                    <button className="button outline full" onClick={() => setTab('radar')}>
                      Open recovery radar <ArrowUpRight size={16} />
                    </button>
                  </section>
                </div>
                <section className="panel">
                  <div className="panel-title">
                    <span>PRIORITY STOCK</span>
                    <button className="text-button small" onClick={() => setTab('inventory')}>
                      View inventory <ArrowUpRight size={14} />
                    </button>
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>SKU / product</th>
                          <th>Age</th>
                          <th>Available</th>
                          <th>Offer price</th>
                          <th>Est. gross margin</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.products.slice(0, 5).map((p: Product) => (
                          <tr key={p.id}>
                            <td>
                              <b>{p.name}</b>
                              <small>{p.sku}</small>
                            </td>
                            <td className="orange-text">{p.ageDays} days</td>
                            <td>{p.available}</td>
                            <td>{usd(p.price)}</td>
                            <td>{Math.round(((p.price - p.cost!) / p.price) * 100)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
                <section className="merchant-analyst panel">
                  <div>
                    <span className="eyebrow">MERLIN / MERCHANT ANALYST</span>
                    <h3>Give the slow movers a second look.</h3>
                    <p>Read-only AI analysis. Campaign changes always need owner approval.</p>
                  </div>
                  <button className="button primary" onClick={analyze} disabled={busy}>
                    {busy ? <LoaderCircle className="spin" size={16} /> : <Activity size={16} />}{' '}
                    Analyze stock <ArrowRight size={16} />
                  </button>
                </section>
                {agentLogs.length > 0 && (
                  <div className="activity-log">
                    {agentLogs.map((l, i) => (
                      <div key={i}>
                        <Check size={13} />
                        <code>{l}</code>
                      </div>
                    ))}
                  </div>
                )}
                {agentText && <div className="agent-explanation">{agentText}</div>}
              </>
            )}
            {tab === 'inventory' && (
              <>
                <div className="catalog-toolbar">
                  <div className="search-field">
                    <Search size={16} />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search inventory…"
                      aria-label="Search merchant inventory"
                    />
                  </div>
                  <button
                    className="button outline small-button"
                    onClick={() => setImportOpen(true)}
                  >
                    <FileUp size={16} /> Import CSV
                  </button>
                  <a className="button outline small-button" href="/sample-inventory.csv" download>
                    <Download size={16} /> CSV template
                  </a>
                </div>
                <p className="small muted">
                  Double-click a row to edit. Money in this table is USD; CSV money fields use
                  integer cents.
                </p>
                <div className="inventory-grid">
                  <AgGridReact<Product>
                    theme={gridTheme}
                    rowData={data.products}
                    columnDefs={cols}
                    defaultColDef={{ sortable: true, filter: true, resizable: true }}
                    quickFilterText={search}
                    getRowId={(p) => p.data.id}
                    onRowDoubleClicked={(e) => e.data && setEdit(e.data)}
                    pagination
                    paginationPageSize={20}
                    paginationPageSizeSelector={[20, 50, 100]}
                    rowHeight={52}
                  />
                </div>
                <div className="inventory-mobile-edit">
                  {data.products.map((p: Product) => (
                    <button key={p.id} onClick={() => setEdit(p)}>
                      <span>{p.name}</span>
                      <span>{p.available} units / Edit ↗</span>
                    </button>
                  ))}
                </div>
              </>
            )}
            {tab === 'campaigns' && (
              <Campaigns data={data} isOwner={isOwner} notify={notify} refresh={load} />
            )}
            {tab === 'radar' && <Radar data={data} />}
            {tab === 'ledger' && (
              <>
                <div className="metrics-grid compact">
                  <div className="metric-card">
                    <span>CAPTURED ORDERS</span>
                    <strong>{data.metrics.completed}</strong>
                  </div>
                  <div className="metric-card">
                    <span>COMPLETED REFUNDS</span>
                    <strong>{usd(data.metrics.refunded)}</strong>
                  </div>
                  <div className="metric-card">
                    <span>RESERVED UNITS</span>
                    <strong>{data.metrics.reserved}</strong>
                  </div>
                </div>
                {data.orders.length ? (
                  <div className="ledger-list">
                    {data.orders.map((o: any) => (
                      <section key={o.id} className="panel ledger-order">
                        <div>
                          <span
                            className={'status-pill ' + (o.status === 'COMPLETED' ? 'success' : '')}
                          >
                            {o.status}
                          </span>
                          <strong>{usd(o.total)}</strong>
                        </div>
                        <h3>{o.lines.map((l: any) => l.name).join(' + ')}</h3>
                        <div className="ledger-ids">
                          <span>
                            ORDER <code>{o.id}</code>
                          </span>
                          <span>
                            PAYPAL <code>{o.paypal_id || 'Not yet created'}</code>
                          </span>
                          <span>
                            CAPTURE <code>{o.capture_id || 'No confirmed capture'}</code>
                          </span>
                          {o.refund_id && (
                            <span>
                              REFUND <code>{o.refund_id}</code>
                            </span>
                          )}
                        </div>
                        {o.returnRequest && (
                          <p className="setup-note">
                            Return requested: {o.returnRequest.reason} / {o.returnRequest.status}
                          </p>
                        )}
                        <div className="ledger-actions">
                          {o.paypal_id && (
                            <button
                              className="button outline small-button"
                              disabled={busy}
                              onClick={() => mutate('/merchant/orders/' + o.id + '/reconcile')}
                            >
                              Reconcile <RefreshCw size={14} />
                            </button>
                          )}
                          {isOwner && ['COMPLETED', 'REFUND_PENDING'].includes(o.status) && (
                            <button
                              className="button outline small-button"
                              onClick={() => setConfirm({ order: o, action: 'refund' })}
                            >
                              Review full refund
                            </button>
                          )}
                          {isOwner && o.status === 'REFUNDED' && (
                            <button
                              className="button outline small-button"
                              onClick={() => setConfirm({ order: o, action: 'restock' })}
                            >
                              Inspect & restock return
                            </button>
                          )}
                        </div>
                      </section>
                    ))}
                  </div>
                ) : (
                  <Empty
                    title="No provider orders yet."
                    text="A payment attempt creates a ledger entry. Revenue remains zero until PayPal confirms a capture."
                  />
                )}
              </>
            )}
            {tab === 'demand' && (
              <>
                <div className="panel">
                  <div className="panel-title">
                    <span>MISSION NEEDS / AGGREGATED</span>
                    <span>{data.metrics.missions} MISSIONS</span>
                  </div>
                  {cats.map((c) => {
                    const count = data.demand
                      .filter((d: any) => d.categories.includes(c))
                      .reduce((s: number, d: any) => s + d.count, 0);
                    return (
                      <div className="demand-row" key={c}>
                        <span>{c}</span>
                        <div>
                          <span
                            style={{
                              width:
                                (data.metrics.missions
                                  ? (count / data.metrics.missions) * 100
                                  : 0) + '%',
                            }}
                          />
                        </div>
                        <b>{count}</b>
                      </div>
                    );
                  })}
                  <p className="small muted">
                    One mission may require multiple categories. Counts describe app usage, not
                    verified buyer demand or conversion.
                  </p>
                </div>
                <div className="panel funnel-panel">
                  <span className="eyebrow">ORDER STATUS FUNNEL</span>
                  {[
                    { name: 'Missions', n: data.metrics.missions },
                    { name: 'Reserved quotes', n: data.metrics.quotes },
                    { name: 'Provider orders', n: data.orders.length },
                    { name: 'Confirmed captures', n: data.metrics.completed },
                  ].map((x) => (
                    <div key={x.name}>
                      <span>{x.name}</span>
                      <strong>{x.n}</strong>
                    </div>
                  ))}
                  <p className="small muted">
                    Aggregate event counts. Repeated runs and quotes can belong to the same buyer.
                  </p>
                </div>
              </>
            )}
            {tab === 'settings' && (
              <SettingsView
                session={session}
                status={status}
                config={config}
                onProvider={onProvider}
                notify={notify}
              />
            )}
          </>
        )}
      </div>
      {edit && (
        <ProductEditor
          product={edit}
          close={() => setEdit(null)}
          save={async (body) => {
            try {
              await api(
                '/merchant/products' + (edit === 'new' ? '' : '/' + edit.id),
                body,
                edit === 'new' ? 'POST' : 'PUT',
              );
              setEdit(null);
              load();
              notify('Product saved.');
            } catch (e) {
              throw e;
            }
          }}
        />
      )}
      {importOpen && (
        <ImportModal
          close={() => setImportOpen(false)}
          done={() => {
            setImportOpen(false);
            load();
            notify('CSV imported into the vault.');
          }}
        />
      )}
      {confirm && (
        <Modal
          title={
            confirm.action === 'refund'
              ? 'MERCHANT REFUND AUTHORIZATION'
              : 'CONFIRM SALEABLE RETURN'
          }
          close={() => setConfirm(null)}
        >
          <h2>{confirm.action === 'refund' ? 'Refund this capture?' : 'Inspect. Then restock.'}</h2>
          <p>
            {confirm.action === 'refund'
              ? `This requests a full ${usd(confirm.order.total)} USD sandbox refund through PayPal. Stock will not change automatically.`
              : 'Confirm every item in this order has physically returned and is in saleable condition. Each returned unit will be added once.'}
          </p>
          <code className="small">{confirm.order.id}</code>
          <button
            className="button primary full"
            disabled={busy}
            onClick={() =>
              mutate('/merchant/orders/' + confirm.order.id + '/' + confirm.action, {
                confirm: true,
              })
            }
          >
            {busy ? <LoaderCircle className="spin" size={16} /> : <ShieldCheck size={16} />}{' '}
            {confirm.action === 'refund'
              ? 'Authorize sandbox refund'
              : 'Confirm inspection & restore stock'}
          </button>
        </Modal>
      )}
    </main>
  );
}
function AgingChart({ products }: { products: Product[] }) {
  const bands = [
      { name: '0–30', min: 0, max: 30 },
      { name: '31–90', min: 31, max: 90 },
      { name: '91–150', min: 91, max: 150 },
      { name: '151–210', min: 151, max: 210 },
      { name: '210+', min: 211, max: 10000 },
    ],
    counts = bands.map((b) =>
      products
        .filter((p) => p.ageDays >= b.min && p.ageDays <= b.max)
        .reduce((s, p) => s + p.available, 0),
    ),
    max = Math.max(1, ...counts);
  return (
    <div className="aging-chart">
      {bands.map((b, i) => (
        <div className="aging-band" key={b.name}>
          <span>{counts[i]}</span>
          <div
            style={{
              height: Math.max(3, (counts[i] / max) * 140) + 'px',
              background: ['#667164', '#8ca56c', '#cfff52', '#efb061', '#ff7448'][i],
            }}
          />
          <small>{b.name}</small>
        </div>
      ))}
    </div>
  );
}
function Radar({ data }: { data: any }) {
  const products: Product[] = data.products;
  return (
    <>
      <div className="merchant-two-col">
        <section className="panel">
          <div className="panel-title">
            <span>STOCK AGE HEAT MAP</span>
          </div>
          <div className="heat-map">
            {products.map((p) => (
              <div
                key={p.id}
                className={p.ageDays > 180 ? 'old' : p.ageDays > 120 ? 'aging' : 'recent'}
                title={`${p.name}: ${p.available} available, ${p.ageDays} days`}
              >
                <strong>{p.sku}</strong>
                <span>{p.ageDays}d</span>
                <small>{p.available} units</small>
              </div>
            ))}
          </div>
          <p className="small muted">
            Age thresholds: &lt;121 / 121–180 / &gt;180 days. Synthetic starting inventory.
          </p>
        </section>
        <section className="panel">
          <div className="panel-title">
            <span>REVENUE BY CATEGORY</span>
          </div>
          {cats.map((c) => {
            const revenue = data.orders
              .filter((o: any) => ['COMPLETED', 'REFUNDED', 'REFUND_PENDING'].includes(o.status))
              .reduce(
                (s: number, o: any) =>
                  s +
                  o.lines
                    .filter((l: any) => l.category === c)
                    .reduce((s: number, l: any) => s + l.quantity * l.unit_price, 0),
                0,
              );
            return (
              <div className="radar-row" key={c}>
                <span>{c}</span>
                <strong>{usd(revenue)}</strong>
              </div>
            );
          })}
          <p className="small muted">
            Gross captured merchandise by category, before refunds. Unpaid quotes are excluded.
          </p>
        </section>
      </div>
      <div className="merchant-two-col">
        <section className="panel">
          <div className="panel-title">
            <span>PRICE / MARGIN FRONTIER</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Retail</th>
                  <th>Permitted price</th>
                  <th>Margin</th>
                </tr>
              </thead>
              <tbody>
                {products.slice(0, 8).map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{usd(p.retail)}</td>
                    <td>{usd(p.price)}</td>
                    <td>{Math.round(((p.price - p.cost!) / p.price) * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="panel">
          <div className="panel-title">
            <span>RECOVERY WATERFALL / ACTUAL RECORDS</span>
          </div>
          {[
            { label: 'Available stock at cost', n: data.metrics.stockValue },
            { label: '90+ day exposure at cost', n: data.metrics.agingValue },
            { label: 'Captured revenue, less refunds', n: data.metrics.revenue },
            { label: 'Sold-item cost basis', n: data.metrics.cost },
            { label: 'Discounts on captured sales', n: data.metrics.discounts },
          ].map((x) => (
            <div className="radar-row" key={x.label}>
              <span>{x.label}</span>
              <strong>{usd(x.n)}</strong>
            </div>
          ))}
          <p className="small muted">
            These are separately labeled measures, not an additive profit calculation. Fees, tax,
            fulfillment and operating expenses are excluded.
          </p>
        </section>
      </div>
      <section className="panel">
        <div className="panel-title">
          <span>DURABLE AUDIT TRAIL</span>
        </div>
        {data.audit.length ? (
          data.audit.map((a: any, i: number) => (
            <div className="audit-row" key={i}>
              <code>{a.action}</code>
              <span>{a.entity}</span>
              <time>{a.created_at} UTC</time>
            </div>
          ))
        ) : (
          <p className="muted">No merchant or payment mutations recorded yet.</p>
        )}
      </section>
    </>
  );
}
function Campaigns({
  data,
  isOwner,
  notify,
  refresh,
}: {
  data: any;
  isOwner: boolean;
  notify: (s: string) => void;
  refresh: () => void;
}) {
  const [name, setName] = useState('Second chance / lighting'),
    [category, setCategory] = useState('Lighting'),
    [discount, setDiscount] = useState(20),
    [busy, setBusy] = useState(false);
  return (
    <div className="merchant-two-col">
      <section className="panel">
        <span className="eyebrow">OWNER-APPROVED POLICY</span>
        <h2>Make room for a new run.</h2>
        <p>
          Discounts are bounded by each product's contractual floor and required gross margin.
          Existing reserved quotes keep their agreed prices.
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await api('/merchant/campaigns', {
                name,
                category,
                discountBps: Math.round(discount * 100),
              });
              refresh();
              notify('Campaign approved. Future quotes use the new policy.');
            } catch (e) {
              notify((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Campaign name
            <input
              required
              minLength={3}
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <div className="form-row">
            <label>
              Inventory zone
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                {cats.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              Maximum discount %
              <input
                type="number"
                min="0"
                max="80"
                step=".01"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
              />
            </label>
          </div>
          <label className="checkbox-label">
            <input type="checkbox" required />
            <span>I approve this discount policy for future quotes in this category.</span>
          </label>
          <button className="button primary full" disabled={busy || !isOwner}>
            <ShieldCheck size={17} /> Approve campaign <ArrowRight size={16} />
          </button>
          {!isOwner && (
            <p className="small muted">Only the merchant owner can change pricing policy.</p>
          )}
        </form>
      </section>
      <section className="panel">
        <div className="panel-title">
          <span>CAMPAIGN RECORDS</span>
        </div>
        {data.campaigns.length ? (
          data.campaigns.map((c: any) => (
            <div className="campaign-row" key={c.id}>
              <span className="status-pill success">APPROVED POLICY</span>
              <h3>{c.name}</h3>
              <p>
                {c.category} / up to {c.discount_bps / 100}% off retail
              </p>
              <small className="muted">{c.created_at} UTC</small>
            </div>
          ))
        ) : (
          <Empty
            title="No campaigns approved yet."
            text="The seeded catalog uses its initial 20% maximum discount. Approve a campaign to change future offers."
          />
        )}
      </section>
    </div>
  );
}
function SettingsView({
  session,
  status,
  config,
  onProvider,
  notify,
}: {
  session: any;
  status: any;
  config: Config | null;
  onProvider: () => void;
  notify: (s: string) => void;
}) {
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState('');
  return (
    <div className="settings-stack">
      <section className="panel">
        <span className="eyebrow">PAYMENT BOUNDARIES</span>
        <h2>One merchant. Sandbox only.</h2>
        <div className="settings-line">
          <span>Currency</span>
          <b>USD</b>
        </div>
        <div className="settings-line">
          <span>PayPal environment</span>
          <b>SANDBOX / locked in server code</b>
        </div>
        <div className="settings-line">
          <span>Merchant credential status</span>
          <b className={status.paypal ? 'lime-text' : 'orange-text'}>
            {status.paypal
              ? 'Configured · live API verification still required'
              : 'Needs configuration'}
          </b>
        </div>
        <p className="small muted">
          Set PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_MERCHANT_ID and optionally
          PAYPAL_WEBHOOK_ID in your local .env. Secrets never reach the browser. Live commerce
          requires a separate reviewed integration and merchant approval.
        </p>
      </section>
      <section className="panel">
        <span className="eyebrow">AI CONNECTION / MEMORY ONLY</span>
        <h2>{config ? `${config.provider} · ${config.model}` : 'Choose your own provider.'}</h2>
        <p>
          Bring your own API key or use local Ollama. Keys are never saved. Refreshing or
          disconnecting clears them from application state.
        </p>
        <button className="button outline" onClick={onProvider}>
          Open provider settings <SlidersHorizontal size={16} />
        </button>
      </section>
      {session.role === 'owner' && (
        <section className="panel">
          <span className="eyebrow">STAFF ACCESS</span>
          <h2>A trusted pair of hands.</h2>
          <p>
            Staff can manage catalog and reconcile orders. Owner approval is required for campaigns,
            refunds, and restocking.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await api('/merchant/staff', { email, password });
                setEmail('');
                setPassword('');
                notify('Staff account created. Share the password securely.');
              } catch (e) {
                notify((e as Error).message);
              }
            }}
          >
            <div className="form-row">
              <label>
                Staff email
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>
              <label>
                Initial password
                <input
                  type="password"
                  minLength={10}
                  maxLength={128}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </label>
            </div>
            <button className="button primary">
              Create staff account <Plus size={17} />
            </button>
          </form>
        </section>
      )}
      <section className="panel">
        <span className="eyebrow">DEMONSTRATION ECONOMICS</span>
        <p>
          Quality scores, retail references, stock arrival ages and initial quantities are synthetic
          merchant configuration. Tax and shipping are zero for sandbox demonstration goods. Gross
          margin excludes payment fees, fulfillment costs and operating expenses. The platform does
          not split payments or hold funds in escrow.
        </p>
      </section>
    </div>
  );
}
function ProductEditor({
  product,
  close,
  save,
}: {
  product: Product | 'new';
  close: () => void;
  save: (p: any) => Promise<void>;
}) {
  const [form, setForm] = useState<any>(
      product === 'new'
        ? {
            sku: '',
            name: '',
            description: '',
            category: 'Lighting',
            cost: 1000,
            retail: 3000,
            floor: 1800,
            stock: 10,
            ageDays: 0,
            quality: 75,
            discountBps: 2000,
            marginBps: 2500,
            clearance: true,
            tags: '',
          }
        : product,
    ),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const set = (key: string, value: any) => setForm((old: any) => ({ ...old, [key]: value }));
  return (
    <Modal
      title={product === 'new' ? 'ADD STOCK / PRODUCT RECORD' : 'EDIT STOCK / PRODUCT RECORD'}
      close={close}
      wide
    >
      <h2>{product === 'new' ? 'A new second chance.' : form.name}</h2>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError('');
          try {
            await save(form);
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="form-row">
          <label>
            SKU
            <input
              required
              pattern="[A-Za-z0-9_-]{2,40}"
              value={form.sku}
              onChange={(e) => set('sku', e.target.value)}
            />
          </label>
          <label>
            Product name
            <input
              required
              minLength={2}
              maxLength={100}
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
            />
          </label>
        </div>
        <div className="form-row">
          <label>
            Category
            <select value={form.category} onChange={(e) => set('category', e.target.value)}>
              {cats.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            On-hand stock
            <input
              type="number"
              min="0"
              max="100000"
              value={form.stock}
              onChange={(e) => set('stock', Number(e.target.value))}
            />
          </label>
        </div>
        <div className="form-row three">
          {[
            { key: 'cost', label: 'Unit cost / USD' },
            { key: 'retail', label: 'Retail price / USD' },
            { key: 'floor', label: 'Contractual floor / USD' },
          ].map((f) => (
            <label key={f.key}>
              {f.label}
              <input
                type="number"
                required
                min=".01"
                step=".01"
                value={form[f.key] / 100}
                onChange={(e) => set(f.key, Math.round(Number(e.target.value) * 100))}
              />
            </label>
          ))}
        </div>
        <div className="form-row three">
          <label>
            Stock age / days
            <input
              type="number"
              min="0"
              max="3650"
              value={form.ageDays}
              onChange={(e) => set('ageDays', Number(e.target.value))}
            />
          </label>
          <label>
            Quality score / 100
            <input
              type="number"
              min="1"
              max="100"
              value={form.quality}
              onChange={(e) => set('quality', Number(e.target.value))}
            />
          </label>
          <label>
            Required margin %
            <input
              type="number"
              min="0"
              max="90"
              step=".01"
              value={form.marginBps / 100}
              onChange={(e) => set('marginBps', Math.round(Number(e.target.value) * 100))}
            />
          </label>
        </div>
        <div className="form-row">
          <label>
            Maximum discount %
            <input
              type="number"
              min="0"
              max="80"
              step=".01"
              value={form.discountBps / 100}
              onChange={(e) => set('discountBps', Math.round(Number(e.target.value) * 100))}
            />
          </label>
          <label>
            Tags
            <input
              value={form.tags}
              onChange={(e) => set('tags', e.target.value)}
              maxLength={300}
            />
          </label>
        </div>
        <label>
          Description
          <textarea
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            maxLength={1000}
          />
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={form.clearance}
            onChange={(e) => set('clearance', e.target.checked)}
          />
          <span>Eligible for clearance offers</span>
        </label>
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
        <button className="button primary full" disabled={busy}>
          {busy ? <LoaderCircle size={17} className="spin" /> : <Check size={17} />} Save product
          record
        </button>
      </form>
    </Modal>
  );
}
function ImportModal({ close, done }: { close: () => void; done: () => void }) {
  const [csv, setCsv] = useState(''),
    [mapping, setMapping] = useState('{}'),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  return (
    <Modal title="IMPORT STOCK / VALIDATED CSV" close={close} wide>
      <h2>Bring the vault with you.</h2>
      <p>
        1–500 products per import. Money fields use integer cents. The whole import is rolled back
        if any row fails.
      </p>
      <a className="text-button" href="/sample-inventory.csv" download>
        Download sample template <Download size={15} />
      </a>
      <label className="file-drop">
        <FileUp size={24} /> Choose a CSV file
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            if (f.size > 300000) {
              setError('CSV must be smaller than 300 KB.');
              return;
            }
            setCsv(await f.text());
          }}
        />
      </label>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError('');
          try {
            await api('/merchant/import', { csv, mapping: JSON.parse(mapping) });
            done();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          CSV preview / editable
          <textarea
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            rows={6}
            required
            maxLength={300000}
            spellCheck={false}
          />
        </label>
        <label>
          Column mapping / JSON
          <input
            value={mapping}
            onChange={(e) => setMapping(e.target.value)}
            placeholder={'{"Product Code":"sku","Price Cents":"retail"}'}
          />
          <small>Map your header names to template fields. Standard headers need no mapping.</small>
        </label>
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
        <button className="button primary full" disabled={busy || !csv}>
          {busy ? <LoaderCircle className="spin" size={17} /> : <FileUp size={17} />} Validate &
          import
        </button>
      </form>
    </Modal>
  );
}
