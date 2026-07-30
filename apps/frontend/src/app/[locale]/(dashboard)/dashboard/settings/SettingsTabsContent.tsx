'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ProfileEditor from './ProfileEditor'
import PracticeEditor from './PracticeEditor'
import ScheduleEditor from './ScheduleEditor'
import ServicesEditor from './ServicesEditor'
import SiteEditor from './SiteEditor'
import CalendarSettings from './CalendarSettings'
import BillingSettings from './BillingSettings'
import ManageAccounts from './ManageAccounts'
import ReferringPractitionersManager from './ReferringPractitionersManager'
import AvailabilityManager from './AvailabilityManager'

type Props = {
  userId: string
  userEmail: string
  userName: string
  practicePhone: string
  isAdmin: boolean
  tenantUsers: { id: string; email: string; name: string; roles: string[] }[]
  currentUserId: string
}

export default function SettingsTabsContent({
  userId, userEmail, userName, practicePhone,
  isAdmin, tenantUsers, currentUserId,
}: Props) {
  return (
    <Tabs defaultValue="profile" className="mt-8">
      <TabsList variant="line" className="mb-8 w-full justify-start gap-6 border-b border-warm">
        <TabsTrigger value="profile" className="data-[state=active]:text-primary-700 data-[state=active]:font-semibold after:bg-primary-500">
          Profil
        </TabsTrigger>
        {isAdmin && (
          <TabsTrigger value="accounts" className="data-[state=active]:text-primary-700 data-[state=active]:font-semibold after:bg-primary-500">
            Comptes
          </TabsTrigger>
        )}
        {isAdmin && <TabsTrigger value="practice">Cabinet</TabsTrigger>}
        {isAdmin && <TabsTrigger value="schedule">Horaires</TabsTrigger>}
        {isAdmin && <TabsTrigger value="services">Services</TabsTrigger>}
        {isAdmin && <TabsTrigger value="site">Site</TabsTrigger>}
        {isAdmin && <TabsTrigger value="calendar">Calendrier</TabsTrigger>}
        {isAdmin && <TabsTrigger value="billing">Facturation</TabsTrigger>}
        {isAdmin && (
          <TabsTrigger value="referents" className="data-[state=active]:text-primary-700 data-[state=active]:font-semibold after:bg-primary-500">
            Référents
          </TabsTrigger>
        )}
        {isAdmin && (
          <TabsTrigger value="availability" className="data-[state=active]:text-primary-700 data-[state=active]:font-semibold after:bg-primary-500">
            Disponibilités
          </TabsTrigger>
        )}
      </TabsList>

        <TabsContent value="profile">
          <ProfileEditor userId={userId} initialName={userName} initialEmail={userEmail} initialPhone={practicePhone} />
        </TabsContent>
        {isAdmin && <TabsContent value="practice"><PracticeEditor /></TabsContent>}
        {isAdmin && <TabsContent value="schedule"><ScheduleEditor /></TabsContent>}
        {isAdmin && <TabsContent value="services"><ServicesEditor /></TabsContent>}
        {isAdmin && <TabsContent value="site"><SiteEditor /></TabsContent>}
        {isAdmin && <TabsContent value="calendar"><CalendarSettings /></TabsContent>}
        {isAdmin && <TabsContent value="billing"><BillingSettings /></TabsContent>}

      {isAdmin && (
        <TabsContent value="accounts">
          <ManageAccounts users={tenantUsers} currentUserId={currentUserId} />
        </TabsContent>
      )}

      {isAdmin && (
        <TabsContent value="referents">
          <ReferringPractitionersManager />
        </TabsContent>
      )}

      {isAdmin && (
        <TabsContent value="availability">
          <AvailabilityManager />
        </TabsContent>
      )}
    </Tabs>
  )
}
