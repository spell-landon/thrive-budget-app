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
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { getAccountById, updateAccount, deleteAccount, canAccountBeGoalTracking } from '../services/accounts';
import { centsToInputValue, parseCurrencyInput, formatCurrencyInput } from '../utils/currency';

type AccountType = 'checking' | 'savings' | 'credit_card' | 'investment' | 'loan';

export default function EditAccountScreen({ route, navigation }: any) {
  const { accountId } = route.params;
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('checking');
  const [balance, setBalance] = useState('');
  const [institution, setInstitution] = useState('');
  const [isGoalTracking, setIsGoalTracking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Store current account data
  const [currentAccount, setCurrentAccount] = useState<{
    id: string;
    name: string;
    type: AccountType;
    balance: number;
  } | null>(null);

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

  // Pass submit handler to navigation params for header button
  useEffect(() => {
    navigation.setParams({
      handleSubmit,
      loading: saving,
    });
  }, [saving, name, type, balance, institution, isGoalTracking, accountId]);

  const loadAccount = async () => {
    try {
      const account = await getAccountById(accountId);
      setName(account.name);
      setType(account.type);
      setBalance(centsToInputValue(account.balance));
      setInstitution(account.institution || '');
      setIsGoalTracking(account.is_goal_tracking);

      // Store current account data for allocation/deletion
      setCurrentAccount({
        id: account.id,
        name: account.name,
        type: account.type,
        balance: account.balance,
      });
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
        is_goal_tracking: isGoalTracking,
      });

      Alert.alert('Success', 'Account updated successfully!');
      navigation.goBack();
      // Don't reset saving state when navigating away - the screen is unmounting
    } catch (error: any) {
      Alert.alert('Error', error.message);
      setSaving(false); // Only reset saving if we're staying on the screen
    }
  };

  const handleDeleteAccount = () => {
    if (!currentAccount) return;

    Alert.alert(
      'Delete Account',
      `Are you sure you want to delete ${currentAccount.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount(currentAccount.id);
              Alert.alert('Success', 'Account deleted successfully!');
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
      <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
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

            {/* Goal-Tracking Toggle (only for checking/savings/investment) */}
            {canAccountBeGoalTracking(type) && (
              <View className='mb-4 bg-white border border-gray-200 rounded-lg p-4'>
                <View className='flex-row items-center justify-between mb-2'>
                  <View className='flex-1 mr-4'>
                    <Text className='text-gray-700 font-semibold mb-1'>
                      Use for Goal Tracking
                    </Text>
                    <Text className='text-xs text-gray-600 leading-4'>
                      Categories in this account will appear as savings goals.
                      Perfect for dedicated savings accounts where each category
                      represents a specific goal (Emergency Fund, Vacation, etc.)
                    </Text>
                  </View>
                  <Switch
                    value={isGoalTracking}
                    onValueChange={setIsGoalTracking}
                    trackColor={{ false: '#d1d5db', true: '#FCD5C5' }}
                    thumbColor={isGoalTracking ? '#C93B00' : '#f3f4f6'}
                  />
                </View>
              </View>
            )}

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
                  onBlur={() => {
                    if (balance) {
                      setBalance(formatCurrencyInput(balance));
                    }
                  }}
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
            <View className="mb-4">
              <Text className="text-gray-700 font-semibold mb-2">Bank/Institution (Optional)</Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 bg-white"
                value={institution}
                onChangeText={setInstitution}
                placeholder="e.g., Chase Bank"
                autoCapitalize="words"
              />
            </View>

            {/* Delete Account Button */}
            <View className="mt-2 pt-6 border-t border-gray-200">
              <TouchableOpacity
                onPress={handleDeleteAccount}
                className="bg-error-500 px-6 py-3 rounded-lg flex-row items-center justify-center"
              >
                <Ionicons name="trash" size={20} color="white" />
                <Text className="text-white font-semibold ml-2">Delete Account</Text>
              </TouchableOpacity>
              <Text className="text-xs text-gray-500 text-center mt-2">
                This will permanently delete this account and cannot be undone
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
