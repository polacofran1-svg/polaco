import { Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/context/I18nContext";

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useI18n();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
          <Globe className="h-4 w-4 shrink-0" />
          <span className="flex-1 truncate text-left">
            {language === "es" ? "Español (ES)" : "English (US)"}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px] rounded-xl">
        <DropdownMenuItem
          className={`flex items-center gap-2 rounded-lg cursor-pointer ${
            language === "en" ? "bg-primary/10 text-primary font-medium" : ""
          }`}
          onClick={() => setLanguage("en")}
        >
          <span className="text-base">🇺🇸</span>
          <span>{t("common.english")}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className={`flex items-center gap-2 rounded-lg cursor-pointer ${
            language === "es" ? "bg-primary/10 text-primary font-medium" : ""
          }`}
          onClick={() => setLanguage("es")}
        >
          <span className="text-base">🇪🇸</span>
          <span>{t("common.spanish")}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
