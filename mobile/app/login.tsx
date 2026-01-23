import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import { Theme } from '@/constants/Theme';

export default function LoginScreen() {
    const [phone, setPhone] = useState("");
    const [code, setCode] = useState("");
    const [step, setStep] = useState<"phone" | "otp">("phone");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const sendOTP = useMutation(api.auth.sendOTP);
    const verifyOTP = useMutation(api.auth.verifyOTP);

    const handleSendOTP = async () => {
        if (!phone) return;
        setLoading(true);
        const cleanPhone = phone.replace(/\D/g, '');
        try {
            await sendOTP({ phone: cleanPhone });
            setStep("otp");
        } catch (e: any) {
            Alert.alert("Error", e.message || "Failed to send OTP");
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async () => {
        if (!code) return;
        setLoading(true);
        try {
            const userId = await verifyOTP({ phone, code });
            if (userId) {
                await SecureStore.setItemAsync("userId", userId);
                router.replace("/(tabs)");
            }
        } catch (e: any) {
            Alert.alert("Error", e.message || "Invalid Code");
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <View style={styles.logoBadge}>
                    <Text style={styles.logoText}>W-AI</Text>
                </View>
                <Text style={styles.title}>تسجيل الدخول</Text>
                <Text style={styles.subtitle}>أدخل رقم الواتساب الخاص بك للوصول إلى بوابة الوكيل</Text>

                {step === "phone" ? (
                    <View style={styles.form}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>رقم الهاتف</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="رمز الدولة + الرقم (مثال: 966...)"
                                value={phone}
                                onChangeText={setPhone}
                                keyboardType="phone-pad"
                                placeholderTextColor={Theme.colors.textSecondary}
                            />
                        </View>
                        <TouchableOpacity style={styles.button} onPress={handleSendOTP} disabled={loading}>
                            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>إرسال الرمز</Text>}
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.form}>
                        <Text style={styles.otpMessage}>أدخل الرمز المرسل إلى {phone}</Text>
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>رمز التحقق</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="------"
                                value={code}
                                onChangeText={setCode}
                                keyboardType="number-pad"
                                placeholderTextColor={Theme.colors.textSecondary}
                            />
                        </View>
                        <TouchableOpacity style={styles.button} onPress={handleVerify} disabled={loading}>
                            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>تحقق وتسجيل</Text>}
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setStep("phone")} style={styles.linkButton}>
                            <Text style={styles.linkText}>تغيير رقم الهاتف</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Theme.colors.surface,
        justifyContent: 'center',
    },
    content: {
        padding: 32,
        alignItems: 'center',
    },
    logoBadge: {
        width: 84,
        height: 84,
        borderRadius: 28,
        backgroundColor: Theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 32,
    },
    logoText: {
        color: 'white',
        fontSize: 26,
        fontFamily: Theme.fonts.header,
        fontWeight: 'bold',
        letterSpacing: 2,
    },
    title: {
        ...Theme.typography.h1,
        color: Theme.colors.textPrimary,
        marginBottom: 12,
    },
    subtitle: {
        ...Theme.typography.body,
        color: Theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 48,
    },
    form: {
        width: '100%',
    },
    inputGroup: {
        marginBottom: 28,
    },
    inputLabel: {
        ...Theme.typography.small,
        color: Theme.colors.textSecondary,
        marginBottom: 10,
        textAlign: 'left',
    },
    input: {
        backgroundColor: Theme.colors.surfaceSecondary,
        borderRadius: Theme.borderRadius.md,
        padding: 18,
        ...Theme.typography.body,
        color: Theme.colors.textPrimary,
        borderWidth: 1,
        borderColor: Theme.colors.border,
        textAlign: 'right', // Force RTL feel for input
    },
    button: {
        backgroundColor: Theme.colors.primary,
        borderRadius: Theme.borderRadius.md,
        padding: 20,
        alignItems: 'center',
    },
    buttonText: {
        color: 'white',
        ...Theme.typography.h3,
        fontWeight: 'bold',
    },
    otpMessage: {
        ...Theme.typography.caption,
        color: Theme.colors.textPrimary,
        marginBottom: 28,
        textAlign: 'center',
    },
    linkButton: {
        marginTop: 24,
        padding: 12,
    },
    linkText: {
        ...Theme.typography.body,
        color: Theme.colors.primary,
        fontWeight: 'bold',
        textAlign: 'center',
    },
});
