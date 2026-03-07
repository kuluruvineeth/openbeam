import AsyncStorage from "@react-native-async-storage/async-storage";
import { Keyboard, Link, Mic, Radio, Sparkles } from "lucide-react-native";
import { useCallback, useRef, useState } from "react";
import {
  FlatList,
  type ListRenderItemInfo,
  Pressable,
  Text,
  useWindowDimensions,
  View,
  type ViewToken,
} from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { isDesktop } from "@/utils/platform";

const ONBOARDING_KEY = "onboarding_completed";

type OnboardingStep = {
  id: string;
  title: string;
  description: string;
  icon: typeof Mic;
  action?: {
    label: string;
    onPress: () => Promise<void> | void;
  };
};

const STEPS: OnboardingStep[] = [
  {
    id: "welcome",
    title: "Welcome to OpenBeam",
    description:
      "Your AI-powered workspace for search, knowledge, and voice. Let's get you set up in under a minute.",
    icon: Sparkles,
  },
  {
    id: "microphone",
    title: "Microphone Access",
    description:
      "OpenBeam uses your microphone for voice dictation and transcription. Grant access to unlock voice features.",
    icon: Mic,
    action: {
      label: "Grant Access",
      onPress: async () => {
        if (typeof navigator !== "undefined" && navigator.mediaDevices) {
          const stream = await navigator.mediaDevices
            .getUserMedia({ audio: true })
            .catch(() => null);
          // biome-ignore lint/suspicious/useIterableCallbackReturn: necessary for this context
          // biome-ignore lint/complexity/noForEach: forEach is idiomatic here
          stream?.getTracks().forEach((t) => t.stop());
        }
      },
    },
  },
  ...(isDesktop()
    ? [
        {
          id: "shortcuts",
          title: "Keyboard Shortcuts",
          description:
            "Use Ctrl+Shift+D for push-to-talk, Ctrl+Shift+Space to toggle recording, and Ctrl+Shift+V to paste your last transcript.",
          icon: Keyboard,
        } as OnboardingStep,
      ]
    : []),
  {
    id: "voice-test",
    title: "Test Your Voice",
    description:
      "Tap the button below and say something. You'll see your words appear in real-time as OpenBeam transcribes your voice.",
    icon: Radio,
  },
  {
    id: "connect",
    title: "Connect Your Data",
    description:
      "Link Slack, Gmail, Drive, and 100+ other services to search across everything from one place.",
    icon: Link,
  },
];

type OnboardingFlowProps = {
  onComplete: () => void;
};

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const { theme } = useUnistyles();
  const { width: screenWidth } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList<OnboardingStep>>(null);

  const handleComplete = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, "true");
    onComplete();
  }, [onComplete]);

  const goToNext = useCallback(() => {
    if (currentIndex >= STEPS.length - 1) {
      // biome-ignore lint/complexity/noVoid: fire-and-forget async call
      void handleComplete();
      return;
    }
    const nextIndex = currentIndex + 1;
    flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    setCurrentIndex(nextIndex);
  }, [currentIndex, handleComplete]);

  const handleSkip = useCallback(() => {
    // biome-ignore lint/complexity/noVoid: fire-and-forget async call
    void handleComplete();
  }, [handleComplete]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems[0];
      if (first?.index != null) {
        setCurrentIndex(first.index);
      }
    }
  ).current;

  const renderStep = useCallback(
    ({ item }: ListRenderItemInfo<OnboardingStep>) => {
      const Icon = item.icon;
      return (
        <View style={[styles.step, { width: screenWidth }]}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: theme.colors.surface2 },
            ]}
          >
            <Icon color={theme.colors.accent} size={32} strokeWidth={1.5} />
          </View>
          <Text style={[styles.title, { color: theme.colors.foreground }]}>
            {item.title}
          </Text>
          <Text
            style={[
              styles.description,
              { color: theme.colors.foregroundMuted },
            ]}
          >
            {item.description}
          </Text>
          {item.action && (
            <Pressable
              onPress={item.action.onPress}
              style={[
                styles.actionButton,
                { backgroundColor: theme.colors.surface2 },
              ]}
            >
              <Text
                style={[
                  styles.actionButtonText,
                  { color: theme.colors.accent },
                ]}
              >
                {item.action.label}
              </Text>
            </Pressable>
          )}
        </View>
      );
    },
    [theme, screenWidth]
  );

  const isLastStep = currentIndex >= STEPS.length - 1;

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.skipRow}>
        <Pressable hitSlop={12} onPress={handleSkip}>
          <Text
            style={[styles.skipText, { color: theme.colors.foregroundMuted }]}
          >
            Skip
          </Text>
        </Pressable>
      </View>

      <FlatList
        data={STEPS}
        getItemLayout={(_, index) => ({
          length: screenWidth,
          offset: screenWidth * index,
          index,
        })}
        horizontal
        keyExtractor={(item) => item.id}
        onViewableItemsChanged={onViewableItemsChanged}
        pagingEnabled
        ref={flatListRef}
        renderItem={renderStep}
        showsHorizontalScrollIndicator={false}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {STEPS.map((step, i) => (
            <View
              key={step.id}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    i === currentIndex
                      ? theme.colors.accent
                      : theme.colors.border,
                },
              ]}
            />
          ))}
        </View>

        <Pressable
          onPress={goToNext}
          style={[styles.nextButton, { backgroundColor: theme.colors.accent }]}
        >
          <Text style={[styles.nextButtonText, { color: "#fff" }]}>
            {isLastStep ? "Get Started" : "Next"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export async function hasCompletedOnboarding(): Promise<boolean> {
  const value = await AsyncStorage.getItem(ONBOARDING_KEY);
  return value === "true";
}

export async function resetOnboarding(): Promise<void> {
  await AsyncStorage.removeItem(ONBOARDING_KEY);
}

const styles = StyleSheet.create((_theme) => ({
  container: {
    flex: 1,
  },
  skipRow: {
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  skipText: {
    fontSize: 14,
    fontWeight: "500",
  },
  step: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  actionButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    alignItems: "center",
    gap: 20,
  },
  dots: {
    flexDirection: "row",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  nextButton: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
}));
