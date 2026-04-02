import { EmptyState } from "../../shared/empty-state";
import { SectionHeader } from "../../shared/section-header";
import type { Person } from "./mock-data";
import { PersonCard } from "./person-card";

type PeopleViewProps = {
  people: Person[];
};

export function PeopleView({ people }: PeopleViewProps) {
  if (people.length === 0) {
    return (
      <EmptyState
        description="No people found"
        icon={
          <svg
            aria-hidden="true"
            className="text-muted-foreground/50"
            fill="none"
            height="24"
            viewBox="0 0 24 24"
            width="24"
          >
            <path
              d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
            />
          </svg>
        }
        title="No results"
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <SectionHeader count={people.length} title="People" />
      <div className="flex flex-col gap-1.5">
        {people.map((person) => (
          <PersonCard key={person.id} person={person} />
        ))}
      </div>
    </div>
  );
}
