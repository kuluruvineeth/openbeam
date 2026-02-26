import { useEffect } from "react";
import {
  type HostProfile,
  useDaemonRegistry,
} from "@/contexts/daemon-registry-context";
import { SessionProvider } from "@/contexts/session-context";
import {
  getHostRuntimeStore,
  useHostRuntimeSession,
} from "@/runtime/host-runtime";

function ManagedDaemonSession({ daemon }: { daemon: HostProfile }) {
  const { client } = useHostRuntimeSession(daemon.serverId);

  if (!client) {
    return null;
  }

  return (
    <SessionProvider
      client={client}
      key={daemon.serverId}
      serverId={daemon.serverId}
    >
      {null}
    </SessionProvider>
  );
}

export function MultiDaemonSessionHost() {
  const { daemons } = useDaemonRegistry();

  useEffect(() => {
    const runtime = getHostRuntimeStore();
    runtime.syncHosts(daemons);
  }, [daemons]);

  if (daemons.length === 0) {
    return null;
  }

  return (
    <>
      {daemons.map((daemon) => (
        <ManagedDaemonSession daemon={daemon} key={daemon.serverId} />
      ))}
    </>
  );
}
