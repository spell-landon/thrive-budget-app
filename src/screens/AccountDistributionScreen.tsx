import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import {
  getDistributionRules,
  createDistributionRule,
  updateDistributionRule,
  deleteDistributionRule,
  previewDistribution,
} from '../services/accountDistribution';
import { getAccounts } from '../services/accounts';
import { getPaycheckPlanById } from '../services/paychecks';
import {
  AccountDistributionRule,
  DistributionAllocationType,
  Account,
  PaycheckPlan,
} from '../types';
import { formatCurrency } from '../utils/currency';

export default function AccountDistributionScreen({ route, navigation }: any) {
  const { paycheckPlanId } = route.params;
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [rules, setRules] = useState<AccountDistributionRule[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [paycheckPlan, setPaycheckPlan] = useState<PaycheckPlan | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRule, setEditingRule] =
    useState<AccountDistributionRule | null>(null);

  // Add/Edit form state
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [allocationType, setAllocationType] =
    useState<DistributionAllocationType>('fixed');
  const [amount, setAmount] = useState('');
  const [percentage, setPercentage] = useState('');
  const [expandAccountPicker, setExpandAccountPicker] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [paycheckPlanId])
  );

  const loadData = async () => {
    if (!user) return;

    try {
      const [rulesData, accountsData, planData] = await Promise.all([
        getDistributionRules(paycheckPlanId),
        getAccounts(user.id),
        getPaycheckPlanById(paycheckPlanId),
      ]);

      setRules(rulesData);
      setAccounts(accountsData);
      setPaycheckPlan(planData);

      // Load preview
      if (planData && rulesData.length > 0) {
        const previewData = await previewDistribution(
          paycheckPlanId,
          planData.amount
        );
        setPreview(previewData);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRule = () => {
    setEditingRule(null);
    setSelectedAccountId('');
    setAllocationType('fixed');
    setAmount('');
    setPercentage('');
    setShowAddModal(true);
  };

  const handleEditRule = (rule: AccountDistributionRule) => {
    setEditingRule(rule);
    setSelectedAccountId(rule.account_id);
    setAllocationType(rule.allocation_type);
    setAmount(rule.amount ? (rule.amount / 100).toFixed(2) : '');
    setPercentage(rule.percentage?.toString() || '');
    setShowAddModal(true);
  };

  const handleSaveRule = async () => {
    if (!user || !paycheckPlan) return;

    if (!selectedAccountId) {
      Alert.alert('Error', 'Please select an account');
      return;
    }

    // Validate based on allocation type
    if (allocationType === 'fixed') {
      const amountValue = parseFloat(amount);
      if (!amount || amountValue <= 0) {
        Alert.alert('Error', 'Please enter a valid amount');
        return;
      }
    }

    if (allocationType === 'percentage') {
      const percentValue = parseFloat(percentage);
      if (!percentage || percentValue <= 0 || percentValue > 100) {
        Alert.alert('Error', 'Please enter a percentage between 0 and 100');
        return;
      }
    }

    try {
      const ruleData = {
        paycheck_plan_id: paycheckPlanId,
        account_id: selectedAccountId,
        allocation_type: allocationType,
        amount:
          allocationType === 'fixed'
            ? Math.round(parseFloat(amount) * 100)
            : undefined,
        percentage:
          allocationType === 'percentage' ? parseFloat(percentage) : undefined,
        priority_order: editingRule ? editingRule.priority_order : rules.length,
      };

      if (editingRule) {
        await updateDistributionRule(editingRule.id, ruleData);
      } else {
        await createDistributionRule(user.id, ruleData);
      }

      setShowAddModal(false);
      loadData();
      Alert.alert(
        'Success',
        `Rule ${editingRule ? 'updated' : 'created'} successfully`
      );
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleDeleteRule = (rule: AccountDistributionRule) => {
    const accountName = accounts.find((a) => a.id === rule.account_id)?.name;

    Alert.alert(
      'Delete Rule',
      `Are you sure you want to delete the distribution rule for "${accountName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDistributionRule(rule.id);
              loadData();
              Alert.alert('Success', 'Rule deleted successfully');
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const getRuleDisplay = (rule: AccountDistributionRule) => {
    const account = accounts.find((a) => a.id === rule.account_id);
    let allocationText = '';

    switch (rule.allocation_type) {
      case 'fixed':
        allocationText = formatCurrency(rule.amount || 0);
        break;
      case 'percentage':
        allocationText = `${rule.percentage}%`;
        break;
      case 'remainder':
        allocationText = 'Remainder';
        break;
    }

    return {
      accountName: account?.name || 'Unknown',
      allocationText,
      icon: rule.allocation_type === 'remainder' ? 'infinite' : 'arrow-forward',
    };
  };

  if (loading) {
    return (
      <SafeAreaView className='flex-1 bg-background'>
        <View className='flex-1 items-center justify-center'>
          <ActivityIndicator size='large' color='#FF6B35' />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className='flex-1 bg-background' edges={[]}>
      {/* Header */}
      <View className='px-6 py-4 bg-card border-b border-gray-200'>
        <View className='flex-row items-center justify-between'>
          <View className='flex-row items-center flex-1'>
            <View className='flex-1'>
              <Text className='text-sm text-text-secondary mt-1'>
                {paycheckPlan?.name} •{' '}
                {formatCurrency(paycheckPlan?.amount || 0)}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView className='flex-1'>
        {/* Preview Section */}
        {preview.length > 0 && (
          <View className='p-6 bg-card border-b border-gray-200'>
            <Text className='text-base font-semibold text-text-primary mb-3'>
              Distribution Preview
            </Text>
            {preview.map((item, index) => (
              <View
                key={index}
                className='flex-row items-center justify-between mb-3'>
                <View className='flex-row items-center flex-1'>
                  <View
                    className='w-10 h-10 rounded-full items-center justify-center mr-3'
                    style={{ backgroundColor: '#FF6B3515' }}>
                    <Ionicons name='wallet' size={20} color='#FF6B35' />
                  </View>
                  <View className='flex-1'>
                    <Text className='text-base font-semibold text-text-primary'>
                      {item.account_name}
                    </Text>
                    <Text className='text-sm text-text-secondary'>
                      {item.percentage_of_total.toFixed(1)}% of paycheck
                    </Text>
                  </View>
                </View>
                <Text className='text-lg font-bold text-primary'>
                  {formatCurrency(item.amount)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Rules List */}
        <View className='p-6'>
          <View className='flex-row items-center justify-between mb-4'>
            <Text className='text-base font-semibold text-text-primary'>
              Distribution Rules
            </Text>
            <TouchableOpacity
              onPress={handleAddRule}
              className='bg-primary px-4 py-2 rounded-lg flex-row items-center'>
              <Ionicons name='add' size={20} color='white' />
              <Text className='text-white font-semibold ml-1'>Add Rule</Text>
            </TouchableOpacity>
          </View>

          {rules.length === 0 ? (
            <View className='bg-card rounded-2xl p-6 items-center'>
              <View
                className='w-16 h-16 rounded-full items-center justify-center mb-3'
                style={{ backgroundColor: '#FF6B3515' }}>
                <Ionicons name='git-branch-outline' size={32} color='#FF6B35' />
              </View>
              <Text className='text-lg font-semibold text-text-primary mb-2'>
                No Rules Yet
              </Text>
              <Text className='text-sm text-text-secondary text-center mb-4'>
                Create rules to automatically distribute your paycheck across
                accounts
              </Text>
              <TouchableOpacity
                onPress={handleAddRule}
                className='bg-primary px-6 py-3 rounded-lg'>
                <Text className='text-white font-semibold'>
                  Create First Rule
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            rules.map((rule, index) => {
              const display = getRuleDisplay(rule);
              return (
                <View
                  key={rule.id}
                  className='bg-card rounded-2xl p-4 mb-3'
                  style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 2,
                    elevation: 1,
                  }}>
                  <View className='flex-row items-center justify-between'>
                    <View className='flex-row items-center flex-1'>
                      <View className='bg-gray-100 w-8 h-8 rounded-full items-center justify-center mr-3'>
                        <Text className='text-sm font-bold text-gray-600'>
                          {index + 1}
                        </Text>
                      </View>
                      <View className='flex-1'>
                        <Text className='text-base font-semibold text-text-primary'>
                          {display.accountName}
                        </Text>
                        <Text className='text-sm text-text-secondary mt-1'>
                          {display.allocationText}
                        </Text>
                      </View>
                    </View>
                    <View className='flex-row items-center gap-2'>
                      <TouchableOpacity
                        onPress={() => handleEditRule(rule)}
                        className='w-10 h-10 items-center justify-center'>
                        <Ionicons name='pencil' size={20} color='#6B7280' />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteRule(rule)}
                        className='w-10 h-10 items-center justify-center'>
                        <Ionicons name='trash' size={20} color='#EF4444' />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })
          )}

          {rules.length > 0 && (
            <Text className='text-xs text-text-tertiary mt-4 text-center'>
              Rules execute in order from top to bottom
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType='slide'
        onRequestClose={() => setShowAddModal(false)}>
        <View className='flex-1 bg-black/50 justify-end'>
          <View className='bg-card rounded-t-3xl' style={{ maxHeight: '90%' }}>
            <View className='flex-row items-center justify-between px-6 py-4 border-b border-gray-200'>
              <Text className='text-lg font-bold text-text-primary'>
                {editingRule ? 'Edit Rule' : 'Add Rule'}
              </Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name='close' size={24} color='#6b7280' />
              </TouchableOpacity>
            </View>

            <ScrollView className='px-6 py-4'>
              {/* Account Selection */}
              <View className='mb-4'>
                <Text className='text-gray-700 font-semibold mb-2'>
                  Account *
                </Text>
                <TouchableOpacity
                  onPress={() => setExpandAccountPicker(!expandAccountPicker)}
                  className='border border-gray-300 rounded-lg px-4 py-3 bg-white flex-row items-center justify-between'>
                  <Text
                    className={
                      selectedAccountId ? 'text-gray-800' : 'text-gray-400'
                    }>
                    {selectedAccountId
                      ? accounts.find((a) => a.id === selectedAccountId)?.name
                      : 'Select account'}
                  </Text>
                  <Ionicons
                    name={expandAccountPicker ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color='#9ca3af'
                  />
                </TouchableOpacity>

                {/* Inline Account List */}
                {expandAccountPicker && (
                  <View className='mt-2 border border-gray-200 rounded-lg bg-white'>
                    {accounts.map((account, idx) => (
                      <TouchableOpacity
                        key={account.id}
                        onPress={() => {
                          setSelectedAccountId(account.id);
                          setExpandAccountPicker(false);
                        }}
                        className={`px-4 py-3 flex-row items-center justify-between ${
                          idx < accounts.length - 1 ? 'border-b border-gray-100' : ''
                        } ${selectedAccountId === account.id ? 'bg-primary-50' : ''}`}>
                        <View className='flex-row items-center flex-1'>
                          <Ionicons
                            name='wallet'
                            size={20}
                            color={selectedAccountId === account.id ? '#FF6B35' : '#6b7280'}
                          />
                          <Text
                            className={`ml-3 text-base ${
                              selectedAccountId === account.id
                                ? 'text-primary font-semibold'
                                : 'text-gray-800'
                            }`}>
                            {account.name}
                          </Text>
                        </View>
                        {selectedAccountId === account.id && (
                          <Ionicons name='checkmark-circle' size={20} color='#FF6B35' />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Allocation Type */}
              <View className='mb-4'>
                <Text className='text-gray-700 font-semibold mb-2'>
                  Allocation Type *
                </Text>
                <View className='gap-2'>
                  <TouchableOpacity
                    onPress={() => setAllocationType('fixed')}
                    className={`px-4 py-3 rounded-lg border ${
                      allocationType === 'fixed'
                        ? 'bg-primary-100 border-primary-500'
                        : 'bg-white border-gray-300'
                    }`}>
                    <Text
                      className={`font-semibold ${
                        allocationType === 'fixed'
                          ? 'text-primary'
                          : 'text-gray-700'
                      }`}>
                      Fixed Amount
                    </Text>
                    <Text className='text-xs text-gray-500 mt-1'>
                      Allocate specific dollar amount
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setAllocationType('percentage')}
                    className={`px-4 py-3 rounded-lg border ${
                      allocationType === 'percentage'
                        ? 'bg-primary-100 border-primary-500'
                        : 'bg-white border-gray-300'
                    }`}>
                    <Text
                      className={`font-semibold ${
                        allocationType === 'percentage'
                          ? 'text-primary'
                          : 'text-gray-700'
                      }`}>
                      Percentage
                    </Text>
                    <Text className='text-xs text-gray-500 mt-1'>
                      Allocate percentage of paycheck
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setAllocationType('remainder')}
                    className={`px-4 py-3 rounded-lg border ${
                      allocationType === 'remainder'
                        ? 'bg-primary-100 border-primary-500'
                        : 'bg-white border-gray-300'
                    }`}>
                    <Text
                      className={`font-semibold ${
                        allocationType === 'remainder'
                          ? 'text-primary'
                          : 'text-gray-700'
                      }`}>
                      Remainder
                    </Text>
                    <Text className='text-xs text-gray-500 mt-1'>
                      Everything left after other rules
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Amount Input (Fixed) */}
              {allocationType === 'fixed' && (
                <View className='mb-4'>
                  <Text className='text-gray-700 font-semibold mb-2'>
                    Amount *
                  </Text>
                  <View className='flex-row items-center border border-gray-300 rounded-lg bg-white'>
                    <Text className='text-gray-500 text-lg px-4'>$</Text>
                    <TextInput
                      className='flex-1 py-3 pr-4'
                      value={amount}
                      onChangeText={setAmount}
                      placeholder='0.00'
                      keyboardType='decimal-pad'
                    />
                  </View>
                </View>
              )}

              {/* Percentage Input */}
              {allocationType === 'percentage' && (
                <View className='mb-4'>
                  <Text className='text-gray-700 font-semibold mb-2'>
                    Percentage *
                  </Text>
                  <View className='flex-row items-center border border-gray-300 rounded-lg bg-white'>
                    <TextInput
                      className='flex-1 py-3 pl-4'
                      value={percentage}
                      onChangeText={setPercentage}
                      placeholder='0'
                      keyboardType='decimal-pad'
                    />
                    <Text className='text-gray-500 text-lg px-4'>%</Text>
                  </View>
                </View>
              )}

              {/* Save Button */}
              <TouchableOpacity
                onPress={handleSaveRule}
                className='bg-primary py-4 rounded-lg mt-4'>
                <Text className='text-white text-center font-semibold text-base'>
                  {editingRule ? 'Update Rule' : 'Create Rule'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
