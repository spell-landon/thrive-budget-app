import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { deleteUserAccount } from '../services/user';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut },
      ]
    );
  };

  const handleDeleteAccountPress = () => {
    Alert.alert(
      '⚠️ Delete Account',
      'This will permanently delete your account and ALL your data including:\n\n• All accounts and balances\n• All transactions\n• All budgets and categories\n• All paycheck plans\n• All subscriptions\n\nThis action cannot be undone!',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => setShowDeleteModal(true),
        },
      ]
    );
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.toUpperCase() !== 'DELETE') {
      Alert.alert('Error', 'Please type DELETE to confirm');
      return;
    }

    setIsDeleting(true);

    try {
      if (!user) throw new Error('No user found');

      await deleteUserAccount(user.id);

      // Sign out after successful deletion
      Alert.alert(
        'Account Deleted',
        'Your account and all data have been permanently deleted.',
        [{ text: 'OK', onPress: signOut }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to delete account. Please try again.');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
      setDeleteConfirmText('');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
      <ScrollView className="flex-1">
        <View className="p-6">
          {/* User Info Card */}
          <View className="bg-card rounded-xl p-6 mb-4"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 1,
            }}
          >
            <View className="items-center mb-6">
              <View className="w-20 h-20 bg-primary-100 rounded-full items-center justify-center mb-3">
                <Ionicons name="person" size={40} color="#FF6B35" />
              </View>
              <Text className="text-lg font-semibold text-text-primary">
                {user?.email}
              </Text>
            </View>

            {/* Profile Options */}
            <View className="border-t border-gray-100 pt-4">
              <TouchableOpacity className="flex-row items-center justify-between py-3">
                <View className="flex-row items-center">
                  <Ionicons name="person-outline" size={22} color="#6b7280" />
                  <Text className="text-text-secondary ml-3 text-base">Account Settings</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </TouchableOpacity>

              <TouchableOpacity className="flex-row items-center justify-between py-3">
                <View className="flex-row items-center">
                  <Ionicons name="notifications-outline" size={22} color="#6b7280" />
                  <Text className="text-text-secondary ml-3 text-base">Notifications</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </TouchableOpacity>

              <TouchableOpacity className="flex-row items-center justify-between py-3">
                <View className="flex-row items-center">
                  <Ionicons name="shield-outline" size={22} color="#6b7280" />
                  <Text className="text-text-secondary ml-3 text-base">Privacy & Security</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </TouchableOpacity>
            </View>
          </View>

          {/* App Info */}
          <View className="bg-card rounded-xl p-6 mb-4"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 1,
            }}
          >
            <TouchableOpacity className="flex-row items-center justify-between py-3">
              <View className="flex-row items-center">
                <Ionicons name="help-circle-outline" size={22} color="#6b7280" />
                <Text className="text-text-secondary ml-3 text-base">Help & Support</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>

            <TouchableOpacity className="flex-row items-center justify-between py-3">
              <View className="flex-row items-center">
                <Ionicons name="information-circle-outline" size={22} color="#6b7280" />
                <Text className="text-text-secondary ml-3 text-base">About Thrive</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          {/* Sign Out Button */}
          <TouchableOpacity
            onPress={handleSignOut}
            className="bg-red-500 rounded-lg py-4 shadow-sm"
          >
            <View className="flex-row items-center justify-center">
              <Ionicons name="log-out-outline" size={22} color="white" />
              <Text className="text-white font-semibold text-lg ml-2">Sign Out</Text>
            </View>
          </TouchableOpacity>

          {/* Delete Account Button */}
          <TouchableOpacity
            onPress={handleDeleteAccountPress}
            className="border-2 border-red-600 rounded-lg py-4 mt-4"
          >
            <View className="flex-row items-center justify-center">
              <Ionicons name="trash-outline" size={22} color="#dc2626" />
              <Text className="text-red-600 font-semibold text-lg ml-2">Delete Account</Text>
            </View>
          </TouchableOpacity>

          {/* App Version */}
          <Text className="text-center text-gray-400 text-sm mt-6">
            Version 1.0.0
          </Text>
        </View>
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => !isDeleting && setShowDeleteModal(false)}
      >
        <View className="flex-1 bg-black/50 items-center justify-center p-6">
          <View className="bg-white rounded-2xl p-6 w-full max-w-md">
            <View className="items-center mb-4">
              <View className="w-16 h-16 bg-red-100 rounded-full items-center justify-center mb-3">
                <Ionicons name="warning" size={32} color="#dc2626" />
              </View>
              <Text className="text-xl font-bold text-gray-800 mb-2">
                Final Confirmation
              </Text>
              <Text className="text-gray-600 text-center">
                To confirm account deletion, please type DELETE below
              </Text>
            </View>

            <TextInput
              className="border-2 border-gray-300 rounded-lg px-4 py-3 text-base mb-6"
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              placeholder="Type DELETE to confirm"
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!isDeleting}
            />

            <View className="gap-3">
              <TouchableOpacity
                onPress={handleDeleteAccount}
                disabled={isDeleting || deleteConfirmText.toUpperCase() !== 'DELETE'}
                className={`rounded-lg py-4 ${
                  isDeleting || deleteConfirmText.toUpperCase() !== 'DELETE'
                    ? 'bg-gray-300'
                    : 'bg-red-600'
                }`}
              >
                <Text className="text-white text-center font-semibold text-lg">
                  {isDeleting ? 'Deleting Account...' : 'Delete My Account'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText('');
                }}
                disabled={isDeleting}
                className="border border-gray-300 rounded-lg py-4"
              >
                <Text className="text-gray-700 text-center font-semibold text-lg">
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
