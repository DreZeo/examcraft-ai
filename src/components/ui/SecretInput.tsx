import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff } from "lucide-react";
import { inputCls } from "../../lib/ui/styles";

interface SecretInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

/** Password-style input with an inline reveal toggle for stored secrets. */
export function SecretInput({
  value,
  onChange,
  placeholder,
  disabled,
}: SecretInputProps) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const label = visible ? t("settings.hideApiKey") : t("settings.showApiKey");

  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`${inputCls} pr-10`}
      />
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={() => setVisible((next) => !next)}
        disabled={disabled}
        className="absolute right-1.5 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
