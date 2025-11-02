import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import DashboardScreen from '../screens/DashboardScreen';
import AccountsScreen from '../screens/AccountsScreen';
import BudgetScreen from '../screens/BudgetScreen';
import GoalsScreen from '../screens/GoalsScreen';
import TransactionsScreen from '../screens/TransactionsScreen';
import { SafeAreaView } from 'react-native-safe-area-context';

const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

// Custom drawer content
function CustomDrawerContent({ navigation }: any) {
  const menuItems = [
    {
      title: 'Dashboard',
      icon: 'home',
      description: 'Overview of your finances',
      screen: 'DashboardHome',
      color: '#FF6B35',
    },
    {
      title: 'Subscriptions',
      icon: 'repeat',
      description: 'Track recurring payments',
      screen: 'Subscriptions',
      color: '#10B981',
    },
    {
      title: 'Paycheck Planning',
      icon: 'cash',
      description: 'Plan your paycheck allocations',
      screen: 'PaycheckPlanning',
      color: '#3B82F6',
    },
    {
      title: 'Category Groups',
      icon: 'folder-open',
      description: 'Customize your budget category groups',
      screen: 'CategoryGroupsSettings',
      color: '#F59E0B',
    },
    {
      title: 'Profile & Settings',
      icon: 'person',
      description: 'Manage your account',
      screen: 'Profile',
      color: '#8B5CF6',
    },
  ];

  return (
    <SafeAreaView className='flex-1 bg-primary' edges={['top']}>
      {/* Drawer Header */}
      <View className='px-6 py-8 bg-primary border-b border-gray-200'>
        <Text className='text-2xl font-bold text-white'>Menu</Text>
        <Text className='text-sm text-white/80 mt-1'>
          Navigation & Settings
        </Text>
      </View>

      <ScrollView className='flex-1 px-4 py-4 bg-background'>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.screen}
            onPress={() => {
              navigation.closeDrawer();
              navigation.navigate(item.screen);
            }}
            className='bg-card rounded-xl p-4 mb-3'
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 1,
            }}
            activeOpacity={0.7}>
            <View className='flex-row items-center'>
              <View
                className='w-10 h-10 rounded-full items-center justify-center mr-3'
                style={{ backgroundColor: `${item.color}15` }}>
                <Ionicons
                  name={item.icon as any}
                  size={20}
                  color={item.color}
                />
              </View>
              <View className='flex-1'>
                <Text className='text-base font-semibold text-text-primary'>
                  {item.title}
                </Text>
                <Text className='text-xs text-text-secondary mt-0.5'>
                  {item.description}
                </Text>
              </View>
              <Ionicons name='chevron-forward' size={18} color='#9ca3af' />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* App Info */}
      <View className='p-6 border-t border-gray-200 bg-background'>
        <Text className='text-text-tertiary text-sm text-center mb-1'>
          Thrive Budget
        </Text>
        <Text className='text-text-tertiary text-xs text-center'>
          Version 1.0.0
        </Text>
      </View>
    </SafeAreaView>
  );
}

// Dashboard with Drawer Navigator
function DashboardNavigator() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: true,
        drawerPosition: 'left',
        drawerType: 'front',
        headerStyle: {
          backgroundColor: '#ffffff',
        },
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: '700',
          color: '#1F2937',
        },
        headerTintColor: '#FF6B35',
      }}>
      <Drawer.Screen
        name='DashboardHome'
        component={DashboardScreen}
        options={({ navigation }) => ({
          title: 'Dashboard',
          headerLeft: ({ tintColor }) => (
            <TouchableOpacity
              onPress={() => navigation.toggleDrawer()}
              style={{ marginLeft: 16 }}>
              <Ionicons name='menu' size={28} color={tintColor} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginRight: 16,
              }}>
              <TouchableOpacity
                onPress={() => navigation.navigate('AddTransaction' as never)}>
                <Ionicons name='add' size={28} color='#FF6B35' />
              </TouchableOpacity>
            </View>
          ),
        })}
      />
    </Drawer.Navigator>
  );
}

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FF6B35',
        tabBarInactiveTintColor: '#6b7280',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          paddingLeft: 16,
          paddingRight: 16,
        },
        tabBarLabelStyle: {
          fontSize: 8,
          fontWeight: '600',
          marginBottom: 4,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
      }}>
      <Tab.Screen
        name='Dashboard'
        component={DashboardNavigator}
        options={() => ({
          tabBarIcon: ({ color, size }) => (
            <Ionicons name='home-outline' size={size} color={color} />
          ),
        })}
      />
      <Tab.Screen
        name='Accounts'
        component={AccountsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name='albums-outline' size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name='Transactions'
        component={TransactionsScreen}
        options={({ navigation, route }) => ({
          headerShown: true,
          headerStyle: {
            backgroundColor: '#ffffff',
          },
          headerTitleStyle: {
            fontSize: 18,
            fontWeight: '700',
            color: '#1F2937',
          },
          headerTintColor: '#FF6B35',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name='card-outline' size={size} color={color} />
          ),
          headerRight: () => (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginRight: 16,
              }}>
              <TouchableOpacity
                onPress={() => {
                  const toggleSelection = (route.params as any)
                    ?.toggleSelectionMode;
                  if (toggleSelection) toggleSelection();
                }}
                style={{ marginRight: 16 }}>
                <Ionicons
                  name='checkmark-circle-outline'
                  size={28}
                  color='#2563eb'
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigation.navigate('AddTransaction' as never)}>
                <Ionicons name='add' size={28} color='#FF6B35' />
              </TouchableOpacity>
            </View>
          ),
        })}
      />
      <Tab.Screen
        name='Budget'
        component={BudgetScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name='calendar-outline' size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name='Goals'
        component={GoalsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name='golf-outline' size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
