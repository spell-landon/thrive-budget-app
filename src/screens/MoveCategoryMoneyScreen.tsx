import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { getBudgetCategories, moveMoneyBetweenCategories } from '../services/budgets';
import { formatCurrency, parseCurrencyInput, formatCurrencyInput } from '../utils/currency';
import { BudgetCategory } from '../types';

export default function MoveCategoryMoneyScreen({ route, navigation }: any) {
  const { budgetId, sourceCategoryId } = route.params || {};
  const { user } = useAuth();
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [fromCategoryId, setFromCategoryId] = useState<string | null>(sourceCategoryId || null);
  const [toCategoryId, setToCategoryId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  useEffect(() => {
    loadCategories();
  }, [budgetId]);

  // Pass submit handler to navigation params for header button
  useEffect(() => {
    if (navigation && navigation.setParams) {
      navigation.setParams({
        handleSubmit: handleMove,
        loading,
      });
    }
  }, [loading, fromCategoryId, toCategoryId, amount, categories]);

  const loadCategories = async () => {
    if (!budgetId) {
      Alert.alert('Error', 'Budget ID is required');
      navigation.goBack();
      return;
    }

    try {
      const categoriesData = await getBudgetCategories(budgetId);
      // All categories are 'expense' type now
      setCategories(categoriesData);

      // Pre-select first category with money if no source specified
      if (!fromCategoryId) {
        const categoryWithMoney = categoriesData.find(c => c.available_amount > 0);
        if (categoryWithMoney) {
          setFromCategoryId(categoryWithMoney.id);
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
      navigation.goBack();
    } finally {
      setCategoriesLoading(false);
    }
  };

  const handleMove = async () => {
    // Validation
    if (!fromCategoryId) {
      Alert.alert('Error', 'Please select a source category');
      return;
    }

    if (!toCategoryId) {
      Alert.alert('Error', 'Please select a destination category');
      return;
    }

    if (fromCategoryId === toCategoryId) {
      Alert.alert('Error', 'Source and destination categories must be different');
      return;
    }

    if (!amount || amount.trim() === '') {
      Alert.alert('Error', 'Please enter an amount');
      return;
    }

    let amountInCents: number;
    try {
      amountInCents = parseCurrencyInput(amount);
    } catch (error) {
      Alert.alert('Error', 'Invalid amount format');
      return;
    }

    if (amountInCents <= 0) {
      Alert.alert('Error', 'Amount must be greater than zero');
      return;
    }

    setLoading(true);

    try {
      const fromCategory = categories.find(c => c.id === fromCategoryId);
      const toCategory = categories.find(c => c.id === toCategoryId);

      await moveMoneyBetweenCategories(fromCategoryId, toCategoryId, amountInCents);

      Alert.alert(
        'Success',
        `Moved ${formatCurrency(amountInCents)} from ${fromCategory?.name} to ${toCategory?.name}`
      );
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return 'Select Category';
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : 'Unknown Category';
  };

  const getCategoryAvailable = (categoryId: string | null) => {
    if (!categoryId) return null;
    const category = categories.find(c => c.id === categoryId);
    return category ? category.available_amount : null;
  };

  // Quick fill amount button
  const handleQuickFill = () => {
    if (!fromCategoryId) return;
    const fromCategory = categories.find(c => c.id === fromCategoryId);
    if (fromCategory && fromCategory.available_amount > 0) {
      setAmount(formatCurrencyInput((fromCategory.available_amount / 100).toString()));
    }
  };

  if (categoriesLoading) {
    return (
      <SafeAreaView className='flex-1 bg-gray-50' edges={['bottom']}>
        <View className='flex-1 items-center justify-center'>
          <Text className='text-text-secondary'>Loading categories...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (categories.length < 2) {
    return (
      <SafeAreaView className='flex-1 bg-gray-50' edges={['bottom']}>
        <View className='flex-1 items-center justify-center p-6'>
          <Ionicons name='folder-outline' size={64} color='#9ca3af' />
          <Text className='text-text-primary text-lg font-semibold mt-4 text-center'>
            Need More Categories
          </Text>
          <Text className='text-text-secondary text-center mt-2'>
            You need at least 2 categories to move money. Add another category to get started.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className='flex-1 bg-gray-50' edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className='flex-1'>
        <ScrollView className='flex-1'>
          <View className='p-6'>
            {/* Info Banner */}
            <View className='bg-blue-50 rounded-lg p-4 mb-6'>
              <View className='flex-row items-start'>
                <Ionicons name='information-circle' size={20} color='#3B82F6' />
                <Text className='text-blue-700 text-sm ml-2 flex-1'>
                  Move money between categories in the same account. Your account balances won't change.
                </Text>
              </View>
            </View>

            {/* From Category */}
            <View className='mb-5'>
              <Text className='text-text-primary text-base font-semibold mb-2'>
                From Category (Source)
              </Text>
              <TouchableOpacity
                onPress={() => {
                  Alert.alert(
                    'Select Source Category',
                    'Choose the category to move money from',
                    categories.map(category => ({
                      text: `${category.name} (${formatCurrency(category.available_amount)})`,
                      onPress: () => {
                        setFromCategoryId(category.id);
                        // Auto-select first different category as destination
                        if (!toCategoryId || toCategoryId === category.id) {
                          const otherCategory = categories.find(c => c.id !== category.id);
                          if (otherCategory) setToCategoryId(otherCategory.id);
                        }
                      },
                    }))
                  );
                }}
                className='border border-gray-300 rounded-lg p-4 bg-white'>
                <View className='flex-row items-center justify-between'>
                  <View className='flex-1'>
                    <Text className='text-text-primary text-base font-medium'>
                      {getCategoryName(fromCategoryId)}
                    </Text>
                    {fromCategoryId && (
                      <Text className='text-text-secondary text-sm mt-1'>
                        Available: {formatCurrency(getCategoryAvailable(fromCategoryId) || 0)}
                      </Text>
                    )}
                  </View>
                  <Ionicons name='chevron-down' size={20} color='#6b7280' />
                </View>
              </TouchableOpacity>
            </View>

            {/* Arrow Icon */}
            <View className='items-center mb-5'>
              <Ionicons name='arrow-down' size={32} color='#FF6B35' />
            </View>

            {/* To Category */}
            <View className='mb-5'>
              <Text className='text-text-primary text-base font-semibold mb-2'>
                To Category (Destination)
              </Text>
              <TouchableOpacity
                onPress={() => {
                  // Filter to same account only
                  const fromCategory = categories.find(c => c.id === fromCategoryId);
                  if (!fromCategory) {
                    Alert.alert('Error', 'Please select a source category first');
                    return;
                  }

                  const selectableCategories = categories.filter(
                    c => c.id !== fromCategoryId && c.account_id === fromCategory.account_id
                  );

                  if (selectableCategories.length === 0) {
                    Alert.alert(
                      'No Categories Available',
                      'There are no other categories in this account to move money to. Money can only be moved between categories in the same account.'
                    );
                    return;
                  }

                  Alert.alert(
                    'Select Destination Category',
                    'Choose the category to move money to (same account only)',
                    selectableCategories.map(category => ({
                      text: `${category.name} (${formatCurrency(category.available_amount)})`,
                      onPress: () => setToCategoryId(category.id),
                    }))
                  );
                }}
                className='border border-gray-300 rounded-lg p-4 bg-white'>
                <View className='flex-row items-center justify-between'>
                  <View className='flex-1'>
                    <Text className='text-text-primary text-base font-medium'>
                      {getCategoryName(toCategoryId)}
                    </Text>
                    {toCategoryId && (
                      <Text className='text-text-secondary text-sm mt-1'>
                        Available: {formatCurrency(getCategoryAvailable(toCategoryId) || 0)}
                      </Text>
                    )}
                  </View>
                  <Ionicons name='chevron-down' size={20} color='#6b7280' />
                </View>
              </TouchableOpacity>
            </View>

            {/* Amount */}
            <View className='mb-5'>
              <View className='flex-row items-center justify-between mb-2'>
                <Text className='text-text-primary text-base font-semibold'>Amount</Text>
                {fromCategoryId && getCategoryAvailable(fromCategoryId)! > 0 && (
                  <TouchableOpacity onPress={handleQuickFill} className='bg-primary-100 px-3 py-1 rounded-lg'>
                    <Text className='text-primary-700 text-xs font-semibold'>
                      Move All ({formatCurrency(getCategoryAvailable(fromCategoryId)!)})
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              <View className='flex-row items-center border border-gray-300 rounded-lg bg-white'>
                <Text className='text-gray-500 text-lg px-4'>$</Text>
                <TextInput
                  className='flex-1 py-3 pr-4 text-base'
                  value={amount}
                  onChangeText={setAmount}
                  onBlur={() => {
                    if (amount) {
                      setAmount(formatCurrencyInput(amount));
                    }
                  }}
                  placeholder='0.00'
                  keyboardType='decimal-pad'
                  placeholderTextColor='#9ca3af'
                />
              </View>
            </View>

            {/* Move Summary */}
            {fromCategoryId && toCategoryId && amount && (
              <View className='bg-primary-50 rounded-lg p-4 border border-primary-200'>
                <Text className='text-text-secondary text-xs font-medium uppercase tracking-wide mb-2'>
                  Move Summary
                </Text>
                <Text className='text-text-primary text-sm mb-3'>
                  Move <Text className='font-bold'>{formatCurrency(parseCurrencyInput(amount || '0'))}</Text> from{' '}
                  <Text className='font-semibold'>{getCategoryName(fromCategoryId)}</Text> to{' '}
                  <Text className='font-semibold'>{getCategoryName(toCategoryId)}</Text>
                </Text>
                <View className='flex-row justify-between pt-2 border-t border-primary-200'>
                  <View className='flex-1'>
                    <Text className='text-text-tertiary text-xs mb-1'>{getCategoryName(fromCategoryId)} After</Text>
                    <Text className='text-text-primary text-sm font-semibold'>
                      {formatCurrency((getCategoryAvailable(fromCategoryId) || 0) - parseCurrencyInput(amount || '0'))}
                    </Text>
                  </View>
                  <View className='flex-1 items-end'>
                    <Text className='text-text-tertiary text-xs mb-1'>{getCategoryName(toCategoryId)} After</Text>
                    <Text className='text-text-primary text-sm font-semibold'>
                      {formatCurrency((getCategoryAvailable(toCategoryId) || 0) + parseCurrencyInput(amount || '0'))}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
