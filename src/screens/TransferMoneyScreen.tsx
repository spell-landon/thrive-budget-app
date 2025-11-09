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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { getAccounts } from '../services/accounts';
import { transferBetweenAccounts } from '../services/transfers';
import {
  formatCurrency,
  parseCurrencyInput,
  formatCurrencyInput,
} from '../utils/currency';
import { Account } from '../types';

export default function TransferMoneyScreen({ route, navigation }: any) {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [fromAccountId, setFromAccountId] = useState<string | null>(null);
  const [toAccountId, setToAccountId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [accountsLoading, setAccountsLoading] = useState(true);

  useEffect(() => {
    loadAccounts();
  }, []);

  // Pass submit handler to navigation params for header button
  useEffect(() => {
    if (navigation && navigation.setParams) {
      navigation.setParams({
        handleSubmit: handleTransfer,
        loading,
      });
    }
  }, [loading, fromAccountId, toAccountId, amount, description, accounts]);

  const loadAccounts = async () => {
    if (!user) return;

    try {
      const accountsData = await getAccounts(user.id);
      setAccounts(accountsData);

      // Pre-select first account as source if available
      if (accountsData.length > 0 && !fromAccountId) {
        setFromAccountId(accountsData[0].id);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setAccountsLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!user) return;

    // Validation
    if (!fromAccountId) {
      Alert.alert('Error', 'Please select a source account');
      return;
    }

    if (!toAccountId) {
      Alert.alert('Error', 'Please select a destination account');
      return;
    }

    if (fromAccountId === toAccountId) {
      Alert.alert('Error', 'Source and destination accounts must be different');
      return;
    }

    if (!amount || amount.trim() === '') {
      Alert.alert('Error', 'Please enter an amount');
      return;
    }

    let amountInCents: number;
    try {
      amountInCents = parseCurrencyInput(amount);
    } catch (error) {
      Alert.alert('Error', 'Invalid amount format');
      return;
    }

    if (amountInCents <= 0) {
      Alert.alert('Error', 'Amount must be greater than zero');
      return;
    }

    setLoading(true);

    try {
      const fromAccount = accounts.find((a) => a.id === fromAccountId);
      const toAccount = accounts.find((a) => a.id === toAccountId);

      await transferBetweenAccounts(
        user.id,
        fromAccountId,
        toAccountId,
        amountInCents,
        description || `Transfer to ${toAccount?.name}`,
        new Date().toISOString()
      );

      Alert.alert(
        'Success',
        `Transferred ${formatCurrency(amountInCents)} from ${
          fromAccount?.name
        } to ${toAccount?.name}`
      );
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const getAccountName = (accountId: string | null) => {
    if (!accountId) return 'Select Account';
    const account = accounts.find((a) => a.id === accountId);
    return account ? account.name : 'Unknown Account';
  };

  const getAccountBalance = (accountId: string | null) => {
    if (!accountId) return null;
    const account = accounts.find((a) => a.id === accountId);
    return account ? account.balance : null;
  };

  const availableAccounts = accounts.filter(
    (a) =>
      a.type === 'checking' || a.type === 'savings' || a.type === 'investment'
  );

  if (accountsLoading) {
    return (
      <SafeAreaView className='flex-1 bg-gray-50' edges={['bottom']}>
        <View className='flex-1 items-center justify-center'>
          <Text className='text-text-secondary'>Loading accounts...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (availableAccounts.length < 2) {
    return (
      <SafeAreaView className='flex-1 bg-gray-50' edges={['bottom']}>
        <View className='flex-1 items-center justify-center p-6'>
          <Ionicons name='wallet-outline' size={64} color='#9ca3af' />
          <Text className='text-text-primary text-lg font-semibold mt-4 text-center'>
            Need More Accounts
          </Text>
          <Text className='text-text-secondary text-center mt-2'>
            You need at least 2 accounts to transfer money. Add another account
            to get started.
          </Text>
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
            {/* Info Banner */}
            <View className='bg-blue-50 rounded-lg p-4 mb-6'>
              <View className='flex-row items-start'>
                <Ionicons name='information-circle' size={20} color='#3B82F6' />
                <Text className='text-blue-700 text-sm ml-2 flex-1'>
                  Transfer money between your accounts. This doesn't affect your
                  budget categories.
                </Text>
              </View>
            </View>

            {/* From Account */}
            <View className='mb-5'>
              <Text className='text-text-primary text-base font-semibold mb-2'>
                From Account
              </Text>
              <TouchableOpacity
                onPress={() => {
                  Alert.alert(
                    'Select Source Account',
                    '',
                    availableAccounts.map((account) => ({
                      text: `${account.name} (${formatCurrency(
                        account.balance
                      )})`,
                      onPress: () => {
                        setFromAccountId(account.id);
                        // Auto-select first different account as destination
                        if (!toAccountId || toAccountId === account.id) {
                          const otherAccount = availableAccounts.find(
                            (a) => a.id !== account.id
                          );
                          if (otherAccount) setToAccountId(otherAccount.id);
                        }
                      },
                    }))
                  );
                }}
                className='border border-gray-300 rounded-lg p-4 bg-white'>
                <View className='flex-row items-center justify-between'>
                  <View className='flex-1'>
                    <Text className='text-text-primary text-base font-medium'>
                      {getAccountName(fromAccountId)}
                    </Text>
                    {fromAccountId && (
                      <Text className='text-text-secondary text-sm mt-1'>
                        Balance:{' '}
                        {formatCurrency(getAccountBalance(fromAccountId) || 0)}
                      </Text>
                    )}
                  </View>
                  <Ionicons name='chevron-down' size={20} color='#6b7280' />
                </View>
              </TouchableOpacity>
            </View>

            {/* Arrow Icon */}
            <View className='items-center mb-5'>
              <Ionicons name='arrow-down' size={32} color='#FF6B35' />
            </View>

            {/* To Account */}
            <View className='mb-5'>
              <Text className='text-text-primary text-base font-semibold mb-2'>
                To Account
              </Text>
              <TouchableOpacity
                onPress={() => {
                  // Filter out the from account
                  const selectableAccounts = availableAccounts.filter(
                    (a) => a.id !== fromAccountId
                  );
                  Alert.alert(
                    'Select Destination Account',
                    '',
                    selectableAccounts.map((account) => ({
                      text: `${account.name} (${formatCurrency(
                        account.balance
                      )})`,
                      onPress: () => setToAccountId(account.id),
                    }))
                  );
                }}
                className='border border-gray-300 rounded-lg p-4 bg-white'>
                <View className='flex-row items-center justify-between'>
                  <View className='flex-1'>
                    <Text className='text-text-primary text-base font-medium'>
                      {getAccountName(toAccountId)}
                    </Text>
                    {toAccountId && (
                      <Text className='text-text-secondary text-sm mt-1'>
                        Balance:{' '}
                        {formatCurrency(getAccountBalance(toAccountId) || 0)}
                      </Text>
                    )}
                  </View>
                  <Ionicons name='chevron-down' size={20} color='#6b7280' />
                </View>
              </TouchableOpacity>
            </View>

            {/* Amount */}
            <View className='mb-5'>
              <Text className='text-text-primary text-base font-semibold mb-2'>
                Amount
              </Text>
              <View className='flex-row items-center border border-gray-300 rounded-lg bg-white'>
                <Text className='text-gray-500 text-lg px-4'>$</Text>
                <TextInput
                  className='flex-1 py-3 pr-4 text-base'
                  value={amount}
                  onChangeText={setAmount}
                  onBlur={() => {
                    if (amount) {
                      setAmount(formatCurrencyInput(amount));
                    }
                  }}
                  placeholder='0.00'
                  keyboardType='decimal-pad'
                  placeholderTextColor='#9ca3af'
                />
              </View>
            </View>

            {/* Description (Optional) */}
            <View className='mb-5'>
              <Text className='text-text-primary text-base font-semibold mb-2'>
                Description (Optional)
              </Text>
              <TextInput
                className='border border-gray-300 rounded-lg p-3 bg-white text-base'
                value={description}
                onChangeText={setDescription}
                placeholder='e.g., Monthly savings transfer'
                placeholderTextColor='#9ca3af'
                multiline
                numberOfLines={2}
              />
            </View>

            {/* Transfer Summary */}
            {fromAccountId && toAccountId && amount && (
              <View className='bg-primary-50 rounded-lg p-4 border border-primary-200'>
                <Text className='text-text-secondary text-xs font-medium uppercase tracking-wide mb-2'>
                  Transfer Summary
                </Text>
                <Text className='text-text-primary text-sm'>
                  Move{' '}
                  <Text className='font-bold'>
                    {formatCurrency(parseCurrencyInput(amount || '0'))}
                  </Text>{' '}
                  from{' '}
                  <Text className='font-semibold'>
                    {getAccountName(fromAccountId)}
                  </Text>{' '}
                  to{' '}
                  <Text className='font-semibold'>
                    {getAccountName(toAccountId)}
                  </Text>
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
