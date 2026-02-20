// os/os_api.ts
import type { InjectionKey } from 'vue'
import type { processInstructions } from '../os/process_manager'

export type OSApi = ReturnType<typeof processInstructions>
export const OS_KEY: InjectionKey<OSApi> = Symbol('OS_API')