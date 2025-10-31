import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import {
  getBudgetByMonth,
  createBudget,
  getBudgetCategories,
  deleteBudgetCategory,
  copyBudgetCategories,
  getBudgets,
} from '../services/budgets';
import { formatCurrency } from '../utils/currency';
import { Budget, BudgetCategory } from '../types';

export default function BudgetScreen({ navigation }: any) {
  const { user } = useAuth();
  const [budget, setBudget] = useState<Budget | null>(null);
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const formatMonthKey = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  };

  const formatMonthDisplay = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  };

  const loadBudget = useCallback(async () => {
    if (!user) return;

    try {
      const monthKey = formatMonthKey(currentMonth);
      const budgetData = await getBudgetByMonth(user.id, monthKey);
      setBudget(budgetData);

      if (budgetData) {
        const categoriesData = await getBudgetCategories(budgetData.id);
        setCategories(categoriesData);
      } else {
        setCategories([]);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, currentMonth]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadBudget();
    }, [loadBudget])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadBudget();
  }, [loadBudget]);

  const handlePreviousMonth = () => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() - 1);
    setCurrentMonth(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + 1);
    setCurrentMonth(newDate);
  };

  const handleCreateBudget = async (copyFromPrevious: boolean = false) => {
    if (!user) return;

    try {
      const monthKey = formatMonthKey(currentMonth);
      const newBudget = await createBudget(user.id, {
        month: monthKey,
        name: `Budget for ${formatMonthDisplay(currentMonth)}`,
        total_income: 0,
        total_allocated: 0,
      });

      if (copyFromPrevious) {
        // Get previous month's budget
        const prevMonth = new Date(currentMonth);
        prevMonth.setMonth(prevMonth.getMonth() - 1);
        const prevMonthKey = formatMonthKey(prevMonth);
        const prevBudget = await getBudgetByMonth(user.id, prevMonthKey);

        if (prevBudget) {
          await copyBudgetCategories(prevBudget.id, newBudget.id);
          Alert.alert('Success', 'Budget created with categories from previous month!');
        } else {
          Alert.alert('Success', 'Budget created! (No previous month data to copy)');
        }
      } else {
        Alert.alert('Success', 'Budget created successfully!');
      }

      loadBudget();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleDeleteCategory = (category: BudgetCategory) => {
    Alert.alert('Delete Category', `Are you sure you want to delete ${category.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteBudgetCategory(category.id);
            loadBudget();
          } catch (error: any) {
            Alert.alert('Error', error.message);
          }
        },
      },
    ]);
  };

  const handleEditCategory = (category: BudgetCategory) => {
    navigation.navigate('EditBudgetCategory', { categoryId: category.id, budgetId: budget!.id });
  };

  // Group categories by type
  const incomeCategories = categories.filter((c) => c.category_type === 'income');
  const expenseCategories = categories.filter((c) => c.category_type === 'expense');
  const savingsCategories = categories.filter((c) => c.category_type === 'savings');

  const remaining = budget ? budget.total_income - budget.total_allocated : 0;

  const getProgressPercentage = (spent: number, allocated: number) => {
    if (allocated === 0) return 0;
    return Math.min((spent / allocated) * 100, 100);
  };

  const getProgressColor = (spent: number, allocated: number) => {
    const percentage = (spent / allocated) * 100;
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-orange-500';
    return 'bg-green-500';
  };

  const CategorySection = ({
    title,
    categories,
    icon,
  }: {
    title: string;
    categories: BudgetCategory[];
    icon: string;
  }) => {
    if (categories.length === 0) return null;

    const totalAllocated = categories.reduce((sum, c) => sum + c.allocated_amount, 0);
    const totalSpent = categories.reduce((sum, c) => sum + c.spent_amount, 0);

    return (
      <View className="mb-4">
        <View className="flex-row items-center justify-between mb-2 px-1">
          <View className="flex-row items-center">
            <Ionicons name={icon as any} size={18} color="#2563eb" />
            <Text className="text-base font-bold text-gray-800 ml-2">{title}</Text>
          </View>
          <View className="items-end">
            <Text className="text-xs text-gray-500 font-medium">
              {formatCurrency(totalSpent)} / {formatCurrency(totalAllocated)}
            </Text>
          </View>
        </View>

        {categories.map((category) => {
          const progress = getProgressPercentage(category.spent_amount, category.allocated_amount);
          const progressColor = getProgressColor(category.spent_amount, category.allocated_amount);
          const remaining = category.allocated_amount - category.spent_amount;

          return (
            <TouchableOpacity
              key={category.id}
              onPress={() => handleEditCategory(category)}
              className="bg-white rounded-lg p-3 mb-2 shadow-sm border border-gray-100"
              activeOpacity={0.7}
            >
              {/* Top Row: Name and Delete */}
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-base font-semibold text-gray-800 flex-1">{category.name}</Text>
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    handleDeleteCategory(category);
                  }}
                  className="ml-2"
                >
                  <Ionicons name="trash-outline" size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>

              {/* Bottom Row: Amounts and Progress */}
              <View className="flex-row items-center">
                <View className="flex-1">
                  <View className="flex-row items-baseline mb-1">
                    <Text className="text-lg font-bold text-gray-800">
                      {formatCurrency(category.spent_amount)}
                    </Text>
                    <Text className="text-xs text-gray-500 ml-1">
                      / {formatCurrency(category.allocated_amount)}
                    </Text>
                  </View>
                  {/* Inline Progress Bar */}
                  <View className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <View className={`h-1.5 ${progressColor} rounded-full`} style={{ width: `${progress}%` }} />
                  </View>
                </View>
                <View className="ml-3 items-end">
                  <Text className="text-xs text-gray-500 mb-0.5">
                    {remaining >= 0 ? 'Left' : 'Over'}
                  </Text>
                  <Text
                    className={`text-base font-bold ${
                      remaining >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {formatCurrency(Math.abs(remaining))}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <View className="flex-1">
        {/* Header with Month Navigation */}
        <View className="px-6 py-4 bg-white border-b border-gray-200">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-2xl font-bold text-gray-800">Budget</Text>
            {budget && (
              <TouchableOpacity
                onPress={() => navigation.navigate('AddBudgetCategory', { budgetId: budget.id })}
                className="bg-blue-600 px-4 py-2 rounded-lg"
              >
                <Text className="text-white font-semibold">Add Category</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Month Navigation */}
          <View className="flex-row items-center justify-between">
            <TouchableOpacity onPress={handlePreviousMonth} className="p-2">
              <Ionicons name="chevron-back" size={24} color="#2563eb" />
            </TouchableOpacity>
            <Text className="text-lg font-semibold text-gray-700">{formatMonthDisplay(currentMonth)}</Text>
            <TouchableOpacity onPress={handleNextMonth} className="p-2">
              <Ionicons name="chevron-forward" size={24} color="#2563eb" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView className="flex-1" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          {loading ? (
            <Text className="text-gray-600 text-center mt-8">Loading budget...</Text>
          ) : !budget ? (
            <View className="items-center mt-8 px-4">
              <Ionicons name="calendar-outline" size={64} color="#9ca3af" />
              <Text className="text-gray-600 mt-4 text-center mb-4">
                No budget for {formatMonthDisplay(currentMonth)} yet.
              </Text>
              <TouchableOpacity
                onPress={() => handleCreateBudget(false)}
                className="bg-blue-600 px-6 py-3 rounded-lg mb-3"
              >
                <Text className="text-white font-semibold">Create Budget</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleCreateBudget(true)}
                className="bg-gray-600 px-6 py-3 rounded-lg"
              >
                <Text className="text-white font-semibold">Copy from Previous Month</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="p-4">
              {/* Budget Summary - Redesigned */}
              <View className="bg-blue-600 rounded-2xl p-5 mb-4 shadow-lg">
                <View className="flex-row justify-between items-start mb-4">
                  <View>
                    <Text className="text-blue-100 text-xs uppercase font-semibold tracking-wide mb-1">
                      Monthly Budget
                    </Text>
                    <Text className="text-white text-3xl font-bold">
                      {formatCurrency(budget.total_income)}
                    </Text>
                    <Text className="text-blue-100 text-xs mt-1">Total Income</Text>
                  </View>
                  <View className="bg-white/20 rounded-full px-3 py-1">
                    <Text className="text-white text-xs font-semibold">
                      {categories.length} {categories.length === 1 ? 'category' : 'categories'}
                    </Text>
                  </View>
                </View>

                {/* Progress Bar */}
                <View className="mb-3">
                  <View className="flex-row justify-between mb-2">
                    <Text className="text-blue-100 text-xs font-medium">
                      {formatCurrency(budget.total_allocated)} allocated
                    </Text>
                    <Text className="text-white text-xs font-semibold">
                      {budget.total_income > 0
                        ? Math.round((budget.total_allocated / budget.total_income) * 100)
                        : 0}%
                    </Text>
                  </View>
                  <View className="h-2 bg-white/20 rounded-full overflow-hidden">
                    <View
                      className={`h-2 rounded-full ${
                        remaining < 0 ? 'bg-red-400' : remaining === 0 ? 'bg-green-400' : 'bg-white'
                      }`}
                      style={{
                        width: `${Math.min((budget.total_allocated / Math.max(budget.total_income, 1)) * 100, 100)}%`,
                      }}
                    />
                  </View>
                </View>

                {/* Remaining Amount */}
                <View className="flex-row items-center justify-between pt-3 border-t border-white/20">
                  <Text className="text-blue-100 text-sm">
                    {remaining === 0 ? 'Fully Allocated' : remaining > 0 ? 'Left to Allocate' : 'Over Budget'}
                  </Text>
                  <Text
                    className={`text-xl font-bold ${
                      remaining < 0 ? 'text-red-200' : remaining === 0 ? 'text-green-300' : 'text-white'
                    }`}
                  >
                    {formatCurrency(Math.abs(remaining))}
                  </Text>
                </View>
              </View>

              {/* No Categories State */}
              {categories.length === 0 ? (
                <View className="items-center py-8">
                  <Ionicons name="folder-open-outline" size={64} color="#9ca3af" />
                  <Text className="text-gray-600 mt-4 text-center mb-4">
                    No budget categories yet. Add your first category to start budgeting!
                  </Text>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('AddBudgetCategory', { budgetId: budget.id })}
                    className="bg-blue-600 px-6 py-3 rounded-lg"
                  >
                    <Text className="text-white font-semibold">Add Category</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <CategorySection title="Income" categories={incomeCategories} icon="cash" />
                  <CategorySection title="Expenses" categories={expenseCategories} icon="cart" />
                  <CategorySection title="Savings" categories={savingsCategories} icon="wallet" />
                </>
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
