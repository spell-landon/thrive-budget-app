import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function DatePickerExampleScreen({ navigation }: any) {
  const [date, setDate] = useState(new Date());
  const [mode, setMode] = useState<'date' | 'time' | 'datetime'>('date');
  const [showPicker, setShowPicker] = useState(false);

  // Android-specific options
  const [display, setDisplay] = useState<'default' | 'spinner' | 'calendar' | 'clock'>('default');
  const [is24Hour, setIs24Hour] = useState(false);

  // iOS-specific options
  const [iosDisplay, setIosDisplay] = useState<'default' | 'spinner' | 'compact' | 'inline'>('default');

  const androidDisplayOptions: Array<'default' | 'spinner' | 'calendar' | 'clock'> = [
    'default',
    'spinner',
    'calendar',
    'clock',
  ];

  const iosDisplayOptions: Array<'default' | 'spinner' | 'compact' | 'inline'> = [
    'default',
    'spinner',
    'compact',
    'inline',
  ];

  const modeOptions: Array<'date' | 'time' | 'datetime'> = ['date', 'time', 'datetime'];

  const onChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }

    if (event.type === 'set' && selectedDate) {
      setDate(selectedDate);
    }
  };

  const displayOptions = Platform.OS === 'ios' ? iosDisplayOptions : androidDisplayOptions;
  const currentDisplay = Platform.OS === 'ios' ? iosDisplay : display;

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-6 py-4 bg-white border-b border-gray-200">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-800">
          DatePicker Examples
        </Text>
      </View>

      <ScrollView className="flex-1">
        <View className="p-6">
          {/* Current Date Display */}
          <View className="bg-white rounded-lg p-4 mb-6 border border-gray-200">
            <Text className="text-sm text-gray-600 mb-1">Selected Date & Time:</Text>
            <Text className="text-lg font-bold text-gray-800">
              {date.toLocaleString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>

          {/* Platform Info */}
          <View className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-200">
            <Text className="text-sm font-semibold text-blue-800 mb-1">
              Platform: {Platform.OS}
            </Text>
            <Text className="text-xs text-blue-600">
              {Platform.OS === 'ios'
                ? 'iOS has different display options than Android'
                : 'Android has different display options than iOS'}
            </Text>
          </View>

          {/* Mode Selection */}
          <View className="mb-6">
            <Text className="text-base font-semibold text-gray-700 mb-3">
              Mode
            </Text>
            <View className="flex-row gap-2">
              {modeOptions.map((m) => (
                <TouchableOpacity
                  key={m}
                  onPress={() => setMode(m)}
                  className={`flex-1 px-4 py-3 rounded-lg border ${
                    mode === m
                      ? 'bg-primary border-primary'
                      : 'bg-white border-gray-300'
                  }`}
                >
                  <Text
                    className={`text-center font-semibold ${
                      mode === m ? 'text-white' : 'text-gray-700'
                    }`}
                  >
                    {m}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Display Selection */}
          <View className="mb-6">
            <Text className="text-base font-semibold text-gray-700 mb-3">
              Display Style ({Platform.OS})
            </Text>
            <View className="gap-2">
              {displayOptions.map((d) => (
                <TouchableOpacity
                  key={d}
                  onPress={() => {
                    if (Platform.OS === 'ios') {
                      setIosDisplay(d as any);
                    } else {
                      setDisplay(d as any);
                    }
                  }}
                  className={`px-4 py-3 rounded-lg border ${
                    currentDisplay === d
                      ? 'bg-primary border-primary'
                      : 'bg-white border-gray-300'
                  }`}
                >
                  <Text
                    className={`font-semibold ${
                      currentDisplay === d ? 'text-white' : 'text-gray-700'
                    }`}
                  >
                    {d}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 24-Hour Toggle (Time mode only) */}
          {mode !== 'date' && (
            <View className="mb-6">
              <View className="flex-row items-center justify-between bg-white rounded-lg p-4 border border-gray-200">
                <View className="flex-1 mr-4">
                  <Text className="text-base font-semibold text-gray-700 mb-1">
                    24-Hour Format
                  </Text>
                  <Text className="text-xs text-gray-500">
                    Display time in 24-hour format
                  </Text>
                </View>
                <Switch
                  value={is24Hour}
                  onValueChange={setIs24Hour}
                  trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                  thumbColor={is24Hour ? '#2563eb' : '#f3f4f6'}
                />
              </View>
            </View>
          )}

          {/* Show Picker Button */}
          <TouchableOpacity
            onPress={() => setShowPicker(true)}
            className="bg-primary px-6 py-4 rounded-lg mb-6"
          >
            <Text className="text-white text-center font-semibold text-base">
              Show {mode.charAt(0).toUpperCase() + mode.slice(1)} Picker
            </Text>
          </TouchableOpacity>

          {/* Instructions */}
          <View className="bg-gray-100 rounded-lg p-4 border border-gray-200">
            <Text className="text-sm font-semibold text-gray-700 mb-2">
              Instructions:
            </Text>
            <Text className="text-xs text-gray-600 mb-1">
              1. Select a mode (date, time, or datetime)
            </Text>
            <Text className="text-xs text-gray-600 mb-1">
              2. Choose a display style
            </Text>
            <Text className="text-xs text-gray-600 mb-1">
              3. Click "Show Picker" to see the result
            </Text>
            <Text className="text-xs text-gray-600 mt-3">
              Note: On iOS, "inline" display will show the picker directly below.
              Other modes show a modal/popup.
            </Text>
          </View>

          {/* Inline Display for iOS */}
          {Platform.OS === 'ios' && iosDisplay === 'inline' && showPicker && (
            <View className="mt-6">
              <DateTimePicker
                value={date}
                mode={mode}
                display={iosDisplay}
                onChange={onChange}
                is24Hour={is24Hour}
              />
            </View>
          )}
        </View>
      </ScrollView>

      {/* DateTimePicker Modal (Android or iOS non-inline modes) */}
      {showPicker && (Platform.OS === 'android' || iosDisplay !== 'inline') && (
        <DateTimePicker
          value={date}
          mode={mode}
          display={Platform.OS === 'ios' ? iosDisplay : display}
          onChange={onChange}
          is24Hour={is24Hour}
        />
      )}
    </SafeAreaView>
  );
}
