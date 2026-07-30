# SX8 — i18n landing page : sélecteur de langue + traductions manquantes

## Contexte

La landing page SaaS (`/[locale]/landing`) est une page auto-porteuse (Client Component, 507 lignes) qui n'utilise pas le Header/Footer partagé. Résultat : **aucun sélecteur de langue n'est visible** sur cette page. De plus, les fichiers `ar.json` et `tzm.json` n'ont **aucune traduction pour le namespace `landing`** (seuls `fr.json` et `en.json` sont complets).

## Travail à faire

### 1. Ajouter le `LanguageSwitcher` dans le header de la landing page

**Fichier à modifier :** `apps/frontend/src/app/[locale]/landing/page.tsx`

1. Ajouter l'import du composant LanguageSwitcher :
```tsx
import LanguageSwitcher from '@/components/layout/LanguageSwitcher'
```

2. Dans le header (ligne ~109), ajouter `<LanguageSwitcher />` entre le bouton CTA démo et le bouton hamburger mobile :

**Avant :**
```tsx
<div className="flex items-center gap-3.5">
  <a href={DEMO_URL} target="_blank" rel="noopener"
    className="hidden md:inline-flex items-center gap-2 rounded-full bg-cta-500 px-5 py-2.5 text-[.88rem] font-bold text-white shadow-sm transition-all hover:bg-cta-600 hover:-translate-y-0.5 hover:shadow-md">
    {t('header_cta')}
  </a>
  <button onClick={() => setMobileOpen(!mobileOpen)} className="flex size-9 items-center justify-center md:hidden" aria-label="Menu">
    {mobileOpen ? <X className="size-[22px]" /> : <Menu className="size-[22px]" />}
  </button>
</div>
```

**Après :**
```tsx
<div className="flex items-center gap-3.5">
  <a href={DEMO_URL} target="_blank" rel="noopener"
    className="hidden md:inline-flex items-center gap-2 rounded-full bg-cta-500 px-5 py-2.5 text-[.88rem] font-bold text-white shadow-sm transition-all hover:bg-cta-600 hover:-translate-y-0.5 hover:shadow-md">
    {t('header_cta')}
  </a>
  <LanguageSwitcher />
  <button onClick={() => setMobileOpen(!mobileOpen)} className="flex size-9 items-center justify-center md:hidden" aria-label="Menu">
    {mobileOpen ? <X className="size-[22px]" /> : <Menu className="size-[22px]" />}
  </button>
</div>
```

### 2. Ajouter le namespace `landing` complet dans `ar.json`

**Fichier à modifier :** `apps/frontend/messages/ar.json`

Ajouter le bloc `"landing"` complet après la clé `"dashboard"` :

