import { EmptyState } from "../../shared/empty-state";
import { SectionHeader } from "../../shared/section-header";
import type { Person } from "./mock-data";
import { PersonCard } from "./person-card";

type PeopleViewProps = {
  people: Person[];
};

export function PeopleView({ people }: PeopleViewProps) {
  if (people.length === 0) {
    return <EmptyState description="No people found" title="No results" />;
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
