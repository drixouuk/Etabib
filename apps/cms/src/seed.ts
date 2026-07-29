import type { Payload } from "payload";

const lexical = (text: string, dir: "ltr" | "rtl" = "ltr") => ({
  root: {
    type: "root",
    children: [
      {
        type: "paragraph",
        version: 1,
        children: [{ type: "text", text, version: 1 }],
      },
    ],
    direction: dir,
    format: "",
    indent: 0,
    version: 1,
  },
});

const lexicalMixed = (
  segments: { text: string; bold?: boolean }[],
  dir: "ltr" | "rtl" = "ltr",
) => ({
  root: {
    type: "root",
    children: [
      {
        type: "paragraph",
        version: 1,
        children: segments.map((s) => ({
          type: "text" as const,
          text: s.text,
          ...(s.bold ? { bold: true } : {}),
          version: 1,
        })),
      },
    ],
    direction: dir,
    format: "",
    indent: 0,
    version: 1,
  },
});

const SEED_DOMAIN = process.env.NEXT_PUBLIC_SITE_DOMAIN || 'etabibi.ma';

const TENANT_SLUG = "dr-guinane";
const TENANT_DOMAIN = `drguinane.${SEED_DOMAIN}`;

const DOCTOR_EMAIL = "drguinane@drixou.uk";

async function seedTenant(payload: Payload) {
  const existing = await payload.find({
    collection: "tenants",
    where: { domain: { equals: TENANT_DOMAIN } },
    limit: 1,
  });

  if (existing.docs.length > 0) {
    console.log("→ Tenant already exists, skipping");
    return existing.docs[0];
  }

  const tenant = await payload.create({
    collection: "tenants",
    data: {
      name: "Cabinet Pédiatrique Dr. Guinane Aïcha",
      domain: TENANT_DOMAIN,
      settings: {
        defaultLocale: "fr",
        activeTier: 'cabinet',
        specialty: "pediatrie",
      },
      calcomSettings: {
        eventSlug: "consultation-pediatrique",
        username: "drixou",
        customUrl: "",
      },
    },
  });

  console.log("✅ Tenant created");
  return tenant;
}

const ADMIN_EMAIL = process.env.SUPERADMIN_EMAIL || 'admin@etabibi.ma';

async function seedSuperadmin(payload: Payload) {
  const existing = await payload.find({
    collection: 'users',
    where: { roles: { contains: 'superadmin' } },
    limit: 1,
  });
  if (existing.docs.length > 0) {
    console.log('→ Superadmin already exists, skipping');
    return existing.docs[0];
  }
  const user = await payload.create({
    collection: 'users',
    data: {
      email: ADMIN_EMAIL,
      password: process.env.SEED_SUPERADMIN_PASSWORD ?? (() => { throw new Error('SEED_SUPERADMIN_PASSWORD manquant — définis cette variable d\'environnement avant de lancer le script.') })(),
      name: process.env.SUPERADMIN_NAME || 'SuperAdmin',
      roles: ['superadmin'],
    },
  });
  console.log('✅ Superadmin created');
  return user;
}

async function seedDoctorUser(payload: Payload, tenantId: any) {
  const existing = await payload.find({
    collection: "users",
    where: { email: { equals: DOCTOR_EMAIL } },
    limit: 1,
  });

  if (existing.docs.length > 0) {
    console.log("→ Doctor user already exists, skipping");
    return existing.docs[0];
  }

  const user = await payload.create({
    collection: "users",
    data: {
      email: DOCTOR_EMAIL,
      password: process.env.SEED_DOCTOR_PASSWORD ?? (() => { throw new Error('SEED_DOCTOR_PASSWORD manquant — définis cette variable d\'environnement avant de lancer le script.') })(),
      name: "Dr Guinane Aicha",
      roles: ["tenant_admin", "doctor"],
      tenant: tenantId,
    },
  });

  console.log("✅ Doctor user created");
  return user;
}

