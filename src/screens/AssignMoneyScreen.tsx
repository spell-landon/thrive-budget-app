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
import {
  getBudgetCategories,
  assignMoneyToCategory,
  quickAssignAllocatedAmount,
  getReadyToAssign,
  validateCashBasedBudget,
} from '../services/budgets';
import { formatCurrency, parseCurrencyInput, formatCurrencyInput } from '../utils/currency';
import { BudgetCategory } from '../types';

export default function AssignMoneyScreen({ route, navigation }: any) {
  const { budgetId } = route.params;
  const { user } = useAuth();
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [readyToAssign, setReadyToAssign] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [budgetId]);

  // Pass submit handler to navigation params for header button
  useEffect(() => {
    navigation.setParams({
      handleSubmit: handleAssign,
      loading: saving,
    });
  }, [saving, assignments]);

  const loadData = async () => {
    if (!user) return;

    try {
      const [categoriesData, readyAmount] = await Promise.all([
        getBudgetCategories(budgetId),
        getReadyToAssign(user.id, budgetId),
      ]);

      // Filter to expense and savings categories only (not income)
      const assignableCategories = categoriesData.filter(
        (c) => c.category_type === 'expense' || c.category_type === 'savings'
      );

      setCategories(assignableCategories);
      setReadyToAssign(readyAmount);
    } catch (error: any) {
      Alert.alert('Error', error.message);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const updateAssignment = (categoryId: string, value: string) => {
    setAssignments((prev) => ({
      ...prev,
      [categoryId]: value,
    }));
  };

  const getTotalAssigning = (): number => {
    return Object.values(assignments).reduce((sum, value) => {
      if (!value || value.trim() === '') return sum;
      try {
        return sum + parseCurrencyInput(value);
      } catch {
        return sum;
      }
    }, 0);
  };

  const getRemaining = (): number => {
    return readyToAssign - getTotalAssigning();
  };

  const handleQuickAssign = async (categoryId: string) => {
    if (!user) return;

    try {
      await quickAssignAllocatedAmount(user.id, budgetId, categoryId);

      // Validate cash-based budget integrity after assignment
      const validation = await validateCashBasedBudget(user.id, budgetId);
      if (!validation.valid) {
        Alert.alert(
          'Warning',
          `You've assigned ${formatCurrency(validation.deficit)} more than you have in your accounts. This may indicate a data inconsistency.`,
          [{ text: 'OK' }]
        );
      }

      Alert.alert('Success', 'Category funded successfully!');
      await loadData(); // Reload data
      setAssignments({}); // Clear assignments
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleAssign = async () => {
    if (!user) return;

    const totalAssigning = getTotalAssigning();

    if (totalAssigning === 0) {
      Alert.alert('Error', 'Please enter at least one assignment');
      return;
    }

    if (totalAssigning > readyToAssign) {
      Alert.alert(
        'Error',
        `You're trying to assign ${formatCurrency(totalAssigning)} but only have ${formatCurrency(readyToAssign)} available.`
      );
      return;
    }

    setSaving(true);

    try {
      // Assign money to each category
      for (const [categoryId, value] of Object.entries(assignments)) {
        if (!value || value.trim() === '') continue;

        const amountToAssign = parseCurrencyInput(value);
        if (amountToAssign > 0) {
          await assignMoneyToCategory(user.id, budgetId, categoryId, amountToAssign);
        }
      }

      // Validate cash-based budget integrity after assignment
      const validation = await validateCashBasedBudget(user.id, budgetId);
      if (!validation.valid) {
        Alert.alert(
          'Warning',
          `You've assigned ${formatCurrency(validation.deficit)} more than you have in your accounts. This may indicate a data inconsistency.`,
          [{ text: 'OK' }]
        );
      }

      Alert.alert('Success', 'Money assigned successfully!');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  const remaining = getRemaining();
  const isOverAssigning = remaining < 0;

  return (
    <SafeAreaView className='flex-1 bg-gray-50' edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className='flex-1'>
        <ScrollView className='flex-1'>
          <View className='p-6'>
            {/* Ready to Assign Summary */}
            <View className='bg-primary rounded-2xl p-5 mb-4'>
              <Text className='text-primary-100 text-xs uppercase font-semibold tracking-wide mb-1'>
                Ready to Assign
              </Text>
              <Text className='text-white text-3xl font-bold'>
                {formatCurrency(readyToAssign)}
              </Text>
              <View className='flex-row items-center justify-between pt-3 mt-3 border-t border-white/20'>
                <Text className='text-primary-100 text-sm'>
                  {remaining === 0
                    ? 'Fully Assigned'
                    : remaining > 0
                    ? 'Left to Assign'
                    : 'Over Assigned'}
                </Text>
                <Text
                  className={`text-xl font-bold ${
                    isOverAssigning
                      ? 'text-error-200'
                      : remaining === 0
                      ? 'text-success-300'
                      : 'text-white'
                  }`}>
                  {formatCurrency(Math.abs(remaining))}
                </Text>
              </View>
            </View>

            {/* Instructions */}
            <View className='bg-blue-50 rounded-lg p-4 mb-4'>
              <View className='flex-row items-start'>
                <Ionicons name='information-circle' size={20} color='#3B82F6' />
                <Text className='text-blue-700 text-sm ml-2 flex-1'>
                  Enter amounts to assign to each category. This adds money to your budget envelopes.
                </Text>
              </View>
            </View>

            {/* Category Assignment List */}
            {loading ? (
              <Text className='text-text-secondary text-center mt-8'>Loading categories...</Text>
            ) : categories.length === 0 ? (
              <Text className='text-text-secondary text-center mt-8'>No categories to assign to.</Text>
            ) : (
              <>
                {categories.map((category) => {
                  const needsFullFunding = category.available_amount < category.allocated_amount;
                  const neededAmount = category.allocated_amount - category.available_amount;

                  return (
                    <View
                      key={category.id}
                      className='bg-white rounded-lg p-4 mb-3 border border-gray-200'>
                      <View className='flex-row justify-between items-start mb-3'>
                        <View className='flex-1'>
                          <Text className='text-base font-semibold text-text-primary'>
                            {category.name}
                          </Text>
                          <Text className='text-xs text-text-tertiary mt-0.5'>
                            Currently: {formatCurrency(category.available_amount)} |{' '}
                            Planned: {formatCurrency(category.allocated_amount)}
                          </Text>
                        </View>
                        {needsFullFunding && (
                          <TouchableOpacity
                            onPress={() => handleQuickAssign(category.id)}
                            className='bg-primary-100 px-2 py-1 rounded-lg ml-2'>
                            <Text className='text-primary-700 text-xs font-semibold'>
                              Fund {formatCurrency(neededAmount)}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      <View className='flex-row items-center border border-gray-300 rounded-lg bg-gray-50'>
                        <Text className='text-gray-500 text-base px-3'>$</Text>
                        <TextInput
                          className='flex-1 py-2 pr-3'
                          value={assignments[category.id] || ''}
                          onChangeText={(value) => updateAssignment(category.id, value)}
                          onBlur={() => {
                            const value = assignments[category.id];
                            if (value) {
                              updateAssignment(category.id, formatCurrencyInput(value));
                            }
                          }}
                          placeholder='0.00'
                          keyboardType='decimal-pad'
                        />
                      </View>
                    </View>
                  );
                })}
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
