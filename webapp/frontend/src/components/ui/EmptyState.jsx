export default function EmptyState({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      {Icon && (
        <div className="w-12 h-12 rounded-xl bg-surface-tertiary dark:bg-slate-800 flex items-center justify-center mb-4">
          <Icon size={22} className="text-slate-400" />
        </div>
      )}
      <h3 className="text-base font-medium text-slate-900 dark:text-slate-100 mb-1">{title}</h3>
      {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">{subtitle}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
