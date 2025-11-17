import type { Metadata } from "next";
import { HydrateClient } from "@/trpc/server";

export const metadata: Metadata = {
  title: "Favourite Chats | OpenPlane",
  description: "View your favourite chat conversations",
};

export default function FavouritesPage() {
  return (
    <HydrateClient>
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <h1 className="mb-2 font-bold text-3xl">Favourite Chats</h1>
          <p className="text-muted-foreground">
            Your favourite conversations will appear here
          </p>
        </div>
      </div>
    </HydrateClient>
  );
}
