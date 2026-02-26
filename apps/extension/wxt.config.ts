import { defineConfig } from "wxt";

export default defineConfig({
  dev: {
    server: {
      port: 3200,
    },
  },
  manifest: {
    name: "OpenPlane Assistant",
    description:
      "OpenPlane browser assistant with structured action approvals and auditability.",
    version: "0.1.0",
    action: {
      default_title: "OpenPlane Assistant",
    },
    permissions: ["storage", "scripting", "activeTab", "sidePanel"],
    host_permissions: ["http://localhost:3000/*", "http://127.0.0.1:3000/*"],
  },
});
