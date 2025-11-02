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
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import {
  getAllocationRules,
  createAllocationRule,
  updateAllocationRule,
  deleteAllocationRule,
} from '../services/accountAllocation';
import { getBudgetCategories, getOrCreateCurrentMonthBudget } from '../services/budgets';
import { getGoals } from '../services/goals';
import {
  AccountAllocationRule,
  AllocationAllocationType,
  AllocationTargetType,
  BudgetCategory,
  SavingsGoal,
  Account,
} from '../types';
import { formatCurrency } from '../utils/currency';

export default function AccountAllocationRulesScreen({ route, navigation }: any) {
  const { accountId, accountName } = route.params;
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [rules, setRules] = useState<AccountAllocationRule[]>([]);
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRule, setEditingRule] = useState<AccountAllocationRule | null>(null);

  // Form state
  const [targetType, setTargetType] = useState<AllocationTargetType>('category');
  const [targetId, setTargetId] = useState('');
  const [allocationType, setAllocationType] = useState<AllocationAllocationType>('fixed');
  const [amount, setAmount] = useState('');
  const [percentage, setPercentage] = useState('');
  const [dueDateAware, setDueDateAware] = useState(false);
  const [overflowTargetId, setOverflowTargetId] = useState('');
  const [overflowTargetType, setOverflowTargetType] = useState<'category' | 'goal'>('goal');
  const [expandTargetPicker, setExpandTargetPicker] = useState(false);
  const [expandOverflowPicker, setExpandOverflowPicker] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [accountId])
  );

  const loadData = async () => {
    if (!user) return;

    try {
      const budget = await getOrCreateCurrentMonthBudget(user.id);
      const [rulesData, categoriesData, goalsData] = await Promise.all([
        getAllocationRules(accountId),
        getBudgetCategories(budget.id),
        getGoals(user.id),
      ]);

      setRules(rulesData);
      setCategories(categoriesData);
      setGoals(goalsData);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRule = () => {
    setEditingRule(null);
    setTargetType('category');
    setTargetId('');
    setAllocationType('fixed');
    setAmount('');
    setPercentage('');
    setDueDateAware(false);
    setOverflowTargetId('');
    setShowAddModal(true);
  };

  const handleEditRule = (rule: AccountAllocationRule) => {
    setEditingRule(rule);
    setTargetType(rule.target_type);
    setTargetId(rule.target_id || '');
    setAllocationType(rule.allocation_type);
    setAmount(rule.amount ? (rule.amount / 100).toFixed(2) : '');
    setPercentage(rule.percentage?.toString() || '');
    setDueDateAware(rule.due_date_aware);
    setOverflowTargetId(rule.overflow_target_id || '');
    setOverflowTargetType(rule.overflow_target_type || 'goal');
    setShowAddModal(true);
  };

  const handleSaveRule = async () => {
    if (!user) return;

    // Validation
    if (
      targetType !== 'split_remaining' &&
      targetType !== 'unallocated' &&
      !targetId
    ) {
      Alert.alert('Error', 'Please select a target');
      return;
    }

    if (allocationType === 'fixed' && (!amount || parseFloat(amount) <= 0)) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (
      allocationType === 'percentage' &&
      (!percentage || parseFloat(percentage) <= 0 || parseFloat(percentage) > 100)
    ) {
      Alert.alert('Error', 'Please enter a percentage between 0 and 100');
      return;
    }

    try {
      const ruleData = {
        account_id: accountId,
        target_type: targetType,
        target_id: targetId || undefined,
        allocation_type: allocationType,
        amount: allocationType === 'fixed' ? Math.round(parseFloat(amount) * 100) : undefined,
        percentage: allocationType === 'percentage' ? parseFloat(percentage) : undefined,
        priority_order: editingRule ? editingRule.priority_order : rules.length,
        due_date_aware: dueDateAware,
        overflow_target_id: overflowTargetId || undefined,
        overflow_target_type: overflowTargetId ? overflowTargetType : undefined,
      };

      if (editingRule) {
        await updateAllocationRule(editingRule.id, ruleData);
      } else {
        await createAllocationRule(user.id, ruleData);
      }

      setShowAddModal(false);
      loadData();
      Alert.alert('Success', `Rule ${editingRule ? 'updated' : 'created'} successfully`);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleDeleteRule = (rule: AccountAllocationRule) => {
    Alert.alert(
      'Delete Rule',
      'Are you sure you want to delete this allocation rule?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAllocationRule(rule.id);
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

  const getRuleDisplay = (rule: AccountAllocationRule) => {
    let targetName = '';
    let icon: any = 'cube';

    if (rule.target_type === 'category') {
      const category = categories.find((c) => c.id === rule.target_id);
      targetName = category?.name || 'Unknown Category';
      icon = 'pricetag';
    } else if (rule.target_type === 'goal') {
      const goal = goals.find((g) => g.id === rule.target_id);
      targetName = goal?.name || 'Unknown Goal';
      icon = 'flag';
    } else if (rule.target_type === 'split_remaining') {
      targetName = 'Split Among Categories';
      icon = 'git-branch';
    } else {
      targetName = 'Unallocated';
      icon = 'cube-outline';
    }

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
      case 'split':
        allocationText = 'Split Evenly';
        break;
    }

    return { targetName, allocationText, icon };
  };

  const getTargetOptions = () => {
    if (targetType === 'category') return categories;
    if (targetType === 'goal') return goals;
    return [];
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header */}
      <View className="px-6 py-4 bg-card border-b border-gray-200">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
              <Ionicons name="arrow-back" size={24} color="#1F2937" />
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="text-xl font-bold text-text-primary">
                Allocation Rules
              </Text>
              <Text className="text-sm text-text-secondary mt-1">{accountName}</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1">
        <View className="p-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-base font-semibold text-text-primary">
              How to allocate money
            </Text>
            <TouchableOpacity
              onPress={handleAddRule}
              className="bg-primary px-4 py-2 rounded-lg flex-row items-center">
              <Ionicons name="add" size={20} color="white" />
              <Text className="text-white font-semibold ml-1">Add Rule</Text>
            </TouchableOpacity>
          </View>

          {rules.length === 0 ? (
            <View className="bg-card rounded-2xl p-6 items-center">
              <View
                className="w-16 h-16 rounded-full items-center justify-center mb-3"
                style={{ backgroundColor: '#FF6B3515' }}>
                <Ionicons name="trending-up" size={32} color="#FF6B35" />
              </View>
              <Text className="text-lg font-semibold text-text-primary mb-2">
                No Rules Yet
              </Text>
              <Text className="text-sm text-text-secondary text-center mb-4">
                Create rules to automatically allocate money to categories and goals
              </Text>
              <TouchableOpacity
                onPress={handleAddRule}
                className="bg-primary px-6 py-3 rounded-lg">
                <Text className="text-white font-semibold">Create First Rule</Text>
              </TouchableOpacity>
            </View>
          ) : (
            rules.map((rule, index) => {
              const display = getRuleDisplay(rule);
              return (
                <View
                  key={rule.id}
                  className="bg-card rounded-2xl p-4 mb-3"
                  style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 2,
                    elevation: 1,
                  }}>
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1">
                      <View className="bg-gray-100 w-8 h-8 rounded-full items-center justify-center mr-3">
                        <Text className="text-sm font-bold text-gray-600">
                          {index + 1}
                        </Text>
                      </View>
                      <Ionicons name={display.icon} size={24} color="#FF6B35" />
                      <View className="ml-3 flex-1">
                        <Text className="text-base font-semibold text-text-primary">
                          {display.targetName}
                        </Text>
                        <View className="flex-row items-center mt-1">
                          <Text className="text-sm text-text-secondary">
                            {display.allocationText}
                          </Text>
                          {rule.due_date_aware && (
                            <View className="ml-2 bg-blue-100 px-2 py-0.5 rounded">
                              <Text className="text-xs text-blue-700">Date-Aware</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                    <View className="flex-row items-center gap-2">
                      <TouchableOpacity
                        onPress={() => handleEditRule(rule)}
                        className="w-10 h-10 items-center justify-center">
                        <Ionicons name="pencil" size={20} color="#6B7280" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteRule(rule)}
                        className="w-10 h-10 items-center justify-center">
                        <Ionicons name="trash" size={20} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-card rounded-t-3xl" style={{ maxHeight: '90%' }}>
            <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-200">
              <Text className="text-lg font-bold text-text-primary">
                {editingRule ? 'Edit Rule' : 'Add Rule'}
              </Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView className="px-6 py-4">
              {/* Target Type */}
              <View className="mb-4">
                <Text className="text-gray-700 font-semibold mb-2">Target Type *</Text>
                <View className="gap-2">
                  {[
                    { value: 'category', label: 'Category', icon: 'pricetag' },
                    { value: 'goal', label: 'Goal', icon: 'flag' },
                    { value: 'split_remaining', label: 'Split Remaining', icon: 'git-branch' },
                    { value: 'unallocated', label: 'Unallocated', icon: 'cube-outline' },
                  ].map((type) => (
                    <TouchableOpacity
                      key={type.value}
                      onPress={() => {
                        setTargetType(type.value as AllocationTargetType);
                        setTargetId('');
                      }}
                      className={`flex-row items-center px-4 py-3 rounded-lg border ${
                        targetType === type.value
                          ? 'bg-primary-100 border-primary-500'
                          : 'bg-white border-gray-300'
                      }`}>
                      <Ionicons
                        name={type.icon as any}
                        size={20}
                        color={targetType === type.value ? '#FF6B35' : '#6b7280'}
                      />
                      <Text
                        className={`ml-3 font-semibold ${
                          targetType === type.value ? 'text-primary' : 'text-gray-700'
                        }`}>
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Target Selection */}
              {(targetType === 'category' || targetType === 'goal') && (
                <View className="mb-4">
                  <Text className="text-gray-700 font-semibold mb-2">
                    Select {targetType === 'category' ? 'Category' : 'Goal'} *
                  </Text>
                  <TouchableOpacity
                    onPress={() => setExpandTargetPicker(!expandTargetPicker)}
                    className="border border-gray-300 rounded-lg px-4 py-3 bg-white flex-row items-center justify-between">
                    <Text className={targetId ? 'text-gray-800' : 'text-gray-400'}>
                      {targetId
                        ? targetType === 'category'
                          ? categories.find((c) => c.id === targetId)?.name
                          : goals.find((g) => g.id === targetId)?.name
                        : `Select ${targetType}`}
                    </Text>
                    <Ionicons
                      name={expandTargetPicker ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color="#9ca3af"
                    />
                  </TouchableOpacity>

                  {/* Inline Target List */}
                  {expandTargetPicker && (
                    <View className="mt-2 border border-gray-200 rounded-lg bg-white max-h-60">
                      <ScrollView>
                        {getTargetOptions().map((item, idx) => (
                          <TouchableOpacity
                            key={item.id}
                            onPress={() => {
                              setTargetId(item.id);
                              setExpandTargetPicker(false);
                            }}
                            className={`px-4 py-3 flex-row items-center justify-between ${
                              idx < getTargetOptions().length - 1 ? 'border-b border-gray-100' : ''
                            } ${targetId === item.id ? 'bg-primary-50' : ''}`}>
                            <Text
                              className={`text-base ${
                                targetId === item.id
                                  ? 'text-primary font-semibold'
                                  : 'text-gray-800'
                              }`}>
                              {item.name}
                            </Text>
                            {targetId === item.id && (
                              <Ionicons name="checkmark-circle" size={20} color="#FF6B35" />
                            )}
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              )}

              {/* Allocation Type */}
              <View className="mb-4">
                <Text className="text-gray-700 font-semibold mb-2">
                  Allocation Type *
                </Text>
                <View className="gap-2">
                  {[
                    { value: 'fixed', label: 'Fixed $' },
                    { value: 'percentage', label: 'Percentage %' },
                    { value: 'remainder', label: 'Remainder' },
                    { value: 'split', label: 'Split Evenly' },
                  ].map((type) => (
                    <TouchableOpacity
                      key={type.value}
                      onPress={() => setAllocationType(type.value as AllocationAllocationType)}
                      className={`px-4 py-3 rounded-lg border ${
                        allocationType === type.value
                          ? 'bg-primary-100 border-primary-500'
                          : 'bg-white border-gray-300'
                      }`}>
                      <Text
                        className={`font-semibold ${
                          allocationType === type.value ? 'text-primary' : 'text-gray-700'
                        }`}>
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Amount/Percentage Input */}
              {allocationType === 'fixed' && (
                <View className="mb-4">
                  <Text className="text-gray-700 font-semibold mb-2">Amount *</Text>
                  <View className="flex-row items-center border border-gray-300 rounded-lg bg-white">
                    <Text className="text-gray-500 text-lg px-4">$</Text>
                    <TextInput
                      className="flex-1 py-3 pr-4"
                      value={amount}
                      onChangeText={setAmount}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>
              )}

              {allocationType === 'percentage' && (
                <View className="mb-4">
                  <Text className="text-gray-700 font-semibold mb-2">Percentage *</Text>
                  <View className="flex-row items-center border border-gray-300 rounded-lg bg-white">
                    <TextInput
                      className="flex-1 py-3 pl-4"
                      value={percentage}
                      onChangeText={setPercentage}
                      placeholder="0"
                      keyboardType="decimal-pad"
                    />
                    <Text className="text-gray-500 text-lg px-4">%</Text>
                  </View>
                </View>
              )}

              {/* Date-Aware Toggle */}
              <View className="flex-row items-center justify-between mb-4 bg-blue-50 p-4 rounded-lg">
                <View className="flex-1 mr-4">
                  <Text className="text-gray-700 font-semibold mb-1">
                    Date-Aware Priority
                  </Text>
                  <Text className="text-xs text-gray-500">
                    Pay bills due soon first
                  </Text>
                </View>
                <Switch
                  value={dueDateAware}
                  onValueChange={setDueDateAware}
                  trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                  thumbColor={dueDateAware ? '#2563eb' : '#f3f4f6'}
                />
              </View>

              {/* Goal Overflow */}
              {targetType === 'goal' && (
                <View className="mb-4 bg-green-50 p-4 rounded-lg">
                  <Text className="text-gray-700 font-semibold mb-2">
                    Overflow Target (Optional)
                  </Text>
                  <Text className="text-xs text-gray-500 mb-2">
                    Where to send excess when goal is full
                  </Text>
                  <TouchableOpacity
                    onPress={() => setExpandOverflowPicker(!expandOverflowPicker)}
                    className="border border-gray-300 rounded-lg px-4 py-3 bg-white flex-row items-center justify-between">
                    <Text
                      className={
                        overflowTargetId ? 'text-gray-800' : 'text-gray-400'
                      }>
                      {overflowTargetId
                        ? overflowTargetType === 'goal'
                          ? goals.find((g) => g.id === overflowTargetId)?.name
                          : categories.find((c) => c.id === overflowTargetId)?.name
                        : 'None'}
                    </Text>
                    <Ionicons
                      name={expandOverflowPicker ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color="#9ca3af"
                    />
                  </TouchableOpacity>

                  {/* Inline Overflow List */}
                  {expandOverflowPicker && (
                    <View className="mt-2 border border-gray-200 rounded-lg bg-white max-h-60">
                      <ScrollView>
                        {/* None Option */}
                        <TouchableOpacity
                          onPress={() => {
                            setOverflowTargetId('');
                            setExpandOverflowPicker(false);
                          }}
                          className={`px-4 py-3 flex-row items-center justify-between border-b border-gray-100 ${
                            !overflowTargetId ? 'bg-primary-50' : ''
                          }`}>
                          <Text
                            className={`text-base ${
                              !overflowTargetId ? 'text-primary font-semibold' : 'text-gray-800'
                            }`}>
                            None
                          </Text>
                          {!overflowTargetId && (
                            <Ionicons name="checkmark-circle" size={20} color="#FF6B35" />
                          )}
                        </TouchableOpacity>

                        {/* Goals */}
                        <View className="bg-gray-50 px-4 py-2 border-b border-gray-100">
                          <Text className="text-xs font-semibold text-gray-600 uppercase">
                            Goals
                          </Text>
                        </View>
                        {goals.filter(g => g.id !== targetId).map((goal, idx) => (
                          <TouchableOpacity
                            key={goal.id}
                            onPress={() => {
                              setOverflowTargetId(goal.id);
                              setOverflowTargetType('goal');
                              setExpandOverflowPicker(false);
                            }}
                            className={`px-4 py-3 flex-row items-center justify-between ${
                              idx < goals.filter(g => g.id !== targetId).length - 1 ||
                              categories.length > 0
                                ? 'border-b border-gray-100'
                                : ''
                            } ${
                              overflowTargetId === goal.id && overflowTargetType === 'goal'
                                ? 'bg-primary-50'
                                : ''
                            }`}>
                            <Text
                              className={`text-base ${
                                overflowTargetId === goal.id && overflowTargetType === 'goal'
                                  ? 'text-primary font-semibold'
                                  : 'text-gray-800'
                              }`}>
                              {goal.name}
                            </Text>
                            {overflowTargetId === goal.id && overflowTargetType === 'goal' && (
                              <Ionicons name="checkmark-circle" size={20} color="#FF6B35" />
                            )}
                          </TouchableOpacity>
                        ))}

                        {/* Categories */}
                        {categories.length > 0 && (
                          <>
                            <View className="bg-gray-50 px-4 py-2 border-b border-gray-100">
                              <Text className="text-xs font-semibold text-gray-600 uppercase">
                                Categories
                              </Text>
                            </View>
                            {categories.map((category, idx) => (
                              <TouchableOpacity
                                key={category.id}
                                onPress={() => {
                                  setOverflowTargetId(category.id);
                                  setOverflowTargetType('category');
                                  setExpandOverflowPicker(false);
                                }}
                                className={`px-4 py-3 flex-row items-center justify-between ${
                                  idx < categories.length - 1 ? 'border-b border-gray-100' : ''
                                } ${
                                  overflowTargetId === category.id &&
                                  overflowTargetType === 'category'
                                    ? 'bg-primary-50'
                                    : ''
                                }`}>
                                <Text
                                  className={`text-base ${
                                    overflowTargetId === category.id &&
                                    overflowTargetType === 'category'
                                      ? 'text-primary font-semibold'
                                      : 'text-gray-800'
                                  }`}>
                                  {category.name}
                                </Text>
                                {overflowTargetId === category.id &&
                                  overflowTargetType === 'category' && (
                                    <Ionicons name="checkmark-circle" size={20} color="#FF6B35" />
                                  )}
                              </TouchableOpacity>
                            ))}
                          </>
                        )}
                      </ScrollView>
                    </View>
                  )}
                </View>
              )}

              {/* Save Button */}
              <TouchableOpacity
                onPress={handleSaveRule}
                className="bg-primary py-4 rounded-lg mt-4">
                <Text className="text-white text-center font-semibold text-base">
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
