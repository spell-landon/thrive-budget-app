import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, ActivityIndicator, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import MainTabNavigator from './MainTabNavigator';
import AddAccountScreen from '../screens/AddAccountScreen';
import EditAccountScreen from '../screens/EditAccountScreen';
import ReorderAccountsScreen from '../screens/ReorderAccountsScreen';
import AddTransactionScreen from '../screens/AddTransactionScreen';
import EditTransactionScreen from '../screens/EditTransactionScreen';
import AddBudgetCategoryScreen from '../screens/AddBudgetCategoryScreen';
import EditBudgetCategoryScreen from '../screens/EditBudgetCategoryScreen';
import AddGoalScreen from '../screens/AddGoalScreen';
import EditGoalScreen from '../screens/EditGoalScreen';
import CategoryGroupsSettingsScreen from '../screens/CategoryGroupsSettingsScreen';
import SubscriptionsScreen from '../screens/SubscriptionsScreen';
import AddSubscriptionScreen from '../screens/AddSubscriptionScreen';
import EditSubscriptionScreen from '../screens/EditSubscriptionScreen';
import ProfileScreen from '../screens/ProfileScreen';
import DatePickerExampleScreen from '../screens/DatePickerExampleScreen';
import SelectAccountScreen from '../screens/SelectAccountScreen';
import SelectCategoryScreen from '../screens/SelectCategoryScreen';
import SelectCategoryGroupScreen from '../screens/SelectCategoryGroupScreen';
import SelectIncomeSourceScreen from '../screens/SelectIncomeSourceScreen';
import AssignMoneyScreen from '../screens/AssignMoneyScreen';
import TransferMoneyScreen from '../screens/TransferMoneyScreen';
import MoveCategoryMoneyScreen from '../screens/MoveCategoryMoneyScreen';
import IncomeSourcesScreen from '../screens/IncomeSourcesScreen';
import AccountSplitsScreen from '../screens/AccountSplitsScreen';
import IncomeTemplateScreen from '../screens/IncomeTemplateScreen';

const Stack = createStackNavigator();

// Helper function for standardized modal header
const createModalHeader =
  (
    title: string,
    actionText?: string,
    presentation?: 'card' | 'modal' | 'transparentModal' | undefined
  ) =>
  ({ navigation, route }: any) => {
    const headerConfig: any = {
      presentation: presentation ?? 'modal',
      headerShown: true,
      title,
      headerTintColor: '#FF6B35',
      headerStyle: {
        backgroundColor: '#ffffff',
      },
      headerTitleStyle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
      },
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ marginLeft: 16 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: '400',
              color: '#6B7280',
            }}>
            Cancel
          </Text>
        </TouchableOpacity>
      ),
    };

    // Add action button if actionText is provided
    if (actionText) {
      headerConfig.headerRight = () => {
        const params = route.params as any;
        const handleSubmit = params?.handleSubmit;
        const loading = params?.loading || false;
        const isDisabled = loading || !handleSubmit;

        return (
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isDisabled}
            style={{ marginRight: 16 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: '600',
                color: isDisabled ? '#9ca3af' : '#FF6B35',
              }}>
              {loading ? `${actionText.replace(/e?$/, '')}ing...` : actionText}
            </Text>
          </TouchableOpacity>
        );
      };
    }

    return headerConfig;
  };

