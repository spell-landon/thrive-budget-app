import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import {
  getSubscriptions,
  deleteSubscription,
  getTotalMonthlyCost,
  calculateMonthlySavings,
} from '../services/subscriptions';
import { formatCurrency } from '../utils/currency';
import { Subscription } from '../types';

export default function SubscriptionsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [totalMonthlyCost, setTotalMonthlyCost] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSubscriptions = useCallback(async () => {
    if (!user) return;

    try {
      const [data, monthlyCost] = await Promise.all([
        getSubscriptions(user.id),
        getTotalMonthlyCost(user.id),
      ]);
      setSubscriptions(data);
      setTotalMonthlyCost(monthlyCost);
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
      loadSubscriptions();
    }, [loadSubscriptions])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadSubscriptions();
  }, [loadSubscriptions]);

  const handleDelete = (subscription: Subscription) => {
    Alert.alert('Delete Subscription', `Are you sure you want to delete ${subscription.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteSubscription(subscription.id);
            loadSubscriptions();
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
      case 'monthly':
        return 'calendar';
      case 'quarterly':
        return 'calendar-sharp';
      case 'yearly':
        return 'calendar-number-outline';
      default:
        return 'calendar-outline';
    }
  };

  const getFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case 'weekly':
        return 'Weekly';
      case 'monthly':
        return 'Monthly';
      case 'quarterly':
        return 'Quarterly';
      case 'yearly':
        return 'Yearly';
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

  // Group subscriptions by frequency
  const weeklySubscriptions = subscriptions.filter((s) => s.frequency === 'weekly');
  const monthlySubscriptions = subscriptions.filter((s) => s.frequency === 'monthly');
  const quarterlySubscriptions = subscriptions.filter((s) => s.frequency === 'quarterly');
  const yearlySubscriptions = subscriptions.filter((s) => s.frequency === 'yearly');

  const SubscriptionSection = ({
    title,
    items,
    icon,
  }: {
    title: string;
    items: Subscription[];
    icon: string;
  }) => {
    if (items.length === 0) return null;

    return (
      <View className="mb-4">
        <View className="flex-row items-center mb-2 px-1">
          <Ionicons name={icon as any} size={18} color="#2563eb" />
          <Text className="text-base font-bold text-gray-800 ml-2">{title}</Text>
          <Text className="text-sm text-gray-500 ml-2">({items.length})</Text>
        </View>

        {items.map((subscription) => {
          const daysUntil = getDaysUntil(subscription.next_billing_date);
          const isDueSoon = daysUntil >= 0 && daysUntil <= subscription.reminder_days_before;
          const monthlySavings =
            subscription.frequency === 'yearly'
              ? calculateMonthlySavings(subscription.amount)
              : null;

          return (
            <TouchableOpacity
              key={subscription.id}
              onPress={() =>
                navigation.navigate('EditSubscription', { subscriptionId: subscription.id })
              }
              className={`bg-white rounded-lg p-3 mb-2 shadow-sm border ${
                isDueSoon ? 'border-orange-500' : 'border-gray-100'
              }`}
              activeOpacity={0.7}
            >
              {/* Header Row */}
              <View className="flex-row justify-between items-start mb-2">
                <View className="flex-1">
                  <Text className="text-base font-bold text-gray-800">{subscription.name}</Text>
                  {subscription.auto_pay && (
                    <View className="flex-row items-center mt-1">
                      <Ionicons name="checkmark-circle" size={12} color="#16a34a" />
                      <Text className="text-xs text-green-600 ml-1">Auto-pay</Text>
                    </View>
                  )}
                </View>
                <View className="flex-row items-center gap-2">
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      navigation.navigate('EditSubscription', { subscriptionId: subscription.id });
                    }}
                    className="ml-2"
                  >
                    <Ionicons name="pencil-outline" size={16} color="#2563eb" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      handleDelete(subscription);
                    }}
                  >
                    <Ionicons name="trash-outline" size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Amount Row */}
              <View className="flex-row items-baseline mb-2">
                <Text className="text-xl font-bold text-gray-800">
                  {formatCurrency(subscription.amount)}
                </Text>
                <Text className="text-sm text-gray-500 ml-1">
                  / {getFrequencyLabel(subscription.frequency).toLowerCase()}
                </Text>
              </View>

              {/* Monthly Savings for Yearly */}
              {monthlySavings && (
                <View className="bg-blue-50 rounded-lg px-2 py-1.5 mb-2">
                  <Text className="text-xs text-blue-700">
                    💡 Save {formatCurrency(monthlySavings)}/month to avoid surprise bill
                  </Text>
                </View>
              )}

              {/* Next Billing */}
              <View className="flex-row justify-between items-center pt-2 border-t border-gray-100">
                <View>
                  <Text className="text-xs text-gray-500 mb-0.5">Next Billing</Text>
                  <Text className="text-sm font-semibold text-gray-800">
                    {formatDate(subscription.next_billing_date)}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-xs text-gray-500 mb-0.5">Reminder</Text>
                  <View
                    className={`px-2 py-1 rounded-full ${
                      isDueSoon ? 'bg-orange-100' : 'bg-gray-100'
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        isDueSoon ? 'text-orange-700' : 'text-gray-700'
                      }`}
                    >
                      {daysUntil === 0
                        ? 'Today'
                        : daysUntil === 1
                        ? 'Tomorrow'
                        : daysUntil < 0
                        ? 'Overdue'
                        : `${daysUntil} days`}
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['bottom']}>
      <ScrollView
          className="flex-1"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Total Monthly Cost Card */}
          {subscriptions.length > 0 && (
            <View className="p-4">
              <View className="bg-blue-600 rounded-2xl p-5 mb-4 shadow-lg">
                <Text className="text-blue-100 text-xs uppercase font-semibold tracking-wide mb-1">
                  Monthly Average
                </Text>
                <Text className="text-white text-3xl font-bold mb-1">
                  {formatCurrency(Math.round(totalMonthlyCost))}
                </Text>
                <Text className="text-blue-100 text-xs">
                  {subscriptions.length} active subscription{subscriptions.length !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>
          )}

          {loading ? (
            <Text className="text-gray-600 text-center mt-8">Loading subscriptions...</Text>
          ) : subscriptions.length === 0 ? (
            <View className="items-center mt-12 px-4">
              <Ionicons name="repeat-outline" size={64} color="#9ca3af" />
              <Text className="text-gray-600 mt-4 text-center text-lg mb-2">
                No subscriptions yet
              </Text>
              <Text className="text-gray-500 text-center mb-6">
                Track your recurring expenses and get reminders before they're due
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('AddSubscription')}
                className="bg-blue-600 px-6 py-3 rounded-lg"
              >
                <Text className="text-white font-semibold">Add Your First Subscription</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="p-4">
              <SubscriptionSection
                title="Yearly"
                items={yearlySubscriptions}
                icon="calendar-number-outline"
              />
              <SubscriptionSection
                title="Quarterly"
                items={quarterlySubscriptions}
                icon="calendar-sharp"
              />
              <SubscriptionSection title="Monthly" items={monthlySubscriptions} icon="calendar" />
              <SubscriptionSection
                title="Weekly"
                items={weeklySubscriptions}
                icon="calendar-outline"
              />
            </View>
          )}
        </ScrollView>
    </SafeAreaView>
  );
}
