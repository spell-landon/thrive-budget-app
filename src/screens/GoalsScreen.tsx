import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { getGoals } from '../services/goals';
import { formatCurrency } from '../utils/currency';
import { SavingsGoal } from '../types';
import { LinearGradient } from 'expo-linear-gradient';

export default function GoalsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadGoals = useCallback(async () => {
    if (!user) return;

    try {
      const data = await getGoals(user.id);
      setGoals(data);
    } catch (error: any) {
      console.error('Error loading goals:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadGoals();
    }, [loadGoals])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadGoals();
  }, [loadGoals]);

  const getProgress = (goal: SavingsGoal) => {
    if (goal.target_amount === 0) return 0;
    return Math.min((goal.current_amount / goal.target_amount) * 100, 100);
  };

  const getTotalSaved = () => {
    return goals.reduce((sum, goal) => sum + goal.current_amount, 0);
  };

  const getTotalTarget = () => {
    return goals.reduce((sum, goal) => sum + goal.target_amount, 0);
  };

  return (
    <SafeAreaView className='flex-1 bg-card' edges={['top']}>
      <View className='flex-1 bg-background'>
        {/* Header */}
        <View className='px-6 py-4 bg-card border-b border-gray-200'>
          <View className='flex-row justify-between items-center'>
            <View>
              <Text className='text-2xl font-bold text-text-primary'>
                Goals
              </Text>
              <Text className='text-sm text-text-secondary mt-1'>
                {formatCurrency(getTotalSaved())} of{' '}
                {formatCurrency(getTotalTarget())} saved
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('AddGoal')}
              className='bg-primary px-4 py-2 rounded-lg'>
              <View className='flex-row items-center'>
                <Ionicons name='add' size={20} color='white' />
                <Text className='text-white font-semibold ml-1'>New Goal</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          className='flex-1'
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }>
          {loading ? (
            <Text className='text-text-secondary text-center mt-8'>
              Loading goals...
            </Text>
          ) : goals.length === 0 ? (
            <View className='items-center mt-16 px-6'>
              <Ionicons name='flag-outline' size={64} color='#9ca3af' />
              <Text className='text-text-primary font-semibold text-lg mt-4 text-center'>
                No savings goals yet
              </Text>
              <Text className='text-text-secondary mt-2 text-center mb-6'>
                Create your first goal to start saving for what matters most to
                you
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('AddGoal')}
                className='bg-primary px-6 py-3 rounded-lg'>
                <Text className='text-white font-semibold'>
                  Create Your First Goal
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className='p-6'>
              {goals.map((goal) => {
                const progress = getProgress(goal);
                const remaining = goal.target_amount - goal.current_amount;

                return (
                  <TouchableOpacity
                    key={goal.id}
                    onPress={() =>
                      navigation.navigate('EditGoal', { goalId: goal.id })
                    }
                    className='mb-4 rounded-2xl overflow-hidden'
                    style={{
                      height: 192,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.1,
                      shadowRadius: 4,
                      elevation: 3,
                    }}
                    activeOpacity={0.9}>
                    <ImageBackground
                      source={{
                        uri:
                          goal.image_url ||
                          'https://images.unsplash.com/photo-1579621970795-87facc2f976d?w=800&q=80',
                      }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode='cover'>
                      {/* Gradient Overlay */}
                      <LinearGradient
                        colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']}
                        style={{
                          flex: 1,
                          padding: 20,
                          justifyContent: 'space-between',
                        }}>
                        {/* Top Section - Goal Name */}
                        <View className='flex-row justify-between items-start'>
                          <View className='flex-1'>
                            <Text className='text-white text-2xl font-bold mb-1'>
                              {goal.name}
                            </Text>
                            {goal.target_amount && (
                              <View className='flex-row items-center'>
                                <Ionicons
                                  name='checkmark-circle-outline'
                                  size={14}
                                  color='white'
                                />
                                <Text className='text-white/90 text-sm ml-1'>
                                  {formatCurrency(goal.target_amount)}
                                </Text>
                              </View>
                            )}
                            {goal.target_date && (
                              <View className='flex-row items-center'>
                                <Ionicons
                                  name='calendar-outline'
                                  size={14}
                                  color='white'
                                />
                                <Text className='text-white/90 text-sm ml-1'>
                                  Target:{' '}
                                  {new Date(
                                    goal.target_date
                                  ).toLocaleDateString('en-US', {
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </Text>
                              </View>
                            )}
                          </View>

                          {/* Percentage Badge */}
                          <View className='bg-white/25 rounded-full px-3 py-1'>
                            <Text className='text-white font-bold text-sm'>
                              {Math.round(progress)}%
                            </Text>
                          </View>
                        </View>

                        {/* Bottom Section - Progress */}
                        <View>
                          {/* Progress Bar */}
                          <View className='h-2.5 bg-white/30 rounded-full overflow-hidden mb-3'>
                            <View
                              className='h-2.5 bg-white rounded-full'
                              style={{ width: `${progress}%` }}
                            />
                          </View>

                          {/* Amounts */}
                          <View className='flex-row justify-between items-end'>
                            <View>
                              <Text className='text-white/80 text-xs mb-1'>
                                Saved
                              </Text>
                              <Text className='text-white text-lg font-bold'>
                                {formatCurrency(goal.current_amount)}
                              </Text>
                            </View>
                            <View className='items-end'>
                              <Text className='text-white/80 text-xs mb-1'>
                                {progress >= 100
                                  ? 'Goal Reached!'
                                  : 'Remaining'}
                              </Text>
                              <Text className='text-white text-lg font-bold'>
                                {progress >= 100
                                  ? '🎉'
                                  : formatCurrency(remaining)}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </LinearGradient>
                    </ImageBackground>
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
