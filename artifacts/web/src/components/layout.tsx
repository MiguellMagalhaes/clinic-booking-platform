import { useTranslation } from "@/hooks/use-translation";
import { Language } from "@/lib/i18n";
import { Globe, Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils";

export function Layout({ children }: { children: React.ReactNode }) {
  const { t, language, setLanguage } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="container max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-md shadow-primary/20">
              <Stethoscope className="w-5 h-5" />
            </div>
            <span className="font-semibold text-base text-foreground tracking-tight">
              {t('app_name')}
            </span>
          </div>

          <div className="relative group">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-secondary transition-colors text-sm font-medium text-muted-foreground">
              <Globe className="w-4 h-4" />
              <span className="uppercase">{language}</span>
            </button>
            <div className="absolute right-0 top-full mt-1 w-36 bg-popover border border-border rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all origin-top-right flex flex-col p-1 z-50">
              {(['pt', 'en', 'es', 'fr', 'de'] as Language[]).map(lang => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={cn(
                    "px-3 py-2 text-sm text-left rounded-lg transition-colors",
                    language === lang
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-secondary text-foreground"
                  )}
                >
                  {lang === 'pt' ? '🇵🇹 Português' :
                   lang === 'en' ? '🇬🇧 English' :
                   lang === 'es' ? '🇪🇸 Español' :
                   lang === 'fr' ? '🇫🇷 Français' : '🇩🇪 Deutsch'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container max-w-5xl mx-auto px-4 py-10">
        {children}
      </main>
    </div>
  );
}
