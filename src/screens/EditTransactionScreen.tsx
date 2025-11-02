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
  Modal,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../contexts/AuthContext';
import {
  getTransactionById,
  updateTransaction,
  deleteTransaction,
} from '../services/transactions';
import { getAccounts } from '../services/accounts';
import {
  getOrCreateCurrentMonthBudget,
  getBudgetCategories,
} from '../services/budgets';
import {
  getSubscriptionById,
  createSubscription,
  updateSubscription,
  deleteSubscription,
  calculateNextBillingDate,
} from '../services/subscriptions';
import {
  centsToInputValue,
  parseCurrencyInput,
  formatCurrencyInput,
} from '../utils/currency';
import { formatDateToLocalString, parseDateString } from '../utils/date';
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isSubscription, setIsSubscription] = useState(false);
  const [subscriptionFrequency, setSubscriptionFrequency] = useState<
    'weekly' | 'monthly' | 'quarterly' | 'yearly'
  >('monthly');
  const [originalSubscriptionId, setOriginalSubscriptionId] = useState<
    string | undefined
  >(undefined);

  useEffect(() => {
    loadData();
  }, [transactionId]);

  // Pass submit handler to navigation params for header button
  useEffect(() => {
    navigation.setParams({
      handleSubmit,
      loading: saving,
    });
  }, [saving]);

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
      setDate(parseDateString(transaction.date));

      // Load subscription data if transaction is linked to a subscription
      if (transaction.subscription_id) {
        try {
          const subscription = await getSubscriptionById(transaction.subscription_id);
          setIsSubscription(true);
          setSubscriptionFrequency(subscription.frequency);
          setOriginalSubscriptionId(transaction.subscription_id);
        } catch (error) {
          console.log('Error loading subscription:', error);
          // Continue even if subscription load fails
        }
      }

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
      let subscriptionId: string | undefined = originalSubscriptionId;

      // Handle subscription updates/creation/deletion
      if (isSubscription) {
        const nextBillingDate = calculateNextBillingDate(date, subscriptionFrequency);

        if (originalSubscriptionId) {
          // Update existing subscription
          await updateSubscription(originalSubscriptionId, {
            name: description.trim(),
            amount: amountInCents,
            frequency: subscriptionFrequency,
            category_id: selectedCategory || undefined,
            next_billing_date: formatDateToLocalString(nextBillingDate),
          });
        } else {
          // Create new subscription
          const subscription = await createSubscription(user.id, {
            name: description.trim(),
            amount: amountInCents,
            frequency: subscriptionFrequency,
            category_id: selectedCategory || undefined,
            next_billing_date: formatDateToLocalString(nextBillingDate),
            reminder_days_before: 3,
            auto_pay: false,
            auto_populate_budget: true,
            notes: undefined,
          });
          subscriptionId = subscription.id;
        }
      } else if (originalSubscriptionId) {
        // User toggled off subscription - delete it
        await deleteSubscription(originalSubscriptionId);
        subscriptionId = undefined;
      }

      // Update transaction
      await updateTransaction(transactionId, {
        account_id: selectedAccount,
        category_id: selectedCategory,
        amount: amountInCents,
        description: description.trim(),
        type,
        date: formatDateToLocalString(date),
        subscription_id: subscriptionId,
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

  const handleDelete = () => {
    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this transaction? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTransaction(transactionId);
              Alert.alert('Success', 'Transaction deleted successfully!');
              navigation.goBack();
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
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

  return (
    <SafeAreaView className='flex-1 bg-gray-50' edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className='flex-1'>
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

            {/* Account Selection */}
            <View className='mb-4'>
              <Text className='text-gray-700 font-semibold mb-2'>
                Account *
              </Text>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('SelectAccount', {
                    selectedAccountId: selectedAccount,
                    onSelect: (accountId: string) => setSelectedAccount(accountId),
                  })
                }
                className='border border-gray-300 rounded-lg px-4 py-3 bg-white flex-row items-center justify-between'>
                <Text className='text-gray-800'>
                  {getAccountName(selectedAccount)}
                </Text>
                <Ionicons name='chevron-down' size={20} color='#6b7280' />
              </TouchableOpacity>
            </View>

            {/* Category Selection */}
            <View className='mb-4'>
              <Text className='text-gray-700 font-semibold mb-2'>
                Category (Optional)
              </Text>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('SelectCategory', {
                    selectedCategoryId: selectedCategory,
                    onSelect: (categoryId: string | null) =>
                      setSelectedCategory(categoryId || undefined),
                  })
                }
                className='border border-gray-300 rounded-lg px-4 py-3 bg-white flex-row items-center justify-between'>
                <Text
                  className={
                    selectedCategory ? 'text-gray-800' : 'text-gray-500'
                  }>
                  {getCategoryName(selectedCategory)}
                </Text>
                <Ionicons name='chevron-down' size={20} color='#6b7280' />
              </TouchableOpacity>
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

            {/* Delete Transaction Button */}
            <View className='mt-6 pt-6 border-t border-gray-200'>
              <TouchableOpacity
                onPress={handleDelete}
                className='bg-error-600 px-6 py-3 rounded-lg flex-row items-center justify-center'>
                <Ionicons name='trash' size={20} color='white' />
                <Text className='text-white font-semibold ml-2'>
                  Delete Transaction
                </Text>
              </TouchableOpacity>
              <Text className='text-xs text-gray-500 text-center mt-2'>
                This will permanently delete this transaction and cannot be undone
              </Text>
            </View>
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
            onRequestClose={() => setShowDatePicker(false)}
          >
            <View className='flex-1 bg-black/50 justify-end'>
              <View className='bg-white rounded-t-3xl pb-8'>
                <View className='flex-row items-center justify-between px-6 py-4 border-b border-gray-200'>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text className='text-base font-semibold text-gray-600'>Cancel</Text>
                  </TouchableOpacity>
                  <Text className='text-lg font-bold text-gray-800'>Select Date</Text>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text className='text-base font-semibold text-primary'>Done</Text>
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
