import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import {
  getIncomeSource,
  getAccountSplits,
  createAccountSplit,
  updateAccountSplit,
  deleteAccountSplit,
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getTotalPercentageAllocated,
  getTotalFixedAllocated,
  previewTemplateApplication,
} from '../services/incomeTemplates';
import { getRegularBudgetAccounts } from '../services/accounts';
import { getOrCreateCurrentMonthBudget } from '../services/budgets';
import { formatCurrency, parseCurrencyInput, formatCurrencyInput } from '../utils/currency';
import { IncomeSource, IncomeTemplate, IncomeAccountSplit, Account } from '../types';

type AllocationType = 'percentage' | 'fixed' | 'remainder';
type CategoryType = 'expense'; // Only expense type now (savings are in goal-tracking accounts)

export default function IncomeTemplateScreen({ route, navigation }: any) {
  const { sourceId } = route.params;
  const { user } = useAuth();
  const [source, setSource] = useState<IncomeSource | null>(null);
  const [templates, setTemplates] = useState<IncomeTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<IncomeTemplate | null>(null);

  // Form state
  const [categoryName, setCategoryName] = useState('');
  const [allocationType, setAllocationType] = useState<AllocationType>('percentage');
  const [allocationValue, setAllocationValue] = useState('');
  const [priority, setPriority] = useState('0');
  const [saving, setSaving] = useState(false);

  // Category type is always 'expense' now (savings are in goal-tracking accounts)
  const categoryType: CategoryType = 'expense';

  // Stats
  const [totalPercentage, setTotalPercentage] = useState(0);
  const [totalFixed, setTotalFixed] = useState(0);

  const loadData = useCallback(async () => {
    try {
      const [sourceData, templatesData, percentage, fixed] = await Promise.all([
        getIncomeSource(sourceId),
        getTemplates(sourceId),
        getTotalPercentageAllocated(sourceId),
        getTotalFixedAllocated(sourceId),
      ]);

      setSource(sourceData);
      setTemplates(templatesData);
      setTotalPercentage(percentage);
      setTotalFixed(fixed);

      // Set navigation title
      navigation.setOptions({
        title: sourceData.name,
      });
    } catch (error: any) {
      console.error('Error loading template data:', error);
      Alert.alert('Error', 'Failed to load template data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sourceId, navigation]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const openAddModal = () => {
    setEditingTemplate(null);
    setCategoryName('');
    setAllocationType('percentage');
    setAllocationValue('');
    setPriority(templates.length.toString());
    setShowAddModal(true);
  };

  const openEditModal = (template: IncomeTemplate) => {
    setEditingTemplate(template);
    setCategoryName(template.category_name);
    setAllocationType(template.allocation_type);
    setAllocationValue(
      template.allocation_type === 'remainder'
        ? ''
        : template.allocation_type === 'percentage'
        ? template.allocation_value.toString()
        : (template.allocation_value / 100).toFixed(2)
    );
    setPriority(template.priority.toString());
    setShowAddModal(true);
  };

  const handleSave = async () => {
    if (!categoryName.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }

    // Only validate allocation value if not remainder type
    if (allocationType !== 'remainder' && !allocationValue.trim()) {
      Alert.alert('Error', 'Please enter an allocation value');
      return;
    }

    setSaving(true);

    try {
      // Remainder type doesn't need a value, set to 0
      const value =
        allocationType === 'remainder'
          ? 0
          : allocationType === 'percentage'
          ? parseFloat(allocationValue)
          : parseCurrencyInput(allocationValue);

      const priorityNum = parseInt(priority) || 0;

      if (editingTemplate) {
        await updateTemplate(editingTemplate.id, {
          category_name: categoryName.trim(),
          category_type: categoryType,
          allocation_type: allocationType,
          allocation_value: value,
          priority: priorityNum,
        });
        Alert.alert('Success', 'Template updated successfully!');
      } else {
        await createTemplate(sourceId, {
          category_name: categoryName.trim(),
          category_type: categoryType,
          allocation_type: allocationType,
          allocation_value: value,
          priority: priorityNum,
        });
        Alert.alert('Success', 'Template created successfully!');
      }

      setShowAddModal(false);
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (template: IncomeTemplate) => {
    Alert.alert(
      'Delete Template',
      `Are you sure you want to delete the allocation for "${template.category_name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTemplate(template.id);
              Alert.alert('Success', 'Template deleted successfully!');
              loadData();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete template');
            }
          },
        },
      ]
    );
  };

  const handlePreview = async () => {
    if (!user || !source) return;

    try {
      const budget = await getOrCreateCurrentMonthBudget(user.id);
      const testAmount = source.expected_amount || 100000; // Use expected or $1000 for preview

      const preview = await previewTemplateApplication(budget.id, sourceId, testAmount);

      // Build preview message
      let message = `Preview for ${formatCurrency(testAmount)}:\n\n`;
      preview.forEach((item) => {
        message += `${item.category_name}: ${formatCurrency(item.amount)}\n`;
      });

      const allocated = preview.reduce((sum, item) => sum + item.amount, 0);
      const remaining = testAmount - allocated;
      message += `\nRemaining: ${formatCurrency(remaining)}`;

      Alert.alert('Template Preview', message);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to preview template');
    }
  };

  const formatAllocationDisplay = (template: IncomeTemplate) => {
    if (template.allocation_type === 'remainder') {
      return 'Remainder';
    } else if (template.allocation_type === 'percentage') {
      return `${template.allocation_value}%`;
    } else {
      return formatCurrency(template.allocation_value);
    }
  };

  const allocationTypes = [
    { value: 'percentage' as AllocationType, label: 'Percentage', icon: 'percent' },
    { value: 'fixed' as AllocationType, label: 'Fixed Amount', icon: 'cash' },
    { value: 'remainder' as AllocationType, label: 'Remainder', icon: 'repeat' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
      <View className="flex-1">
        {/* Header with Source Info */}
        {source && (
          <View className="px-6 py-4 bg-card border-b border-gray-200">
            <Text className="text-lg font-bold text-text-primary">{source.name}</Text>
            {source.expected_amount > 0 && (
              <Text className="text-sm text-text-secondary mt-1">
                Expected: {formatCurrency(source.expected_amount)}
              </Text>
            )}
            <View className="flex-row mt-3 gap-4">
              <View className="flex-1">
                <Text className="text-xs text-text-secondary">Percentage Total</Text>
                <Text
                  className={`text-base font-bold ${
                    totalPercentage > 100 ? 'text-error-500' : 'text-text-primary'
                  }`}>
                  {totalPercentage}%
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-xs text-text-secondary">Fixed Total</Text>
                <Text className="text-base font-bold text-text-primary">
                  {formatCurrency(totalFixed)}
                </Text>
              </View>
            </View>
          </View>
        )}

        <ScrollView
          className="flex-1"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }>
          {loading ? (
            <Text className="text-text-secondary text-center mt-8">
              Loading templates...
            </Text>
          ) : templates.length === 0 ? (
            <View className="items-center mt-16 px-6">
              <Ionicons name="list-outline" size={64} color="#9ca3af" />
              <Text className="text-text-primary font-semibold text-lg mt-4 text-center">
                No allocation templates yet
              </Text>
              <Text className="text-text-secondary mt-2 text-center mb-6">
                Create templates to automatically distribute income to categories
              </Text>
              <TouchableOpacity
                onPress={openAddModal}
                className="bg-primary px-6 py-3 rounded-lg">
                <Text className="text-white font-semibold">
                  Create Your First Template
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="p-6">
              {/* Action Buttons */}
              <View className="flex-row gap-3 mb-4">
                <TouchableOpacity
                  onPress={openAddModal}
                  className="flex-1 bg-primary px-4 py-3 rounded-lg">
                  <View className="flex-row items-center justify-center">
                    <Ionicons name="add" size={20} color="white" />
                    <Text className="text-white font-semibold ml-2">Add Template</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handlePreview}
                  className="flex-1 bg-card border border-primary px-4 py-3 rounded-lg">
                  <View className="flex-row items-center justify-center">
                    <Ionicons name="eye-outline" size={20} color="#FF6B35" />
                    <Text className="text-primary font-semibold ml-2">Preview</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Templates List */}
              {templates.map((template, index) => (
                <View
                  key={template.id}
                  className="bg-card rounded-xl p-4 mb-3 border border-gray-200">
                  <View className="flex-row justify-between items-start mb-2">
                    <View className="flex-1">
                      <View className="flex-row items-center">
                        <Text className="text-xs text-text-secondary mr-2">
                          #{template.priority}
                        </Text>
                        <Text className="text-lg font-bold text-text-primary">
                          {template.category_name}
                        </Text>
                      </View>
                    </View>
                    <View className="flex-row items-center">
                      <TouchableOpacity
                        onPress={() => openEditModal(template)}
                        className="mr-2 p-2">
                        <Ionicons
                          name="create-outline"
                          size={20}
                          color="#6b7280"
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDelete(template)}
                        className="p-2">
                        <Ionicons name="trash-outline" size={20} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View className="bg-primary-50 rounded-lg p-3 mt-2">
                    <Text className="text-primary font-bold text-xl text-center">
                      {formatAllocationDisplay(template)}
                    </Text>
                    <Text className="text-xs text-primary text-center mt-1">
                      {template.allocation_type === 'remainder'
                        ? 'whatever is left'
                        : template.allocation_type === 'percentage'
                        ? 'of total income'
                        : 'fixed amount'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Add/Edit Modal */}
        <Modal
          visible={showAddModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowAddModal(false)}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1">
            <View className="flex-1 bg-black/50 justify-end">
              <View className="bg-background rounded-t-3xl pb-8 max-h-5/6">
                {/* Header */}
                <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-200">
                  <TouchableOpacity onPress={() => setShowAddModal(false)}>
                    <Text className="text-base font-semibold text-gray-600">
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <Text className="text-lg font-bold text-text-primary">
                    {editingTemplate ? 'Edit Template' : 'New Template'}
                  </Text>
                  <TouchableOpacity onPress={handleSave} disabled={saving}>
                    <Text
                      className={`text-base font-semibold ${
                        saving ? 'text-gray-400' : 'text-primary'
                      }`}>
                      {saving ? 'Saving...' : 'Save'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <ScrollView className="px-6 py-4">
                  {/* Category Name */}
                  <View className="mb-4">
                    <Text className="text-base font-semibold text-text-primary mb-2">
                      Category Name *
                    </Text>
                    <TextInput
                      className="bg-card border border-gray-200 rounded-lg px-4 py-3 text-base text-text-primary"
                      placeholder="e.g., Groceries, Emergency Fund"
                      value={categoryName}
                      onChangeText={setCategoryName}
                      placeholderTextColor="#9ca3af"
                    />
                  </View>

                  {/* Info Banner */}
                  <View className="mb-4 bg-blue-50 rounded-lg p-3">
                    <Text className="text-blue-700 text-sm">
                      All income templates create expense categories. For savings, use goal-tracking accounts on the Goals screen.
                    </Text>
                  </View>

                  {/* Allocation Type */}
                  <View className="mb-4">
                    <Text className="text-base font-semibold text-text-primary mb-2">
                      Allocation Type *
                    </Text>
                    <View className="flex-row gap-2">
                      {allocationTypes.map((type) => (
                        <TouchableOpacity
                          key={type.value}
                          onPress={() => {
                            setAllocationType(type.value);
                            setAllocationValue('');
                          }}
                          className={`flex-1 flex-row items-center justify-center px-4 py-3 rounded-lg border ${
                            allocationType === type.value
                              ? 'bg-primary-100 border-primary'
                              : 'bg-card border-gray-200'
                          }`}>
                          <Ionicons
                            name={type.icon as any}
                            size={20}
                            color={allocationType === type.value ? '#FF6B35' : '#6b7280'}
                          />
                          <Text
                            className={`ml-2 text-sm ${
                              allocationType === type.value
                                ? 'text-primary font-semibold'
                                : 'text-gray-700'
                            }`}>
                            {type.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Allocation Value - only show if not remainder */}
                  {allocationType !== 'remainder' && (
                    <View className="mb-4">
                      <Text className="text-base font-semibold text-text-primary mb-2">
                        {allocationType === 'percentage' ? 'Percentage' : 'Amount'} *
                      </Text>
                      {allocationType === 'percentage' ? (
                        <View className="flex-row items-center bg-card border border-gray-200 rounded-lg px-4">
                          <TextInput
                            className="flex-1 py-3 text-base text-text-primary"
                            placeholder="0"
                            value={allocationValue}
                            onChangeText={setAllocationValue}
                            keyboardType="decimal-pad"
                            placeholderTextColor="#9ca3af"
                          />
                          <Text className="text-text-secondary text-lg">%</Text>
                        </View>
                      ) : (
                        <View className="flex-row items-center bg-card border border-gray-200 rounded-lg px-4">
                          <Text className="text-text-secondary text-lg">$</Text>
                          <TextInput
                            className="flex-1 py-3 text-base text-text-primary ml-2"
                            placeholder="0.00"
                            value={allocationValue}
                            onChangeText={setAllocationValue}
                            onBlur={() => {
                              if (allocationValue) {
                                setAllocationValue(formatCurrencyInput(allocationValue));
                              }
                            }}
                            keyboardType="decimal-pad"
                            placeholderTextColor="#9ca3af"
                          />
                        </View>
                      )}
                      <Text className="text-xs text-text-secondary mt-1">
                        {allocationType === 'percentage'
                          ? 'Percentage of total income (0-100)'
                          : 'Fixed dollar amount to allocate'}
                      </Text>
                    </View>
                  )}

                  {/* Remainder Info */}
                  {allocationType === 'remainder' && (
                    <View className="mb-4 bg-blue-50 rounded-lg p-4">
                      <View className="flex-row items-start">
                        <Ionicons name="information-circle" size={20} color="#3B82F6" />
                        <Text className="text-blue-700 text-sm ml-2 flex-1">
                          This category will receive whatever amount is left after all other allocations are applied.
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Priority */}
                  <View className="mb-4">
                    <Text className="text-base font-semibold text-text-primary mb-2">
                      Priority
                    </Text>
                    <TextInput
                      className="bg-card border border-gray-200 rounded-lg px-4 py-3 text-base text-text-primary"
                      placeholder="0"
                      value={priority}
                      onChangeText={setPriority}
                      keyboardType="number-pad"
                      placeholderTextColor="#9ca3af"
                    />
                    <Text className="text-xs text-text-secondary mt-1">
                      Lower numbers are applied first. Fixed amounts should have higher
                      priority than percentages.
                    </Text>
                  </View>
                </ScrollView>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </SafeAreaView>
  );
}
