import * as React from "react"

function getStrictContext<T>(
  name?: string
): readonly [
  ({
    value,
    children,
  }: {
    value: T
    children?: React.ReactNode
  }) => React.JSX.Element,
  () => T,
] {
  const Context = React.createContext<T | undefined>(undefined)

  // biome-ignore lint/correctness/noComponentHookFactories: factory runs once at module scope per context, so Provider identity is stable
  const Provider = ({
    value,
    children,
  }: {
    value: T
    children?: React.ReactNode
  }) => <Context value={value}>{children}</Context>

  // biome-ignore lint/correctness/noComponentHookFactories: factory runs once at module scope per context, so hook identity is stable
  const useSafeContext = () => {
    const ctx = React.use(Context)
    if (ctx === undefined) {
      throw new Error(`useContext must be used within ${name ?? "a Provider"}`)
    }
    return ctx
  }

  return [Provider, useSafeContext] as const
}

export { getStrictContext }
