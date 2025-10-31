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
import { useAuth } from '../contexts/AuthContext';
import { getAccountById, updateAccount } from '../services/accounts';
import { centsToInputValue, parseCurrencyInput } from '../utils/currency';

type AccountType = 'checking' | 'savings' | 'credit_card' | 'investment' | 'loan';

export default function EditAccountScreen({ route, navigation }: any) {
  const { accountId } = route.params;
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('checking');
  const [balance, setBalance] = useState('');
  const [institution, setInstitution] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const accountTypes: { value: AccountType; label: string; icon: string }[] = [
    { value: 'checking', label: 'Checking', icon: 'card' },
    { value: 'savings', label: 'Savings', icon: 'wallet' },
    { value: 'credit_card', label: 'Credit Card', icon: 'card-outline' },
    { value: 'investment', label: 'Investment', icon: 'trending-up' },
    { value: 'loan', label: 'Loan', icon: 'cash-outline' },
  ];

  useEffect(() => {
    loadAccount();
  }, [accountId]);

  const loadAccount = async () => {
    try {
      const account = await getAccountById(accountId);
      setName(account.name);
      setType(account.type);
      setBalance(centsToInputValue(account.balance));
      setInstitution(account.institution || '');
    } catch (error: any) {
      Alert.alert('Error', error.message);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;

    if (!name.trim()) {
      Alert.alert('Error', 'Please enter an account name');
      return;
    }

    setSaving(true);

    try {
      const balanceInCents = balance ? parseCurrencyInput(balance) : 0;

      await updateAccount(accountId, {
        name: name.trim(),
        type,
        balance: balanceInCents,
        institution: institution.trim() || undefined,
      });

      Alert.alert('Success', 'Account updated successfully!');
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
        <View className="flex-row items-center px-6 py-4 bg-white border-b border-gray-200">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-800">Edit Account</Text>
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

            {/* Current Balance */}
            <View className="mb-4">
              <Text className="text-gray-700 font-semibold mb-2">
                Current Balance
                {(type === 'credit_card' || type === 'loan') && ' (Amount Owed)'}
              </Text>
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
              {(type === 'credit_card' || type === 'loan') && (
                <Text className="text-xs text-orange-600 mt-1">
                  For debts, enter the positive amount you owe (e.g., $500 for a $500 credit card balance)
                </Text>
              )}
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
              disabled={saving}
              className={`rounded-lg py-4 ${saving ? 'bg-blue-400' : 'bg-blue-600'}`}
            >
              <Text className="text-white text-center font-semibold text-lg">
                {saving ? 'Saving...' : 'Save Changes'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
