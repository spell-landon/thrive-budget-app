import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import MainTabNavigator from './MainTabNavigator';
import AddAccountScreen from '../screens/AddAccountScreen';
import EditAccountScreen from '../screens/EditAccountScreen';
import AddTransactionScreen from '../screens/AddTransactionScreen';
import AddBudgetCategoryScreen from '../screens/AddBudgetCategoryScreen';
import EditBudgetCategoryScreen from '../screens/EditBudgetCategoryScreen';
import PaycheckPlanningScreen from '../screens/PaycheckPlanningScreen';
import AddPaycheckScreen from '../screens/AddPaycheckScreen';
import EditPaycheckScreen from '../screens/EditPaycheckScreen';
import PaycheckAllocationScreen from '../screens/PaycheckAllocationScreen';
import SubscriptionsScreen from '../screens/SubscriptionsScreen';
import AddSubscriptionScreen from '../screens/AddSubscriptionScreen';
import EditSubscriptionScreen from '../screens/EditSubscriptionScreen';

const Stack = createStackNavigator();

export default function RootNavigator() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {session ? (
          <>
            <Stack.Screen name="Main" component={MainTabNavigator} />
            <Stack.Screen
              name="AddAccount"
              component={AddAccountScreen}
              options={{
                presentation: 'modal'
              }}
            />
            <Stack.Screen
              name="EditAccount"
              component={EditAccountScreen}
              options={{
                presentation: 'modal'
              }}
            />
            <Stack.Screen
              name="AddTransaction"
              component={AddTransactionScreen}
              options={{
                presentation: 'modal'
              }}
            />
            <Stack.Screen
              name="AddBudgetCategory"
              component={AddBudgetCategoryScreen}
              options={{
                presentation: 'modal'
              }}
            />
            <Stack.Screen
              name="EditBudgetCategory"
              component={EditBudgetCategoryScreen}
              options={{
                presentation: 'modal'
              }}
            />
            <Stack.Screen
              name="PaycheckPlanning"
              component={PaycheckPlanningScreen}
            />
            <Stack.Screen
              name="AddPaycheck"
              component={AddPaycheckScreen}
              options={{
                presentation: 'modal'
              }}
            />
            <Stack.Screen
              name="EditPaycheck"
              component={EditPaycheckScreen}
              options={{
                presentation: 'modal'
              }}
            />
            <Stack.Screen
              name="PaycheckAllocation"
              component={PaycheckAllocationScreen}
              options={{
                presentation: 'modal'
              }}
            />
            <Stack.Screen
              name="Subscriptions"
              component={SubscriptionsScreen}
            />
            <Stack.Screen
              name="AddSubscription"
              component={AddSubscriptionScreen}
              options={{
                presentation: 'modal'
              }}
            />
            <Stack.Screen
              name="EditSubscription"
              component={EditSubscriptionScreen}
              options={{
                presentation: 'modal'
              }}
            />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
