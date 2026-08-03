import { s3Storage } from "@payloadcms/storage-s3";
import { buildConfig } from "payload";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import path from "path";
import { fileURLToPath } from "url";

import { Tenants } from "./src/collections/Tenants";
import { Users } from "./src/collections/Users";
import { Patients } from "./src/collections/Patients";
import { AuditLogs } from "./src/collections/AuditLogs";
import { AuditLedger } from "./src/collections/AuditLedger";
import { QueueItems } from "./src/collections/QueueItems";
import { Doctors } from "./src/collections/Doctors";
import { Services } from "./src/collections/Services";
import { Reviews } from "./src/collections/Reviews";
import { Media } from "./src/collections/Media";
import { PracticeInfo } from "./src/collections/PracticeInfo";
import { Consultations } from "./src/collections/Consultations";
import { Prescriptions } from "./src/collections/Prescriptions";
import { Documents } from "./src/collections/Documents";
import { SystemAlerts } from "./src/collections/SystemAlerts";
import { VaccineSchedule } from "./src/collections/VaccineSchedule";
import { Vaccinations } from "./src/collections/Vaccinations";
import { CalBookings } from "./src/collections/CalBookings";
import { Subscriptions } from "./src/collections/Subscriptions";
import { Templates } from "./src/collections/Templates";
import { ContactMessages } from "./src/collections/ContactMessages";
import { ReferringPractitioners } from "./src/collections/ReferringPractitioners";
import { AvailabilitySlots } from "./src/collections/AvailabilitySlots";
import { seed } from "./src/seed";
import { resolveTenant } from "./src/endpoints/resolve-tenant";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

const payloadSecret = process.env.PAYLOAD_SECRET;
if (!payloadSecret) throw new Error("PAYLOAD_SECRET manquant — impossible de démarrer en production sans ce secret.");

export default buildConfig({
  secret: payloadSecret,
  admin: {
    user: Users.slug,
  },
  collections: [
    Tenants,
    Users,
    Patients,
    AuditLogs,
    QueueItems,
    Doctors,
    Services,
    Reviews,
    Media,
    PracticeInfo,
    SystemAlerts,
    Consultations,
    Prescriptions,
    Documents,
    VaccineSchedule,
    Vaccinations,
    CalBookings,
    Subscriptions,
    Templates,
    ContactMessages,
    ReferringPractitioners,
    AvailabilitySlots,
    AuditLedger,
  ],
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI,
    },
    push: false,
  }),
  plugins: [
    s3Storage({
      collections: {
        media: true,
        documents: true,
      } as any,
      bucket: process.env.R2_BUCKET || "",
      config: {
        endpoint: process.env.R2_ENDPOINT || "",
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
        },
        region: "garage",
        forcePathStyle: true,
      },
    }),
  ],
  localization: {
    locales: ["fr", "en", "ar", "tzm"],
    defaultLocale: "fr",
    fallback: true,
  },
  editor: lexicalEditor({}),
  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },
  endpoints: [
    {
      path: '/resolve-tenant',
      method: 'get',
      handler: resolveTenant,
    },
  ],
  onInit: async (payload) => {
    if (process.env.PAYLOAD_SEED === "true") {
      await seed(payload);
    }
  },
});
