import React, { Component, ErrorInfo, ReactNode } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

interface Props {
  children: ReactNode;
  screenName?: string;
}

interface State {
  hasError: boolean;
}

/** Catches render errors in a screen and shows a recoverable fallback instead of crashing the app. */
export class ScreenErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn(
      "[ScreenErrorBoundary]",
      this.props.screenName ? `screen=${this.props.screenName}` : "",
      error.message,
      errorInfo
    );
  }

  reset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.text}>حدث خطأ</Text>
          <Text style={styles.hint}>تعذر تحميل هذه الشاشة. حاول إعادة المحاولة.</Text>
          <TouchableOpacity
            onPress={this.reset}
            style={styles.retryButton}
          >
            <Text style={styles.retryButtonText}>إعادة المحاولة</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 24,
  },
  text: {
    fontSize: 16,
    color: "#333",
    fontFamily: "Cairo_400Regular",
  },
  hint: {
    fontSize: 12,
    color: "#666",
    marginTop: 8,
    fontFamily: "Cairo_400Regular",
  },
  retryButton: {
    marginTop: 18,
    backgroundColor: "#007AFF",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 140,
    alignItems: "center",
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontFamily: "Cairo_600SemiBold",
    fontSize: 14,
  },
});
