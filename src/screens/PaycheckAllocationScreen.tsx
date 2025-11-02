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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import {
  getPaycheckPlanById,
  getPaycheckAllocationsWithCategories,
  getPaycheckGoalAllocationsWithGoals,
  updateAllAllocations,
  updateAllGoalAllocations,
} from '../services/paychecks';
import {
  getOrCreateCurrentMonthBudget,
  getBudgetCategories,
} from '../services/budgets';
import { getGoals } from '../services/goals';
import {
  formatCurrency,
  centsToInputValue,
  parseCurrencyInput,
} from '../utils/currency';
import { PaycheckPlan, BudgetCategory, SavingsGoal } from '../types';

interface AllocationInput {
  categoryId: string;
  categoryName: string;
  categoryType: string;
  amount: string;
}

interface GoalAllocationInput {
  goalId: string;
  goalName: string;
  amount: string;
}

export default function PaycheckAllocationScreen({ route, navigation }: any) {
  const { user } = useAuth();
  const { paycheckId } = route.params;
  const [paycheck, setPaycheck] = useState<PaycheckPlan | null>(null);
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [allocations, setAllocations] = useState<AllocationInput[]>([]);
  const [goalAllocations, setGoalAllocations] = useState<GoalAllocationInput[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [paycheckId]);

  // Pass submit handler to navigation params for header button
  useEffect(() => {
    navigation.setParams({
      handleSubmit: handleSave,
      loading: saving,
    });
  }, [saving]);

  const loadData = async () => {
    if (!user) return;

    try {
      // Load paycheck plan
      const paycheckData = await getPaycheckPlanById(paycheckId);
      setPaycheck(paycheckData);

      // Load current month's budget and categories
      const budget = await getOrCreateCurrentMonthBudget(user.id);
      const categoriesData = await getBudgetCategories(budget.id);
      // Filter out income categories - you don't allocate paycheck TO income categories
      const nonIncomeCategories = categoriesData.filter(
        (c) => c.category_type !== 'income'
      );
      setCategories(nonIncomeCategories);

      // Load savings goals
      const goalsData = await getGoals(user.id);
      setGoals(goalsData);

      // Load existing allocations
      const existingAllocations = await getPaycheckAllocationsWithCategories(
        paycheckId
      );
      const existingGoalAllocations = await getPaycheckGoalAllocationsWithGoals(
        paycheckId
      );

      // Initialize allocation inputs
      const allocationInputs = categoriesData.map((cat) => {
        const existing = existingAllocations.find(
          (a) => a.category_id === cat.id
        );
        return {
          categoryId: cat.id,
          categoryName: cat.name,
          categoryType: cat.category_type,
          amount: existing ? centsToInputValue(existing.amount) : '',
        };
      });

      // Initialize goal allocation inputs
      const goalAllocationInputs = goalsData.map((goal) => {
        const existing = existingGoalAllocations.find(
          (a) => a.goal_id === goal.id
        );
        return {
          goalId: goal.id,
          goalName: goal.name,
          amount: existing ? centsToInputValue(existing.amount) : '',
        };
      });

      setAllocations(allocationInputs);
      setGoalAllocations(goalAllocationInputs);
    } catch (error: any) {
      Alert.alert('Error', error.message);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const updateAllocation = (categoryId: string, value: string) => {
    setAllocations((prev) =>
      prev.map((a) =>
        a.categoryId === categoryId ? { ...a, amount: value } : a
      )
    );
  };

  const updateGoalAllocation = (goalId: string, value: string) => {
    setGoalAllocations((prev) =>
      prev.map((a) =>
        a.goalId === goalId ? { ...a, amount: value } : a
      )
    );
  };

  const getTotalAllocated = () => {
    const categoryTotal = allocations.reduce((sum, alloc) => {
      if (!alloc.amount || alloc.amount.trim() === '') return sum;
      try {
        return sum + parseCurrencyInput(alloc.amount);
      } catch {
        return sum;
      }
    }, 0);

    const goalTotal = goalAllocations.reduce((sum, alloc) => {
      if (!alloc.amount || alloc.amount.trim() === '') return sum;
      try {
        return sum + parseCurrencyInput(alloc.amount);
      } catch {
        return sum;
      }
    }, 0);

    return categoryTotal + goalTotal;
  };

  const getRemaining = () => {
    if (!paycheck) return 0;
    return paycheck.amount - getTotalAllocated();
  };

  const handleSave = async () => {
    if (!paycheck) return;

    const totalAllocated = getTotalAllocated();
    if (totalAllocated > paycheck.amount) {
      Alert.alert('Error', 'Total allocations cannot exceed paycheck amount');
      return;
    }

    setSaving(true);

    try {
      // Filter out empty allocations and convert to cents
      const allocationsToSave = allocations
        .filter((a) => a.amount && a.amount.trim() !== '')
        .map((a) => ({
          category_id: a.categoryId,
          amount: parseCurrencyInput(a.amount),
        }));

      const goalAllocationsToSave = goalAllocations
        .filter((a) => a.amount && a.amount.trim() !== '')
        .map((a) => ({
          goal_id: a.goalId,
          amount: parseCurrencyInput(a.amount),
        }));

      await Promise.all([
        updateAllAllocations(paycheckId, allocationsToSave),
        updateAllGoalAllocations(paycheckId, goalAllocationsToSave),
      ]);

      Alert.alert('Success', 'Allocations saved successfully!');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAutoAllocate = () => {
    if (!paycheck || categories.length === 0) return;

    Alert.alert(
      'Auto-Allocate',
      'This will evenly distribute your paycheck across all categories. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: () => {
            const perCategory = Math.floor(paycheck.amount / categories.length);
            const newAllocations = allocations.map((a, index) => ({
              ...a,
              amount: centsToInputValue(
                index === 0
                  ? perCategory + (paycheck.amount % categories.length)
                  : perCategory
              ),
            }));
            setAllocations(newAllocations);
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView className='flex-1 bg-gray-50' edges={['top']}>
        <View className='flex-1 items-center justify-center'>
          <ActivityIndicator size='large' color='#2563eb' />
        </View>
      </SafeAreaView>
    );
  }

  const remaining = getRemaining();
  const isOverAllocated = remaining < 0;

  // Group allocations by type
  const incomeAllocations = allocations.filter(
    (a) => a.categoryType === 'income'
  );
  const expenseAllocations = allocations.filter(
    (a) => a.categoryType === 'expense'
  );
  const savingsAllocations = allocations.filter(
    (a) => a.categoryType === 'savings'
  );

  const AllocationSection = ({
    title,
    items,
    icon,
  }: {
    title: string;
    items: AllocationInput[];
    icon: string;
  }) => {
    if (items.length === 0) return null;

    return (
      <View className='mb-4'>
        <View className='flex-row items-center mb-2 px-1'>
          <Ionicons name={icon as any} size={18} color='#2563eb' />
          <Text className='text-base font-bold text-gray-800 ml-2'>
            {title}
          </Text>
        </View>
        {items.map((alloc) => (
          <View
            key={alloc.categoryId}
            className='bg-white rounded-lg p-3 mb-2 shadow-sm border border-gray-100'>
            <Text className='text-sm font-semibold text-gray-800 mb-2'>
              {alloc.categoryName}
            </Text>
            <View className='flex-row items-center border border-gray-300 rounded-lg bg-gray-50'>
              <Text className='text-gray-500 text-base px-3'>$</Text>
              <TextInput
                className='flex-1 py-2 pr-3'
                value={alloc.amount}
                onChangeText={(value) =>
                  updateAllocation(alloc.categoryId, value)
                }
                placeholder='0.00'
                keyboardType='decimal-pad'
              />
            </View>
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView className='flex-1 bg-gray-50' edges={[]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className='flex-1'>
        <ScrollView className='flex-1'>
          <View className='p-4'>
            {/* Paycheck Summary */}
            <View className='bg-blue-600 rounded-2xl p-5 mb-4 shadow-lg'>
              <Text className='text-blue-100 text-xs uppercase font-semibold tracking-wide mb-1'>
                {paycheck?.name}
              </Text>
              <Text className='text-white text-3xl font-bold mb-1'>
                {formatCurrency(paycheck?.amount || 0)}
              </Text>
              <Text className='text-blue-100 text-xs'>
                {paycheck?.frequency.charAt(0).toUpperCase()}
                {paycheck?.frequency.slice(1)} paycheck
              </Text>

              {/* Remaining */}
              <View className='flex-row items-center justify-between pt-3 mt-3 border-t border-white/20'>
                <Text className='text-blue-100 text-sm'>
                  {remaining === 0
                    ? 'Fully Allocated'
                    : remaining > 0
                    ? 'Remaining'
                    : 'Over Allocated'}
                </Text>
                <Text
                  className={`text-xl font-bold ${
                    isOverAllocated
                      ? 'text-red-200'
                      : remaining === 0
                      ? 'text-green-300'
                      : 'text-white'
                  }`}>
                  {formatCurrency(Math.abs(remaining))}
                </Text>
              </View>
            </View>

            {/* No Categories State */}
            {categories.length === 0 ? (
              <View className='items-center py-8'>
                <Ionicons
                  name='folder-open-outline'
                  size={64}
                  color='#9ca3af'
                />
                <Text className='text-gray-600 mt-4 text-center mb-4'>
                  No budget categories yet. Create categories in your budget
                  first.
                </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Main', { screen: 'Budget' })}
                  className='bg-blue-600 px-6 py-3 rounded-lg'>
                  <Text className='text-white font-semibold'>Go to Budget</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* Allocations by Category Type */}
                <AllocationSection
                  title='Expenses'
                  items={expenseAllocations}
                  icon='cart'
                />
                <AllocationSection
                  title='Savings'
                  items={savingsAllocations}
                  icon='wallet'
                />

                {/* Goals Section */}
                {goals.length > 0 && (
                  <View className='mb-4'>
                    <View className='flex-row items-center mb-2 px-1'>
                      <Ionicons name='flag' size={18} color='#2563eb' />
                      <Text className='text-base font-bold text-gray-800 ml-2'>
                        Goals
                      </Text>
                    </View>
                    {goalAllocations.map((alloc) => (
                      <View
                        key={alloc.goalId}
                        className='bg-white rounded-lg p-3 mb-2 shadow-sm border border-gray-100'>
                        <Text className='text-sm font-semibold text-gray-800 mb-2'>
                          {alloc.goalName}
                        </Text>
                        <View className='flex-row items-center border border-gray-300 rounded-lg bg-gray-50'>
                          <Text className='text-gray-500 text-base px-3'>$</Text>
                          <TextInput
                            className='flex-1 py-2 pr-3'
                            value={alloc.amount}
                            onChangeText={(value) =>
                              updateGoalAllocation(alloc.goalId, value)
                            }
                            placeholder='0.00'
                            keyboardType='decimal-pad'
                          />
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* Save Button */}
                <TouchableOpacity
                  onPress={handleSave}
                  disabled={saving || isOverAllocated}
                  className={`rounded-lg py-4 mt-2 ${
                    saving || isOverAllocated ? 'bg-blue-400' : 'bg-blue-600'
                  }`}>
                  <Text className='text-white text-center font-semibold text-lg'>
                    {saving ? 'Saving...' : 'Save Allocations'}
                  </Text>
                </TouchableOpacity>

                {isOverAllocated && (
                  <Text className='text-red-600 text-sm text-center mt-2'>
                    Reduce allocations to save
                  </Text>
                )}
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
