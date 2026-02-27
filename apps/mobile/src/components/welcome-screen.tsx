import { useRouter } from "expo-router";
import { ClipboardPaste, Link2, QrCode } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import type { HostProfile } from "@/contexts/daemon-registry-context";
import { useDaemonRegistry } from "@/contexts/daemon-registry-context";
import { useSessionStore } from "@/stores/session-store";
import { buildHostAgentDraftRoute } from "@/utils/host-routes";
import { AddHostModal } from "./add-host-modal";
import { NameHostModal } from "./name-host-modal";
import { PairLinkModal } from "./pair-link-modal";

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface0,
    padding: theme.spacing[6],
    justifyContent: "center",
    alignItems: "center",
  },
  logoBadge: {
    width: 96,
    height: 96,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.foreground,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing[6],
  },
  logoGlyph: {
    color: theme.colors.surface0,
    fontSize: 48,
    fontWeight: "700",
    lineHeight: 52,
  },
  title: {
    color: theme.colors.foreground,
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.medium,
    marginBottom: theme.spacing[3],
    textAlign: "center",
  },
  subtitle: {
    color: theme.colors.foregroundMuted,
    fontSize: theme.fontSize.base,
    textAlign: "center",
    marginBottom: theme.spacing[8],
  },
  actions: {
    width: "100%",
    maxWidth: 420,
    gap: theme.spacing[3],
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing[3],
    paddingVertical: theme.spacing[4],
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.surface2,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  actionButtonPrimary: {
    backgroundColor: theme.colors.palette.blue[500],
    borderColor: theme.colors.palette.blue[500],
  },
  actionText: {
    color: theme.colors.foreground,
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.medium,
  },
  actionTextPrimary: {
    color: theme.colors.palette.white,
  },
}));

export interface WelcomeScreenProps {
  onHostAdded?: (profile: HostProfile) => void;
}

export function WelcomeScreen({ onHostAdded }: WelcomeScreenProps) {
  const { theme } = useUnistyles();
  const router = useRouter();
  const { updateHost } = useDaemonRegistry();
  const [isDirectOpen, setIsDirectOpen] = useState(false);
  const [isPasteLinkOpen, setIsPasteLinkOpen] = useState(false);
  const [pendingNameHost, setPendingNameHost] = useState<{
    serverId: string;
    hostname: string | null;
  } | null>(null);
  const [pendingRedirectServerId, setPendingRedirectServerId] = useState<
    string | null
  >(null);
  const pendingNameHostname = useSessionStore(
    useCallback(
      (state) => {
        if (!pendingNameHost) {
          return null;
        }
        return (
          state.sessions[pendingNameHost.serverId]?.serverInfo?.hostname ??
          pendingNameHost.hostname ??
          null
        );
      },
      [pendingNameHost]
    )
  );

  const finishOnboarding = useCallback(
    (serverId: string) => {
      // biome-ignore lint/suspicious/noExplicitAny: React Native type interop
      router.replace(buildHostAgentDraftRoute(serverId) as any);
    },
    [router]
  );

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      style={{ flex: 1, backgroundColor: theme.colors.surface0 }}
      testID="welcome-screen"
    >
      <View style={styles.logoBadge}>
        <Text style={styles.logoGlyph}>O</Text>
      </View>
      <Text style={styles.title}>Welcome to OpenPlane</Text>
      <Text style={styles.subtitle}>Add a host to start.</Text>

      <View style={styles.actions}>
        <Pressable
          onPress={() => setIsDirectOpen(true)}
          style={[styles.actionButton, styles.actionButtonPrimary]}
          testID="welcome-direct-connection"
        >
          <Link2 color={theme.colors.palette.white} size={18} />
          <Text style={[styles.actionText, styles.actionTextPrimary]}>
            Direct connection
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setIsPasteLinkOpen(true)}
          style={styles.actionButton}
          testID="welcome-paste-pairing-link"
        >
          <ClipboardPaste color={theme.colors.foreground} size={18} />
          <Text style={styles.actionText}>Paste pairing link</Text>
        </Pressable>

        {Platform.OS !== "web" ? (
          <Pressable
            onPress={() => router.push("/pair-scan?source=onboarding")}
            style={styles.actionButton}
            testID="welcome-scan-qr"
          >
            <QrCode color={theme.colors.foreground} size={18} />
            <Text style={styles.actionText}>Scan QR code</Text>
          </Pressable>
        ) : null}
      </View>

      <AddHostModal
        onClose={() => setIsDirectOpen(false)}
        onSaved={({ profile, serverId, hostname, isNewHost }) => {
          onHostAdded?.(profile);
          setPendingRedirectServerId(serverId);
          if (isNewHost) {
            setPendingNameHost({ serverId, hostname });
            return;
          }
          finishOnboarding(serverId);
        }}
        visible={isDirectOpen}
      />

      <PairLinkModal
        onClose={() => setIsPasteLinkOpen(false)}
        onSaved={({ profile, serverId, hostname, isNewHost }) => {
          onHostAdded?.(profile);
          setPendingRedirectServerId(serverId);
          if (isNewHost) {
            setPendingNameHost({ serverId, hostname });
            return;
          }
          finishOnboarding(serverId);
        }}
        visible={isPasteLinkOpen}
      />

      {pendingNameHost && pendingRedirectServerId ? (
        <NameHostModal
          hostname={pendingNameHostname}
          onSave={(label) => {
            const serverId = pendingRedirectServerId;
            // biome-ignore lint/complexity/noVoid: fire-and-forget async call
            void updateHost(pendingNameHost.serverId, { label }).finally(() => {
              setPendingNameHost(null);
              setPendingRedirectServerId(null);
              finishOnboarding(serverId);
            });
          }}
          onSkip={() => {
            const serverId = pendingRedirectServerId;
            setPendingNameHost(null);
            setPendingRedirectServerId(null);
            finishOnboarding(serverId);
          }}
          serverId={pendingNameHost.serverId}
          visible
        />
      ) : null}
    </ScrollView>
  );
}
