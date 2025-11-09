import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import {
  getTransactions,
  deleteTransaction,
  deleteTransactions,
} from '../services/transactions';
import { getAccounts } from '../services/accounts';
import {
  getOrCreateCurrentMonthBudget,
  getBudgetCategories,
} from '../services/budgets';
import { formatCurrency } from '../utils/currency';
import { parseDateString } from '../utils/date';
import { Transaction, Account, BudgetCategory } from '../types';

export default function TransactionsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(
    new Set()
  );

  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      const budget = await getOrCreateCurrentMonthBudget(user.id);
      const [transactionsData, accountsData, categoriesData] =
        await Promise.all([
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
      // Pass toggle function to navigation params so header can access it
      navigation.setParams({ toggleSelectionMode });
    }, [loadData, navigation])
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

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedTransactions(new Set());
  };

  const toggleTransactionSelection = (transactionId: string) => {
    const newSelected = new Set(selectedTransactions);
    if (newSelected.has(transactionId)) {
      newSelected.delete(transactionId);
    } else {
      newSelected.add(transactionId);
    }
    setSelectedTransactions(newSelected);
  };

  const selectAllTransactions = () => {
    const allIds = new Set(transactions.map((t) => t.id));
    setSelectedTransactions(allIds);
  };

  const deselectAllTransactions = () => {
    setSelectedTransactions(new Set());
  };

  const handleDeleteSelected = () => {
    const count = selectedTransactions.size;
    Alert.alert(
      'Delete Transactions',
      `Are you sure you want to delete ${count} transaction${
        count > 1 ? 's' : ''
      }?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Use batch delete function to avoid race conditions with balance updates
              await deleteTransactions(Array.from(selectedTransactions));
              setSelectedTransactions(new Set());
              setSelectionMode(false);
              loadData();
              Alert.alert(
                'Success',
                `${count} transaction${count > 1 ? 's' : ''} deleted`
              );
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
    const date = parseDateString(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
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

  const sortedDates = Object.keys(groupedTransactions).sort(
    (a, b) => parseDateString(b).getTime() - parseDateString(a).getTime()
  );

  return (
    <SafeAreaView className='flex-1 bg-background' edges={['bottom']}>
      {/* Selection Mode Actions Bar */}
      {selectionMode && transactions.length > 0 && (
        <View className='px-6 py-3 bg-card border-b border-gray-200'>
          <View className='flex-row items-center justify-between mb-2'>
            <View className='flex-row items-center'>
              <Text className='text-base font-semibold text-text-primary'>
                {selectedTransactions.size} selected
              </Text>
            </View>
            <View className='flex-row items-center gap-2'>
              {selectedTransactions.size < transactions.length ? (
                <TouchableOpacity
                  onPress={selectAllTransactions}
                  className='px-3 py-2 bg-blue-100 rounded-lg'>
                  <Text className='text-blue-700 font-semibold text-sm'>
                    Select All
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={deselectAllTransactions}
                  className='px-3 py-2 bg-gray-100 rounded-lg'>
                  <Text className='text-gray-700 font-semibold text-sm'>
                    Deselect All
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={toggleSelectionMode}
                className='px-3 py-2 bg-gray-100 rounded-lg'>
                <Text className='text-gray-700 font-semibold text-sm'>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          {selectedTransactions.size > 0 && (
            <TouchableOpacity
              onPress={handleDeleteSelected}
              className='bg-error-600 py-3 rounded-lg flex-row items-center justify-center'>
              <Ionicons name='trash' size={18} color='white' />
              <Text className='text-white font-semibold ml-2'>
                Delete {selectedTransactions.size} Transaction
                {selectedTransactions.size > 1 ? 's' : ''}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <ScrollView
        className='flex-1'
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        {loading ? (
          <Text className='text-text-secondary text-center mt-8'>
            Loading transactions...
          </Text>
        ) : transactions.length === 0 ? (
          <View className='items-center mt-8 px-4'>
            <Ionicons name='card-outline' size={64} color='#9ca3af' />
            <Text className='text-text-secondary mt-4 text-center'>
              No transactions yet. Add your first transaction to get started!
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('AddTransaction')}
              className='bg-primary px-6 py-3 rounded-lg mt-4'>
              <Text className='text-white font-semibold'>Add Transaction</Text>
            </TouchableOpacity>
          </View>
        ) : (
          sortedDates.map((date) => {
            const dayTransactions = groupedTransactions[date];
            const dayTotal = dayTransactions.reduce((sum, t) => {
              return sum + (t.type === 'income' ? t.amount : -t.amount);
            }, 0);

            return (
              <View key={date} className='mb-6'>
                {/* Date Header */}
                <View className='px-6 py-3 bg-black/5'>
                  <View className='flex-row justify-between items-center'>
                    <Text className='text-base font-bold text-text-primary'>
                      {formatDate(date)}
                    </Text>
                    <Text
                      className={`text-sm font-semibold ${
                        dayTotal >= 0 ? 'text-success-600' : 'text-error-600'
                      }`}>
                      {dayTotal >= 0 ? '+' : ''}
                      {formatCurrency(Math.abs(dayTotal))}
                    </Text>
                  </View>
                </View>

                {/* Transactions for this date */}
                <View className=''>
                  {dayTransactions.map((transaction) => {
                    const isSelected = selectedTransactions.has(transaction.id);

                    return (
                      <TouchableOpacity
                        key={transaction.id}
                        onPress={() => {
                          if (selectionMode) {
                            toggleTransactionSelection(transaction.id);
                          } else {
                            navigation.navigate('EditTransaction', {
                              transactionId: transaction.id,
                            });
                          }
                        }}
                        className={`bg-card p-4 ${
                          isSelected
                            ? 'border border-blue-500 bg-blue-50'
                            : 'border-b border-gray-200'
                        }`}
                        activeOpacity={0.7}>
                        <View className='flex-row items-center'>
                          {/* Selection Checkbox */}
                          {selectionMode && (
                            <View className='mr-3'>
                              <Ionicons
                                name={
                                  isSelected
                                    ? 'checkmark-circle'
                                    : 'ellipse-outline'
                                }
                                size={24}
                                color={isSelected ? '#2563eb' : '#9ca3af'}
                              />
                            </View>
                          )}

                          {/* Category Icon */}
                          <View className='mr-3'>
                            <View
                              className={`p-2.5 rounded-full ${
                                getCategoryName(transaction.category_id)
                                  ? 'bg-primary-100'
                                  : transaction.type === 'income'
                                  ? 'bg-success-100'
                                  : 'bg-gray-100'
                              }`}>
                              <Ionicons
                                name={
                                  getCategoryName(transaction.category_id)
                                    ? 'pricetag'
                                    : transaction.type === 'income'
                                    ? 'arrow-down'
                                    : 'wallet-outline'
                                }
                                size={20}
                                color={
                                  getCategoryName(transaction.category_id)
                                    ? '#FF6B35'
                                    : transaction.type === 'income'
                                    ? '#10B981'
                                    : '#6B7280'
                                }
                              />
                            </View>
                          </View>

                          {/* Transaction Details */}
                          <View className='flex-1'>
                            <Text className='text-base font-semibold text-text-primary mb-0.5'>
                              {transaction.description}
                            </Text>
                            <Text className='text-sm text-text-secondary'>
                              {getAccountName(transaction.account_id)}
                            </Text>
                            {getCategoryName(transaction.category_id) && (
                              <Text className='text-xs text-text-tertiary mt-0.5'>
                                {getCategoryName(transaction.category_id)}
                              </Text>
                            )}
                          </View>

                          {/* Amount */}
                          <View className='items-end ml-3'>
                            {/* Subscription indicator */}
                            {transaction.subscription_id && (
                              <View className='flex-row items-center mb-1'>
                                <Ionicons
                                  name='calendar-outline'
                                  size={14}
                                  color='#6b7280'
                                />
                                <Text className='text-xs text-gray-500 ml-1'>
                                  Recurring
                                </Text>
                              </View>
                            )}
                            <Text
                              className={`text-lg font-bold ${
                                transaction.type === 'income'
                                  ? 'text-success-600'
                                  : 'text-text-primary'
                              }`}>
                              {transaction.type === 'income' ? '+' : '-'}
                              {formatCurrency(transaction.amount)}
                            </Text>
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
    </SafeAreaView>
  );
}
