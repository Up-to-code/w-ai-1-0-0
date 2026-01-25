import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { I18nManager } from "react-native";
import { storage, Locale, Direction } from "../lib/storage";

// Arabic translations (default)
const ar = {
  // Common
  app_name: "W-AI",
  loading: "جاري التحميل...",
  error: "خطأ",
  success: "تم بنجاح",
  cancel: "إلغاء",
  save: "حفظ",
  delete: "حذف",
  edit: "تعديل",
  confirm: "تأكيد",
  back: "رجوع",
  next: "التالي",
  done: "تم",
  search: "بحث",
  
  // Auth
  sign_in: "تسجيل الدخول",
  sign_up: "إنشاء حساب",
  sign_out: "تسجيل الخروج",
  email: "البريد الإلكتروني",
  password: "كلمة المرور",
  name: "الاسم",
  phone: "رقم الهاتف",
  sign_in_subtitle: "قم بتسجيل الدخول للمتابعة",
  sign_up_subtitle: "أنشئ حسابك للبدء",
  no_account: "ليس لديك حساب؟ سجل الآن",
  have_account: "لديك حساب بالفعل؟ سجل دخول",
  login_failed: "فشل تسجيل الدخول",
  register_failed: "فشل إنشاء الحساب",
  invalid_credentials: "البريد الإلكتروني أو كلمة المرور غير صحيحة",
  fill_all_fields: "يرجى ملء جميع الحقول",
  password_min_length: "كلمة المرور يجب أن تكون 6 أحرف على الأقل",
  account_created: "تم إنشاء الحساب بنجاح!",
  
  // Tabs
  chats: "المحادثات",
  customers: "العملاء",
  settings: "الإعدادات",
  
  // Chat
  type_message: "اكتب رسالة...",
  no_chats: "لا توجد محادثات",
  no_chats_found: "لم يتم العثور على محادثات",
  search_chats: "البحث في المحادثات...",
  session_expired: "انتهت الجلسة",
  tap_to_view: "اضغط لعرض الرسائل",
  start_conversation: "بدء محادثة",
  template_required: "لإرسال رسالة لأول مرة، يجب استخدام قالب رسالة معتمد.",
  whatsapp_policy: "هذا مطلوب وفقاً لسياسة WhatsApp للأعمال.",
  choose_template: "اختر قالب",
  
  // Templates
  templates: "القوالب",
  message_templates: "قوالب الرسائل",
  search_templates: "البحث في القوالب...",
  approved: "معتمد",
  all: "الكل",
  no_templates: "لا توجد قوالب",
  no_templates_found: "لم يتم العثور على قوالب",
  template_message: "رسالة قالب",
  
  // Products
  products: "المنتجات",
  search_products: "البحث في المنتجات...",
  no_products: "لا توجد منتجات",
  no_products_found: "لم يتم العثور على منتجات",
  
  // Customers
  add_customer: "إضافة عميل",
  search_customers: "البحث في العملاء...",
  no_customers: "لا يوجد عملاء",
  no_customers_found: "لم يتم العثور على عملاء",
  customer_name: "اسم العميل",
  customer_added: "تم إضافة العميل بنجاح!",
  tags: "العلامات",
  tags_hint: "العلامات مفصولة بفواصل (مثال: VIP, جديد)",
  optional: "اختياري",
  required: "مطلوب",
  
  // Settings
  profile: "الملف الشخصي",
  language: "اللغة",
  direction: "اتجاه النص",
  arabic: "العربية",
  english: "English",
  rtl: "من اليمين لليسار",
  ltr: "من اليسار لليمين",
  change_password: "تغيير كلمة المرور",
  current_password: "كلمة المرور الحالية",
  new_password: "كلمة المرور الجديدة",
  confirm_password: "تأكيد كلمة المرور",
  password_changed: "تم تغيير كلمة المرور بنجاح",
  password_mismatch: "كلمتا المرور غير متطابقتين",
  profile_updated: "تم تحديث الملف الشخصي",
  appearance: "المظهر",
  account: "الحساب",
  
  // Access
  access_denied: "الوصول مرفوض",
  access_denied_message: "ليس لديك صلاحية للوصول إلى هذا التطبيق.\nيرجى التواصل مع المسؤول.",
  
  // Attachments
  template: "قالب",
  product: "منتج",
  photo: "صورة",
  camera: "كاميرا",
  
  // Media
  image: "صورة",
  video: "فيديو",
  audio: "صوت",
  document: "مستند",
  image_unavailable: "الصورة غير متاحة",
  tap_to_open: "اضغط للفتح",
};

