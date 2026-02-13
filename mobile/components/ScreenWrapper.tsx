import React, { ReactNode } from "react";
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ViewStyle,
} from "react-native";
import { SafeAreaView, Edge } from "react-native-safe-area-context";

interface ScreenWrapperProps {
  children: ReactNode;
  edges?: Edge[];
  withKeyboard?: boolean;
  keyboardOffset?: number;
  style?: ViewStyle;
  backgroundColor?: string;
}

export function ScreenWrapper({
  children,
  edges = ["top", "bottom"],
  withKeyboard = false,
  keyboardOffset = 0,
  style,
  backgroundColor = "#FFFFFF",
}: ScreenWrapperProps) {
  const content = (
    <SafeAreaView
      edges={edges}
      style={[styles.container, { backgroundColor }, style]}
    >
      {children}
    </SafeAreaView>
  );

  if (withKeyboard) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={[styles.container, { backgroundColor }]}
        keyboardVerticalOffset={keyboardOffset}
      >
        {content}
      </KeyboardAvoidingView>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
