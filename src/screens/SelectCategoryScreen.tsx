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
import { getOrCreateCurrentMonthBudget, getBudgetCategories } from '../services/budgets';
import { BudgetCategory } from '../types';

export default function SelectCategoryScreen({ route, navigation }: any) {
  const { user } = useAuth();
  const { selectedCategoryId, onSelect, filterType } = route.params;
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    if (!user) return;

    try {
      const budget = await getOrCreateCurrentMonthBudget(user.id);
      const data = await getBudgetCategories(budget.id);

      // Filter categories by type if specified
      const filteredCategories = filterType
        ? data.filter((c) => c.category_type === filterType)
        : data;

      setCategories(filteredCategories);
    } catch (error: any) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCategory = (categoryId: string | null) => {
    if (onSelect) {
      onSelect(categoryId);
    }
    navigation.goBack();
  };

  return (
    <SafeAreaView className='flex-1 bg-gray-50' edges={['bottom']}>
      {/* Header */}
      <View className='flex-row items-center justify-between px-6 py-4 bg-white border-b border-gray-200'>
        <View className='flex-row items-center'>
          <TouchableOpacity onPress={() => navigation.goBack()} className='mr-4'>
            <Ionicons name='arrow-back' size={24} color='#1f2937' />
          </TouchableOpacity>
          <Text className='text-xl font-bold text-gray-800'>Select Category</Text>
        </View>
      </View>

      {loading ? (
        <View className='flex-1 items-center justify-center'>
          <ActivityIndicator size='large' color='#FF6B35' />
        </View>
      ) : (
        <ScrollView className='flex-1'>
          {/* None Option */}
          <TouchableOpacity
            onPress={() => handleSelectCategory(null)}
            className={`mx-4 my-2 px-6 py-4 rounded-lg border flex-row items-center ${
              !selectedCategoryId
                ? 'bg-primary-50 border-primary'
                : 'bg-white border-gray-200'
            }`}>
            <Ionicons
              name='close-circle-outline'
              size={24}
              color={!selectedCategoryId ? '#FF6B35' : '#9ca3af'}
            />
            <Text
              className={`ml-3 text-base ${
                !selectedCategoryId ? 'text-primary font-semibold' : 'text-gray-700'
              }`}>
              No Category
            </Text>
            {!selectedCategoryId && (
              <View className='ml-auto'>
                <Ionicons name='checkmark-circle' size={24} color='#FF6B35' />
              </View>
            )}
          </TouchableOpacity>

          {/* Available Categories */}
          {categories.length === 0 ? (
            <View className='flex-1 items-center justify-center p-6 mt-8'>
              <Ionicons name='pricetag-outline' size={64} color='#9ca3af' />
              <Text className='text-gray-600 text-center mt-4 text-base'>
                No categories found. Create categories in your budget to track spending!
              </Text>
            </View>
          ) : (
            categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                onPress={() => handleSelectCategory(category.id)}
                className={`mx-4 my-2 px-6 py-4 rounded-lg border ${
                  selectedCategoryId === category.id
                    ? 'bg-primary-50 border-primary'
                    : 'bg-white border-gray-200'
                }`}>
                <View className='flex-row items-center justify-between'>
                  <View className='flex-row items-center flex-1'>
                    <Ionicons
                      name='pricetag'
                      size={24}
                      color={selectedCategoryId === category.id ? '#FF6B35' : '#6b7280'}
                    />
                    <View className='ml-3 flex-1'>
                      <Text
                        className={`text-base ${
                          selectedCategoryId === category.id
                            ? 'text-primary font-semibold'
                            : 'text-gray-800'
                        }`}>
                        {category.name}
                      </Text>
                      {category.category_group && (
                        <Text className='text-sm text-gray-500 mt-1'>
                          {category.category_group}
                        </Text>
                      )}
                    </View>
                  </View>
                  {selectedCategoryId === category.id && (
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
