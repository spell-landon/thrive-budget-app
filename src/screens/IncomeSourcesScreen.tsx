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
  getIncomeSources,
  createIncomeSource,
  updateIncomeSource,
  deleteIncomeSource,
} from '../services/incomeTemplates';
import { formatCurrency, parseCurrencyInput, formatCurrencyInput } from '../utils/currency';
import { IncomeSource } from '../types';

export default function IncomeSourcesScreen({ navigation }: any) {
  const { user } = useAuth();
  const [sources, setSources] = useState<IncomeSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSource, setEditingSource] = useState<IncomeSource | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [expectedAmount, setExpectedAmount] = useState('');
  const [frequency, setFrequency] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const loadSources = useCallback(async () => {
    if (!user) return;

    try {
      const data = await getIncomeSources(user.id);
      setSources(data);
    } catch (error: any) {
      console.error('Error loading income sources:', error);
      Alert.alert('Error', 'Failed to load income sources');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadSources();
    }, [loadSources])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadSources();
  }, [loadSources]);

  const openAddModal = () => {
    setEditingSource(null);
    setName('');
    setExpectedAmount('');
    setFrequency('');
    setNotes('');
    setShowAddModal(true);
  };

  const openEditModal = (source: IncomeSource) => {
    setEditingSource(source);
    setName(source.name);
    setExpectedAmount(
      source.expected_amount ? (source.expected_amount / 100).toFixed(2) : ''
    );
    setFrequency(source.frequency || '');
    setNotes(source.notes || '');
    setShowAddModal(true);
  };

  const handleSave = async () => {
    if (!user) return;

    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a name for this income source');
      return;
    }

    setSaving(true);

    try {
      const expectedAmountCents = expectedAmount
        ? parseCurrencyInput(expectedAmount)
        : 0;

      if (editingSource) {
        // Update existing source
        await updateIncomeSource(editingSource.id, {
          name: name.trim(),
          expected_amount: expectedAmountCents,
          frequency: frequency.trim() || undefined,
          notes: notes.trim() || undefined,
        });
        Alert.alert('Success', 'Income source updated successfully!');
      } else {
        // Create new source
        await createIncomeSource(user.id, {
          name: name.trim(),
          expected_amount: expectedAmountCents,
          frequency: frequency.trim() || undefined,
          notes: notes.trim() || undefined,
        });
        Alert.alert('Success', 'Income source created successfully!');
      }

      setShowAddModal(false);
      loadSources();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save income source');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (source: IncomeSource) => {
    Alert.alert(
      'Delete Income Source',
      `Are you sure you want to delete "${source.name}"? This will also delete all associated templates.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteIncomeSource(source.id);
              Alert.alert('Success', 'Income source deleted successfully!');
              loadSources();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete income source');
            }
          },
        },
      ]
    );
  };

  const frequencyOptions = [
    'Weekly',
    'Biweekly',
    'Monthly',
    'Quarterly',
    'Yearly',
    'Irregular',
  ];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
      <View className="flex-1">
        {/* Header */}
        <View className="px-6 py-4 bg-card border-b border-gray-200">
          <View className="flex-row justify-between items-center">
            <View>
              <Text className="text-2xl font-bold text-text-primary">
                Income Sources
              </Text>
              <Text className="text-sm text-text-secondary mt-1">
                Manage your income sources and allocation templates
              </Text>
            </View>
            <TouchableOpacity
              onPress={openAddModal}
              className="bg-primary px-4 py-2 rounded-lg">
              <View className="flex-row items-center">
                <Ionicons name="add" size={20} color="white" />
                <Text className="text-white font-semibold ml-1">New</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          className="flex-1"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }>
          {loading ? (
            <Text className="text-text-secondary text-center mt-8">
              Loading income sources...
            </Text>
          ) : sources.length === 0 ? (
            <View className="items-center mt-16 px-6">
              <Ionicons name="cash-outline" size={64} color="#9ca3af" />
              <Text className="text-text-primary font-semibold text-lg mt-4 text-center">
                No income sources yet
              </Text>
              <Text className="text-text-secondary mt-2 text-center mb-6">
                Create an income source to set up allocation templates
              </Text>
              <TouchableOpacity
                onPress={openAddModal}
                className="bg-primary px-6 py-3 rounded-lg">
                <Text className="text-white font-semibold">
                  Create Your First Source
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="p-6">
              {sources.map((source) => (
                <TouchableOpacity
                  key={source.id}
                  onPress={() =>
                    navigation.navigate('AccountSplits', { sourceId: source.id })
                  }
                  className="bg-card rounded-xl p-4 mb-3 border border-gray-200">
                  <View className="flex-row justify-between items-start mb-2">
                    <View className="flex-1">
                      <Text className="text-lg font-bold text-text-primary">
                        {source.name}
                      </Text>
                      {source.frequency && (
                        <Text className="text-sm text-text-secondary mt-1">
                          {source.frequency}
                        </Text>
                      )}
                    </View>
                    <View className="flex-row items-center">
                      <TouchableOpacity
                        onPress={() => openEditModal(source)}
                        className="mr-2 p-2">
                        <Ionicons
                          name="create-outline"
                          size={20}
                          color="#6b7280"
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDelete(source)}
                        className="p-2">
                        <Ionicons name="trash-outline" size={20} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {source.expected_amount > 0 && (
                    <View className="flex-row items-center mb-2">
                      <Ionicons
                        name="wallet-outline"
                        size={16}
                        color="#6b7280"
                      />
                      <Text className="text-sm text-text-secondary ml-2">
                        Expected: {formatCurrency(source.expected_amount)}
                      </Text>
                    </View>
                  )}

                  {source.notes && (
                    <Text className="text-sm text-text-secondary mt-2">
                      {source.notes}
                    </Text>
                  )}

                  <TouchableOpacity
                    onPress={() =>
                      navigation.navigate('IncomeTemplate', { sourceId: source.id })
                    }
                    className="mt-3 flex-row items-center">
                    <Ionicons name="list-outline" size={16} color="#FF6B35" />
                    <Text className="text-sm text-primary ml-2 font-semibold">
                      Manage Templates
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color="#FF6B35" />
                  </TouchableOpacity>
                </TouchableOpacity>
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
              <View className="bg-background rounded-t-3xl pb-8">
                {/* Header */}
                <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-200">
                  <TouchableOpacity onPress={() => setShowAddModal(false)}>
                    <Text className="text-base font-semibold text-gray-600">
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <Text className="text-lg font-bold text-text-primary">
                    {editingSource ? 'Edit Source' : 'New Income Source'}
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
                  {/* Name */}
                  <View className="mb-4">
                    <Text className="text-base font-semibold text-text-primary mb-2">
                      Name *
                    </Text>
                    <TextInput
                      className="bg-card border border-gray-200 rounded-lg px-4 py-3 text-base text-text-primary"
                      placeholder="e.g., Monthly Salary, Freelance Work"
                      value={name}
                      onChangeText={setName}
                      placeholderTextColor="#9ca3af"
                    />
                  </View>

                  {/* Expected Amount */}
                  <View className="mb-4">
                    <Text className="text-base font-semibold text-text-primary mb-2">
                      Expected Amount (Optional)
                    </Text>
                    <View className="flex-row items-center bg-card border border-gray-200 rounded-lg px-4">
                      <Text className="text-text-secondary text-lg">$</Text>
                      <TextInput
                        className="flex-1 py-3 text-base text-text-primary ml-2"
                        placeholder="0.00"
                        value={expectedAmount}
                        onChangeText={setExpectedAmount}
                        onBlur={() => {
                          if (expectedAmount) {
                            setExpectedAmount(formatCurrencyInput(expectedAmount));
                          }
                        }}
                        keyboardType="decimal-pad"
                        placeholderTextColor="#9ca3af"
                      />
                    </View>
                  </View>

                  {/* Frequency */}
                  <View className="mb-4">
                    <Text className="text-base font-semibold text-text-primary mb-2">
                      Frequency (Optional)
                    </Text>
                    <View className="flex-row flex-wrap gap-2">
                      {frequencyOptions.map((freq) => (
                        <TouchableOpacity
                          key={freq}
                          onPress={() => setFrequency(freq)}
                          className={`px-4 py-2 rounded-lg border ${
                            frequency === freq
                              ? 'bg-primary-100 border-primary'
                              : 'bg-card border-gray-200'
                          }`}>
                          <Text
                            className={`text-sm ${
                              frequency === freq
                                ? 'text-primary font-semibold'
                                : 'text-text-secondary'
                            }`}>
                            {freq}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Notes */}
                  <View className="mb-4">
                    <Text className="text-base font-semibold text-text-primary mb-2">
                      Notes (Optional)
                    </Text>
                    <TextInput
                      className="bg-card border border-gray-200 rounded-lg px-4 py-3 text-base text-text-primary"
                      placeholder="Any additional notes..."
                      value={notes}
                      onChangeText={setNotes}
                      placeholderTextColor="#9ca3af"
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
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
