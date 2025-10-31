import { supabase } from './supabase';
import { Subscription } from '../types';

// ==================== SUBSCRIPTIONS ====================

// Get all subscriptions for a user
export async function getSubscriptions(userId: string): Promise<Subscription[]> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('next_billing_date', { ascending: true });

  if (error) throw error;
  return data || [];
}

// Get a specific subscription by ID
export async function getSubscriptionById(subscriptionId: string): Promise<Subscription> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('id', subscriptionId)
    .single();

  if (error) throw error;
  return data;
}

// Create a new subscription
export async function createSubscription(
  userId: string,
  subscription: Omit<Subscription, 'id' | 'user_id' | 'created_at' | 'updated_at'>
): Promise<Subscription> {
  const { data, error } = await supabase
    .from('subscriptions')
    .insert([
      {
        user_id: userId,
        name: subscription.name,
        amount: subscription.amount,
        frequency: subscription.frequency,
        category_id: subscription.category_id,
        next_billing_date: subscription.next_billing_date,
        reminder_days_before: subscription.reminder_days_before,
        auto_pay: subscription.auto_pay,
        notes: subscription.notes,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Update a subscription
export async function updateSubscription(
  subscriptionId: string,
  updates: Partial<Omit<Subscription, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<Subscription> {
  const { data, error } = await supabase
    .from('subscriptions')
    .update(updates)
    .eq('id', subscriptionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Delete a subscription
export async function deleteSubscription(subscriptionId: string): Promise<void> {
  const { error } = await supabase.from('subscriptions').delete().eq('id', subscriptionId);

  if (error) throw error;
}

// Calculate next billing date based on frequency
export function calculateNextBillingDate(currentDate: Date, frequency: string): Date {
  const nextDate = new Date(currentDate);

  switch (frequency) {
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'quarterly':
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
    default:
      nextDate.setMonth(nextDate.getMonth() + 1);
  }

  return nextDate;
}

// Get upcoming subscriptions (within reminder window)
export async function getUpcomingSubscriptions(userId: string): Promise<Subscription[]> {
  const subscriptions = await getSubscriptions(userId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return subscriptions.filter((sub) => {
    const billingDate = new Date(sub.next_billing_date);
    billingDate.setHours(0, 0, 0, 0);

    const daysUntil = Math.ceil((billingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // Show if within reminder window and not past due
    return daysUntil >= 0 && daysUntil <= sub.reminder_days_before;
  });
}

// Calculate monthly savings amount for yearly subscriptions
export function calculateMonthlySavings(amount: number): number {
  // Divide yearly amount by 12 months
  return Math.ceil(amount / 12);
}

// Get subscriptions with category details
export async function getSubscriptionsWithCategories(userId: string): Promise<
  Array<
    Subscription & {
      category: { id: string; name: string; category_type: string } | null;
    }
  >
> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select(
      `
      *,
      category:budget_categories(id, name, category_type)
    `
    )
    .eq('user_id', userId)
    .order('next_billing_date', { ascending: true });

  if (error) throw error;
  return data || [];
}

// Get total monthly subscription cost
export async function getTotalMonthlyCost(userId: string): Promise<number> {
  const subscriptions = await getSubscriptions(userId);

  return subscriptions.reduce((total, sub) => {
    let monthlyCost = 0;

    switch (sub.frequency) {
      case 'weekly':
        // 52 weeks / 12 months
        monthlyCost = (sub.amount * 52) / 12;
        break;
      case 'monthly':
        monthlyCost = sub.amount;
        break;
      case 'quarterly':
        // 4 quarters / 12 months
        monthlyCost = (sub.amount * 4) / 12;
        break;
      case 'yearly':
        monthlyCost = sub.amount / 12;
        break;
    }

    return total + monthlyCost;
  }, 0);
}
