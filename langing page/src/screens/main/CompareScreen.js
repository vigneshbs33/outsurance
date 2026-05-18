import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CompareScreen({ route, navigation }) {
  const { selectedPlans } = route.params;

  if (!selectedPlans || selectedPlans.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-[#F4F6F4] justify-center items-center">
        <Text>No plans selected for comparison.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} className="mt-4 bg-[#1B5E20] px-4 py-2 rounded-full">
          <Text className="text-white">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F4F6F4]">
      {/* Header */}
      <View className="px-6 pt-4 pb-4 bg-white border-b border-[#E0E0E0] flex-row items-center">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
          <Text className="text-[#1B5E20] font-bold text-lg">← Back</Text>
        </TouchableOpacity>
        <Text className="text-xl font-bold text-[#1B5E20]">Compare Plans</Text>
      </View>

      <ScrollView horizontal className="flex-1">
        <View className="flex-row p-4">
          {/* Labels Column */}
          <View className="w-28 mr-2 border-r border-[#E0E0E0] justify-start pt-16">
            <View className="h-16 justify-center"><Text className="text-[#757575] font-bold">Premium / yr</Text></View>
            <View className="h-16 justify-center"><Text className="text-[#757575] font-bold">Coverage</Text></View>
            <View className="h-16 justify-center"><Text className="text-[#757575] font-bold">Plan Type</Text></View>
            <View className="h-16 justify-center"><Text className="text-[#757575] font-bold">Pre-existing Wait</Text></View>
            <View className="h-16 justify-center"><Text className="text-[#757575] font-bold">Diabetes Day 1</Text></View>
            <View className="h-16 justify-center"><Text className="text-[#757575] font-bold">Co-payment</Text></View>
            <View className="h-16 justify-center"><Text className="text-[#757575] font-bold">Room Rent</Text></View>
            <View className="h-24 justify-center"><Text className="text-[#757575] font-bold">Pros</Text></View>
            <View className="h-24 justify-center"><Text className="text-[#757575] font-bold">Exclusions</Text></View>
          </View>

          {/* Plan Columns */}
          {selectedPlans.map((plan, index) => (
            <View key={plan.id || index} className="w-48 bg-white rounded-2xl p-4 mr-4 shadow-sm border border-[#E0E0E0]">
              <View className="h-12 mb-4">
                <Text className="text-[#757575] text-xs font-bold uppercase">{plan.insurer}</Text>
                <Text className="text-[#212121] font-bold text-sm" numberOfLines={2}>{plan.name}</Text>
              </View>
              
              <View className="h-16 justify-center border-t border-[#F4F6F4]">
                <Text className="text-[#1B5E20] font-bold text-lg">₹{plan.annual_premium?.toLocaleString()}</Text>
              </View>
              <View className="h-16 justify-center border-t border-[#F4F6F4]">
                <Text className="text-[#212121] font-bold">₹{(plan.coverage / 100000).toFixed(0)}L</Text>
              </View>
              <View className="h-16 justify-center border-t border-[#F4F6F4]">
                <Text className="text-[#212121] capitalize">{plan.type}</Text>
              </View>
              <View className="h-16 justify-center border-t border-[#F4F6F4]">
                <Text className="text-[#212121] font-bold">{plan.pre_existing_wait_years} years</Text>
              </View>
              <View className="h-16 justify-center border-t border-[#F4F6F4]">
                <Text className={plan.diabetes_day1 ? "text-[#1B5E20] font-bold" : "text-[#757575]"}>
                  {plan.diabetes_day1 ? "✅ Yes" : "❌ No"}
                </Text>
              </View>
              <View className="h-16 justify-center border-t border-[#F4F6F4]">
                <Text className="text-[#212121]">{plan.copayment_pct || 0}%</Text>
              </View>
              <View className="h-16 justify-center border-t border-[#F4F6F4]">
                <Text className="text-[#212121] text-xs">{plan.room_rent_limit || "Single Private"}</Text>
              </View>
              <View className="h-24 justify-start pt-2 border-t border-[#F4F6F4]">
                {plan.pros && plan.pros.slice(0, 2).map((pro, i) => (
                  <Text key={i} className="text-[#212121] text-xs mb-1" numberOfLines={2}>• {pro}</Text>
                ))}
              </View>
              <View className="h-24 justify-start pt-2 border-t border-[#F4F6F4]">
                {plan.exclusions && plan.exclusions.slice(0, 2).map((exc, i) => (
                  <Text key={i} className="text-[#E64A19] text-xs mb-1" numberOfLines={2}>✗ {exc}</Text>
                ))}
              </View>
              
              <TouchableOpacity 
                className="mt-4 bg-[#1B5E20] py-2 rounded-lg items-center"
                onPress={() => navigation.navigate('PlanDetail', { plan, userProfile: null })}
              >
                <Text className="text-white font-bold">View Details</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
