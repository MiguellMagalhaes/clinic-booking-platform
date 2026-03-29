import { useState, useRef, useEffect } from "react";
import { useTranslation } from "@/hooks/use-translation";
import { Language } from "@/lib/i18n";
import { Globe, Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils";
import { useConsultationStore } from "@/hooks/use-consultation-store";

export function Layout({ children }: { children: React.ReactNode }) {
  const { t, language, setLanguage } = useTranslation();
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const selectedType = useConsultationStore((s) => s.selectedType);
  const HeaderIcon = selectedType?.icon ?? Stethoscope;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    }
    if (langOpen) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [langOpen]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="container max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-md shadow-primary/20 transition-colors">
              <HeaderIcon className="w-5 h-5" />
            </div>
            <span className="font-semibold text-base text-foreground tracking-tight">
              {t('app_name')}
            </span>
          </div>

          <div className="relative" ref={langRef}>
            <button
              onClick={() => setLangOpen((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-secondary transition-colors text-sm font-medium text-muted-foreground"
            >
              <Globe className="w-4 h-4" />
              <span className="uppercase">{language}</span>
            </button>
            {langOpen && (
              <div className="absolute right-0 top-full mt-1 w-36 bg-popover border border-border rounded-xl shadow-xl flex flex-col p-1 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                {(['pt', 'en', 'es', 'fr', 'de'] as Language[]).map(lang => (
                  <button
                    key={lang}
                    onClick={() => { setLanguage(lang); setLangOpen(false); }}
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
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 container max-w-5xl mx-auto px-4 py-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
