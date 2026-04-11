export default function SectionCard({ title, subtitle, actions, children, className = '', noPadding = false }) {
  return (
    <div className={`section-card ${className}`}>
      {(title || actions) && (
        <div className="section-card-header">
          <div>
            {title && <h2 className="text-base font-medium text-slate-900 dark:text-slate-100">{title}</h2>}
            {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'section-card-body'}>
        {children}
      </div>
    </div>
  )
}
