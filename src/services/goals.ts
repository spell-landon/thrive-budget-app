import { supabase } from './supabase';
import { SavingsGoal } from '../types';

/**
 * Get all savings goals for a user
 */
export async function getGoals(userId: string): Promise<SavingsGoal[]> {
  const { data, error } = await supabase
    .from('savings_goals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get a single savings goal by ID
 */
export async function getGoal(goalId: string): Promise<SavingsGoal> {
  const { data, error } = await supabase
    .from('savings_goals')
    .select('*')
    .eq('id', goalId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create a new savings goal
 */
export async function createGoal(
  userId: string,
  goal: {
    name: string;
    target_amount: number;
    current_amount?: number;
    target_date?: string;
    image_url?: string;
  }
): Promise<SavingsGoal> {
  const { data, error } = await supabase
    .from('savings_goals')
    .insert({
      user_id: userId,
      name: goal.name,
      target_amount: goal.target_amount,
      current_amount: goal.current_amount || 0,
      target_date: goal.target_date,
      image_url: goal.image_url,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update a savings goal
 */
export async function updateGoal(
  goalId: string,
  updates: {
    name?: string;
    target_amount?: number;
    current_amount?: number;
    target_date?: string;
    image_url?: string;
  }
): Promise<SavingsGoal> {
  const { data, error } = await supabase
    .from('savings_goals')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', goalId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Add money to a savings goal
 */
export async function addToGoal(goalId: string, amount: number): Promise<SavingsGoal> {
  // First get the current amount
  const goal = await getGoal(goalId);

  const { data, error } = await supabase
    .from('savings_goals')
    .update({
      current_amount: goal.current_amount + amount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', goalId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Transfer money from one goal to another
 */
export async function transferBetweenGoals(
  fromGoalId: string,
  toGoalId: string,
  amount: number
): Promise<void> {
  const fromGoal = await getGoal(fromGoalId);

  if (fromGoal.current_amount < amount) {
    throw new Error('Insufficient funds in source goal');
  }

  // Subtract from source goal
  await supabase
    .from('savings_goals')
    .update({
      current_amount: fromGoal.current_amount - amount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', fromGoalId);

  // Add to destination goal
  await addToGoal(toGoalId, amount);
}

/**
 * Delete a savings goal
 */
export async function deleteGoal(goalId: string): Promise<void> {
  const { error } = await supabase
    .from('savings_goals')
    .delete()
    .eq('id', goalId);

  if (error) throw error;
}

/**
 * Get default goal images from Unsplash
 */
export const defaultGoalImages = {
  'Emergency Fund': 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800&q=80', // umbrella/security
  'Vacation': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80', // beach/mountain
  'House Down Payment': 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80', // house
  'Car': 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&q=80', // car
  'Wedding': 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80', // wedding
  'Education': 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&q=80', // graduation
  'Retirement': 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80', // retirement
  'Business': 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80', // business
  'Travel': 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&q=80', // travel
  'Savings': 'https://images.unsplash.com/photo-1579621970795-87facc2f976d?w=800&q=80', // piggy bank
};

/**
 * Get suggested image based on goal name
 */
export function getSuggestedImage(goalName: string): string {
  const lowerName = goalName.toLowerCase();

  if (lowerName.includes('emergency') || lowerName.includes('fund')) {
    return defaultGoalImages['Emergency Fund'];
  } else if (lowerName.includes('vacation') || lowerName.includes('holiday')) {
    return defaultGoalImages['Vacation'];
  } else if (lowerName.includes('house') || lowerName.includes('home') || lowerName.includes('down payment')) {
    return defaultGoalImages['House Down Payment'];
  } else if (lowerName.includes('car') || lowerName.includes('vehicle')) {
    return defaultGoalImages['Car'];
  } else if (lowerName.includes('wedding') || lowerName.includes('marriage')) {
    return defaultGoalImages['Wedding'];
  } else if (lowerName.includes('education') || lowerName.includes('college') || lowerName.includes('school')) {
    return defaultGoalImages['Education'];
  } else if (lowerName.includes('retire')) {
    return defaultGoalImages['Retirement'];
  } else if (lowerName.includes('business') || lowerName.includes('startup')) {
    return defaultGoalImages['Business'];
  } else if (lowerName.includes('travel') || lowerName.includes('trip')) {
    return defaultGoalImages['Travel'];
  } else {
    return defaultGoalImages['Savings'];
  }
}
