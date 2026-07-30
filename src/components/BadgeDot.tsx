export function BadgeDot({ className = "" }: { className?: string }) {
  return <span className={`inline-block w-2 h-2 rounded-full bg-red-500 ${className}`} />
}