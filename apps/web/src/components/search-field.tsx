"use client";

import { useQueryState } from "nuqs";
import { useHotkeys } from "react-hotkeys-hook";
import { Icons } from "@/components/icons";
import { Input } from "@/components/ui/input";

type Props = {
  placeholder: string;
  shallow?: boolean;
};

export function SearchField({ placeholder }: Props) {
  const [search, setSearch] = useQueryState("q");

  useHotkeys("esc", () => setSearch(null), {
    enableOnFormTags: true,
  });

  const handleSearch = (evt: React.ChangeEvent<HTMLInputElement>) => {
    const value = evt.target.value;

    if (value) {
      setSearch(value);
    } else {
      setSearch(null);
    }
  };

  return (
    <div className="relative w-full md:max-w-[380px]">
      <Icons.Search className="pointer-events-none absolute top-[8px] left-3" />
      <Input
        autoCapitalize="none"
        autoComplete="off"
        autoCorrect="off"
        className="w-full pl-9"
        onChange={handleSearch}
        placeholder={placeholder}
        spellCheck="false"
        value={search ?? ""}
      />
    </div>
  );
}
