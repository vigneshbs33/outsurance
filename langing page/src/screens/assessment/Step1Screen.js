import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Step1Screen({ navigation, route }) {
  const initialName = route.params?.fullName || 'John Doe';
  const [fullName, setFullName] = useState(initialName);
  const [age, setAge] = useState('35');
  const [gender, setGender] = useState('Male');
  const [city, setCity] = useState('Bangalore');
  const [incomeLakh, setIncomeLakh] = useState('8');
  const [budget, setBudget] = useState('1000');
  const [coverageFor, setCoverageFor] = useState('Individual');
  const [familyMembers, setFamilyMembers] = useState('3');

  function handleNext() {
    const assessmentDraft = {
      fullName,
      age: parseInt(age) || 35,
      gender,
      city,
      income_lakh: parseFloat(incomeLakh) || 8,
      monthly_budget: parseFloat(budget) || 1000,
      coverage_for: coverageFor,
      family_members: coverageFor === 'Family' ? parseInt(familyMembers) || 3 : 1,
    };
    navigation.navigate('Step2', { assessmentDraft });
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F4F6F4]">
      {/* Progress Bar */}
      <View className="px-6 py-4 flex-row items-center">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
          <Text className="text-[#1B5E20] text-lg font-bold">←</Text>
        </TouchableOpacity>
        <View className="flex-1 h-2 bg-[#E0E0E0] rounded-full overflow-hidden">
          <View className="w-1/5 h-full bg-[#4CAF50]" />
        </View>
        <Text className="ml-4 text-[#757575] font-bold">1 / 5</Text>
      </View>

      <ScrollView className="flex-1 px-6 pt-2 pb-24">
        <Text className="text-2xl font-bold text-[#1B5E20] mb-6">Personal Details</Text>
        
        <Text className="text-[#757575] mb-2 ml-1">Full Name</Text>
        <TextInput 
          className="bg-white border border-[#E0E0E0] rounded-xl px-4 py-3 mb-4 text-[#212121]"
          value={fullName} onChangeText={setFullName}
        />

        <View className="flex-row justify-between mb-4">
          <View className="flex-1 mr-2">
            <Text className="text-[#757575] mb-2 ml-1">Age</Text>
            <TextInput 
              className="bg-white border border-[#E0E0E0] rounded-xl px-4 py-3 text-[#212121]"
              value={age} onChangeText={setAge} keyboardType="numeric"
            />
          </View>
          <View className="flex-1 ml-2">
            <Text className="text-[#757575] mb-2 ml-1">City</Text>
            <TextInput 
              className="bg-white border border-[#E0E0E0] rounded-xl px-4 py-3 text-[#212121]"
              value={city} onChangeText={setCity}
            />
          </View>
        </View>

        <Text className="text-[#757575] mb-2 ml-1">Gender</Text>
        <View className="flex-row mb-4">
          {['Male', 'Female', 'Other'].map(g => (
            <TouchableOpacity 
              key={g}
              onPress={() => setGender(g)}
              className={`flex-1 py-3 border border-[#E0E0E0] items-center ${gender === g ? 'bg-[#E8F5E9] border-[#4CAF50]' : 'bg-white'} ${g === 'Male' ? 'rounded-l-xl' : ''} ${g === 'Other' ? 'rounded-r-xl' : ''}`}
            >
              <Text className={`${gender === g ? 'text-[#1B5E20] font-bold' : 'text-[#757575]'}`}>{g}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text className="text-[#757575] mb-2 ml-1">Coverage For</Text>
        <View className="flex-row mb-4">
          {['Individual', 'Family'].map(c => (
            <TouchableOpacity 
              key={c}
              onPress={() => setCoverageFor(c)}
              className={`flex-1 py-3 border border-[#E0E0E0] items-center ${coverageFor === c ? 'bg-[#E8F5E9] border-[#4CAF50]' : 'bg-white'} ${c === 'Individual' ? 'rounded-l-xl' : ''} ${c === 'Family' ? 'rounded-r-xl' : ''}`}
            >
              <Text className={`${coverageFor === c ? 'text-[#1B5E20] font-bold' : 'text-[#757575]'}`}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {coverageFor === 'Family' && (
          <View>
            <Text className="text-[#757575] mb-2 ml-1">Total Family Members (including you)</Text>
            <TextInput 
              className="bg-white border border-[#E0E0E0] rounded-xl px-4 py-3 mb-4 text-[#212121]"
              value={familyMembers} onChangeText={setFamilyMembers} keyboardType="numeric"
            />
          </View>
        )}

        <Text className="text-[#757575] mb-2 ml-1">Annual Income (₹ Lakhs)</Text>
        <TextInput 
          className="bg-white border border-[#E0E0E0] rounded-xl px-4 py-3 mb-4 text-[#212121]"
          value={incomeLakh} onChangeText={setIncomeLakh} keyboardType="numeric"
        />

        <Text className="text-[#757575] mb-2 ml-1">Max Monthly Insurance Budget (₹)</Text>
        <TextInput 
          className="bg-white border border-[#E0E0E0] rounded-xl px-4 py-3 mb-8 text-[#212121]"
          value={budget} onChangeText={setBudget} keyboardType="numeric"
        />
      </ScrollView>

      {/* Sticky Bottom Footer */}
      <View className="absolute bottom-0 left-0 right-0 p-6 bg-[#F4F6F4] border-t border-[#E0E0E0]">
        <TouchableOpacity 
          className="bg-[#1B5E20] py-4 rounded-xl items-center"
          onPress={handleNext}
        >
          <Text className="text-white font-bold text-lg">Next →</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
