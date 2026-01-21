"use client";

import { useState, Suspense } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Phone, Lock, Loader2, ArrowRight, CheckCircle2, MessageSquare } from "lucide-react";

function LoginForm() {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const sendOTP = useMutation(api.auth.sendOTP);
  const verifyOTP = useMutation(api.auth.verifyOTP);
  const router = useRouter();

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (phone.length < 8) throw new Error("رقم الهاتف غير صحيح");

      await sendOTP({ phone });
      setStep("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ ما");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (otp.length < 4) throw new Error("رمز التحقق غير مكتمل");

      const userId = await verifyOTP({ phone, code: otp });
      if (userId) {
        router.push("/");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "رمز التحقق غير صحيح");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="space-y-1 text-center pb-8">
        <div className="mx-auto w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
          <MessageSquare className="w-7 h-7 text-primary" />
        </div>
        <CardTitle className="text-2xl font-bold text-foreground">تسجيل الدخول</CardTitle>
        <CardDescription className="text-muted-foreground">
          {step === "phone"
            ? "أدخل رقم هاتفك للدخول إلى لوحة التحكم"
            : `تم إرسال رمز التحقق إلى ${phone}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === "phone" ? (
          <form onSubmit={handleSendOTP} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground block text-right">
                رقم الهاتف
              </label>
              <div className="relative">
                <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="tel"
                  placeholder="05xxxxxxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pr-10 text-right font-mono"
                  dir="ltr"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="text-destructive text-sm bg-destructive/10 p-3 rounded-xl text-center">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "إرسال رمز التحقق"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground block text-right">
                رمز التحقق (OTP)
              </label>
              <div className="relative">
                <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="pr-10 text-center tracking-widest text-lg font-mono"
                  maxLength={6}
                  required
                />
              </div>
            </div>

            {error && (
              <div className="text-destructive text-sm bg-destructive/10 p-3 rounded-xl text-center">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "تأكيد الدخول"}
            </Button>

            <button
              type="button"
              onClick={() => setStep("phone")}
              className="w-full text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 mt-4 transition-colors"
            >
              <ArrowRight className="h-4 w-4" />
              تغيير رقم الهاتف
            </button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 font-sans" dir="rtl">
      <Suspense fallback={
        <div className="flex items-center justify-center">
          <Loader2 className="animate-spin h-8 w-8 text-primary" />
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}
