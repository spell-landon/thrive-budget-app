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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../contexts/AuthContext';
import { createSubscription } from '../services/subscriptions';
import { getOrCreateCurrentMonthBudget, getBudgetCategories } from '../services/budgets';
import { parseCurrencyInput } from '../utils/currency';
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
  const [notes, setNotes] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<BudgetCategory[]>([]);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    if (!user) return;

    try {
      const budget = await getOrCreateCurrentMonthBudget(user.id);
      const categoriesData = await getBudgetCategories(budget.id);
      // Filter to only expense categories
      setCategories(categoriesData.filter((c) => c.category_type === 'expense'));
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const frequencies: { value: FrequencyType; label: string; icon: string; description: string }[] =
    [
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
        next_billing_date: nextBillingDate.toISOString().split('T')[0],
        reminder_days_before: reminderDaysNum,
        auto_pay: autoPay,
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
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* Header */}
        <View className="flex-row items-center px-6 py-4 bg-white border-b border-gray-200">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-800">Add Subscription</Text>
        </View>

        <ScrollView className="flex-1">
          <View className="p-6">
            {/* Subscription Name */}
            <View className="mb-4">
              <Text className="text-gray-700 font-semibold mb-2">Subscription Name *</Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 bg-white"
                value={name}
                onChangeText={setName}
                placeholder="e.g., Netflix, Spotify, Gym"
                autoCapitalize="words"
              />
            </View>

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

            {/* Frequency */}
            <View className="mb-4">
              <Text className="text-gray-700 font-semibold mb-2">Billing Frequency *</Text>
              <View className="gap-2">
                {frequencies.map((freq) => (
                  <TouchableOpacity
                    key={freq.value}
                    onPress={() => setFrequency(freq.value)}
                    className={`flex-row items-center justify-between px-4 py-3 rounded-lg border ${
                      frequency === freq.value
                        ? 'bg-blue-100 border-blue-500'
                        : 'bg-white border-gray-300'
                    }`}
                  >
                    <View className="flex-row items-center flex-1">
                      <Ionicons
                        name={freq.icon as any}
                        size={20}
                        color={frequency === freq.value ? '#2563eb' : '#6b7280'}
                      />
                      <View className="ml-3 flex-1">
                        <Text
                          className={`text-base font-semibold ${
                            frequency === freq.value ? 'text-blue-700' : 'text-gray-800'
                          }`}
                        >
                          {freq.label}
                        </Text>
                        <Text className="text-xs text-gray-500">{freq.description}</Text>
                      </View>
                    </View>
                    {frequency === freq.value && (
                      <Ionicons name="checkmark-circle" size={22} color="#2563eb" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Category */}
            <View className="mb-4">
              <Text className="text-gray-700 font-semibold mb-2">
                Budget Category (Optional)
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="flex-row gap-2"
              >
                <TouchableOpacity
                  onPress={() => setCategoryId(undefined)}
                  className={`px-4 py-2 rounded-lg border ${
                    !categoryId ? 'bg-blue-100 border-blue-500' : 'bg-white border-gray-300'
                  }`}
                >
                  <Text
                    className={`text-sm ${!categoryId ? 'text-blue-700 font-semibold' : 'text-gray-700'}`}
                  >
                    None
                  </Text>
                </TouchableOpacity>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setCategoryId(cat.id)}
                    className={`px-4 py-2 rounded-lg border ${
                      categoryId === cat.id
                        ? 'bg-blue-100 border-blue-500'
                        : 'bg-white border-gray-300'
                    }`}
                  >
                    <Text
                      className={`text-sm ${
                        categoryId === cat.id ? 'text-blue-700 font-semibold' : 'text-gray-700'
                      }`}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Next Billing Date */}
            <View className="mb-4">
              <Text className="text-gray-700 font-semibold mb-2">Next Billing Date *</Text>
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                className="border border-gray-300 rounded-lg px-4 py-3 bg-white flex-row items-center justify-between"
              >
                <Text className="text-gray-800">
                  {nextBillingDate.toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
                <Ionicons name="calendar-outline" size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {/* Reminder Days */}
            <View className="mb-4">
              <Text className="text-gray-700 font-semibold mb-2">Remind Me (Days Before)</Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 bg-white"
                value={reminderDays}
                onChangeText={setReminderDays}
                placeholder="3"
                keyboardType="number-pad"
              />
              <Text className="text-xs text-gray-500 mt-1">
                You'll see a reminder {reminderDays} day{reminderDays !== '1' ? 's' : ''} before
                billing
              </Text>
            </View>

            {/* Auto-pay Toggle */}
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-1 mr-4">
                <Text className="text-gray-700 font-semibold mb-1">Auto-pay Enabled</Text>
                <Text className="text-xs text-gray-500">
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

            {/* Notes */}
            <View className="mb-6">
              <Text className="text-gray-700 font-semibold mb-2">Notes (Optional)</Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 bg-white"
                value={notes}
                onChangeText={setNotes}
                placeholder="Any additional details..."
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading}
              className={`rounded-lg py-4 ${loading ? 'bg-blue-400' : 'bg-blue-600'}`}
            >
              <Text className="text-white text-center font-semibold text-lg">
                {loading ? 'Creating...' : 'Create Subscription'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Date Picker Modal */}
        {showDatePicker && (
          <DateTimePicker
            value={nextBillingDate}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowDatePicker(Platform.OS === 'ios');
              if (selectedDate) {
                setNextBillingDate(selectedDate);
              }
            }}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
