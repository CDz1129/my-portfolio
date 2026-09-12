export function AccountBadge({
  name,
  color,
  size = 28,
}: {
  name: string
  color?: string
  size?: number
}) {
  const initial = Array.from(name.trim())[0]?.toUpperCase() ?? '?'
  const tint = color ?? '#6366f1'

  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-lg font-semibold"
      style={{
        width: size,
        height: size,
        background: `${tint}22`,
        border: `1px solid ${tint}55`,
        color: tint,
        fontSize: Math.round(size * 0.42),
      }}
    >
      {initial}
    </span>
  )
}
