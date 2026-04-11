import { useEffect, useState } from 'react'
import api from '../api/client'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { Download, TrendingUp } from 'lucide-react'

const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#84cc16','#ec4899','#6366f1']

function fmtDate(ts) {
  try { return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) } catch { return '—' }
}

export default function SpendingPage() {
  const [txns, setTxns] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/transactions?limit=200').then(r => setTxns(r.data)).finally(() => setLoading(false))
  }, [])

  // Category breakdown
  const byCategory = {}
  txns.forEach(t => {
    const cat = t.merchant_category || 'Other'
    byCategory[cat] = (byCategory[cat] || 0) + t.amount
  })
  const categoryData = Object.entries(byCategory)
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value)

  // Daily spend
  const byDay = {}
  txns.forEach(t => {
    const d = fmtDate(t.timestamp)
    byDay[d] = (byDay[d] || 0) + t.amount
  })
  const dailyData = Object.entries(byDay)
    .map(([date, amount]) => ({ date, amount: Math.round(amount * 100) / 100 }))
    .slice(-14)

  // Top merchants
  const byMerchant = {}
  txns.forEach(t => {
    const m = t.merchant_name || 'Unknown'
    byMerchant[m] = (byMerchant[m] || 0) + t.amount
  })
  const topMerchants = Object.entries(byMerchant)
    .map(([name, amount]) => ({ name, amount: Math.round(amount * 100) / 100 }))
    .sort((a, b) => b.amount - a.amount).slice(0, 8)

  const totalSpend = txns.reduce((s, t) => s + t.amount, 0)
  const avgTxn = txns.length ? totalSpend / txns.length : 0
  const maxTxn = txns.length ? Math.max(...txns.map(t => t.amount)) : 0

  const downloadCSV = () => {
    const rows = [['Date','Merchant','Category','Amount','Risk','Score'],
      ...txns.map(t => [fmtDate(t.timestamp), t.merchant_name||'', t.merchant_category||'',
                        t.amount, t.risk_level||'', t.fraud_score||''])]
    const csv = rows.map(r => r.join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = 'spending_report.csv'
    a.click()
  }

  if (loading) return (
    <div className="space-y-4">
      {[1,2,3].map(i => <div key={i} className="h-48 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold dark:text-white flex items-center gap-2">
            <TrendingUp size={22} className="text-green-500" /> Spending Analytics
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Your personal spending breakdown and trends</p>
        </div>
        <button onClick={downloadCSV}
          className="flex items-center gap-2 bg-white dark:bg-gray-800 border dark:border-gray-700 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-lg text-sm hover:bg-gray-50">
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Spend', val: `$${totalSpend.toFixed(2)}`, color: 'text-blue-600' },
          { label: 'Transactions', val: txns.length, color: 'text-purple-600' },
          { label: 'Avg Transaction', val: `$${avgTxn.toFixed(2)}`, color: 'text-green-600' },
          { label: 'Largest Transaction', val: `$${maxTxn.toFixed(2)}`, color: 'text-amber-600' },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
            <p className={`text-xl font-bold font-mono mt-1 ${s.color}`}>{s.val}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category donut */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
          <h2 className="font-semibold dark:text-white mb-4">Spend by Category</h2>
          <div className="flex gap-4 items-center">
            <ResponsiveContainer width={180} height={180}>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                  dataKey="value" paddingAngle={2}>
                  {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={v => `$${v.toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-1.5 max-h-44 overflow-y-auto">
              {categoryData.map((d, i) => (
                <div key={d.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="dark:text-gray-300 truncate max-w-24">{d.name}</span>
                  </div>
                  <span className="font-mono font-medium dark:text-white">${d.value.toFixed(0)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Daily spend bar */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
          <h2 className="font-semibold dark:text-white mb-4">Daily Spend (last 14 days)</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 9 }} />
              <Tooltip formatter={v => `$${v.toFixed(2)}`} />
              <Bar dataKey="amount" fill="#3b82f6" radius={[4,4,0,0]} name="Spend" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top merchants */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 lg:col-span-2">
          <h2 className="font-semibold dark:text-white mb-4">Top Merchants by Spend</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={topMerchants} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
              <Tooltip formatter={v => `$${v.toFixed(2)}`} />
              <Bar dataKey="amount" fill="#8b5cf6" radius={4} name="Total Spend" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
