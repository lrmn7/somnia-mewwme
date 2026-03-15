import { AnchorHTMLAttributes, ReactNode } from "react"
import { Link } from "react-router-dom"

interface LinkWrapperProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  href: string
  children: ReactNode
  external?: boolean
}

export function LinkWrapper({
  href,
  children,
  external = false,
  ...props
}: LinkWrapperProps) {
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="link"
        {...props}
      >
        {children}
      </a>
    )
  }

  return (
    <Link to={href} className="link" {...props}>
      {children}
    </Link>
  )
}