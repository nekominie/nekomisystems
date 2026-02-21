import { reactive, nextTick } from 'vue'
import { AppActionHandlers } from '../../data/app_actions_registry'
import type { App, Manifest } from '../../data/app'
import type { AppMenuContext, MenuResolveCtx, MenuItemDescriptor } from '../../data/types'

interface MenuOption {
    label?: string;
    icon?: string;
    action?: () => void;
    separator?: boolean;
    disabled?: boolean;
}

export const contextMenuState = reactive({
    isOpen: false,
    x: 0,
    y: 0,
    options: [] as MenuOption[]
});

export const useContextMenu = () => {
    const openMenu = async (e: MouseEvent, options: MenuOption[]) => {
        e.preventDefault()

        contextMenuState.options = options
        contextMenuState.isOpen = true

        await nextTick()

        const menuElement = document.querySelector('.context-menu') as HTMLElement

        if (menuElement) {
            const menuWidth = menuElement.offsetWidth;
            const menuHeight = menuElement.offsetHeight;
            const screenWidth = window.innerWidth;
            const screenHeight = window.innerHeight;
            
            let finalX = e.clientX
            let finalY = e.clientY

            if (finalX + menuWidth > screenWidth) {
                finalX = screenWidth - menuWidth -10;
            }

            if (finalY + menuHeight > screenHeight) {
                finalY = screenHeight - menuHeight - 10;
            }

            contextMenuState.x = finalX
            contextMenuState.y = finalY
        }
    };

    const closeMenu = () => {
        contextMenuState.isOpen = false;
    };

    return { openMenu, closeMenu, contextMenuState };
}

export function buildAppContextMenu(app: App, context: AppMenuContext, os: any) {
  const defs = app.manifest.menus?.[context] ?? defaultMenuForContext(context)

  const ctx: MenuResolveCtx = { app, context, os }

  const items = defs
    .filter(d => d.type !== 'item' || !d.when || d.when(ctx))
    .sort((a,b) => (a.order ?? 999) - (b.order ?? 999))
    .map(d => {
      if (d.type === 'separator') return { separator: true }

      const handler = AppActionHandlers[app.manifest.id]?.[d.id]
      return {
        label: d.label,
        icon: d.icon,
        action: () => handler?.(ctx)
      }
    })

  return items
}

function defaultMenuForContext(context: AppMenuContext): MenuItemDescriptor[] {
  if (context === 'taskbar') {
    return [
      { type: 'item', id: 'open', label: 'Abrir' },
      { type: 'separator' },
      { type: 'item', id: 'close', label: 'Cerrar' },
    ]
  }
  return [{ type: 'item', id: 'open', label: 'Abrir' }]
}