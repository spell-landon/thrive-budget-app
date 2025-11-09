import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import {
  getCategoryGroups,
  createCategoryGroup,
  updateCategoryGroupNameAndIcon,
  deleteCategoryGroup,
} from '../services/categoryGroups';
import { CategoryGroup } from '../types';

type CategoryType = 'income' | 'expense' | 'savings';

// Preset category icons
const CATEGORY_ICONS = [
  'folder', // Default
  'home', 'car', 'restaurant', 'cart', 'cafe',
  'fast-food', 'pizza', 'wine', 'gift', 'shirt',
  'airplane', 'train', 'bus', 'bicycle', 'walk',
  'football', 'fitness', 'medkit', 'medical', 'heart',
  'book', 'school', 'briefcase', 'business', 'laptop',
  'phone-portrait', 'tv', 'game-controller', 'musical-notes', 'film',
  'paw', 'leaf', 'flower', 'water', 'flame',
  'wallet', 'card', 'cash', 'trending-up', 'stats-chart',
  'basket', 'hammer', 'construct', 'build', 'person',
  'people', 'globe', 'shield', 'trophy', 'star'
];

export default function CategoryGroupsSettingsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [groups, setGroups] = useState<CategoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<CategoryGroup | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupType, setNewGroupType] = useState<CategoryType>('expense');
  const [newGroupIcon, setNewGroupIcon] = useState('folder');
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupIcon, setEditGroupIcon] = useState('folder');

  const loadGroups = useCallback(async () => {
    if (!user) return;

    try {
      const data = await getCategoryGroups(user.id);
      setGroups(data);
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
      loadGroups();
    }, [loadGroups])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadGroups();
  }, [loadGroups]);

  const handleAddGroup = async () => {
    if (!user || !newGroupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    try {
      await createCategoryGroup(user.id, {
        name: newGroupName.trim(),
        category_type: newGroupType,
        icon: newGroupIcon,
      });
      setNewGroupName('');
      setNewGroupIcon('folder');
      setShowAddModal(false);
      loadGroups();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleEditGroup = async () => {
    if (!selectedGroup || !editGroupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    if (editGroupName.trim() === selectedGroup.name && editGroupIcon === (selectedGroup.icon || 'folder')) {
      setShowEditModal(false);
      return;
    }

    try {
      await updateCategoryGroupNameAndIcon(
        selectedGroup.id,
        selectedGroup.name,
        editGroupName.trim(),
        editGroupIcon
      );
      setShowEditModal(false);
      setSelectedGroup(null);
      setEditGroupName('');
      setEditGroupIcon('folder');
      loadGroups();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleDeleteGroup = (group: CategoryGroup) => {
    Alert.alert(
      'Delete Group',
      `Are you sure you want to delete "${group.name}"?\n\nNote: This will NOT delete categories in this group, but they will become ungrouped.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCategoryGroup(group.id);
              loadGroups();
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const openEditModal = (group: CategoryGroup) => {
    setSelectedGroup(group);
    setEditGroupName(group.name);
    setEditGroupIcon(group.icon || 'folder');
    setShowEditModal(true);
  };

  // Group by type
  const incomeGroups = groups.filter((g) => g.category_type === 'income');
  const expenseGroups = groups.filter((g) => g.category_type === 'expense');
  const savingsGroups = groups.filter((g) => g.category_type === 'savings');

  const GroupSection = ({
    title,
    items,
    icon,
    color,
  }: {
    title: string;
    items: CategoryGroup[];
    icon: string;
    color: string;
  }) => {
    if (items.length === 0) return null;

    return (
      <View className="mb-6">
        <View className="flex-row items-center mb-3 px-1">
          <Ionicons name={icon as any} size={20} color={color} />
          <Text className="text-lg font-bold text-gray-800 ml-2">{title}</Text>
          <View className="ml-2 bg-gray-200 px-2 py-0.5 rounded-full">
            <Text className="text-xs text-gray-600 font-semibold">{items.length}</Text>
          </View>
        </View>

        {items.map((group) => (
          <View
            key={group.id}
            className="bg-white rounded-lg p-4 mb-2 shadow-sm border border-gray-100 flex-row items-center justify-between"
          >
            <View className="flex-row items-center flex-1">
              <Ionicons name={(group.icon || 'folder') as any} size={24} color={color} />
              <View className="ml-3 flex-1">
                <Text className="text-base font-semibold text-gray-800">{group.name}</Text>
                {group.is_default && (
                  <Text className="text-xs text-gray-500 mt-0.5">Default group</Text>
                )}
              </View>
            </View>
            <View className="flex-row items-center gap-2">
              <TouchableOpacity
                onPress={() => openEditModal(group)}
                className="p-2"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="pencil-outline" size={20} color="#2563eb" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDeleteGroup(group)}
                className="p-2"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="trash-outline" size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['bottom']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-800">Category Groups</Text>
        </View>
        <TouchableOpacity onPress={() => setShowAddModal(true)}>
          <Ionicons name="add-circle" size={28} color="#FF6B35" />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <Text className="text-gray-600 text-center mt-8">Loading groups...</Text>
        ) : groups.length === 0 ? (
          <View className="items-center mt-12 px-4">
            <Ionicons name="folder-open-outline" size={64} color="#9ca3af" />
            <Text className="text-gray-600 mt-4 text-center text-lg mb-2">
              No category groups yet
            </Text>
            <Text className="text-gray-500 text-center mb-6">
              Create custom groups to organize your budget categories
            </Text>
            <TouchableOpacity
              onPress={() => setShowAddModal(true)}
              className="bg-primary px-6 py-3 rounded-lg"
            >
              <Text className="text-white font-semibold">Add First Group</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="p-4">
            <GroupSection title="Income Groups" items={incomeGroups} icon="cash" color="#16a34a" />
            <GroupSection title="Expense Groups" items={expenseGroups} icon="cart" color="#dc2626" />
            <GroupSection title="Savings Groups" items={savingsGroups} icon="wallet" color="#2563eb" />
          </View>
        )}
      </ScrollView>

      {/* Add Group Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-xl font-bold text-gray-800">Add Category Group</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {/* Type Selection */}
            <View className="mb-4">
              <Text className="text-gray-700 font-semibold mb-2">Type</Text>
              <View className="flex-row gap-2">
                {[
                  { value: 'income' as CategoryType, label: 'Income', color: 'green' },
                  { value: 'expense' as CategoryType, label: 'Expense', color: 'red' },
                  { value: 'savings' as CategoryType, label: 'Savings', color: 'blue' },
                ].map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    onPress={() => setNewGroupType(type.value)}
                    className={`flex-1 py-3 rounded-lg border ${
                      newGroupType === type.value
                        ? `bg-${type.color}-100 border-${type.color}-500`
                        : 'bg-white border-gray-300'
                    }`}
                  >
                    <Text
                      className={`text-center text-sm font-semibold ${
                        newGroupType === type.value
                          ? `text-${type.color}-700`
                          : 'text-gray-700'
                      }`}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Icon Selection */}
            <View className="mb-4">
              <Text className="text-gray-700 font-semibold mb-2">Icon</Text>
              <ScrollView
                horizontal={false}
                className="max-h-48"
                showsVerticalScrollIndicator={true}
              >
                <View className="flex-row flex-wrap gap-2">
                  {CATEGORY_ICONS.map((iconName) => (
                    <TouchableOpacity
                      key={iconName}
                      onPress={() => setNewGroupIcon(iconName)}
                      className={`w-14 h-14 items-center justify-center rounded-lg border-2 ${
                        newGroupIcon === iconName
                          ? 'bg-primary-100 border-primary'
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      <Ionicons
                        name={iconName as any}
                        size={24}
                        color={newGroupIcon === iconName ? '#FF6B35' : '#6b7280'}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Name Input */}
            <View className="mb-6">
              <Text className="text-gray-700 font-semibold mb-2">Group Name</Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 bg-white"
                value={newGroupName}
                onChangeText={setNewGroupName}
                placeholder={
                  newGroupType === 'income'
                    ? "e.g., Landon's Paycheck"
                    : newGroupType === 'expense'
                    ? 'e.g., Vehicle'
                    : 'e.g., College Fund'
                }
                autoCapitalize="words"
                autoFocus
              />
            </View>

            {/* Add Button */}
            <TouchableOpacity
              onPress={handleAddGroup}
              className="bg-primary py-4 rounded-lg"
            >
              <Text className="text-white text-center font-semibold text-base">
                Add Group
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Group Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-xl font-bold text-gray-800">Edit Group Name</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {/* Icon Selection */}
            <View className="mb-4">
              <Text className="text-gray-700 font-semibold mb-2">Icon</Text>
              <ScrollView
                horizontal={false}
                className="max-h-48"
                showsVerticalScrollIndicator={true}
              >
                <View className="flex-row flex-wrap gap-2">
                  {CATEGORY_ICONS.map((iconName) => (
                    <TouchableOpacity
                      key={iconName}
                      onPress={() => setEditGroupIcon(iconName)}
                      className={`w-14 h-14 items-center justify-center rounded-lg border-2 ${
                        editGroupIcon === iconName
                          ? 'bg-primary-100 border-primary'
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      <Ionicons
                        name={iconName as any}
                        size={24}
                        color={editGroupIcon === iconName ? '#FF6B35' : '#6b7280'}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Name Input */}
            <View className="mb-6">
              <Text className="text-gray-700 font-semibold mb-2">Group Name</Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 bg-white"
                value={editGroupName}
                onChangeText={setEditGroupName}
                placeholder="Enter group name"
                autoCapitalize="words"
                autoFocus
              />
              <Text className="text-xs text-gray-500 mt-2">
                Note: This will update the group name for all categories using this group.
              </Text>
            </View>

            {/* Save Button */}
            <TouchableOpacity
              onPress={handleEditGroup}
              className="bg-primary py-4 rounded-lg"
            >
              <Text className="text-white text-center font-semibold text-base">
                Save Changes
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
