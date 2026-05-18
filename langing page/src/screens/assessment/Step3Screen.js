import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

// Mock text extraction for Hackathon prototype (can be replaced with real pdf.js logic if needed)
async function mockExtractPDFText() {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve("LAB REPORT: Patient shows HbA1c of 6.2%, BP is 128/84. BMI calculated at 26.5.");
    }, 2000);
  });
}

export default function Step3Screen({ navigation, route }) {
  const { assessmentDraft } = route.params;
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [readyToConfirm, setReadyToConfirm] = useState(false);
  const [extractedData, setExtractedData] = useState({});
  const scrollViewRef = useRef();

  useEffect(() => {
    setTimeout(() => {
      setMessages([{
        id: 1,
        sender: 'ai',
        text: "Hello! I'm your Outsurance health agent. I'll help read your lab report and fill in your health profile automatically.\n\nYou can:\n• Upload a PDF or Photo of your lab report using the 📎 button\n• Or just type your values directly\n\nEither way, I'll ask about anything that's missing. Shall we start?"
      }]);
    }, 1000);
  }, []);

  async function agentReply(promptText, isFile, currentExtracted) {
    await new Promise(r => setTimeout(r, 1200));

    // If Gemma sent back a conversational reply instead of JSON (because data was missing)
    if (currentExtracted && currentExtracted.raw_reply) {
      setReadyToConfirm(true); // Always let them proceed manually if they want
      return currentExtracted.raw_reply + "\n\n(Type any missing values above, or press Confirm to use safe defaults.)";
    }

    if (isFile) {
      const found = [];
      const missing = [];

      if (currentExtracted.hba1c)      found.push(`✅ HbA1c: ${currentExtracted.hba1c}%`);
      else                              missing.push('❓ HbA1c — do you know it from a recent blood test?');

      if (currentExtracted.bp_systolic) found.push(`✅ Systolic BP: ${currentExtracted.bp_systolic} mmHg`);
      else                              missing.push('❓ Blood Pressure (Systolic) — e.g. the first number in 128/84');

      if (currentExtracted.bmi)         found.push(`✅ BMI: ${currentExtracted.bmi}`);
      else                              missing.push('❓ BMI — check a recent report or use a BMI calculator');

      const lines = [
        `Got it! Here's what I found in your report:\n`,
        ...found,
        missing.length > 0 ? `\nI couldn't find:\n` : '',
        ...missing,
        missing.length === 0
          ? "\nAll key values captured! Press **Confirm & Review Data** when ready."
          : "\nType any missing values above, or press **Confirm** to use safe defaults.",
      ].filter(Boolean);

      if (missing.length === 0) setReadyToConfirm(true);
      return lines.join('\n');
    }

    // User typed a text reply
    const lower = promptText.toLowerCase();
    const skipWords = ['skip', 'continue', "don't know", 'idk', 'na', 'n/a', 'no idea'];
    if (skipWords.some(k => lower.includes(k))) {
      setReadyToConfirm(true);
      return "No problem! I'll use standard averages for any missing values.\n\nPress **Confirm & Review Data** — you can edit everything on the next screen before it's sent to the matching model.";
    }

    setReadyToConfirm(true);
    return `Thanks! Press **Confirm & Review Data** whenever you're ready. You can still edit everything on the next screen.`;
  }

  async function handleSend(text = inputText, isFile = false, imageBase64 = null) {
    if (!text.trim() && !isFile) return;

    setMessages(prev => [...prev, { id: Date.now(), sender: 'user', text: text || inputText }]);
    setInputText('');
    setIsTyping(true);

    let currentExtracted = extractedData;

    if (isFile) {
      const { processLabReport } = require('../../api/onDeviceAI');
      let gemmaResult;
      
      if (imageBase64) {
        // OCR via Gemma Vision conceptually
        gemmaResult = await processLabReport(null, imageBase64);
      } else {
        // PDF text extraction
        const rawText = await mockExtractPDFText();
        gemmaResult = await processLabReport(rawText, null);
      }
      
      currentExtracted = gemmaResult;
      if (!gemmaResult.raw_reply) {
         setExtractedData(prev => ({ ...prev, ...gemmaResult }));
      }
    }

    const aiResponse = await agentReply(text, isFile, currentExtracted);
    setIsTyping(false);
    setMessages(prev => [...prev, { id: Date.now(), sender: 'ai', text: aiResponse }]);
  }

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera permission is required.');
      return;
    }
    let result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.5 });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      handleSend('📷 [User took a photo of lab report]', true, result.assets[0].base64);
    }
  };

  const openGallery = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.5 });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      handleSend('🖼️ [User uploaded an image of lab report]', true, result.assets[0].base64);
    }
  };

  const openDocument = async () => {
    let result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
    if (!result.canceled) {
      handleSend('📄 [User uploaded a PDF document]', true, null);
    }
  };

  const showAttachOptions = () => {
    Alert.alert(
      "Upload Lab Report",
      "Choose an option",
      [
        { text: "Take Photo", onPress: openCamera },
        { text: "Choose from Gallery", onPress: openGallery },
        { text: "Upload PDF", onPress: openDocument },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  function handleConfirm() {
    const finalDraft = {
      ...assessmentDraft,
      ...extractedData
    };
    navigation.navigate('Step4', { assessmentDraft: finalDraft });
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F4F6F4]">
      {/* Header */}
      <View className="bg-white border-b border-[#E0E0E0] px-4 py-4 flex-row items-center justify-between">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text className="text-[#1B5E20] text-lg font-bold">← Back</Text>
        </TouchableOpacity>
        <View className="flex-row items-center">
          <Text className="text-xl">✨ </Text>
          <Text className="text-lg font-bold text-[#1B5E20]">Health Agent</Text>
        </View>
        <Text className="text-[#757575] font-bold">3 / 5</Text>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView 
          className="flex-1 px-4 py-4"
          ref={scrollViewRef}
          onContentSizeChange={() => scrollViewRef.current.scrollToEnd({ animated: true })}
        >
          {messages.map(msg => (
            <View 
              key={msg.id} 
              className={`mb-4 max-w-[85%] rounded-2xl p-4 ${msg.sender === 'ai' ? 'bg-[#E8F5E9] self-start rounded-tl-sm' : 'bg-[#1B5E20] self-end rounded-tr-sm'}`}
            >
              {msg.sender === 'ai' && <Text className="absolute -left-2 top-2 text-lg">✨</Text>}
              <Text className={`${msg.sender === 'ai' ? 'text-[#212121]' : 'text-white'} text-base leading-6`}>
                {msg.text}
              </Text>
            </View>
          ))}
          {isTyping && (
            <View className="bg-[#E8F5E9] self-start rounded-2xl rounded-tl-sm p-4 mb-4">
              <ActivityIndicator color="#1B5E20" size="small" />
            </View>
          )}
        </ScrollView>

        {readyToConfirm && (
          <View className="px-4 py-2">
            <TouchableOpacity 
              className="bg-[#4CAF50] py-4 rounded-xl items-center shadow-sm"
              onPress={handleConfirm}
            >
              <Text className="text-white font-bold text-lg">Confirm & Review Data →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Input Bar */}
        <View className="flex-row items-center px-4 py-3 bg-white border-t border-[#E0E0E0]">
          <TouchableOpacity onPress={showAttachOptions} className="mr-3 bg-[#F4F6F4] p-3 rounded-full">
            <Text className="text-xl">📎</Text>
          </TouchableOpacity>
          <TextInput 
            className="flex-1 bg-[#F4F6F4] rounded-2xl px-4 py-3 text-[#212121]"
            placeholder="Type a reply..."
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity onPress={() => handleSend()} className="ml-3 bg-[#1B5E20] p-3 rounded-full w-12 h-12 items-center justify-center">
            <Text className="text-white text-lg font-bold">➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
