import React, { useState } from 'react';
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
import { createBudgetCategory } from '../services/budgets';
import { parseCurrencyInput, formatCurrencyInput } from '../utils/currency';

type CategoryType = 'income' | 'expense' | 'savings';

export default function AddBudgetCategoryScreen({ route, navigation }: any) {
  const { budgetId } = route.params;
  const [name, setName] = useState('');
  const [type, setType] = useState<CategoryType>('expense');
  const [allocatedAmount, setAllocatedAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const categoryTypes: { value: CategoryType; label: string; icon: string; color: string }[] = [
    { value: 'income', label: 'Income', icon: 'cash', color: 'green' },
    { value: 'expense', label: 'Expense', icon: 'cart', color: 'red' },
    { value: 'savings', label: 'Savings', icon: 'wallet', color: 'blue' },
  ];

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }

    if (!allocatedAmount.trim()) {
      Alert.alert('Error', 'Please enter an allocated amount');
      return;
    }

    setLoading(true);

    try {
      const amountInCents = parseCurrencyInput(allocatedAmount);

      await createBudgetCategory({
        budget_id: budgetId,
        name: name.trim(),
        category_type: type,
        allocated_amount: amountInCents,
        spent_amount: 0,
      });

      Alert.alert('Success', 'Category added successfully!');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-row items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
              <Ionicons name="arrow-back" size={24} color="#1f2937" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-gray-800">Add Budget Category</Text>
          </View>
          <TouchableOpacity onPress={handleSubmit} disabled={loading}>
            <Text className={`text-base font-semibold ${loading ? 'text-gray-400' : 'text-blue-600'}`}>
              {loading ? 'Adding...' : 'Add'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1">
          <View className="p-6">
            {/* Category Type */}
            <View className="mb-4">
              <Text className="text-gray-700 font-semibold mb-2">Type *</Text>
              <View className="flex-row gap-2">
                {categoryTypes.map((categoryType) => (
                  <TouchableOpacity
                    key={categoryType.value}
                    onPress={() => setType(categoryType.value)}
                    className={`flex-1 flex-row items-center justify-center px-4 py-3 rounded-lg border ${
                      type === categoryType.value
                        ? `bg-${categoryType.color}-100 border-${categoryType.color}-500`
                        : 'bg-white border-gray-300'
                    }`}
                  >
                    <Ionicons
                      name={categoryType.icon as any}
                      size={20}
                      color={
                        type === categoryType.value
                          ? categoryType.color === 'green'
                            ? '#16a34a'
                            : categoryType.color === 'red'
                            ? '#dc2626'
                            : '#2563eb'
                          : '#6b7280'
                      }
                    />
                    <Text
                      className={`ml-2 text-sm ${
                        type === categoryType.value
                          ? `text-${categoryType.color}-700 font-semibold`
                          : 'text-gray-700'
                      }`}
                    >
                      {categoryType.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text className="text-xs text-gray-500 mt-2">
                {type === 'income'
                  ? 'Money coming in (e.g., Salary, Side Income)'
                  : type === 'expense'
                  ? 'Money going out (e.g., Groceries, Rent, Utilities)'
                  : 'Money set aside for future goals (e.g., Emergency Fund, Vacation)'}
              </Text>
            </View>

            {/* Category Name */}
            <View className="mb-4">
              <Text className="text-gray-700 font-semibold mb-2">Category Name *</Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 bg-white"
                value={name}
                onChangeText={setName}
                placeholder={
                  type === 'income'
                    ? 'e.g., Salary'
                    : type === 'expense'
                    ? 'e.g., Groceries'
                    : 'e.g., Emergency Fund'
                }
                autoCapitalize="words"
              />
            </View>

            {/* Allocated Amount */}
            <View>
              <Text className="text-gray-700 font-semibold mb-2">
                {type === 'income' ? 'Expected Amount *' : 'Allocated Amount *'}
              </Text>
              <View className="flex-row items-center border border-gray-300 rounded-lg bg-white">
                <Text className="text-gray-500 text-lg px-4">$</Text>
                <TextInput
                  className="flex-1 py-3 pr-4"
                  value={allocatedAmount}
                  onChangeText={setAllocatedAmount}
                  onBlur={() => {
                    if (allocatedAmount) {
                      setAllocatedAmount(formatCurrencyInput(allocatedAmount));
                    }
                  }}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                />
              </View>
              <Text className="text-xs text-gray-500 mt-1">
                {type === 'income'
                  ? 'How much income do you expect?'
                  : type === 'expense'
                  ? 'How much do you plan to spend?'
                  : 'How much do you want to save?'}
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
