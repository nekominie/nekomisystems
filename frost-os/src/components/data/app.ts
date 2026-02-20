export interface App{
    manifest: Manifest,
    runtime: Runtime,
    user: UserSettings
}

export interface Manifest{
    id: string;
    name: string;
    icon?: string;

    window?:{
        defaultSize: { width: number; height: number; }
        minSize?: { width: number; height: number };  
        maxSize?: { width: number; height: number };  
        startMaximized?: boolean;
    }

    capabilities?: {
        tray?: boolean;
        background?: boolean;
        notifications?: boolean;
    }

    preferences?:{
        minimizeToTray?: boolean;
        closeToTray?: boolean;
        startInTray?: boolean;
    }
}

export interface Runtime{
    isRunning: boolean;

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
    },

    isInTray: boolean;
    trayBadge?: number | boolean;
    trayStatus?: 'normal' | 'active' | 'warning' | 'error'

    previewImg? : string
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
