import type { Metadata } from "next";
import { SettingsScreen } from "@/features/daemon/components/settings-screen";

export const metadata: Metadata = {
  title: "Daemon Settings | OpenPlane",
  description: "Configure daemon connections and preferences",
};

export default function DaemonSettingsPage() {
  return <SettingsScreen />;
}
