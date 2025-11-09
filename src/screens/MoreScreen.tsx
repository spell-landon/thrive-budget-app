import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function MoreScreen({ navigation }: any) {
  const menuItems = [
    {
      title: 'Transactions',
      icon: 'list',
      description: 'View and manage your transactions',
      screen: 'Transactions',
      color: '#FF6B35',
    },
    {
      title: 'Income Sources',
      icon: 'cash',
      description: 'Manage income sources and allocation templates',
      screen: 'IncomeSources',
      color: '#3B82F6',
    },
    {
      title: 'Subscriptions',
      icon: 'repeat',
      description: 'Track recurring payments',
      screen: 'Subscriptions',
      color: '#10B981',
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
    {
      title: 'DatePicker Examples',
      icon: 'calendar',
      description: 'Test different date picker styles',
      screen: 'DatePickerExample',
      color: '#EC4899',
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-card" edges={['top']}>
      <View className="flex-1 bg-background">
        {/* Header */}
        <View className="px-6 py-4 bg-card border-b border-gray-200">
          <Text className="text-2xl font-bold text-text-primary">More</Text>
          <Text className="text-sm text-text-secondary mt-1">
            Additional features and settings
          </Text>
        </View>

        <ScrollView className="flex-1 px-6 py-6">
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.screen}
              onPress={() => navigation.navigate(item.screen)}
              className="bg-card rounded-2xl p-5 mb-4"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
                elevation: 1,
              }}
              activeOpacity={0.7}
            >
              <View className="flex-row items-center">
                <View
                  className="w-12 h-12 rounded-full items-center justify-center mr-4"
                  style={{ backgroundColor: `${item.color}15` }}
                >
                  <Ionicons name={item.icon as any} size={24} color={item.color} />
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-semibold text-text-primary mb-1">
                    {item.title}
                  </Text>
                  <Text className="text-sm text-text-secondary">
                    {item.description}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </View>
            </TouchableOpacity>
          ))}

          {/* App Info Section */}
          <View className="mt-8 items-center">
            <Text className="text-text-tertiary text-sm mb-2">Thrive Budget</Text>
            <Text className="text-text-tertiary text-xs">Version 1.0.0</Text>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
