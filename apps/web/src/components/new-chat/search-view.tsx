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
      // TODO: Implement search functionality
    }
  };

  return (
    <div className="w-full">
      <SearchBar
        autocompleteResults={autocompleteResults}
        handleAnswer={() => {
          // TODO: Implement answer logic
        }}
        handleSearch={handleSearch}
        hasSearched={hasSearched}
        query={query}
        setAutocompleteQuery={(q) => {
          // TODO: Implement autocomplete query logic
          setQuery(q);
        }}
        setAutocompleteResults={setAutocompleteResults}
        setFilter={() => {
          // TODO: Implement filter logic
        }}
        setOffset={() => {
          // TODO: Implement offset logic
        }}
        setQuery={setQuery}
      />
    </div>
  );
}