async function seedDoctor(payload: Payload, tenantId: any): Promise<any> {
  const existing = await payload.find({
    collection: "doctors",
    where: { slug: { equals: "dr-guinane-aicha" } },
    limit: 1,
  });

  let doctor: any;
  if (existing.docs.length === 0) {
    doctor = await payload.create({
      collection: "doctors",
      data: {
        tenant: tenantId,
        name: "Dr Guinane Aicha",
        slug: "dr-guinane-aicha",
        rpps: "—",
        languages: [{ language: "Français" }, { language: "العربية" }],
      } as any,
    });
  } else {
    doctor = existing.docs[0];
  }

  const localeData: Record<string, Record<string, any>> = {
    fr: {
      specialty: "Pédiatre",
      bio: lexical(
        "Dr Guinane Aicha est une pédiatre expérimentée avec plus de 20 ans de pratique dédiée au bien-être des enfants, de la naissance à l'adolescence. " +
          "Ancienne médecin au CHU Ibn Rochd de Casablanca et ancienne cheffe du service de pédiatrie à l'Hôpital Régional de Biougra, elle est diplômée de la Faculté de Médecine de Casablanca. " +
          "Aujourd'hui installée à Inezgane, elle accompagne les familles de la région Souss-Massa avec une médecine attentive, bienveillante et à l'écoute. " +
          'Consultations en français, arabe, darija et tamazight.',
      ),
    },
    en: {
      specialty: "Pediatrician",
      bio: lexical(
        "Dr. Guinane Aicha is an experienced pediatrician with over 20 years of practice dedicated to children's well-being, from birth to adolescence. " +
          "Former physician at the Ibn Rochd University Hospital (CHU) in Casablanca and former head of the pediatrics department at the Biougra Regional Hospital. " +
          "Graduate of the Faculty of Medicine of Casablanca. " +
          "Now based in Inezgane, she supports families in the Souss-Massa region with an attentive, caring, and mindful medical approach. " +
          'Consultations in French, Arabic, Darija and Tamazight.',
      ),
    },
    ar: {
      specialty: "طبيبة أطفال",
      bio: lexical(
        "الدكتورة كينان عائشة هي طبيبة أطفال ذات خبرة كبيرة، تفوق 20 سنة من الممارسة في رعاية الأطفال من الولادة وحتى سن المراهقة. " +
          "طبيبة سابقة بالمستشفى الجامعي ابن رشد بالدار البيضاء ورئيسة سابقة لقسم طب الأطفال بالمستشفى الإقليمي ببيوڭرى. " +
          "خريجة كلية الطب والصيدلة بالدار البيضاء. " +
          "تمارس حالياً في مدينة إنزكان، حيث تواكب عائلات جهة سوس ماسة برعاية طبية متميزة. " +
          'الاستشارات بالعربية والفرنسية والدارجة والأمازيغية.',
        "rtl",
      ),
    },
    // tzm non seedé intentionnellement : DATA_LOCALE['tzm'] → 'fr' côté frontend
    // et Payload localization.fallback: true renvoie le contenu fr pour tzm.
  };

  for (const [locale, data] of Object.entries(localeData)) {
    await payload.update({
      collection: "doctors",
      id: doctor.id,
      data: data as any,
      locale: locale as any,
    });
  }
  console.log("✅ Doctor seeded");
}

