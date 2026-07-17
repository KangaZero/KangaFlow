// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"

export default function Page() {
  return (
    <div className="flex min-h-svh p-6">
      <div className="flex min-w-0 max-w-md flex-col gap-4 text-sm leading-loose">
        <div className="flex items-center justify-between gap-4">
          <h1 className="font-medium">Project ready!</h1>
          <ThemeToggle />
        </div>
        <div>
          <p>You may now add components and start building.</p>
          <p>We&apos;ve already added the button component for you.</p>
          <Button className="mt-2">Button</Button>
        </div>
        <div className="font-mono text-muted-foreground text-xs">
          (Press <kbd>d</kbd> to cycle theme: light → dark → terminal)
        </div>
      </div>
    </div>
  )
}
