'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ProfileEditor from './ProfileEditor'
import ChangePasswordForm from './ChangePasswordForm'
import PracticeEditor from './PracticeEditor'
import ScheduleAndSlots from './ScheduleAndSlots'
import ServicesEditor from './ServicesEditor'
import SiteEditor from './SiteEditor'
import CalendarSettings from './CalendarSettings'
import SubscriptionSettings from './SubscriptionSettings'
import ManageAccounts from './ManageAccounts'
import ReferringPractitionersManager from './ReferringPractitionersManager'
import type { Subscription } from '@/lib/subscription'

type Props = {
  userId: string
  userEmail: string
  userName: string
  practicePhone: string
  isAdmin: boolean
  hasTenant: boolean
  tenantUsers: { id: string; email: string; name: string; roles: string[] }[]
  currentUserId: string
  subscription?: Subscription | null
}

const triggerClass = 'data-[state=active]:text-primary-700 data-[state=active]:font-semibold after:bg-primary-500'

export default function SettingsTabsContent({
  userId, userEmail, userName, practicePhone,
  isAdmin, hasTenant, tenantUsers, currentUserId, subscription,
}: Props) {
  return (
    <Tabs defaultValue="account" className="mt-8">
      <TabsList variant="line" className="mb-8 w-full justify-start gap-5 border-b border-warm lg:justify-center">
        <TabsTrigger value="account" className={triggerClass}>Mon compte</TabsTrigger>
        {isAdmin && hasTenant && <TabsTrigger value="team" className={triggerClass}>Équipe</TabsTrigger>}
        {isAdmin && hasTenant && <TabsTrigger value="practice" className={triggerClass}>Cabinet</TabsTrigger>}
        {isAdmin && hasTenant && <TabsTrigger value="site" className={triggerClass}>Site</TabsTrigger>}
        {isAdmin && hasTenant && <TabsTrigger value="calendar" className={triggerClass}>Calendrier</TabsTrigger>}
        {isAdmin && hasTenant && <TabsTrigger value="subscription" className={triggerClass}>Abonnement</TabsTrigger>}
        {hasTenant && <TabsTrigger value="referents" className={triggerClass}>Référents</TabsTrigger>}
      </TabsList>

      <TabsContent value="account">
        <div className="space-y-8">
          <ProfileEditor userId={userId} initialName={userName} initialEmail={userEmail} initialPhone={practicePhone} />
          <ChangePasswordForm userId={userId} />
        </div>
      </TabsContent>

      {isAdmin && hasTenant && (
        <TabsContent value="team">
          <ManageAccounts users={tenantUsers} currentUserId={currentUserId} isAdmin={isAdmin} />
        </TabsContent>
      )}

      {isAdmin && hasTenant && (
        <TabsContent value="practice">
          <div className="space-y-8">
            <PracticeEditor />
            <ScheduleAndSlots />
          </div>
        </TabsContent>
      )}

      {isAdmin && hasTenant && (
        <TabsContent value="site">
          <div className="space-y-8">
            <SiteEditor />
            <ServicesEditor />
          </div>
        </TabsContent>
      )}

      {isAdmin && hasTenant && (
        <TabsContent value="calendar">
          <CalendarSettings />
        </TabsContent>
      )}

      {isAdmin && hasTenant && (
        <TabsContent value="subscription">
          <SubscriptionSettings subscription={subscription ?? null} />
        </TabsContent>
      )}

      {hasTenant && (
        <TabsContent value="referents">
          <ReferringPractitionersManager />
        </TabsContent>
      )}
    </Tabs>
  )
}