async function seedPracticeInfo(payload: Payload, tenantId: any) {
  const existing = await payload.find({
    collection: 'practice-info',
    where: { tenant: { equals: tenantId } },
    limit: 1,
  })

  const baseData = {
    phone: "+212528838618",
    coordinates: { lat: 30.3576702, lng: -9.5279038 },
    schedules: [
      { day: "Lun–Ven / الإثنين–الجمعة", open: "09:00", close: "16:30" },
      { day: "Sam / السبت", open: "09:00", close: "13:00" },
    ],
  };

  const localeData: Record<string, Record<string, any>> = {
    fr: {
      address:
        "Face au souk Al Houria, porte 10, Immeuble Nassim, 1er étage, bureau 4, Inezgane",
      city: "Inezgane, Maroc",
      tagline: "La santé de vos enfants, entre de bonnes mains",
      hoursNote: "Fermé le dimanche",
      paymentNote: "Paiement en espèces uniquement",
      pricing: lexicalMixed([
        { text: "Paiement en espèces uniquement. Consultation à partir de " },
        { text: "250 MAD", bold: true },
        { text: "." },
      ]),
    },
    en: {
      address:
        "Face au souk Al Houria, door 10, Immeuble Nassim, 1st floor, office 4, Inezgane",
      city: "Inezgane, Morocco",
      tagline: "Your children's health, in caring hands",
      hoursNote: "Closed on Sundays",
      paymentNote: "Cash only",
      pricing: lexicalMixed([
        { text: "Cash payment only. Consultation from " },
        { text: "250 MAD", bold: true },
        { text: "." },
      ]),
    },
    ar: {
      address:
        "أمام سوق الحورية، باب 10، عمارة نسيم، الطابق الأول، مكتب 4، إنزكان",
      city: "إنزكان، المغرب",
      tagline: "صحة أطفالكم في أيدٍ أمينة",
      hoursNote: "مغلق يوم الأحد",
      paymentNote: "الدفع نقداً فقط",
      pricing: lexicalMixed(
        [
          { text: "الدفع نقداً فقط. الاستشارة من " },
          { text: "250 درهم", bold: true },
          { text: "." },
        ],
        "rtl",
      ),
    },
  };

  for (const [locale, data] of Object.entries(localeData)) {
    if (locale === "fr") {
      if (existing.docs.length > 0) {
        await payload.update({
          collection: 'practice-info',
          id: existing.docs[0].id,
          data: { tenant: tenantId, ...baseData, ...data } as any,
          locale: "fr" as any,
        })
      } else {
        await payload.create({
          collection: 'practice-info',
          data: { tenant: tenantId, ...baseData, ...data } as any,
          locale: "fr" as any,
        })
      }
    } else {
      const id = existing.docs[0]?.id
      if (!id) continue
      await payload.update({
        collection: 'practice-info',
        id,
        data: data as any,
        locale: locale as any,
      })
    }
  }
  console.log("✅ PracticeInfo seeded");
}

async function seedReviews(payload: Payload, tenantId: any) {
  const existing = await payload.find({
    collection: "reviews",
    where: { tenant: { equals: tenantId } },
    limit: 1,
  });

  if (existing.docs.length > 0) {
    console.log("→ Reviews already exist, skipping");
    return;
  }

  const reviewsData = [
    {
      author: "Ahmed Sam",
      rating: 5,
      text: "Docteur très compétente, très à l'écoute, diagnostic rapide bronchite sévère chez ma fille, oxygène directement sur place. Elle prescrit juste ce qu'il faut. Je vous la recommande les yeux fermés.",
      date: "2025-11-25",
      source: "google",
    },
    {
      author: "Mohamed Lhbib AGUENAOU",
      rating: 5,
      text: "Très bonne pédiatre. Merci beaucoup dr.",
      date: "2026-01-25",
      source: "google",
    },
    {
      author: "Brahim Bouhouch",
      rating: 5,
      text: "Je recommande à 100% c'est une personne très sympathique et très professionnelle, très agréable et à l'écoute qui prend le temps d'expliquer et de rassurer les parents et l'enfant.",
      date: "2025-08-25",
      source: "google",
    },
    {
      author: "MB. PRODUCTION",
      rating: 5,
      text: "Je lui donnerai plus de 5 étoiles si je pouvais. Dr GUINANE AICHA est d'une extrême gentillesse et bienveillance, surtout pas matérialiste. Elle est toujours disponible et joignable.",
      date: "2025-06-25",
      source: "google",
    },
    {
      author: "Anouar El boukili",
      rating: 5,
      text: "Une des meilleures médecins. Dès notre première consultation, j'ai été impressionné par son professionnalisme et sa bienveillance. Elle a su mettre mon enfant à l'aise.",
      date: "2025-06-20",
      source: "google",
    },
    {
      author: "laila FOUAD",
      rating: 5,
      text: "Dre Guinane est une pédiatre très compétente. Elle fait preuve d'un grand professionnalisme et d'une patience remarquable, même dans les situations imprévues.",
      date: "2025-06-15",
      source: "google",
    },
    {
      author: "Halima KEDDAR",
      rating: 5,
      text: "Une pédiatre exceptionnelle, dotée d'une grande expertise et de traitements efficaces. Son approche avec les enfants est douce et professionnelle. Je la recommande vivement.",
      date: "2025-06-10",
      source: "google",
    },
    {
      author: "Inès NEJJAR",
      rating: 4,
      text: "Médecin humaine à l'écoute, très satisfaite de la consultation pour mon petit. Elle ne prescrit pas trop de médicaments. J'aimerais juste que l'accueil s'améliore.",
      date: "2025-06-05",
      source: "google",
    },
    {
      author: "Zayad Mariam",
      rating: 5,
      text: "Je vous la recommande sans hésiter, une pédiatre douce à l'écoute, humaine, professionnelle, toujours souriante. Ma petite fille vous adore. Merci Dr Guinane, tbark allah 3lik.",
      date: "2025-05-30",
      source: "google",
    },
    {
      author: "assia moutaaziz",
      rating: 5,
      text: "Médecin très compétente, humaine et attentive qui accorde le temps qu'il faut pour chaque patient. Je la recommande vivement.",
      date: "2025-05-25",
      source: "google",
    },
    {
      author: "imane shimou",
      rating: 5,
      text: "Dr Aicha une pédiatre attentionnée, compétente, elle a de l'intérêt pour le malade. Sincèrement elle est la meilleure, je la recommande vivement.",
      date: "2025-05-20",
      source: "google",
    },
  ];

  for (const review of reviewsData) {
    await payload.create({
      collection: "reviews",
      data: {
        tenant: tenantId,
        author: review.author,
        rating: review.rating,
        text: review.text,
        date: review.date,
        source: review.source as "google" | "direct",
        published: true,
      } as any,
      locale: "fr" as any,
    });
  }
  console.log("✅ 11 reviews seeded");
}

