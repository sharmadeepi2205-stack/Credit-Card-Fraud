/**
 * Fraud Network Graph — shows links between accounts, devices, merchants, and countries.
 * Pure SVG/React implementation — no D3 dependency needed.
 */
import { useEffect, useState, useRef } from 'react'
import api from '../api/client'
import { Network, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react'

const NODE_COLORS = {
  user:     '#3b82f6',
  merchant: '#8b5cf6',
  country:  '#10b981',
  device:   '#f59e0b',
  fraud:    '#ef4444',
}

const NODE_RADIUS = { user: 22, merchant: 16, country: 14, device: 12, fraud: 18 }

function buildGraph(txns) {
  const nodes = new Map()
  const edges = []

  const addNode = (id, type, label, risk = null) => {
    if (!nodes.has(id)) nodes.set(id, { id, type, label, risk, x: 0, y: 0, vx: 0, vy: 0 })
  }

  txns.forEach(t => {
    const uid = 'user_me'
    addNode(uid, 'user', 'You')

    if (t.merchant_name) {
      const mid = `m_${t.merchant_name}`
      addNode(mid, t.risk_level === 'HIGH' ? 'fraud' : 'merchant', t.merchant_name, t.risk_level)
      edges.push({ source: uid, target: mid, risk: t.risk_level, amount: t.amount })
    }
    if (t.country) {
      const cid = `c_${t.country}`
      addNode(cid, 'country', t.country)
      if (t.merchant_name) edges.push({ source: `m_${t.merchant_name}`, target: cid, risk: t.risk_level })
    }
    if (t.device_id) {
      const did = `d_${t.device_id.slice(0, 8)}`
      addNode(did, 'device', t.device_id.slice(0, 8))
      edges.push({ source: uid, target: did, risk: t.risk_level })
    }
  })

  return { nodes: Array.from(nodes.values()), edges }
}

function forceLayout(nodes, edges, width, height, iterations = 80) {
  // Initialize positions in a circle
  nodes.forEach((n, i) => {
    const angle = (i / nodes.length) * 2 * Math.PI
    n.x = width / 2 + Math.cos(angle) * 180
    n.y = height / 2 + Math.sin(angle) * 180
  })

  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]))

  for (let iter = 0; iter < iterations; iter++) {
    // Repulsion
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j]
        const dx = b.x - a.x, dy = b.y - a.y
        const dist = Math.sqrt(dx*dx + dy*dy) || 1
        const force = 3000 / (dist * dist)
        const fx = (dx / dist) * force, fy = (dy / dist) * force
        a.vx -= fx; a.vy -= fy
        b.vx += fx; b.vy += fy
      }
    }
    // Attraction along edges
    edges.forEach(e => {
      const a = nodeMap[e.source], b = nodeMap[e.target]
      if (!a || !b) return
      const dx = b.x - a.x, dy = b.y - a.y
      const dist = Math.sqrt(dx*dx + dy*dy) || 1
      const force = (dist - 120) * 0.05
      const fx = (dx / dist) * force, fy = (dy / dist) * force
      a.vx += fx; a.vy += fy
      b.vx -= fx; b.vy -= fy
    })
    // Center gravity
    nodes.forEach(n => {
      n.vx += (width/2 - n.x) * 0.01
      n.vy += (height/2 - n.y) * 0.01
    })
    // Apply velocity with damping
    nodes.forEach(n => {
      n.x += n.vx * 0.5; n.y += n.vy * 0.5
      n.vx *= 0.8; n.vy *= 0.8
      n.x = Math.max(30, Math.min(width - 30, n.x))
      n.y = Math.max(30, Math.min(height - 30, n.y))
    })
  }
  return nodes
}

