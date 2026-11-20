import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";

export interface Option {
  value: string;
  label: string;
}

const fold = (text: string) =>
  text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Campo de busca para listas longas (clientes, orçamentos): digita parte do
 * nome e escolhe. Segue o padrão ARIA de combobox com lista.
 */
export function SearchSelect({
  id,
  options,
  value,
  onChange,
  onBlur,
  invalid,
  describedBy,
  placeholder = "Digite para buscar",
}: {
  id: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  invalid?: boolean;
  describedBy?: string;
  placeholder?: string;
}) {
  const listId = useId();
  const [query, setQuery] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const selected = options.find((o) => o.value === value);
  const open = query !== null;
  const found = open
    ? options.filter((o) => fold(o.label).includes(fold(query)))
    : [];
  const choose = (option: Option) => {
    onChange(option.value);
    setQuery(null);
  };
  return (
    <div className="search-select">
      <div className="search-select-field">
        <input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            open && found[active] ? `${listId}-${active}` : undefined
          }
          aria-invalid={invalid}
          aria-describedby={describedBy}
          autoComplete="off"
          placeholder={selected?.label || placeholder}
          value={open ? query : (selected?.label ?? "")}
          onFocus={(e) => {
            setQuery("");
            setActive(0);
            const input = e.currentTarget;
            // no celular, sobe o campo para a lista caber acima do teclado
            if (window.matchMedia?.("(max-width: 899.98px)").matches)
              setTimeout(
                () =>
                  input.scrollIntoView?.({
                    block: "start",
                    behavior: "smooth",
                  }),
                250,
              );
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onBlur={() => {
            setQuery(null);
            onBlur?.();
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              if (!open) setQuery("");
              setActive((i) => Math.min(i + 1, Math.max(found.length - 1, 0)));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter" && open) {
              e.preventDefault();
              if (found[active]) choose(found[active]);
            } else if (e.key === "Escape" && open) {
              e.preventDefault();
              e.stopPropagation();
              setQuery(null);
            }
          }}
        />
        <ChevronDown size={16} className="search-select-icon" aria-hidden />
      </div>
      {open && (
        <ul className="search-select-list" role="listbox" id={listId}>
          {found.length ? (
            found.map((o, i) => (
              <li
                key={o.value || "vazio"}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={o.value === value}
                className={i === active ? "active" : undefined}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(o)}
              >
                {o.label}
              </li>
            ))
          ) : (
            <li className="search-select-empty">Nenhum resultado</li>
          )}
        </ul>
      )}
    </div>
  );
}
