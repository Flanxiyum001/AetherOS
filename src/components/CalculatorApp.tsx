import {useEffect, useState} from 'react'

type Op = '+' | '−' | '×' | '÷' | null

export default function CalculatorApp() {
  const [display, setDisplay] = useState('0')
  const [acc, setAcc] = useState<number | null>(null)
  const [op, setOp] = useState<Op>(null)
  const [fresh, setFresh] = useState(true)

  const inputDigit = (d: string) => {
    setDisplay(cur => {
      if (fresh) {
        setFresh(false)
        return d === '.' ? '0.' : d
      }
      if (d === '.' && cur.includes('.')) return cur
      if (cur === '0' && d !== '.') return d
      return cur.length < 12 ? cur + d : cur
    })
  }

  const compute = (a: number, b: number, o: Op): number => {
    switch (o) {
      case '+': return a + b
      case '−': return a - b
      case '×': return a * b
      case '÷': return b === 0 ? NaN : a / b
      default: return b
    }
  }

  const fmt = (n: number) => {
    if (!isFinite(n)) return 'Error'
    const s = String(Math.round(n * 1e10) / 1e10)
    return s.length > 12 ? n.toExponential(6) : s
  }

  const setOperator = (o: Op) => {
    const cur = parseFloat(display)
    if (acc !== null && op && !fresh) {
      const r = compute(acc, cur, op)
      setAcc(r)
      setDisplay(fmt(r))
    } else {
      setAcc(cur)
    }
    setOp(o)
    setFresh(true)
  }

  const equals = () => {
    if (acc === null || !op) return
    const r = compute(acc, parseFloat(display), op)
    setDisplay(fmt(r))
    setAcc(null)
    setOp(null)
    setFresh(true)
  }

  const clearAll = () => {
    setDisplay('0')
    setAcc(null)
    setOp(null)
    setFresh(true)
  }

  // keyboard support
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) inputDigit(e.key)
      else if (e.key === '.') inputDigit('.')
      else if (e.key === '+') setOperator('+')
      else if (e.key === '-') setOperator('−')
      else if (e.key === '*') setOperator('×')
      else if (e.key === '/') { e.preventDefault(); setOperator('÷') }
      else if (e.key === 'Enter' || e.key === '=') equals()
      else if (e.key === 'Escape') clearAll()
      else if (e.key === 'Backspace')
        setDisplay(c => (c.length > 1 ? c.slice(0, -1) : '0'))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [display, acc, op, fresh])

  const Btn = ({
    label,
    onClick,
    variant = 'num',
    wide,
  }: {
    label: string
    onClick: () => void
    variant?: 'num' | 'fn' | 'op'
    wide?: boolean
  }) => (
    <button
      onClick={onClick}
      className={`mac-press flex h-[42px] items-center justify-center rounded-[9px] text-[16px] font-medium transition ${
        wide ? 'col-span-2' : ''
      } ${
        variant === 'op'
          ? 'bg-[#ff9f0a] text-white hover:brightness-105'
          : variant === 'fn'
          ? 'bg-black/[0.07] text-black/75 hover:bg-black/[0.12] dark:bg-white/[0.14] dark:text-white/85'
          : 'bg-black/[0.035] text-black/85 hover:bg-black/[0.08] dark:bg-white/[0.08] dark:text-white/90'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className="flex h-full flex-col bg-[#f2f2f4] p-2.5 dark:bg-[#1c1c1e]">
      <div className="mb-2 flex h-[64px] items-end justify-end rounded-[10px] bg-[#1c1c1e] px-3 pb-1.5 dark:bg-black">
        <span className="truncate text-right text-[34px] font-light text-white tabular-nums">
          {display}
        </span>
      </div>
      <div className="grid flex-1 grid-cols-4 gap-1.5">
        <Btn label="AC" variant="fn" onClick={clearAll} />
        <Btn label="+/−" variant="fn" onClick={() => setDisplay(d => (d.startsWith('-') ? d.slice(1) : '-' + d))} />
        <Btn label="%" variant="fn" onClick={() => setDisplay(d => fmt(parseFloat(d) / 100))} />
        <Btn label="÷" variant="op" onClick={() => setOperator('÷')} />
        {['7', '8', '9'].map(d => <Btn key={d} label={d} onClick={() => inputDigit(d)} />)}
        <Btn label="×" variant="op" onClick={() => setOperator('×')} />
        {['4', '5', '6'].map(d => <Btn key={d} label={d} onClick={() => inputDigit(d)} />)}
        <Btn label="−" variant="op" onClick={() => setOperator('−')} />
        {['1', '2', '3'].map(d => <Btn key={d} label={d} onClick={() => inputDigit(d)} />)}
        <Btn label="+" variant="op" onClick={() => setOperator('+')} />
        <Btn label="0" wide onClick={() => inputDigit('0')} />
        <Btn label="." onClick={() => inputDigit('.')} />
        <Btn label="=" variant="op" onClick={equals} />
      </div>
    </div>
  )
}
