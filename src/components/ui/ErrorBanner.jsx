export default function ErrorBanner({ title = 'A apărut o eroare', message, onRetry }) {
  return (
    <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
      <p className="font-semibold">{title}</p>
      {message && <p className="mt-1 text-red-200/80">{message}</p>}
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 rounded bg-red-500/20 px-3 py-1 text-red-100 hover:bg-red-500/30"
        >
          Reîncearcă
        </button>
      )}
    </div>
  )
}
