# apps/video

Programmatic video generation using [Remotion](https://remotion.dev) — React components rendered frame-by-frame into MP4/WebM.

## Quick Start

```bash
# From monorepo root
bun install
bun run dev:video       # Opens Remotion Studio at http://localhost:3100

# From this directory
bun dev                 # Same thing
```

## Rendering

```bash
# Render a composition to MP4
bun run render -- Intro --output out/intro.mp4

# Render a specific composition
bun run render -- Features --output out/features.mp4

# Render a still frame (PNG)
bun run render:still -- Intro --frame 60 --output out/intro-frame60.png
```

## Project Structure

```
src/
├── index.ts              # Remotion entry point (registerRoot)
├── index.css             # Tailwind v4
├── root.tsx              # Composition registry (all videos defined here)
├── compositions/         # Video compositions (one per video)
│   ├── intro.tsx         # OpenBeam logo reveal (6s)
│   └── features.tsx      # Feature showcase (10s)
├── components/           # Reusable animation primitives
│   ├── fade-in.tsx
│   ├── scale-in.tsx
│   ├── slide-up.tsx
│   └── glow.tsx
└── lib/
    └── theme.ts          # Brand colors, layout constants
remotion.config.ts        # Webpack overrides (Tailwind v4)
```

## Adding a New Video

1. Create a component in `src/compositions/`
2. Register it in `src/root.tsx`:

```tsx
<Composition
  id="MyVideo"
  component={MyVideo}
  durationInFrames={150}  // 5s at 30fps
  fps={30}
  width={1920}
  height={1080}
/>
```

3. Preview in Studio, render when ready.

## AI-Assisted Workflow

Remotion agent skills are installed (`.agents/skills/remotion-best-practices/`). When using Claude Code from this directory, it has full Remotion knowledge — animations, transitions, text, audio, 3D, captions, and more.

```bash
# Install/update skills
bunx skills add remotion-dev/skills -y
```

## Key Packages

| Package | Purpose |
|---------|---------|
| `remotion` | Core framework |
| `@remotion/cli` | Studio + render CLI |
| `@remotion/transitions` | Scene transitions (slide, fade, wipe) |
| `@remotion/noise` | Perlin noise for organic effects |
| `@remotion/shapes` | SVG shape primitives |
| `@remotion/paths` | SVG path manipulation |
| `@remotion/motion-blur` | Motion blur effect |
| `@remotion/google-fonts` | Google Fonts loader |
| `@remotion/tailwind-v4` | Tailwind CSS v4 integration |

## Useful Links

- [Remotion Docs](https://remotion.dev/docs)
- [Animation Fundamentals](https://remotion.dev/docs/animating-properties)
- [Spring Animations](https://remotion.dev/docs/spring)
- [Transitions](https://remotion.dev/docs/transitions)
- [Apple Fireworks Tutorial](https://remotion.dev/learn/apple-wow)
