import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import {
  getIncomeSource,
  getAccountSplits,
  createAccountSplit,
  updateAccountSplit,
  deleteAccountSplit,
  getAccountSplitTotalPercentage,
  getAccountSplitTotalFixed,
} from '../services/incomeTemplates';
import { getBudgetableAccounts } from '../services/accounts';
import { formatCurrency, parseCurrencyInput, formatCurrencyInput } from '../utils/currency';
import { IncomeSource, IncomeAccountSplit, Account } from '../types';

type AllocationType = 'percentage' | 'fixed' | 'remainder';

export default function AccountSplitsScreen({ route, navigation }: any) {
  const { sourceId } = route.params;
  const { user } = useAuth();
  const [source, setSource] = useState<IncomeSource | null>(null);
  const [splits, setSplits] = useState<IncomeAccountSplit[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSplit, setEditingSplit] = useState<IncomeAccountSplit | null>(null);

  // Form state
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [allocationType, setAllocationType] = useState<AllocationType>('percentage');
  const [allocationValue, setAllocationValue] = useState('');
  const [priority, setPriority] = useState('0');
  const [saving, setSaving] = useState(false);

  // Stats
  const [totalPercentage, setTotalPercentage] = useState(0);
  const [totalFixed, setTotalFixed] = useState(0);

  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      const [sourceData, splitsData, accountsData, percentage, fixed] = await Promise.all([
        getIncomeSource(sourceId),
        getAccountSplits(sourceId),
        getBudgetableAccounts(user.id),
        getAccountSplitTotalPercentage(sourceId),
        getAccountSplitTotalFixed(sourceId),
      ]);

      setSource(sourceData);
      setSplits(splitsData);
      setAccounts(accountsData);
      setTotalPercentage(percentage);
      setTotalFixed(fixed);

      navigation.setOptions({
        title: sourceData.name,
      });
    } catch (error: any) {
      console.error('Error loading account splits:', error);
      Alert.alert('Error', 'Failed to load account splits');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sourceId, navigation, user]);

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

  const openAddModal = () => {
    setEditingSplit(null);
    setSelectedAccountId('');
    setAllocationType('percentage');
    setAllocationValue('');
    setPriority(splits.length.toString());
    setShowAddModal(true);
  };

  const openEditModal = (split: IncomeAccountSplit) => {
    setEditingSplit(split);
    setSelectedAccountId(split.account_id);
    setAllocationType(split.allocation_type);
    setAllocationValue(
      split.allocation_type === 'remainder'
        ? ''
        : split.allocation_type === 'percentage'
        ? split.allocation_value.toString()
        : (split.allocation_value / 100).toFixed(2)
    );
    setPriority(split.priority.toString());
    setShowAddModal(true);
  };

  const handleSave = async () => {
    if (!selectedAccountId) {
      Alert.alert('Error', 'Please select an account');
      return;
    }

    // Only validate allocation value if not remainder type
    if (allocationType !== 'remainder' && !allocationValue.trim()) {
      Alert.alert('Error', 'Please enter an allocation value');
      return;
    }

    setSaving(true);

    try {
      // Remainder type doesn't need a value, set to 0
      const value =
        allocationType === 'remainder'
          ? 0
          : allocationType === 'percentage'
          ? parseFloat(allocationValue)
          : parseCurrencyInput(allocationValue);

      const priorityNum = parseInt(priority) || 0;

      if (editingSplit) {
        await updateAccountSplit(editingSplit.id, {
          account_id: selectedAccountId,
          allocation_type: allocationType,
          allocation_value: value,
          priority: priorityNum,
        });
        Alert.alert('Success', 'Account split updated successfully!');
      } else {
        await createAccountSplit(sourceId, {
          account_id: selectedAccountId,
          allocation_type: allocationType,
          allocation_value: value,
          priority: priorityNum,
        });
        Alert.alert('Success', 'Account split created successfully!');
      }

      setShowAddModal(false);
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save account split');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (split: IncomeAccountSplit) => {
    const accountName = getAccountName(split.account_id);
    Alert.alert(
      'Delete Account Split',
      `Are you sure you want to delete the split for "${accountName}"? This will also delete all category templates for this account.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccountSplit(split.id);
              Alert.alert('Success', 'Account split deleted successfully!');
              loadData();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete account split');
            }
          },
        },
      ]
    );
  };

  const handleConfigureCategories = (split: IncomeAccountSplit) => {
    navigation.navigate('IncomeTemplate', {
      sourceId,
      accountSplitId: split.id,
      accountName: getAccountName(split.account_id),
    });
  };

  const getAccountName = (accountId: string) => {
    const account = accounts.find((acc) => acc.id === accountId);
    return account?.name || 'Unknown Account';
  };

  const formatAllocationDisplay = (split: IncomeAccountSplit) => {
    if (split.allocation_type === 'remainder') {
      return 'Remainder';
    } else if (split.allocation_type === 'percentage') {
      return `${split.allocation_value}%`;
    } else {
      return formatCurrency(split.allocation_value);
    }
  };

  const allocationTypes = [
    { value: 'percentage' as AllocationType, label: 'Percentage', icon: 'percent' },
    { value: 'fixed' as AllocationType, label: 'Fixed Amount', icon: 'cash' },
    { value: 'remainder' as AllocationType, label: 'Remainder', icon: 'repeat' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
      <View className="flex-1">
        {/* Header with Source Info */}
        {source && (
          <View className="px-6 py-4 bg-card border-b border-gray-200">
            <Text className="text-lg font-bold text-text-primary">{source.name}</Text>
            {source.expected_amount > 0 && (
              <Text className="text-sm text-text-secondary mt-1">
                Expected: {formatCurrency(source.expected_amount)}
              </Text>
            )}
            <View className="flex-row mt-3 gap-4">
              <View className="flex-1">
                <Text className="text-xs text-text-secondary">Percentage Total</Text>
                <Text
                  className={`text-base font-bold ${
                    totalPercentage > 100 ? 'text-error-500' : 'text-text-primary'
                  }`}>
                  {totalPercentage}%
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-xs text-text-secondary">Fixed Total</Text>
                <Text className="text-base font-bold text-text-primary">
                  {formatCurrency(totalFixed)}
                </Text>
              </View>
            </View>
          </View>
        )}

        <ScrollView
          className="flex-1"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }>
          {loading ? (
            <Text className="text-text-secondary text-center mt-8">
              Loading account splits...
            </Text>
          ) : splits.length === 0 ? (
            <View className="items-center mt-16 px-6">
              <Ionicons name="git-network-outline" size={64} color="#9ca3af" />
              <Text className="text-text-primary font-semibold text-lg mt-4 text-center">
                No account splits yet
              </Text>
              <Text className="text-text-secondary mt-2 text-center mb-6">
                Split your income across different accounts, then configure category allocations for each account.
              </Text>
              <TouchableOpacity
                onPress={openAddModal}
                className="bg-primary px-6 py-3 rounded-lg">
                <Text className="text-white font-semibold">
                  Create Your First Split
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="p-6">
              {/* Add Split Button */}
              <TouchableOpacity
                onPress={openAddModal}
                className="bg-primary px-4 py-3 rounded-lg mb-4">
                <View className="flex-row items-center justify-center">
                  <Ionicons name="add" size={20} color="white" />
                  <Text className="text-white font-semibold ml-2">Add Account Split</Text>
                </View>
              </TouchableOpacity>

              {/* Info Banner */}
              <View className="mb-4 bg-blue-50 rounded-lg p-4">
                <View className="flex-row items-start">
                  <Ionicons name="information-circle" size={20} color="#3B82F6" />
                  <Text className="text-blue-700 text-sm ml-2 flex-1">
                    Split your income across accounts first, then tap "Configure Categories" to set up how money is allocated within each account.
                  </Text>
                </View>
              </View>

              {/* Splits List */}
              {splits.map((split) => (
                <View
                  key={split.id}
                  className="bg-card rounded-xl p-4 mb-3 border border-gray-200">
                  <View className="flex-row justify-between items-start mb-2">
                    <View className="flex-1">
                      <View className="flex-row items-center">
                        <Text className="text-xs text-text-secondary mr-2">
                          #{split.priority}
                        </Text>
                        <Text className="text-lg font-bold text-text-primary">
                          {getAccountName(split.account_id)}
                        </Text>
                      </View>
                    </View>
                    <View className="flex-row items-center">
                      <TouchableOpacity
                        onPress={() => openEditModal(split)}
                        className="mr-2 p-2">
                        <Ionicons
                          name="create-outline"
                          size={20}
                          color="#6b7280"
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDelete(split)}
                        className="p-2">
                        <Ionicons name="trash-outline" size={20} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View className="bg-primary-50 rounded-lg p-3 mt-2">
                    <Text className="text-primary font-bold text-xl text-center">
                      {formatAllocationDisplay(split)}
                    </Text>
                    <Text className="text-xs text-primary text-center mt-1">
                      {split.allocation_type === 'remainder'
                        ? 'whatever is left'
                        : split.allocation_type === 'percentage'
                        ? 'of total income'
                        : 'fixed amount'}
                    </Text>
                  </View>

                  {/* Configure Categories Button */}
                  <TouchableOpacity
                    onPress={() => handleConfigureCategories(split)}
                    className="bg-white border border-primary px-4 py-3 rounded-lg mt-3 flex-row items-center justify-center">
                    <Ionicons name="list-outline" size={18} color="#FF6B35" />
                    <Text className="text-primary font-semibold ml-2">
                      Configure Categories
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Add/Edit Modal */}
        <Modal
          visible={showAddModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowAddModal(false)}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1">
            <View className="flex-1 bg-black/50 justify-end">
              <View className="bg-background rounded-t-3xl pb-8 max-h-5/6">
                {/* Header */}
                <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-200">
                  <TouchableOpacity onPress={() => setShowAddModal(false)}>
                    <Text className="text-base font-semibold text-gray-600">
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <Text className="text-lg font-bold text-text-primary">
                    {editingSplit ? 'Edit Account Split' : 'New Account Split'}
                  </Text>
                  <TouchableOpacity onPress={handleSave} disabled={saving}>
                    <Text
                      className={`text-base font-semibold ${
                        saving ? 'text-gray-400' : 'text-primary'
                      }`}>
                      {saving ? 'Saving...' : 'Save'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <ScrollView className="px-6 py-4">
                  {/* Account Selection */}
                  <View className="mb-4">
                    <Text className="text-base font-semibold text-text-primary mb-2">
                      Account *
                    </Text>
                    <TouchableOpacity
                      onPress={() =>
                        navigation.navigate('SelectAccount', {
                          selectedAccountId,
                          onSelect: (accountId: string) => setSelectedAccountId(accountId),
                        })
                      }
                      className="border border-gray-200 rounded-lg px-4 py-3 bg-card flex-row items-center justify-between">
                      <Text className={selectedAccountId ? 'text-text-primary' : 'text-gray-400'}>
                        {selectedAccountId ? getAccountName(selectedAccountId) : 'Select account'}
                      </Text>
                      <Ionicons name='chevron-down' size={20} color='#9ca3af' />
                    </TouchableOpacity>
                  </View>

                  {/* Allocation Type */}
                  <View className="mb-4">
                    <Text className="text-base font-semibold text-text-primary mb-2">
                      Allocation Type *
                    </Text>
                    <View className="flex-row gap-2">
                      {allocationTypes.map((type) => (
                        <TouchableOpacity
                          key={type.value}
                          onPress={() => {
                            setAllocationType(type.value);
                            setAllocationValue('');
                          }}
                          className={`flex-1 flex-row items-center justify-center px-4 py-3 rounded-lg border ${
                            allocationType === type.value
                              ? 'bg-primary-100 border-primary'
                              : 'bg-card border-gray-200'
                          }`}>
                          <Ionicons
                            name={type.icon as any}
                            size={20}
                            color={allocationType === type.value ? '#FF6B35' : '#6b7280'}
                          />
                          <Text
                            className={`ml-2 text-sm ${
                              allocationType === type.value
                                ? 'text-primary font-semibold'
                                : 'text-gray-700'
                            }`}>
                            {type.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Allocation Value - only show if not remainder */}
                  {allocationType !== 'remainder' && (
                    <View className="mb-4">
                      <Text className="text-base font-semibold text-text-primary mb-2">
                        {allocationType === 'percentage' ? 'Percentage' : 'Amount'} *
                      </Text>
                      {allocationType === 'percentage' ? (
                        <View className="flex-row items-center bg-card border border-gray-200 rounded-lg px-4">
                          <TextInput
                            className="flex-1 py-3 text-base text-text-primary"
                            placeholder="0"
                            value={allocationValue}
                            onChangeText={setAllocationValue}
                            keyboardType="decimal-pad"
                            placeholderTextColor="#9ca3af"
                          />
                          <Text className="text-text-secondary text-lg">%</Text>
                        </View>
                      ) : (
                        <View className="flex-row items-center bg-card border border-gray-200 rounded-lg px-4">
                          <Text className="text-text-secondary text-lg">$</Text>
                          <TextInput
                            className="flex-1 py-3 text-base text-text-primary ml-2"
                            placeholder="0.00"
                            value={allocationValue}
                            onChangeText={setAllocationValue}
                            onBlur={() => {
                              if (allocationValue) {
                                setAllocationValue(formatCurrencyInput(allocationValue));
                              }
                            }}
                            keyboardType="decimal-pad"
                            placeholderTextColor="#9ca3af"
                          />
                        </View>
                      )}
                      <Text className="text-xs text-text-secondary mt-1">
                        {allocationType === 'percentage'
                          ? 'Percentage of total income (0-100)'
                          : 'Fixed dollar amount to send to this account'}
                      </Text>
                    </View>
                  )}

                  {/* Remainder Info */}
                  {allocationType === 'remainder' && (
                    <View className="mb-4 bg-blue-50 rounded-lg p-4">
                      <View className="flex-row items-start">
                        <Ionicons name="information-circle" size={20} color="#3B82F6" />
                        <Text className="text-blue-700 text-sm ml-2 flex-1">
                          This account will receive whatever amount is left after all other splits are applied.
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Priority */}
                  <View className="mb-4">
                    <Text className="text-base font-semibold text-text-primary mb-2">
                      Priority
                    </Text>
                    <TextInput
                      className="bg-card border border-gray-200 rounded-lg px-4 py-3 text-base text-text-primary"
                      placeholder="0"
                      value={priority}
                      onChangeText={setPriority}
                      keyboardType="number-pad"
                      placeholderTextColor="#9ca3af"
                    />
                    <Text className="text-xs text-text-secondary mt-1">
                      Lower numbers are applied first. Fixed amounts should have higher
                      priority than percentages.
                    </Text>
                  </View>
                </ScrollView>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </SafeAreaView>
  );
}
