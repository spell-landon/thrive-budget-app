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
  Modal,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { getAccounts } from '../services/accounts';
import { createTransaction } from '../services/transactions';
import {
  getOrCreateCurrentMonthBudget,
  getBudgetCategories,
} from '../services/budgets';
import {
  createSubscription,
  calculateNextBillingDate,
} from '../services/subscriptions';
import { parseCurrencyInput, formatCurrencyInput } from '../utils/currency';
import { formatDateToLocalString } from '../utils/date';
import DateTimePicker from '@react-native-community/datetimepicker';
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
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [isSubscription, setIsSubscription] = useState(false);
  const [subscriptionFrequency, setSubscriptionFrequency] = useState<
    'weekly' | 'monthly' | 'quarterly' | 'yearly'
  >('monthly');

  useEffect(() => {
    loadAccounts();
    loadCategories();
  }, []);

  // Pass the submit handler to navigation params for the header button
  useEffect(() => {
    navigation.setParams({
      handleSubmit,
      loading,
      hasAccounts: accounts.length > 0,
    });
  }, [loading, accounts.length, amount, description, selectedAccountId, type, date, isSubscription, subscriptionFrequency, selectedCategoryId]);

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
      const expenseCategories = data.filter(
        (c) => c.category_type === 'expense'
      );
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
      let subscriptionId: string | undefined = undefined;

      // Create subscription if toggle is enabled
      if (isSubscription) {
        const nextBillingDate = calculateNextBillingDate(
          date,
          subscriptionFrequency
        );

        const subscription = await createSubscription(user.id, {
          name: description.trim(),
          amount: amountInCents,
          frequency: subscriptionFrequency,
          category_id: selectedCategoryId || undefined,
          next_billing_date: formatDateToLocalString(nextBillingDate),
          reminder_days_before: 3,
          auto_pay: false,
          auto_populate_budget: true,
          notes: undefined,
        });

        subscriptionId = subscription.id;
      }

      // Create transaction
      await createTransaction(user.id, {
        account_id: selectedAccountId,
        amount: amountInCents,
        description: description.trim(),
        type,
        date: formatDateToLocalString(date),
        category_id: selectedCategoryId || undefined,
        subscription_id: subscriptionId,
      });

      const successMessage = isSubscription
        ? 'Transaction and subscription added successfully!'
        : 'Transaction added successfully!';

      Alert.alert('Success', successMessage);
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedAccount = accounts.find((acc) => acc.id === selectedAccountId);

  return (
    <SafeAreaView className='flex-1 bg-gray-50' edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className='flex-1'>
        <ScrollView className='flex-1'>
          <View className='p-6'>
            {/* Transaction Type */}
            <View className='mb-4'>
              <Text className='text-gray-700 font-semibold mb-2'>Type *</Text>
              <View className='flex-row gap-2'>
                <TouchableOpacity
                  onPress={() => setType('income')}
                  className={`flex-1 flex-row items-center justify-center px-4 py-3 rounded-lg border ${
                    type === 'income'
                      ? 'bg-green-100 border-green-500'
                      : 'bg-white border-gray-300'
                  }`}>
                  <Ionicons
                    name='arrow-down'
                    size={20}
                    color={type === 'income' ? '#16a34a' : '#6b7280'}
                  />
                  <Text
                    className={`ml-2 ${
                      type === 'income'
                        ? 'text-green-700 font-semibold'
                        : 'text-gray-700'
                    }`}>
                    Income
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setType('expense')}
                  className={`flex-1 flex-row items-center justify-center px-4 py-3 rounded-lg border ${
                    type === 'expense'
                      ? 'bg-red-100 border-red-500'
                      : 'bg-white border-gray-300'
                  }`}>
                  <Ionicons
                    name='arrow-up'
                    size={20}
                    color={type === 'expense' ? '#dc2626' : '#6b7280'}
                  />
                  <Text
                    className={`ml-2 ${
                      type === 'expense'
                        ? 'text-red-700 font-semibold'
                        : 'text-gray-700'
                    }`}>
                    Expense
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Account Selection */}
            <View className='mb-4'>
              <Text className='text-gray-700 font-semibold mb-2'>
                Account *
              </Text>
              {loadingAccounts ? (
                <Text className='text-gray-500'>Loading accounts...</Text>
              ) : accounts.length === 0 ? (
                <View className='bg-yellow-50 border border-yellow-300 rounded-lg p-4'>
                  <Text className='text-yellow-800'>
                    No accounts found. Please add an account first.
                  </Text>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('AddAccount')}
                    className='bg-yellow-600 px-4 py-2 rounded-lg mt-2'>
                    <Text className='text-white font-semibold text-center'>
                      Add Account
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate('SelectAccount', {
                      selectedAccountId,
                      onSelect: (accountId: string) =>
                        setSelectedAccountId(accountId),
                    })
                  }
                  className='border border-gray-300 rounded-lg px-4 py-3 bg-white flex-row items-center justify-between'>
                  <View className='flex-row items-center flex-1'>
                    {selectedAccount ? (
                      <>
                        <Ionicons
                          name='wallet-outline'
                          size={20}
                          color='#FF6B35'
                        />
                        <Text className='ml-2 text-gray-800'>
                          {selectedAccount.name}
                        </Text>
                      </>
                    ) : (
                      <Text className='text-gray-400'>Select account</Text>
                    )}
                  </View>
                  <Ionicons name='chevron-down' size={20} color='#9ca3af' />
                </TouchableOpacity>
              )}
            </View>

            {/* Category Selection (Only for Expenses) */}
            {type === 'expense' && (
              <View className='mb-4'>
                <Text className='text-gray-700 font-semibold mb-2'>
                  Category (Optional)
                </Text>
                {loadingCategories ? (
                  <Text className='text-gray-500'>Loading categories...</Text>
                ) : categories.length === 0 ? (
                  <View className='bg-blue-50 border border-blue-300 rounded-lg p-4'>
                    <Text className='text-blue-800 text-sm mb-2'>
                      No expense categories yet. Create categories in your
                      budget to track spending!
                    </Text>
                    <TouchableOpacity
                      onPress={() => navigation.navigate('Budget')}
                      className='bg-blue-600 px-4 py-2 rounded-lg'>
                      <Text className='text-white font-semibold text-center text-sm'>
                        Go to Budget
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <TouchableOpacity
                      onPress={() =>
                        navigation.navigate('SelectCategory', {
                          selectedCategoryId,
                          filterType: 'expense',
                          onSelect: (categoryId: string | null) =>
                            setSelectedCategoryId(categoryId || ''),
                        })
                      }
                      className='border border-gray-300 rounded-lg px-4 py-3 bg-white flex-row items-center justify-between'>
                      <View className='flex-row items-center flex-1'>
                        {selectedCategoryId ? (
                          <>
                            <Ionicons
                              name='pricetag-outline'
                              size={20}
                              color='#FF6B35'
                            />
                            <Text className='ml-2 text-gray-800'>
                              {
                                categories.find(
                                  (c) => c.id === selectedCategoryId
                                )?.name
                              }
                            </Text>
                          </>
                        ) : (
                          <Text className='text-gray-400'>No category</Text>
                        )}
                      </View>
                      <Ionicons name='chevron-down' size={20} color='#9ca3af' />
                    </TouchableOpacity>
                    <Text className='text-xs text-gray-500 mt-2'>
                      Select a category to track this expense against your
                      budget
                    </Text>
                  </>
                )}
              </View>
            )}

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
                placeholder='e.g., Grocery shopping'
                autoCapitalize='sentences'
              />
            </View>

            {/* Date */}
            <View className='mb-4'>
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

            {/* Subscription Toggle */}
            <View className='mb-4'>
              <View className='flex-row items-center justify-between bg-white border border-gray-300 rounded-lg px-4 py-3'>
                <View className='flex-row items-center flex-1'>
                  <Ionicons name='repeat-outline' size={20} color='#FF6B35' />
                  <View className='ml-3 flex-1'>
                    <Text className='text-gray-800 font-semibold'>
                      Recurring Subscription
                    </Text>
                    <Text className='text-xs text-gray-500 mt-0.5'>
                      Track as a recurring payment
                    </Text>
                  </View>
                </View>
                <Switch
                  value={isSubscription}
                  onValueChange={setIsSubscription}
                  trackColor={{ false: '#d1d5db', true: '#FF6B35' }}
                  thumbColor={isSubscription ? '#ffffff' : '#f3f4f6'}
                />
              </View>
            </View>

            {/* Subscription Frequency */}
            {isSubscription && (
              <View className='mb-4'>
                <Text className='text-gray-700 font-semibold mb-2'>
                  Billing Frequency *
                </Text>
                <View className='flex-row gap-2'>
                  <TouchableOpacity
                    onPress={() => setSubscriptionFrequency('weekly')}
                    className={`flex-1 px-3 py-3 rounded-lg border ${
                      subscriptionFrequency === 'weekly'
                        ? 'bg-primary-100 border-primary-500'
                        : 'bg-white border-gray-300'
                    }`}>
                    <Text
                      className={`text-center text-sm font-semibold ${
                        subscriptionFrequency === 'weekly'
                          ? 'text-primary-700'
                          : 'text-gray-700'
                      }`}>
                      Weekly
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setSubscriptionFrequency('monthly')}
                    className={`flex-1 px-3 py-3 rounded-lg border ${
                      subscriptionFrequency === 'monthly'
                        ? 'bg-primary-100 border-primary-500'
                        : 'bg-white border-gray-300'
                    }`}>
                    <Text
                      className={`text-center text-sm font-semibold ${
                        subscriptionFrequency === 'monthly'
                          ? 'text-primary-700'
                          : 'text-gray-700'
                      }`}>
                      Monthly
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setSubscriptionFrequency('quarterly')}
                    className={`flex-1 px-3 py-3 rounded-lg border ${
                      subscriptionFrequency === 'quarterly'
                        ? 'bg-primary-100 border-primary-500'
                        : 'bg-white border-gray-300'
                    }`}>
                    <Text
                      className={`text-center text-sm font-semibold ${
                        subscriptionFrequency === 'quarterly'
                          ? 'text-primary-700'
                          : 'text-gray-700'
                      }`}>
                      Quarterly
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setSubscriptionFrequency('yearly')}
                    className={`flex-1 px-3 py-3 rounded-lg border ${
                      subscriptionFrequency === 'yearly'
                        ? 'bg-primary-100 border-primary-500'
                        : 'bg-white border-gray-300'
                    }`}>
                    <Text
                      className={`text-center text-sm font-semibold ${
                        subscriptionFrequency === 'yearly'
                          ? 'text-primary-700'
                          : 'text-gray-700'
                      }`}>
                      Yearly
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Date Picker */}
        {showDatePicker && Platform.OS === 'android' && (
          <DateTimePicker
            value={date}
            mode='date'
            display='calendar'
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (event.type === 'set' && selectedDate) {
                setDate(selectedDate);
              }
            }}
          />
        )}

        {/* Date Picker Modal for iOS */}
        {Platform.OS === 'ios' && (
          <Modal
            visible={showDatePicker}
            transparent
            animationType='slide'
            onRequestClose={() => setShowDatePicker(false)}>
            <View className='flex-1 bg-black/50 justify-end'>
              <View className='bg-white rounded-t-3xl pb-8'>
                <View className='flex-row items-center justify-between px-6 py-4 border-b border-gray-200'>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text className='text-base font-semibold text-gray-600'>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <Text className='text-lg font-bold text-gray-800'>
                    Select Date
                  </Text>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text className='text-base font-semibold text-primary'>
                      Done
                    </Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={date}
                  mode='date'
                  display='inline'
                  style={{ marginLeft: 'auto', marginRight: 'auto' }}
                  onChange={(event, selectedDate) => {
                    if (selectedDate) {
                      setDate(selectedDate);
                    }
                  }}
                />
              </View>
            </View>
          </Modal>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
