import { reactive } from 'vue';

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
    const openMenu = (e: MouseEvent, options: MenuOption[]) => {
        e.preventDefault();
        contextMenuState.isOpen = true;
        contextMenuState.x = e.clientX;
        contextMenuState.y = e.clientY;
        contextMenuState.options = options;
    };

    const closeMenu = () => {
        contextMenuState.isOpen = false;
    };

    return { openMenu, closeMenu, contextMenuState };
};