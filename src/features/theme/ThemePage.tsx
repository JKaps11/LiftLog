import { PageHeading } from '@/components/ui/page-heading'
import { cn } from '@/lib/utils'
import type { Theme } from '@/theme/types'

interface ThemePageProps {
  themes: Theme[]
  themeId: string
  onSelect: (id: string) => void
}

export function ThemePage({ themes, themeId, onSelect }: ThemePageProps) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 p-4">
      <PageHeading>Theme</PageHeading>
      <p className="text-sm text-muted-foreground">Pick a color theme for the app.</p>

      <ul className="flex flex-col gap-2">
        {themes.map((theme) => {
          const isActive = theme.id === themeId
          return (
            <li key={theme.id}>
              <button
                type="button"
                onClick={() => onSelect(theme.id)}
                aria-pressed={isActive}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg border bg-card p-3 text-left transition-colors',
                  isActive ? 'border-primary' : 'border-border hover:border-primary/40'
                )}
              >
                <span className="flex shrink-0 gap-1">
                  <span
                    className="size-6 rounded-full border border-white/10"
                    style={{ background: theme.colors.background }}
                  />
                  <span
                    className="size-6 rounded-full border border-white/10"
                    style={{ background: theme.colors.primary }}
                  />
                  <span
                    className="size-6 rounded-full border border-white/10"
                    style={{ background: theme.colors.card }}
                  />
                </span>
                <span className="flex-1 font-medium">{theme.name}</span>
                {isActive && (
                  <span className="text-xs font-semibold tracking-widest text-primary uppercase">
                    Active
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </main>
  )
}
