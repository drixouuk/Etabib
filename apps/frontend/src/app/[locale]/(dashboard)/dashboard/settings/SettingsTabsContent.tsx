'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ProfileEditor from './ProfileEditor'
import ChangePasswordForm from './ChangePasswordForm'
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

const triggerClass = 'data-[state=active]:text-primary-700 data-[state=active]:font-semibold after:bg-primary-500'

export default function SettingsTabsContent({
  userId, userEmail, userName, practicePhone,
  isAdmin, tenantUsers, currentUserId,
}: Props) {
  return (
    <Tabs defaultValue="account" className="mt-8">
      <TabsList variant="line" className="mb-8 w-full justify-center gap-6 border-b border-warm">
        <TabsTrigger value="account" className={triggerClass}>Mon compte</TabsTrigger>
        {isAdmin && <TabsTrigger value="team" className={triggerClass}>Équipe</TabsTrigger>}
        {isAdmin && <TabsTrigger value="practice" className={triggerClass}>Cabinet</TabsTrigger>}
        {isAdmin && <TabsTrigger value="site" className={triggerClass}>Site</TabsTrigger>}
        {isAdmin && <TabsTrigger value="calendar" className={triggerClass}>Calendrier</TabsTrigger>}
        {isAdmin && <TabsTrigger value="billing" className={triggerClass}>Facturation</TabsTrigger>}
        <TabsTrigger value="referents" className={triggerClass}>Référents</TabsTrigger>
      </TabsList>

      <TabsContent value="account">
        <div className="space-y-8">
          <ProfileEditor userId={userId} initialName={userName} initialEmail={userEmail} initialPhone={practicePhone} />
          <ChangePasswordForm userId={userId} />
        </div>
      </TabsContent>

      {isAdmin && (
        <TabsContent value="team">
          <ManageAccounts users={tenantUsers} currentUserId={currentUserId} />
        </TabsContent>
      )}

      {isAdmin && (
        <TabsContent value="practice">
          <div className="space-y-8">
            <PracticeEditor />
            <ScheduleEditor />
            <AvailabilityManager />
          </div>
        </TabsContent>
      )}

      {isAdmin && (
        <TabsContent value="site">
          <div className="space-y-8">
            <SiteEditor />
            <ServicesEditor />
          </div>
        </TabsContent>
      )}

      {isAdmin && (
        <TabsContent value="calendar">
          <CalendarSettings />
        </TabsContent>
      )}

      {isAdmin && (
        <TabsContent value="billing">
          <BillingSettings />
        </TabsContent>
      )}

      <TabsContent value="referents">
        <ReferringPractitionersManager />
      </TabsContent>
    </Tabs>
  )
}
