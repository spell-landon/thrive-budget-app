import React, { useState, useEffect } from 'react';
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

type CategoryType = 'income' | 'expense' | 'savings';

export default function AddBudgetCategoryScreen({ route, navigation }: any) {
  const { budgetId } = route.params;
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [type, setType] = useState<CategoryType>('expense');
  const [allocatedAmount, setAllocatedAmount] = useState('');
  const [categoryGroup, setCategoryGroup] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const categoryTypes: {
    value: CategoryType;
    label: string;
    icon: string;
    color: string;
  }[] = [
    { value: 'income', label: 'Income', icon: 'cash', color: 'green' },
    { value: 'expense', label: 'Expense', icon: 'cart', color: 'red' },
    { value: 'savings', label: 'Savings', icon: 'wallet', color: 'blue' },
  ];

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

  // Pass submit handler to navigation params for header button
  useEffect(() => {
    navigation.setParams({
      handleSubmit: () => handleSubmit(false),
      loading,
    });
  }, [loading]);

  const handleSubmit = async (addAnother: boolean = false) => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }

    if (!allocatedAmount.trim()) {
      Alert.alert('Error', 'Please enter an allocated amount');
      return;
    }

    setLoading(true);

    try {
      const amountInCents = parseCurrencyInput(allocatedAmount);

      await createBudgetCategory({
        budget_id: budgetId,
        name: name.trim(),
        category_type: type,
        allocated_amount: amountInCents,
        available_amount: 0,
        spent_amount: 0,
        category_group: categoryGroup || undefined,
        sort_order: 0, // New categories default to 0, can be reordered later
        due_date: dueDate ? formatDateToLocalString(dueDate) : undefined,
      });

      if (addAnother) {
        // Keep type and group, clear name and amount
        Alert.alert('Success', 'Category added! Add another one.');
        setName('');
        setAllocatedAmount('');
      } else {
        Alert.alert('Success', 'Category added successfully!');
        navigation.goBack();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className='flex-1 bg-gray-50' edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className='flex-1'>
        <ScrollView className='flex-1'>
          <View className='p-6'>
            {/* Category Type */}
            <View className='mb-4'>
              <Text className='text-gray-700 font-semibold mb-2'>Type *</Text>
              <View className='flex-row gap-2'>
                {categoryTypes.map((categoryType) => (
                  <TouchableOpacity
                    key={categoryType.value}
                    onPress={() => setType(categoryType.value)}
                    className={`flex-1 flex-row items-center justify-center px-4 py-3 rounded-lg border ${
                      type === categoryType.value
                        ? `bg-${categoryType.color}-100 border-${categoryType.color}-500`
                        : 'bg-white border-gray-300'
                    }`}>
                    <Ionicons
                      name={categoryType.icon as any}
                      size={20}
                      color={
                        type === categoryType.value
                          ? categoryType.color === 'green'
                            ? '#16a34a'
                            : categoryType.color === 'red'
                            ? '#dc2626'
                            : '#2563eb'
                          : '#6b7280'
                      }
                    />
                    <Text
                      className={`ml-2 text-sm ${
                        type === categoryType.value
                          ? `text-${categoryType.color}-700 font-semibold`
                          : 'text-gray-700'
                      }`}>
                      {categoryType.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text className='text-xs text-gray-500 mt-2'>
                {type === 'income'
                  ? 'Money coming in (e.g., Salary, Side Income)'
                  : type === 'expense'
                  ? 'Money going out (e.g., Groceries, Rent, Utilities)'
                  : 'Money set aside for future goals (e.g., Emergency Fund, Vacation)'}
              </Text>
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
                    categoryType: type,
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
                {type === 'income'
                  ? 'Group income sources (e.g., "Salary", "Side Income")'
                  : type === 'expense'
                  ? 'Group expenses by category (e.g., "Housing", "Food & Dining")'
                  : 'Group savings by purpose (e.g., "Emergency Fund", "Goals")'}
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
                placeholder={
                  type === 'income'
                    ? 'e.g., Salary'
                    : type === 'expense'
                    ? 'e.g., Groceries'
                    : 'e.g., Emergency Fund'
                }
                autoCapitalize='words'
                textAlignVertical='center'
              />
            </View>

            {/* Allocated Amount */}
            <View>
              <Text className='text-gray-700 font-semibold mb-2'>
                {type === 'income' ? 'Expected Amount *' : 'Allocated Amount *'}
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
                {type === 'income'
                  ? 'How much income do you expect?'
                  : type === 'expense'
                  ? 'How much do you plan to spend?'
                  : 'How much do you want to save?'}
              </Text>
            </View>

            {/* Due Date (for expenses only) */}
            {type === 'expense' && (
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
            )}

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
