import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { getAccounts } from '../services/accounts';
import {
  getOrCreateCurrentMonthBudget,
  getBudgetCategories,
} from '../services/budgets';
import { getPaycheckPlans, processDuePaychecks } from '../services/paychecks';
import { getUpcomingSubscriptions } from '../services/subscriptions';
import { getGoals } from '../services/goals';
import { getTransactions } from '../services/transactions';
import { formatCurrency } from '../utils/currency';
import {
  Account,
  Budget,
  BudgetCategory,
  PaycheckPlan,
  Subscription,
  SavingsGoal,
  Transaction,
} from '../types';
import { useFocusEffect } from '@react-navigation/native';

export default function DashboardScreen({ navigation }: any) {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [paychecks, setPaychecks] = useState<PaycheckPlan[]>([]);
  const [upcomingSubscriptions, setUpcomingSubscriptions] = useState<
    Subscription[]
  >([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAccounts = useCallback(async () => {
    if (!user) return;

    try {
      // Process any due paychecks first
      await processDuePaychecks(user.id);

      const [
        accountsData,
        budgetData,
        paychecksData,
        subscriptionsData,
        goalsData,
        transactionsData,
      ] = await Promise.all([
        getAccounts(user.id),
        getOrCreateCurrentMonthBudget(user.id),
        getPaycheckPlans(user.id),
        getUpcomingSubscriptions(user.id),
        getGoals(user.id),
        getTransactions(user.id),
      ]);
      setAccounts(accountsData);
      setBudget(budgetData);
      setPaychecks(paychecksData);
      setUpcomingSubscriptions(subscriptionsData);
      setGoals(goalsData);
      setTransactions(transactionsData);

      if (budgetData) {
        const categoriesData = await getBudgetCategories(budgetData.id);
        setCategories(categoriesData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  // Reload accounts when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadAccounts();
    }, [loadAccounts])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAccounts();
  }, [loadAccounts]);

  // Calculate net worth (assets - debts)
  const netWorth = accounts.reduce((sum, acc) => {
    const isDebt = acc.type === 'credit_card' || acc.type === 'loan';
    return sum + (isDebt ? -acc.balance : acc.balance);
  }, 0);

  return (
    <SafeAreaView className='flex-1 bg-background' edges={[]}>
      <ScrollView
        className='flex-1'
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        <View className='p-6'>
          {/* Net Worth Summary */}
          <View
            className='bg-primary rounded-xl p-6 mb-6'
            style={{
              shadowColor: '#FF6B35',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 8,
              elevation: 4,
            }}>
            <Text className='text-primary-100 text-sm font-medium mb-1'>
              Net Worth
            </Text>
            <Text className='text-white text-3xl font-bold'>
              {formatCurrency(netWorth)}
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Accounts')}
              className='flex-row items-center mt-3'>
              <Text className='text-white text-sm font-medium mr-1'>
                View accounts
              </Text>
              <Ionicons name='arrow-forward' size={16} color='white' />
            </TouchableOpacity>
          </View>

          {/* Monthly Budget Overview */}
          <View
            className='bg-card rounded-xl p-4 mb-4'
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 1,
            }}>
            <View className='flex-row justify-between items-center mb-3'>
              <Text className='text-lg font-semibold text-text-primary'>
                {new Date().toLocaleDateString('en-US', { month: 'long' })}{' '}
                Budget
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Budget')}>
                <Text className='text-primary text-sm font-semibold'>
                  See all
                </Text>
              </TouchableOpacity>
            </View>
            {budget ? (
              <>
                <View className='flex-row justify-between items-center mb-2'>
                  <Text className='text-text-secondary'>Income</Text>
                  <Text className='text-lg font-semibold text-success-600'>
                    {formatCurrency(budget.total_income)}
                  </Text>
                </View>
                <View className='flex-row justify-between items-center mb-2'>
                  <Text className='text-text-secondary'>Allocated</Text>
                  <Text className='text-lg font-semibold text-primary'>
                    {formatCurrency(budget.total_allocated)}
                  </Text>
                </View>
                <View className='flex-row justify-between items-center'>
                  <Text className='text-text-secondary'>Remaining</Text>
                  <Text
                    className={`text-lg font-semibold ${
                      budget.total_income - budget.total_allocated >= 0
                        ? 'text-success-600'
                        : 'text-error-600'
                    }`}>
                    {formatCurrency(
                      Math.abs(budget.total_income - budget.total_allocated)
                    )}
                  </Text>
                </View>
                {categories.length === 0 && (
                  <TouchableOpacity
                    onPress={() => navigation.navigate('Budget')}
                    className='bg-primary-50 border border-primary-200 rounded-lg p-3 mt-3'>
                    <Text className='text-primary-700 text-sm text-center'>
                      Tap to add budget categories
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <TouchableOpacity
                onPress={() => navigation.navigate('Budget')}
                className='items-center py-4'>
                <Text className='text-text-secondary text-sm mb-2'>
                  No budget for this month
                </Text>
                <View className='bg-primary px-4 py-2 rounded-lg'>
                  <Text className='text-white font-semibold'>
                    Create Budget
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </View>

          {/* Upcoming Paycheck */}
          <View
            className='bg-card rounded-xl p-4 mb-4'
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 1,
            }}>
            <View className='flex-row justify-between items-center mb-3'>
              <Text className='text-lg font-semibold text-text-primary'>
                Upcoming Paychecks
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('PaycheckPlanning')}>
                <Text className='text-primary text-sm font-semibold'>
                  See all
                </Text>
              </TouchableOpacity>
            </View>
            {paychecks.length === 0 ? (
              <View className='items-center py-4'>
                <Ionicons name='cash-outline' size={48} color='#9ca3af' />
                <Text className='text-text-secondary mt-2 text-center mb-3'>
                  No paychecks yet
                </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('PaycheckPlanning')}
                  className='bg-primary px-4 py-2 rounded-lg'>
                  <Text className='text-white font-semibold'>
                    Plan Paychecks
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              (() => {
                // Find the next upcoming paycheck
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const sortedPaychecks = [...paychecks].sort((a, b) => {
                  const dateA = new Date(a.next_date);
                  const dateB = new Date(b.next_date);
                  return dateA.getTime() - dateB.getTime();
                });

                const nextPaycheck =
                  sortedPaychecks.find((p) => {
                    const nextDate = new Date(p.next_date);
                    nextDate.setHours(0, 0, 0, 0);
                    return nextDate >= today;
                  }) || sortedPaychecks[0];

                if (!nextPaycheck) return null;

                const nextDate = new Date(nextPaycheck.next_date);
                nextDate.setHours(0, 0, 0, 0);
                const daysUntil = Math.ceil(
                  (nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
                );
                const isUpcoming = daysUntil <= 7 && daysUntil >= 0;

                return (
                  <TouchableOpacity
                    onPress={() =>
                      navigation.navigate('PaycheckAllocation', {
                        paycheckId: nextPaycheck.id,
                      })
                    }
                    className={`border rounded-lg p-3 ${
                      isUpcoming
                        ? 'border-success-500 bg-success-50'
                        : 'border-gray-200'
                    }`}>
                    <View className='flex-row justify-between items-start'>
                      <View className='flex-1'>
                        <Text className='text-base font-semibold text-text-primary'>
                          {nextPaycheck.name}
                        </Text>
                        <Text className='text-xs text-text-secondary mt-0.5'>
                          {nextPaycheck.frequency.charAt(0).toUpperCase()}
                          {nextPaycheck.frequency.slice(1)}
                        </Text>
                      </View>
                      <View className='items-end'>
                        <Text className='text-lg font-bold text-success-600'>
                          {formatCurrency(nextPaycheck.amount)}
                        </Text>
                        <Text
                          className={`text-xs font-semibold mt-0.5 ${
                            isUpcoming
                              ? 'text-success-700'
                              : 'text-text-secondary'
                          }`}>
                          {daysUntil === 0
                            ? 'Today!'
                            : daysUntil === 1
                            ? 'Tomorrow'
                            : daysUntil < 0
                            ? 'Past due'
                            : `${daysUntil} days`}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })()
            )}
          </View>

          {/* Upcoming Subscription Reminders */}
          {upcomingSubscriptions.length > 0 && (
            <View
              className='bg-card rounded-xl p-4 mb-4'
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
                elevation: 1,
              }}>
              <View className='flex-row justify-between items-center mb-3'>
                <Text className='text-lg font-semibold text-text-primary'>
                  Subscription Reminders
                </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Subscriptions')}>
                  <Text className='text-primary text-sm font-semibold'>
                    See all
                  </Text>
                </TouchableOpacity>
              </View>
              {upcomingSubscriptions.slice(0, 3).map((subscription) => {
                const daysUntil = Math.ceil(
                  (new Date(subscription.next_billing_date).getTime() -
                    new Date().getTime()) /
                    (1000 * 60 * 60 * 24)
                );

                return (
                  <TouchableOpacity
                    key={subscription.id}
                    onPress={() =>
                      navigation.navigate('EditSubscription', {
                        subscriptionId: subscription.id,
                      })
                    }
                    className='border border-primary bg-primary-50 rounded-lg p-3 mb-2 last:mb-0'
                    activeOpacity={0.7}>
                    <View className='flex-row justify-between items-start'>
                      <View className='flex-1'>
                        <View className='flex-row items-center mb-1'>
                          <Ionicons
                            name='alert-circle'
                            size={16}
                            color='#FF6B35'
                          />
                          <Text className='text-base font-semibold text-text-primary ml-1.5'>
                            {subscription.name}
                          </Text>
                        </View>
                        <Text className='text-xs text-text-secondary'>
                          {subscription.frequency.charAt(0).toUpperCase()}
                          {subscription.frequency.slice(1)} • Due{' '}
                          {new Date(
                            subscription.next_billing_date
                          ).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </Text>
                      </View>
                      <View className='items-end'>
                        <Text className='text-lg font-bold text-primary-700'>
                          {formatCurrency(subscription.amount)}
                        </Text>
                        <Text className='text-xs font-semibold text-primary-600'>
                          {daysUntil === 0
                            ? 'Today!'
                            : daysUntil === 1
                            ? 'Tomorrow'
                            : `${daysUntil} days`}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Savings Goals */}
          <View
            className='bg-card rounded-xl p-4'
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 1,
            }}>
            <View className='flex-row justify-between items-center mb-3'>
              <Text className='text-lg font-semibold text-text-primary'>
                Savings Goals
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Goals')}>
                <Text className='text-primary text-sm font-semibold'>
                  See all
                </Text>
              </TouchableOpacity>
            </View>

            {loading ? (
              <Text className='text-text-secondary text-center py-4'>
                Loading...
              </Text>
            ) : goals.length === 0 ? (
              <View className='items-center py-6'>
                <Ionicons name='flag-outline' size={48} color='#9ca3af' />
                <Text className='text-text-secondary mt-2 text-center mb-3'>
                  No savings goals yet
                </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Goals')}
                  className='bg-primary px-4 py-2 rounded-lg'>
                  <Text className='text-white font-semibold'>Create Goal</Text>
                </TouchableOpacity>
              </View>
            ) : (
              goals
                .sort((a, b) => {
                  // Sort by highest progress percentage (descending)
                  const progressA =
                    a.target_amount > 0
                      ? (a.current_amount / a.target_amount) * 100
                      : 0;
                  const progressB =
                    b.target_amount > 0
                      ? (b.current_amount / b.target_amount) * 100
                      : 0;
                  return progressB - progressA;
                })
                .slice(0, 3)
                .map((goal, index) => {
                  const progress =
                    goal.target_amount > 0
                      ? Math.min(
                          (goal.current_amount / goal.target_amount) * 100,
                          100
                        )
                      : 0;

                  return (
                    <TouchableOpacity
                      key={goal.id}
                      onPress={() =>
                        navigation.navigate('EditGoal', { goalId: goal.id })
                      }
                      className={index < 2 ? 'mb-4' : ''}
                      activeOpacity={0.7}>
                      <View className='flex-row justify-between items-center mb-1'>
                        <Text className='text-text-secondary font-medium'>
                          {goal.name}
                        </Text>
                        <Text className='text-sm text-text-tertiary'>
                          {formatCurrency(goal.current_amount)} /{' '}
                          {formatCurrency(goal.target_amount)}
                        </Text>
                      </View>
                      <View className='mt-1 h-3 bg-gray-200 rounded-full'>
                        <View
                          className={`h-3 rounded-full ${
                            progress >= 100 ? 'bg-success-500' : 'bg-primary'
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </View>
                    </TouchableOpacity>
                  );
                })
            )}
          </View>

          {/* Recent Transactions */}
          <View
            className='bg-card rounded-xl p-4 my-4'
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 1,
            }}>
            <View className='flex-row justify-between items-center mb-3'>
              <Text className='text-lg font-semibold text-text-primary'>
                Recent Transactions
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Transactions')}>
                <Text className='text-primary text-sm font-semibold'>
                  See all
                </Text>
              </TouchableOpacity>
            </View>

            {loading ? (
              <Text className='text-text-secondary text-center py-4'>
                Loading...
              </Text>
            ) : transactions.length === 0 ? (
              <View className='items-center py-6'>
                <Ionicons name='receipt-outline' size={48} color='#9ca3af' />
                <Text className='text-text-secondary mt-2 text-center mb-3'>
                  No transactions yet
                </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('AddTransaction')}
                  className='bg-primary px-4 py-2 rounded-lg'>
                  <Text className='text-white font-semibold'>
                    Add Transaction
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              transactions.slice(0, 5).map((transaction, index) => {
                const account = accounts.find(
                  (acc) => acc.id === transaction.account_id
                );
                const isIncome = transaction.type === 'income';
                const isExpense = transaction.type === 'expense';

                // Format date
                const transactionDate = new Date(transaction.date);
                const formattedDate = transactionDate.toLocaleDateString(
                  'en-US',
                  {
                    month: 'short',
                    day: 'numeric',
                  }
                );

                return (
                  <TouchableOpacity
                    key={transaction.id}
                    onPress={() =>
                      navigation.navigate('EditTransaction', {
                        transactionId: transaction.id,
                      })
                    }
                    className={`flex-row items-center py-3 border-b border-gray-100 ${
                      index === transactions.slice(0, 5).length - 1
                        ? 'border-b-0'
                        : ''
                    }`}
                    activeOpacity={0.7}>
                    <View
                      className={`p-2 rounded-full mr-3 ${
                        isIncome
                          ? 'bg-success-100'
                          : isExpense
                          ? 'bg-error-100'
                          : 'bg-gray-100'
                      }`}>
                      <Ionicons
                        name={
                          isIncome
                            ? 'arrow-down'
                            : isExpense
                            ? 'arrow-up'
                            : 'swap-horizontal'
                        }
                        size={20}
                        color={
                          isIncome
                            ? '#10B981'
                            : isExpense
                            ? '#EF4444'
                            : '#6B7280'
                        }
                      />
                    </View>
                    <View className='flex-1'>
                      <Text className='text-base font-semibold text-text-primary mb-0.5'>
                        {transaction.description}
                      </Text>
                      <Text className='text-xs text-text-secondary'>
                        {account?.name || 'Unknown Account'} • {formattedDate}
                      </Text>
                    </View>
                    <Text
                      className={`text-lg font-bold ${
                        isIncome
                          ? 'text-success-600'
                          : isExpense
                          ? 'text-error-600'
                          : 'text-text-primary'
                      }`}>
                      {isIncome ? '+' : isExpense ? '-' : ''}
                      {formatCurrency(transaction.amount)}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
