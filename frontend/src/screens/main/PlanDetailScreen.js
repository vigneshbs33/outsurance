import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { generateOnDeviceReasoning } from '../../api/onDeviceAI';
import { runStressTest } from '../../api/backend';

export default function PlanDetailScreen({ navigation, route }) {
  const { plan, userProfile } = route.params;
  const [aiReason, setAiReason] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showStressTest, setShowStressTest] = useState(false);
  const [stressScenario, setStressScenario] = useState('icu_5_days');
  const [stressResult, setStressResult] = useState(null);
  const [stressLoading, setStressLoading] = useState(false);

  useEffect(() => {
    async function fetchReason() {
      const reason = await generateOnDeviceReasoning(plan, userProfile);
      setAiReason(reason);
      setLoading(false);
    }
    fetchReason();
  }, []);

  async function handleStressTest() {
    setStressLoading(true);
    try {
      const res = await runStressTest(plan.id, stressScenario);
      setStressResult(res);
    } catch (e) {
      console.warn("Stress test failed", e);
    } finally {
      setStressLoading(false);
    }
  }

  // Handle scenario change
  useEffect(() => {
    if (showStressTest) handleStressTest();
  }, [stressScenario]);

  return (
    <SafeAreaView className="flex-1 bg-[#F4F6F4]">
      {/* Header */}
      <View className="px-4 py-4 bg-white border-b border-[#E0E0E0] flex-row items-center">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4 p-2">
          <Text className="text-[#1B5E20] text-lg font-bold">←</Text>
        </TouchableOpacity>
        <View>
          <Text className="text-[#757575] text-xs uppercase">{plan.insurer}</Text>
          <Text className="text-[#1B5E20] font-bold text-lg">{plan.name}</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-6 py-6">
        
        {/* Match Score */}
        <View className="bg-white rounded-3xl p-6 mb-6 shadow-sm border border-[#E0E0E0] items-center">
          <Text className="text-[#757575] font-bold mb-2 uppercase">Outsurance Match Score</Text>
          <View className="w-20 h-20 bg-[#E8F5E9] rounded-full justify-center items-center border-4 border-[#4CAF50] mb-2">
            <Text className="text-[#1B5E20] font-bold text-3xl">{plan.suitability_score}</Text>
          </View>
          <Text className="text-[#4CAF50] font-bold text-lg">Excellent Match</Text>
        </View>

        {/* AI Explanation Box */}
        <View className="bg-[#E8F5E9] rounded-2xl p-5 mb-6 border border-[#A5D6A7]">
          <View className="flex-row items-center mb-3">
            <Text className="text-xl mr-2">✨</Text>
            <Text className="text-[#1B5E20] font-bold">Why this fits your profile</Text>
          </View>
          {loading ? (
            <View className="py-4 items-center flex-row">
              <ActivityIndicator color="#1B5E20" size="small" />
              <Text className="ml-3 text-[#1B5E20]">Agent is reading policy details...</Text>
            </View>
          ) : (
            <Text className="text-[#212121] leading-6 text-base">{aiReason}</Text>
          )}
        </View>

        {/* Action Buttons */}
        <View className="flex-row mb-6">
          <TouchableOpacity 
            className="flex-1 bg-[#F9A825] py-3 rounded-xl items-center flex-row justify-center mr-2 shadow-sm"
            onPress={() => {
              setShowStressTest(true);
              handleStressTest();
            }}
          >
            <Text className="text-white font-bold text-lg mr-2">🧪</Text>
            <Text className="text-white font-bold">Stress Test Simulator</Text>
          </TouchableOpacity>
        </View>

        {/* Plan Details grid */}
        <Text className="text-xl font-bold text-[#1B5E20] mb-4">Plan Details</Text>
        
        <View className="flex-row flex-wrap justify-between mb-2">
          <View className="bg-white p-4 rounded-2xl w-[48%] mb-4 border border-[#E0E0E0]">
            <Text className="text-[#757575] text-xs mb-1">Coverage Amount</Text>
            <Text className="text-[#212121] font-bold text-lg">₹{(plan.coverage / 100000).toFixed(1)}L</Text>
          </View>
          <View className="bg-white p-4 rounded-2xl w-[48%] mb-4 border border-[#E0E0E0]">
            <Text className="text-[#757575] text-xs mb-1">Annual Premium</Text>
            <Text className="text-[#212121] font-bold text-lg">₹{plan.annual_premium.toLocaleString()}</Text>
          </View>
          <View className="bg-white p-4 rounded-2xl w-[48%] mb-4 border border-[#E0E0E0]">
            <Text className="text-[#757575] text-xs mb-1">Room Rent Limit</Text>
            <Text className="text-[#212121] font-bold">{plan.room_rent_limit || "Single Private"}</Text>
          </View>
          <View className="bg-white p-4 rounded-2xl w-[48%] mb-4 border border-[#E0E0E0]">
            <Text className="text-[#757575] text-xs mb-1">Co-payment</Text>
            <Text className="text-[#212121] font-bold">{plan.copayment_pct || 0}%</Text>
          </View>
        </View>

        {/* Premium Breakdown */}
        {plan.premium_breakdown && (
          <View className="bg-white rounded-2xl p-5 mb-4 border border-[#E0E0E0]">
            <Text className="text-[#212121] font-bold mb-3">Premium Breakdown (1 Year)</Text>
            <View className="flex-row justify-between mb-2">
              <Text className="text-[#757575]">Base Premium</Text>
              <Text className="text-[#212121]">₹{plan.premium_breakdown.base.toLocaleString()}</Text>
            </View>
            <View className="flex-row justify-between mb-2 pb-2 border-b border-[#F4F6F4]">
              <Text className="text-[#757575]">GST (18%)</Text>
              <Text className="text-[#212121]">₹{plan.premium_breakdown.gst.toLocaleString()}</Text>
            </View>
            <View className="flex-row justify-between pt-1">
              <Text className="text-[#212121] font-bold">Total Payable</Text>
              <Text className="text-[#1B5E20] font-bold text-lg">₹{plan.premium_breakdown.total.toLocaleString()}</Text>
            </View>
          </View>
        )}

        {/* Highlights */}
        {plan.coverage_highlights && plan.coverage_highlights.length > 0 && (
          <View className="bg-white rounded-2xl p-5 mb-4 border border-[#E0E0E0]">
            <Text className="text-[#212121] font-bold mb-3">Key Highlights</Text>
            {plan.coverage_highlights.map((h, i) => (
              <View key={i} className="flex-row items-start mb-2">
                <Text className="text-[#4CAF50] mr-2">✓</Text>
                <Text className="text-[#212121] flex-1">{h}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Exclusions */}
        {plan.exclusions && plan.exclusions.length > 0 && (
          <View className="bg-white rounded-2xl p-5 mb-4 border border-[#E0E0E0]">
            <Text className="text-[#212121] font-bold mb-3">Important Exclusions</Text>
            {plan.exclusions.map((e, i) => (
              <View key={i} className="flex-row items-start mb-2">
                <Text className="text-[#E64A19] mr-2">✗</Text>
                <Text className="text-[#212121] flex-1">{e}</Text>
              </View>
            ))}
          </View>
        )}

        <View className="bg-white rounded-2xl p-5 mb-24 border border-[#E0E0E0]">
          <Text className="text-[#212121] font-bold mb-3">Pre-existing Conditions</Text>
          <View className="flex-row items-center justify-between py-2 border-b border-[#F4F6F4]">
            <Text className="text-[#757575]">Waiting Period</Text>
            <Text className="text-[#212121] font-bold">{plan.pre_existing_wait_years} Years</Text>
          </View>
          <View className="flex-row items-center justify-between py-2">
            <Text className="text-[#757575]">Day 1 Diabetes Cover</Text>
            <Text className={plan.diabetes_day1 ? "text-[#4CAF50] font-bold" : "text-[#E64A19] font-bold"}>
              {plan.diabetes_day1 ? "Included" : "Not Included"}
            </Text>
          </View>
        </View>

        {/* Trust Indicators */}
        <View className="bg-white rounded-2xl p-5 mb-24 border border-[#E0E0E0]">
          <Text className="text-[#212121] font-bold mb-3">Trust Indicators</Text>
          <View className="flex-row items-center justify-between py-2 border-b border-[#F4F6F4]">
            <Text className="text-[#757575]">Claim Settlement Ratio</Text>
            <View className="flex-row items-center">
              <Text className="text-[#212121] font-bold mr-2">{plan.claim_settlement_ratio || 90}%</Text>
              <View className="w-16 h-2 bg-[#E0E0E0] rounded-full overflow-hidden">
                <View className={`h-full ${(plan.claim_settlement_ratio || 90) >= 95 ? 'bg-[#4CAF50]' : 'bg-[#F9A825]'}`} style={{ width: `${plan.claim_settlement_ratio || 90}%` }} />
              </View>
            </View>
          </View>
          <View className="flex-row items-center justify-between py-2">
            <Text className="text-[#757575]">Hospital Network</Text>
            <Text className="text-[#212121] font-bold">{(plan.hospital_network_count || 5000).toLocaleString()}+</Text>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Buy Button */}
      <View className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-[#E0E0E0] flex-row justify-between items-center">
        <View>
          <Text className="text-[#757575] text-xs">Total Premium</Text>
          <Text className="text-[#1B5E20] font-bold text-2xl">₹{plan.annual_premium.toLocaleString()}</Text>
        </View>
        <TouchableOpacity className="bg-[#1B5E20] py-4 px-8 rounded-xl items-center shadow-sm">
          <Text className="text-white font-bold text-lg">Buy Now</Text>
        </TouchableOpacity>
      </View>

      {/* Stress Test Modal */}
      <Modal visible={showStressTest} animationType="slide" transparent={true}>
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-[#F4F6F4] rounded-t-3xl pt-6 pb-10 px-6 h-[80%]">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-bold text-[#212121]">🧪 Stress Test Simulator</Text>
              <TouchableOpacity onPress={() => setShowStressTest(false)}>
                <View className="w-8 h-8 bg-[#E0E0E0] rounded-full items-center justify-center">
                  <Text className="text-[#757575] font-bold">✕</Text>
                </View>
              </TouchableOpacity>
            </View>
            
            <Text className="text-[#757575] mb-4">Select a medical emergency to see how this plan performs:</Text>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6 max-h-12 min-h-[48px]">
              {[
                { id: 'icu_5_days', icon: '🏥', label: '5-Day ICU' },
                { id: 'cardiac_event', icon: '🫀', label: 'Cardiac Event' },
                { id: 'knee_replacement', icon: '🦵', label: 'Knee Replace' },
                { id: 'appendix_surgery', icon: '🩻', label: 'Appendix' },
                { id: 'diabetic_emergency', icon: '🩸', label: 'Diabetic ER' },
              ].map(s => (
                <TouchableOpacity 
                  key={s.id}
                  onPress={() => setStressScenario(s.id)}
                  className={`mr-3 px-4 py-2 rounded-full border flex-row items-center h-10 ${stressScenario === s.id ? 'bg-[#1B5E20] border-[#1B5E20]' : 'bg-white border-[#E0E0E0]'}`}
                >
                  <Text className="mr-2">{s.icon}</Text>
                  <Text className={`font-bold ${stressScenario === s.id ? 'text-white' : 'text-[#757575]'}`}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {stressLoading || !stressResult ? (
              <View className="bg-white p-8 rounded-3xl items-center justify-center border border-[#E0E0E0] min-h-[250px]">
                <ActivityIndicator size="large" color="#1B5E20" />
                <Text className="mt-4 text-[#757575]">Simulating hospital bill...</Text>
              </View>
            ) : (
              <View className="bg-white p-6 rounded-3xl border border-[#E0E0E0] shadow-sm">
                <View className="flex-row items-center mb-6">
                  <Text className="text-4xl mr-4">{stressResult.icon}</Text>
                  <View>
                    <Text className="text-[#757575] uppercase text-xs font-bold">Scenario</Text>
                    <Text className="text-[#212121] font-bold text-xl">{stressResult.scenario_name}</Text>
                  </View>
                </View>
                
                <View className="flex-row justify-between mb-4 pb-4 border-b border-[#F4F6F4]">
                  <Text className="text-[#757575] text-lg">Total Hospital Bill</Text>
                  <Text className="text-[#212121] font-bold text-lg">₹{stressResult.total_cost.toLocaleString()}</Text>
                </View>
                
                <View className="flex-row justify-between mb-6">
                  <Text className="text-[#757575] text-lg">Plan Covers</Text>
                  <Text className="text-[#4CAF50] font-bold text-lg">₹{stressResult.plan_covers.toLocaleString()}</Text>
                </View>
                
                <View className={`p-4 rounded-2xl items-center mb-4 ${stressResult.color === 'green' ? 'bg-[#E8F5E9]' : stressResult.color === 'orange' ? 'bg-[#FFF3E0]' : 'bg-[#FFEBEE]'}`}>
                  <Text className={`text-sm mb-1 ${stressResult.color === 'green' ? 'text-[#1B5E20]' : stressResult.color === 'orange' ? 'text-[#E65100]' : 'text-[#B71C1C]'}`}>
                    You Pay Out-of-Pocket
                  </Text>
                  <Text className={`text-3xl font-bold ${stressResult.color === 'green' ? 'text-[#1B5E20]' : stressResult.color === 'orange' ? 'text-[#E65100]' : 'text-[#B71C1C]'}`}>
                    ₹{stressResult.out_of_pocket.toLocaleString()}
                  </Text>
                </View>

                {stressResult.color === 'red' && (
                  <View className="bg-[#FFEBEE] p-3 rounded-xl border border-[#FFCDD2] flex-row items-center">
                    <Text className="mr-2">⚠️</Text>
                    <Text className="text-[#B71C1C] flex-1 text-xs">This plan leaves you exposed to high costs for major events. Consider a plan with higher coverage.</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
