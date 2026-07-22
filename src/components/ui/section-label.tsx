import * as React from "react"

import { cn } from "@/lib/utils"

/** The small, muted, tracked-out label used above a group of fields or a sub-section within a screen. */
function SectionLabel({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <h2
      className={cn(
        "mb-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase",
        className
      )}
      {...props}
    />
  )
}

export { SectionLabel }
