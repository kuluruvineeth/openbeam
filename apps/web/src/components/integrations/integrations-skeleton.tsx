import { Card, Skeleton } from "@openplane/ui";

export function AppsSkeleton() {
  return (
    <div className="mx-auto mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <Card className="flex w-full flex-col" key={index.toString()}>
          <div className="p-6">
            <Skeleton className="h-10 w-10" />

            <div className="mt-6">
              <Skeleton className="h-5 w-[40%]" />
            </div>
            <div className="space-y-2 py-4 pb-0">
              <Skeleton className="h-4 w-[80%]" />
              <Skeleton className="h-4 w-[70%]" />
              <Skeleton className="h-4 w-[160px]" />
            </div>
            <div className="mt-4 flex items-center justify-between space-x-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
