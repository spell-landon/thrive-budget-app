import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ImageBackground,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import {
  getGoal,
  getGoals,
  updateGoal,
  deleteGoal,
  transferBetweenGoals,
  addToGoal,
  defaultGoalImages,
} from '../services/goals';
import { formatCurrency } from '../utils/currency';
import { SavingsGoal } from '../types';
import { LinearGradient } from 'expo-linear-gradient';

export default function EditGoalScreen({ route, navigation }: any) {
  const { goalId } = route.params;
  const { user } = useAuth();
  const [goal, setGoal] = useState<SavingsGoal | null>(null);
  const [allGoals, setAllGoals] = useState<SavingsGoal[]>([]);
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [targetDate, setTargetDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [addAmount, setAddAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTransferGoal, setSelectedTransferGoal] = useState<
    string | null
  >(null);

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

  const loadGoal = useCallback(async () => {
    try {
      const data = await getGoal(goalId);
      setGoal(data);
      setName(data.name);
      setTargetAmount((data.target_amount / 100).toString());
      setCurrentAmount((data.current_amount / 100).toString());
      setTargetDate(data.target_date ? new Date(data.target_date) : null);
      setSelectedImage(data.image_url || null);

      if (user) {
        const goals = await getGoals(user.id);
        setAllGoals(goals.filter((g) => g.id !== goalId));
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load goal');
      navigation.goBack();
    }
  }, [goalId, user, navigation]);

  useFocusEffect(
    useCallback(() => {
      loadGoal();
    }, [loadGoal])
  );

  // Pass submit handler to navigation params for header button
  useEffect(() => {
    navigation.setParams({
      handleSubmit: handleSave,
      loading: saving,
    });
  }, [saving]);

  const handleSave = async () => {
    if (!goal) return;

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

      await updateGoal(goal.id, {
        name: name.trim(),
        target_amount: targetAmountCents,
        current_amount: currentAmountCents,
        target_date: targetDate ? formatDate(targetDate) : undefined,
        image_url: selectedImage || undefined,
      });

      Alert.alert('Success', 'Goal updated successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update goal');
    } finally {
      setSaving(false);
    }
  };

  const handleAddMoney = async () => {
    if (!goal) return;

    const amount = parseFloat(addAmount || '0');
    if (amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    try {
      const amountCents = Math.round(amount * 100);
      await addToGoal(goal.id, amountCents);
      setAddAmount('');
      loadGoal();
      Alert.alert(
        'Success',
        `Added ${formatCurrency(amountCents)} to your goal!`
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add money');
    }
  };

  const handleDelete = async () => {
    if (!goal) return;

    // If goal has money, require transfer
    if (goal.current_amount > 0) {
      if (!selectedTransferGoal) {
        Alert.alert('Error', 'Please select a goal to transfer the money to');
        return;
      }

      try {
        // Transfer money first
        await transferBetweenGoals(
          goal.id,
          selectedTransferGoal,
          goal.current_amount
        );
        // Then delete
        await deleteGoal(goal.id);

        Alert.alert('Success', 'Goal deleted and funds transferred!', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Failed to delete goal');
      }
    } else {
      // No money, just delete
      try {
        await deleteGoal(goal.id);
        Alert.alert('Success', 'Goal deleted successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Failed to delete goal');
      }
    }
  };

  const confirmDelete = () => {
    if (!goal) return;

    if (goal.current_amount > 0 && allGoals.length === 0) {
      Alert.alert(
        'Cannot Delete',
        'This goal has saved money but there are no other goals to transfer it to. Please create another goal first or withdraw the money manually.'
      );
      return;
    }

    setShowDeleteModal(true);
  };

  const imageOptions = Object.entries(defaultGoalImages);

  if (!goal) {
    return (
      <SafeAreaView className='flex-1 bg-background' edges={['top']}>
        <Text className='text-text-secondary text-center mt-8'>Loading...</Text>
      </SafeAreaView>
    );
  }

  const progress =
    goal.target_amount > 0
      ? Math.min((goal.current_amount / goal.target_amount) * 100, 100)
      : 0;

  return (
    <SafeAreaView className='flex-1 bg-background' edges={[]}>
      <View className='flex-1'>
        <ScrollView className='flex-1 px-6 pt-6 pb-12'>
          {/* Current Progress Card */}
          <View
            className='rounded-2xl overflow-hidden mb-6'
            style={{
              height: 192,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}>
            <ImageBackground
              source={{
                uri:
                  goal.image_url ||
                  'https://images.unsplash.com/photo-1579621970795-87facc2f976d?w=800&q=80',
              }}
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
                  {goal.name}
                </Text>
                <View>
                  <View className='h-3 bg-white/30 rounded-full overflow-hidden mb-3'>
                    <View
                      className='h-3 bg-white rounded-full'
                      style={{ width: `${progress}%` }}
                    />
                  </View>
                  <View className='flex-row justify-between'>
                    <View>
                      <Text className='text-white/80 text-xs mb-1'>Saved</Text>
                      <Text className='text-white text-xl font-bold'>
                        {formatCurrency(goal.current_amount)}
                      </Text>
                    </View>
                    <View className='items-end'>
                      <Text className='text-white/80 text-xs mb-1'>Target</Text>
                      <Text className='text-white text-xl font-bold'>
                        {formatCurrency(goal.target_amount)}
                      </Text>
                    </View>
                  </View>
                </View>
              </LinearGradient>
            </ImageBackground>
          </View>

          {/* Quick Add Money */}
          <View
            className='bg-card rounded-xl p-4 mb-6'
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 1,
            }}>
            <Text className='text-base font-semibold text-text-primary mb-3'>
              Add Money
            </Text>
            <View className='flex-row items-center gap-2'>
              <View className='flex-1 flex-row items-center bg-background border border-gray-200 rounded-lg px-4'>
                <Text className='text-text-secondary text-lg'>$</Text>
                <TextInput
                  className='flex-1 py-3 text-base text-text-primary ml-2'
                  placeholder='0.00'
                  value={addAmount}
                  onChangeText={setAddAmount}
                  keyboardType='decimal-pad'
                  placeholderTextColor='#9ca3af'
                  textAlignVertical='center'
                />
              </View>
              <TouchableOpacity
                onPress={handleAddMoney}
                className='bg-success-500 px-6 py-3 rounded-lg'>
                <Text className='text-white font-semibold'>Add</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Goal Details */}
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

          <View className='mb-6'>
            <Text className='text-base font-semibold text-text-primary mb-2'>
              Current Amount
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
              Change Image
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
                        selectedImage === imageUrl ||
                        goal.image_url === imageUrl
                          ? ['rgba(255,107,53,0.8)', 'rgba(255,107,53,0.9)']
                          : ['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.5)']
                      }
                      className='flex-1 items-center justify-center'>
                      {(selectedImage === imageUrl ||
                        goal.image_url === imageUrl) && (
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
          </View>
        </ScrollView>
      </View>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType='fade'
        onRequestClose={() => setShowDeleteModal(false)}>
        <View className='flex-1 bg-black/50 items-center justify-center p-6'>
          <View className='bg-card rounded-2xl p-6 w-full max-w-md'>
            <View className='items-center mb-4'>
              <View className='w-16 h-16 bg-error-100 rounded-full items-center justify-center mb-3'>
                <Ionicons name='warning' size={32} color='#EF4444' />
              </View>
              <Text className='text-xl font-bold text-text-primary mb-2'>
                Delete Goal
              </Text>
              <Text className='text-text-secondary text-center'>
                {goal.current_amount > 0
                  ? `This goal has ${formatCurrency(
                      goal.current_amount
                    )} saved. Select a goal to transfer the money to before deleting.`
                  : 'Are you sure you want to delete this goal?'}
              </Text>
            </View>

            {goal.current_amount > 0 && allGoals.length > 0 && (
              <View className='mb-4'>
                <Text className='text-sm font-semibold text-text-primary mb-2'>
                  Transfer money to:
                </Text>
                {allGoals.map((g) => (
                  <TouchableOpacity
                    key={g.id}
                    onPress={() => setSelectedTransferGoal(g.id)}
                    className={`border-2 rounded-lg p-3 mb-2 ${
                      selectedTransferGoal === g.id
                        ? 'border-primary bg-primary-50'
                        : 'border-gray-200'
                    }`}>
                    <Text
                      className={`font-semibold ${
                        selectedTransferGoal === g.id
                          ? 'text-primary'
                          : 'text-text-primary'
                      }`}>
                      {g.name}
                    </Text>
                    <Text className='text-xs text-text-secondary mt-1'>
                      {formatCurrency(g.current_amount)} of{' '}
                      {formatCurrency(g.target_amount)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View className='gap-3'>
              <TouchableOpacity
                onPress={handleDelete}
                disabled={goal.current_amount > 0 && !selectedTransferGoal}
                className={`rounded-lg py-4 ${
                  goal.current_amount > 0 && !selectedTransferGoal
                    ? 'bg-gray-300'
                    : 'bg-error-600'
                }`}>
                <Text className='text-white text-center font-semibold text-lg'>
                  {goal.current_amount > 0
                    ? 'Transfer & Delete'
                    : 'Delete Goal'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setShowDeleteModal(false);
                  setSelectedTransferGoal(null);
                }}
                className='border border-gray-300 rounded-lg py-4'>
                <Text className='text-text-primary text-center font-semibold text-lg'>
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
