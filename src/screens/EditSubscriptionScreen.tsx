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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getSubscriptionById, updateSubscription } from '../services/subscriptions';
import { getOrCreateCurrentMonthBudget, getBudgetCategories } from '../services/budgets';
import { centsToInputValue, parseCurrencyInput, formatCurrencyInput } from '../utils/currency';
import { BudgetCategory } from '../types';

type FrequencyType = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export default function EditSubscriptionScreen({ route, navigation }: any) {
  const { subscriptionId } = route.params;
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<FrequencyType>('monthly');
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [nextBillingDate, setNextBillingDate] = useState(new Date());
  const [reminderDays, setReminderDays] = useState('3');
  const [autoPay, setAutoPay] = useState(false);
  const [notes, setNotes] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<BudgetCategory[]>([]);

  useEffect(() => {
    loadData();
  }, [subscriptionId]);

  const loadData = async () => {
    try {
      const [subscription, budget] = await Promise.all([
        getSubscriptionById(subscriptionId),
        getOrCreateCurrentMonthBudget((await getSubscriptionById(subscriptionId)).user_id),
      ]);

      setName(subscription.name);
      setAmount(centsToInputValue(subscription.amount));
      setFrequency(subscription.frequency as FrequencyType);
      setCategoryId(subscription.category_id);
      setNextBillingDate(new Date(subscription.next_billing_date));
      setReminderDays(subscription.reminder_days_before.toString());
      setAutoPay(subscription.auto_pay);
      setNotes(subscription.notes || '');

      const categoriesData = await getBudgetCategories(budget.id);
      setCategories(categoriesData.filter((c) => c.category_type === 'expense'));
    } catch (error: any) {
      Alert.alert('Error', error.message);
      navigation.goBack();
    } finally {
      setLoading(false);
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

  const getCategoryName = (catId?: string) => {
    if (!catId) return 'None';
    const category = categories.find((cat) => cat.id === catId);
    return category?.name || 'None';
  };

  const handleSubmit = async () => {
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

    setSaving(true);

    try {
      const amountInCents = parseCurrencyInput(amount);

      await updateSubscription(subscriptionId, {
        name: name.trim(),
        amount: amountInCents,
        frequency,
        category_id: categoryId,
        next_billing_date: nextBillingDate.toISOString().split('T')[0],
        reminder_days_before: reminderDaysNum,
        auto_pay: autoPay,
        notes: notes.trim() || undefined,
      });

      Alert.alert('Success', 'Subscription updated successfully!');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={['bottom']}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
              <Ionicons name="arrow-back" size={24} color="#1f2937" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-gray-800">Edit Subscription</Text>
          </View>
          <TouchableOpacity onPress={handleSubmit} disabled={saving}>
            <Text className={`text-base font-semibold ${saving ? 'text-gray-400' : 'text-blue-600'}`}>
              {saving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
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
                  onBlur={() => {
                    if (amount) {
                      setAmount(formatCurrencyInput(amount));
                    }
                  }}
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

            {/* Category Dropdown */}
            <View className="mb-4">
              <Text className="text-gray-700 font-semibold mb-2">
                Budget Category (Optional)
              </Text>
              <TouchableOpacity
                onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
                className="border border-gray-300 rounded-lg px-4 py-3 bg-white flex-row items-center justify-between"
              >
                <Text className={categoryId ? 'text-gray-800' : 'text-gray-500'}>
                  {getCategoryName(categoryId)}
                </Text>
                <Ionicons
                  name={showCategoryDropdown ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color="#6b7280"
                />
              </TouchableOpacity>
              {showCategoryDropdown && (
                <View className="border border-gray-300 rounded-lg bg-white mt-1 max-h-48">
                  <ScrollView>
                    <TouchableOpacity
                      onPress={() => {
                        setCategoryId(undefined);
                        setShowCategoryDropdown(false);
                      }}
                      className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200"
                    >
                      <Text className="text-gray-500">None</Text>
                      {!categoryId && (
                        <Ionicons name="checkmark-circle" size={20} color="#2563eb" />
                      )}
                    </TouchableOpacity>
                    {categories.map((cat) => (
                      <TouchableOpacity
                        key={cat.id}
                        onPress={() => {
                          setCategoryId(cat.id);
                          setShowCategoryDropdown(false);
                        }}
                        className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200"
                      >
                        <Text className="text-gray-800">{cat.name}</Text>
                        {categoryId === cat.id && (
                          <Ionicons name="checkmark-circle" size={20} color="#2563eb" />
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
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
            <View>
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
