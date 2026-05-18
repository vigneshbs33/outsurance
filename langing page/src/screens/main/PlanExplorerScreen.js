import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchAllPlans } from '../../api/backend';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PLAN_TYPES = ['All', 'basic', 'standard', 'comprehensive', 'senior'];

export default function PlanExplorerScreen({ navigation }) {
  const [plans, setPlans] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeType, setActiveType] = useState('All');
  const [compareSelection, setCompareSelection] = useState([]);

  function toggleCompare(plan) {
    if (compareSelection.find(p => p.id === plan.id)) {
      setCompareSelection(compareSelection.filter(p => p.id !== plan.id));
    } else {
      if (compareSelection.length < 3) {
        setCompareSelection([...compareSelection, plan]);
      } else {
        alert("You can only compare up to 3 plans at once.");
      }
    }
  }

  const loadPlans = useCallback(async () => {
    try {
      // Try cache first (hackathon reliability)
      const cached = await AsyncStorage.getItem('outsurance_plans');
      if (cached) {
        const parsed = JSON.parse(cached);
        setPlans(parsed);
        applyFilters(parsed, search, activeType);
      }
      // Always try fresh fetch
      const fresh = await fetchAllPlans();
      await AsyncStorage.setItem('outsurance_plans', JSON.stringify(fresh));
      setPlans(fresh);
      applyFilters(fresh, search, activeType);
    } catch (err) {
      console.warn('Plans load failed:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadPlans(); }, []);

  function applyFilters(source, q, type) {
    let result = source;
    if (type !== 'All') result = result.filter(p => p.type === type);
    if (q.trim()) {
      const lower = q.toLowerCase();
      result = result.filter(p =>
        p.name?.toLowerCase().includes(lower) ||
        p.insurer?.toLowerCase().includes(lower)
      );
    }
    setFiltered(result);
  }

  useEffect(() => { applyFilters(plans, search, activeType); }, [search, activeType]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#F4F6F4] justify-center items-center">
        <ActivityIndicator size="large" color="#1B5E20" />
        <Text className="text-[#757575] mt-4">Loading plans…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F4F6F4]">
      {/* Header */}
      <View className="px-6 pt-4 pb-2 bg-white border-b border-[#E0E0E0]">
        <Text className="text-xl font-bold text-[#1B5E20] mb-3">Explore Plans</Text>
        <TextInput
          className="bg-[#F4F6F4] border border-[#E0E0E0] rounded-xl px-4 py-3 text-[#212121] mb-3"
          placeholder="Search by plan or insurer…"
          value={search}
          onChangeText={setSearch}
        />
        {/* Type filter pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {PLAN_TYPES.map(t => (
            <TouchableOpacity
              key={t}
              onPress={() => setActiveType(t)}
              className={`mr-2 px-4 py-2 rounded-full border ${activeType === t ? 'bg-[#1B5E20] border-[#1B5E20]' : 'bg-white border-[#E0E0E0]'}`}
            >
              <Text className={`font-bold text-sm capitalize ${activeType === t ? 'text-white' : 'text-[#757575]'}`}>{t}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        className="flex-1 px-6 pt-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadPlans(); }} />}
      >
        {filtered.length === 0 ? (
          <View className="items-center mt-16">
            <Text className="text-4xl mb-4">🔍</Text>
            <Text className="text-[#757575] text-center">No plans match your filters.</Text>
          </View>
        ) : (
          filtered.map((plan, i) => (
            <TouchableOpacity
              key={plan.id || i}
              className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-[#E0E0E0]"
              onPress={() => navigation.navigate('PlanDetail', { plan, userProfile: null })}
            >
              <View className="flex-row justify-between items-start mb-2">
                <View className="flex-1 pr-2">
                  <Text className="text-[#757575] text-xs font-bold uppercase mb-1">{plan.insurer}</Text>
                  <Text className="text-[#212121] font-bold text-lg leading-5">{plan.name}</Text>
                </View>
                <View className="flex-row items-center">
                  <TouchableOpacity 
                    className={`mr-2 px-3 py-1 rounded-full border ${compareSelection.find(p => p.id === plan.id) ? 'bg-[#1B5E20] border-[#1B5E20]' : 'bg-white border-[#E0E0E0]'}`}
                    onPress={() => toggleCompare(plan)}
                  >
                    <Text className={`text-xs font-bold ${compareSelection.find(p => p.id === plan.id) ? 'text-white' : 'text-[#757575]'}`}>
                      {compareSelection.find(p => p.id === plan.id) ? '✓ Added' : '+ Compare'}
                    </Text>
                  </TouchableOpacity>
                  <View className="bg-[#E8F5E9] px-3 py-1 rounded-full">
                    <Text className="text-[#1B5E20] font-bold text-xs capitalize">{plan.type}</Text>
                  </View>
                </View>
              </View>

              <View className="flex-row mt-3">
                <View className="mr-6">
                  <Text className="text-[#757575] text-xs">Coverage</Text>
                  <Text className="text-[#212121] font-bold">₹{(plan.coverage / 100000).toFixed(0)}L</Text>
                </View>
                <View className="mr-6">
                  <Text className="text-[#757575] text-xs">Premium/yr</Text>
                  <Text className="text-[#1B5E20] font-bold">₹{plan.annual_premium?.toLocaleString()}</Text>
                </View>
                <View>
                  <Text className="text-[#757575] text-xs">Wait</Text>
                  <Text className="text-[#212121] font-bold">{plan.pre_existing_wait_years}yr</Text>
                </View>
              </View>

              {plan.diabetes_day1 && (
                <View className="mt-3 bg-[#E8F5E9] px-2 py-1 rounded-md self-start">
                  <Text className="text-[#1B5E20] text-xs font-bold">✓ Day 1 Diabetes Cover</Text>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
        <View className="h-20" />
      </ScrollView>

      {compareSelection.length > 0 && (
        <View className="absolute bottom-6 left-6 right-6">
          <TouchableOpacity 
            className="bg-[#1B5E20] py-4 rounded-2xl items-center shadow-lg flex-row justify-center"
            onPress={() => navigation.navigate('Compare', { selectedPlans: compareSelection })}
          >
            <Text className="text-white font-bold text-lg mr-2">Compare {compareSelection.length} Plan{compareSelection.length > 1 ? 's' : ''}</Text>
            <Text className="text-white text-lg">→</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}
