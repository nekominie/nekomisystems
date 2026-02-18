import { InstalledAppsIndex as UserApps } from '../apps/installedapps/apps_index.ts'
import { CoreAppsIndex as SystemApps } from '../apps/coreapps/core_apps_index.ts'

export const MasterAppRegistry: Record<string, any> = {
    ...UserApps,
    ...SystemApps
}