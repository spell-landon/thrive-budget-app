import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../contexts/AuthContext';
import { createBudgetCategory } from '../services/budgets';
import { parseCurrencyInput, formatCurrencyInput } from '../utils/currency';
import { formatDateToLocalString } from '../utils/date';
import {
  userHasCategoryGroups,
  initializeDefaultCategoryGroups,
} from '../services/categoryGroups';

export default function AddBudgetCategoryScreen({ route, navigation }: any) {
  const { budgetId, accountId } = route.params;
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [allocatedAmount, setAllocatedAmount] = useState('');
  const [categoryGroup, setCategoryGroup] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Initialize default groups if user doesn't have any
  useEffect(() => {
    const initGroups = async () => {
      if (!user) return;

      try {
        const hasGroups = await userHasCategoryGroups(user.id);
        if (!hasGroups) {
          await initializeDefaultCategoryGroups(user.id);
        }
      } catch (error: any) {
        console.error('Error initializing category groups:', error);
      }
    };

    initGroups();
  }, [user]);

  const handleSubmit = useCallback(async (addAnother: boolean = false) => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }

    if (!accountId) {
      Alert.alert('Error', 'Account ID is required');
      return;
    }

    setLoading(true);

    try {
      // Default to 0 if no amount entered
      const amountInCents = allocatedAmount.trim()
        ? parseCurrencyInput(allocatedAmount)
        : 0;

      await createBudgetCategory({
        budget_id: budgetId,
        account_id: accountId,
        name: name.trim(),
        category_type: 'expense', // All categories are 'expense' now (goals use goal-tracking accounts)
        allocated_amount: amountInCents,
        available_amount: 0,
        spent_amount: 0,
        category_group: categoryGroup || undefined,
        sort_order: 0, // New categories default to 0, can be reordered later
        due_date: dueDate ? formatDateToLocalString(dueDate) : undefined,
      });

      if (addAnother) {
        // Keep group, clear name and amount
        Alert.alert('Success', 'Category added! Add another one.');
        setName('');
        setAllocatedAmount('');
        setLoading(false);
      } else {
        Alert.alert('Success', 'Category added successfully!');
        navigation.goBack();
        // Don't reset loading state when navigating away - the screen is unmounting
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
      setLoading(false); // Only reset loading if we're staying on the screen
    }
  }, [name, allocatedAmount, accountId, budgetId, categoryGroup, dueDate, navigation]);

  // Pass submit handler to navigation params for header button
  useEffect(() => {
    navigation.setParams({
      handleSubmit: () => handleSubmit(false),
      loading,
    });
  }, [loading, handleSubmit, navigation]);

  return (
    <SafeAreaView className='flex-1 bg-gray-50' edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className='flex-1'>
        <ScrollView className='flex-1'>
          <View className='p-6'>
            {/* Info Banner */}
            <View className='bg-blue-50 rounded-lg p-4 mb-4'>
              <View className='flex-row items-start'>
                <Ionicons name='information-circle' size={20} color='#3B82F6' />
                <Text className='text-blue-700 text-sm ml-2 flex-1'>
                  All categories are expense categories. For savings goals, use goal-tracking accounts on the Goals screen.
                </Text>
              </View>
            </View>

            {/* Category Group */}
            <View className='mb-4'>
              <Text className='text-gray-700 font-semibold mb-2'>
                Category Group (Optional)
              </Text>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('SelectCategoryGroup', {
                    selectedCategoryGroup: categoryGroup,
                    categoryType: 'expense',
                    onSelect: (groupName: string | null) => setCategoryGroup(groupName),
                  })
                }
                className='border border-gray-300 rounded-lg px-4 py-3 bg-white flex-row items-center justify-between'>
                <View className='flex-row items-center flex-1'>
                  {categoryGroup ? (
                    <>
                      <Ionicons
                        name='folder-outline'
                        size={20}
                        color='#FF6B35'
                      />
                      <Text className='ml-2 text-gray-800'>
                        {categoryGroup}
                      </Text>
                    </>
                  ) : (
                    <Text className='text-gray-400'>No group</Text>
                  )}
                </View>
                <Ionicons name='chevron-down' size={20} color='#9ca3af' />
              </TouchableOpacity>
              <Text className='text-xs text-gray-500 mt-1'>
                Group expenses by category (e.g., "Housing", "Food & Dining")
              </Text>
            </View>

            {/* Category Name */}
            <View className='mb-4'>
              <Text className='text-gray-700 font-semibold mb-2'>
                Category Name *
              </Text>
              <TextInput
                className='border border-gray-300 rounded-lg px-4 py-3 bg-white'
                value={name}
                onChangeText={setName}
                placeholder='e.g., Groceries'
                autoCapitalize='words'
                textAlignVertical='center'
              />
            </View>

            {/* Allocated Amount */}
            <View>
              <Text className='text-gray-700 font-semibold mb-2'>
                Allocated Amount (Optional)
              </Text>
              <View className='flex-row items-center border border-gray-300 rounded-lg bg-white'>
                <Text className='text-gray-500 text-lg px-4'>$</Text>
                <TextInput
                  className='flex-1 py-3 pr-4'
                  value={allocatedAmount}
                  onChangeText={setAllocatedAmount}
                  onBlur={() => {
                    if (allocatedAmount) {
                      setAllocatedAmount(formatCurrencyInput(allocatedAmount));
                    }
                  }}
                  placeholder='0.00'
                  keyboardType='decimal-pad'
                />
              </View>
              <Text className='text-xs text-gray-500 mt-1'>
                Leave blank for $0. Assign money from "Ready to Assign" later.
              </Text>
            </View>

            {/* Due Date */}
            <View className='mt-4'>
              <Text className='text-gray-700 font-semibold mb-2'>
                Due Date (Optional)
              </Text>
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                className='border border-gray-300 rounded-lg px-4 py-3 bg-white flex-row items-center justify-between'>
                <Text className={dueDate ? 'text-gray-800' : 'text-gray-400'}>
                  {dueDate
                    ? dueDate.toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'No due date'}
                </Text>
                <View className='flex-row items-center'>
                  {dueDate && (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        setDueDate(null);
                      }}
                      className='mr-2'>
                      <Ionicons name='close-circle' size={20} color='#9ca3af' />
                    </TouchableOpacity>
                  )}
                  <Ionicons name='calendar-outline' size={20} color='#6b7280' />
                </View>
              </TouchableOpacity>
              <Text className='text-xs text-gray-500 mt-1'>
                Set a due date to prioritize this expense in smart allocation
              </Text>
            </View>

            {/* Action Buttons */}
            <View className='mt-6 gap-3'>
              <TouchableOpacity
                onPress={() => handleSubmit(false)}
                disabled={loading}
                className={`py-4 rounded-lg ${
                  loading ? 'bg-primary-400' : 'bg-primary'
                }`}>
                <Text className='text-white text-center font-semibold text-base'>
                  {loading ? 'Adding...' : 'Add Category'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleSubmit(true)}
                disabled={loading}
                className='py-4 rounded-lg border-2 border-primary bg-white'>
                <Text className='text-primary text-center font-semibold text-base'>
                  Add & Create Another
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* Date Picker */}
        {showDatePicker && Platform.OS === 'android' && (
          <DateTimePicker
            value={dueDate || new Date()}
            mode='date'
            display='calendar'
            minimumDate={new Date()}
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (event.type === 'set' && selectedDate) {
                setDueDate(selectedDate);
              }
            }}
          />
        )}

        {/* Date Picker Modal for iOS */}
        {Platform.OS === 'ios' && (
          <Modal
            visible={showDatePicker}
            transparent
            animationType='slide'
            onRequestClose={() => setShowDatePicker(false)}
          >
            <View className='flex-1 bg-black/50 justify-end'>
              <View className='bg-white rounded-t-3xl pb-8'>
                <View className='flex-row items-center justify-between px-6 py-4 border-b border-gray-200'>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text className='text-base font-semibold text-gray-600'>Cancel</Text>
                  </TouchableOpacity>
                  <Text className='text-lg font-bold text-gray-800'>Select Date</Text>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text className='text-base font-semibold text-primary'>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={dueDate || new Date()}
                  mode='date'
                  display='inline'
                  minimumDate={new Date()}
                  style={{ marginLeft: 'auto', marginRight: 'auto' }}
                  onChange={(event, selectedDate) => {
                    if (selectedDate) {
                      setDueDate(selectedDate);
                    }
                  }}
                />
              </View>
            </View>
          </Modal>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
