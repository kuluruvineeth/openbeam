import { useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { Text } from "@/components/ui";
import type { OAuthProvider } from "../lib/auth-types";
import { GithubLogo, GoogleLogo } from "./provider-logos";

type OAuthButtonProps = {
  provider: OAuthProvider;
  onPress: (provider: OAuthProvider) => Promise<boolean>;
  disabled?: boolean;
};

const PROVIDER_CONFIG: Record<
  OAuthProvider,
  { label: string; Logo: typeof GoogleLogo }
> = {
  google: { label: "Continue with Google", Logo: GoogleLogo },
  github: { label: "Continue with GitHub", Logo: GithubLogo },
};

export function OAuthButton({ provider, onPress, disabled }: OAuthButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const config = PROVIDER_CONFIG[provider];

  const handlePress = async () => {
    setIsLoading(true);
    try {
      await onPress(provider);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Pressable
      disabled={disabled || isLoading}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.buttonPressed,
        (disabled || isLoading) && styles.buttonDisabled,
      ]}
    >
      <View style={styles.content}>
        {isLoading ? (
          <ActivityIndicator color="#6b7280" size="small" />
        ) : (
          <config.Logo size={18} />
        )}
        <Text style={styles.label}>
          {isLoading ? "Redirecting..." : config.label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing[4],
  },
  buttonPressed: {
    backgroundColor: theme.colors.muted,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
  },
  label: {
    fontSize: 15,
    fontWeight: "500",
    color: theme.colors.foreground,
  },
}));
