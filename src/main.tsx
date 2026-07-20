import React, { useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

type DebtType = 'credit' | 'card' | 'education' | 'installment' | 'other'

type Debt = {
  id: string
  name: string
  type: DebtType
  balance: number
  annualRate: number
  minimumPayment: number
  paymentDay: number
  startPrincipalDate?: string
  installmentPaymentsLeft?: number
}

type Tab = 'home' | 'debts' | 'plan' | 'payments'

const STORAGE_KEY = 'debt-planner-v1'

const seedDebts: Debt[] = [
  {
    id: crypto.randomUUID(),
    name: 'Кредитная карта',
    type: 'card',
    balance: 215000,
    annualRate: 39,
    minimumPayment: 12000,
    paymentDay: 8
  },
  {
    id: crypto.randomUUID(),
    name: 'Образовательный кредит',
    type: 'education',
    balance: 790000,
    annualRate: 3,
    minimumPayment: 2000,
    paymentDay: 18,
    startPrincipalDate: '2027-09-01'
  },
  {
    id: crypto.randomUUID(),
    name: 'Яндекс Сплит',
    type: 'installment',
    balance: 48000,
    annualRate: 0,
    minimumPayment: 8000,
    paymentDay: 2,
    installmentPaymentsLeft: 6
  }
]

function loadDebts(): Debt[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : seedDebts
  } catch {
    return seedDebts
  }
}

function money(value: number) {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(Math.max(0, Math.round(value))) + ' ₽'
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(date)
}

function typeLabel(type: DebtType) {
  return {
    credit: 'Кредит',
    card: 'Кредитная карта',
    education: 'Образовательный кредит',
    installment: 'Рассрочка',
    other: 'Другое'
  }[type]
}

function simulate(originalDebts: Debt[], monthlyBudget: number) {
  const debts = originalDebts.map((debt) => ({ ...debt }))
  const history: { month: Date; total: number }[] = []
  const today = new Date()
  let totalInterest = 0
  let month = 0

  while (debts.some((d) => d.balance > 0.01) && month < 600) {
    const date = new Date(today.getFullYear(), today.getMonth() + month, 1)

    for (const debt of debts) {
      if (debt.balance <= 0) continue
      const interest = debt.balance * (debt.annualRate / 100) / 12
      debt.balance += interest
      totalInterest += interest
    }

    let remainingBudget = monthlyBudget

    for (const debt of debts) {
      if (debt.balance <= 0 || remainingBudget <= 0) continue
      let mandatory = debt.minimumPayment

      if (debt.type === 'education' && debt.startPrincipalDate) {
        const principalStart = new Date(debt.startPrincipalDate)
        if (date < principalStart) {
          mandatory = Math.min(debt.minimumPayment, debt.balance * (debt.annualRate / 100) / 12)
        }
      }

      mandatory = Math.min(mandatory, debt.balance, remainingBudget)
      debt.balance -= mandatory
      remainingBudget -= mandatory
    }

    const avalanche = debts
      .filter((d) => d.balance > 0)
      .sort((a, b) => b.annualRate - a.annualRate || a.balance - b.balance)

    for (const debt of avalanche) {
      if (remainingBudget <= 0) break
      const extra = Math.min(remainingBudget, debt.balance)
      debt.balance -= extra
      remainingBudget -= extra
    }

    history.push({ month: date, total: debts.reduce((sum, debt) => sum + Math.max(0, debt.balance), 0) })
    month += 1
  }

  const finishDate = history.length
    ? new Date(today.getFullYear(), today.getMonth() + history.length - 1, 1)
    : today

  return { months: history.length, finishDate, totalInterest, history }
}

