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
  Switch,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../contexts/AuthContext';
import { createSubscription } from '../services/subscriptions';
import {
  getOrCreateCurrentMonthBudget,
  getBudgetCategories,
} from '../services/budgets';
import { parseCurrencyInput, formatCurrencyInput } from '../utils/currency';
import { formatDateToLocalString } from '../utils/date';
import { BudgetCategory } from '../types';

type FrequencyType = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export default function AddSubscriptionScreen({ navigation }: any) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<FrequencyType>('monthly');
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [nextBillingDate, setNextBillingDate] = useState(new Date());
  const [reminderDays, setReminderDays] = useState('3');
  const [autoPay, setAutoPay] = useState(false);
  const [autoPopulateBudget, setAutoPopulateBudget] = useState(false);
  const [notes, setNotes] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<BudgetCategory[]>([]);

  useEffect(() => {
    loadCategories();
  }, []);

  // Pass submit handler to navigation params for header button
  useEffect(() => {
    navigation.setParams({
      handleSubmit,
      loading,
    });
  }, [loading]);

  const loadCategories = async () => {
    if (!user) return;

    try {
      const budget = await getOrCreateCurrentMonthBudget(user.id);
      const categoriesData = await getBudgetCategories(budget.id);
      // Filter to only expense categories
      setCategories(
        categoriesData.filter((c) => c.category_type === 'expense')
      );
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const frequencies: {
    value: FrequencyType;
    label: string;
    icon: string;
    description: string;
  }[] = [
    {
      value: 'weekly',
      label: 'Weekly',
      icon: 'calendar-outline',
      description: 'Every 7 days',
    },
    {
      value: 'monthly',
      label: 'Monthly',
      icon: 'calendar',
      description: 'Once per month',
    },
    {
      value: 'quarterly',
      label: 'Quarterly',
      icon: 'calendar-sharp',
      description: 'Every 3 months',
    },
    {
      value: 'yearly',
      label: 'Yearly',
      icon: 'calendar-number-outline',
      description: 'Once per year',
    },
  ];

  const getCategoryName = (catId?: string) => {
    if (!catId) return 'None';
    const category = categories.find((cat) => cat.id === catId);
    return category?.name || 'None';
  };

  const handleSubmit = async () => {
    if (!user) return;

    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a subscription name');
      return;
    }

    if (!amount.trim()) {
      Alert.alert('Error', 'Please enter an amount');
      return;
    }

    const reminderDaysNum = parseInt(reminderDays);
    if (isNaN(reminderDaysNum) || reminderDaysNum < 0) {
      Alert.alert('Error', 'Please enter a valid number of reminder days');
      return;
    }

    setLoading(true);

    try {
      const amountInCents = parseCurrencyInput(amount);

      await createSubscription(user.id, {
        name: name.trim(),
        amount: amountInCents,
        frequency,
        category_id: categoryId,
        next_billing_date: formatDateToLocalString(nextBillingDate),
        reminder_days_before: reminderDaysNum,
        auto_pay: autoPay,
        auto_populate_budget: autoPopulateBudget,
        notes: notes.trim() || undefined,
      });

      Alert.alert('Success', 'Subscription created successfully!');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className='flex-1 bg-gray-50' edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className='flex-1'>
        <ScrollView className='flex-1'>
          <View className='p-6'>
            {/* Subscription Name */}
            <View className='mb-4'>
              <Text className='text-gray-700 font-semibold mb-2'>
                Subscription Name *
              </Text>
              <TextInput
                className='border border-gray-300 rounded-lg px-4 py-3 bg-white'
                value={name}
                onChangeText={setName}
                placeholder='e.g., Netflix, Spotify, Gym'
                autoCapitalize='words'
              />
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

            {/* Frequency */}
            <View className='mb-4'>
              <Text className='text-gray-700 font-semibold mb-2'>
                Billing Frequency *
              </Text>
              <View className='gap-2'>
                {frequencies.map((freq) => (
                  <TouchableOpacity
                    key={freq.value}
                    onPress={() => setFrequency(freq.value)}
                    className={`flex-row items-center justify-between px-4 py-3 rounded-lg border ${
                      frequency === freq.value
                        ? 'bg-primary-100 border-primary-500'
                        : 'bg-white border-gray-300'
                    }`}>
                    <View className='flex-row items-center flex-1'>
                      <Ionicons
                        name={freq.icon as any}
                        size={20}
                        color={frequency === freq.value ? '#C93B00' : '#6b7280'}
                      />
                      <View className='ml-3 flex-1'>
                        <Text
                          className={`text-base font-semibold ${
                            frequency === freq.value
                              ? 'text-primary-700'
                              : 'text-gray-800'
                          }`}>
                          {freq.label}
                        </Text>
                        <Text className='text-xs text-gray-500'>
                          {freq.description}
                        </Text>
                      </View>
                    </View>
                    {frequency === freq.value && (
                      <Ionicons
                        name='checkmark-circle'
                        size={22}
                        color='#C93B00'
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Category Selection */}
            <View className='mb-4'>
              <Text className='text-gray-700 font-semibold mb-2'>
                Budget Category (Optional)
              </Text>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('SelectCategory', {
                    selectedCategoryId: categoryId,
                    filterType: 'expense',
                    onSelect: (selectedId: string | null) =>
                      setCategoryId(selectedId || undefined),
                  })
                }
                className='border border-gray-300 rounded-lg px-4 py-3 bg-white flex-row items-center justify-between'>
                <Text
                  className={categoryId ? 'text-gray-800' : 'text-gray-500'}>
                  {getCategoryName(categoryId)}
                </Text>
                <Ionicons name='chevron-down' size={20} color='#6b7280' />
              </TouchableOpacity>
            </View>

            {/* Next Billing Date */}
            <View className='mb-4'>
              <Text className='text-gray-700 font-semibold mb-2'>
                Next Billing Date *
              </Text>
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                className='border border-gray-300 rounded-lg px-4 py-3 bg-white flex-row items-center justify-between'>
                <Text className='text-gray-800'>
                  {nextBillingDate.toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
                <Ionicons name='calendar-outline' size={20} color='#6b7280' />
              </TouchableOpacity>
            </View>

            {/* Reminder Days */}
            <View className='mb-4'>
              <Text className='text-gray-700 font-semibold mb-2'>
                Remind Me (Days Before)
              </Text>
              <TextInput
                className='border border-gray-300 rounded-lg px-4 py-3 bg-white'
                value={reminderDays}
                onChangeText={setReminderDays}
                placeholder='3'
                keyboardType='number-pad'
              />
              <Text className='text-xs text-gray-500 mt-1'>
                You'll see a reminder {reminderDays} day
                {reminderDays !== '1' ? 's' : ''} before billing
              </Text>
            </View>

            {/* Auto-pay Toggle */}
            <View className='flex-row items-center justify-between mb-4'>
              <View className='flex-1 mr-4'>
                <Text className='text-gray-700 font-semibold mb-1'>
                  Auto-pay Enabled
                </Text>
                <Text className='text-xs text-gray-500'>
                  Does this subscription automatically charge your account?
                </Text>
              </View>
              <Switch
                value={autoPay}
                onValueChange={setAutoPay}
                trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                thumbColor={autoPay ? '#2563eb' : '#f3f4f6'}
              />
            </View>

            {/* Auto-populate Budget Toggle */}
            {categoryId && (
              <View className='flex-row items-center justify-between mb-4'>
                <View className='flex-1 mr-4'>
                  <Text className='text-gray-700 font-semibold mb-1'>
                    Auto-populate Budget
                  </Text>
                  <Text className='text-xs text-gray-500'>
                    Automatically set the category budget to match this subscription amount each month
                  </Text>
                </View>
                <Switch
                  value={autoPopulateBudget}
                  onValueChange={setAutoPopulateBudget}
                  trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                  thumbColor={autoPopulateBudget ? '#2563eb' : '#f3f4f6'}
                />
              </View>
            )}

            {/* Notes */}
            <View>
              <Text className='text-gray-700 font-semibold mb-2'>
                Notes (Optional)
              </Text>
              <TextInput
                className='border border-gray-300 rounded-lg px-4 py-3 bg-white'
                value={notes}
                onChangeText={setNotes}
                placeholder='Any additional details...'
                multiline
                numberOfLines={3}
                textAlignVertical='top'
              />
            </View>
          </View>
        </ScrollView>

        {/* Date Picker */}
        {showDatePicker && Platform.OS === 'android' && (
          <DateTimePicker
            value={nextBillingDate}
            mode='date'
            display='calendar'
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (event.type === 'set' && selectedDate) {
                setNextBillingDate(selectedDate);
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
                  value={nextBillingDate}
                  mode='date'
                  display='inline'
                  style={{ marginLeft: 'auto', marginRight: 'auto' }}
                  onChange={(event, selectedDate) => {
                    if (selectedDate) {
                      setNextBillingDate(selectedDate);
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
