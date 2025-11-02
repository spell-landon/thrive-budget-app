import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ImageBackground,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../contexts/AuthContext';
import {
  createGoal,
  defaultGoalImages,
  getSuggestedImage,
} from '../services/goals';
import { LinearGradient } from 'expo-linear-gradient';

export default function AddGoalScreen({ navigation }: any) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('0');
  const [targetDate, setTargetDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const imageOptions = Object.entries(defaultGoalImages);

  // Pass submit handler to navigation params for header button
  useEffect(() => {
    navigation.setParams({
      handleSubmit: handleSave,
      loading: saving,
    });
  }, [saving]);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (event.type === 'set' && selectedDate) {
        setTargetDate(selectedDate);
      }
    } else {
      // iOS - update date immediately as user scrolls
      if (selectedDate) {
        setTargetDate(selectedDate);
      }
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleSave = async () => {
    if (!user) return;

    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a goal name');
      return;
    }

    if (!targetAmount || parseFloat(targetAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid target amount');
      return;
    }

    setSaving(true);

    try {
      const targetAmountCents = Math.round(parseFloat(targetAmount) * 100);
      const currentAmountCents = Math.round(
        parseFloat(currentAmount || '0') * 100
      );

      const imageUrl = selectedImage || getSuggestedImage(name);

      await createGoal(user.id, {
        name: name.trim(),
        target_amount: targetAmountCents,
        current_amount: currentAmountCents,
        target_date: targetDate ? formatDate(targetDate) : undefined,
        image_url: imageUrl,
      });

      Alert.alert('Success', 'Goal created successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create goal');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className='flex-1 bg-background' edges={[]}>
      <View className='flex-1'>
        <ScrollView className='flex-1 px-6 py-6'>
          {/* Goal Name */}
          <View className='mb-6'>
            <Text className='text-base font-semibold text-text-primary mb-2'>
              Goal Name *
            </Text>
            <TextInput
              className='bg-card border border-gray-200 rounded-lg px-4 py-3 text-base text-text-primary'
              placeholder='e.g., Emergency Fund, Vacation'
              value={name}
              onChangeText={setName}
              placeholderTextColor='#9ca3af'
              textAlignVertical='center'
            />
          </View>

          {/* Target Amount */}
          <View className='mb-6'>
            <Text className='text-base font-semibold text-text-primary mb-2'>
              Target Amount *
            </Text>
            <View className='flex-row items-center bg-card border border-gray-200 rounded-lg px-4'>
              <Text className='text-text-secondary text-lg'>$</Text>
              <TextInput
                className='flex-1 py-3 text-base text-text-primary ml-2'
                placeholder='0.00'
                value={targetAmount}
                onChangeText={setTargetAmount}
                keyboardType='decimal-pad'
                placeholderTextColor='#9ca3af'
                textAlignVertical='center'
              />
            </View>
          </View>

          {/* Current Amount */}
          <View className='mb-6'>
            <Text className='text-base font-semibold text-text-primary mb-2'>
              Current Amount (Optional)
            </Text>
            <View className='flex-row items-center bg-card border border-gray-200 rounded-lg px-4'>
              <Text className='text-text-secondary text-lg'>$</Text>
              <TextInput
                className='flex-1 py-3 text-base text-text-primary ml-2'
                placeholder='0.00'
                value={currentAmount}
                onChangeText={setCurrentAmount}
                keyboardType='decimal-pad'
                placeholderTextColor='#9ca3af'
                textAlignVertical='center'
              />
            </View>
          </View>

          {/* Target Date */}
          <View className='mb-6'>
            <Text className='text-base font-semibold text-text-primary mb-2'>
              Target Date (Optional)
            </Text>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              className='bg-card border border-gray-200 rounded-lg px-4 py-3 flex-row items-center justify-between'>
              <Text
                className={`text-base ${
                  targetDate ? 'text-text-primary' : 'text-text-tertiary'
                }`}>
                {targetDate ? formatDate(targetDate) : 'Select a date'}
              </Text>
              <Ionicons name='calendar-outline' size={20} color='#6B7280' />
            </TouchableOpacity>
            {targetDate && (
              <TouchableOpacity
                onPress={() => setTargetDate(null)}
                className='mt-2'>
                <Text className='text-xs text-primary'>Clear date</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Date Picker */}
          {showDatePicker && Platform.OS === 'android' && (
            <DateTimePicker
              value={targetDate || new Date()}
              mode='date'
              display='calendar'
              onChange={handleDateChange}
              minimumDate={new Date()}
            />
          )}

          {/* Date Picker Modal for iOS */}
          {Platform.OS === 'ios' && (
            <Modal
              visible={showDatePicker}
              transparent
              animationType='slide'
              onRequestClose={() => setShowDatePicker(false)}>
              <View className='flex-1 bg-black/50 justify-end'>
                <View className='bg-white rounded-t-3xl pb-8'>
                  <View className='flex-row items-center justify-between px-6 py-4 border-b border-gray-200'>
                    <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                      <Text className='text-base font-semibold text-gray-600'>
                        Cancel
                      </Text>
                    </TouchableOpacity>
                    <Text className='text-lg font-bold text-gray-800'>
                      Select Target Date
                    </Text>
                    <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                      <Text className='text-base font-semibold text-primary'>
                        Done
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={targetDate || new Date()}
                    mode='date'
                    display='inline'
                    minimumDate={new Date()}
                    style={{ marginLeft: 'auto', marginRight: 'auto' }}
                    onChange={handleDateChange}
                  />
                </View>
              </View>
            </Modal>
          )}

          {/* Image Selection */}
          <View className='mb-6'>
            <Text className='text-base font-semibold text-text-primary mb-3'>
              Choose Image
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {imageOptions.map(([category, imageUrl]) => (
                <TouchableOpacity
                  key={category}
                  onPress={() => setSelectedImage(imageUrl)}
                  className='mr-3'
                  activeOpacity={0.8}>
                  <ImageBackground
                    source={{ uri: imageUrl }}
                    className='w-32 h-24 rounded-xl overflow-hidden'
                    resizeMode='cover'>
                    <LinearGradient
                      colors={
                        selectedImage === imageUrl
                          ? ['rgba(255,107,53,0.8)', 'rgba(255,107,53,0.9)']
                          : ['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.5)']
                      }
                      className='flex-1 items-center justify-center'>
                      {selectedImage === imageUrl && (
                        <Ionicons
                          name='checkmark-circle'
                          size={32}
                          color='white'
                        />
                      )}
                    </LinearGradient>
                  </ImageBackground>
                  <Text className='text-xs text-text-secondary text-center mt-1'>
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text className='text-xs text-text-tertiary mt-2'>
              Don't see what you want? We'll suggest one based on your goal
              name!
            </Text>
          </View>

          {/* Preview */}
          {name && targetAmount && (
            <View className='mb-6'>
              <Text className='text-base font-semibold text-text-primary mb-3'>
                Preview
              </Text>
              <View
                className='rounded-2xl overflow-hidden'
                style={{
                  height: 192,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 3,
                }}>
                <ImageBackground
                  source={{ uri: selectedImage || getSuggestedImage(name) }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode='cover'>
                  <LinearGradient
                    colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']}
                    style={{
                      flex: 1,
                      padding: 20,
                      justifyContent: 'space-between',
                    }}>
                    <Text className='text-white text-2xl font-bold'>
                      {name}
                    </Text>
                    <View>
                      <View className='h-3 bg-white/30 rounded-full overflow-hidden mb-3'>
                        <View
                          className='h-3 bg-white rounded-full'
                          style={{
                            width: `${Math.min(
                              (parseFloat(currentAmount || '0') /
                                parseFloat(targetAmount)) *
                                100,
                              100
                            )}%`,
                          }}
                        />
                      </View>
                      <View className='flex-row justify-between'>
                        <Text className='text-white text-lg font-bold'>
                          ${parseFloat(currentAmount || '0').toFixed(2)}
                        </Text>
                        <Text className='text-white text-lg font-bold'>
                          ${parseFloat(targetAmount).toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  </LinearGradient>
                </ImageBackground>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
