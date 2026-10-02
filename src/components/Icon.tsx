interface IconProps {
  name: string
  filled?: boolean
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeMap = {
  sm: '1rem',
  md: '1.25rem',
  lg: '1.5rem',
}

export function Icon({ name, filled, className, size = 'md' }: IconProps) {
  return (
    <span
      className={`material-symbols-outlined${filled ? ' filled' : ''}${className ? ` ${className}` : ''}`}
      style={{ fontSize: sizeMap[size] }}
      aria-hidden
    >
      {name}
    </span>
  )
}
