import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import {
  previewAllocation,
  executeAllocation,
  AllocationResult,
} from '../services/accountAllocation';
import { getOrCreateCurrentMonthBudget } from '../services/budgets';
import { formatCurrency } from '../utils/currency';

export default function AllocationPreviewScreen({ route, navigation }: any) {
  const { user } = useAuth();
  const { accountId, accountName, accountBalance } = route.params;
  const [allocationPreview, setAllocationPreview] = useState<AllocationResult[] | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);

  useEffect(() => {
    loadPreview();
  }, []);

  const loadPreview = async () => {
    if (!user) return;

    try {
      const budget = await getOrCreateCurrentMonthBudget(user.id);
      const today = new Date().toISOString().split('T')[0];

      const preview = await previewAllocation({
        userId: user.id,
        accountId,
        budgetId: budget.id,
        availableAmount: accountBalance,
        currentDate: today,
      });

      setAllocationPreview(preview);
    } catch (error: any) {
      // Don't navigate back - let the UI show the "Configure Rules" button
      // Just set preview to empty array to trigger the "no rules" UI
      setAllocationPreview([]);
      console.log('Allocation preview error:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteAllocation = async () => {
    if (!user) return;

    setExecuting(true);

    try {
      const budget = await getOrCreateCurrentMonthBudget(user.id);
      const today = new Date().toISOString().split('T')[0];

      await executeAllocation({
        userId: user.id,
        accountId,
        budgetId: budget.id,
        availableAmount: accountBalance,
        currentDate: today,
      });

      Alert.alert('Success', `Allocated ${formatCurrency(accountBalance)} from ${accountName}`);
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to execute allocation');
    } finally {
      setExecuting(false);
    }
  };

  const handleConfigureRules = () => {
    navigation.navigate('AccountAllocationRulesScreen', { accountId });
  };

  return (
    <SafeAreaView className='flex-1 bg-gray-50' edges={['bottom']}>
      {/* Header */}
      <View className='flex-row items-center justify-between px-6 py-4 bg-white border-b border-gray-200'>
        <View className='flex-row items-center'>
          <TouchableOpacity onPress={() => navigation.goBack()} className='mr-4'>
            <Ionicons name='arrow-back' size={24} color='#1f2937' />
          </TouchableOpacity>
          <Text className='text-xl font-bold text-gray-800'>Allocation Preview</Text>
        </View>
      </View>

      {loading ? (
        <View className='flex-1 items-center justify-center'>
          <ActivityIndicator size='large' color='#FF6B35' />
          <Text className='text-center text-gray-600 mt-4'>
            Calculating allocation...
          </Text>
        </View>
      ) : (
        <View className='flex-1'>
          {/* Account Info */}
          <View className='bg-white px-6 py-4 border-b border-gray-200'>
            <Text className='text-sm text-gray-600 mb-1'>Allocating from</Text>
            <Text className='text-lg font-semibold text-gray-800'>
              {accountName} - {formatCurrency(accountBalance)}
            </Text>
          </View>

          {allocationPreview && allocationPreview.length > 0 ? (
            <>
              {/* Allocation Items */}
              <ScrollView className='flex-1'>
                <View className='p-4'>
                  {allocationPreview.map((allocation, index) => (
                    <View
                      key={index}
                      className='bg-white rounded-lg p-4 mb-3 border border-gray-200'>
                      <View className='flex-row justify-between items-center'>
                        <View className='flex-1'>
                          <Text className='text-base font-semibold text-gray-800'>
                            {allocation.target_name}
                          </Text>
                          <Text className='text-xs text-gray-600 mt-1'>
                            {allocation.target_type === 'category'
                              ? 'Budget Category'
                              : allocation.target_type === 'goal'
                              ? 'Savings Goal'
                              : 'Unallocated'}
                          </Text>
                        </View>
                        <Text className='text-lg font-bold text-green-600'>
                          +{formatCurrency(allocation.amount)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </ScrollView>

              {/* Action Buttons */}
              <View className='bg-white px-4 py-4 border-t border-gray-200'>
                <TouchableOpacity
                  onPress={handleExecuteAllocation}
                  disabled={executing}
                  className={`py-4 rounded-lg ${
                    executing ? 'bg-primary-400' : 'bg-primary'
                  }`}>
                  <Text className='text-white text-center font-semibold text-base'>
                    {executing ? 'Allocating...' : 'Confirm Allocation'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View className='flex-1 items-center justify-center p-6'>
              <Ionicons name='information-circle-outline' size={64} color='#9ca3af' />
              <Text className='text-gray-600 text-center mt-4 text-base'>
                No allocation rules configured for this account.{'\n'}
                Please set up allocation rules first.
              </Text>
              <TouchableOpacity
                onPress={handleConfigureRules}
                className='bg-primary px-6 py-3 rounded-lg mt-4'>
                <Text className='text-white font-semibold'>Configure Rules</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}
