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
import { getPaycheckPlanById, updatePaycheckPlan } from '../services/paychecks';
import { centsToInputValue, parseCurrencyInput } from '../utils/currency';

type FrequencyType = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';

export default function EditPaycheckScreen({ route, navigation }: any) {
  const { paycheckId } = route.params;
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<FrequencyType>('biweekly');
  const [nextDate, setNextDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPaycheck();
  }, [paycheckId]);

  const loadPaycheck = async () => {
    try {
      const paycheck = await getPaycheckPlanById(paycheckId);
      setName(paycheck.name);
      setAmount(centsToInputValue(paycheck.amount));
      setFrequency(paycheck.frequency as FrequencyType);
      setNextDate(new Date(paycheck.next_date));
    } catch (error: any) {
      Alert.alert('Error', error.message);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const frequencies: { value: FrequencyType; label: string; icon: string; description: string }[] = [
    {
      value: 'weekly',
      label: 'Weekly',
      icon: 'calendar-outline',
      description: 'Every 7 days',
    },
    {
      value: 'biweekly',
      label: 'Bi-weekly',
      icon: 'calendar',
      description: 'Every 14 days',
    },
    {
      value: 'semimonthly',
      label: 'Semi-monthly',
      icon: 'calendar-sharp',
      description: '15th & last day',
    },
    {
      value: 'monthly',
      label: 'Monthly',
      icon: 'calendar-number-outline',
      description: 'Once per month',
    },
  ];

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a paycheck name');
      return;
    }

    if (!amount.trim()) {
      Alert.alert('Error', 'Please enter a paycheck amount');
      return;
    }

    setSaving(true);

    try {
      const amountInCents = parseCurrencyInput(amount);

      await updatePaycheckPlan(paycheckId, {
        name: name.trim(),
        amount: amountInCents,
        frequency,
        next_date: nextDate.toISOString().split('T')[0],
      });

      Alert.alert('Success', 'Paycheck updated successfully!');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </SafeAreaView>
    );
  }

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
          <Text className="text-xl font-bold text-gray-800">Edit Paycheck</Text>
        </View>

        <ScrollView className="flex-1">
          <View className="p-6">
            {/* Paycheck Name */}
            <View className="mb-4">
              <Text className="text-gray-700 font-semibold mb-2">Paycheck Name *</Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 bg-white"
                value={name}
                onChangeText={setName}
                placeholder="e.g., Main Job, Side Gig"
                autoCapitalize="words"
              />
            </View>

            {/* Amount */}
            <View className="mb-4">
              <Text className="text-gray-700 font-semibold mb-2">Paycheck Amount *</Text>
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
              <Text className="text-xs text-gray-500 mt-1">
                Enter your take-home pay after taxes and deductions
              </Text>
            </View>

            {/* Frequency */}
            <View className="mb-4">
              <Text className="text-gray-700 font-semibold mb-2">Frequency *</Text>
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

            {/* Next Paycheck Date */}
            <View className="mb-6">
              <Text className="text-gray-700 font-semibold mb-2">Next Paycheck Date *</Text>
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                className="border border-gray-300 rounded-lg px-4 py-3 bg-white flex-row items-center justify-between"
              >
                <Text className="text-gray-800">
                  {nextDate.toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
                <Ionicons name="calendar-outline" size={20} color="#6b7280" />
              </TouchableOpacity>
              <Text className="text-xs text-gray-500 mt-1">
                When will you receive your next paycheck?
              </Text>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={saving}
              className={`rounded-lg py-4 ${saving ? 'bg-blue-400' : 'bg-blue-600'}`}
            >
              <Text className="text-white text-center font-semibold text-lg">
                {saving ? 'Saving...' : 'Save Changes'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Date Picker Modal */}
        {showDatePicker && (
          <DateTimePicker
            value={nextDate}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowDatePicker(Platform.OS === 'ios');
              if (selectedDate) {
                setNextDate(selectedDate);
              }
            }}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
