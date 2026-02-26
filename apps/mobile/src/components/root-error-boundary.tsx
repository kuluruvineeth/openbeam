import { Component, type ReactNode } from "react";
import { Platform, ScrollView, Text, View } from "react-native";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class RootErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error("[RootErrorBoundary]", error.message, info.componentStack);
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    const { error } = this.state;

    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#1a1a2e",
          padding: Platform.OS === "web" ? 40 : 60,
          justifyContent: "center",
        }}
      >
        <Text
          style={{
            color: "#e94560",
            fontSize: 18,
            fontWeight: "700",
            marginBottom: 12,
          }}
        >
          App crashed
        </Text>
        <ScrollView style={{ maxHeight: 400 }}>
          <Text
            selectable
            style={{ color: "#eee", fontSize: 13, fontFamily: "monospace" }}
          >
            {error.message}
          </Text>
          {error.stack ? (
            <Text
              selectable
              style={{
                color: "#888",
                fontSize: 11,
                fontFamily: "monospace",
                marginTop: 8,
              }}
            >
              {error.stack}
            </Text>
          ) : null}
        </ScrollView>
      </View>
    );
  }
}
