import { useAuth } from '@/contexts/AuthContext';
import {
  Settings as SettingsIcon, User, Bell, Palette, Building2, Clock, FolderTree,
  LayoutGrid, Mail, Upload, Trash2, Brain, Sparkles, GraduationCap, Users, Shield,
  Activity, CreditCard, Briefcase, Database,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { SettingsLayout, SettingsSection } from '@/components/settings/SettingsLayout';

import { AccountProfileSection } from '@/components/settings/sections/AccountProfileSection';
import { NotificationsSection } from '@/components/settings/sections/NotificationsSection';
import { AppearanceSection } from '@/components/settings/sections/AppearanceSection';
import { SidebarPrefsSection } from '@/components/settings/sections/SidebarPrefsSection';
import { WorkScheduleSection } from '@/components/settings/sections/WorkScheduleSection';
import { OrgMembersSection } from '@/components/settings/sections/OrgMembersSection';
import { OrgGeneralSection, OrgSecuritySection, OrgActivitySection } from '@/components/settings/sections/OrgSections';
import { BillingSection } from '@/components/settings/sections/BillingSection';

import { ProjectCategoriesManager } from '@/components/settings/ProjectCategoriesManager';
import { ProjectFolderTemplatesManager } from '@/components/settings/ProjectFolderTemplatesManager';
import { EmailAccountSetup } from '@/components/settings/EmailAccountSetup';
import { DataManagementCard } from '@/components/settings/DataManagementCard';
import { BulkImportCard } from '@/components/settings/BulkImportCard';
import { PortalUserManager } from '@/components/portal/PortalUserManager';
import { AIUsageCard } from '@/components/settings/AIUsageCard';
import AIMemoryCard from '@/components/settings/AIMemoryCard';
import HelpTutorialsCard from '@/components/settings/HelpTutorialsCard';

const G = {
  ACCOUNT: 'Λογαριασμός',
  PERSONAL: 'Προσωποποίηση',
  ORG: 'Εταιρεία',
  DATA: 'Δεδομένα & Ενσωματώσεις',
  HELP: 'Βοήθεια',
};

export default function SettingsPage() {
  const { isAdmin } = useAuth();

  const sections: SettingsSection[] = [
    // Λογαριασμός
    {
      id: 'profile', label: 'Προφίλ', icon: User, group: G.ACCOUNT,
      description: 'Διαχειριστείτε τα στοιχεία και τον κωδικό του λογαριασμού σας',
      render: () => <AccountProfileSection />,
    },
    {
      id: 'notifications', label: 'Ειδοποιήσεις', icon: Bell, group: G.ACCOUNT,
      description: 'Ρυθμίστε πώς θέλετε να λαμβάνετε ειδοποιήσεις',
      render: () => <NotificationsSection />,
    },
    {
      id: 'schedule', label: 'Ωράριο Εργασίας', icon: Clock, group: G.ACCOUNT,
      description: 'Ορίστε τις ημέρες και ώρες που εργάζεστε',
      render: () => <WorkScheduleSection />,
    },

    // Προσωποποίηση
    {
      id: 'appearance', label: 'Εμφάνιση', icon: Palette, group: G.PERSONAL,
      description: 'Προσαρμόστε το θέμα της εφαρμογής',
      render: () => <AppearanceSection />,
    },
    {
      id: 'sidebar', label: 'Sidebar', icon: FolderTree, group: G.PERSONAL,
      description: 'Πώς οργανώνονται τα έργα στο sidebar',
      render: () => <SidebarPrefsSection />,
    },
    {
      id: 'ai-memory', label: 'AI Μνήμη', icon: Brain, group: G.PERSONAL,
      description: 'Διαχείριση των πληροφοριών που κρατάει ο AI assistant για εσάς',
      render: () => <AIMemoryCard />,
    },

    // Εταιρεία (admin)
    {
      id: 'org-general', label: 'Γενικά Εταιρείας', icon: Building2, group: G.ORG, visible: isAdmin,
      description: 'Στοιχεία, λογότυπο και ρυθμίσεις εταιρείας',
      render: () => <OrgGeneralSection />,
    },
    {
      id: 'org-members', label: 'Μέλη & Ρόλοι', icon: Users, group: G.ORG, visible: isAdmin,
      description: 'Διαχείριση χρηστών, ρόλων και προσκλήσεων',
      render: () => <OrgMembersSection />,
    },
    {
      id: 'org-security', label: 'Ασφάλεια Εταιρείας', icon: Shield, group: G.ORG, visible: isAdmin,
      description: 'SSO, domain verification και πολιτικές ασφαλείας',
      render: () => <OrgSecuritySection />,
    },
    {
      id: 'org-activity', label: 'Activity Log', icon: Activity, group: G.ORG, visible: isAdmin,
      description: 'Ιστορικό δραστηριότητας και ενεργειών',
      render: () => <OrgActivitySection />,
    },
    {
      id: 'billing', label: 'Billing', icon: CreditCard, group: G.ORG, visible: isAdmin,
      description: 'Συνδρομή, χρήση και μεθόδος πληρωμής',
      render: () => <BillingSection />,
    },

    // Δεδομένα & Ενσωματώσεις
    {
      id: 'project-categories', label: 'Κατηγορίες Έργων', icon: Briefcase, group: G.DATA, visible: isAdmin,
      description: 'Διαχείριση κατηγοριών για την οργάνωση έργων',
      render: () => <ProjectCategoriesManager />,
    },
    {
      id: 'folder-templates', label: 'Folder Templates', icon: LayoutGrid, group: G.DATA, visible: isAdmin,
      description: 'Πρότυπα φακέλων που εφαρμόζονται σε νέα έργα',
      render: () => <ProjectFolderTemplatesManager />,
    },
    {
      id: 'email', label: 'Email / Inbox', icon: Mail, group: G.DATA,
      description: 'Σύνδεση λογαριασμού email για inbox και αποστολή',
      render: () => <EmailAccountSetup />,
    },
    {
      id: 'import', label: 'Μαζική Εισαγωγή', icon: Upload, group: G.DATA, visible: isAdmin,
      description: 'Εισαγωγή δεδομένων από αρχεία CSV/Excel',
      render: () => <BulkImportCard />,
    },
    {
      id: 'data-mgmt', label: 'Διαχείριση Δεδομένων', icon: Trash2, group: G.DATA, visible: isAdmin,
      description: 'Μαζική διαγραφή κατηγοριών δεδομένων',
      render: () => <DataManagementCard />,
    },
    {
      id: 'ai-usage', label: 'AI Usage', icon: Sparkles, group: G.DATA, visible: isAdmin,
      description: 'Στατιστικά χρήσης των AI λειτουργιών',
      render: () => <AIUsageCard />,
    },
    {
      id: 'portal-users', label: 'Client Portal', icon: Database, group: G.DATA, visible: isAdmin,
      description: 'Χρήστες με πρόσβαση στο client portal',
      render: () => <PortalUserManager />,
    },

    // Βοήθεια
    {
      id: 'help', label: 'Tutorials & Help', icon: GraduationCap, group: G.HELP,
      description: 'Επανεκκίνηση tours και οδηγών χρήσης',
      render: () => <HelpTutorialsCard />,
    },
  ];

  return (
    <div className="page-shell">
      <PageHeader
        icon={SettingsIcon}
        title="Ρυθμίσεις"
        subtitle="Διαχείριση λογαριασμού και προτιμήσεων"
        breadcrumbs={[{ label: 'Ρυθμίσεις' }]}
      />
      <SettingsLayout sections={sections} defaultSectionId="profile" />
    </div>
  );
}
