import { requireTier } from '@/lib/tier-guard'
import NewPatientForm from './NewPatientForm'

export default async function NewPatientPage() {
  await requireTier(['cabinet'])
  return <NewPatientForm />
}
