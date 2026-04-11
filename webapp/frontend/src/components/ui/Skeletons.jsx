export function SkeletonCard() {
  return (
    <div className="card p-5 space-y-3">
      <div className="flex items-start justify-between">
        <div className="skeleton w-9 h-9 rounded-lg" />
        <div className="skeleton w-12 h-5 rounded" />
      </div>
      <div className="skeleton w-24 h-7 rounded" />
      <div className="skeleton w-32 h-4 rounded" />
    </div>
  )
}

export function SkeletonTable({ rows = 8, cols = 5 }) {
  return (
    <div className="section-card">
      {/* Toolbar skeleton */}
      <div className="section-card-header">
        <div className="skeleton w-48 h-8 rounded-md" />
        <div className="flex gap-2">
          <div className="skeleton w-20 h-8 rounded-md" />
          <div className="skeleton w-20 h-8 rounded-md" />
        </div>
      </div>
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              {Array.from({ length: cols }).map((_, i) => (
                <th key={i}><div className="skeleton w-20 h-3 rounded" /></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, r) => (
              <tr key={r}>
                {Array.from({ length: cols }).map((_, c) => (
                  <td key={c}><div className={`skeleton h-4 rounded ${c === 0 ? 'w-32' : c === cols - 1 ? 'w-16' : 'w-24'}`} /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function SkeletonText({ lines = 3 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`skeleton h-4 rounded ${i === lines - 1 ? 'w-3/4' : 'w-full'}`} />
      ))}
    </div>
  )
}
