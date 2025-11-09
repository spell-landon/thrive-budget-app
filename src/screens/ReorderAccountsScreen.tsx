import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { getAccounts, reorderAccounts } from '../services/accounts';
import { Account } from '../types';

export default function ReorderAccountsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, [user]);

  const loadAccounts = async () => {
    if (!user) return;

    try {
      const data = await getAccounts(user.id);
      setAccounts(data);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const moveAccount = (index: number, direction: 'up' | 'down') => {
    const newAccounts = [...accounts];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newAccounts.length) {
      return; // Can't move beyond bounds
    }

    // Swap accounts
    [newAccounts[index], newAccounts[targetIndex]] = [
      newAccounts[targetIndex],
      newAccounts[index],
    ];

    setAccounts(newAccounts);
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      // Update sort_order for all accounts based on their position
      const updates = accounts.map((account, index) => ({
        id: account.id,
        sort_order: index,
      }));

      await reorderAccounts(updates);
      Alert.alert('Success', 'Account order saved!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'checking':
        return 'card';
      case 'savings':
        return 'wallet';
      case 'credit_card':
        return 'card-outline';
      case 'investment':
        return 'trending-up';
      case 'loan':
        return 'cash-outline';
      default:
        return 'cash';
    }
  };

  return (
    <SafeAreaView className='flex-1 bg-gray-50' edges={['top', 'bottom']}>
      {/* Header */}
      <View className='flex-row items-center justify-between px-6 py-4 bg-white border-b border-gray-200'>
        <View className='flex-row items-center'>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className='mr-4'>
            <Ionicons name='arrow-back' size={24} color='#1f2937' />
          </TouchableOpacity>
          <Text className='text-xl font-bold text-gray-800'>
            Reorder Accounts
          </Text>
        </View>
        {hasChanges && (
          <TouchableOpacity onPress={handleSave}>
            <Text className='text-primary font-semibold text-base'>Save</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView className='flex-1'>
        {loading ? (
          <Text className='text-gray-600 text-center mt-8'>
            Loading accounts...
          </Text>
        ) : accounts.length === 0 ? (
          <View className='items-center mt-12 px-4'>
            <Ionicons name='wallet-outline' size={64} color='#9ca3af' />
            <Text className='text-gray-600 mt-4 text-center text-lg mb-2'>
              No accounts yet
            </Text>
            <Text className='text-gray-500 text-center mb-6'>
              Add accounts to reorder them
            </Text>
          </View>
        ) : (
          <View className='p-4'>
            <View className='bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4'>
              <View className='flex-row items-start'>
                <Ionicons name='information-circle' size={20} color='#3B82F6' />
                <Text className='text-blue-800 text-sm ml-2 flex-1'>
                  Use the arrows to change the order accounts appear in the
                  Budget screen. First account will appear first.
                </Text>
              </View>
            </View>

            {accounts.map((account, index) => (
              <View
                key={account.id}
                className='bg-white rounded-xl p-4 mb-3 border border-gray-200 flex-row items-center'
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 2,
                  elevation: 1,
                }}>
                {/* Account Info */}
                <View className='bg-primary-100 p-3 rounded-full mr-3'>
                  <Ionicons
                    name={getAccountIcon(account.type) as any}
                    size={24}
                    color='#FF6B35'
                  />
                </View>
                <View className='flex-1'>
                  <Text className='text-base font-semibold text-gray-800'>
                    {account.name}
                  </Text>
                  {account.institution && (
                    <Text className='text-sm text-gray-500 mt-0.5'>
                      {account.institution}
                    </Text>
                  )}
                </View>

                {/* Reorder Controls */}
                <View className='flex-row items-center gap-1'>
                  <TouchableOpacity
                    onPress={() => moveAccount(index, 'up')}
                    disabled={index === 0}
                    className={`p-2 rounded-lg ${
                      index === 0 ? 'opacity-30' : 'bg-gray-100'
                    }`}>
                    <Ionicons
                      name='chevron-up'
                      size={20}
                      color={index === 0 ? '#9ca3af' : '#1f2937'}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => moveAccount(index, 'down')}
                    disabled={index === accounts.length - 1}
                    className={`p-2 rounded-lg ${
                      index === accounts.length - 1
                        ? 'opacity-30'
                        : 'bg-gray-100'
                    }`}>
                    <Ionicons
                      name='chevron-down'
                      size={20}
                      color={
                        index === accounts.length - 1 ? '#9ca3af' : '#1f2937'
                      }
                    />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {/* Save Button at Bottom */}
            {hasChanges && (
              <TouchableOpacity
                onPress={handleSave}
                className='bg-primary py-4 rounded-lg mt-4'>
                <Text className='text-white text-center font-semibold text-base'>
                  Save Order
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
