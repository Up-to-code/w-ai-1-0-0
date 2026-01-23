import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import { StyleSheet, useColorScheme, View, ActivityIndicator } from 'react-native';
import { Theme } from '@/constants/Theme';
import * as SecureStore from 'expo-secure-store';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useState, useEffect } from 'react';

// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    SecureStore.getItemAsync("userId").then(setUserId);
  }, []);

  const user = useQuery(api.users.getProfile, userId ? { userId: userId as any } : "skip" as any);
  const isAdmin = user?.role === 'admin';
  const isAgent = user?.role === 'agent';
  const hasManagementAccess = isAdmin || isAgent;

  if (userId && !user) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Theme.colors.headerBackground }}>
        <ActivityIndicator size="large" color="white" />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Theme.colors.primary,
        headerShown: true,
        headerStyle: {
          backgroundColor: Theme.colors.headerBackground,
        },
        headerTintColor: 'white',
        tabBarStyle: {
          borderTopWidth: StyleSheet.hairlineWidth,
        }
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'الدردشات',
          tabBarLabel: 'الدردشات',
          tabBarIcon: ({ color }) => <TabBarIcon name="wechat" color={color} />,
          href: hasManagementAccess ? undefined : null, // Hide if not admin or agent
        }}
      />
      <Tabs.Screen
        name="contacts"
        options={{
          title: 'العملاء',
          tabBarLabel: 'العملاء',
          tabBarIcon: ({ color }) => <TabBarIcon name="users" color={color} />,
          href: isAdmin ? undefined : null, // Hide if not admin
        }}
      />
    </Tabs>
  );
}
