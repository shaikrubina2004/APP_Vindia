import { useState } from "react";
import "./FinanceSettings.css";

const NAV_ITEMS = [
  { id: "general",   label: "General",         icon: "⚙️" },
  { id: "tax",       label: "Tax Configuration",icon: "📊" },
  { id: "invoice",   label: "Invoice Settings", icon: "🧾" },
  { id: "payment",   label: "Payment Methods",  icon: "💳" },
  { id: "bank",      label: "Bank Accounts",    icon: "🏦" },
  { id: "notify",    label: "Notifications",    icon: "🔔" },
  { id: "access",    label: "Access & Roles",   icon: "🔐" },
];

const CURRENCIES = ["INR – Indian Rupee (₹)", "USD – US Dollar ($)", "EUR – Euro (€)", "GBP – Pound (£)", "AED – Dirham (د.إ)"];
const FISCAL_YEARS = ["April – March (India Standard)", "January – December", "July – June", "October – September"];
const DATE_FORMATS = ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD", "DD-MMM-YYYY"];
const TAX_TYPES = ["GST", "IGST", "CGST + SGST", "TDS", "VAT"];

function Toggle({ checked, onChange }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`fs-toggle ${checked ? "fs-toggle--on" : ""}`}
    >
      <span className="fs-toggle__thumb" />
    </button>
  );
}

