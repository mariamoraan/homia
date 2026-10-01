import type { LucideProps } from 'lucide-react'
import { REACTION_ICONS } from './reactionIcons'

type ReactionIconProps = LucideProps & {
  id: string
}

export function ReactionIcon({
  id,
  size = 16,
  strokeWidth = 2,
  ...props
}: ReactionIconProps) {
  const Icon = REACTION_ICONS[id]
  if (!Icon) return null
  return <Icon size={size} strokeWidth={strokeWidth} aria-hidden {...props} />
}
