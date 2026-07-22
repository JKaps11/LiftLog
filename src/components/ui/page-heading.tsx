import * as React from "react"

import { cn } from "@/lib/utils"

/** The condensed, all-caps display treatment used for every screen's top-level heading. */
function PageHeading({ className, ...props }: React.ComponentProps<"h1">) {
  return (
    <h1
      className={cn(
        "font-heading text-4xl leading-none tracking-wide text-foreground uppercase",
        className
      )}
      {...props}
    />
  )
}

export { PageHeading }
