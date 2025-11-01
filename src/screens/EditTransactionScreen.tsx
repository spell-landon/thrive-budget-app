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
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../contexts/AuthContext';
import {
  getTransactionById,
  updateTransaction,
} from '../services/transactions';
import { getAccounts } from '../services/accounts';
import {
  getOrCreateCurrentMonthBudget,
  getBudgetCategories,
} from '../services/budgets';
import {
  centsToInputValue,
  parseCurrencyInput,
  formatCurrencyInput,
} from '../utils/currency';
import { Account, BudgetCategory } from '../types';

export default function EditTransactionScreen({ route, navigation }: any) {
  const { user } = useAuth();
  const { transactionId } = route.params;
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(
    undefined
  );
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'income' | 'expense' | 'transfer'>(
    'expense'
  );
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [transactionId]);

  const loadData = async () => {
    if (!user) return;

    try {
      const [transaction, accountsData, budget] = await Promise.all([
        getTransactionById(transactionId),
        getAccounts(user.id),
        getOrCreateCurrentMonthBudget(user.id),
      ]);

      setAccounts(accountsData);
      setSelectedAccount(transaction.account_id);
      setSelectedCategory(transaction.category_id);
      setAmount(centsToInputValue(transaction.amount));
      setDescription(transaction.description);
      setType(transaction.type);
      setDate(new Date(transaction.date));

      const categoriesData = await getBudgetCategories(budget.id);
      setCategories(categoriesData);
    } catch (error: any) {
      Alert.alert('Error', error.message);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;

    if (!selectedAccount) {
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

    setSaving(true);

    try {
      const amountInCents = parseCurrencyInput(amount);

      await updateTransaction(transactionId, {
        account_id: selectedAccount,
        category_id: selectedCategory,
        amount: amountInCents,
        description: description.trim(),
        type,
        date: date.toISOString().split('T')[0],
      });

      Alert.alert('Success', 'Transaction updated successfully!');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  const getAccountName = (accountId: string) => {
    const account = accounts.find((acc) => acc.id === accountId);
    return account?.name || 'Select Account';
  };

  const getCategoryName = (categoryId?: string) => {
    if (!categoryId) return 'None';
    const category = categories.find((cat) => cat.id === categoryId);
    return category?.name || 'None';
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

  return (
    <SafeAreaView className='flex-1 bg-gray-50' edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className='flex-1'>
        {/* Header */}
        <View className='flex-row items-center justify-between px-6 py-4 bg-white border-b border-gray-200'>
          <View className='flex-row items-center'>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              className='mr-4'>
              <Ionicons name='arrow-back' size={24} color='#1f2937' />
            </TouchableOpacity>
            <Text className='text-xl font-bold text-gray-800'>
              Edit Transaction
            </Text>
          </View>
          <TouchableOpacity onPress={handleSubmit} disabled={saving}>
            <Text
              className={`text-base font-semibold ${
                saving ? 'text-gray-400' : 'text-blue-600'
              }`}>
              {saving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView className='flex-1'>
          <View className='p-6'>
            {/* Transaction Type */}
            <View className='mb-4'>
              <Text className='text-gray-700 font-semibold mb-2'>
                Transaction Type *
              </Text>
              <View className='flex-row gap-2'>
                <TouchableOpacity
                  onPress={() => setType('expense')}
                  className={`flex-1 px-4 py-3 rounded-lg border ${
                    type === 'expense'
                      ? 'bg-red-100 border-red-500'
                      : 'bg-white border-gray-300'
                  }`}>
                  <Text
                    className={`text-center font-semibold ${
                      type === 'expense' ? 'text-red-700' : 'text-gray-700'
                    }`}>
                    Expense
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setType('income')}
                  className={`flex-1 px-4 py-3 rounded-lg border ${
                    type === 'income'
                      ? 'bg-green-100 border-green-500'
                      : 'bg-white border-gray-300'
                  }`}>
                  <Text
                    className={`text-center font-semibold ${
                      type === 'income' ? 'text-green-700' : 'text-gray-700'
                    }`}>
                    Income
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Account Dropdown */}
            <View className='mb-4'>
              <Text className='text-gray-700 font-semibold mb-2'>
                Account *
              </Text>
              <TouchableOpacity
                onPress={() => setShowAccountDropdown(!showAccountDropdown)}
                className='border border-gray-300 rounded-lg px-4 py-3 bg-white flex-row items-center justify-between'>
                <Text className='text-gray-800'>
                  {getAccountName(selectedAccount)}
                </Text>
                <Ionicons
                  name={showAccountDropdown ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color='#6b7280'
                />
              </TouchableOpacity>
              {showAccountDropdown && (
                <View className='border border-gray-300 rounded-lg bg-white mt-1 max-h-48'>
                  <ScrollView>
                    {accounts.map((account, index) => (
                      <TouchableOpacity
                        key={account.id}
                        onPress={() => {
                          setSelectedAccount(account.id);
                          setShowAccountDropdown(false);
                        }}
                        className={`flex-row items-center justify-between px-4 py-3 ${
                          index !== accounts.length - 1
                            ? 'border-b border-gray-200'
                            : ''
                        }`}>
                        <Text className='text-gray-800'>{account.name}</Text>
                        {selectedAccount === account.id && (
                          <Ionicons
                            name='checkmark-circle'
                            size={20}
                            color='#2563eb'
                          />
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Category Dropdown */}
            <View className='mb-4'>
              <Text className='text-gray-700 font-semibold mb-2'>
                Category (Optional)
              </Text>
              <TouchableOpacity
                onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
                className='border border-gray-300 rounded-lg px-4 py-3 bg-white flex-row items-center justify-between'>
                <Text
                  className={
                    selectedCategory ? 'text-gray-800' : 'text-gray-500'
                  }>
                  {getCategoryName(selectedCategory)}
                </Text>
                <Ionicons
                  name={showCategoryDropdown ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color='#6b7280'
                />
              </TouchableOpacity>
              {showCategoryDropdown && (
                <View className='border border-gray-300 rounded-lg bg-white mt-1 max-h-48'>
                  <ScrollView>
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedCategory(undefined);
                        setShowCategoryDropdown(false);
                      }}
                      className='flex-row items-center justify-between px-4 py-3 border-b border-gray-200'>
                      <Text className='text-gray-500'>None</Text>
                      {!selectedCategory && (
                        <Ionicons
                          name='checkmark-circle'
                          size={20}
                          color='#2563eb'
                        />
                      )}
                    </TouchableOpacity>
                    {categories.map((category) => (
                      <TouchableOpacity
                        key={category.id}
                        onPress={() => {
                          setSelectedCategory(category.id);
                          setShowCategoryDropdown(false);
                        }}
                        className='flex-row items-center justify-between px-4 py-3 border-b border-gray-200'>
                        <Text className='text-gray-800'>{category.name}</Text>
                        {selectedCategory === category.id && (
                          <Ionicons
                            name='checkmark-circle'
                            size={20}
                            color='#2563eb'
                          />
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Amount */}
            <View className='mb-4'>
              <Text className='text-gray-700 font-semibold mb-2'>Amount *</Text>
              <View className='flex-row items-center border border-gray-300 rounded-lg bg-white'>
                <Text className='text-gray-500 text-lg px-4'>$</Text>
                <TextInput
                  className='flex-1 py-3 pr-4'
                  value={amount}
                  onChangeText={setAmount}
                  onBlur={() => {
                    if (amount) {
                      setAmount(formatCurrencyInput(amount));
                    }
                  }}
                  placeholder='0.00'
                  keyboardType='decimal-pad'
                />
              </View>
            </View>

            {/* Description */}
            <View className='mb-4'>
              <Text className='text-gray-700 font-semibold mb-2'>
                Description *
              </Text>
              <TextInput
                className='border border-gray-300 rounded-lg px-4 py-3 bg-white'
                value={description}
                onChangeText={setDescription}
                placeholder='What was this for?'
              />
            </View>

            {/* Date */}
            <View>
              <Text className='text-gray-700 font-semibold mb-2'>Date *</Text>
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                className='border border-gray-300 rounded-lg px-4 py-3 bg-white flex-row items-center justify-between'>
                <Text className='text-gray-800'>
                  {date.toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
                <Ionicons name='calendar-outline' size={20} color='#6b7280' />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* Date Picker Modal */}
        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode='date'
            display='default'
            onChange={(event, selectedDate) => {
              setShowDatePicker(Platform.OS === 'ios');
              if (selectedDate) {
                setDate(selectedDate);
              }
            }}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
