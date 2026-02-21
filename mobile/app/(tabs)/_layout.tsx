import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import { useLocale } from "../../contexts/LocaleContext";
import { markStartupPhase } from "../../lib/startupDiagnostics";

export default function TabsLayout() {
  const { t, isRTL } = useLocale();

  useEffect(() => {
    void markStartupPhase("tabs_render_start");
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#007AFF",
        tabBarInactiveTintColor: "#999",
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: "#E5E5E5",
          backgroundColor: "#FFFFFF",
        },
        tabBarLabelStyle: {
          fontFamily: "Cairo_400Regular",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("chats"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          title: t("customers"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t("settings"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
