import { ConnectionOfferSchema } from "@server/shared/connection-offer";
import { Link } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Alert, Text, View } from "react-native";
import {
  StyleSheet,
  UnistylesRuntime,
  useUnistyles,
} from "react-native-unistyles";
import { Button } from "@/components/ui/button";
import {
  type HostProfile,
  useDaemonRegistry,
} from "@/contexts/daemon-registry-context";
import {
  decodeOfferFragmentPayload,
  normalizeHostPort,
} from "@/utils/daemon-endpoints";
import { probeConnection } from "@/utils/test-daemon-connection";
import { AdaptiveModalSheet, AdaptiveTextInput } from "./adaptive-modal-sheet";

const styles = StyleSheet.create((theme) => ({
  helper: {
    color: theme.colors.foregroundMuted,
    fontSize: theme.fontSize.sm,
  },
  field: {
    gap: theme.spacing[2],
  },
  label: {
    color: theme.colors.foregroundMuted,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
  },
  input: {
    backgroundColor: theme.colors.surface2,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
    color: theme.colors.foreground,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  error: {
    color: theme.colors.destructive,
    fontSize: theme.fontSize.sm,
  },
  actions: {
    flexDirection: "row",
    gap: theme.spacing[3],
    marginTop: theme.spacing[2],
  },
}));

export interface PairLinkModalProps {
  visible: boolean;
  onClose: () => void;
  targetServerId?: string;
  onCancel?: () => void;
  onSaved?: (result: {
    profile: HostProfile;
    serverId: string;
    hostname: string | null;
    isNewHost: boolean;
  }) => void;
}

export function PairLinkModal({
  visible,
  onClose,
  onCancel,
  onSaved,
  targetServerId,
}: PairLinkModalProps) {
  const { theme } = useUnistyles();
  const { daemons, upsertDaemonFromOfferUrl } = useDaemonRegistry();
  const isMobile =
    UnistylesRuntime.breakpoint === "xs" ||
    UnistylesRuntime.breakpoint === "sm";

  const [offerUrl, setOfferUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleClose = useCallback(() => {
    if (isSaving) {
      return;
    }
    setOfferUrl("");
    setErrorMessage("");
    onClose();
  }, [isSaving, onClose]);

  const handleCancel = useCallback(() => {
    if (isSaving) {
      return;
    }
    setOfferUrl("");
    setErrorMessage("");
    (onCancel ?? onClose)();
  }, [isSaving, onCancel, onClose]);

  const handleSave = useCallback(async () => {
    if (isSaving) {
      return;
    }
    const raw = offerUrl.trim();
    if (!raw) {
      setErrorMessage("Paste a pairing link (…/#offer=...)");
      return;
    }
    if (!raw.includes("#offer=")) {
      setErrorMessage("Link must include #offer=...");
      return;
    }

    const parsedOffer = (() => {
      try {
        const idx = raw.indexOf("#offer=");
        const encoded = raw.slice(idx + "#offer=".length).trim();
        if (!encoded) {
          throw new Error("Offer payload is empty");
        }
        const payload = decodeOfferFragmentPayload(encoded);
        return ConnectionOfferSchema.parse(payload);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Invalid pairing link";
        setErrorMessage(message);
        if (!isMobile) {
          Alert.alert("Pairing failed", message);
        }
        return null;
      }
    })();

    if (!parsedOffer) {
      return;
    }

    if (targetServerId && parsedOffer.serverId !== targetServerId) {
      const message = `That pairing link belongs to ${parsedOffer.serverId}, not ${targetServerId}.`;
      setErrorMessage(message);
      if (!isMobile) {
        Alert.alert("Wrong daemon", message);
      }
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage("");

      const probeResult = await probeConnection(
        {
          id: "probe",
          type: "relay",
          relayEndpoint: normalizeHostPort(parsedOffer.relay.endpoint),
          daemonPublicKeyB64: parsedOffer.daemonPublicKeyB64,
        },
        { serverId: parsedOffer.serverId }
      );

      const isNewHost = !daemons.some(
        (daemon) => daemon.serverId === parsedOffer.serverId
      );
      const profile = await upsertDaemonFromOfferUrl(raw);
      onSaved?.({
        profile,
        serverId: parsedOffer.serverId,
        hostname: probeResult.hostname,
        isNewHost,
      });
      handleClose();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to pair host";
      setErrorMessage(message);
      if (!isMobile) {
        Alert.alert("Pairing failed", message);
      }
    } finally {
      setIsSaving(false);
    }
  }, [
    daemons,
    handleClose,
    isMobile,
    isSaving,
    offerUrl,
    onSaved,
    targetServerId,
    upsertDaemonFromOfferUrl,
  ]);

  return (
    <AdaptiveModalSheet
      onClose={handleClose}
      testID="pair-link-modal"
      title="Paste pairing link"
      visible={visible}
    >
      <Text style={styles.helper}>Paste the daemon’s pairing link.</Text>

      <View style={styles.field}>
        <Text style={styles.label}>Pairing link</Text>
        <AdaptiveTextInput
          accessibilityLabel="pair-link-input"
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          keyboardType="url"
          nativeID="pair-link-input"
          onChangeText={setOfferUrl}
          placeholder="https://your-app-host/#offer=..."
          placeholderTextColor={theme.colors.foregroundMuted}
          style={styles.input}
          testID="pair-link-input"
          value={offerUrl}
        />
        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      </View>

      <View style={styles.actions}>
        <Button
          accessibilityLabel="Cancel"
          accessibilityRole="button"
          disabled={isSaving}
          onPress={handleCancel}
          style={{ flex: 1 }}
          testID="pair-link-cancel"
          variant="secondary"
        >
          Cancel
        </Button>
        <Button
          accessibilityLabel="Pair"
          accessibilityRole="button"
          disabled={isSaving}
          leftIcon={<Link color={theme.colors.palette.white} size={16} />}
          // biome-ignore lint/complexity/noVoid: fire-and-forget async call
          onPress={() => void handleSave()}
          style={{ flex: 1 }}
          testID="pair-link-submit"
          variant="default"
        >
          {isSaving ? "Pairing..." : "Pair"}
        </Button>
      </View>
    </AdaptiveModalSheet>
  );
}
