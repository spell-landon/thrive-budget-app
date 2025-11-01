import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { getTransactions, deleteTransaction } from '../services/transactions';
import { getAccounts } from '../services/accounts';
import { getOrCreateCurrentMonthBudget, getBudgetCategories } from '../services/budgets';
import { formatCurrency } from '../utils/currency';
import { Transaction, Account, BudgetCategory } from '../types';

export default function TransactionsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      const budget = await getOrCreateCurrentMonthBudget(user.id);
      const [transactionsData, accountsData, categoriesData] = await Promise.all([
        getTransactions(user.id),
        getAccounts(user.id),
        getBudgetCategories(budget.id),
      ]);
      setTransactions(transactionsData);
      setAccounts(accountsData);
      setCategories(categoriesData);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleDeleteTransaction = (transaction: Transaction) => {
    Alert.alert(
      'Delete Transaction',
      `Are you sure you want to delete this transaction?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTransaction(transaction.id);
              loadData();
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const getAccountName = (accountId: string) => {
    const account = accounts.find((acc) => acc.id === accountId);
    return account?.name || 'Unknown Account';
  };

  const getCategoryName = (categoryId?: string) => {
    if (!categoryId) return null;
    const category = categories.find((cat) => cat.id === categoryId);
    return category?.name || null;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Group transactions by date
  const groupedTransactions = transactions.reduce((groups, transaction) => {
    const date = transaction.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(transaction);
    return groups;
  }, {} as Record<string, Transaction[]>);

  const sortedDates = Object.keys(groupedTransactions).sort((a, b) =>
    new Date(b).getTime() - new Date(a).getTime()
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <View className="flex-1">
        <View className="px-6 py-4 bg-white border-b border-gray-200">
          <View className="flex-row justify-between items-center">
            <Text className="text-2xl font-bold text-gray-800">Transactions</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('AddTransaction')}
              className="bg-blue-600 px-4 py-2 rounded-lg"
            >
              <Text className="text-white font-semibold">Add Transaction</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          className="flex-1"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {loading ? (
            <Text className="text-gray-600 text-center mt-8">Loading transactions...</Text>
          ) : transactions.length === 0 ? (
            <View className="items-center mt-8 px-4">
              <Ionicons name="receipt-outline" size={64} color="#9ca3af" />
              <Text className="text-gray-600 mt-4 text-center">
                No transactions yet. Add your first transaction to get started!
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('AddTransaction')}
                className="bg-blue-600 px-6 py-3 rounded-lg mt-4"
              >
                <Text className="text-white font-semibold">Add Transaction</Text>
              </TouchableOpacity>
            </View>
          ) : (
            sortedDates.map((date) => {
              const dayTransactions = groupedTransactions[date];
              const dayTotal = dayTransactions.reduce((sum, t) => {
                return sum + (t.type === 'income' ? t.amount : -t.amount);
              }, 0);

              return (
                <View key={date} className="mb-4">
                  {/* Date Header */}
                  <View className="px-4 pt-4 pb-2 bg-gray-100">
                    <View className="flex-row justify-between items-center">
                      <Text className="text-base font-bold text-gray-800">
                        {formatDate(date)}
                      </Text>
                      <Text
                        className={`text-sm font-semibold ${
                          dayTotal >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {dayTotal >= 0 ? '+' : ''}
                        {formatCurrency(Math.abs(dayTotal))}
                      </Text>
                    </View>
                  </View>

                  {/* Transactions for this date */}
                  <View className="px-4">
                    {dayTransactions.map((transaction) => (
                      <TouchableOpacity
                        key={transaction.id}
                        onPress={() => navigation.navigate('EditTransaction', { transactionId: transaction.id })}
                        className="bg-white rounded-xl p-4 mt-2 shadow-sm border border-gray-100"
                        activeOpacity={0.7}
                      >
                        <View className="flex-row items-start justify-between">
                          <View className="flex-row items-center flex-1">
                            <View
                              className={`p-3 rounded-full mr-3 ${
                                transaction.type === 'income' ? 'bg-green-100' : 'bg-red-100'
                              }`}
                            >
                              <Ionicons
                                name={transaction.type === 'income' ? 'arrow-down' : 'arrow-up'}
                                size={20}
                                color={transaction.type === 'income' ? '#16a34a' : '#dc2626'}
                              />
                            </View>
                            <View className="flex-1">
                              <Text className="text-base font-semibold text-gray-800">
                                {transaction.description}
                              </Text>
                              <Text className="text-sm text-gray-500">
                                {getAccountName(transaction.account_id)}
                              </Text>
                              {getCategoryName(transaction.category_id) && (
                                <View className="flex-row items-center mt-1">
                                  <Ionicons name="pricetag" size={12} color="#9ca3af" />
                                  <Text className="text-xs text-gray-400 ml-1">
                                    {getCategoryName(transaction.category_id)}
                                  </Text>
                                </View>
                              )}
                            </View>
                          </View>
                          <View className="items-end">
                            <Text
                              className={`text-lg font-bold ${
                                transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                              }`}
                            >
                              {transaction.type === 'income' ? '+' : '-'}
                              {formatCurrency(transaction.amount)}
                            </Text>
                            <View className="flex-row items-center gap-2 mt-1">
                              <TouchableOpacity
                                onPress={(e) => {
                                  e.stopPropagation();
                                  navigation.navigate('EditTransaction', { transactionId: transaction.id });
                                }}
                              >
                                <Ionicons name="pencil-outline" size={18} color="#2563eb" />
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={(e) => {
                                  e.stopPropagation();
                                  handleDeleteTransaction(transaction);
                                }}
                              >
                                <Ionicons name="trash-outline" size={18} color="#ef4444" />
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))}
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
