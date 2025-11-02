import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { getCategoryGroupsByType } from '../services/categoryGroups';
import { CategoryGroup } from '../types';

export default function SelectCategoryGroupScreen({ route, navigation }: any) {
  const { user } = useAuth();
  const { selectedCategoryGroup, categoryType, onSelect } = route.params;
  const [groups, setGroups] = useState<CategoryGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    if (!user) return;

    try {
      const data = await getCategoryGroupsByType(user.id, categoryType);
      setGroups(data);
    } catch (error: any) {
      console.error('Error loading category groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectGroup = (groupName: string | null) => {
    if (onSelect) {
      onSelect(groupName);
    }
    navigation.goBack();
  };

  const getTypeLabel = () => {
    switch (categoryType) {
      case 'income':
        return 'income sources';
      case 'expense':
        return 'expenses';
      case 'savings':
        return 'savings';
      default:
        return 'categories';
    }
  };

  return (
    <SafeAreaView className='flex-1 bg-gray-50' edges={['bottom']}>
      {/* Header */}
      <View className='flex-row items-center justify-between px-6 py-4 bg-white border-b border-gray-200'>
        <View className='flex-row items-center'>
          <TouchableOpacity onPress={() => navigation.goBack()} className='mr-4'>
            <Ionicons name='arrow-back' size={24} color='#1f2937' />
          </TouchableOpacity>
          <Text className='text-xl font-bold text-gray-800'>Select Category Group</Text>
        </View>
      </View>

      {loading ? (
        <View className='flex-1 items-center justify-center'>
          <ActivityIndicator size='large' color='#FF6B35' />
        </View>
      ) : (
        <ScrollView className='flex-1'>
          {/* No Group Option */}
          <TouchableOpacity
            onPress={() => handleSelectGroup(null)}
            className={`mx-4 my-2 px-6 py-4 rounded-lg border flex-row items-center ${
              !selectedCategoryGroup
                ? 'bg-primary-50 border-primary'
                : 'bg-white border-gray-200'
            }`}>
            <Ionicons
              name='close-circle-outline'
              size={24}
              color={!selectedCategoryGroup ? '#FF6B35' : '#9ca3af'}
            />
            <Text
              className={`ml-3 text-base ${
                !selectedCategoryGroup ? 'text-primary font-semibold' : 'text-gray-700'
              }`}>
              No Group
            </Text>
            {!selectedCategoryGroup && (
              <View className='ml-auto'>
                <Ionicons name='checkmark-circle' size={24} color='#FF6B35' />
              </View>
            )}
          </TouchableOpacity>

          {/* Available Groups */}
          {groups.length === 0 ? (
            <View className='flex-1 items-center justify-center p-6 mt-8'>
              <Ionicons name='folder-outline' size={64} color='#9ca3af' />
              <Text className='text-gray-600 text-center mt-4 text-base'>
                No category groups found for {getTypeLabel()}.
              </Text>
            </View>
          ) : (
            groups.map((group) => (
              <TouchableOpacity
                key={group.id}
                onPress={() => handleSelectGroup(group.name)}
                className={`mx-4 my-2 px-6 py-4 rounded-lg border ${
                  selectedCategoryGroup === group.name
                    ? 'bg-primary-50 border-primary'
                    : 'bg-white border-gray-200'
                }`}>
                <View className='flex-row items-center justify-between'>
                  <View className='flex-row items-center flex-1'>
                    <Ionicons
                      name='folder'
                      size={24}
                      color={selectedCategoryGroup === group.name ? '#FF6B35' : '#6b7280'}
                    />
                    <Text
                      className={`ml-3 text-base ${
                        selectedCategoryGroup === group.name
                          ? 'text-primary font-semibold'
                          : 'text-gray-800'
                      }`}>
                      {group.name}
                    </Text>
                  </View>
                  {selectedCategoryGroup === group.name && (
                    <Ionicons name='checkmark-circle' size={24} color='#FF6B35' />
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