function Select({ value, onChange, options, id }) {
  return (
    <select id={id} className="fs-select" value={value} onChange={e => onChange(e.target.value)}>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function Input({ value, onChange, placeholder, type = "text", id }) {
  return (
    <input
      id={id}
      type={type}
      className="fs-input"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}

function FieldRow({ label, hint, children }) {
  return (
    <div className="fs-field-row">
      <div className="fs-field-label">
        <span className="fs-label">{label}</span>
        {hint && <span className="fs-hint">{hint}</span>}
      </div>
      <div className="fs-field-control">{children}</div>
    </div>
  );
}

function Card({ title, subtitle, children }) {
  return (
    <div className="fs-card">
      {title && (
        <div className="fs-card__header">
          <h3 className="fs-card__title">{title}</h3>
          {subtitle && <p className="fs-card__subtitle">{subtitle}</p>}
        </div>
      )}
      <div className="fs-card__body">{children}</div>
    </div>
  );
}

function Badge({ color, children }) {
  return <span className={`fs-badge fs-badge--${color}`}>{children}</span>;
}

// ─── Sections ───────────────────────────────────────────────────────────────

function GeneralSection() {
  const [currency, setCurrency] = useState(CURRENCIES[0]);
  const [fiscal, setFiscal]     = useState(FISCAL_YEARS[0]);
  const [dateFormat, setDate]   = useState(DATE_FORMATS[0]);
  const [companyName, setComp]  = useState("Vindia Technologies Pvt. Ltd.");
  const [gstin, setGstin]       = useState("");
  const [pan, setPan]           = useState("");

  return (
    <div className="fs-section-body">
      <Card title="Organisation Details" subtitle="Basic information about your company used across all financial documents.">
        <FieldRow label="Company Name">
          <Input value={companyName} onChange={setComp} placeholder="Your company name" />
        </FieldRow>
        <FieldRow label="GSTIN" hint="15-digit GST Identification Number">
          <Input value={gstin} onChange={setGstin} placeholder="e.g. 29AABCT1332L1ZM" />
        </FieldRow>
        <FieldRow label="PAN Number">
          <Input value={pan} onChange={setPan} placeholder="e.g. AABCT1332L" />
        </FieldRow>
      </Card>

      <Card title="Regional Settings" subtitle="Localisation preferences applied to all reports and documents.">
        <FieldRow label="Base Currency" hint="All amounts will be recorded in this currency">
          <Select value={currency} onChange={setCurrency} options={CURRENCIES} />
        </FieldRow>
        <FieldRow label="Fiscal Year" hint="Your accounting period start and end month">
          <Select value={fiscal} onChange={setFiscal} options={FISCAL_YEARS} />
        </FieldRow>
        <FieldRow label="Date Format">
          <Select value={dateFormat} onChange={setDate} options={DATE_FORMATS} />
        </FieldRow>
      </Card>
    </div>
  );
}

function TaxSection() {
  const [gstEnabled, setGst]   = useState(true);
  const [tdsEnabled, setTds]   = useState(false);
  const [gstRate, setGstRate]  = useState("18");
  const [tdsRate, setTdsRate]  = useState("10");
  const [taxes, setTaxes]      = useState([
    { id: 1, name: "GST 18%",  rate: "18%", type: "GST",  status: true  },
    { id: 2, name: "GST 12%",  rate: "12%", type: "GST",  status: true  },
    { id: 3, name: "GST 5%",   rate: "5%",  type: "GST",  status: false },
    { id: 4, name: "TDS 10%",  rate: "10%", type: "TDS",  status: false },
  ]);

  const toggleTax = (id) =>
    setTaxes(prev => prev.map(t => t.id === id ? { ...t, status: !t.status } : t));

  return (
    <div className="fs-section-body">
      <Card title="Tax Configuration" subtitle="Configure applicable taxes for your transactions.">
        <FieldRow label="Enable GST" hint="Goods and Services Tax (India)">
          <Toggle checked={gstEnabled} onChange={setGst} />
        </FieldRow>
        {gstEnabled && (
          <FieldRow label="Default GST Rate (%)" hint="Applied when no specific rate is set">
            <Input value={gstRate} onChange={setGstRate} type="number" placeholder="18" />
          </FieldRow>
        )}
        <div className="fs-divider" />
        <FieldRow label="Enable TDS" hint="Tax Deducted at Source">
          <Toggle checked={tdsEnabled} onChange={setTds} />
        </FieldRow>
        {tdsEnabled && (
          <FieldRow label="Default TDS Rate (%)" hint="Section 194C/194J rate">
            <Input value={tdsRate} onChange={setTdsRate} type="number" placeholder="10" />
          </FieldRow>
        )}
      </Card>

      <Card title="Tax Slabs" subtitle="Manage all applicable tax rates.">
        <div className="fs-table-wrap">
          <table className="fs-table">
            <thead>
              <tr>
                <th>Tax Name</th>
                <th>Rate</th>
                <th>Type</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {taxes.map(t => (
                <tr key={t.id}>
                  <td className="fs-table__name">{t.name}</td>
                  <td><Badge color="blue">{t.rate}</Badge></td>
                  <td><Badge color="gray">{t.type}</Badge></td>
                  <td><Toggle checked={t.status} onChange={() => toggleTax(t.id)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className="fs-btn-ghost fs-btn-ghost--add">+ Add Tax Slab</button>
      </Card>
    </div>
  );
}

function InvoiceSection() {
  const [prefix, setPrefix]   = useState("INV-");
  const [nextNum, setNext]     = useState("1001");
  const [terms, setTerms]      = useState("Payment due within 30 days of invoice date.");
  const [footer, setFooter]    = useState("Thank you for your business!");
  const [autoSend, setAuto]    = useState(true);
  const [dueRemind, setDue]    = useState(true);
  const [logo, setLogo]        = useState(true);
  const [sign, setSign]        = useState(false);

  return (
    <div className="fs-section-body">
      <Card title="Invoice Numbering" subtitle="Control how invoice numbers are generated.">
        <FieldRow label="Invoice Prefix" hint="Prepended to each invoice number">
          <Input value={prefix} onChange={setPrefix} placeholder="INV-" />
        </FieldRow>
        <FieldRow label="Next Invoice Number" hint="Auto-increments with each new invoice">
          <Input value={nextNum} onChange={setNext} type="number" placeholder="1001" />
        </FieldRow>
        <div className="fs-preview-tag">
          Preview: <strong>{prefix}{nextNum}</strong>
        </div>
      </Card>

      <Card title="Invoice Content" subtitle="Default text shown on all invoices.">
        <FieldRow label="Terms & Conditions">
          <textarea
            className="fs-textarea"
            value={terms}
            onChange={e => setTerms(e.target.value)}
            rows={3}
            placeholder="Enter your payment terms..."
          />
        </FieldRow>
        <FieldRow label="Footer Note">
          <textarea
            className="fs-textarea"
            value={footer}
            onChange={e => setFooter(e.target.value)}
            rows={2}
            placeholder="Optional closing note..."
          />
        </FieldRow>
      </Card>

      <Card title="Invoice Preferences">
        <FieldRow label="Show Company Logo" hint="Display logo on PDF exports">
          <Toggle checked={logo} onChange={setLogo} />
        </FieldRow>
        <FieldRow label="Include Digital Signature" hint="Append authorised signatory block">
          <Toggle checked={sign} onChange={setSign} />
        </FieldRow>
        <FieldRow label="Auto-send on Creation" hint="Email invoice to client immediately">
          <Toggle checked={autoSend} onChange={setAuto} />
        </FieldRow>
        <FieldRow label="Payment Due Reminders" hint="Send automated reminder emails">
          <Toggle checked={dueRemind} onChange={setDue} />
        </FieldRow>
      </Card>
    </div>
  );
}

function PaymentSection() {
  const [razorpay, setRazorpay] = useState(false);
  const [stripe, setStripe]     = useState(false);
  const [upi, setUpi]           = useState(true);
  const [upiId, setUpiId]       = useState("");
  const [rzKey, setRzKey]       = useState("");

  return (
    <div className="fs-section-body">
      <Card title="Payment Gateways" subtitle="Connect payment gateways to accept online payments.">
        <div className="fs-gateway-card">
          <div className="fs-gateway-info">
            <span className="fs-gateway-logo fs-gateway-logo--upi">UPI</span>
            <div>
              <p className="fs-gateway-name">UPI / BHIM</p>
              <p className="fs-hint">Instant bank transfers via UPI ID</p>
            </div>
          </div>
          <Toggle checked={upi} onChange={setUpi} />
        </div>
        {upi && (
          <div className="fs-gateway-detail">
            <FieldRow label="UPI ID" hint="e.g. yourcompany@icici">
              <Input value={upiId} onChange={setUpiId} placeholder="company@bankname" />
            </FieldRow>
          </div>
        )}

        <div className="fs-divider" />

        <div className="fs-gateway-card">
          <div className="fs-gateway-info">
            <span className="fs-gateway-logo fs-gateway-logo--rz">RZ</span>
            <div>
              <p className="fs-gateway-name">Razorpay</p>
              <p className="fs-hint">Cards, UPI, wallets, EMI</p>
            </div>
          </div>
          <Toggle checked={razorpay} onChange={setRazorpay} />
        </div>
        {razorpay && (
          <div className="fs-gateway-detail">
            <FieldRow label="API Key" hint="From Razorpay Dashboard → Settings → API Keys">
              <Input value={rzKey} onChange={setRzKey} placeholder="rzp_live_xxxxxxxxxxxxxxxx" />
            </FieldRow>
          </div>
        )}

        <div className="fs-divider" />

        <div className="fs-gateway-card">
          <div className="fs-gateway-info">
            <span className="fs-gateway-logo fs-gateway-logo--stripe">ST</span>
            <div>
              <p className="fs-gateway-name">Stripe</p>
              <p className="fs-hint">International payments & subscriptions</p>
            </div>
          </div>
          <Toggle checked={stripe} onChange={setStripe} />
        </div>
        {stripe && (
          <div className="fs-gateway-detail">
            <FieldRow label="Publishable Key">
              <Input value="" onChange={() => {}} placeholder="pk_live_xxxxxxxxxxxxxxxx" />
            </FieldRow>
            <FieldRow label="Secret Key" hint="Keep this confidential">
              <Input value="" onChange={() => {}} type="password" placeholder="sk_live_xxxxxxxxxxxxxxxx" />
            </FieldRow>
          </div>
        )}
      </Card>
    </div>
  );
}

function BankSection() {
  const [accounts] = useState([
    { id: 1, bank: "HDFC Bank",  account: "XXXX XXXX 4523", ifsc: "HDFC0001234", primary: true  },
    { id: 2, bank: "ICICI Bank", account: "XXXX XXXX 8891", ifsc: "ICIC0002345", primary: false },
  ]);

  return (
    <div className="fs-section-body">
      <Card title="Bank Accounts" subtitle="Accounts used for payouts, reimbursements and vendor payments.">
        <div className="fs-bank-list">
          {accounts.map(a => (
            <div className="fs-bank-card" key={a.id}>
              <div className="fs-bank-avatar">{a.bank[0]}</div>
              <div className="fs-bank-details">
                <p className="fs-bank-name">{a.bank} {a.primary && <Badge color="green">Primary</Badge>}</p>
                <p className="fs-hint">{a.account} &nbsp;·&nbsp; IFSC: {a.ifsc}</p>
              </div>
              <button className="fs-btn-icon" title="Edit">✏️</button>
            </div>
          ))}
        </div>
        <button className="fs-btn-ghost fs-btn-ghost--add">+ Add Bank Account</button>
      </Card>
    </div>
  );
}

function NotifySection() {
  const rows = [
    { key: "inv_created",  label: "Invoice Created",          hint: "Notify when a new invoice is raised" },
    { key: "inv_paid",     label: "Invoice Paid",             hint: "Notify when a payment is received" },
    { key: "inv_overdue",  label: "Invoice Overdue",          hint: "Alert when payment crosses due date" },
    { key: "exp_approval", label: "Expense Approval",         hint: "Pending expense awaiting approval" },
    { key: "payroll_due",  label: "Payroll Due Reminder",     hint: "Reminder before payroll processing date" },
    { key: "tax_filing",   label: "Tax Filing Deadline",      hint: "GST / TDS filing deadline reminder" },
    { key: "low_balance",  label: "Low Account Balance",      hint: "Alert when balance drops below threshold" },
  ];
  const [states, setStates] = useState(
    Object.fromEntries(rows.map(r => [r.key, true]))
  );
  const toggle = k => setStates(p => ({ ...p, [k]: !p[k] }));

  return (
    <div className="fs-section-body">
      <Card title="Notification Preferences" subtitle="Choose which finance events trigger in-app and email notifications.">
        {rows.map((r, i) => (
          <div key={r.key}>
            <FieldRow label={r.label} hint={r.hint}>
              <Toggle checked={states[r.key]} onChange={() => toggle(r.key)} />
            </FieldRow>
            {i < rows.length - 1 && <div className="fs-divider" />}
          </div>
        ))}
      </Card>
    </div>
  );
}

function AccessSection() {
  const roles = [
    { role: "Finance Manager",  perms: ["View", "Create", "Edit", "Delete", "Approve", "Export"],     color: "blue"   },
    { role: "Accountant",       perms: ["View", "Create", "Edit", "Export"],                          color: "green"  },
    { role: "Auditor",          perms: ["View", "Export"],                                            color: "gray"   },
    { role: "Department Head",  perms: ["View", "Approve"],                                           color: "amber"  },
  ];

  return (
    <div className="fs-section-body">
      <Card title="Role Permissions" subtitle="Define what each role can do within the Finance module.">
        <div className="fs-role-list">
          {roles.map(r => (
            <div className="fs-role-row" key={r.role}>
              <div className="fs-role-name">
                <span className={`fs-role-dot fs-role-dot--${r.color}`} />
                {r.role}
              </div>
              <div className="fs-role-perms">
                {r.perms.map(p => <Badge key={p} color={r.color}>{p}</Badge>)}
              </div>
              <button className="fs-btn-icon">✏️</button>
            </div>
          ))}
        </div>
        <button className="fs-btn-ghost fs-btn-ghost--add">+ Add Custom Role</button>
      </Card>
    </div>
  );
}

const SECTION_MAP = {
  general: GeneralSection,
  tax:     TaxSection,
  invoice: InvoiceSection,
  payment: PaymentSection,
  bank:    BankSection,
  notify:  NotifySection,
  access:  AccessSection,
};

const SECTION_TITLES = {
  general: "General Settings",
  tax:     "Tax Configuration",
  invoice: "Invoice Settings",
  payment: "Payment Methods",
  bank:    "Bank Accounts",
  notify:  "Notifications",
  access:  "Access & Roles",
};

// ─── Root ────────────────────────────────────────────────────────────────────

export default function FinanceSettings() {
  const [active, setActive] = useState("general");
  const [saved, setSaved]   = useState(false);

  const ActiveSection = SECTION_MAP[active];

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="fs-root">
      {/* Left Nav */}
      <aside className="fs-sidebar">
        <p className="fs-sidebar__label">Finance Settings</p>
        <nav className="fs-sidebar__nav">
          {NAV_ITEMS.map(n => (
            <button
              key={n.id}
              className={`fs-nav-item ${active === n.id ? "fs-nav-item--active" : ""}`}
              onClick={() => setActive(n.id)}
            >
              <span className="fs-nav-icon">{n.icon}</span>
              <span className="fs-nav-label">{n.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <main className="fs-main">
        <div className="fs-main__header">
          <div>
            <h2 className="fs-main__title">{SECTION_TITLES[active]}</h2>
            <p className="fs-main__sub">Manage your {SECTION_TITLES[active].toLowerCase()} preferences</p>
          </div>
          <div className="fs-header-actions">
            {saved && <span className="fs-save-toast">✔ Saved successfully</span>}
            <button className="fs-btn-primary" onClick={handleSave}>Save Changes</button>
          </div>
        </div>

        <div className="fs-main__content">
          <ActiveSection />
        </div>
      </main>
    </div>
  );
}