```json
"landing": {
  "nav_features": "الميزات",
  "nav_demo": "تجربة",
  "nav_pricing": "الأسعار",
  "nav_faq": "الأسئلة الشائعة",
  "header_cta": "جرب النسخة التجريبية",
  "hero_badge": "🇲🇦 مصمم خصيصًا للأطباء المستقلين في المغرب",
  "hero_title_1": "عيادتك الطبية،",
  "hero_title_em": "مبسطة",
  "hero_title_2": "يوميًا",
  "hero_sub": "موقع احترافي متعدد اللغات، حجز مواعيد عبر الإنترنت وسجل طبي رقمي — كل ذلك في منصة واحدة، بالفرنسية والعربية والأمازيغية والإنجليزية.",
  "hero_cta_primary": "جرب النسخة التجريبية مجانًا",
  "hero_cta_secondary": "اطلع على الأسعار",
  "hero_trust_1": "بدون التزام",
  "hero_trust_2": "استضافة متضمنة",
  "hero_trust_3": "دعم تقني بالفرنسية",
  "hero_badge_floating": "متابعة نمو منظمة الصحة العالمية",
  "hero_avatar_initials": "ي",
  "hero_avatar_name": "ياسمين · 18 شهرًا",
  "hero_avatar_sub": "استشارة متابعة",
  "hero_tag": "اليوم",
  "hero_chart_title": "منحنى النمو — الوزن / العمر",
  "hero_percentile": "المئين 50",
  "hero_chart_0": "الولادة",
  "hero_chart_6": "6 أشهر",
  "hero_chart_12": "12 شهرًا",
  "hero_chart_18": "18 شهرًا",
  "hero_chart_label": "ياسمين",
  "trust_1": "استضافة آمنة",
  "trust_2": "4 لغات (FR/AR/EN/ⵜⵎⵣ)",
  "trust_3": "حجز مواعيد متكامل",
  "trust_4": "مطابق للقانون 08-09",
  "ps_eyebrow": "الملاحظة",
  "ps_title": "لا مزيد من الأوراق والمواعيد عبر الهاتف",
  "ps_sub": "استبدل أدواتك المتفرقة بمنصة واحدة، سهلة الاستخدام من اليوم الأول.",
  "ps_1_before": "مواعيد عبر الهاتف، مفكرة ورقية",
  "ps_1_after": "حجز عبر الإنترنت 24/7، مفكرة متزامنة تلقائيًا",
  "ps_2_before": "ملفات مرضى متفرقة، يصعب العثور عليها",
  "ps_2_after": "سجل رقمي مركزي، بحث فوري",
  "ps_3_before": "لا رؤية شاملة لنشاط العيادة",
  "ps_3_after": "إحصائيات وسجل تدقيق في لمحة",
  "feat_eyebrow": "الميزات",
  "feat_title": "كل ما تحتاجه لإدارة عيادتك",
  "feat_sub": "أدوات مصممة للحياة اليومية للأطباء المغاربة، من الموقع الإلكتروني إلى السجل الطبي.",
  "exclusive": "حصري",
  "feat_1_title": "موقع إلكتروني متعدد اللغات",
  "feat_1_desc": "موقع احترافي ومتجاوب بالفرنسية والعربية والأمازيغية والإنجليزية، جاهز في دقائق.",
  "feat_2_title": "حجز المواعيد عبر الإنترنت",
  "feat_2_desc": "مرضاكم يحجزون 24/7 بفضل مفكرة متزامنة مع موقعكم.",
  "feat_3_title": "سجل طبي رقمي",
  "feat_3_desc": "السجل الطبي، الاستشارات والوصفات مركزية وآمنة.",
  "feat_4_title": "دفتر تلقيح رقمي",
  "feat_4_desc": "تابعوا تلقيحات كل مريض، بدون دفتر ورقي.",
  "feat_5_title": "منحنيات نمو منظمة الصحة العالمية",
  "feat_5_desc": "متابعة نمو تفاعلية، مدمجة مباشرة في استشاراتكم.",
  "feat_6_title": "متعدد الأطباء",
  "feat_6_desc": "إدارة عدة أطباء مع قوائم انتظار منفصلة لكل منهم.",
  "feat_7_title": "سجل التدقيق",
  "feat_7_desc": "سجل كامل للإجراءات لتتبع كامل لنشاط العيادة.",
  "feat_8_title": "إحصائيات متقدمة",
  "feat_8_desc": "تصور نشاط عيادتك وتطوره في لمحة.",
  "steps_eyebrow": "البدء",
  "steps_title": "ثلاث خطوات للانطلاق",
  "steps_sub": "نفس التقدم كما في مساحة التسجيل: الصيغة، التكوين، التأكيد.",
  "step_1_title": "اختر صيغتك",
  "step_1_desc": "موقع، مواعيد أو عيادة، حسب احتياجاتك الحالية.",
  "step_2_title": "قم بتكوين مساحتك",
  "step_2_desc": "أدخل تخصصك، نطاقك الفرعي ومعلوماتك في دقائق.",
  "step_3_title": "استقبل مرضاك عبر الإنترنت",
  "step_3_desc": "موقعك ومفكرتك جاهزان للاستخدام فورًا.",
  "demo_eyebrow": "بدون تسجيل",
  "demo_title": "جرب بنفسك",
  "demo_sub": "استكشف عيادة تجريبية ببيانات وهمية: مفكرة، ملفات مرضى، وصفات وأكثر.",
  "demo_email_label": "البريد الإلكتروني",
  "demo_pwd_label": "كلمة المرور",
  "demo_card_title": "عيادة تجريبية",
  "demo_card_sub": "بدون بطاقة بنكية، بدون تسجيل. اتصل واستكشف بحرية.",
  "demo_card_cta": "الولوج إلى النسخة التجريبية",
  "price_eyebrow": "الأسعار",
  "price_title": "صيغة لكل مرحلة من ممارستك",
  "price_sub": "ابدأ مجانًا، وتطور نحو ميزات أكثر عندما تكون مستعدًا.",
  "price_vitrine": "موقع",
  "price_free": "مجاني",
  "price_vitrine_note": "للتواجد على الإنترنت، بدون تكلفة",
  "price_rdv_note": "للتوقف عن إدارة المفكرة عبر الهاتف",
  "price_cabinet_note": "+199 درهم/شهر لكل طبيب إضافي",
  "price_month": "شهر",
  "price_ribbon": "الأكثر اكتمالاً",
  "price_cabinet": "عيادة",
  "price_vitrine_f1": "موقع إلكتروني مخصص",
  "price_vitrine_f2": "4 لغات (fr/en/ar/tzm)",
  "price_vitrine_f3": "تصميم متجاوب",
  "price_vitrine_f4": "استضافة متضمنة",
  "price_vitrine_f5": "اسم نطاق مخصص",
  "price_rdv_f1": "كل ما في موقع، بالإضافة إلى:",
  "price_rdv_f2": "حجز المواعيد عبر الإنترنت",
  "price_rdv_f3": "مفكرة متزامنة",
  "price_rdv_f4": "إشعارات تلقائية",
  "price_cabinet_f1": "كل ما في مواعيد، بالإضافة إلى:",
  "price_cabinet_f2": "سجل طبي رقمي",
  "price_cabinet_f3": "قائمة الانتظار",
  "price_cabinet_f4": "استشارة + وصفة طبية",
  "price_cabinet_f5": "دفتر التلقيح",
  "price_cabinet_f6": "منحنيات النمو",
  "price_cabinet_f7": "متعدد الأطباء",
  "price_cabinet_f8": "سجل التدقيق",
  "price_cabinet_f9": "دعم ذو أولوية",
  "price_cta_vitrine": "ابدأ مجانًا",
  "price_cta_rdv": "ابدأ",
  "price_cta_cabinet": "اطلب نسخة تجريبية",
  "price_fineprint": "جميع الأسعار بالدرهم المغربي (MAD).",
  "sec_eyebrow": "الثقة",
  "sec_title": "خصوصية مرضاك، أولويتنا",
  "sec_1_title": "استضافة آمنة",
  "sec_1_desc": "بنية تحتية مخصصة ومراقبة",
  "sec_2_title": "القانون 08-09",
  "sec_2_desc": "مطابق لحماية البيانات الشخصية",
  "sec_3_title": "نسخ احتياطي يومي",
  "sec_3_desc": "بياناتك مكررة تلقائيًا",
  "sec_4_title": "ولوج حسب الدور",
  "sec_4_desc": "طبيب وسكرتير، لكل منهما نطاقه الخاص",
  "sec_fact": "🏥 مستخدم بالفعل في ظروف حقيقية من قبل عيادة طب أطفال في إنزكان.",
  "faq_eyebrow": "الأسئلة الشائعة",
  "faq_title": "كل ما تتساءل عنه",
  "faq_1_q": "هل يجب علي تثبيت برنامج؟",
  "faq_1_a": "لا. المنصة تعمل مباشرة في متصفحك، على الحاسوب والهاتف.",
  "faq_2_q": "هل يمكنني تغيير الصيغة لاحقًا؟",
  "faq_2_a": "نعم، يمكنك الترقية إلى صيغة أعلى في أي وقت من مساحتك.",
  "faq_3_q": "كيف يعمل التسعير لعدة أطباء؟",
  "faq_3_a": "صيغة العيادة تبدأ من 499 درهم/شهر لطبيب واحد، ثم +199 درهم/شهر لكل طبيب إضافي.",
  "faq_4_q": "هل بيانات مرضاي آمنة؟",
  "faq_4_a": "نعم. بياناتك مستضافة بشكل آمن، مع نسخ احتياطي تلقائي يومي.",
  "faq_5_q": "هل يمكنني التجربة قبل الالتزام؟",
  "faq_5_a": "نعم، النسخة التجريبية متاحة بحرية، بدون بطاقة بنكية ولا تسجيل مسبق.",
  "faq_6_q": "هل الدعم متاح بالفرنسية؟",
  "faq_6_a": "نعم، فريقنا يرافقكم بالفرنسية، وبالعربية عند الحاجة.",
  "cta_title": "هل أنت مستعد لتبسيط إدارة عيادتك؟",
  "cta_sub": "انضم إلى الأطباء الذين يثقون في منصتنا.",
  "cta_primary": "جرب النسخة التجريبية",
  "cta_secondary": "اطلع على الأسعار",
  "footer_desc": "منصة الإدارة المصممة للعيادات الطبية المستقلة في المغرب.",
  "footer_product": "المنتج",
  "footer_support": "الدعم",
  "footer_legal": "القانوني",
  "footer_legal_1": "إشعار قانوني",
  "footer_legal_2": "الخصوصية",
  "footer_rights": "جميع الحقوق محفوظة.",
  "footer_made": "صُنع في المغرب 🇲🇦"
}
```

