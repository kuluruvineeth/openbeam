"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    id: "search",
    title: "Universal Search",
    description:
      "Search across all your connected apps instantly. Find documents, messages, and more in one place.",
    icon: Icons.Search,
  },
  {
    id: "ai",
    title: "AI-Powered Answers",
    description:
      "Get intelligent answers to your questions. Our AI understands your knowledge base and provides accurate responses.",
    icon: Icons.Sparkle,
  },
  {
    id: "collections",
    title: "Collections",
    description:
      "Organize your important documents and searches into collections for quick access.",
    icon: Icons.KnowledgeManagement,
  },
  {
    id: "agents",
    title: "Custom AI Agents",
    description:
      "Create specialized AI assistants trained on specific parts of your knowledge base.",
    icon: Icons.BotIcon,
  },
];

export default function OnboardingTourPage() {
  const router = useRouter();
  const [currentFeature, setCurrentFeature] = useState(0);

  const handleNext = () => {
    if (currentFeature < FEATURES.length - 1) {
      setCurrentFeature(currentFeature + 1);
    } else {
      router.push("/onboarding/complete");
    }
  };

  const feature = FEATURES[currentFeature];
  const Icon = feature.icon;

  return (
    <div className="w-full max-w-lg">
      {/* Feature Display */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center bg-primary/10">
          <Icon className="text-primary" size={48} />
        </div>
        <h1 className="mb-4 font-f37-stout text-2xl">{feature.title}</h1>
        <p className="text-lg text-muted-foreground">{feature.description}</p>
      </div>

      {/* Progress Dots */}
      <div className="mb-8 flex justify-center gap-2">
        {FEATURES.map((_, index) => (
          <button
            className={cn(
              "h-2 w-2 transition-colors",
              index === currentFeature ? "bg-primary" : "bg-muted"
            )}
            key={index}
            onClick={() => setCurrentFeature(index)}
            type="button"
          />
        ))}
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        <Button
          className="flex-1"
          disabled={currentFeature === 0}
          onClick={() => setCurrentFeature(currentFeature - 1)}
          variant="outline"
        >
          <Icons.ArrowLeft className="mr-2" size={16} />
          Previous
        </Button>
        <Button className="flex-1" onClick={handleNext}>
          {currentFeature === FEATURES.length - 1 ? "Finish" : "Next"}
          <Icons.ArrowRight className="ml-2" size={16} />
        </Button>
      </div>

      {/* Skip */}
      <div className="mt-4 text-center">
        <Button
          onClick={() => router.push("/onboarding/complete")}
          variant="ghost"
        >
          Skip tour
        </Button>
      </div>
    </div>
  );
}
