import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    // Initial sync deferred to a microtask so no setState is called
    // synchronously inside the effect body (react-hooks/set-state-in-effect).
    queueMicrotask(onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}
