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
import { getAccounts } from '../services/accounts';
import { formatCurrency } from '../utils/currency';
import { Account } from '../types';

export default function AccountsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('Net Worth');
  const [selectedPeriod, setSelectedPeriod] = useState('1M');

  const loadAccounts = useCallback(async () => {
    if (!user) return;

    try {
      const data = await getAccounts(user.id);
      setAccounts(data);

      // Reset to "Net Worth" if currently selected institution no longer exists
      const institutions = Array.from(
        new Set(data.map(acc => acc.institution).filter(Boolean))
      );
      if (activeTab !== 'Net Worth' && !institutions.includes(activeTab)) {
        setActiveTab('Net Worth');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, activeTab]);

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
  const typeOrder = [
    'checking',
    'savings',
    'credit_card',
    'investment',
    'loan',
  ];
  const sortedTypes = Object.keys(groupedAccounts).sort(
    (a, b) => typeOrder.indexOf(a) - typeOrder.indexOf(b)
  );

  // Calculate net worth (assets - debts)
  const netWorth = accounts.reduce((sum, acc) => {
    const isDebt = acc.type === 'credit_card' || acc.type === 'loan';
    return sum + (isDebt ? -acc.balance : acc.balance);
  }, 0);

  // Calculate total assets
  const totalAssets = accounts.reduce((sum, acc) => {
    const isAsset = acc.type !== 'credit_card' && acc.type !== 'loan';
    return sum + (isAsset ? acc.balance : 0);
  }, 0);

  // Get unique institutions from accounts
  const uniqueInstitutions = Array.from(
    new Set(accounts.map(acc => acc.institution).filter(Boolean))
  ).sort();

  // Tabs configuration - "Net Worth" + institution names
  const tabs = ['Net Worth', ...uniqueInstitutions];
  const periods = ['1M', '3M', '6M', '1Y', 'ALL'];

  // Filter accounts based on selected tab
  const filteredAccounts = activeTab === 'Net Worth'
    ? accounts
    : accounts.filter(acc => acc.institution === activeTab);

  // Group filtered accounts by type
  const filteredGroupedAccounts = filteredAccounts.reduce((groups, account) => {
    const type = account.type;
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(account);
    return groups;
  }, {} as Record<string, Account[]>);

  const filteredSortedTypes = Object.keys(filteredGroupedAccounts).sort(
    (a, b) => typeOrder.indexOf(a) - typeOrder.indexOf(b)
  );

  // Calculate net worth for filtered accounts (either all or specific institution)
  const displayNetWorth = filteredAccounts.reduce((sum, acc) => {
    const isDebt = acc.type === 'credit_card' || acc.type === 'loan';
    return sum + (isDebt ? -acc.balance : acc.balance);
  }, 0);

  // Calculate total assets for filtered accounts
  const displayTotalAssets = filteredAccounts.reduce((sum, acc) => {
    const isAsset = acc.type !== 'credit_card' && acc.type !== 'loan';
    return sum + (isAsset ? acc.balance : 0);
  }, 0);

  return (
    <SafeAreaView className='flex-1 bg-card' edges={['top']}>
      <View className='flex-1 bg-background'>
        {/* Header with tabs */}
        <View className='bg-card px-6 pt-4 pb-0 border-b border-gray-200'>
          <View className='flex-row justify-between items-center mb-4'>
            <Text className='text-2xl font-bold text-text-primary'>
              Accounts
            </Text>
            <View className='flex-row gap-2'>
              <TouchableOpacity>
                <Ionicons
                  name='ellipsis-horizontal'
                  size={24}
                  color='#1F2937'
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigation.navigate('AddAccount')}>
                <Ionicons name='add' size={28} color='#1F2937' />
              </TouchableOpacity>
            </View>
          </View>

          {/* Tab Navigation */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className='mb-2'>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                className={`mr-6 pb-3 ${
                  activeTab === tab ? 'border-b-2 border-text-primary' : ''
                }`}>
                <Text
                  className={`text-sm font-semibold ${
                    activeTab === tab
                      ? 'text-text-primary'
                      : 'text-text-secondary'
                  }`}>
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <ScrollView
          className='flex-1'
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }>
          {loading ? (
            <Text className='text-text-secondary text-center mt-8'>
              Loading accounts...
            </Text>
          ) : accounts.length === 0 ? (
            <View className='items-center mt-8 px-4'>
              <Ionicons name='wallet-outline' size={64} color='#9ca3af' />
              <Text className='text-text-secondary mt-4 text-center'>
                No accounts yet. Add your first account to get started!
              </Text>
            </View>
          ) : filteredAccounts.length === 0 ? (
            <View className='items-center mt-8 px-4'>
              <Ionicons name='business-outline' size={64} color='#9ca3af' />
              <Text className='text-text-primary font-semibold text-lg mt-4 text-center'>
                No accounts from {activeTab}
              </Text>
              <Text className='text-text-secondary mt-2 text-center'>
                All accounts from this institution have been removed.
              </Text>
            </View>
          ) : (
            <>
              {/* Net Worth Display */}
              <View className='px-6 pt-6 pb-4'>
                <Text className='text-text-secondary text-sm mb-1'>
                  {activeTab === 'Net Worth' ? 'Total Net Worth' : `${activeTab} Total`}
                </Text>
                <Text className='text-5xl font-bold text-text-primary mb-2'>
                  {formatCurrency(displayNetWorth)}
                </Text>
                <View className='flex-row items-center'>
                  <Ionicons name='trending-up' size={16} color='#10B981' />
                  <Text className='text-success-600 font-semibold ml-1'>
                    +5.2%
                  </Text>
                  <Text className='text-text-secondary ml-2'>1 month</Text>
                </View>
              </View>

              {/* Chart Placeholder */}
              <View className='px-6 pb-4'>
                <View className='h-48 bg-gradient-to-b from-success-50 to-card rounded-xl border border-gray-200 items-center justify-center'>
                  <Text className='text-text-tertiary'>Chart Coming Soon</Text>
                </View>
              </View>

              {/* Period Selector */}
              <View className='px-6 pb-6'>
                <View className='flex-row justify-center gap-2'>
                  {periods.map((period) => (
                    <TouchableOpacity
                      key={period}
                      onPress={() => setSelectedPeriod(period)}
                      className={`px-4 py-2 rounded-full ${
                        selectedPeriod === period
                          ? 'bg-text-primary'
                          : 'bg-gray-200'
                      }`}>
                      <Text
                        className={`text-sm font-semibold ${
                          selectedPeriod === period
                            ? 'text-white'
                            : 'text-text-secondary'
                        }`}>
                        {period}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Accounts List */}
              <View className='px-6 pb-6'>
                {filteredSortedTypes.map((type) => {
                  const groupAccounts = filteredGroupedAccounts[type];
                  const groupTotal = getGroupTotal(groupAccounts);

                  return (
                    <View key={type} className='mb-6'>
                      {/* Group Header */}
                      <View className='flex-row justify-between items-center mb-3'>
                        <Text className='text-lg font-bold text-text-primary'>
                          {getTypeName(type)}
                        </Text>
                        <Text className='text-lg font-bold text-text-primary'>
                          {formatCurrency(groupTotal)}
                        </Text>
                      </View>

                      {/* Accounts in Group */}
                      {groupAccounts.map((account) => {
                        const isDebt =
                          account.type === 'credit_card' ||
                          account.type === 'loan';
                        const percentOfAssets =
                          displayTotalAssets > 0
                            ? ((account.balance / displayTotalAssets) * 100).toFixed(1)
                            : '0.0';

                        return (
                          <TouchableOpacity
                            key={account.id}
                            onPress={() =>
                              navigation.navigate('EditAccount', {
                                accountId: account.id,
                              })
                            }
                            className='bg-card rounded-2xl p-4 mb-3 border border-gray-100'
                            style={{
                              shadowColor: '#000',
                              shadowOffset: { width: 0, height: 1 },
                              shadowOpacity: 0.05,
                              shadowRadius: 2,
                              elevation: 1,
                            }}
                            activeOpacity={0.7}>
                            <View className='flex-row items-center justify-between'>
                              <View className='flex-row items-center flex-1'>
                                <View className='bg-primary-100 p-3 rounded-full mr-3'>
                                  <Ionicons
                                    name={getAccountIcon(account.type) as any}
                                    size={24}
                                    color='#FF6B35'
                                  />
                                </View>
                                <View className='flex-1'>
                                  <Text className='text-base font-semibold text-text-primary mb-1'>
                                    {account.name}
                                  </Text>
                                  {account.institution && (
                                    <Text className='text-sm text-text-secondary mb-1'>
                                      {account.institution}
                                    </Text>
                                  )}
                                  <View className='flex-row items-center'>
                                    <Text className='text-xs text-text-tertiary'>
                                      9 hours ago
                                    </Text>
                                    {!isDebt && displayTotalAssets > 0 && (
                                      <Text className='text-xs text-text-tertiary ml-2'>
                                        • {percentOfAssets}% of assets
                                      </Text>
                                    )}
                                  </View>
                                </View>
                              </View>
                              <View className='items-end'>
                                <Text
                                  className={`text-xl font-bold ${
                                    isDebt
                                      ? 'text-error-600'
                                      : account.balance >= 0
                                      ? 'text-text-primary'
                                      : 'text-error-600'
                                  }`}>
                                  {formatCurrency(account.balance)}
                                </Text>
                              </View>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  );
                })}
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
