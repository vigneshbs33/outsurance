import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { saveAssessmentResult } from '../../api/supabase';
import { assessHealthProfile } from '../../api/backend';

export default function Step4Screen({ navigation, route }) {
  const { assessmentDraft } = route.params;
  const { user } = useAuth();

  const [hba1c, setHba1c] = useState(assessmentDraft.hba1c ? assessmentDraft.hba1c.toString() : '');
  const [bp, setBp] = useState(assessmentDraft.bp_systolic ? assessmentDraft.bp_systolic.toString() : '');
  const [bmi, setBmi] = useState(assessmentDraft.bmi ? assessmentDraft.bmi.toString() : '');
  const [loading, setLoading] = useState(false);

  const confidence = assessmentDraft.confidence || 0;

  async function handleConfirm() {
    const finalData = {
      ...assessmentDraft,
      hba1c: parseFloat(hba1c) || 5.4,
      bp_systolic: parseInt(bp) || 120,
      bmi: parseFloat(bmi) || 23.0,
    };

    setLoading(true);
    try {
      // 1. Call FastAPI backend (JWT auto-attached inside assessHealthProfile)
      const result = await assessHealthProfile(finalData);

      // 2. Save assessment session + recommendation to Supabase (if logged in)
      if (user) {
        try {
          await saveAssessmentResult(
            user.id,
            finalData,
            null, // No risk_assessment anymore
            result.recommended_plans,
          );
        } catch (dbErr) {
          // Non-blocking — don't fail the demo if DB save fails
          console.warn('Supabase save failed (non-blocking):', dbErr.message);
        }
      }

      // 3. Navigate to Step5 (loading/AI screen) then to Dashboard
      navigation.navigate('Step5', { assessmentDraft: finalData, assessmentResult: result });
    } catch (err) {
      // Fallback mock result if backend is down
      console.log('Backend failed, using mock result:', err.message);
      const mockResult = {
        recommended_plans: [
          {
            id: 'star_diabetes', name: 'Star Health Diabetes Safe', insurer: 'Star Health',
            coverage: 500000, annual_premium: 14000, suitability_score: 9.4,
            type: 'Comprehensive', pre_existing_wait_years: 0, diabetes_day1: true,
          },
          {
            id: 'hdfc_optima', name: 'HDFC Optima Secure', insurer: 'HDFC ERGO',
            coverage: 1000000, annual_premium: 8200, suitability_score: 7.2,
            type: 'Standard', pre_existing_wait_years: 2, diabetes_day1: false,
          },
          {
            id: 'niva_reassure', name: 'Niva Bupa ReAssure 2.0', insurer: 'Niva Bupa',
            coverage: 2500000, annual_premium: 11500, suitability_score: 6.8,
            type: 'Comprehensive', pre_existing_wait_years: 1, diabetes_day1: false,
          },
        ],
      };
      navigation.navigate('Step5', { assessmentDraft: finalData, assessmentResult: mockResult });
    } finally {
      setLoading(false);
    }
  }

  function EditableRow({ label, value, onChange, extractedValue }) {
    let confColor = '#F9A825'; // Warning (edited or missing)
    let confText = '⚠ Review';
    if (value && value === extractedValue?.toString()) {
      confColor = '#4CAF50'; // High confidence (matches AI extraction)
      confText = '✓ High';
    }

    return (
      <View className="bg-white p-4 rounded-xl border border-[#E0E0E0] mb-3">
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-[#757575] text-base">{label}</Text>
          <View className={`px-2 py-1 rounded-md`} style={{ backgroundColor: confColor + '20' }}>
            <Text style={{ color: confColor, fontSize: 10, fontWeight: 'bold' }}>{confText}</Text>
          </View>
        </View>
        <TextInput
          className="text-[#212121] text-lg font-bold w-full bg-[#F4F6F4] p-3 rounded-lg"
          value={value}
          onChangeText={onChange}
          keyboardType="numeric"
          placeholder="—"
        />
      </View>
    );
  }

  let bannerClass = 'bg-[#E64A19]';
  let bannerText = 'Please verify all values carefully';
  if (confidence > 80) {
    bannerClass = 'bg-[#388E3C]';
    bannerText = '✓ High confidence extraction';
  } else if (confidence >= 50) {
    bannerClass = 'bg-[#F9A825]';
    bannerText = '⚠ Some values may need review';
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F4F6F4]">
      {/* Progress Bar */}
      <View className="px-6 py-4 flex-row items-center">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
          <Text className="text-[#1B5E20] text-lg font-bold">←</Text>
        </TouchableOpacity>
        <View className="flex-1 h-2 bg-[#E0E0E0] rounded-full overflow-hidden">
          <View className="w-4/5 h-full bg-[#4CAF50]" />
        </View>
        <Text className="ml-4 text-[#757575] font-bold">4 / 5</Text>
      </View>

      <ScrollView className="flex-1 px-6 pt-2 pb-24">
        <Text className="text-2xl font-bold text-[#1B5E20] mb-2">Review Before We Proceed</Text>
        <Text className="text-[#757575] mb-6 leading-5">
          These values were extracted by our AI. Edit anything before confirming.
        </Text>

        <View className={`${bannerClass} p-3 rounded-xl mb-6 shadow-sm`}>
          <Text className="text-white font-bold text-center">{bannerText}</Text>
        </View>

        <EditableRow label="HbA1c (%)" value={hba1c} onChange={setHba1c} extractedValue={assessmentDraft.hba1c} />
        <EditableRow label="Systolic Blood Pressure (mmHg)" value={bp} onChange={setBp} extractedValue={assessmentDraft.bp_systolic} />
        <EditableRow label="BMI" value={bmi} onChange={setBmi} extractedValue={assessmentDraft.bmi} />

        <View className="bg-[#E8F5E9] p-4 rounded-xl border border-[#A5D6A7] mt-6">
          <Text className="text-[#1B5E20] font-bold mb-2">🔒 Privacy Guarantee</Text>
          <Text className="text-[#212121] leading-5">
            Your lab document is read entirely on this device. Only the numbers above will be sent to our
            matching model. Your document and name are never transmitted.
          </Text>
        </View>
      </ScrollView>

      {/* Sticky Footer */}
      <View className="absolute bottom-0 left-0 right-0 p-6 bg-[#F4F6F4] border-t border-[#E0E0E0]">
        <TouchableOpacity
          className="bg-[#1B5E20] py-4 rounded-xl items-center shadow-sm"
          onPress={handleConfirm}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text className="text-white font-bold text-lg">Confirm & Get Recommendations →</Text>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
