import * as migration_20260710_064021 from './20260710_064021';
import * as migration_20260716_add_system_alerts from './20260716_add_system_alerts';
import * as migration_20260716_fix_schedules_locales from './20260716_fix_schedules_locales';
import * as migration_20260717_205700 from './20260717_205700';
import * as migration_20260720_add_patient_contact_fields from './20260720_add_patient_contact_fields';
import * as migration_20260721_add_calbookings from './20260721_add_calbookings';
import * as migration_20260721_add_vaccine_schedule_vaccinations from './20260721_add_vaccine_schedule_vaccinations';
import * as migration_20260722_add_clinical_fields from './20260722_add_clinical_fields';
import * as migration_20260722_add_doctor_profile from './20260722_add_doctor_profile';
import * as migration_20260722_add_queue_doctor from './20260722_add_queue_doctor';
import * as migration_20260722_add_specialty from './20260722_add_specialty';
import * as migration_20260722_add_substitute_role from './20260722_add_substitute_role';
import * as migration_20260722_add_templates from './20260722_add_templates';
import * as migration_20260723_add_contact_messages from './20260723_add_contact_messages';
import * as migration_20260723_add_patient_scoped_access from './20260723_add_patient_scoped_access';
import * as migration_20260723_add_patient_source from './20260723_add_patient_source';
import * as migration_20260723_add_referring_practitioners from './20260723_add_referring_practitioners';
import * as migration_20260723_add_vaccination_extensions from './20260723_add_vaccination_extensions';
import * as migration_20260723_fix_patients_rels from './20260723_fix_patients_rels';
import * as migration_20260727_103522 from './20260727_103522';
import * as migration_20260728_123232 from './20260728_123232';

export const migrations = [
  {
    up: migration_20260710_064021.up,
    down: migration_20260710_064021.down,
    name: '20260710_064021',
  },
  {
    up: migration_20260716_add_system_alerts.up,
    down: migration_20260716_add_system_alerts.down,
    name: '20260716_add_system_alerts',
  },
  {
    up: migration_20260716_fix_schedules_locales.up,
    down: migration_20260716_fix_schedules_locales.down,
    name: '20260716_fix_schedules_locales',
  },
  {
    up: migration_20260717_205700.up,
    down: migration_20260717_205700.down,
    name: '20260717_205700',
  },
  {
    up: migration_20260720_add_patient_contact_fields.up,
    down: migration_20260720_add_patient_contact_fields.down,
    name: '20260720_add_patient_contact_fields',
  },
  {
    up: migration_20260721_add_calbookings.up,
    down: migration_20260721_add_calbookings.down,
    name: '20260721_add_calbookings',
  },
  {
    up: migration_20260721_add_vaccine_schedule_vaccinations.up,
    down: migration_20260721_add_vaccine_schedule_vaccinations.down,
    name: '20260721_add_vaccine_schedule_vaccinations',
  },
  {
    up: migration_20260722_add_clinical_fields.up,
    down: migration_20260722_add_clinical_fields.down,
    name: '20260722_add_clinical_fields',
  },
  {
    up: migration_20260722_add_doctor_profile.up,
    down: migration_20260722_add_doctor_profile.down,
    name: '20260722_add_doctor_profile',
  },
  {
    up: migration_20260722_add_queue_doctor.up,
    down: migration_20260722_add_queue_doctor.down,
    name: '20260722_add_queue_doctor',
  },
  {
    up: migration_20260722_add_specialty.up,
    down: migration_20260722_add_specialty.down,
    name: '20260722_add_specialty',
  },
  {
    up: migration_20260722_add_substitute_role.up,
    down: migration_20260722_add_substitute_role.down,
    name: '20260722_add_substitute_role',
  },
  {
    up: migration_20260722_add_templates.up,
    down: migration_20260722_add_templates.down,
    name: '20260722_add_templates',
  },
  {
    up: migration_20260723_add_contact_messages.up,
    down: migration_20260723_add_contact_messages.down,
    name: '20260723_add_contact_messages',
  },
  {
    up: migration_20260723_add_patient_scoped_access.up,
    down: migration_20260723_add_patient_scoped_access.down,
    name: '20260723_add_patient_scoped_access',
  },
  {
    up: migration_20260723_add_patient_source.up,
    down: migration_20260723_add_patient_source.down,
    name: '20260723_add_patient_source',
  },
  {
    up: migration_20260723_add_referring_practitioners.up,
    down: migration_20260723_add_referring_practitioners.down,
    name: '20260723_add_referring_practitioners',
  },
  {
    up: migration_20260723_add_vaccination_extensions.up,
    down: migration_20260723_add_vaccination_extensions.down,
    name: '20260723_add_vaccination_extensions',
  },
  {
    up: migration_20260723_fix_patients_rels.up,
    down: migration_20260723_fix_patients_rels.down,
    name: '20260723_fix_patients_rels',
  },
  {
    up: migration_20260727_103522.up,
    down: migration_20260727_103522.down,
    name: '20260727_103522',
  },
  {
    up: migration_20260728_123232.up,
    down: migration_20260728_123232.down,
    name: '20260728_123232'
  },
];