// English translations
const en: typeof ar = {
  // Common
  app_name: "W-AI",
  loading: "Loading...",
  error: "Error",
  success: "Success",
  cancel: "Cancel",
  save: "Save",
  delete: "Delete",
  edit: "Edit",
  confirm: "Confirm",
  back: "Back",
  next: "Next",
  done: "Done",
  search: "Search",
  
  // Auth
  sign_in: "Sign In",
  sign_up: "Sign Up",
  sign_out: "Sign Out",
  email: "Email",
  password: "Password",
  name: "Name",
  phone: "Phone",
  sign_in_subtitle: "Sign in to continue",
  sign_up_subtitle: "Create your account to get started",
  no_account: "Don't have an account? Sign up",
  have_account: "Already have an account? Sign in",
  login_failed: "Login Failed",
  register_failed: "Registration Failed",
  invalid_credentials: "Invalid email or password",
  fill_all_fields: "Please fill in all fields",
  password_min_length: "Password must be at least 6 characters",
  account_created: "Account created successfully!",
  
  // Tabs
  chats: "Chats",
  customers: "Customers",
  settings: "Settings",
  
  // Chat
  type_message: "Type a message...",
  no_chats: "No chats yet",
  no_chats_found: "No chats found",
  search_chats: "Search chats...",
  session_expired: "Session expired",
  tap_to_view: "Tap to view messages",
  start_conversation: "Start Conversation",
  template_required: "To message this contact for the first time, you must use an approved template message.",
  whatsapp_policy: "This is required by WhatsApp's Business Policy.",
  choose_template: "Choose Template",
  
  // Templates
  templates: "Templates",
  message_templates: "Message Templates",
  search_templates: "Search templates...",
  approved: "Approved",
  all: "All",
  no_templates: "No templates available",
  no_templates_found: "No templates found",
  template_message: "Template Message",
  
  // Products
  products: "Products",
  search_products: "Search products...",
  no_products: "No products available",
  no_products_found: "No products found",
  
  // Customers
  add_customer: "Add Customer",
  search_customers: "Search customers...",
  no_customers: "No customers yet",
  no_customers_found: "No customers found",
  customer_name: "Customer name",
  customer_added: "Customer added successfully!",
  tags: "Tags",
  tags_hint: "Tags separated by commas (e.g., VIP, New)",
  optional: "optional",
  required: "required",
  
  // Settings
  profile: "Profile",
  language: "Language",
  direction: "Text Direction",
  arabic: "العربية",
  english: "English",
  rtl: "Right to Left",
  ltr: "Left to Right",
  change_password: "Change Password",
  current_password: "Current Password",
  new_password: "New Password",
  confirm_password: "Confirm Password",
  password_changed: "Password changed successfully",
  password_mismatch: "Passwords do not match",
  profile_updated: "Profile updated",
  appearance: "Appearance",
  account: "Account",
  
  // Access
  access_denied: "Access Denied",
  access_denied_message: "You don't have permission to access this app.\nPlease contact your administrator.",
  
  // Attachments
  template: "Template",
  product: "Product",
  photo: "Photo",
  camera: "Camera",
  
  // Media
  image: "Image",
  video: "Video",
  audio: "Audio",
  document: "Document",
  image_unavailable: "Image unavailable",
  tap_to_open: "Tap to open",
};

const translations = { ar, en };

type TranslationKey = keyof typeof ar;

interface LocaleContextType {
  locale: Locale;
  direction: Direction;
  isRTL: boolean;
  t: (key: TranslationKey) => string;
  setLocale: (locale: Locale) => Promise<void>;
  setDirection: (direction: Direction) => Promise<void>;
  loading: boolean;
}

const LocaleContext = createContext<LocaleContextType | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("ar");
  const [direction, setDirectionState] = useState<Direction>("rtl");
  const [loading, setLoading] = useState(true);

  const isRTL = direction === "rtl";

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedLocale = await storage.getLocale();
      const savedDirection = await storage.getDirection();
      
      setLocaleState(savedLocale);
      setDirectionState(savedDirection);
      
      // Apply RTL setting
      if (I18nManager.isRTL !== (savedDirection === "rtl")) {
        I18nManager.allowRTL(true);
        I18nManager.forceRTL(savedDirection === "rtl");
      }
    } catch (error) {
      console.error("Error loading locale settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const setLocale = useCallback(async (newLocale: Locale) => {
    await storage.setLocale(newLocale);
    setLocaleState(newLocale);
    
    // Auto-set direction based on locale
    const newDirection = newLocale === "ar" ? "rtl" : "ltr";
    await setDirection(newDirection);
  }, []);

  const setDirection = useCallback(async (newDirection: Direction) => {
    await storage.setDirection(newDirection);
    setDirectionState(newDirection);
    
    // Apply RTL change - requires app restart
    if (I18nManager.isRTL !== (newDirection === "rtl")) {
      I18nManager.allowRTL(true);
      I18nManager.forceRTL(newDirection === "rtl");
      
      // Reload app to apply RTL changes
      // Note: In development, app restart may be required manually
      try {
        // Try to dynamically import expo-updates if available
        const Updates = await import("expo-updates").catch(() => null);
        if (Updates) {
          await Updates.reloadAsync();
        } else {
          console.log("Please restart the app to apply direction changes");
        }
      } catch (e) {
        // In development, Updates.reloadAsync() may not work
        console.log("Please restart the app to apply direction changes");
      }
    }
  }, []);

  const t = useCallback((key: TranslationKey): string => {
    return translations[locale][key] || translations.ar[key] || key;
  }, [locale]);

  return (
    <LocaleContext.Provider value={{ 
      locale, 
      direction, 
      isRTL, 
      t, 
      setLocale, 
      setDirection,
      loading 
    }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return context;
}

// RTL-aware style helper
export function rtlStyle(isRTL: boolean) {
  return {
    flexDirection: isRTL ? "row-reverse" as const : "row" as const,
    textAlign: isRTL ? "right" as const : "left" as const,
  };
}
