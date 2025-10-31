import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { getPaycheckPlans, deletePaycheckPlan, processDuePaychecks } from '../services/paychecks';
import { formatCurrency } from '../utils/currency';
import { PaycheckPlan } from '../types';

export default function PaycheckPlanningScreen({ navigation }: any) {
  const { user } = useAuth();
  const [paychecks, setPaychecks] = useState<PaycheckPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <View className="flex-1">
        {/* Header */}
        <View className="px-6 py-4 bg-white border-b border-gray-200">
          <View className="flex-row justify-between items-center">
            <View className="flex-row items-center">
              <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
                <Ionicons name="arrow-back" size={24} color="#1f2937" />
              </TouchableOpacity>
              <Text className="text-2xl font-bold text-gray-800">Paycheck Planning</Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('AddPaycheck')}
              className="bg-blue-600 px-4 py-2 rounded-lg"
            >
              <Text className="text-white font-semibold">Add Paycheck</Text>
            </TouchableOpacity>
          </View>
        </View>

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

                return (
                  <TouchableOpacity
                    key={paycheck.id}
                    onPress={() => navigation.navigate('PaycheckAllocation', { paycheckId: paycheck.id })}
                    className={`bg-white rounded-lg p-4 mb-3 shadow-sm border ${
                      isUpcoming ? 'border-green-500' : 'border-gray-100'
                    }`}
                    activeOpacity={0.7}
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
                          onPress={(e) => {
                            e.stopPropagation();
                            navigation.navigate('EditPaycheck', { paycheckId: paycheck.id });
                          }}
                          className="ml-2"
                        >
                          <Ionicons name="pencil-outline" size={18} color="#2563eb" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={(e) => {
                            e.stopPropagation();
                            handleDelete(paycheck);
                          }}
                        >
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
                    <View className="flex-row justify-between items-center pt-3 border-t border-gray-100">
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
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
