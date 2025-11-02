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
    is_default?: boolean;
    sort_order?: number;
  }
): Promise<CategoryGroup> {
  const { data, error } = await supabase
    .from('category_groups')
    .insert({
      user_id: userId,
      name: group.name,
      category_type: group.category_type,
      is_default: group.is_default || false,
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
 * Update category group name and cascade to all budget categories using this group
 */
export async function updateCategoryGroupName(
  groupId: string,
  oldName: string,
  newName: string
): Promise<void> {
  // First, update the category group
  await updateCategoryGroup(groupId, { name: newName });

  // Then, update all budget categories that use this group name
  const { error } = await supabase
    .from('budget_categories')
    .update({ category_group: newName })
    .eq('category_group', oldName);

  if (error) throw error;
}

/**
 * Initialize default category groups for a new user
 */
export async function initializeDefaultCategoryGroups(userId: string): Promise<void> {
  // Call the Supabase function that creates default groups
  const { error } = await supabase.rpc('initialize_default_category_groups', {
    p_user_id: userId,
  });

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
