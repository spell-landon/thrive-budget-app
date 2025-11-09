import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { getAccounts } from '../services/accounts';
import { Account } from '../types';

export default function SelectAccountScreen({ route, navigation }: any) {
  const { user } = useAuth();
  const { selectedAccountId, onSelect } = route.params;
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    if (!user) return;

    try {
      const data = await getAccounts(user.id);

      // Sort accounts: checking first, then by name
      const sortedAccounts = data.sort((a, b) => {
        // Checking accounts come first
        if (a.type === 'checking' && b.type !== 'checking') return -1;
        if (a.type !== 'checking' && b.type === 'checking') return 1;
        // Then sort alphabetically by name
        return a.name.localeCompare(b.name);
      });

      setAccounts(sortedAccounts);
    } catch (error: any) {
      console.error('Error loading accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAccount = (accountId: string) => {
    if (onSelect) {
      onSelect(accountId);
    }
    navigation.goBack();
  };

  return (
    <SafeAreaView className='flex-1 bg-gray-50' edges={['bottom']}>
      {loading ? (
        <View className='flex-1 items-center justify-center'>
          <ActivityIndicator size='large' color='#FF6B35' />
        </View>
      ) : accounts.length === 0 ? (
        <View className='flex-1 items-center justify-center p-6'>
          <Ionicons name='wallet-outline' size={64} color='#9ca3af' />
          <Text className='text-gray-600 text-center mt-4 text-base'>
            No accounts found. Please add an account first.
          </Text>
        </View>
      ) : (
        <ScrollView className='flex-1 pt-4'>
          {accounts.map((account) => (
            <TouchableOpacity
              key={account.id}
              onPress={() => handleSelectAccount(account.id)}
              className={`mx-4 mb-2 px-6 py-4 rounded-lg border ${
                selectedAccountId === account.id
                  ? 'bg-primary-50 border-primary'
                  : 'bg-white border-gray-200'
              }`}>
              <View className='flex-row items-center justify-between'>
                <View className='flex-row items-center flex-1'>
                  <Ionicons
                    name='wallet'
                    size={24}
                    color={
                      selectedAccountId === account.id ? '#FF6B35' : '#6b7280'
                    }
                  />
                  <View className='ml-3 flex-1'>
                    <Text
                      className={`text-base ${
                        selectedAccountId === account.id
                          ? 'text-primary font-semibold'
                          : 'text-gray-800'
                      }`}>
                      {account.name}
                    </Text>
                    {account.account_type && (
                      <Text className='text-sm text-gray-500 mt-1'>
                        {account.account_type.charAt(0).toUpperCase() +
                          account.account_type.slice(1).replace('_', ' ')}
                      </Text>
                    )}
                  </View>
                </View>
                {selectedAccountId === account.id && (
                  <Ionicons name='checkmark-circle' size={24} color='#FF6B35' />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