export default function NetworkGraphPage() {
  const [txns, setTxns] = useState([])
  const [graph, setGraph] = useState({ nodes: [], edges: [] })
  const [selected, setSelected] = useState(null)
  const [zoom, setZoom] = useState(1)
  const [loading, setLoading] = useState(true)
  const svgRef = useRef()
  const W = 800, H = 500

  const rebuild = (data) => {
    const g = buildGraph(data)
    g.nodes = forceLayout(g.nodes, g.edges, W, H)
    setGraph(g)
  }

  useEffect(() => {
    api.get('/transactions?limit=50')
      .then(r => { setTxns(r.data); rebuild(r.data) })
      .finally(() => setLoading(false))
  }, [])

  const nodeMap = Object.fromEntries(graph.nodes.map(n => [n.id, n]))

  const LEGEND = Object.entries(NODE_COLORS).map(([type, color]) => ({ type, color }))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold dark:text-white flex items-center gap-2">
            <Network size={22} className="text-purple-500" /> Fraud Network Graph
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Visual map of connections between you, merchants, devices, and countries
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setZoom(z => Math.min(z + 0.2, 2))}
            className="p-2 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:text-white">
            <ZoomIn size={16} />
          </button>
          <button onClick={() => setZoom(z => Math.max(z - 0.2, 0.4))}
            className="p-2 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:text-white">
            <ZoomOut size={16} />
          </button>
          <button onClick={() => rebuild(txns)}
            className="p-2 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:text-white">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Legend */}
        <div className="flex gap-4 px-4 py-3 border-b dark:border-gray-700 flex-wrap">
          {LEGEND.map(l => (
            <div key={l.type} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
              <span className="w-3 h-3 rounded-full" style={{ background: l.color }} />
              {l.type.charAt(0).toUpperCase() + l.type.slice(1)}
            </div>
          ))}
          <span className="text-xs text-gray-400 ml-auto">{graph.nodes.length} nodes · {graph.edges.length} edges</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-auto">
            <svg ref={svgRef} width={W} height={H}
              style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', display: 'block' }}>
              <defs>
                <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L6,3 z" fill="#94a3b8" />
                </marker>
              </defs>

              {/* Edges */}
              {graph.edges.map((e, i) => {
                const a = nodeMap[e.source], b = nodeMap[e.target]
                if (!a || !b) return null
                const color = e.risk === 'HIGH' ? '#ef4444' : e.risk === 'MEDIUM' ? '#f59e0b' : '#94a3b8'
                return (
                  <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                    stroke={color} strokeWidth={e.risk === 'HIGH' ? 2 : 1}
                    strokeOpacity={0.6} strokeDasharray={e.risk === 'HIGH' ? '4 2' : 'none'}
                    markerEnd="url(#arrow)" />
                )
              })}

              {/* Nodes */}
              {graph.nodes.map(n => {
                const r = NODE_RADIUS[n.type] || 14
                const color = NODE_COLORS[n.type] || '#64748b'
                const isSelected = selected?.id === n.id
                return (
                  <g key={n.id} onClick={() => setSelected(isSelected ? null : n)}
                    style={{ cursor: 'pointer' }}>
                    <circle cx={n.x} cy={n.y} r={r + (isSelected ? 4 : 0)}
                      fill={color} fillOpacity={0.15}
                      stroke={color} strokeWidth={isSelected ? 3 : 1.5} />
                    <circle cx={n.x} cy={n.y} r={r - 4} fill={color} fillOpacity={0.9} />
                    <text x={n.x} y={n.y + r + 12} textAnchor="middle"
                      fontSize="9" fill="#64748b" fontFamily="monospace">
                      {n.label.length > 12 ? n.label.slice(0, 12) + '…' : n.label}
                    </text>
                    {n.risk === 'HIGH' && (
                      <circle cx={n.x + r - 4} cy={n.y - r + 4} r={5}
                        fill="#ef4444" stroke="white" strokeWidth={1.5} />
                    )}
                  </g>
                )
              })}
            </svg>
          </div>
        )}
      </div>

      {/* Selected node detail */}
      {selected && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <span className="w-4 h-4 rounded-full" style={{ background: NODE_COLORS[selected.type] }} />
            <div>
              <p className="font-semibold dark:text-white">{selected.label}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                {selected.type} node
                {selected.risk && ` · ${selected.risk} risk`}
              </p>
            </div>
            <button onClick={() => setSelected(null)} className="ml-auto text-gray-400 hover:text-gray-600 text-lg">×</button>
          </div>
        </div>
      )}
    </div>
  )
}
