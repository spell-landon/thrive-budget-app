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
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../contexts/AuthContext';
import { getCategoryById, updateBudgetCategory, deleteBudgetCategory } from '../services/budgets';
import { centsToInputValue, parseCurrencyInput, formatCurrencyInput } from '../utils/currency';
import { formatDateToLocalString, parseDateString } from '../utils/date';

export default function EditBudgetCategoryScreen({ route, navigation }: any) {
  const { categoryId, budgetId } = route.params;
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [allocatedAmount, setAllocatedAmount] = useState('');
  const [availableAmount, setAvailableAmount] = useState('');
  const [categoryGroup, setCategoryGroup] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    loadCategory();
  }, [categoryId]);

  const loadCategory = async () => {
    try {
      const category = await getCategoryById(categoryId);
      setName(category.name);
      // Category type is always 'expense' now
      setAllocatedAmount(centsToInputValue(category.allocated_amount));
      setAvailableAmount(centsToInputValue(category.available_amount));
      setCategoryGroup(category.category_group || null);
      setDueDate(category.due_date ? parseDateString(category.due_date) : null);
    } catch (error: any) {
      Alert.alert('Error', error.message);
      navigation.goBack();
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }

    if (!allocatedAmount.trim()) {
      Alert.alert('Error', 'Please enter an allocated amount');
      return;
    }

    if (!availableAmount.trim()) {
      Alert.alert('Error', 'Please enter an available amount');
      return;
    }

    setLoading(true);

    try {
      const allocatedInCents = parseCurrencyInput(allocatedAmount);
      const availableInCents = parseCurrencyInput(availableAmount);

      await updateBudgetCategory(categoryId, {
        name: name.trim(),
        category_type: 'expense', // All categories are expense type now
        allocated_amount: allocatedInCents,
        available_amount: availableInCents,
        category_group: categoryGroup || undefined,
        due_date: dueDate ? formatDateToLocalString(dueDate) : undefined,
      });

      Alert.alert('Success', 'Category updated successfully!');
      navigation.goBack();
      // Don't reset loading state when navigating away - the screen is unmounting
    } catch (error: any) {
      Alert.alert('Error', error.message);
      setLoading(false); // Only reset loading if we're staying on the screen
    }
  }, [name, allocatedAmount, availableAmount, categoryGroup, dueDate, categoryId, navigation]);

  // Pass submit handler to navigation params for header button
  useEffect(() => {
    navigation.setParams({
      handleSubmit,
      loading,
    });
  }, [loading, handleSubmit, navigation]);

  const handleDelete = () => {
    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteBudgetCategory(categoryId);
              Alert.alert('Success', 'Category deleted successfully!');
              navigation.goBack();
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  if (loadingData) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={['bottom']}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView className="flex-1">
          <View className="p-6">
            {/* Category Group */}
            <View className="mb-4">
              <Text className="text-gray-700 font-semibold mb-2">Category Group (Optional)</Text>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('SelectCategoryGroup', {
                    selectedCategoryGroup: categoryGroup,
                    categoryType: 'expense',
                    onSelect: (groupName: string | null) => setCategoryGroup(groupName),
                  })
                }
                className="border border-gray-300 rounded-lg px-4 py-3 bg-white flex-row items-center justify-between"
              >
                <View className="flex-row items-center flex-1">
                  {categoryGroup ? (
                    <>
                      <Ionicons
                        name="folder-outline"
                        size={20}
                        color="#FF6B35"
                      />
                      <Text className="ml-2 text-gray-800">{categoryGroup}</Text>
                    </>
                  ) : (
                    <Text className="text-gray-400">No group</Text>
                  )}
                </View>
                <Ionicons name="chevron-down" size={20} color="#9ca3af" />
              </TouchableOpacity>
              <Text className="text-xs text-gray-500 mt-1">
                Group expenses by category (e.g., "Housing", "Food & Dining")
              </Text>
            </View>

            {/* Category Name */}
            <View className="mb-4">
              <Text className="text-gray-700 font-semibold mb-2">Category Name *</Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 bg-white"
                value={name}
                onChangeText={setName}
                placeholder='e.g., Groceries'
                autoCapitalize="words"
                textAlignVertical="center"
              />
            </View>

            {/* Allocated Amount */}
            <View className="mb-4">
              <Text className="text-gray-700 font-semibold mb-2">
                Allocated Amount *
              </Text>
              <View className="flex-row items-center border border-gray-300 rounded-lg bg-white">
                <Text className="text-gray-500 text-lg px-4">$</Text>
                <TextInput
                  className="flex-1 py-3 pr-4"
                  value={allocatedAmount}
                  onChangeText={setAllocatedAmount}
                  onBlur={() => {
                    if (allocatedAmount) {
                      setAllocatedAmount(formatCurrencyInput(allocatedAmount));
                    }
                  }}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                />
              </View>
              <Text className="text-xs text-gray-500 mt-1">
                How much do you plan to spend? (Your monthly target)
              </Text>
            </View>

            {/* Available Amount */}
            <View className="mb-4">
              <Text className="text-gray-700 font-semibold mb-2">
                Available in Envelope *
              </Text>
              <View className="flex-row items-center border border-gray-300 rounded-lg bg-white">
                <Text className="text-gray-500 text-lg px-4">$</Text>
                <TextInput
                  className="flex-1 py-3 pr-4"
                  value={availableAmount}
                  onChangeText={setAvailableAmount}
                  onBlur={() => {
                    if (availableAmount) {
                      setAvailableAmount(formatCurrencyInput(availableAmount));
                    }
                  }}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                />
              </View>
              <Text className="text-xs text-gray-500 mt-1">
                The actual cash currently in this envelope. This is what you can spend right now.
              </Text>
            </View>

            {/* Due Date */}
            <View className="mt-4">
              <Text className="text-gray-700 font-semibold mb-2">
                Due Date (Optional)
              </Text>
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                className="border border-gray-300 rounded-lg px-4 py-3 bg-white flex-row items-center justify-between">
                <Text className={dueDate ? 'text-gray-800' : 'text-gray-400'}>
                  {dueDate
                    ? dueDate.toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'No due date'}
                </Text>
                <View className="flex-row items-center">
                  {dueDate && (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        setDueDate(null);
                      }}
                      className="mr-2">
                      <Ionicons name="close-circle" size={20} color="#9ca3af" />
                    </TouchableOpacity>
                  )}
                  <Ionicons name="calendar-outline" size={20} color="#6b7280" />
                </View>
              </TouchableOpacity>
              <Text className="text-xs text-gray-500 mt-1">
                Set a due date to prioritize this expense in smart allocation
              </Text>
            </View>

            {/* Delete Button */}
            <View className="mt-8 pt-6 border-t border-gray-200">
              <TouchableOpacity
                onPress={handleDelete}
                className="bg-error-500 px-6 py-3 rounded-lg flex-row items-center justify-center"
              >
                <Ionicons name="trash" size={20} color="white" />
                <Text className="text-white font-semibold ml-2">Delete Category</Text>
              </TouchableOpacity>
              <Text className="text-xs text-gray-500 text-center mt-2">
                This will permanently delete this category and cannot be undone
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Date Picker */}
        {showDatePicker && Platform.OS === 'android' && (
          <DateTimePicker
            value={dueDate || new Date()}
            mode="date"
            display="calendar"
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
            animationType="slide"
            onRequestClose={() => setShowDatePicker(false)}>
            <View className="flex-1 bg-black/50 justify-end">
              <View className="bg-white rounded-t-3xl pb-8">
                <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-200">
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text className="text-base font-semibold text-gray-600">
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <Text className="text-lg font-bold text-gray-800">
                    Select Due Date
                  </Text>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text className="text-base font-semibold text-primary">
                      Done
                    </Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={dueDate || new Date()}
                  mode="date"
                  display="inline"
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
