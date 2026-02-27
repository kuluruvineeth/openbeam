import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { buildHostAgentDraftRoute } from "@/utils/host-routes";

export default function HostIndexRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ serverId?: string }>();
  const serverId = typeof params.serverId === "string" ? params.serverId : "";

  useEffect(() => {
    if (!serverId) {
      return;
    }
    // biome-ignore lint/suspicious/noExplicitAny: Expo Router route type mismatch
    router.replace(buildHostAgentDraftRoute(serverId) as any);
  }, [router, serverId]);

  return null;
}
