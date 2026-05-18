import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function DashboardScreen({ navigation, route }) {
  const result = route.params?.assessmentResult;
  const initialProfile = route.params?.userProfile;

  const [profile, setProfile] = useState(initialProfile);
  const [plans, setPlans] = useState(result?.recommended_plans || []);
  const [riskData] = useState(result?.risk_assessment || null);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'agent', text: "I've matched these plans to your profile. Have questions like 'What if I want higher coverage?' or 'How does my diabetes affect this?'" }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [simulatedBudget, setSimulatedBudget] = useState(initialProfile?.monthly_budget || 5000);
  const [isSimulating, setIsSimulating] = useState(false);
  const scrollViewRef = useRef();

  if (!result) {
    return (
      <SafeAreaView className="flex-1 bg-[#F4F6F4] p-6 justify-center items-center">
        <Text className="text-2xl font-bold text-[#1B5E20] mb-4">No Health Profile</Text>
        <Text className="text-[#757575] text-center mb-8">Complete the health assessment to get personalized insurance recommendations.</Text>
        <TouchableOpacity 
          className="bg-[#4CAF50] py-4 px-8 rounded-xl items-center"
          onPress={() => navigation.navigate('Assessment')}
        >
          <Text className="text-white font-bold text-lg">Start Assessment</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const handleSendChat = async () => {
    if (!inputText.trim()) return;
    const userText = inputText;
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setInputText('');
    setIsTyping(true);

    try {
      const BACKEND_URL = Platform.OS === 'android' ? 'http://10.0.2.2:8000/api' : 'http://localhost:8000/api';
      const payload = {
        messages: messages.map(m => ({ role: m.role === 'agent' ? 'assistant' : 'user', content: m.text })).concat([{ role: 'user', content: userText }]),
        user_vitals: profile
      };
      const response = await fetch(`${BACKEND_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      setMessages(prev => [...prev, { role: 'agent', text: data.response }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'agent', text: "I'm having trouble connecting right now. Generally, higher coverage increases premiums while protecting against major surgeries." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSimulateBudget = async (newBudget) => {
    setSimulatedBudget(newBudget);
    setIsSimulating(true);
    try {
      const BACKEND_URL = Platform.OS === 'android' ? 'http://10.0.2.2:8000/api' : 'http://localhost:8000/api';
      const updatedProfile = { ...profile, monthly_budget: newBudget };
      setProfile(updatedProfile);
      
      const response = await fetch(`${BACKEND_URL}/assess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProfile)
      });
      const data = await response.json();
      setPlans(data.recommended_plans);
    } catch (e) {
      console.warn("Simulation failed", e);
    } finally {
      setIsSimulating(false);
    }
  };

  // Risk tier colour coding
  const tierColors = {
    Low:      { bg: '#E8F5E9', text: '#1B5E20', badge: '#4CAF50' },
    Medium:   { bg: '#FFF9C4', text: '#E65100', badge: '#F9A825' },
    High:     { bg: '#FBE9E7', text: '#BF360C', badge: '#E64A19' },
    Critical: { bg: '#FFEBEE', text: '#7F0000', badge: '#B71C1C' },
  };
  const tc = tierColors[riskData?.risk_tier] || tierColors.Medium;

  return (
    <SafeAreaView className="flex-1 bg-[#F4F6F4]">
      {/* Header */}
      <View className="px-6 py-4 bg-white border-b border-[#E0E0E0] flex-row justify-between items-center">
        <View>
          <Text className="text-[#757575]">Welcome back,</Text>
          <Text className="text-[#1B5E20] text-xl font-bold">{profile?.fullName || "User"}</Text>
        </View>
        <View className="flex-row items-center">
            <TouchableOpacity onPress={() => navigation.navigate('PlanExplorer', { plans: plans })} className="bg-[#E8F5E9] px-3 py-2 rounded-lg mr-2">
                <Text className="text-[#1B5E20] font-bold">Compare All</Text>
            </TouchableOpacity>
            <View className="w-10 h-10 bg-[#E0E0E0] rounded-full" />
        </View>
      </View>

      <ScrollView className="flex-1 p-6 z-0">
        {/* Risk Assessment Card */}
        {riskData && (
          <View className="rounded-3xl p-5 mb-5 border" style={{ backgroundColor: tc.bg, borderColor: tc.badge }}>
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-xs font-bold uppercase" style={{ color: tc.text }}>XGBoost Risk Assessment</Text>
              <View className="px-3 py-1 rounded-full" style={{ backgroundColor: tc.badge }}>
                <Text className="text-white font-bold text-xs">{riskData.risk_tier?.toUpperCase()} RISK</Text>
              </View>
            </View>
            <Text className="text-3xl font-bold mb-1" style={{ color: tc.text }}>
              {Math.round(riskData.risk_score * 100)}<Text className="text-lg"> / 100</Text>
            </Text>
            {riskData.feature_importance_explanation && (
              <View className="mt-3">
                <Text className="text-xs font-bold mb-2" style={{ color: tc.text }}>Top Risk Drivers:</Text>
                {Object.entries(riskData.feature_importance_explanation).slice(0, 4).map(([feat, val], i) => (
                  <View key={i} className="flex-row items-center mb-1">
                    <Text className="text-xs w-40" style={{ color: tc.text }}>{feat}</Text>
                    <View className="flex-1 bg-white rounded-full h-2 overflow-hidden">
                      <View className="h-2 rounded-full" style={{ width: `${Math.round(val * 100)}%`, backgroundColor: tc.badge }} />
                    </View>
                    <Text className="text-xs ml-2" style={{ color: tc.text }}>{(val * 100).toFixed(0)}%</Text>
                  </View>
                ))}
              </View>
              <View className="mt-3 border-t border-black/10 pt-3 flex-row justify-between items-center">
                <Text className="text-xs" style={{ color: tc.text }}>Model Confidence</Text>
                <Text className="text-sm font-bold" style={{ color: tc.text }}>{riskData.confidence_pct || 90}%</Text>
              </View>
            )}
          </View>
        )}

        {/* Affordability Simulator */}
        <View className="bg-white rounded-3xl p-5 mb-5 border border-[#E0E0E0] shadow-sm">
          <Text className="text-[#212121] font-bold mb-1">Affordability Simulator</Text>
          <Text className="text-[#757575] text-xs mb-4">Adjust your monthly budget to see different plans</Text>
          <View className="flex-row items-center justify-between bg-[#F4F6F4] rounded-2xl p-2">
            <TouchableOpacity 
              onPress={() => handleSimulateBudget(Math.max(1000, simulatedBudget - 1000))}
              className="w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm"
            >
              <Text className="text-[#1B5E20] font-bold text-xl">-</Text>
            </TouchableOpacity>
            <View className="items-center">
              <Text className="text-[#1B5E20] font-bold text-xl">₹{simulatedBudget.toLocaleString()}</Text>
              <Text className="text-[#757575] text-xs">/month</Text>
            </View>
            <TouchableOpacity 
              onPress={() => handleSimulateBudget(Math.min(20000, simulatedBudget + 1000))}
              className="w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm"
            >
              <Text className="text-[#1B5E20] font-bold text-xl">+</Text>
            </TouchableOpacity>
          </View>
          {isSimulating && <ActivityIndicator size="small" color="#1B5E20" className="mt-3" />}
        </View>

        <Text className="text-xl font-bold text-[#1B5E20] mb-2">Top Matches for Your Profile</Text>
        <Text className="text-[#757575] mb-5 text-sm leading-5">Scored by 3-stage ML: XGBoost risk → weighted suitability → cosine similarity blend.</Text>
        
        {plans.map((plan, index) => (
          <TouchableOpacity 
            key={index}
            className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-[#E0E0E0]"
            onPress={() => navigation.navigate('PlanDetail', { plan, userProfile: profile })}
          >
            <View className="flex-row justify-between items-start mb-3">
              <View className="flex-1 pr-2">
                <Text className="text-[#757575] text-xs font-bold mb-1 uppercase">{plan.insurer}</Text>
                <Text className="text-[#212121] font-bold text-lg leading-6">{plan.name}</Text>
              </View>
              <View className="bg-[#E8F5E9] w-14 h-14 rounded-full items-center justify-center border border-[#A5D6A7]">
                <Text className="text-[#1B5E20] font-bold text-lg">{plan.suitability_score}</Text>
                <Text className="text-[#1B5E20] text-[10px]">Match</Text>
              </View>
            </View>

            <View className="flex-row mb-4">
              <View className="mr-6">
                <Text className="text-[#757575] text-xs">Coverage</Text>
                <Text className="text-[#212121] font-bold">₹{(plan.coverage / 100000).toFixed(1)}L</Text>
              </View>
              <View>
                <Text className="text-[#757575] text-xs">Premium/yr</Text>
                <Text className="text-[#1B5E20] font-bold">₹{plan.annual_premium.toLocaleString()}</Text>
              </View>
            </View>

            {plan.plain_english_explanation && (
               <View className="bg-[#F9FBE7] p-3 rounded-lg mb-3">
                   <Text className="text-[#558B2F] text-sm">✨ {plan.plain_english_explanation}</Text>
               </View>
            )}

            {/* Badges */}
            <View className="flex-row flex-wrap">
              {plan.diabetes_day1 && (
                <View className="bg-[#E8F5E9] px-2 py-1 rounded-md mr-2 mb-2">
                  <Text className="text-[#1B5E20] text-xs font-bold">Day 1 Diabetes Cover</Text>
                </View>
              )}
              {plan.pre_existing_wait_years > 0 ? (
                <View className="bg-[#FFF9C4] px-2 py-1 rounded-md mr-2 mb-2">
                  <Text className="text-[#F9A825] text-xs font-bold">{plan.pre_existing_wait_years}yr Wait</Text>
                </View>
              ) : (
                <View className="bg-[#E8F5E9] px-2 py-1 rounded-md mr-2 mb-2">
                  <Text className="text-[#1B5E20] text-xs font-bold">No Wait Period</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}

        <View className="h-40" />
      </ScrollView>

      {/* Floating Chat Agent */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-lg border border-[#E0E0E0] z-50 ${chatOpen ? 'h-[60%]' : 'h-24'}`}
      >
        <TouchableOpacity 
            className="items-center py-2 border-b border-[#E0E0E0]"
            onPress={() => setChatOpen(!chatOpen)}
        >
            <View className="w-12 h-1 bg-[#BDBDBD] rounded-full mb-1" />
            <Text className="text-[#1B5E20] font-bold">✨ Ask Health Agent</Text>
        </TouchableOpacity>

        {chatOpen ? (
            <View className="flex-1 flex-col">
                <ScrollView 
                    className="flex-1 px-4 py-2"
                    ref={scrollViewRef}
                    onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                >
                    {messages.map((msg, idx) => (
                        <View 
                            key={idx} 
                            className={`mb-3 max-w-[85%] rounded-2xl p-3 ${msg.role === 'agent' ? 'bg-[#E8F5E9] self-start rounded-tl-sm' : 'bg-[#1B5E20] self-end rounded-tr-sm'}`}
                        >
                            <Text className={`${msg.role === 'agent' ? 'text-[#212121]' : 'text-white'} text-sm`}>
                                {msg.text}
                            </Text>
                        </View>
                    ))}
                    {isTyping && (
                        <View className="bg-[#E8F5E9] self-start rounded-2xl rounded-tl-sm p-3 mb-3">
                            <ActivityIndicator color="#1B5E20" size="small" />
                        </View>
                    )}
                </ScrollView>
                <View className="flex-row items-center px-4 py-3 border-t border-[#E0E0E0]">
                    <TextInput 
                        className="flex-1 bg-[#F4F6F4] rounded-full px-4 py-3 text-[#212121]"
                        placeholder="Type 'What if I need ₹10L cover?'"
                        value={inputText}
                        onChangeText={setInputText}
                        onSubmitEditing={handleSendChat}
                    />
                    <TouchableOpacity onPress={handleSendChat} className="ml-3 bg-[#1B5E20] w-10 h-10 rounded-full items-center justify-center">
                        <Text className="text-white font-bold">➤</Text>
                    </TouchableOpacity>
                </View>
            </View>
        ) : (
            <TouchableOpacity 
                className="flex-1 px-4 justify-center"
                onPress={() => setChatOpen(true)}
            >
                <Text className="text-[#757575] bg-[#F4F6F4] p-3 rounded-full text-center">Tap to ask questions about these plans...</Text>
            </TouchableOpacity>
        )}
      </KeyboardAvoidingView>

    </SafeAreaView>
  );
}
