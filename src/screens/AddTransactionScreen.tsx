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
import { getAccounts } from '../services/accounts';
import { createTransaction } from '../services/transactions';
import { getOrCreateCurrentMonthBudget, getBudgetCategories } from '../services/budgets';
import { parseCurrencyInput } from '../utils/currency';
import { Account, BudgetCategory } from '../types';

type TransactionType = 'income' | 'expense';

export default function AddTransactionScreen({ navigation }: any) {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD
  const [loading, setLoading] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);

  useEffect(() => {
    loadAccounts();
    loadCategories();
  }, []);

  const loadAccounts = async () => {
    if (!user) return;

    try {
      const data = await getAccounts(user.id);
      setAccounts(data);
      if (data.length > 0) {
        setSelectedAccountId(data[0].id);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const loadCategories = async () => {
    if (!user) return;

    try {
      const budget = await getOrCreateCurrentMonthBudget(user.id);
      const data = await getBudgetCategories(budget.id);
      // Only show expense categories for categorizing transactions
      const expenseCategories = data.filter((c) => c.category_type === 'expense');
      setCategories(expenseCategories);
    } catch (error: any) {
      console.error('Error loading categories:', error);
      // Don't show error alert, categories are optional
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;

    if (!selectedAccountId) {
      Alert.alert('Error', 'Please select an account');
      return;
    }

    if (!amount.trim()) {
      Alert.alert('Error', 'Please enter an amount');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }

    setLoading(true);

    try {
      const amountInCents = parseCurrencyInput(amount);

      await createTransaction(user.id, {
        account_id: selectedAccountId,
        amount: amountInCents,
        description: description.trim(),
        type,
        date,
        category_id: selectedCategoryId || undefined,
      });

      Alert.alert('Success', 'Transaction added successfully!');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedAccount = accounts.find((acc) => acc.id === selectedAccountId);

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-row items-center px-6 py-4 bg-white border-b border-gray-200">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-800">Add Transaction</Text>
        </View>

        <ScrollView className="flex-1">
          <View className="p-6">
            {/* Transaction Type */}
            <View className="mb-4">
              <Text className="text-gray-700 font-semibold mb-2">Type *</Text>
              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={() => setType('income')}
                  className={`flex-1 flex-row items-center justify-center px-4 py-3 rounded-lg border ${
                    type === 'income'
                      ? 'bg-green-100 border-green-500'
                      : 'bg-white border-gray-300'
                  }`}
                >
                  <Ionicons
                    name="arrow-down"
                    size={20}
                    color={type === 'income' ? '#16a34a' : '#6b7280'}
                  />
                  <Text
                    className={`ml-2 ${
                      type === 'income' ? 'text-green-700 font-semibold' : 'text-gray-700'
                    }`}
                  >
                    Income
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setType('expense')}
                  className={`flex-1 flex-row items-center justify-center px-4 py-3 rounded-lg border ${
                    type === 'expense'
                      ? 'bg-red-100 border-red-500'
                      : 'bg-white border-gray-300'
                  }`}
                >
                  <Ionicons
                    name="arrow-up"
                    size={20}
                    color={type === 'expense' ? '#dc2626' : '#6b7280'}
                  />
                  <Text
                    className={`ml-2 ${
                      type === 'expense' ? 'text-red-700 font-semibold' : 'text-gray-700'
                    }`}
                  >
                    Expense
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Account Selection */}
            <View className="mb-4">
              <Text className="text-gray-700 font-semibold mb-2">Account *</Text>
              {loadingAccounts ? (
                <Text className="text-gray-500">Loading accounts...</Text>
              ) : accounts.length === 0 ? (
                <View className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
                  <Text className="text-yellow-800">
                    No accounts found. Please add an account first.
                  </Text>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('AddAccount')}
                    className="bg-yellow-600 px-4 py-2 rounded-lg mt-2"
                  >
                    <Text className="text-white font-semibold text-center">Add Account</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View className="flex-row gap-2">
                    {accounts.map((account) => (
                      <TouchableOpacity
                        key={account.id}
                        onPress={() => setSelectedAccountId(account.id)}
                        className={`px-4 py-3 rounded-lg border ${
                          selectedAccountId === account.id
                            ? 'bg-blue-100 border-blue-500'
                            : 'bg-white border-gray-300'
                        }`}
                      >
                        <Text
                          className={`${
                            selectedAccountId === account.id
                              ? 'text-blue-700 font-semibold'
                              : 'text-gray-700'
                          }`}
                        >
                          {account.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              )}
            </View>

            {/* Category Selection (Only for Expenses) */}
            {type === 'expense' && (
              <View className="mb-4">
                <Text className="text-gray-700 font-semibold mb-2">
                  Category (Optional)
                </Text>
                {loadingCategories ? (
                  <Text className="text-gray-500">Loading categories...</Text>
                ) : categories.length === 0 ? (
                  <View className="bg-blue-50 border border-blue-300 rounded-lg p-4">
                    <Text className="text-blue-800 text-sm mb-2">
                      No expense categories yet. Create categories in your budget to track spending!
                    </Text>
                    <TouchableOpacity
                      onPress={() => navigation.navigate('Budget')}
                      className="bg-blue-600 px-4 py-2 rounded-lg"
                    >
                      <Text className="text-white font-semibold text-center text-sm">
                        Go to Budget
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View className="flex-row gap-2">
                      <TouchableOpacity
                        onPress={() => setSelectedCategoryId('')}
                        className={`px-4 py-3 rounded-lg border ${
                          !selectedCategoryId
                            ? 'bg-gray-200 border-gray-400'
                            : 'bg-white border-gray-300'
                        }`}
                      >
                        <Text
                          className={`${
                            !selectedCategoryId
                              ? 'text-gray-800 font-semibold'
                              : 'text-gray-600'
                          }`}
                        >
                          None
                        </Text>
                      </TouchableOpacity>
                      {categories.map((category) => (
                        <TouchableOpacity
                          key={category.id}
                          onPress={() => setSelectedCategoryId(category.id)}
                          className={`px-4 py-3 rounded-lg border ${
                            selectedCategoryId === category.id
                              ? 'bg-blue-100 border-blue-500'
                              : 'bg-white border-gray-300'
                          }`}
                        >
                          <Text
                            className={`${
                              selectedCategoryId === category.id
                                ? 'text-blue-700 font-semibold'
                                : 'text-gray-700'
                            }`}
                          >
                            {category.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                )}
                {categories.length > 0 && (
                  <Text className="text-xs text-gray-500 mt-2">
                    Select a category to track this expense against your budget
                  </Text>
                )}
              </View>
            )}

            {/* Amount */}
            <View className="mb-4">
              <Text className="text-gray-700 font-semibold mb-2">Amount *</Text>
              <View className="flex-row items-center border border-gray-300 rounded-lg bg-white">
                <Text className="text-gray-500 text-lg px-4">$</Text>
                <TextInput
                  className="flex-1 py-3 pr-4"
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            {/* Description */}
            <View className="mb-4">
              <Text className="text-gray-700 font-semibold mb-2">Description *</Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 bg-white"
                value={description}
                onChangeText={setDescription}
                placeholder="e.g., Grocery shopping"
                autoCapitalize="sentences"
              />
            </View>

            {/* Date */}
            <View className="mb-6">
              <Text className="text-gray-700 font-semibold mb-2">Date *</Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 bg-white"
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
              />
              <Text className="text-xs text-gray-500 mt-1">Format: YYYY-MM-DD (e.g., 2024-10-31)</Text>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading || accounts.length === 0}
              className={`rounded-lg py-4 ${
                loading || accounts.length === 0 ? 'bg-blue-400' : 'bg-blue-600'
              }`}
            >
              <Text className="text-white text-center font-semibold text-lg">
                {loading ? 'Adding...' : 'Add Transaction'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