**Important technique :** Le fichier `ar.json` actuel se termine par `}` `}` (fermeture du namespace `dashboard` et fermeture du JSON racine). Il faut :
1. Ajouter une virgule après le `}` fermant `dashboard` (ligne 113)
2. Insérer le bloc `"landing": { ... }` complet
3. Puis refermer le JSON racine `}`

Autrement dit, remplacer les 2 dernières lignes :
```json
  }
}
```
par :
```json
  },
  "landing": {
    ...tout le bloc ci-dessus...
  }
}
```

### 3. Ajouter le namespace `landing` complet dans `tzm.json`

**Fichier à modifier :** `apps/frontend/messages/tzm.json`

Même opération que pour ar.json — ajouter le bloc `"landing"` entre `dashboard` et la fermeture racine :

```json
"landing": {
  "nav_features": "ⵜⵉⵎⵙⵙⵍⴰⵢⵉⵏ",
  "nav_demo": "ⵜⴰⵎⴰⵡⵜ",
  "nav_pricing": "ⵉⵙⵡⵓⵔⵉⵢⵏ",
  "nav_faq": "ⵉⵙⵇⵙⵉⵜⵏ",
  "header_cta": "ⵊⵔⵔⴱ ⵜⴰⵎⴰⵡⵜ",
  "hero_badge": "🇲🇦 ⵉⵜⵜⵓⵙⵏⴰⵍⴰ ⵉ ⵉⵙⵏⵉⵊⵉⵢⵏ ⵉⵎⴰⵏⴻⵏ ⴷⴻⴳ ⵎⵓⵔⴰⴽⵓⵛ",
  "hero_title_1": "ⵜⴰⴱⴰⵕⴰⵏⵜ ⵏ ⵓⵙⵏⵉⵊ,",
  "hero_title_em": "ⵜⴰⵙⵙⵓⴷⵙⵜ",
  "hero_title_2": "ⴽⵓ ⴰⵙⵙ",
  "hero_sub": "ⴰⵙⵉⵜ ⴰⵅⴰⵜⴰⵔ ⵙ ⵜⵓⴳⵜ ⵏ ⵜⵓⵜⵍⴰⵢⵉⵏ, ⴰⵙⵏⵓⴱⴳ ⵏ ⵜⵎⵉⵔⵉⵜ ⵖⴼ ⵍⵉⵏⵜⵉⵔⵏⵉⵜ ⴷ ⵓⴽⴰⵔⴹ ⵏ ⵓⵎⵓⴷⴰⵏ ⴰⴷⵉⵊⵉⵟⴰⵍ — ⴳ ⵢⴰⵏ ⵓⵙⵉⵜ ⴰⵟⵟⴰⵙ, ⵙ ⵜⴼⵔⴰⵏⵙⵉⵙⵜ, ⴷ ⵜⴰⵄⵔⴰⴱⵜ, ⴷ ⵜⵎⴰⵣⵉⵖⵜ, ⴷ ⵜⵏⴳⵍⵉⵣⵜ.",
  "hero_cta_primary": "ⵊⵔⵔⴱ ⵜⴰⵎⴰⵡⵜ ⵙ ⴱⴰⵟⴰⵍ",
  "hero_cta_secondary": "ⵥⵕ ⵉⵙⵡⵓⵔⵉⵢⵏ",
  "hero_trust_1": "ⴱⵍⴰ ⴰⵣⵣⴰⵢ",
  "hero_trust_2": "ⴰⵙⵏⵓⴱⴳ ⵉⵜⵜⵡⴰⵙⵏⵉ",
  "hero_trust_3": "ⴰⵙⵓⴷⵙ ⵙ ⵜⴼⵔⴰⵏⵙⵉⵙⵜ",
  "hero_badge_floating": "ⴰⴹⴼⵓⵕ ⵏ ⵡⵓⵖⵖⵓ OMS",
  "hero_avatar_initials": "ⵢ",
  "hero_avatar_name": "ⵢⴰⵙⵎⵉⵏ · 18 ⵉⵢⵢⵉⵔⵏ",
  "hero_avatar_sub": "ⵜⴰⵎⵙⴰⵍ ⵏ ⵓⴹⴼⵓⵕ",
  "hero_tag": "ⴰⵙⵙⴰ",
  "hero_chart_title": "ⴰⵙⵔⵓⵔ ⵏ ⵡⵓⵖⵖⵓ — ⵜⴰⵣⴷⴰⵢⵜ / ⴰⵡⵜⴰⵢ",
  "hero_percentile": "50ᵉ ⴰⵎⵉⵏ",
  "hero_chart_0": "ⵜⴰⵍⴰⵍⵉⵜ",
  "hero_chart_6": "6 ⵉⵢⵢⵉⵔⵏ",
  "hero_chart_12": "12 ⵉⵢⵢⵉⵔⵏ",
  "hero_chart_18": "18 ⵉⵢⵢⵉⵔⵏ",
  "hero_chart_label": "ⵢⴰⵙⵎⵉⵏ",
  "trust_1": "ⴰⵙⵏⵓⴱⴳ ⵉⵎⵎⵏⵏⴻⵏ",
  "trust_2": "4 ⵜⵓⵜⵍⴰⵢⵉⵏ (FR/AR/EN/ⵜⵎⵣ)",
  "trust_3": "ⴰⵙⵏⵓⴱⴳ ⵏ ⵜⵎⵉⵔⵉⵜ ⵖⴼ ⵍⵉⵏⵜⵉⵔⵏⵉⵜ",
  "trust_4": "ⵉⵣⴷⵉ ⴷ ⵓⵣⵔⴼ 09-08",
  "ps_eyebrow": "ⴰⵙⴽⴰⵍ",
  "ps_title": "ⵉⴽⴽ ⵓⵙⵏⵖⵉⴼ ⴷ ⵜⵎⵉⵔⵉⵏ ⵙ ⵜⵉⵍⵉⴼⵓⵏ",
  "ps_sub": "ⵙ ⵢⴰⵏ ⵓⵙⵉⵜ ⴰⵟⵟⴰⵙ, ⵉⵙⴷⵓⵙⵏ ⵙⴳ ⵡⴰⵙⵙ ⴰⵎⵣⵡⴰⵔⵓ.",
  "ps_1_before": "ⵜⵉⵎⵉⵔⵉⵏ ⵙ ⵜⵉⵍⵉⴼⵓⵏ, ⴰⵙⵏⵉⵊ ⵏ ⵓⵙⵏⵖⵉⴼ",
  "ps_1_after": "ⴰⵙⵏⵓⴱⴳ 24/7, ⴰⵙⵏⵉⵊ ⵉⵎⵔⵡⴰⵙⵏ ⵙ ⵓⵡⵓⵔⵎⴰⵏ",
  "ps_2_before": "ⵉⴽⴰⵔⴹⵏ ⵏ ⵉⵎⵓⴷⴰⵏ ⴱⵕⵕⴰ ⴱⵕⵕⴰ, ⵉⵅⵚⵚⴰ ⴰⴹ ⵜⵏ ⵜⴰⴼⵜ",
  "ps_2_after": "ⴰⴽⴰⵔⴹ ⴰⴷⵉⵊⵉⵟⴰⵍ ⵙ ⵡⴰⵎⵎⴰⵙ, ⴰⵔⵣⵣⵓ ⵙ ⵓⵡⵓⵔⵎⴰⵏ",
  "ps_3_before": "ⵓⵔ ⵜⵥⵕⵉⵜ ⴰⵏⴰⵎⵎⵓⵙ ⵏ ⵜⴱⴰⵕⴰⵏⵜ",
  "ps_3_after": "ⵜⵉⴷⵢⵓⵜⵉⵏ ⴷ ⵓⴷⵍⵉⵙ ⵏ ⵓⵙⵉⵔⴳ ⵙ ⵜⵓⵙⵙⴷⴰ",
  "feat_eyebrow": "ⵜⵉⵎⵙⵙⵍⴰⵢⵉⵏ",
  "feat_title": "ⵎⴰ ⵉⵅⵚⵚⴰⵏ ⴰⴹ ⵜⵙⵡⵓⵔⵉⵜ ⵜⴰⴱⴰⵕⴰⵏⵜ ⵏⵏⴽ",
  "feat_sub": "ⵉⵎⴰⵙⵙⵏ ⵉⵜⵜⵓⵙⵏⴰⵍⴰⵏ ⵉ ⵡⴰⵙⵙ ⵏ ⵉⵙⵏⵉⵊⵉⵢⵏ ⵉⵎⵓⵔⴰⴽⵛⵉⵢⵏ.",
  "exclusive": "ⴰⵢⴷⵉⵏ",
  "feat_1_title": "ⴰⵙⵉⵜ ⵙ ⵜⵓⴳⵜ ⵏ ⵜⵓⵜⵍⴰⵢⵉⵏ",
  "feat_1_desc": "ⴰⵙⵉⵜ ⴰⵅⴰⵜⴰⵔ ⵙ ⵜⴼⵔⴰⵏⵙⵉⵙⵜ, ⴷ ⵜⴰⵄⵔⴰⴱⵜ, ⴷ ⵜⵎⴰⵣⵉⵖⵜ, ⴷ ⵜⵏⴳⵍⵉⵣⵜ, ⵉⵃⴹⴰⵏ ⴳ ⵜⵓⵙⴷⴰⴷⵉⵏ.",
  "feat_2_title": "ⴰⵙⵏⵓⴱⴳ ⵏ ⵜⵎⵉⵔⵉⵜ ⵖⴼ ⵍⵉⵏⵜⵉⵔⵏⵉⵜ",
  "feat_2_desc": "ⵉⵎⵓⴷⴰⵏ ⵏⵏⴽ ⵙⵏⵓⴱⴳⵏ 24/7 ⵙ ⵢⴰⵏ ⵓⵙⵏⵉⵊ ⵉⵎⵔⵡⴰⵙⵏ ⴷ ⵓⵙⵉⵜ ⵏⵏⴽ.",
  "feat_3_title": "ⴰⴽⴰⵔⴹ ⵓⵎⴷⵉⵏ ⴰⴷⵉⵊⵉⵟⴰⵍ",
  "feat_3_desc": "ⴰⵎⵣⵔⵓⵢ, ⵜⵉⵎⵙⴰⵍ ⴷ ⵉⵎⵓⵙⵙⵓⵜⵏ ⵙ ⵡⴰⵎⵎⴰⵙ, ⵙ ⵜⵏⵎⵎⵏⵜ.",
  "feat_4_title": "ⴰⴷⵍⵉⵙ ⵏ ⵜⵏⴼⵍⵉⵜⵉⵏ ⴰⴷⵉⵊⵉⵟⴰⵍ",
  "feat_4_desc": "ⴹⴼⵕ ⵜⵏⴼⵍⵉⵜⵉⵏ ⵏ ⴽⵓ ⴰⵎⵓⴷⴰⵏ, ⴱⵍⴰ ⴰⴷⵍⵉⵙ ⵏ ⵓⵙⵏⵖⵉⴼ.",
  "feat_5_title": "ⵉⵙⵔⵓⵔⵏ ⵏ ⵡⵓⵖⵖⵓ OMS",
  "feat_5_desc": "ⴰⴹⴼⵓⵕ ⵏ ⵡⵓⵖⵖⵓ ⵉⵎⵔⵡⴰⵙⵏ, ⵉⵜⵜⵡⴰⵙⵏⵉ ⴳ ⵜⵎⵙⴰⵍ ⵏⵏⴽ.",
  "feat_6_title": "ⵓⴳⴳⴰⵔ ⵏ ⵢⴰⵏ ⵓⵙⵏⵉⵊ",
  "feat_6_desc": "ⵙⵡⵓⵔⵉ ⴷ ⵓⴳⴳⴰⵔ ⵏ ⵢⴰⵏ ⵓⵙⵏⵉⵊ ⵙ ⵉⴷⴷⴰⵔⵏ ⵏ ⵓⵙⵓⵏⵓⵊ ⵉⵎⵥⵍⵉⵢⵏ.",
  "feat_7_title": "ⴰⴷⵍⵉⵙ ⵏ ⵓⵙⵉⵔⴳ",
  "feat_7_desc": "ⴰⵎⵣⵔⵓⵢ ⵓⵎⴷⵉⵏ ⵏ ⵉⴳⵉⵜⵏ ⵉ ⵓⵙⵉⵔⴳ ⵓⵎⴷⵉⵏ.",
  "feat_8_title": "ⵜⵉⴷⵢⵓⵜⵉⵏ ⵜⵉⵏⵉⴼⵉⵢⵏ",
  "feat_8_desc": "ⵥⵕ ⴰⵏⴰⵎⵎⵓⵙ ⵏ ⵜⴱⴰⵕⴰⵏⵜ ⵏⵏⴽ ⴷ ⵓⵎⵓⵙⵙⵓ ⵏⵏⵙ ⵙ ⵜⵓⵙⵙⴷⴰ.",
  "steps_eyebrow": "ⴰⵙⵏⴽⴷ",
  "steps_title": "ⴽⵕⴰⴹ ⵉⵎⵍⴰⵙⵙⵏ ⴰⴹ ⵜⴱⴷⴰⵜ",
  "steps_sub": "ⴰⵍⵓⴳⵏ ⴰⵙⴽⵉⵍ ⵏ ⵓⵙⵖⵉⵎ: ⴰⵙⵡⵓⵔⵉ, ⴰⵙⵡⵉⵔⴳ, ⴰⵙⵏⵜⴰⵎ.",
  "step_1_title": "ⵙⵜⵉ ⴰⵙⵡⵓⵔⵉ ⵏⵏⴽ",
  "step_1_desc": "ⴰⵙⵉⵜ, ⵜⵉⵎⵉⵔⵉⵏ ⵏⵉⵖ ⵜⴰⴱⴰⵕⴰⵏⵜ, ⵖⴼ ⵓⵙⵡⵉⵔ ⵏ ⵜⵃⵡⴰⵊⵉⵜ ⵏⵏⴽ.",
  "step_2_title": "ⵙⵡⵉⵔⴳ ⴰⴷⵖⴰⵔ ⵏⵏⴽ",
  "step_2_desc": "ⴰⵔⴰ ⵜⴰⵣⵣⴰⵍⵜ ⵏⵏⴽ, ⴰⴷⵖⴰⵔ ⵏⵏⴽ ⵖⴼ ⵍⵉⵏⵜⵉⵔⵏⵉⵜ ⴷ ⵉⵏⵖⵎⵉⵙⵏ ⵏⵏⴽ ⴳ ⵜⵓⵙⴷⴰⴷⵉⵏ.",
  "step_3_title": "ⵙⴷⵓ ⵉⵎⵓⴷⴰⵏ ⵖⴼ ⵍⵉⵏⵜⵉⵔⵏⵉⵜ",
  "step_3_desc": "ⴰⵙⵉⵜ ⴷ ⵓⵙⵏⵉⵊ ⵏⵏⴽ ⵉⵃⴹⴰⵏ ⴰⴹ ⵙⵡⵓⵔⵉⵏ ⵙⴳⵉⴷ.",
  "demo_eyebrow": "ⴱⵍⴰ ⴰⵙⵖⵉⵎ",
  "demo_title": "ⵊⵔⵔⴱ ⵙ ⵓⴼⵓⵙ ⵏⵏⴽ",
  "demo_sub": "ⵙⵙⵉⴽⵣ ⵜⴰⴱⴰⵕⴰⵏⵜ ⵏ ⵓⵙⴽⵉⵔⴷ ⵙ ⵉⴼⵙⴽⴰ ⵉⵏⴰⵎⴽⴰⵍⵏ: ⴰⵙⵏⵉⵊ, ⵉⴽⴰⵔⴹⵏ ⵏ ⵉⵎⵓⴷⴰⵏ, ⵉⵎⵓⵙⵙⵓⵜⵏ ⴷ ⵡⴰⵢⵢⴰⴹ.",
  "demo_email_label": "ⵉⵎⴰⵢⵍ",
  "demo_pwd_label": "ⵜⴰⴳⵓⵔⵉ ⵏ ⵓⵣⵔⴰⵡ",
  "demo_card_title": "ⵜⴰⴱⴰⵕⴰⵏⵜ ⵏ ⵓⵙⴽⵉⵔⴷ",
  "demo_card_sub": "ⴱⵍⴰ ⴽⴰⵕⴹⴰ ⵏ ⵍⴱⴰⵏⴽⴰ, ⴱⵍⴰ ⴰⵙⵖⵉⵎ. ⴽⵛⵎ ⵙⵙⵉⴽⵣ ⴳ ⵍⵃⵓⵔⵉⵢⴰ.",
  "demo_card_cta": "ⴽⵛⵎ ⵖⵔ ⵜⵎⴰⵡⵜ",
  "price_eyebrow": "ⵉⵙⵡⵓⵔⵉⵢⵏ",
  "price_title": "ⴰⵙⵡⵓⵔⵉ ⵉ ⴽⵓ ⴰⵙⵡⵉⵔ ⵏ ⵜⵡⵓⵔⵉ ⵏⵏⴽ",
  "price_sub": "ⴱⴷⵓ ⵙ ⴱⴰⵟⴰⵍ, ⴰⵍⵉ ⵖⵔ ⵓⴳⴳⴰⵔ ⵏ ⵜⵎⵙⵙⵍⴰⵢⵉⵏ ⵎⵔⴰ ⵜⵃⴹⴰⵜ.",
  "price_vitrine": "ⴰⵙⵉⵜ",
  "price_free": "ⴱⴰⵟⴰⵍ",
  "price_vitrine_note": "ⴰⴹ ⵜⵉⵍⵉⵜ ⵖⴼ ⵍⵉⵏⵜⵉⵔⵏⵉⵜ, ⴱⵍⴰ ⴰⵙⵡⵓⵔⵉ",
  "price_rdv_note": "ⴰⴹ ⵓⵔ ⵜⵙⵡⵓⵔⵉⵜ ⴰⵙⵏⵉⵊ ⵙ ⵜⵉⵍⵉⴼⵓⵏ",
  "price_cabinet_note": "+199 MAD/ⴰⵢⵢⵓⵔ ⵉ ⴽⵓ ⵓⵙⵏⵉⵊ ⵓⵔⵏⵉ",
  "price_month": "ⴰⵢⵢⵓⵔ",
  "price_ribbon": "ⴰⴽⴽⵯ ⴰⵎⴷⵉⵏ",
  "price_cabinet": "ⵜⴰⴱⴰⵕⴰⵏⵜ",
  "price_vitrine_f1": "ⴰⵙⵉⵜ ⴰⵅⴰⵜⴰⵔ ⵉⵜⵜⵡⴰⵙⵡⵉⵔⴳⵏ",
  "price_vitrine_f2": "4 ⵜⵓⵜⵍⴰⵢⵉⵏ (fr/en/ar/tzm)",
  "price_vitrine_f3": "ⴰⵙⵉⴳⵣ ⵉⵎⵔⵡⴰⵙⵏ",
  "price_vitrine_f4": "ⴰⵙⵏⵓⴱⴳ ⵉⵜⵜⵡⴰⵙⵏⵉ",
  "price_vitrine_f5": "ⵉⵙⵎ ⵏ ⵓⴷⵖⴰⵔ ⵉⵜⵜⵡⴰⵙⵡⵉⵔⴳⵏ",
  "price_rdv_f1": "ⵎⴰⵕⵕⴰ ⴰⵙⵉⵜ, ⴷ ⵓⵔⵏⵉ:",
  "price_rdv_f2": "ⴰⵙⵏⵓⴱⴳ ⵏ ⵜⵎⵉⵔⵉⵜ ⵖⴼ ⵍⵉⵏⵜⵉⵔⵏⵉⵜ",
  "price_rdv_f3": "ⴰⵙⵏⵉⵊ ⵉⵎⵔⵡⴰⵙⵏ",
  "price_rdv_f4": "ⵉⵏⵖⵎⵉⵙⵏ ⵉⵡⵓⵔⵎⴰⵏⵏ",
  "price_cabinet_f1": "ⵎⴰⵕⵕⴰ ⵜⵉⵎⵉⵔⵉⵏ, ⴷ ⵓⵔⵏⵉ:",
  "price_cabinet_f2": "ⴰⴽⴰⵔⴹ ⵓⵎⴷⵉⵏ ⴰⴷⵉⵊⵉⵟⴰⵍ",
  "price_cabinet_f3": "ⴰⴷⴷⴰⵔ ⵏ ⵓⵙⵓⵏⵓⵊ",
  "price_cabinet_f4": "ⵜⴰⵎⵙⴰⵍ + ⴰⵎⵓⵙⵙⵓ",
  "price_cabinet_f5": "ⴰⴷⵍⵉⵙ ⵏ ⵜⵏⴼⵍⵉⵜⵉⵏ",
  "price_cabinet_f6": "ⵉⵙⵔⵓⵔⵏ ⵏ ⵡⵓⵖⵖⵓ",
  "price_cabinet_f7": "ⵓⴳⴳⴰⵔ ⵏ ⵢⴰⵏ ⵓⵙⵏⵉⵊ",
  "price_cabinet_f8": "ⴰⴷⵍⵉⵙ ⵏ ⵓⵙⵉⵔⴳ",
  "price_cabinet_f9": "ⴰⵙⵓⴷⵙ ⴰⵎⵣⵡⴰⵔⵓ",
  "price_cta_vitrine": "ⴱⴷⵓ ⵙ ⴱⴰⵟⴰⵍ",
  "price_cta_rdv": "ⴱⴷⵓ",
  "price_cta_cabinet": "ⵙⵙⵓⵜⵔ ⵜⴰⵎⴰⵡⵜ",
  "price_fineprint": "ⵎⴰⵕⵕⴰ ⵉⵙⵡⵓⵔⵉⵢⵏ ⵙ ⵓⴷⵔⵉⵎ ⴰⵎⵔⵔⵓⴽⵉ (MAD).",
  "sec_eyebrow": "ⵜⵓⴽⵯⵙⴰ",
  "sec_title": "ⵜⵉⵏⵎⵎⵏⵜ ⵏ ⵉⵎⵓⴷⴰⵏ ⵏⵏⴽ, ⴰⵎⵣⵡⴰⵔⵓ ⵏⵏⵖ",
  "sec_1_title": "ⴰⵙⵏⵓⴱⴳ ⵉⵎⵎⵏⵏⴻⵏ",
  "sec_1_desc": "ⵜⴰⵖⵡⴰⵏⵜ ⵉⵜⵜⵡⴰⵙⵏⴰⵍⴰⵏ ⴷ ⵉⵜⵜⵡⴰⵙⵉⵔⴳⵏ",
  "sec_2_title": "ⴰⵣⵔⴼ 09-08",
  "sec_2_desc": "ⵉⵣⴷⵉ ⴷ ⵓⵙⵟⴰⵕ ⵏ ⵉⴼⵙⴽⴰ ⵉⵎⴰⵏⴻⵏ",
  "sec_3_title": "ⵜⴰⵏⵖⵍⵉⵙⵜ ⴽⵓ ⴰⵙⵙ",
  "sec_3_desc": "ⵉⴼⵙⴽⴰ ⵏⵏⴽ ⵜⵜⵡⴰⴷⵍⴰⵏ ⵙ ⵓⵡⵓⵔⵎⴰⵏ",
  "sec_4_title": "ⴰⴽⵛⴰⵎ ⵙ ⵓⵙⵡⵉⵔ",
  "sec_4_desc": "ⴰⵙⵏⵉⵊ ⴷ ⵓⵙⴽⴽⵉⵔ, ⴽⵓ ⵢⴰⵏ ⵙ ⵓⵙⵡⵉⵔ ⵏⵏⵙ",
  "sec_fact": "🏥 ⵉⵜⵜⵡⴰⵙⵡⵓⵔⵉ ⵢⴰⴷ ⴳ ⵜⵉⵍⴰⵡⵜ ⵙ ⵢⴰⵏ ⵓⵙⵏⵉⵊ ⴰⵔⴱⴰⵔ ⴷⴻⴳ ⵉⵏⵣⴳⴳⴰⵏ.",
  "faq_eyebrow": "ⵉⵙⵇⵙⵉⵜⵏ ⵏⵏⴰ ⵉⵜⵜⵉⵍⵉⵏ ⴽⵉⴳⴰⵏ",
  "faq_title": "ⵎⴰ ⵉⴽⴽⴰⵏ ⴰⴷ ⴷⵉⵙ ⵜⵙⵇⵙⴰⵜ ⵉⵏⵜⴰ",
  "faq_1_q": "ⵉⵙ ⵉⵅⵚⵚⴰ ⴰⴹ ⵙⴱⴷⴷⵖ ⴰⵀⵉⵍ ?",
  "faq_1_a": "ⵓⵀⵓ. ⴰⵙⵉⵜ ⵉⵙⵡⵓⵔⵉ ⵙⴳⵉⴷ ⴳ ⵉⵎⵉⵏⵉⴳ ⵏⵏⴽ, ⵖⴼ ⵓⵙⵍⴽⵉⵎ ⵏⵉⵖ ⵖⴼ ⵓⵎⵓⴱⴰⵢⵍ.",
  "faq_2_q": "ⵣⵎⵔⵖ ⴰⴹ ⴱⴷⴷⵍⵖ ⴰⵙⵡⵓⵔⵉ ⵔⴰⴷ ?",
  "faq_2_a": "ⵢⴰⵀ, ⵜⵣⵎⵔⵜ ⴰⴹ ⵜⴰⵍⵉⵜ ⵖⵔ ⵓⵙⵡⵓⵔⵉ ⵓⴼⵍⴰⵢ ⴳ ⴽⵓ ⴰⴽⵓⴷ ⵙⴳ ⵓⴷⵖⴰⵔ ⵏⵏⴽ.",
  "faq_3_q": "ⵎⴰⵏⵉⴽ ⵉⵙⵡⵓⵔⵉ ⵓⵙⵡⵓⵔⵉ ⵉ ⵓⴳⴳⴰⵔ ⵏ ⵢⴰⵏ ⵓⵙⵏⵉⵊ ?",
  "faq_3_a": "ⴰⵙⵡⵓⵔⵉ ⵏ ⵜⴱⴰⵕⴰⵏⵜ ⵉⴱⴷⴰ ⵙ 499 MAD/ⴰⵢⵢⵓⵔ ⵉ ⵢⴰⵏ ⵓⵙⵏⵉⵊ, ⵉⵎⵉⴽ +199 MAD/ⴰⵢⵢⵓⵔ ⵉ ⴽⵓ ⵓⵙⵏⵉⵊ ⵓⵔⵏⵉ.",
  "faq_4_q": "ⵉⵙ ⵉⴼⵙⴽⴰ ⵏ ⵉⵎⵓⴷⴰⵏ ⵉⵎⵎⵏⵏⴻⵏ ?",
  "faq_4_a": "ⵢⴰⵀ. ⵉⴼⵙⴽⴰ ⵏⵏⴽ ⵜⵜⵡⴰⵙⵏⵓⴱⴳⴰⵏ ⵙ ⵜⵏⵎⵎⵏⵜ, ⵙ ⵜⵏⵖⵍⵉⵙⵉⵏ ⵜⵉⵡⵓⵔⵎⴰⵏⵉⵏ ⴽⵓ ⴰⵙⵙ.",
  "faq_5_q": "ⵣⵎⵔⵖ ⴰⴹ ⵊⵔⵔⴱⵖ ⵓⵖⴱⵍ ⴰⴷ ⵣⵣⴰⵢⵖ ?",
  "faq_5_a": "ⵢⴰⵀ, ⵜⴰⵎⴰⵡⵜ ⵜⵍⵍⴰ ⴳ ⵍⵃⵓⵔⵉⵢⴰ, ⴱⵍⴰ ⴽⴰⵕⴹⴰ ⵏ ⵍⴱⴰⵏⴽⴰ ⵡⴰⵍⴰ ⴰⵙⵖⵉⵎ ⵓⵣⵡⴰⵔ.",
  "faq_6_q": "ⵉⵙ ⴰⵙⵓⴷⵙ ⵉⵍⵍⴰ ⵙ ⵜⴼⵔⴰⵏⵙⵉⵙⵜ ?",
  "faq_6_a": "ⵢⴰⵀ, ⵜⴰⵔⴰⴱⴱⵓⵜ ⵏⵏⵖ ⴰⴽⴽⵯ ⵜⵎⵓⵏ ⴷⵉⴷⴽ ⵙ ⵜⴼⵔⴰⵏⵙⵉⵙⵜ, ⴷ ⵙ ⵜⴰⵄⵔⴰⴱⵜ ⵎⵍⴰ ⵉⵅⵚⵚⴰ.",
  "cta_title": "ⵉⵙ ⵜⵃⴹⴰⵜ ⴰⴹ ⵜⵙⴷⵓⵙⵜ ⵜⴰⵙⵡⵓⵔⵉ ⵏ ⵜⴱⴰⵕⴰⵏⵜ ⵏⵏⴽ ?",
  "cta_sub": "ⵎⵓⵏ ⴷ ⵉⵙⵏⵉⵊⵉⵢⵏ ⵏⵏⴰ ⵉⴽⵯⵙⵏ ⴳ ⵓⵙⵉⵜ ⵏⵏⵖ.",
  "cta_primary": "ⵊⵔⵔⴱ ⵜⴰⵎⴰⵡⵜ",
  "cta_secondary": "ⵥⵕ ⵉⵙⵡⵓⵔⵉⵢⵏ",
  "footer_desc": "ⴰⵙⵉⵜ ⵏ ⵓⵙⵡⵓⴷⴷⵓ ⵉⵜⵜⵓⵙⵏⴰⵍⴰⵏ ⵉ ⵜⴱⴰⵕⴰⵏⵉⵏ ⵜⵉⵙⵏⵉⵊⴰⵏⵉⵏ ⵜⵉⵎⴰⵏⴻⵏⵉⵏ ⴷⴻⴳ ⵎⵓⵔⴰⴽⵓⵛ.",
  "footer_product": "ⴰⴼⴰⵔⵙ",
  "footer_support": "ⴰⵙⵓⴷⵙ",
  "footer_legal": "ⴰⵣⵔⴼⴰⵏ",
  "footer_legal_1": "ⵜⴰⵏⵏⴰⵢⵜ ⵏ ⵓⵣⵔⴼ",
  "footer_legal_2": "ⵜⵉⵏⵎⵎⵏⵜ",
  "footer_rights": "ⵎⴰⵕⵕⴰ ⵉⵣⵔⴼⴰⵏ ⵢⵓⵎⵥⵏ.",
  "footer_made": "ⵉⵜⵜⵡⴰⵙⴽⴰⵔ ⴷⴻⴳ ⵎⵓⵔⴰⴽⵓⵛ 🇲🇦"
}
```

Même technique que pour `ar.json` : ajouter une virgule après `}` fermant `dashboard`, insérer le bloc `"landing"`, puis refermer.

## Vérification

Après avoir fait les 3 modifications, lancer le build :
```bash
cd apps/frontend && pnpm build
```

Le build doit passer sans erreur. Vérifier spécifiquement qu'il n'y a pas d'erreur TypeScript sur l'import de `LanguageSwitcher` et que les JSON sont valides.
