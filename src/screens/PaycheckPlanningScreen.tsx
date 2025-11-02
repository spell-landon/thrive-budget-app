import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { getPaycheckPlans, deletePaycheckPlan, processDuePaychecks } from '../services/paychecks';
import { formatCurrency } from '../utils/currency';
import { PaycheckPlan } from '../types';
import { previewFullAllocation, executeFullAllocation, FullAllocationPreview } from '../services/paycheckAllocation';

export default function PaycheckPlanningScreen({ navigation }: any) {
  const { user } = useAuth();
  const [paychecks, setPaychecks] = useState<PaycheckPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [previews, setPreviews] = useState<Record<string, FullAllocationPreview | null>>({});
  const [expandedPreviews, setExpandedPreviews] = useState<Record<string, boolean>>({});
  const [loadingPreviews, setLoadingPreviews] = useState<Record<string, boolean>>({});

  const loadPaychecks = useCallback(async () => {
    if (!user) return;

    try {
      // Process any due paychecks first
      await processDuePaychecks(user.id);

      const data = await getPaycheckPlans(user.id);
      setPaychecks(data);
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
      loadPaychecks();
    }, [loadPaychecks])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadPaychecks();
  }, [loadPaychecks]);

  const handleDelete = (paycheck: PaycheckPlan) => {
    Alert.alert('Delete Paycheck', `Are you sure you want to delete ${paycheck.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePaycheckPlan(paycheck.id);
            loadPaychecks();
          } catch (error: any) {
            Alert.alert('Error', error.message);
          }
        },
      },
    ]);
  };

  const getFrequencyIcon = (frequency: string) => {
    switch (frequency) {
      case 'weekly':
        return 'calendar-outline';
      case 'biweekly':
        return 'calendar';
      case 'semimonthly':
        return 'calendar-sharp';
      case 'monthly':
        return 'calendar-number-outline';
      default:
        return 'calendar-outline';
    }
  };

  const getFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case 'weekly':
        return 'Weekly';
      case 'biweekly':
        return 'Bi-weekly';
      case 'semimonthly':
        return 'Semi-monthly';
      case 'monthly':
        return 'Monthly';
      default:
        return frequency;
    }
  };

  const getDaysUntil = (nextDate: string) => {
    const next = new Date(nextDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    next.setHours(0, 0, 0, 0);
    const diff = Math.ceil((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const loadPreview = async (paycheck: PaycheckPlan) => {
    if (!user) return;

    setLoadingPreviews((prev) => ({ ...prev, [paycheck.id]: true }));

    try {
      const preview = await previewFullAllocation(
        user.id,
        paycheck.id,
        paycheck.amount,
        paycheck.next_date
      );
      setPreviews((prev) => ({ ...prev, [paycheck.id]: preview }));
    } catch (error: any) {
      // If preview fails, it likely means no rules are configured yet
      setPreviews((prev) => ({ ...prev, [paycheck.id]: null }));
    } finally {
      setLoadingPreviews((prev) => ({ ...prev, [paycheck.id]: false }));
    }
  };

  const togglePreview = (paycheckId: string) => {
    setExpandedPreviews((prev) => ({ ...prev, [paycheckId]: !prev[paycheckId] }));
  };

  const handleDistributePaycheck = async (paycheck: PaycheckPlan) => {
    if (!user) return;

    Alert.alert(
      'Distribute Paycheck',
      `This will distribute ${formatCurrency(paycheck.amount)} from "${paycheck.name}" according to your allocation rules. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Distribute',
          onPress: async () => {
            try {
              await executeFullAllocation(user.id, paycheck.id, paycheck.amount, paycheck.next_date);
              Alert.alert('Success', 'Paycheck distributed successfully!');
              loadPaychecks(); // Reload to update balances
              loadPreview(paycheck); // Reload preview
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['bottom']}>
      <ScrollView className="flex-1" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          {loading ? (
            <Text className="text-gray-600 text-center mt-8">Loading paychecks...</Text>
          ) : paychecks.length === 0 ? (
            <View className="items-center mt-12 px-4">
              <Ionicons name="cash-outline" size={64} color="#9ca3af" />
              <Text className="text-gray-600 mt-4 text-center text-lg mb-2">No paychecks yet</Text>
              <Text className="text-gray-500 text-center mb-6">
                Create a paycheck plan to allocate your income to budget categories
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('AddPaycheck')}
                className="bg-blue-600 px-6 py-3 rounded-lg"
              >
                <Text className="text-white font-semibold">Add Your First Paycheck</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="p-4">
              {paychecks.map((paycheck) => {
                const daysUntil = getDaysUntil(paycheck.next_date);
                const isUpcoming = daysUntil <= 7 && daysUntil >= 0;
                const preview = previews[paycheck.id];
                const isExpanded = expandedPreviews[paycheck.id];
                const isLoadingPreview = loadingPreviews[paycheck.id];

                return (
                  <View
                    key={paycheck.id}
                    className={`bg-white rounded-lg p-4 mb-3 shadow-sm border ${
                      isUpcoming ? 'border-green-500' : 'border-gray-100'
                    }`}
                  >
                    {/* Header Row */}
                    <View className="flex-row justify-between items-start mb-3">
                      <View className="flex-1">
                        <Text className="text-lg font-bold text-gray-800">{paycheck.name}</Text>
                        <View className="flex-row items-center mt-1">
                          <Ionicons
                            name={getFrequencyIcon(paycheck.frequency) as any}
                            size={14}
                            color="#6b7280"
                          />
                          <Text className="text-sm text-gray-600 ml-1">
                            {getFrequencyLabel(paycheck.frequency)}
                          </Text>
                        </View>
                      </View>
                      <View className="flex-row items-center gap-2">
                        <TouchableOpacity
                          onPress={() => navigation.navigate('EditPaycheck', { paycheckId: paycheck.id })}
                          className="ml-2"
                        >
                          <Ionicons name="pencil-outline" size={18} color="#2563eb" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDelete(paycheck)}>
                          <Ionicons name="trash-outline" size={18} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Amount */}
                    <View className="mb-3">
                      <Text className="text-2xl font-bold text-green-600">
                        {formatCurrency(paycheck.amount)}
                      </Text>
                    </View>

                    {/* Next Paycheck Info */}
                    <View className="flex-row justify-between items-center pb-3 border-b border-gray-100">
                      <View>
                        <Text className="text-xs text-gray-500 mb-1">Next Paycheck</Text>
                        <Text className="text-sm font-semibold text-gray-800">
                          {formatDate(paycheck.next_date)}
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-xs text-gray-500 mb-1">Days Until</Text>
                        <View
                          className={`px-2 py-1 rounded-full ${
                            isUpcoming ? 'bg-green-100' : 'bg-gray-100'
                          }`}
                        >
                          <Text
                            className={`text-sm font-bold ${
                              isUpcoming ? 'text-green-700' : 'text-gray-700'
                            }`}
                          >
                            {daysUntil === 0
                              ? 'Today'
                              : daysUntil === 1
                              ? '1 day'
                              : daysUntil < 0
                              ? 'Past due'
                              : `${daysUntil} days`}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Smart Allocation Preview */}
                    <TouchableOpacity
                      onPress={() => {
                        if (!preview && !isLoadingPreview) {
                          loadPreview(paycheck);
                        }
                        togglePreview(paycheck.id);
                      }}
                      className="flex-row items-center justify-between py-3 border-b border-gray-100"
                      activeOpacity={0.7}
                    >
                      <View className="flex-row items-center">
                        <Ionicons name="git-network-outline" size={18} color="#2563eb" />
                        <Text className="text-sm font-semibold text-blue-600 ml-2">
                          Smart Allocation Preview
                        </Text>
                      </View>
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color="#6b7280"
                      />
                    </TouchableOpacity>

                    {/* Preview Details */}
                    {isExpanded && (
                      <View className="py-3 border-b border-gray-100">
                        {isLoadingPreview ? (
                          <View className="items-center py-4">
                            <ActivityIndicator size="small" color="#2563eb" />
                            <Text className="text-gray-500 mt-2 text-sm">Loading preview...</Text>
                          </View>
                        ) : preview ? (
                          <View>
                            {/* Distribution Summary */}
                            {preview.distribution.map((dist, idx) => (
                              <View key={idx} className="mb-3">
                                <View className="flex-row items-center justify-between mb-2">
                                  <View className="flex-row items-center flex-1">
                                    <Ionicons name="wallet" size={16} color="#FF6B35" />
                                    <Text className="font-semibold text-gray-800 ml-2">
                                      {dist.account_name}
                                    </Text>
                                    <View className="bg-blue-100 px-2 py-0.5 rounded ml-2">
                                      <Text className="text-xs text-blue-700">
                                        {dist.percentage.toFixed(1)}%
                                      </Text>
                                    </View>
                                  </View>
                                  <Text className="text-base font-bold text-primary">
                                    {formatCurrency(dist.amount)}
                                  </Text>
                                </View>

                                {/* Top allocations within account */}
                                {dist.allocations.slice(0, 3).map((alloc, allocIdx) => (
                                  <View
                                    key={allocIdx}
                                    className="flex-row items-center justify-between ml-6 mb-1"
                                  >
                                    <View className="flex-row items-center flex-1">
                                      <Ionicons
                                        name={
                                          alloc.target_type === 'goal'
                                            ? 'flag'
                                            : alloc.target_type === 'category'
                                            ? 'pricetag'
                                            : 'cube-outline'
                                        }
                                        size={12}
                                        color="#9ca3af"
                                      />
                                      <Text className="text-sm text-gray-600 ml-2" numberOfLines={1}>
                                        {alloc.target_name}
                                      </Text>
                                    </View>
                                    <Text className="text-sm text-gray-700 ml-2">
                                      {formatCurrency(alloc.amount)}
                                    </Text>
                                  </View>
                                ))}

                                {dist.allocations.length > 3 && (
                                  <Text className="text-xs text-gray-500 ml-6 mt-1">
                                    +{dist.allocations.length - 3} more allocations
                                  </Text>
                                )}
                              </View>
                            ))}

                            {/* Summary Stats */}
                            <View className="bg-blue-50 p-3 rounded-lg mt-2">
                              <View className="flex-row justify-between mb-1">
                                <Text className="text-sm text-gray-700">Total Allocated:</Text>
                                <Text className="text-sm font-semibold text-gray-800">
                                  {formatCurrency(preview.total_allocated)}
                                </Text>
                              </View>
                              {preview.unallocated > 0 && (
                                <View className="flex-row justify-between">
                                  <Text className="text-sm text-gray-700">Unallocated:</Text>
                                  <Text className="text-sm font-semibold text-orange-600">
                                    {formatCurrency(preview.unallocated)}
                                  </Text>
                                </View>
                              )}
                            </View>
                          </View>
                        ) : (
                          <View className="items-center py-4">
                            <Ionicons name="warning-outline" size={32} color="#f59e0b" />
                            <Text className="text-gray-600 mt-2 text-center text-sm">
                              No allocation rules configured yet
                            </Text>
                            <Text className="text-gray-500 text-center text-xs mt-1">
                              Set up distribution rules to see how your paycheck will be allocated
                            </Text>
                          </View>
                        )}
                      </View>
                    )}

                    {/* Action Buttons */}
                    <View className="flex-row gap-2 mt-3">
                      <TouchableOpacity
                        onPress={() =>
                          navigation.navigate('AccountDistributionScreen', { paycheckPlanId: paycheck.id })
                        }
                        className="flex-1 bg-blue-100 py-3 rounded-lg flex-row items-center justify-center"
                        activeOpacity={0.7}
                      >
                        <Ionicons name="settings-outline" size={16} color="#2563eb" />
                        <Text className="text-blue-700 font-semibold ml-2 text-sm">
                          Configure
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleDistributePaycheck(paycheck)}
                        className="flex-1 bg-green-600 py-3 rounded-lg flex-row items-center justify-center"
                        activeOpacity={0.7}
                      >
                        <Ionicons name="cash-outline" size={16} color="#fff" />
                        <Text className="text-white font-semibold ml-2 text-sm">
                          Distribute Now
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
    </SafeAreaView>
  );
}
