import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Pressable,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export interface BottomSheetOption {
  text: string;
  onPress: () => void;
  icon?: string;
  destructive?: boolean;
  disabled?: boolean;
}

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  options: BottomSheetOption[];
}

export default function BottomSheet({
  visible,
  onClose,
  title,
  message,
  options,
}: BottomSheetProps) {
  const handleOptionPress = (option: BottomSheetOption) => {
    if (option.disabled) return;
    onClose();
    // Execute the callback after a small delay to let the modal close smoothly
    setTimeout(() => {
      option.onPress();
    }, 100);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType='fade'
      onRequestClose={onClose}>
      <Pressable className='flex-1 bg-black/50 justify-end' onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()}>
          <SafeAreaView className='bg-white rounded-t-3xl' edges={['bottom']}>
            {renderContent()}
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );

  function renderContent() {
    return (
      <>
        {/* Header */}
        {(title || message) && (
          <View className='px-6 pt-4 pb-3 border-b border-gray-200'>
            {title && (
              <Text className='text-xl font-bold text-gray-800 mb-1'>
                {title}
              </Text>
            )}
            {message && (
              <Text className='text-sm text-gray-600'>{message}</Text>
            )}
          </View>
        )}

        {/* Options */}
        <ScrollView
          className='max-h-96'
          style={{ flexGrow: 0 }}
          scrollEnabled={options.length > 5}>
          {options.map((option, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => handleOptionPress(option)}
              disabled={option.disabled}
              className={`px-6 py-4 flex-row items-center ${
                index < options.length - 1 ? 'border-b border-gray-100' : ''
              } ${option.disabled ? 'opacity-50' : ''}`}
              activeOpacity={0.7}>
              {option.icon && (
                <Ionicons
                  name={option.icon as any}
                  size={24}
                  color={
                    option.destructive
                      ? '#EF4444'
                      : option.disabled
                      ? '#9CA3AF'
                      : '#FF6B35'
                  }
                  style={{ marginRight: 12 }}
                />
              )}
              <Text
                className={`text-base flex-1 ${
                  option.destructive
                    ? 'text-error-600 font-semibold'
                    : option.disabled
                    ? 'text-gray-400'
                    : 'text-gray-800'
                }`}>
                {option.text}
              </Text>
              {!option.icon && (
                <Ionicons name='chevron-forward' size={20} color='#9CA3AF' />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Cancel Button */}
        <View className='px-6 pt-3 pb-6 border-t border-gray-200'>
          <TouchableOpacity
            onPress={onClose}
            className='py-3 items-center'
            activeOpacity={0.7}>
            <Text className='text-base font-semibold text-gray-600'>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }
}
