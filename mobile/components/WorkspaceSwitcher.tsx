import React, { useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useQuery } from "convex/react";
import { useWorkspace } from "../contexts/WorkspaceContext";
import { api } from "../../convex/_generated/api";

export function WorkspaceSwitcher() {
  const { numbers, activePhoneNumberId, setActivePhoneNumberId, isLoading } =
    useWorkspace();
  const agents = useQuery(api.agents.list);
  const activeByNumber = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const cfg of agents ?? []) {
      if (cfg.phoneNumberId) map[cfg.phoneNumberId] = Boolean(cfg.isActive);
    }
    return map;
  }, [agents]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={[styles.card, styles.skeleton]} />
      </View>
    );
  }

  if (numbers.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>الرقم النشط</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
      >
        {numbers.map((ws) => {
          const isActive = activePhoneNumberId === ws.businessNumberId;
          return (
            <TouchableOpacity
              key={ws._id}
              onPress={() => setActivePhoneNumberId(ws.businessNumberId)}
              activeOpacity={0.8}
              style={[styles.card, isActive && styles.cardActive]}
            >
              <Text
                style={[styles.name, isActive && styles.nameActive]}
                numberOfLines={1}
              >
                {ws.name}
              </Text>
              <Text
                style={[
                  styles.aiStatus,
                  isActive
                    ? styles.aiStatusActive
                    : activeByNumber[ws.businessNumberId]
                      ? styles.aiOn
                      : styles.aiOff,
                ]}
              >
                {activeByNumber[ws.businessNumberId] ? "AI ON" : "AI OFF"}
              </Text>
              <Text
                style={[styles.phone, isActive && styles.phoneActive]}
                numberOfLines={1}
              >
                {ws.phone}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  label: {
    fontSize: 10,
    fontWeight: "600",
    color: "#666",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    gap: 8,
    paddingVertical: 4,
  },
  card: {
    minWidth: 100,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#F0F0F0",
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  cardActive: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  skeleton: {
    minWidth: 120,
    height: 48,
  },
  name: {
    fontSize: 12,
    fontWeight: "700",
    color: "#333",
    marginBottom: 2,
  },
  nameActive: {
    color: "#FFFFFF",
  },
  aiStatus: {
    fontSize: 10,
    fontWeight: "600",
    marginBottom: 2,
  },
  aiStatusActive: {
    color: "rgba(255,255,255,0.9)",
  },
  aiOn: {
    color: "#10B981",
  },
  aiOff: {
    color: "#F59E0B",
  },
  phone: {
    fontSize: 10,
    fontWeight: "500",
    color: "#666",
    writingDirection: "ltr",
  },
  phoneActive: {
    color: "rgba(255,255,255,0.9)",
  },
});
