import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AutocompleteResult = {
  type: "file" | "user_query";
  title?: string;
  query_text?: string;
};

type Props = {
  results: AutocompleteResult[];
  onSelect: (result: AutocompleteResult) => void;
};

export function Autocomplete({ results, onSelect }: Props) {
  if (results.length === 0) {
    return null;
  }

  return (
    <div className="absolute top-full left-0 w-full border border-border border-t-0 bg-popover shadow-sm">
      {results.map((result, index) => (
        <Button
          className={cn(
            "w-full justify-start rounded-none px-4 py-2 text-left"
          )}
          key={index}
          onClick={() => {
            onSelect(result);
          }}
          variant="ghost"
        >
          <p className="text-foreground text-sm">
            {result.type === "file" ? result.title : result.query_text}
          </p>
        </Button>
      ))}
    </div>
  );
}
