import { View } from "react-native";
import { Text } from "@/components/ui";

export default function DemoRoute() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <Text style={{ textAlign: "center" }}>
        Demo route is intentionally minimal for stable web builds.
      </Text>
    </View>
  );
}