async function seedServices(payload: Payload, tenantId: any) {
  const existing = await payload.find({
    collection: "services",
    where: { tenant: { equals: tenantId } },
    limit: 1,
  });

  if (existing.docs.length > 0) {
    console.log("→ Services already exist, skipping");
    return;
  }

  const icons: Record<string, string> = {
    nourrisson: "Baby",
    vaccins: "Syringe",
    suivi: "HeartPulse",
    urgences: "Stethoscope",
    nutrition: "Apple",
    certificats: "FileCheck",
  };

  const slugs = Object.keys(icons);
  const localeData: Record<string, { title: string; description: string }[]> = {
    fr: [
      {
        title: "Consultation nourrisson",
        description:
          "Suivi du développement, courbes de croissance, conseils allaitement et nutrition",
      },
      {
        title: "Vaccinations",
        description:
          "Calendrier vaccinal complet selon le programme national marocain",
      },
      {
        title: "Suivi pédiatrique régulier",
        description:
          "Bilans de santé annuels, suivi scolaire, développement psychomoteur",
      },
      {
        title: "Consultations urgentes",
        description:
          "Fièvre, gastro-entérite, infections ORL, allergies — sans rendez-vous selon disponibilité",
      },
      {
        title: "Nutrition & diététique",
        description:
          "Conseils personnalisés pour une alimentation équilibrée à chaque âge",
      },
      {
        title: "Certificats médicaux",
        description:
          "Certificats de bonne santé, aptitude sportive, crèche et école",
      },
    ],
    en: [
      {
        title: "Infant consultation",
        description:
          "Development monitoring, growth charts, breastfeeding and nutrition advice",
      },
      {
        title: "Vaccinations",
        description:
          "Full vaccination schedule according to the Moroccan national program",
      },
      {
        title: "Regular check-ups",
        description:
          "Annual health check-ups, school follow-up, psychomotor development",
      },
      {
        title: "Urgent consultations",
        description:
          "Fever, gastroenteritis, ENT infections, allergies — walk-in subject to availability",
      },
      {
        title: "Pediatric nutrition",
        description: "Personalized advice for balanced nutrition at every age",
      },
      {
        title: "Medical certificates",
        description:
          "Health certificates, sports fitness, nursery and school certificates",
      },
    ],
    ar: [
      {
        title: "استشارة الرضيع",
        description: "متابعة النمو، منحنيات النمو، نصائح الرضاعة والتغذية",
      },
      {
        title: "التطعيمات",
        description: "جدول التطعيم الكامل وفق البرنامج الوطني المغربي",
      },
      {
        title: "المتابعة الدورية",
        description: "فحوصات صحية سنوية، متابعة مدرسية، التطور النفسحركي",
      },
      {
        title: "الاستشارات العاجلة",
        description:
          "الحمى، التهاب المعدة، عدوى الأنف والأذن والحنجرة، الحساسية",
      },
      {
        title: "التغذية والحمية",
        description: "نصائح شخصية لتغذية متوازنة في كل مرحلة عمرية",
      },
      {
        title: "الشهادات الطبية",
        description: "شهادات صحية، لياقة رياضية، دور الحضانة والمدارس",
      },
    ],
    tzm: [
      {
        title: "ⴰⵙⵏⵉⵊⵉ ⵏ ⵓⵊⴷⵉⵄ",
        description:
          "ⴰⵙⴻⴽⵛⴷ ⵏ ⵓⵏⵏⵉⵔⵉ, ⵜⵉⵖⵎⵔⵜ ⵏ ⵓⵏⵏⵉⵔⵉ, ⵜⵉⵏⴰⵜⵉⵏ ⵉ ⵜⵖⵓⵔⵉ ⴷ ⵜⴰⵍⵍⴻⵙⵜ",
      },
      {
        title: "ⵜⵉⵏⴼⵍⵉⵜⵉⵏ",
        description: "ⴰⵖⴰⵏⵉⴱ ⵏ ⵜⵏⴼⵍⵉⵜ ⴰⵎ ⵓⵖⴰⵏⵉⴱ ⴰⵎⴰⵜⵜⵓⵔ ⴰⵎⴰⵖⵔⵉⴱⵉ",
      },
      {
        title: "ⴰⵙⴻⴽⵛⴷ ⴰⵎⴰⵜⵓ",
        description: "ⵜⵉⴼⵔⴰⵏⵉⵏ ⵏ ⵓⵣⵔⴼ ⴰⵙⴳⴳⴰⵙ, ⴰⵙⴻⴽⵛⴷ ⵏ ⵜⵖⵓⵔⵉ, ⴰⵏⵏⵉⵔⵉ ⴰⵥⴰⵡⴰⵏ",
      },
      {
        title: "ⴰⵙⵏⵉⵊⵉ ⵏ ⵜⵎⵔⴰⵖⵜ",
        description: "ⵜⴰⵖⵣⵉ, ⵜⵉⵎⵙⴰⵍ ⵏ ⵉⴼⴰⵙⵙⵏ, ⵜⵉⵎⵙⴰⵍ ⵏ ⵉⵎⵉ ⴷ ⵉⵎⵣⵣⵓⵖⵏ, ⵜⴰⵖⵣⵉⵎⵜ",
      },
      {
        title: "ⵜⴰⵍⵍⴻⵙⵜ ⵏ ⵉⵣⴷⴰⵏⵏ",
        description: "ⵜⵉⵏⴰⵜⵉⵏ ⵉ ⵜⴰⵍⵍⴻⵙⵜ ⵜⴰⵎⵣⴷⴰⵢⵜ ⴷⴻⴳ ⴽⵓⵍ ⴰⵣⵎⵣ",
      },
      {
        title: "ⵜⵉⵣⵔⴰⵡⵉⵏ ⵏ ⵓⵣⵔⴼ",
        description: "ⵜⵉⵣⵔⴰⵡⵉⵏ ⵏ ⵓⵣⵔⴼ, ⵜⴰⵖⵓⵍⵜ ⵏ ⵓⵖⵔⴱⴰⵣ, ⵜⵉⵖⵉⵡⴰⵏⵉⵏ ⵏ ⵉⵖⵔⴱⴰⵣⵏ",
      },
    ],
  };

  const locales = ["fr", "en", "ar", "tzm"];

  for (let i = 0; i < slugs.length; i++) {
    const slug = slugs[i];
    const icon = icons[slug];

    let service: any;
    for (const locale of locales) {
      const items = localeData[locale] ?? localeData["fr"];
      const item = items[i];
      const data: Record<string, unknown> = {
        tenant: tenantId,
        title: item.title,
        icon,
        order: i + 1,
      };

      if (locale === "fr") {
        data.description = lexical(item.description);
        service = await payload.create({
          collection: "services",
          data: data as any,
          locale: "fr" as any,
        });
      } else {
        data.description = lexical(
          item.description,
          locale === "ar" ? "rtl" : "ltr",
        );
        await payload.update({
          collection: "services",
          id: service!.id,
          data: data as any,
          locale: locale as any,
        });
      }
    }
  }
  console.log("✅ 6 services seeded");
}

