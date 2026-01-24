export interface AppConfig {
  id: string;
  name: string;
  icon: string; // Ruta de la imagen o clase de FontAwesome
  isOpen: boolean;
  isMinimized: boolean;
  zIndex: number;
  position: {
    x: number;
    y: number;
  };
  size: {
    width: number;
    height: number;
  };
}