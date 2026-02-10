/**
 * Filtra elements amb id invàlid per Radix SelectItem.
 * Radix peta si value === "" | null | undefined.
 */
export function filterValidSelectItems<T extends { id?: unknown }>(
  items: T[],
  context: string
): T[] {
  return items.filter((item) => {
    const id = item.id;
    const ok = typeof id === "string" && id.trim() !== "";
    if (!ok && process.env.NODE_ENV !== "production") {
      console.warn("[SelectOptions] skipped item with invalid id", { context, id, item });
    }
    return ok;
  });
}