/***
 * Calendrier vaccinal (VaccineSchedule)
 *
 * ⚠️ ATTENTION — DONNÉES À VÉRIFIER PAR UN MÉDECIN
 * Ces dates et doses sont basées sur une recherche sur le calendrier vaccinal
 * marocain (PNI) mais peuvent contenir des erreurs, des omissions, ou des
 * différences avec la pratique réelle de Dr. Guinane.
 *
 * Avant toute utilisation avec des patients réels, Dr. Guinane DOIT :
 * 1. Vérifier chaque entrée dans l'admin Payload (collections → VaccineSchedule)
 * 2. Corriger/ajouter/supprimer des entrées selon son protocole
 * 3. Confirmer que le calendrier correspond à sa pratique
 *
 * Ces données NE SONT PAS une vérité absolue — elles amorcent juste le
 * référentiel pour qu'il soit éditable dans l'admin.
 */
async function seedVaccineSchedule(payload: Payload) {
  const existing = await (payload as any).find({
    collection: "vaccine-schedule",
    limit: 1,
  });

  if (existing.docs.length > 0) {
    console.log("→ Vaccine schedule already exists, skipping");
    return;
  }

  const entries = [
    { vaccineName: "BCG", doseLabel: "Dose unique", ageMonths: 0, order: 1 },
    { vaccineName: "Hépatite B", doseLabel: "Dose 1", ageMonths: 0, order: 2 },
    { vaccineName: "Pentavalent DTC-Hib-HepB", doseLabel: "Dose 1", ageMonths: 2, order: 3 },
    { vaccineName: "VPI", doseLabel: "Dose 1", ageMonths: 2, order: 4 },
    { vaccineName: "Pneumocoque", doseLabel: "Dose 1", ageMonths: 2, order: 5 },
    { vaccineName: "Pentavalent DTC-Hib-HepB", doseLabel: "Dose 2", ageMonths: 3, order: 6 },
    { vaccineName: "VPI", doseLabel: "Dose 2", ageMonths: 3, order: 7 },
    { vaccineName: "Pentavalent DTC-Hib-HepB", doseLabel: "Dose 3", ageMonths: 4, order: 8 },
    { vaccineName: "VPI", doseLabel: "Dose 3", ageMonths: 4, order: 9 },
    { vaccineName: "Pneumocoque", doseLabel: "Rappel", ageMonths: 4, order: 10 },
    { vaccineName: "Rougeole / ROR", doseLabel: "Dose 1", ageMonths: 9, order: 11 },
    { vaccineName: "ROR", doseLabel: "Dose 2", ageMonths: 12, order: 12 },
    { vaccineName: "Rappel DTC-Polio", doseLabel: "Rappel 18 mois", ageMonths: 18, order: 13 },
    { vaccineName: "Pneumocoque", doseLabel: "Rappel 18 mois", ageMonths: 18, order: 14 },
    { vaccineName: "HPV", doseLabel: "Dose 1", ageMonths: 132, order: 15, notes: "Filles uniquement" },
    { vaccineName: "HPV", doseLabel: "Dose 2", ageMonths: 138, order: 16, notes: "Filles uniquement" },
  ];

  for (const entry of entries) {
    await (payload as any).create({
      collection: "vaccine-schedule",
      data: entry,
    });
  }
  console.log("✅ Vaccine schedule seeded (16 entries)");
}

export async function seed(payload: Payload) {
  console.log("🌱 Starting seed...");

  const tenant = await seedTenant(payload);

  const doctorUser = await seedDoctorUser(payload, tenant.id as any);
  const doctorProfile = await seedDoctor(payload, tenant.id as any);

  // Lier User → Doctor
  if (doctorUser?.id && doctorProfile?.id) {
    const currentDoc = await (payload as any).findByID({ collection: 'users', id: doctorUser.id })
    if (!currentDoc?.doctorProfile) {
      await (payload as any).update({
        collection: 'users',
        id: doctorUser.id,
        data: { doctorProfile: doctorProfile.id },
      })
      console.log('✅ User lié à sa fiche médecin')
    }
  }
  await seedPracticeInfo(payload, tenant.id as any);
  await seedReviews(payload, tenant.id as any);
  await seedServices(payload, tenant.id as any);
  await seedVaccineSchedule(payload);

  console.log("🎉 Seed complete");
}
