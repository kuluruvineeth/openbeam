import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet } from "react-native-unistyles";
import { Text } from "@/components/ui";
import { useAuth } from "../hooks/use-auth";
import { OAuthButton } from "./oauth-button";

export function SignInScreen() {
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>O</Text>
          </View>
          <Text style={styles.title}>OpenBeam</Text>
          <Text muted style={styles.subtitle}>
            Enterprise search and AI assistant
          </Text>
        </View>

        <View style={styles.providers}>
          <OAuthButton onPress={signIn} provider="google" />
          <OAuthButton onPress={signIn} provider="github" />
        </View>

        <Text muted style={styles.terms}>
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </Text>
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
    gap: 40,
  },
  header: {
    alignItems: "center",
    gap: theme.spacing[3],
  },
  logoContainer: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: theme.colors.foreground,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing[2],
  },
  logoText: {
    fontSize: 28,
    fontWeight: "700",
    color: theme.colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    color: theme.colors.foreground,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
  },
  providers: {
    gap: theme.spacing[3],
  },
  terms: {
    fontSize: 11,
    textAlign: "center",
    lineHeight: 16,
  },
}));
