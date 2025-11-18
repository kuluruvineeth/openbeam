type SearchFilter = {
  lastUpdated?: string;
};

type Props = {
  filter?: SearchFilter;
  onLastUpdated?: (value: string) => void;
};

export function SearchFilters(_props: Props) {
  return (
    <div className="flex items-center gap-4 py-2">
      <span className="text-muted-foreground text-xs">Filters placeholder</span>
    </div>
  );
}
