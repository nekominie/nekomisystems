import {  CoreSnippetsIndex as SystemSnippets } from '../snippets/core_snippets/core_snippets_index.ts'

export const MasterSnippetsRegistry: Record<string, any> = {
    ...SystemSnippets
}