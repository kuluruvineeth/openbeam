import { StatusBar, type StatusBarStyle } from "react-native";
import { UnistylesRuntime } from "react-native-unistyles";

type StatusBarManagerProps = {
  style?: StatusBarStyle;
  hidden?: boolean;
};

export function StatusBarManager({
  style,
  hidden = false,
}: StatusBarManagerProps) {
  const resolvedStyle =
    style ??
    (UnistylesRuntime.themeName === "dark" ? "light-content" : "dark-content");

  return (
    <StatusBar
      animated
      backgroundColor="transparent"
      barStyle={resolvedStyle}
      hidden={hidden}
      translucent
    />
  );
}
