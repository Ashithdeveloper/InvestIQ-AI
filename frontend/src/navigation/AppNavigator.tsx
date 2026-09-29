import React from 'react';
import { Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { ExploreScreen } from '../screens/explore/ExploreScreen';
import { CompanyDetailScreen } from '../screens/explore/CompanyDetailScreen';
import { AnalysisScreen } from '../screens/analysis/AnalysisScreen';
import { BuyAnalysisScreen } from '../screens/analysis/BuyAnalysisScreen';
import { SellAnalysisScreen } from '../screens/analysis/SellAnalysisScreen';
import { ScenarioCalculatorScreen } from '../screens/scenario/ScenarioCalculatorScreen';
import { AiChatScreen } from '../screens/chat/AiChatScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { ProfileSetupScreen } from '../screens/profile/ProfileSetupScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0F1318',
          borderTopColor: '#1F2937',
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#6B7280',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 16 }}>📊</Text>,
        }}
      />
      <Tab.Screen
        name="Explore"
        component={ExploreScreen}
        options={{
          tabBarLabel: 'Explore',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 16 }}>🔍</Text>,
        }}
      />
      <Tab.Screen
        name="Scenarios"
        component={ScenarioCalculatorScreen}
        options={{
          tabBarLabel: 'Scenarios',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 16 }}>⚖️</Text>,
        }}
      />
      <Tab.Screen
        name="Chat"
        component={AiChatScreen}
        options={{
          tabBarLabel: 'AI Chat',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 16 }}>🤖</Text>,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 16 }}>👤</Text>,
        }}
      />
    </Tab.Navigator>
  );
};

export const AppNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0A0D12' },
      }}
    >
      <Stack.Screen name="Main" component={TabNavigator} />
      <Stack.Screen name="CompanyDetail" component={CompanyDetailScreen} />
      <Stack.Screen name="Analysis" component={AnalysisScreen} />
      <Stack.Screen name="BuyAnalysis" component={BuyAnalysisScreen} />
      <Stack.Screen name="SellAnalysis" component={SellAnalysisScreen} />
      <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
    </Stack.Navigator>
  );
};

