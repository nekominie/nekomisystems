import { MenuItemDescriptor, AppMenuContext } from '../data/types'

type SnippetKind = "flyout" | "widget"

export interface App{
    manifest: Manifest,
    runtime: Runtime,
    user: UserSettings
}

export interface Manifest{
    id: string;
    name: string;
    icon?: string;

    snippet?:{
        kind: SnippetKind;
        mount: "boot" | "onDemand" | "user";
    }

    window?:{
        defaultSize: { width: number; height: number; }
        minSize?: { width: number; height: number }
        maxSize?: { width: number; height: number }
        startMaximized?: boolean
        frameBg?: string,
        frameBlur?: string
    }

    capabilities?: {
        tray?: {
            canUse?: boolean,
            defaultAction?: string
        }
        background?: boolean;
        notifications?: boolean;
    }

    preferences?:{
        minimizeToTray?: boolean;
        closeToTray?: boolean;
        startInTray?: boolean;
    }

    transition?: string;

    menus?: Partial<Record<AppMenuContext, MenuItemDescriptor[]>>;
}

export interface Runtime{
    isRunning: boolean;
    isMounted?: boolean,
    isVisible?: boolean,

    isWindowOpen: boolean;
    isMinimized: boolean;
    isFocused: boolean;
    zIndex: number;  
    position: { x: number; y: number; };  
    size: { width: number; height: number; };
    isMaximized: boolean;  
    tempSettings?: {
        position: { x:number; y:number; };    
        size: { width: number; height: number; };
    };

    isInTray: boolean;
    trayBadge?: number | boolean;
    trayStatus?: 'normal' | 'active' | 'warning' | 'error'

    previewImg? : string,

    stats?: RuntimeStats
}

export interface RuntimeStats{
    startedAt: number
    cpuMsWindow: number
    cpuMsLast5s: number
    cpuWindowStartedAt: number
    memScore: number
    lastMemSampleAt: number
}

export interface UserSettings{
    isPinned: boolean,
    isPinnedStart: boolean,
    isPinnedDesktop: boolean,

    overrides?:{
        minimizeToTray?: boolean;
        closeToTray?: boolean;
        startInTray?: boolean;
    }
}
