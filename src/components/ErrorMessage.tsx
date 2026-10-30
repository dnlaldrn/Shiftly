import { CircleAlert } from 'lucide-react'
import type { ReactNode } from 'react'

export default function ErrorMessage({ children }: { children: ReactNode }) {
  return (
    <p className="error" role="alert">
      <CircleAlert size={16} aria-hidden="true" />
      {children}
    </p>
  )
}
