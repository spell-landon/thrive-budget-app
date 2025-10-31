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
import { useAuth } from '../contexts/AuthContext';
import { createAccount } from '../services/accounts';
import { parseCurrencyInput } from '../utils/currency';

type AccountType = 'checking' | 'savings' | 'credit_card' | 'investment' | 'loan';

export default function AddAccountScreen({ navigation }: any) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('checking');
  const [balance, setBalance] = useState('');
  const [institution, setInstitution] = useState('');
  const [loading, setLoading] = useState(false);

  const accountTypes: { value: AccountType; label: string; icon: string }[] = [
    { value: 'checking', label: 'Checking', icon: 'card' },
    { value: 'savings', label: 'Savings', icon: 'wallet' },
    { value: 'credit_card', label: 'Credit Card', icon: 'card-outline' },
    { value: 'investment', label: 'Investment', icon: 'trending-up' },
    { value: 'loan', label: 'Loan', icon: 'cash-outline' },
  ];

  const handleSubmit = async () => {
    if (!user) return;

    if (!name.trim()) {
      Alert.alert('Error', 'Please enter an account name');
      return;
    }

    setLoading(true);

    try {
      const balanceInCents = balance ? parseCurrencyInput(balance) : 0;

      await createAccount(user.id, {
        name: name.trim(),
        type,
        balance: balanceInCents,
        institution: institution.trim() || undefined,
      });

      Alert.alert('Success', 'Account created successfully!');
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
        <View className="flex-row items-center px-6 py-4 bg-white border-b border-gray-200">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-800">Add Account</Text>
        </View>

        <ScrollView className="flex-1">
          <View className="p-6">
            {/* Account Name */}
            <View className="mb-4">
              <Text className="text-gray-700 font-semibold mb-2">Account Name *</Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 bg-white"
                value={name}
                onChangeText={setName}
                placeholder="e.g., Chase Checking"
                autoCapitalize="words"
              />
            </View>

            {/* Account Type */}
            <View className="mb-4">
              <Text className="text-gray-700 font-semibold mb-2">Account Type *</Text>
              <View className="flex-row flex-wrap gap-2">
                {accountTypes.map((accountType) => (
                  <TouchableOpacity
                    key={accountType.value}
                    onPress={() => setType(accountType.value)}
                    className={`flex-row items-center px-4 py-3 rounded-lg border ${
                      type === accountType.value
                        ? 'bg-blue-100 border-blue-500'
                        : 'bg-white border-gray-300'
                    }`}
                  >
                    <Ionicons
                      name={accountType.icon as any}
                      size={20}
                      color={type === accountType.value ? '#2563eb' : '#6b7280'}
                    />
                    <Text
                      className={`ml-2 ${
                        type === accountType.value ? 'text-blue-700 font-semibold' : 'text-gray-700'
                      }`}
                    >
                      {accountType.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Initial Balance */}
            <View className="mb-4">
              <Text className="text-gray-700 font-semibold mb-2">Initial Balance</Text>
              <View className="flex-row items-center border border-gray-300 rounded-lg bg-white">
                <Text className="text-gray-500 text-lg px-4">$</Text>
                <TextInput
                  className="flex-1 py-3 pr-4"
                  value={balance}
                  onChangeText={setBalance}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                />
              </View>
              <Text className="text-xs text-gray-500 mt-1">
                Leave blank if you'll add the balance later
              </Text>
            </View>

            {/* Institution (Optional) */}
            <View className="mb-6">
              <Text className="text-gray-700 font-semibold mb-2">Bank/Institution (Optional)</Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 bg-white"
                value={institution}
                onChangeText={setInstitution}
                placeholder="e.g., Chase Bank"
                autoCapitalize="words"
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading}
              className={`rounded-lg py-4 ${loading ? 'bg-blue-400' : 'bg-blue-600'}`}
            >
              <Text className="text-white text-center font-semibold text-lg">
                {loading ? 'Creating...' : 'Create Account'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
