import { ArrowRight, Search, Shield, Zap } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet } from "react-native-unistyles";
import { Text } from "@/components/ui";

type OnboardingScreenProps = {
  onComplete: () => void;
};

const STEPS = [
  {
    Icon: Search,
    title: "Search everything",
    description: "Find anything across all your connected tools in one place.",
  },
  {
    Icon: Zap,
    title: "AI-powered answers",
    description:
      "Get instant answers grounded in your company's knowledge base.",
  },
  {
    Icon: Shield,
    title: "Enterprise security",
    description:
      "Your data stays private with granular access controls and encryption.",
  },
] as const;

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const insets = useSafeAreaInsets();
  const [currentStep, setCurrentStep] = useState(0);

  const step = STEPS[currentStep];
  const isLastStep = currentStep === STEPS.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <View style={styles.stepContent}>
          <View style={styles.iconContainer}>
            <step.Icon color="#6b7280" size={32} strokeWidth={1.5} />
          </View>
          <Text style={styles.title}>{step.title}</Text>
          <Text muted style={styles.description}>
            {step.description}
          </Text>
        </View>

        <View style={styles.indicators}>
          {STEPS.map((_, index) => (
            <View
              // biome-ignore lint/suspicious/noArrayIndexKey: stable list order
              key={index}
              style={[
                styles.indicator,
                index === currentStep && styles.indicatorActive,
              ]}
            />
          ))}
        </View>

        <Pressable
          onPress={handleNext}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.buttonText}>
            {isLastStep ? "Get started" : "Next"}
          </Text>
          {!isLastStep && <ArrowRight color="#fff" size={16} strokeWidth={2} />}
        </Pressable>

        {!isLastStep && (
          <Pressable onPress={onComplete} style={styles.skipButton}>
            <Text muted style={styles.skipText}>
              Skip
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: theme.spacing[8],
    gap: theme.spacing[8],
  },
  stepContent: {
    alignItems: "center",
    gap: theme.spacing[4],
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: theme.colors.muted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing[2],
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    color: theme.colors.foreground,
    textAlign: "center",
  },
  description: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: theme.spacing[4],
  },
  indicators: {
    flexDirection: "row",
    justifyContent: "center",
    gap: theme.spacing[2],
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.border,
  },
  indicatorActive: {
    backgroundColor: theme.colors.foreground,
    width: 24,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    borderRadius: 8,
    backgroundColor: theme.colors.foreground,
    gap: theme.spacing[2],
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.background,
  },
  skipButton: {
    alignItems: "center",
    padding: theme.spacing[2],
  },
  skipText: {
    fontSize: 14,
  },
}));
