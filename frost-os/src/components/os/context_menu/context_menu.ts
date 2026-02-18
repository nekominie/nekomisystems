import { reactive, nextTick } from 'vue';

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
};