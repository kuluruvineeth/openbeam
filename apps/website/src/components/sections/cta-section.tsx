export function CTASection() {
  return (
    <section className="bg-background py-16 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-[1400px] space-y-6 px-4 text-center">
        <h2 className="font-serif text-2xl text-foreground sm:text-3xl">
          Stop paying $50/user/month for enterprise search
        </h2>
        <p className="mx-auto max-w-xl font-sans text-base text-muted-foreground">
          Deploy OpenBeam on your infrastructure in 5 minutes. Free, open
          source, and self-hosted.
        </p>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <a
            className="flex h-11 items-center justify-center bg-primary px-6 font-sans text-primary-foreground text-sm transition-colors hover:bg-primary/90"
            href="https://docs.openbeam.work/quickstart"
          >
            Deploy your instance
          </a>
          <a
            className="flex h-11 items-center justify-center gap-2 border border-border bg-background px-6 font-sans text-foreground text-sm transition-colors hover:bg-secondary"
            href="https://github.com/openbeam/openbeam"
            rel="noopener noreferrer"
            target="_blank"
          >
            <svg
              aria-hidden="true"
              className="h-4 w-4"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" />
            </svg>
            Star on GitHub
          </a>
        </div>
      </div>
    </section>
  );
}
