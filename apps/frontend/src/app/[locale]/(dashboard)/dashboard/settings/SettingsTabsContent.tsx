'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ProfileEditor from './ProfileEditor'
import ChangePasswordForm from './ChangePasswordForm'
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
        <div className="space-y-8">
          <ProfileEditor userId={userId} initialName={userName} initialEmail={userEmail} initialPhone={practicePhone} />
          <ChangePasswordForm userId={userId} />
        </div>
      </TabsContent>

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
