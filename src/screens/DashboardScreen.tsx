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
import { getOrCreateCurrentMonthBudget, getBudgetCategories } from '../services/budgets';
import { getPaycheckPlans, processDuePaychecks } from '../services/paychecks';
import { getUpcomingSubscriptions } from '../services/subscriptions';
import { formatCurrency } from '../utils/currency';
import { Account, Budget, BudgetCategory, PaycheckPlan, Subscription } from '../types';
import { useFocusEffect } from '@react-navigation/native';

export default function DashboardScreen({ navigation }: any) {
  const { user, signOut } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [paychecks, setPaychecks] = useState<PaycheckPlan[]>([]);
  const [upcomingSubscriptions, setUpcomingSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAccounts = useCallback(async () => {
    if (!user) return;

    try {
      // Process any due paychecks first
      await processDuePaychecks(user.id);

      const [accountsData, budgetData, paychecksData, subscriptionsData] = await Promise.all([
        getAccounts(user.id),
        getOrCreateCurrentMonthBudget(user.id),
        getPaycheckPlans(user.id),
        getUpcomingSubscriptions(user.id),
      ]);
      setAccounts(accountsData);
      setBudget(budgetData);
      setPaychecks(paychecksData);
      setUpcomingSubscriptions(subscriptionsData);

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
    <SafeAreaView className='flex-1 bg-gray-50' edges={['top']}>
      <ScrollView
        className='flex-1'
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        <View className='p-6'>
          <View className='flex-row justify-between items-center mb-6'>
            <Text className='text-2xl font-bold text-gray-800'>Dashboard</Text>
            <TouchableOpacity
              onPress={signOut}
              className='bg-red-500 px-4 py-2 rounded-lg'>
              <Text className='text-white font-semibold'>Sign Out</Text>
            </TouchableOpacity>
          </View>

          <Text className='text-gray-600 mb-2'>Welcome back!</Text>

          {/* Net Worth Summary */}
          <View className='bg-blue-600 rounded-xl p-6 mb-6 shadow-lg'>
            <Text className='text-blue-100 text-sm font-medium mb-1'>
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

          {/* Account Balances Section */}
          <View className='bg-white rounded-xl p-4 mb-4 shadow-sm'>
            <View className='flex-row justify-between items-center mb-3'>
              <Text className='text-lg font-semibold text-gray-800'>
                Recent Accounts
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Accounts')}>
                <Text className='text-blue-600 text-sm font-semibold'>
                  See all
                </Text>
              </TouchableOpacity>
            </View>
            {loading ? (
              <Text className='text-gray-500 text-center py-4'>Loading...</Text>
            ) : accounts.length === 0 ? (
              <View className='items-center py-6'>
                <Ionicons name='wallet-outline' size={48} color='#9ca3af' />
                <Text className='text-gray-500 mt-2 text-center'>
                  No accounts yet
                </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('AddAccount')}
                  className='bg-blue-600 px-4 py-2 rounded-lg mt-3'>
                  <Text className='text-white font-semibold'>Add Account</Text>
                </TouchableOpacity>
              </View>
            ) : (
              accounts.slice(0, 3).map((account) => {
                const isDebt =
                  account.type === 'credit_card' || account.type === 'loan';

                return (
                  <View
                    key={account.id}
                    className='flex-row justify-between items-center mb-3 last:mb-0'>
                    <Text className='text-gray-600'>{account.name}</Text>
                    <View className='items-end'>
                      {isDebt && (
                        <Text className='text-xs text-orange-600 font-medium'>
                          Debt Owed
                        </Text>
                      )}
                      <Text
                        className={`text-lg font-semibold ${
                          isDebt
                            ? 'text-red-600'
                            : account.balance >= 0
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}>
                        {formatCurrency(account.balance)}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>

          {/* Monthly Budget Overview */}
          <View className='bg-white rounded-xl p-4 mb-4 shadow-sm'>
            <View className='flex-row justify-between items-center mb-3'>
              <Text className='text-lg font-semibold text-gray-800'>
                {new Date().toLocaleDateString('en-US', { month: 'long' })} Budget
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Budget')}>
                <Text className='text-blue-600 text-sm font-semibold'>
                  See all
                </Text>
              </TouchableOpacity>
            </View>
            {budget ? (
              <>
                <View className='flex-row justify-between items-center mb-2'>
                  <Text className='text-gray-600'>Income</Text>
                  <Text className='text-lg font-semibold text-green-600'>
                    {formatCurrency(budget.total_income)}
                  </Text>
                </View>
                <View className='flex-row justify-between items-center mb-2'>
                  <Text className='text-gray-600'>Allocated</Text>
                  <Text className='text-lg font-semibold text-blue-600'>
                    {formatCurrency(budget.total_allocated)}
                  </Text>
                </View>
                <View className='flex-row justify-between items-center'>
                  <Text className='text-gray-600'>Remaining</Text>
                  <Text className={`text-lg font-semibold ${
                    budget.total_income - budget.total_allocated >= 0
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}>
                    {formatCurrency(Math.abs(budget.total_income - budget.total_allocated))}
                  </Text>
                </View>
                {categories.length === 0 && (
                  <TouchableOpacity
                    onPress={() => navigation.navigate('Budget')}
                    className='bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3'>
                    <Text className='text-blue-700 text-sm text-center'>
                      Tap to add budget categories
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <TouchableOpacity
                onPress={() => navigation.navigate('Budget')}
                className='items-center py-4'>
                <Text className='text-gray-500 text-sm mb-2'>No budget for this month</Text>
                <View className='bg-blue-600 px-4 py-2 rounded-lg'>
                  <Text className='text-white font-semibold'>Create Budget</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>

          {/* Upcoming Paycheck */}
          <View className='bg-white rounded-xl p-4 mb-4 shadow-sm'>
            <View className='flex-row justify-between items-center mb-3'>
              <Text className='text-lg font-semibold text-gray-800'>
                Upcoming Paychecks
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('PaycheckPlanning')}>
                <Text className='text-blue-600 text-sm font-semibold'>
                  See all
                </Text>
              </TouchableOpacity>
            </View>
            {paychecks.length === 0 ? (
              <View className='items-center py-4'>
                <Ionicons name='cash-outline' size={48} color='#9ca3af' />
                <Text className='text-gray-500 mt-2 text-center mb-3'>
                  No paychecks yet
                </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('PaycheckPlanning')}
                  className='bg-blue-600 px-4 py-2 rounded-lg'>
                  <Text className='text-white font-semibold'>Plan Paychecks</Text>
                </TouchableOpacity>
              </View>
            ) : (() => {
              // Find the next upcoming paycheck
              const today = new Date();
              today.setHours(0, 0, 0, 0);

              const sortedPaychecks = [...paychecks].sort((a, b) => {
                const dateA = new Date(a.next_date);
                const dateB = new Date(b.next_date);
                return dateA.getTime() - dateB.getTime();
              });

              const nextPaycheck = sortedPaychecks.find(p => {
                const nextDate = new Date(p.next_date);
                nextDate.setHours(0, 0, 0, 0);
                return nextDate >= today;
              }) || sortedPaychecks[0];

              if (!nextPaycheck) return null;

              const nextDate = new Date(nextPaycheck.next_date);
              nextDate.setHours(0, 0, 0, 0);
              const daysUntil = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              const isUpcoming = daysUntil <= 7 && daysUntil >= 0;

              return (
                <TouchableOpacity
                  onPress={() => navigation.navigate('PaycheckAllocation', { paycheckId: nextPaycheck.id })}
                  className={`border rounded-lg p-3 ${
                    isUpcoming ? 'border-green-500 bg-green-50' : 'border-gray-200'
                  }`}>
                  <View className='flex-row justify-between items-start'>
                    <View className='flex-1'>
                      <Text className='text-base font-semibold text-gray-800'>
                        {nextPaycheck.name}
                      </Text>
                      <Text className='text-xs text-gray-500 mt-0.5'>
                        {nextPaycheck.frequency.charAt(0).toUpperCase()}
                        {nextPaycheck.frequency.slice(1)}
                      </Text>
                    </View>
                    <View className='items-end'>
                      <Text className='text-lg font-bold text-green-600'>
                        {formatCurrency(nextPaycheck.amount)}
                      </Text>
                      <Text className={`text-xs font-semibold mt-0.5 ${
                        isUpcoming ? 'text-green-700' : 'text-gray-600'
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
            })()}
          </View>

          {/* Upcoming Subscription Reminders */}
          {upcomingSubscriptions.length > 0 && (
            <View className='bg-white rounded-xl p-4 mb-4 shadow-sm'>
              <View className='flex-row justify-between items-center mb-3'>
                <Text className='text-lg font-semibold text-gray-800'>
                  Subscription Reminders
                </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Subscriptions')}>
                  <Text className='text-blue-600 text-sm font-semibold'>
                    See all
                  </Text>
                </TouchableOpacity>
              </View>
              {upcomingSubscriptions.slice(0, 3).map((subscription) => {
                const daysUntil = Math.ceil(
                  (new Date(subscription.next_billing_date).getTime() - new Date().getTime()) /
                    (1000 * 60 * 60 * 24)
                );

                return (
                  <TouchableOpacity
                    key={subscription.id}
                    onPress={() => navigation.navigate('EditSubscription', { subscriptionId: subscription.id })}
                    className='border border-orange-500 bg-orange-50 rounded-lg p-3 mb-2 last:mb-0'
                    activeOpacity={0.7}>
                    <View className='flex-row justify-between items-start'>
                      <View className='flex-1'>
                        <View className='flex-row items-center mb-1'>
                          <Ionicons name='alert-circle' size={16} color='#ea580c' />
                          <Text className='text-base font-semibold text-gray-800 ml-1.5'>
                            {subscription.name}
                          </Text>
                        </View>
                        <Text className='text-xs text-gray-600'>
                          {subscription.frequency.charAt(0).toUpperCase()}
                          {subscription.frequency.slice(1)} • Due{' '}
                          {new Date(subscription.next_billing_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </Text>
                      </View>
                      <View className='items-end'>
                        <Text className='text-lg font-bold text-orange-700'>
                          {formatCurrency(subscription.amount)}
                        </Text>
                        <Text className='text-xs font-semibold text-orange-600'>
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
          <View className='bg-white rounded-xl p-4 shadow-sm'>
            <Text className='text-lg font-semibold text-gray-800 mb-3'>
              Savings Goals
            </Text>
            <View className='mb-3'>
              <View className='flex-row justify-between items-center mb-1'>
                <Text className='text-gray-600'>Emergency Fund</Text>
                <Text className='text-sm text-gray-500'>$5,234 / $10,000</Text>
              </View>
              <View className='h-2 bg-gray-200 rounded-full'>
                <View
                  className='h-2 bg-green-500 rounded-full'
                  style={{ width: '52%' }}
                />
              </View>
            </View>
            <View>
              <View className='flex-row justify-between items-center mb-1'>
                <Text className='text-gray-600'>Vacation</Text>
                <Text className='text-sm text-gray-500'>$1,840 / $3,000</Text>
              </View>
              <View className='h-2 bg-gray-200 rounded-full'>
                <View
                  className='h-2 bg-blue-500 rounded-full'
                  style={{ width: '61%' }}
                />
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
