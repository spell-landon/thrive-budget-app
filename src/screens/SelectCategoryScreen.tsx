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
import {
  getOrCreateCurrentMonthBudget,
  getBudgetCategories,
} from '../services/budgets';
import { getAccounts } from '../services/accounts';
import { getCategoryGroups } from '../services/categoryGroups';
import { BudgetCategory, Account, CategoryGroup } from '../types';

export default function SelectCategoryScreen({ route, navigation }: any) {
  const { user } = useAuth();
  const { selectedCategoryId, onSelect, filterType } = route.params;
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    if (!user) return;

    try {
      const budget = await getOrCreateCurrentMonthBudget(user.id);
      const [categoriesData, accountsData, groupsData] = await Promise.all([
        getBudgetCategories(budget.id),
        getAccounts(user.id),
        getCategoryGroups(user.id),
      ]);

      // Filter categories by type if specified
      const filteredCategories = filterType
        ? categoriesData.filter((c) => c.category_type === filterType)
        : categoriesData;

      setCategories(filteredCategories);
      setAccounts(accountsData);
      setCategoryGroups(groupsData);
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

  // Create a map of group names to icons
  const groupIconMap: Record<string, string> = {};
  categoryGroups.forEach((group) => {
    groupIconMap[group.name] = group.icon || 'folder';
  });

  // Group categories by account, then by category group
  const groupedByAccount: Record<string, Record<string, BudgetCategory[]>> = {};

  categories.forEach((category) => {
    if (!groupedByAccount[category.account_id]) {
      groupedByAccount[category.account_id] = {};
    }

    const groupName = category.category_group || 'Ungrouped';
    if (!groupedByAccount[category.account_id][groupName]) {
      groupedByAccount[category.account_id][groupName] = [];
    }

    groupedByAccount[category.account_id][groupName].push(category);
  });

  // Sort categories alphabetically within each group
  Object.values(groupedByAccount).forEach((accountGroups) => {
    Object.values(accountGroups).forEach((groupCategories) => {
      groupCategories.sort((a, b) => a.name.localeCompare(b.name));
    });
  });

  // Get account name
  const getAccountName = (accountId: string) => {
    const account = accounts.find((acc) => acc.id === accountId);
    return account?.name || 'Unknown Account';
  };

  return (
    <SafeAreaView className='flex-1 bg-gray-50' edges={['bottom']}>
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
                !selectedCategoryId
                  ? 'text-primary font-semibold'
                  : 'text-gray-700'
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
                No categories found. Create categories in your budget to track
                spending!
              </Text>
            </View>
          ) : (
            Object.keys(groupedByAccount).map((accountId) => {
              const accountGroups = groupedByAccount[accountId];
              const sortedGroupNames = Object.keys(accountGroups).sort();

              return (
                <View key={accountId} className='mb-4'>
                  {/* Account Header */}
                  <View className='px-6 py-3 bg-gray-100 border-b border-gray-200'>
                    <Text className='text-sm font-bold text-gray-700 uppercase'>
                      {getAccountName(accountId)}
                    </Text>
                  </View>

                  {/* Category Groups within Account */}
                  {sortedGroupNames.map((groupName) => {
                    const groupCategories = accountGroups[groupName];
                    const groupIcon =
                      groupName === 'Ungrouped'
                        ? 'folder-outline'
                        : groupIconMap[groupName] || 'folder';

                    return (
                      <View key={`${accountId}-${groupName}`}>
                        {/* Group Header */}
                        <View className='px-6 py-2 bg-gray-50 flex-row items-center'>
                          <Ionicons
                            name={groupIcon as any}
                            size={18}
                            color='#6b7280'
                          />
                          <Text className='text-sm font-semibold text-gray-600 ml-2'>
                            {groupName}
                          </Text>
                        </View>

                        {/* Categories in Group */}
                        {groupCategories.map((category) => (
                          <TouchableOpacity
                            key={category.id}
                            onPress={() => handleSelectCategory(category.id)}
                            className={`mx-4 my-1 px-4 py-3 rounded-lg border ${
                              selectedCategoryId === category.id
                                ? 'bg-primary-50 border-primary'
                                : 'bg-white border-gray-200'
                            }`}>
                            <View className='flex-row items-center justify-between'>
                              <View className='flex-row items-center flex-1'>
                                <Text
                                  className={`text-base ${
                                    selectedCategoryId === category.id
                                      ? 'text-primary font-semibold'
                                      : 'text-gray-800'
                                  }`}>
                                  {category.name}
                                </Text>
                              </View>
                              {selectedCategoryId === category.id && (
                                <Ionicons
                                  name='checkmark-circle'
                                  size={24}
                                  color='#FF6B35'
                                />
                              )}
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    );
                  })}
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