function App() {
  const [debts, setDebts] = useState<Debt[]>(loadDebts)
  const [tab, setTab] = useState<Tab>('home')
  const [showForm, setShowForm] = useState(false)
  const required = debts.reduce((sum, debt) => sum + debt.minimumPayment, 0)
  const [budget, setBudget] = useState(Math.max(required + 15000, 85000))

  const totalDebt = debts.reduce((sum, debt) => sum + debt.balance, 0)
  const result = useMemo(() => simulate(debts, budget), [debts, budget])
  const baseline = useMemo(() => simulate(debts, Math.max(required, 1)), [debts, required])
  const savings = Math.max(0, baseline.totalInterest - result.totalInterest)

  const save = (next: Debt[]) => {
    setDebts(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  const nextPayment = [...debts]
    .filter((d) => d.balance > 0)
    .sort((a, b) => a.paymentDay - b.paymentDay)[0]

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <div className="eyebrow">Личный долговой план</div>
          <h1>Пупупу</h1>
        </div>
        <button className="icon-button" onClick={() => setShowForm(true)} aria-label="Добавить долг">+</button>
      </header>

      <main>
        {tab === 'home' && (
          <section className="stack">
            <article className="hero-card dark">
              <span>Общий долг</span>
              <strong>{money(totalDebt)}</strong>
              <small>{debts.filter((d) => d.balance > 0).length} активных обязательства</small>
            </article>

            <div className="grid two">
              <article className="metric-card">
                <span>Обязательные платежи</span>
                <strong>{money(required)}</strong>
                <small>в месяц</small>
              </article>
              <article className="metric-card">
                <span>До полной свободы</span>
                <strong>{result.months} мес.</strong>
                <small>{monthLabel(result.finishDate)}</small>
              </article>
            </div>

            {nextPayment && (
              <article className="wide-card">
                <div>
                  <span>Следующий платёж</span>
                  <strong>{nextPayment.name}</strong>
                </div>
                <div className="right">
                  <strong>{money(nextPayment.minimumPayment)}</strong>
                  <small>{nextPayment.paymentDay} числа</small>
                </div>
              </article>
            )}

            <article className="progress-card">
              <div className="section-head">
                <div>
                  <span>Прогноз</span>
                  <strong>{monthLabel(result.finishDate)}</strong>
                </div>
                <div className="right">
                  <small>Экономия процентов</small>
                  <strong>{money(savings)}</strong>
                </div>
              </div>
              <div className="mini-chart">
                {result.history.slice(0, 24).map((point, index) => (
                  <div
                    key={index}
                    className="bar"
                    title={`${monthLabel(point.month)}: ${money(point.total)}`}
                    style={{ height: `${Math.max(5, (point.total / Math.max(totalDebt, 1)) * 100)}%` }}
                  />
                ))}
              </div>
            </article>
          </section>
        )}

        {tab === 'debts' && (
          <section className="stack">
            <div className="section-title-row">
              <div>
                <div className="eyebrow">Все обязательства</div>
                <h2>Долги</h2>
              </div>
              <button className="secondary-button" onClick={() => setShowForm(true)}>Добавить</button>
            </div>
            {debts.map((debt) => (
              <article className="debt-card" key={debt.id}>
                <div>
                  <small>{typeLabel(debt.type)}</small>
                  <strong>{debt.name}</strong>
                  <span>{money(debt.minimumPayment)} / месяц</span>
                </div>
                <div className="right">
                  <strong>{money(debt.balance)}</strong>
                  <button className="text-button" onClick={() => save(debts.filter((d) => d.id !== debt.id))}>Удалить</button>
                </div>
              </article>
            ))}
          </section>
        )}

        {tab === 'plan' && (
          <section className="stack">
            <div className="eyebrow">Сценарий</div>
            <h2>Сколько готов платить</h2>
            <article className="hero-card">
              <strong>{money(budget)}</strong>
              <input
                type="range"
                min={Math.max(1000, required)}
                max={Math.max(required + 200000, 250000)}
                step="1000"
                value={budget}
                onChange={(event) => setBudget(Number(event.target.value))}
              />
              <div className="range-labels"><span>{money(required)}</span><span>{money(Math.max(required + 200000, 250000))}</span></div>
            </article>

            <div className="grid two">
              <article className="metric-card">
                <span>Закрытие</span>
                <strong>{monthLabel(result.finishDate)}</strong>
                <small>{result.months} месяцев</small>
              </article>
              <article className="metric-card">
                <span>Проценты</span>
                <strong>{money(result.totalInterest)}</strong>
                <small>за весь период</small>
              </article>
            </div>

            <article className="wide-card">
              <div>
                <span>Дополнительно к минимуму</span>
                <strong>{money(Math.max(0, budget - required))}</strong>
              </div>
              <div className="right">
                <small>Стратегия</small>
                <strong>Лавина</strong>
              </div>
            </article>
          </section>
        )}

        {tab === 'payments' && (
          <section className="stack">
            <div className="eyebrow">Ближайший месяц</div>
            <h2>Платежи</h2>
            {[...debts].sort((a,b) => a.paymentDay - b.paymentDay).map((debt) => (
              <article className="payment-row" key={debt.id}>
                <div className="day">{debt.paymentDay}</div>
                <div className="grow">
                  <strong>{debt.name}</strong>
                  <span>{typeLabel(debt.type)}</span>
                </div>
                <strong>{money(debt.minimumPayment)}</strong>
              </article>
            ))}
          </section>
        )}
      </main>

      <nav className="bottom-nav">
        {([
          ['home', 'Главная'],
          ['debts', 'Долги'],
          ['plan', 'Сценарии'],
          ['payments', 'Платежи']
        ] as [Tab, string][]).map(([value, label]) => (
          <button key={value} className={tab === value ? 'active' : ''} onClick={() => setTab(value)}>{label}</button>
        ))}
      </nav>

      {showForm && <DebtForm onClose={() => setShowForm(false)} onSubmit={(debt) => { save([...debts, debt]); setShowForm(false) }} />}
    </div>
  )
}

function DebtForm({ onClose, onSubmit }: { onClose: () => void; onSubmit: (debt: Debt) => void }) {
  const [type, setType] = useState<DebtType>('credit')
  const [name, setName] = useState('')
  const [balance, setBalance] = useState('')
  const [rate, setRate] = useState('0')
  const [payment, setPayment] = useState('')
  const [day, setDay] = useState('10')
  const [startPrincipalDate, setStartPrincipalDate] = useState('')

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const parsedBalance = Number(balance)
    const parsedPayment = Number(payment)
    if (!name.trim() || parsedBalance <= 0 || parsedPayment <= 0) return
    onSubmit({
      id: crypto.randomUUID(),
      type,
      name: name.trim(),
      balance: parsedBalance,
      annualRate: Number(rate) || 0,
      minimumPayment: parsedPayment,
      paymentDay: Math.min(31, Math.max(1, Number(day) || 1)),
      startPrincipalDate: type === 'education' && startPrincipalDate ? startPrincipalDate : undefined
    })
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form className="modal" onSubmit={submit} onMouseDown={(e) => e.stopPropagation()}>
        <div className="section-title-row">
          <div><div className="eyebrow">Новое обязательство</div><h2>Добавить долг</h2></div>
          <button type="button" className="icon-button light" onClick={onClose}>×</button>
        </div>

        <label>Тип<select value={type} onChange={(e) => setType(e.target.value as DebtType)}>
          <option value="credit">Кредит</option>
          <option value="card">Кредитная карта</option>
          <option value="education">Образовательный кредит</option>
          <option value="installment">Рассрочка</option>
          <option value="other">Другое</option>
        </select></label>
        <label>Название<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Например, Яндекс Сплит" /></label>
        <div className="grid two form-grid">
          <label>Остаток<input inputMode="numeric" value={balance} onChange={(e) => setBalance(e.target.value)} placeholder="48000" /></label>
          <label>Ставка, %<input inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} /></label>
        </div>
        <div className="grid two form-grid">
          <label>Платёж в месяц<input inputMode="numeric" value={payment} onChange={(e) => setPayment(e.target.value)} placeholder="8000" /></label>
          <label>День платежа<input inputMode="numeric" value={day} onChange={(e) => setDay(e.target.value)} /></label>
        </div>
        {type === 'education' && <label>Дата начала выплаты тела<input type="date" value={startPrincipalDate} onChange={(e) => setStartPrincipalDate(e.target.value)} /></label>}
        <button className="primary-button" type="submit">Сохранить</button>
      </form>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>)
