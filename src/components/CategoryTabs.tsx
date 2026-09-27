import { mdiCheckCircle } from "@mdi/js";
import type { Category } from "../lib/api";
import { CATEGORIES, CATEGORY_LABELS, useStore } from "../lib/store";
import { CATEGORY_META, Icon } from "./ui";

export function CategoryTabs() {
  const { category, setCategory } = useStore();
  return (
    <div className="category-tabs" role="tablist" aria-label="Registry">
      {CATEGORIES.map((c: Category) => {
        const on = c === category;
        return (
          <button
            key={c}
            role="tab"
            aria-selected={on}
            className={`category-tab ${on ? "on" : ""}`}
            style={{ backgroundImage: CATEGORY_META[c].gradient }}
            onClick={() => setCategory(c)}
            data-ripple
          >
            <Icon path={CATEGORY_META[c].icon} size={24} />
            <span>{CATEGORY_LABELS[c]}</span>
            {on && <Icon path={mdiCheckCircle} size={18} className="tab-check" />}
          </button>
        );
      })}
    </div>
  );
}
