import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import {
  getBudgetByMonth,
  createBudget,
  getBudgetCategoriesByAccount,
  deleteBudgetCategory,
  copyBudgetCategories,
  getBudgets,
  getReadyToAssignByAccount,
  coverOverspending,
  getTotalAllocated,
  getTotalIncome,
} from '../services/budgets';
import { getBudgetableAccounts } from '../services/accounts';
import { getCategoryGroups } from '../services/categoryGroups';
import { formatCurrency } from '../utils/currency';
import { Budget, BudgetCategory, Account, CategoryGroup } from '../types';
import BottomSheet from '../components/BottomSheet';

type CategoryType = 'all' | 'expense' | 'savings';
type SpendingFilter = 'all' | 'on-track' | 'warning' | 'over';
type SortOption = 'group' | 'alphabetical' | 'amount' | 'spending';

export default function BudgetScreen({ navigation }: any) {
  const { user } = useAuth();
  const [budget, setBudget] = useState<Budget | null>(null);
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<{ [key: string]: boolean }>({});
  const [readyToAssign, setReadyToAssign] = useState<number>(0);
  const [totalIncome, setTotalIncome] = useState<number>(0);
  const [totalAllocated, setTotalAllocated] = useState<number>(0);
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);

  // Search, Filter, Sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<CategoryType>('all');
  const [spendingFilter, setSpendingFilter] = useState<SpendingFilter>('all');
  const [sortOption, setSortOption] = useState<SortOption>('group');
  const [showSortModal, setShowSortModal] = useState(false);
  const [hideUnbudgeted, setHideUnbudgeted] = useState(false);

  // BottomSheet state
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<BudgetCategory | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCoverOverspending, setShowCoverOverspending] = useState(false);

  const formatMonthKey = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  };

  const formatMonthDisplay = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  };

  const loadBudget = useCallback(async () => {
    if (!user) return;

    try {
      // Load budgetable accounts and category groups
      const [accountsData, groupsData] = await Promise.all([
        getBudgetableAccounts(user.id),
        getCategoryGroups(user.id),
      ]);
      setAccounts(accountsData);
      setCategoryGroups(groupsData);

      // Select first account if none selected
      if (!selectedAccount && accountsData.length > 0) {
        setSelectedAccount(accountsData[0]);
      }

      // Use the current selected account or first account
      const accountToUse = selectedAccount || accountsData[0];

      const month = currentMonth.getMonth() + 1; // 1-12
      const year = currentMonth.getFullYear();
      const budgetData = await getBudgetByMonth(user.id, month, year);
      setBudget(budgetData);

      if (budgetData && accountToUse) {
        // Load categories for selected account only and calculate totals
        const [categoriesData, readyToAssignAmount, incomeTotal, allocatedTotal] = await Promise.all([
          getBudgetCategoriesByAccount(budgetData.id, accountToUse.id),
          getReadyToAssignByAccount(accountToUse.id, budgetData.id),
          getTotalIncome(user.id, month, year),
          getTotalAllocated(budgetData.id),
        ]);
        setCategories(categoriesData);
        setReadyToAssign(readyToAssignAmount);
        setTotalIncome(incomeTotal);
        setTotalAllocated(allocatedTotal);
      } else {
        setCategories([]);
        setReadyToAssign(0);
        setTotalIncome(0);
        setTotalAllocated(0);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, currentMonth, selectedAccount]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadBudget();
    }, [loadBudget])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadBudget();
  }, [loadBudget]);

  const handlePreviousMonth = () => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() - 1);
    setCurrentMonth(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + 1);
    setCurrentMonth(newDate);
  };

  const handleCreateBudget = async (copyFromPrevious: boolean = false) => {
    if (!user) return;

    try {
      const month = currentMonth.getMonth() + 1; // 1-12
      const year = currentMonth.getFullYear();
      const newBudget = await createBudget(user.id, {
        month,
        year,
        name: `Budget for ${formatMonthDisplay(currentMonth)}`,
      });

      if (copyFromPrevious) {
        // Get previous month's budget
        const prevMonth = new Date(currentMonth);
        prevMonth.setMonth(prevMonth.getMonth() - 1);
        const prevMonthNum = prevMonth.getMonth() + 1;
        const prevYear = prevMonth.getFullYear();
        const prevBudget = await getBudgetByMonth(user.id, prevMonthNum, prevYear);

        if (prevBudget) {
          await copyBudgetCategories(prevBudget.id, newBudget.id);
          Alert.alert('Success', 'Budget created with categories from previous month!');
        } else {
          Alert.alert('Success', 'Budget created! (No previous month data to copy)');
        }
      } else {
        Alert.alert('Success', 'Budget created successfully!');
      }

      loadBudget();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleDeleteCategory = (category: BudgetCategory) => {
    setSelectedCategory(category);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteCategory = async () => {
    if (!selectedCategory) return;

    try {
      await deleteBudgetCategory(selectedCategory.id);
      loadBudget();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleEditCategory = (category: BudgetCategory) => {
    navigation.navigate('EditBudgetCategory', { categoryId: category.id, budgetId: budget!.id });
  };

  const handleCategoryMenu = (category: BudgetCategory) => {
    setSelectedCategory(category);
    setShowCategoryMenu(true);
  };

  const handleCoverOverspending = async (overspentCategory: BudgetCategory) => {
    // Get categories with available funds (excluding the overspent category)
    const categoriesWithFunds = categories.filter(
      c => c.id !== overspentCategory.id && c.available_amount > 0
    );

    if (categoriesWithFunds.length === 0) {
      Alert.alert(
        'No Available Funds',
        'There are no other categories with available money to cover this overspending.'
      );
      return;
    }

    setSelectedCategory(overspentCategory);
    setShowCoverOverspending(true);
  };

  const handleCoverFromCategory = async (sourceCategory: BudgetCategory) => {
    if (!selectedCategory) return;

    try {
      const deficit = Math.abs(selectedCategory.available_amount);
      await coverOverspending(selectedCategory.id, sourceCategory.id);
      Alert.alert(
        'Success',
        `Covered ${formatCurrency(deficit)} from ${sourceCategory.name}`
      );
      loadBudget(); // Reload to show updated amounts
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  // Filter and sort categories
  const filteredAndSortedCategories = useMemo(() => {
    let filtered = [...categories];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(cat => cat.name.toLowerCase().includes(query));
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(cat => cat.category_type === typeFilter);
    }

    // Apply hide unbudgeted filter
    if (hideUnbudgeted) {
      filtered = filtered.filter(cat => cat.allocated_amount > 0);
    }

    // Apply spending status filter
    if (spendingFilter !== 'all') {
      filtered = filtered.filter(cat => {
        if (cat.allocated_amount === 0) return spendingFilter === 'on-track';
        const percentage = (cat.spent_amount / cat.allocated_amount) * 100;

        if (spendingFilter === 'on-track') return percentage < 80;
        if (spendingFilter === 'warning') return percentage >= 80 && percentage < 100;
        if (spendingFilter === 'over') return percentage >= 100;
        return true;
      });
    }

    // Apply sorting
    if (sortOption === 'alphabetical') {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOption === 'amount') {
      filtered.sort((a, b) => b.allocated_amount - a.allocated_amount);
    } else if (sortOption === 'spending') {
      filtered.sort((a, b) => {
        const percentA = a.allocated_amount > 0 ? (a.spent_amount / a.allocated_amount) * 100 : 0;
        const percentB = b.allocated_amount > 0 ? (b.spent_amount / b.allocated_amount) * 100 : 0;
        return percentB - percentA;
      });
    }
    // 'group' sorting is handled by grouping logic below

    return filtered;
  }, [categories, searchQuery, typeFilter, spendingFilter, sortOption, hideUnbudgeted]);

  // Create a mapping of group names to icons
  const groupIconMap = useMemo(() => {
    const map: Record<string, string> = {};
    categoryGroups.forEach(group => {
      map[group.name] = group.icon || 'folder';
    });
    return map;
  }, [categoryGroups]);

  // Group categories by category_group and sort by allocated amount within each group
  const groupedCategories: Record<string, BudgetCategory[]> = {};
  filteredAndSortedCategories.forEach((category) => {
    const groupName = category.category_group || 'Ungrouped';
    if (!groupedCategories[groupName]) {
      groupedCategories[groupName] = [];
    }
    groupedCategories[groupName].push(category);
  });

  // Sort categories within each group by allocated amount (highest first)
  Object.keys(groupedCategories).forEach(groupName => {
    groupedCategories[groupName].sort((a, b) => b.allocated_amount - a.allocated_amount);
  });

  // Get sorted group names (put Ungrouped last)
  const groupNames = Object.keys(groupedCategories).sort((a, b) => {
    if (a === 'Ungrouped') return 1;
    if (b === 'Ungrouped') return -1;
    return a.localeCompare(b);
  });

  const remaining = budget ? totalIncome - totalAllocated : 0;

  const getProgressPercentage = (spent: number, allocated: number) => {
    if (allocated === 0) return 0;
    return Math.min((spent / allocated) * 100, 100);
  };

  const getProgressColor = (spent: number, allocated: number) => {
    const percentage = (spent / allocated) * 100;
    if (percentage >= 100) return 'bg-error-500';
    if (percentage >= 80) return 'bg-primary-500';
    return 'bg-success-500';
  };

  const toggleSection = (title: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  const toggleAllSections = () => {
    // Check if all are collapsed
    const allCollapsed = groupNames.every(name => collapsedSections[name]);

    // If all are collapsed, expand all. Otherwise, collapse all.
    const newState: { [key: string]: boolean } = {};
    groupNames.forEach(name => {
      newState[name] = !allCollapsed;
    });
    setCollapsedSections(newState);
  };

  const CategorySection = ({
    groupName,
    categories,
  }: {
    groupName: string;
    categories: BudgetCategory[];
  }) => {
    if (categories.length === 0) return null;

    const [localCategories, setLocalCategories] = useState(categories);

    // Update local state when categories prop changes
    React.useEffect(() => {
      setLocalCategories(categories);
    }, [categories]);

    const totalAllocated = localCategories.reduce((sum, c) => sum + c.allocated_amount, 0);
    const totalAvailable = localCategories.reduce((sum, c) => sum + c.available_amount, 0);
    const totalSpent = localCategories.reduce((sum, c) => sum + c.spent_amount, 0);
    const isCollapsed = collapsedSections[groupName] || false;

    // Get icon from category group, default to folder-outline for Ungrouped
    const icon = groupName === 'Ungrouped'
      ? 'folder-outline'
      : (groupIconMap[groupName] || 'folder');
    const categoryCount = localCategories.length;

    const renderCategoryCard = (category: BudgetCategory) => {
      // With envelope budgeting: progress is spent/available (not spent/allocated)
      const progress = getProgressPercentage(category.spent_amount, category.available_amount);
      const progressColor = getProgressColor(category.spent_amount, category.available_amount);
      const remaining = category.available_amount - category.spent_amount;
      const isOverspent = remaining < 0;
      const needsFunding = category.available_amount === 0 && category.allocated_amount > 0;

      return (
        <View
          className={`bg-card rounded-2xl p-4 mb-3 ${
            isOverspent ? 'border-2 border-error-500' : needsFunding ? 'border-2 border-primary-300' : 'border border-gray-100'
          }`}
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 1,
          }}
        >
          {/* Warning Banner for Overspending */}
          {isOverspent && (
            <View className="bg-error-50 rounded-lg p-3 mb-3">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <Ionicons name="alert-circle" size={16} color="#EF4444" />
                  <Text className="text-error-700 text-xs font-semibold ml-2 flex-1">
                    Overspent by {formatCurrency(Math.abs(remaining))}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleCoverOverspending(category)}
                  className="bg-error-600 px-3 py-1.5 rounded-lg ml-2">
                  <Text className="text-white text-xs font-semibold">Cover</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          {/* Info Banner for Needs Funding */}
          {needsFunding && !isOverspent && (
            <View className="bg-primary-50 rounded-lg p-2 mb-3 flex-row items-center">
              <Ionicons name="information-circle" size={16} color="#FF6B35" />
              <Text className="text-primary-700 text-xs font-semibold ml-2">
                Needs funding - {formatCurrency(category.allocated_amount)} planned
              </Text>
            </View>
          )}

          <View className="flex-row justify-between items-start mb-2">
            <View className="flex-1">
              <Text className="text-base font-semibold text-text-primary">{category.name}</Text>
            </View>
            <TouchableOpacity
              onPress={() => handleCategoryMenu(category)}
              className="p-1"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="ellipsis-vertical" size={20} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          {/* Envelope Amount - Primary Display */}
          <View className="mb-3">
            <Text className="text-xs font-medium text-text-tertiary uppercase tracking-wide mb-1">
              Available in Envelope
            </Text>
            <Text className={`text-3xl font-bold ${isOverspent ? 'text-error-600' : 'text-success-600'}`}>
              {formatCurrency(category.available_amount)}
            </Text>
            <Text className="text-xs text-text-secondary mt-0.5">
              What you can spend right now
            </Text>
          </View>

          {/* Progress Bar - shows spent vs available */}
          <View className="mb-2">
            <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <View className={`h-2 ${progressColor} rounded-full`} style={{ width: `${progress}%` }} />
            </View>
          </View>

          {/* Bottom Row: Target vs Spent */}
          <View className="flex-row items-center justify-between pt-2 border-t border-gray-200">
            <View className="flex-1">
              <Text className="text-xs text-text-tertiary mb-0.5">Monthly Target</Text>
              <Text className="text-sm font-semibold text-text-primary">
                {formatCurrency(category.allocated_amount)}
              </Text>
            </View>
            <View className="w-px h-8 bg-gray-200 mx-3" />
            <View className="flex-1 items-end">
              <Text className="text-xs text-text-tertiary mb-0.5">Spent This Month</Text>
              <Text className={`text-sm font-semibold ${
                isOverspent ? 'text-error-600' : 'text-text-primary'
              }`}>
                {formatCurrency(category.spent_amount)}
              </Text>
            </View>
          </View>
        </View>
      );
    };

    return (
      <View className="mb-4">
        <TouchableOpacity
          onPress={() => toggleSection(groupName)}
          className="flex-row items-center justify-between mb-3 px-1"
          activeOpacity={0.7}
        >
          <View className="flex-row items-center flex-1">
            <Ionicons name={icon as any} size={20} color="#FF6B35" />
            <View className="ml-2 flex-1">
              <View className="flex-row items-center">
                <Text className="text-lg font-bold text-text-primary">{groupName}</Text>
                <View className="ml-2 bg-gray-200 px-2 py-0.5 rounded-full">
                  <Text className="text-xs text-gray-600 font-semibold">{categoryCount}</Text>
                </View>
              </View>
            </View>
            <Ionicons
              name={isCollapsed ? 'chevron-down' : 'chevron-up'}
              size={20}
              color="#6B7280"
              className="ml-2"
            />
          </View>
          <View className="items-end ml-2">
            <Text className="text-sm font-bold text-text-primary">
              {formatCurrency(totalAvailable)}
            </Text>
            <Text className="text-xs text-text-secondary">
              {formatCurrency(totalSpent)} spent
            </Text>
          </View>
        </TouchableOpacity>

        {!isCollapsed && (
          <>
            {localCategories.map((category) => (
              <TouchableOpacity
                key={category.id}
                onPress={() => handleEditCategory(category)}
                activeOpacity={0.7}
              >
                {renderCategoryCard(category)}
              </TouchableOpacity>
            ))}
          </>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-card" edges={['top']}>
      <View className="flex-1 bg-background">
        {/* Header with Month Navigation */}
        <View className="px-6 py-4 bg-card border-b border-gray-200">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-2xl font-bold text-text-primary">Budget</Text>
            {budget && selectedAccount && (
              <TouchableOpacity
                onPress={() => {
                  if (!selectedAccount.is_goal_tracking) {
                    navigation.navigate('AddBudgetCategory', {
                      budgetId: budget.id,
                      accountId: selectedAccount.id
                    });
                  }
                }}
                disabled={selectedAccount.is_goal_tracking}
                className={`px-4 py-2 rounded-lg ${
                  selectedAccount.is_goal_tracking ? 'bg-gray-300' : 'bg-primary'
                }`}
              >
                <Text className={`font-semibold ${
                  selectedAccount.is_goal_tracking ? 'text-gray-500' : 'text-white'
                }`}>Add Category</Text>
              </TouchableOpacity>
            )}
          </View>
          {selectedAccount?.is_goal_tracking && (
            <View className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
              <View className="flex-row items-start">
                <Ionicons name="information-circle" size={18} color="#3B82F6" />
                <Text className="text-blue-700 text-xs ml-2 flex-1">
                  This is a goal-tracking account. Add categories from the Goals screen instead.
                </Text>
              </View>
            </View>
          )}

          {/* Month Navigation */}
          <View className="flex-row items-center justify-between mb-3">
            <TouchableOpacity onPress={handlePreviousMonth} className="p-2">
              <Ionicons name="chevron-back" size={24} color="#FF6B35" />
            </TouchableOpacity>
            <Text className="text-lg font-semibold text-text-primary">{formatMonthDisplay(currentMonth)}</Text>
            <TouchableOpacity onPress={handleNextMonth} className="p-2">
              <Ionicons name="chevron-forward" size={24} color="#FF6B35" />
            </TouchableOpacity>
          </View>

          {/* Account Selector */}
          {accounts.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-2">
              {accounts.map((account) => (
                <TouchableOpacity
                  key={account.id}
                  onPress={() => {
                    setSelectedAccount(account);
                    setLoading(true);
                  }}
                  className={`mr-3 px-4 py-2 rounded-lg border ${
                    selectedAccount?.id === account.id
                      ? 'bg-primary border-primary'
                      : 'bg-card border-gray-300'
                  }`}>
                  <View className="flex-row items-center">
                    <Ionicons
                      name={
                        account.type === 'checking'
                          ? 'card'
                          : account.type === 'savings'
                          ? 'wallet'
                          : 'trending-up'
                      }
                      size={16}
                      color={selectedAccount?.id === account.id ? '#fff' : '#6b7280'}
                    />
                    <Text
                      className={`ml-2 text-sm font-semibold ${
                        selectedAccount?.id === account.id
                          ? 'text-white'
                          : 'text-text-secondary'
                      }`}>
                      {account.name}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        <ScrollView className="flex-1" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          {budget && categories.length > 0 && (
            <View className="px-4 pt-4 pb-2 bg-background">
              {/* Search Bar */}
              <View className="mb-3">
                <View className="flex-row items-center bg-card border border-gray-200 rounded-lg px-4 py-2">
                  <Ionicons name="search" size={20} color="#9ca3af" />
                  <TextInput
                    className="flex-1 ml-2 py-1 text-base text-text-primary"
                    placeholder="Search categories..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholderTextColor="#9ca3af"
                    textAlignVertical="center"
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <Ionicons name="close-circle" size={20} color="#9ca3af" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Filter and Sort Row */}
              <View className="flex-row items-center justify-between mb-2">
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-1">
                  {/* Type Filters */}
                  <TouchableOpacity
                    onPress={() => setTypeFilter('all')}
                    className={`mr-2 px-3 py-1.5 rounded-full border ${
                      typeFilter === 'all'
                        ? 'bg-primary border-primary'
                        : 'bg-card border-gray-300'
                    }`}
                  >
                    <Text className={`text-sm font-semibold ${typeFilter === 'all' ? 'text-white' : 'text-gray-700'}`}>
                      All
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setTypeFilter('expense')}
                    className={`mr-2 px-3 py-1.5 rounded-full border ${
                      typeFilter === 'expense'
                        ? 'bg-error-500 border-error-500'
                        : 'bg-card border-gray-300'
                    }`}
                  >
                    <Text className={`text-sm font-semibold ${typeFilter === 'expense' ? 'text-white' : 'text-gray-700'}`}>
                      Expenses
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setTypeFilter('savings')}
                    className={`mr-2 px-3 py-1.5 rounded-full border ${
                      typeFilter === 'savings'
                        ? 'bg-blue-500 border-blue-500'
                        : 'bg-card border-gray-300'
                    }`}
                  >
                    <Text className={`text-sm font-semibold ${typeFilter === 'savings' ? 'text-white' : 'text-gray-700'}`}>
                      Savings
                    </Text>
                  </TouchableOpacity>
                </ScrollView>

                {/* Sort Button */}
                <TouchableOpacity
                  onPress={() => setShowSortModal(true)}
                  className="ml-2 bg-card border border-gray-300 p-2 rounded-lg"
                >
                  <Ionicons name="funnel" size={20} color="#FF6B35" />
                </TouchableOpacity>
              </View>

              {/* Hide Unbudgeted Toggle */}
              <TouchableOpacity
                onPress={() => setHideUnbudgeted(!hideUnbudgeted)}
                className={`flex-row items-center px-3 py-2 rounded-lg mb-2 ${
                  hideUnbudgeted ? 'bg-primary-100 border-2 border-primary' : 'bg-gray-100 border-2 border-transparent'
                }`}
              >
                <Ionicons
                  name={hideUnbudgeted ? 'eye-off' : 'eye-off-outline'}
                  size={18}
                  color={hideUnbudgeted ? '#FF6B35' : '#6b7280'}
                />
                <Text className={`text-sm ml-2 ${hideUnbudgeted ? 'font-semibold text-primary' : 'text-gray-700'}`}>
                  Hide $0 Budgeted
                </Text>
              </TouchableOpacity>

              {/* Spending Status Filters */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
                <TouchableOpacity
                  onPress={() => setSpendingFilter('all')}
                  className={`mr-2 px-3 py-1 rounded-full ${
                    spendingFilter === 'all' ? 'bg-gray-200' : 'bg-gray-100'
                  }`}
                >
                  <Text className={`text-xs ${spendingFilter === 'all' ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>
                    All Status
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setSpendingFilter('on-track')}
                  className={`mr-2 px-3 py-1 rounded-full ${
                    spendingFilter === 'on-track' ? 'bg-success-100' : 'bg-gray-100'
                  }`}
                >
                  <Text className={`text-xs ${spendingFilter === 'on-track' ? 'font-semibold text-success-700' : 'text-gray-600'}`}>
                    On Track
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setSpendingFilter('warning')}
                  className={`mr-2 px-3 py-1 rounded-full ${
                    spendingFilter === 'warning' ? 'bg-primary-100' : 'bg-gray-100'
                  }`}
                >
                  <Text className={`text-xs ${spendingFilter === 'warning' ? 'font-semibold text-primary-700' : 'text-gray-600'}`}>
                    Warning
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setSpendingFilter('over')}
                  className={`mr-2 px-3 py-1 rounded-full ${
                    spendingFilter === 'over' ? 'bg-error-100' : 'bg-gray-100'
                  }`}
                >
                  <Text className={`text-xs ${spendingFilter === 'over' ? 'font-semibold text-error-700' : 'text-gray-600'}`}>
                    Over Budget
                  </Text>
                </TouchableOpacity>
              </ScrollView>

              {/* Active filters indicator */}
              {(searchQuery || typeFilter !== 'all' || spendingFilter !== 'all' || sortOption !== 'group' || hideUnbudgeted) && (
                <TouchableOpacity
                  onPress={() => {
                    setSearchQuery('');
                    setTypeFilter('all');
                    setSpendingFilter('all');
                    setSortOption('group');
                    setHideUnbudgeted(false);
                  }}
                  className="flex-row items-center mb-2"
                >
                  <Text className="text-xs text-primary font-semibold">Clear all filters</Text>
                  <Ionicons name="close-circle" size={16} color="#FF6B35" className="ml-1" />
                </TouchableOpacity>
              )}

              {/* Expand/Collapse All Button */}
              {groupNames.length > 1 && (
                <TouchableOpacity
                  onPress={toggleAllSections}
                  className="flex-row items-center justify-center py-2 px-4 bg-gray-100 rounded-lg mb-2"
                >
                  <Ionicons
                    name={groupNames.every(name => collapsedSections[name]) ? 'chevron-down-circle' : 'chevron-up-circle'}
                    size={18}
                    color="#6b7280"
                  />
                  <Text className="text-sm font-semibold text-gray-700 ml-2">
                    {groupNames.every(name => collapsedSections[name]) ? 'Expand All' : 'Collapse All'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {loading ? (
            <Text className="text-text-secondary text-center mt-8">Loading budget...</Text>
          ) : !budget ? (
            <View className="items-center mt-8 px-4">
              <Ionicons name="calendar-outline" size={64} color="#9ca3af" />
              <Text className="text-text-secondary mt-4 text-center mb-4">
                No budget for {formatMonthDisplay(currentMonth)} yet.
              </Text>
              <TouchableOpacity
                onPress={() => handleCreateBudget(false)}
                className="bg-primary px-6 py-3 rounded-lg mb-3"
              >
                <Text className="text-white font-semibold">Create Budget</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleCreateBudget(true)}
                className="bg-text-primary px-6 py-3 rounded-lg"
              >
                <Text className="text-white font-semibold">Copy from Previous Month</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="p-4">
              {/* Budget Summary - Redesigned */}
              <View className="bg-primary rounded-2xl p-5 mb-4"
                style={{
                  shadowColor: '#FF6B35',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.15,
                  shadowRadius: 8,
                  elevation: 4,
                }}
              >
                {/* Ready to Assign Banner */}
                {readyToAssign > 0 && (
                  <View className="bg-white/10 rounded-xl p-3 mb-4 border border-white/20">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center flex-1">
                        <Ionicons name="cash-outline" size={24} color="#ffffff" />
                        <View className="ml-3 flex-1">
                          <Text className="text-white text-xs font-medium">Ready to Assign</Text>
                          <Text className="text-white text-2xl font-bold">
                            {formatCurrency(readyToAssign)}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        onPress={() => {
                          navigation.navigate('AssignMoney', {
                            budgetId: budget.id,
                            accountId: selectedAccount?.id
                          });
                        }}
                        className="bg-white/20 px-4 py-2 rounded-lg">
                        <Text className="text-white text-sm font-semibold">Assign</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
                {readyToAssign < 0 && (
                  <View className="bg-error-500/20 rounded-xl p-3 mb-4 border border-error-300/50">
                    <View className="flex-row items-center">
                      <Ionicons name="warning" size={24} color="#FCA5A5" />
                      <View className="ml-3 flex-1">
                        <Text className="text-error-100 text-xs font-medium">Over-Allocated!</Text>
                        <Text className="text-white text-lg font-bold">
                          {formatCurrency(Math.abs(readyToAssign))} too much
                        </Text>
                        <Text className="text-error-100 text-xs mt-1">
                          You've assigned more money than you have in accounts
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                <View className="flex-row justify-between items-start mb-4">
                  <View>
                    <Text className="text-primary-100 text-xs uppercase font-semibold tracking-wide mb-1">
                      Monthly Budget
                    </Text>
                    <Text className="text-white text-3xl font-bold">
                      {formatCurrency(totalIncome)}
                    </Text>
                    <Text className="text-primary-100 text-xs mt-1">Total Income</Text>
                  </View>
                  <View className="bg-white/20 rounded-full px-3 py-1">
                    <Text className="text-white text-xs font-semibold">
                      {categories.length} {categories.length === 1 ? 'category' : 'categories'}
                    </Text>
                  </View>
                </View>

                {/* Progress Bar */}
                <View className="mb-3">
                  <View className="flex-row justify-between mb-2">
                    <Text className="text-primary-100 text-xs font-medium">
                      {formatCurrency(totalAllocated)} allocated
                    </Text>
                    <Text className="text-white text-xs font-semibold">
                      {totalIncome > 0
                        ? Math.round((totalAllocated / totalIncome) * 100)
                        : 0}%
                    </Text>
                  </View>
                  <View className="h-2 bg-white/20 rounded-full overflow-hidden">
                    <View
                      className={`h-2 rounded-full ${
                        remaining < 0 ? 'bg-error-400' : remaining === 0 ? 'bg-success-400' : 'bg-white'
                      }`}
                      style={{
                        width: `${Math.min((totalAllocated / Math.max(totalIncome, 1)) * 100, 100)}%`,
                      }}
                    />
                  </View>
                </View>

                {/* Remaining Amount */}
                <View className="flex-row items-center justify-between pt-3 border-t border-white/20">
                  <Text className="text-primary-100 text-sm">
                    {remaining === 0 ? 'Fully Allocated' : remaining > 0 ? 'Left to Allocate' : 'Over Budget'}
                  </Text>
                  <Text
                    className={`text-xl font-bold ${
                      remaining < 0 ? 'text-error-200' : remaining === 0 ? 'text-success-300' : 'text-white'
                    }`}
                  >
                    {formatCurrency(Math.abs(remaining))}
                  </Text>
                </View>
              </View>

              {/* No Categories State */}
              {categories.length === 0 ? (
                <View className="items-center py-8">
                  <Ionicons name="folder-open-outline" size={64} color="#9ca3af" />
                  <Text className="text-text-secondary mt-4 text-center mb-4">
                    No budget categories yet. Add your first category to start budgeting!
                  </Text>
                  <TouchableOpacity
                    onPress={() => selectedAccount && navigation.navigate('AddBudgetCategory', {
                      budgetId: budget.id,
                      accountId: selectedAccount.id
                    })}
                    className="bg-primary px-6 py-3 rounded-lg"
                  >
                    <Text className="text-white font-semibold">Add Category</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  {groupNames.map((groupName) => (
                    <CategorySection
                      key={groupName}
                      groupName={groupName}
                      categories={groupedCategories[groupName]}
                    />
                  ))}
                </>
              )}
            </View>
          )}
        </ScrollView>
      </View>

      {/* Sort Modal */}
      <Modal
        visible={showSortModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSortModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl">
            <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-200">
              <Text className="text-lg font-bold text-gray-800">Sort Categories</Text>
              <TouchableOpacity onPress={() => setShowSortModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View className="pb-6">
              {/* By Group */}
              <TouchableOpacity
                onPress={() => {
                  setSortOption('group');
                  setShowSortModal(false);
                }}
                className={`px-6 py-4 border-b border-gray-100 flex-row items-center justify-between ${
                  sortOption === 'group' ? 'bg-primary-50' : ''
                }`}
              >
                <View className="flex-row items-center">
                  <Ionicons
                    name="albums"
                    size={24}
                    color={sortOption === 'group' ? '#FF6B35' : '#6b7280'}
                  />
                  <View className="ml-3">
                    <Text className={`text-base ${sortOption === 'group' ? 'text-primary font-semibold' : 'text-gray-800'}`}>
                      By Group
                    </Text>
                    <Text className="text-xs text-gray-500 mt-0.5">
                      Organized by category groups
                    </Text>
                  </View>
                </View>
                {sortOption === 'group' && (
                  <Ionicons name="checkmark-circle" size={24} color="#FF6B35" />
                )}
              </TouchableOpacity>

              {/* Alphabetical */}
              <TouchableOpacity
                onPress={() => {
                  setSortOption('alphabetical');
                  setShowSortModal(false);
                }}
                className={`px-6 py-4 border-b border-gray-100 flex-row items-center justify-between ${
                  sortOption === 'alphabetical' ? 'bg-primary-50' : ''
                }`}
              >
                <View className="flex-row items-center">
                  <Ionicons
                    name="text"
                    size={24}
                    color={sortOption === 'alphabetical' ? '#FF6B35' : '#6b7280'}
                  />
                  <View className="ml-3">
                    <Text className={`text-base ${sortOption === 'alphabetical' ? 'text-primary font-semibold' : 'text-gray-800'}`}>
                      Alphabetical
                    </Text>
                    <Text className="text-xs text-gray-500 mt-0.5">
                      Sort by name (A-Z)
                    </Text>
                  </View>
                </View>
                {sortOption === 'alphabetical' && (
                  <Ionicons name="checkmark-circle" size={24} color="#FF6B35" />
                )}
              </TouchableOpacity>

              {/* By Amount */}
              <TouchableOpacity
                onPress={() => {
                  setSortOption('amount');
                  setShowSortModal(false);
                }}
                className={`px-6 py-4 border-b border-gray-100 flex-row items-center justify-between ${
                  sortOption === 'amount' ? 'bg-primary-50' : ''
                }`}
              >
                <View className="flex-row items-center">
                  <Ionicons
                    name="cash"
                    size={24}
                    color={sortOption === 'amount' ? '#FF6B35' : '#6b7280'}
                  />
                  <View className="ml-3">
                    <Text className={`text-base ${sortOption === 'amount' ? 'text-primary font-semibold' : 'text-gray-800'}`}>
                      By Amount
                    </Text>
                    <Text className="text-xs text-gray-500 mt-0.5">
                      Highest allocated amount first
                    </Text>
                  </View>
                </View>
                {sortOption === 'amount' && (
                  <Ionicons name="checkmark-circle" size={24} color="#FF6B35" />
                )}
              </TouchableOpacity>

              {/* By Spending % */}
              <TouchableOpacity
                onPress={() => {
                  setSortOption('spending');
                  setShowSortModal(false);
                }}
                className={`px-6 py-4 flex-row items-center justify-between ${
                  sortOption === 'spending' ? 'bg-primary-50' : ''
                }`}
              >
                <View className="flex-row items-center">
                  <Ionicons
                    name="stats-chart"
                    size={24}
                    color={sortOption === 'spending' ? '#FF6B35' : '#6b7280'}
                  />
                  <View className="ml-3">
                    <Text className={`text-base ${sortOption === 'spending' ? 'text-primary font-semibold' : 'text-gray-800'}`}>
                      By Spending %
                    </Text>
                    <Text className="text-xs text-gray-500 mt-0.5">
                      Highest spending percentage first
                    </Text>
                  </View>
                </View>
                {sortOption === 'spending' && (
                  <Ionicons name="checkmark-circle" size={24} color="#FF6B35" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Category Menu Bottom Sheet */}
      {selectedCategory && (
        <BottomSheet
          visible={showCategoryMenu}
          onClose={() => setShowCategoryMenu(false)}
          title={selectedCategory.name}
          message="Choose an action"
          options={[
            {
              text: 'Edit Category',
              icon: 'create',
              onPress: () => handleEditCategory(selectedCategory),
            },
            {
              text: 'Move Money',
              icon: 'swap-horizontal',
              onPress: () => navigation.navigate('MoveCategoryMoney', {
                budgetId: budget!.id,
                sourceCategoryId: selectedCategory.id
              }),
            },
            {
              text: 'Delete Category',
              icon: 'trash',
              destructive: true,
              onPress: () => {
                setShowCategoryMenu(false);
                // Small delay to let the menu close before opening delete confirm
                setTimeout(() => handleDeleteCategory(selectedCategory), 100);
              },
            },
          ]}
        />
      )}

      {/* Delete Confirmation Bottom Sheet */}
      {selectedCategory && (
        <BottomSheet
          visible={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          title="Delete Category"
          message={`Are you sure you want to delete ${selectedCategory.name}? This action cannot be undone.`}
          options={[
            {
              text: 'Delete',
              icon: 'trash',
              destructive: true,
              onPress: confirmDeleteCategory,
            },
          ]}
        />
      )}

      {/* Cover Overspending Bottom Sheet */}
      {selectedCategory && (
        <BottomSheet
          visible={showCoverOverspending}
          onClose={() => setShowCoverOverspending(false)}
          title="Cover Overspending"
          message={`Select a category to cover ${formatCurrency(Math.abs(selectedCategory.available_amount))}`}
          options={
            categories
              .filter(c => c.id !== selectedCategory.id && c.available_amount > 0)
              .map(category => ({
                text: `${category.name} (${formatCurrency(category.available_amount)})`,
                icon: 'cash',
                onPress: () => handleCoverFromCategory(category),
              }))
          }
        />
      )}
    </SafeAreaView>
  );
}
