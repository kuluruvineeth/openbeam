"use client";

import { useState } from "react";
import { SearchBar } from "@/components/search-bar";

type AutocompleteResult = {
  type: "file" | "user_query";
  title?: string;
  query_text?: string;
};

export function SearchView() {
  const [query, setQuery] = useState("");
  const [autocompleteResults, setAutocompleteResults] = useState<
    AutocompleteResult[]
  >([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = () => {
    if (query.trim()) {
      setHasSearched(true);
    }
  };

  return (
    <div className="w-full">
      <SearchBar
        autocompleteResults={autocompleteResults}
        handleSearch={handleSearch}
        hasSearched={hasSearched}
        query={query}
        setAutocompleteQuery={setQuery}
        setAutocompleteResults={setAutocompleteResults}
        setQuery={setQuery}
      />
    </div>
  );
}
