import { supabase } from './supabase';
import { CategoryGroup } from '../types';

// ==================== CATEGORY GROUPS ====================

/**
 * Get all category groups for a user
 */
export async function getCategoryGroups(userId: string): Promise<CategoryGroup[]> {
  const { data, error } = await supabase
    .from('category_groups')
    .select('*')
    .eq('user_id', userId)
    .order('category_type', { ascending: true })
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Get category groups filtered by type
 */
export async function getCategoryGroupsByType(
  userId: string,
  categoryType: 'income' | 'expense' | 'savings'
): Promise<CategoryGroup[]> {
  const { data, error } = await supabase
    .from('category_groups')
    .select('*')
    .eq('user_id', userId)
    .eq('category_type', categoryType)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Get a single category group by ID
 */
export async function getCategoryGroupById(groupId: string): Promise<CategoryGroup> {
  const { data, error } = await supabase
    .from('category_groups')
    .select('*')
    .eq('id', groupId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create a new category group
 */
export async function createCategoryGroup(
  userId: string,
  group: {
    name: string;
    category_type: 'income' | 'expense' | 'savings';
    icon?: string;
    sort_order?: number;
  }
): Promise<CategoryGroup> {
  const { data, error } = await supabase
    .from('category_groups')
    .insert({
      user_id: userId,
      name: group.name,
      category_type: group.category_type,
      icon: group.icon || 'folder',
      sort_order: group.sort_order || 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update a category group
 */
export async function updateCategoryGroup(
  groupId: string,
  updates: {
    name?: string;
    icon?: string;
    sort_order?: number;
  }
): Promise<CategoryGroup> {
  const { data, error } = await supabase
    .from('category_groups')
    .update(updates)
    .eq('id', groupId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a category group
 */
export async function deleteCategoryGroup(groupId: string): Promise<void> {
  const { error } = await supabase.from('category_groups').delete().eq('id', groupId);

  if (error) throw error;
}

/**
 * Reorder category groups (update sort_order for multiple groups)
 */
export async function reorderCategoryGroups(
  updates: Array<{ id: string; sort_order: number }>
): Promise<void> {
  for (const update of updates) {
    await supabase
      .from('category_groups')
      .update({ sort_order: update.sort_order })
      .eq('id', update.id);
  }
}

/**
 * Update category group name and icon, cascading name changes to all budget categories using this group
 */
export async function updateCategoryGroupNameAndIcon(
  groupId: string,
  oldName: string,
  newName: string,
  newIcon?: string
): Promise<void> {
  // First, update the category group with both name and icon
  const updates: { name: string; icon?: string } = { name: newName };
  if (newIcon) {
    updates.icon = newIcon;
  }
  await updateCategoryGroup(groupId, updates);

  // Then, update all budget categories that use this group name (only if name changed)
  if (oldName !== newName) {
    const { error } = await supabase
      .from('budget_categories')
      .update({ category_group: newName })
      .eq('category_group', oldName);

    if (error) throw error;
  }
}

/**
 * Update category group name and cascade to all budget categories using this group
 * @deprecated Use updateCategoryGroupNameAndIcon instead
 */
export async function updateCategoryGroupName(
  groupId: string,
  oldName: string,
  newName: string
): Promise<void> {
  return updateCategoryGroupNameAndIcon(groupId, oldName, newName);
}

/**
 * Initialize default category groups for a new user
 */
export async function initializeDefaultCategoryGroups(userId: string): Promise<void> {
  // Create default expense groups
  const expenseGroups = [
    { name: 'Housing', sort_order: 0 },
    { name: 'Transportation', sort_order: 1 },
    { name: 'Food & Dining', sort_order: 2 },
    { name: 'Utilities', sort_order: 3 },
    { name: 'Healthcare', sort_order: 4 },
    { name: 'Personal Care', sort_order: 5 },
    { name: 'Entertainment', sort_order: 6 },
    { name: 'Shopping', sort_order: 7 },
    { name: 'Debt Payments', sort_order: 8 },
    { name: 'Education', sort_order: 9 },
    { name: 'Pets', sort_order: 10 },
    { name: 'Giving', sort_order: 11 },
    { name: 'Miscellaneous', sort_order: 12 },
  ];

  // Insert all groups
  const groupsToInsert = expenseGroups.map(group => ({
    user_id: userId,
    name: group.name,
    category_type: 'expense' as const,
    sort_order: group.sort_order,
  }));

  const { error } = await supabase
    .from('category_groups')
    .insert(groupsToInsert);

  if (error) throw error;
}

/**
 * Check if user has any category groups
 */
export async function userHasCategoryGroups(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('category_groups')
    .select('id')
    .eq('user_id', userId)
    .limit(1);

  if (error) throw error;
  return (data?.length || 0) > 0;
}

/**
 * Get category group names as string array (for picker options)
 */
export async function getCategoryGroupNames(
  userId: string,
  categoryType: 'income' | 'expense' | 'savings'
): Promise<string[]> {
  const groups = await getCategoryGroupsByType(userId, categoryType);
  return groups.map((g) => g.name);
}
