// Predefined category groups for budget organization
// Users can also create custom groups

export interface CategoryGroupInfo {
  name: string;
  icon: string; // Ionicons name
  description: string;
  suggestedCategories: string[]; // Common categories for this group
}

export const DEFAULT_CATEGORY_GROUPS: Record<string, CategoryGroupInfo> = {
  Income: {
    name: 'Income',
    icon: 'cash',
    description: 'All sources of income and pay',
    suggestedCategories: [
      'Paycheck',
      'Bonus',
      'Freelance',
      'Side Hustle',
      'Business Income',
      'Interest Income',
      'Investment Income',
      'Tax Refund',
      'Gift Income',
      'Other Income',
    ],
  },
  Home: {
    name: 'Home',
    icon: 'home',
    description: 'Housing-related expenses',
    suggestedCategories: [
      'Rent',
      'Mortgage',
      'Home Insurance',
      'Property Tax',
      'HOA Fees',
      'Utilities',
      'Internet',
      'Cable/Streaming',
      'Home Maintenance',
      'Home Repairs',
    ],
  },
  Transportation: {
    name: 'Transportation',
    icon: 'car',
    description: 'Vehicle and travel costs',
    suggestedCategories: [
      'Car Payment',
      'Car Insurance',
      'Gas/Fuel',
      'Car Maintenance',
      'Car Repairs',
      'Public Transit',
      'Parking',
      'Tolls',
      'Uber/Lyft',
    ],
  },
  Food: {
    name: 'Food',
    icon: 'restaurant',
    description: 'Groceries and dining',
    suggestedCategories: [
      'Groceries',
      'Restaurants',
      'Fast Food',
      'Coffee Shops',
      'Food Delivery',
      'Lunch (Work)',
    ],
  },
  Personal: {
    name: 'Personal',
    icon: 'person',
    description: 'Personal care and lifestyle',
    suggestedCategories: [
      'Clothing',
      'Hair/Beauty',
      'Gym Membership',
      'Personal Care',
      'Hobbies',
      'Entertainment',
      'Shopping',
    ],
  },
  Health: {
    name: 'Health',
    icon: 'medical',
    description: 'Medical and wellness',
    suggestedCategories: [
      'Health Insurance',
      'Medications',
      'Doctor Visits',
      'Dental',
      'Vision',
      'Therapy',
      'Medical Bills',
    ],
  },
  Bills: {
    name: 'Bills',
    icon: 'receipt',
    description: 'Recurring bills and subscriptions',
    suggestedCategories: [
      'Phone Bill',
      'Internet',
      'Electricity',
      'Water',
      'Gas',
      'Trash',
      'Netflix',
      'Spotify',
      'Amazon Prime',
      'Other Subscriptions',
    ],
  },
  Debt: {
    name: 'Debt',
    icon: 'card',
    description: 'Loan and credit card payments',
    suggestedCategories: [
      'Credit Card',
      'Student Loans',
      'Personal Loan',
      'Car Loan',
      'Minimum Payments',
      'Extra Payments',
    ],
  },
  Family: {
    name: 'Family',
    icon: 'people',
    description: 'Family and childcare',
    suggestedCategories: [
      'Childcare',
      'Diapers',
      'Baby Supplies',
      'Kids Activities',
      'Child Support',
      'Tuition',
      'School Supplies',
      'Allowance',
    ],
  },
  Pets: {
    name: 'Pets',
    icon: 'paw',
    description: 'Pet care and supplies',
    suggestedCategories: [
      'Pet Food',
      'Vet Bills',
      'Pet Insurance',
      'Pet Supplies',
      'Grooming',
      'Pet Sitting',
    ],
  },
  Savings: {
    name: 'Savings',
    icon: 'wallet',
    description: 'Savings and investments',
    suggestedCategories: [
      'Emergency Fund',
      'Retirement (401k/IRA)',
      'Investments',
      'Vacation Fund',
      'Down Payment',
      'General Savings',
    ],
  },
  Gifts: {
    name: 'Gifts',
    icon: 'gift',
    description: 'Gifts and charitable giving',
    suggestedCategories: [
      'Birthday Gifts',
      'Holiday Gifts',
      'Charitable Donations',
      'Tithes/Offerings',
    ],
  },
  'Fun Money': {
    name: 'Fun Money',
    icon: 'happy',
    description: 'Entertainment and leisure',
    suggestedCategories: [
      'Movies',
      'Concerts',
      'Events',
      'Travel',
      'Vacation',
      'Books',
      'Games',
      'Hobbies',
    ],
  },
  Other: {
    name: 'Other',
    icon: 'ellipsis-horizontal',
    description: 'Miscellaneous expenses',
    suggestedCategories: ['Miscellaneous', 'Cash', 'Other'],
  },
};

// Get array of category group names (for dropdown selectors)
export const CATEGORY_GROUP_NAMES = Object.keys(DEFAULT_CATEGORY_GROUPS);

// Get suggested categories for a specific group
export function getSuggestedCategories(groupName: string): string[] {
  return DEFAULT_CATEGORY_GROUPS[groupName]?.suggestedCategories || [];
}

// Get group info by name
export function getCategoryGroupInfo(
  groupName: string
): CategoryGroupInfo | null {
  return DEFAULT_CATEGORY_GROUPS[groupName] || null;
}

// Check if a group name is a predefined group
export function isPredefinedGroup(groupName: string): boolean {
  return groupName in DEFAULT_CATEGORY_GROUPS;
}