export default function RootNavigator() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View className='flex-1 items-center justify-center bg-white'>
        <ActivityIndicator size='large' color='#2563eb' />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {session ? (
          <>
            <Stack.Screen name='Main' component={MainTabNavigator} />
            <Stack.Screen
              name='AddAccount'
              component={AddAccountScreen}
              options={createModalHeader('Add Account', 'Add')}
            />
            <Stack.Screen
              name='EditAccount'
              component={EditAccountScreen}
              options={createModalHeader('Edit Account', 'Save')}
            />
            <Stack.Screen
              name='ReorderAccounts'
              component={ReorderAccountsScreen}
              options={{
                headerShown: false,
                presentation: 'card',
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name='AddTransaction'
              component={AddTransactionScreen}
              options={({ navigation, route }) => ({
                presentation: 'modal',
                headerShown: true,
                title: 'Add Transaction',
                headerTintColor: '#FF6B35',
                headerStyle: {
                  backgroundColor: '#ffffff',
                },
                headerTitleStyle: {
                  fontSize: 18,
                  fontWeight: '700',
                  color: '#1F2937',
                },
                headerLeft: () => (
                  <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={{ marginLeft: 16 }}>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: '400',
                        color: '#6B7280',
                      }}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                ),
                headerRight: () => {
                  const params = route.params as any;
                  const handleSubmit = params?.handleSubmit;
                  const loading = params?.loading || false;
                  const hasAccounts = params?.hasAccounts !== false;
                  const isDisabled = loading || !hasAccounts;

                  return (
                    <TouchableOpacity
                      onPress={handleSubmit}
                      disabled={isDisabled}
                      style={{ marginRight: 16 }}>
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: '600',
                          color: isDisabled ? '#9ca3af' : '#FF6B35',
                        }}>
                        {loading ? 'Adding...' : 'Add'}
                      </Text>
                    </TouchableOpacity>
                  );
                },
              })}
            />
            <Stack.Screen
              name='EditTransaction'
              component={EditTransactionScreen}
              options={createModalHeader('Edit Transaction', 'Save')}
            />
            <Stack.Screen
              name='AddBudgetCategory'
              component={AddBudgetCategoryScreen}
              options={createModalHeader('Add Category', 'Add')}
            />
            <Stack.Screen
              name='EditBudgetCategory'
              component={EditBudgetCategoryScreen}
              options={createModalHeader('Edit Category', 'Save', 'card')}
            />
            <Stack.Screen
              name='AssignMoney'
              component={AssignMoneyScreen}
              options={createModalHeader('Assign Money', 'Assign')}
            />
            <Stack.Screen
              name='TransferMoney'
              component={TransferMoneyScreen}
              options={createModalHeader('Transfer Money', 'Transfer')}
            />
            <Stack.Screen
              name='MoveCategoryMoney'
              component={MoveCategoryMoneyScreen}
              options={createModalHeader('Move Money', 'Move')}
            />
            <Stack.Screen
              name='AddGoal'
              component={AddGoalScreen}
              options={createModalHeader('Add Goal', 'Add')}
            />
            <Stack.Screen
              name='EditGoal'
              component={EditGoalScreen}
              options={createModalHeader('Edit Goal', 'Save')}
            />
            <Stack.Screen
              name='Profile'
              component={ProfileScreen}
              options={{
                headerShown: true,
                animation: 'slide_from_right',
                title: 'Profile',
                headerBackTitle: 'Back',
                headerTintColor: '#FF6B35',
                headerStyle: {
                  backgroundColor: '#ffffff',
                },
                headerTitleStyle: {
                  fontSize: 18,
                  fontWeight: '700',
                  color: '#1F2937',
                },
              }}
            />
            <Stack.Screen
              name='CategoryGroupsSettings'
              component={CategoryGroupsSettingsScreen}
              options={createModalHeader('Category Groups')}
            />
            <Stack.Screen
              name='Subscriptions'
              component={SubscriptionsScreen}
              options={({ navigation }) => ({
                headerShown: true,
                animation: 'slide_from_right',
                title: 'Subscriptions',
                headerBackTitle: 'Back',
                headerTintColor: '#FF6B35',
                headerStyle: {
                  backgroundColor: '#ffffff',
                },
                headerTitleStyle: {
                  fontSize: 18,
                  fontWeight: '700',
                  color: '#1F2937',
                },
                headerRight: () => (
                  <TouchableOpacity
                    onPress={() => navigation.navigate('AddSubscription')}
                    style={{ marginRight: 16 }}>
                    <Ionicons name='add' size={28} color='#FF6B35' />
                  </TouchableOpacity>
                ),
              })}
            />
            <Stack.Screen
              name='AddSubscription'
              component={AddSubscriptionScreen}
              options={createModalHeader('Add Subscription', 'Add')}
            />
            <Stack.Screen
              name='EditSubscription'
              component={EditSubscriptionScreen}
              options={createModalHeader('Edit Subscription', 'Save')}
            />
            <Stack.Screen
              name='DatePickerExample'
              component={DatePickerExampleScreen}
              options={{
                headerShown: true,
                animation: 'slide_from_right',
                title: 'DatePicker Examples',
                headerBackTitle: 'Back',
                headerTintColor: '#FF6B35',
                headerStyle: {
                  backgroundColor: '#ffffff',
                },
                headerTitleStyle: {
                  fontSize: 18,
                  fontWeight: '700',
                  color: '#1F2937',
                },
              }}
            />
            <Stack.Screen
              name='SelectAccount'
              component={SelectAccountScreen}
              options={createModalHeader('Select Account')}
            />
            <Stack.Screen
              name='SelectCategory'
              component={SelectCategoryScreen}
              options={createModalHeader('Select Category')}
            />
            <Stack.Screen
              name='SelectCategoryGroup'
              component={SelectCategoryGroupScreen}
              options={createModalHeader('Select Group')}
            />
            <Stack.Screen
              name='SelectIncomeSource'
              component={SelectIncomeSourceScreen}
              options={createModalHeader('Select Income Source')}
            />
            <Stack.Screen
              name='IncomeSources'
              component={IncomeSourcesScreen}
              options={{
                headerShown: true,
                animation: 'slide_from_right',
                title: 'Income Sources',
                headerBackTitle: 'Back',
                headerTintColor: '#FF6B35',
                headerStyle: {
                  backgroundColor: '#ffffff',
                },
                headerTitleStyle: {
                  fontSize: 18,
                  fontWeight: '700',
                  color: '#1F2937',
                },
              }}
            />
            <Stack.Screen
              name='AccountSplits'
              component={AccountSplitsScreen}
              options={{
                headerShown: true,
                animation: 'slide_from_right',
                title: 'Account Splits',
                headerBackTitle: 'Back',
                headerTintColor: '#FF6B35',
                headerStyle: {
                  backgroundColor: '#ffffff',
                },
                headerTitleStyle: {
                  fontSize: 18,
                  fontWeight: '700',
                  color: '#1F2937',
                },
              }}
            />
            <Stack.Screen
              name='IncomeTemplate'
              component={IncomeTemplateScreen}
              options={{
                headerShown: true,
                animation: 'slide_from_right',
                title: 'Allocation Templates',
                headerBackTitle: 'Back',
                headerTintColor: '#FF6B35',
                headerStyle: {
                  backgroundColor: '#ffffff',
                },
                headerTitleStyle: {
                  fontSize: 18,
                  fontWeight: '700',
                  color: '#1F2937',
                },
              }}
            />
          </>
        ) : (
          <Stack.Screen name='Login' component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
