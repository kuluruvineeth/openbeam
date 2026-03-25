export function buildNetsuiteUrl(
  accountId: string,
  recordType: string,
  recordId: string
): string {
  const slug = accountId.toLowerCase().replace(/_/g, "-");
  return `https://${slug}.app.netsuite.com/app/common/entity/entity.nl?id=${recordId}&type=${recordType}`;
}

export function formatRefName(
  ref: { id: string; refName?: string } | undefined
): string | undefined {
  return ref?.refName;
}

export function formatCurrency(
  amount: number | undefined,
  currency: { id: string; refName?: string } | undefined
): string | null {
  if (amount === undefined) {
    return null;
  }
  const code = currency?.refName ?? "";
  return `${amount}${code ? ` ${code}` : ""}`;
}

export function formatItemLines(
  item: { items?: Array<{ description?: string }> } | undefined
): string | null {
  if (!item?.items?.length) {
    return null;
  }
  return item.items
    .map((l) => l.description)
    .filter(Boolean)
    .join("; ");
}
