import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { getAccounts, deleteAccount } from '../services/accounts';
import { formatCurrency } from '../utils/currency';
import { Account } from '../types';

export default function AccountsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAccounts = useCallback(async () => {
    if (!user) return;

    try {
      const data = await getAccounts(user.id);
      setAccounts(data);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  // Reload accounts when screen comes into focus (e.g., after adding an account)
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadAccounts();
    }, [loadAccounts])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAccounts();
  }, [loadAccounts]);

  const handleDeleteAccount = (account: Account) => {
    Alert.alert(
      'Delete Account',
      `Are you sure you want to delete ${account.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount(account.id);
              loadAccounts();
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
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

  // Group accounts by type
  const groupedAccounts = accounts.reduce((groups, account) => {
    const type = account.type;
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(account);
    return groups;
  }, {} as Record<string, Account[]>);

  // Calculate total balance for each group
  const getGroupTotal = (groupAccounts: Account[]) => {
    return groupAccounts.reduce((sum, acc) => sum + acc.balance, 0);
  };

  // Get display name for account type
  const getTypeName = (type: string) => {
    const names: Record<string, string> = {
      checking: 'Checking',
      savings: 'Savings',
      credit_card: 'Credit Cards',
      investment: 'Investments',
      loan: 'Loans',
    };
    return names[type] || type;
  };

  // Order of account types
  const typeOrder = ['checking', 'savings', 'credit_card', 'investment', 'loan'];
  const sortedTypes = Object.keys(groupedAccounts).sort(
    (a, b) => typeOrder.indexOf(a) - typeOrder.indexOf(b)
  );

  // Calculate net worth (assets - debts)
  const netWorth = accounts.reduce((sum, acc) => {
    const isDebt = acc.type === 'credit_card' || acc.type === 'loan';
    return sum + (isDebt ? -acc.balance : acc.balance);
  }, 0);

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <View className="flex-1">
        <View className="px-6 py-4 bg-white border-b border-gray-200">
          <View className="flex-row justify-between items-center">
            <Text className="text-2xl font-bold text-gray-800">Accounts</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('AddAccount')}
              className="bg-blue-600 px-4 py-2 rounded-lg"
            >
              <Text className="text-white font-semibold">Add Account</Text>
            </TouchableOpacity>
          </View>
          <Text className="text-sm text-gray-600 mt-2">
            Net Worth: <Text className="font-semibold">{formatCurrency(netWorth)}</Text>
          </Text>
        </View>

        <ScrollView
          className="flex-1"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {loading ? (
            <Text className="text-gray-600 text-center mt-8">Loading accounts...</Text>
          ) : accounts.length === 0 ? (
            <View className="items-center mt-8 px-4">
              <Ionicons name="wallet-outline" size={64} color="#9ca3af" />
              <Text className="text-gray-600 mt-4 text-center">
                No accounts yet. Add your first account to get started!
              </Text>
            </View>
          ) : (
            sortedTypes.map((type) => {
              const groupAccounts = groupedAccounts[type];
              const groupTotal = getGroupTotal(groupAccounts);

              return (
                <View key={type} className="mb-6">
                  {/* Group Header */}
                  <View className="px-4 pt-4 pb-2 bg-gray-100 border-l-4 border-blue-600">
                    <View className="flex-row justify-between items-center">
                      <Text className="text-lg font-bold text-gray-800">{getTypeName(type)}</Text>
                      <Text className="text-base font-semibold text-gray-700">
                        {formatCurrency(groupTotal)}
                      </Text>
                    </View>
                  </View>

                  {/* Accounts in Group */}
                  <View className="px-4 pt-2">
                    {groupAccounts.map((account) => {
                      const isDebt = account.type === 'credit_card' || account.type === 'loan';

                      return (
                        <TouchableOpacity
                          key={account.id}
                          onPress={() => navigation.navigate('EditAccount', { accountId: account.id })}
                          className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-100"
                          activeOpacity={0.7}
                        >
                          <View className="flex-row items-start justify-between">
                            <View className="flex-row items-center flex-1">
                              <View className="bg-blue-100 p-3 rounded-full mr-3">
                                <Ionicons
                                  name={getAccountIcon(account.type) as any}
                                  size={24}
                                  color="#2563eb"
                                />
                              </View>
                              <View className="flex-1">
                                <Text className="text-lg font-semibold text-gray-800">
                                  {account.name}
                                </Text>
                                {account.institution && (
                                  <Text className="text-sm text-gray-500">{account.institution}</Text>
                                )}
                              </View>
                            </View>
                            <View className="items-end">
                              {isDebt && (
                                <Text className="text-xs text-orange-600 font-medium mb-1">Debt Owed</Text>
                              )}
                              <Text
                                className={`text-xl font-bold ${
                                  isDebt ? 'text-red-600' : account.balance >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}
                              >
                                {formatCurrency(account.balance)}
                              </Text>
                              <TouchableOpacity
                                onPress={(e) => {
                                  e.stopPropagation();
                                  handleDeleteAccount(account);
                                }}
                                className="mt-2"
                              >
                                <Ionicons name="trash-outline" size={20} color="#ef4444" />
                              </TouchableOpacity>
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
