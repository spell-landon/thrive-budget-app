import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { getIncomeSources } from '../services/incomeTemplates';
import { IncomeSource } from '../types';

export default function SelectIncomeSourceScreen({ route, navigation }: any) {
  const { user } = useAuth();
  const { selectedSourceId, onSelect } = route.params;
  const [sources, setSources] = useState<IncomeSource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSources();
  }, []);

  const loadSources = async () => {
    if (!user) return;

    try {
      const data = await getIncomeSources(user.id);
      // Only show active income sources
      setSources(data.filter(s => s.is_active));
    } catch (error: any) {
      console.error('Error loading income sources:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSource = (sourceId: string | null) => {
    if (onSelect) {
      onSelect(sourceId);
    }
    navigation.goBack();
  };

  return (
    <SafeAreaView className='flex-1 bg-gray-50' edges={['bottom']}>
      {loading ? (
        <View className='flex-1 items-center justify-center'>
          <ActivityIndicator size='large' color='#FF6B35' />
        </View>
      ) : (
        <ScrollView className='flex-1'>
          {/* None Option */}
          <TouchableOpacity
            onPress={() => handleSelectSource(null)}
            className={`mx-4 my-2 px-6 py-4 rounded-lg border flex-row items-center ${
              !selectedSourceId
                ? 'bg-primary-50 border-primary'
                : 'bg-white border-gray-200'
            }`}>
            <Ionicons
              name='close-circle-outline'
              size={24}
              color={!selectedSourceId ? '#FF6B35' : '#9ca3af'}
            />
            <Text
              className={`ml-3 text-base ${
                !selectedSourceId
                  ? 'text-primary font-semibold'
                  : 'text-gray-700'
              }`}>
              No Source (Manual)
            </Text>
            {!selectedSourceId && (
              <View className='ml-auto'>
                <Ionicons name='checkmark-circle' size={24} color='#FF6B35' />
              </View>
            )}
          </TouchableOpacity>

          {/* Available Sources */}
          {sources.length === 0 ? (
            <View className='flex-1 items-center justify-center p-6 mt-8'>
              <Ionicons name='cash-outline' size={64} color='#9ca3af' />
              <Text className='text-gray-600 text-center mt-4 text-base'>
                No income sources found. Create income sources in the More menu!
              </Text>
            </View>
          ) : (
            sources.map((source) => (
              <TouchableOpacity
                key={source.id}
                onPress={() => handleSelectSource(source.id)}
                className={`mx-4 my-2 px-6 py-4 rounded-lg border ${
                  selectedSourceId === source.id
                    ? 'bg-primary-50 border-primary'
                    : 'bg-white border-gray-200'
                }`}>
                <View className='flex-row items-center justify-between'>
                  <View className='flex-row items-center flex-1'>
                    <Ionicons
                      name='cash'
                      size={24}
                      color={
                        selectedSourceId === source.id
                          ? '#FF6B35'
                          : '#6b7280'
                      }
                    />
                    <View className='ml-3 flex-1'>
                      <Text
                        className={`text-base ${
                          selectedSourceId === source.id
                            ? 'text-primary font-semibold'
                            : 'text-gray-800'
                        }`}>
                        {source.name}
                      </Text>
                      {source.frequency && (
                        <Text className='text-sm text-gray-500 mt-1 capitalize'>
                          {source.frequency}
                        </Text>
                      )}
                    </View>
                  </View>
                  {selectedSourceId === source.id && (
                    <Ionicons
                      name='checkmark-circle'
                      size={24}
                      color='#FF6B35'
                    />
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
