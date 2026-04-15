declare module "nipplejs" {
  interface JoystickOptions {
    zone: HTMLElement;
    mode?: "static" | "dynamic" | "semi";
    position?: { left?: string; top?: string };
    color?: string;
    size?: number;
    restOpacity?: number;
    fadeTime?: number;
    multitouch?: boolean;
  }

  interface JoystickData {
    angle?: { radian: number; degree: number };
    force?: number;
    distance?: number;
    direction?: { x: string; y: string; angle: string };
  }

  interface JoystickManager {
    on(event: string, handler: (evt: unknown, data: JoystickData) => void): void;
    destroy(): void;
  }

  interface NippleJS {
    (options: JoystickOptions): JoystickManager;
    create(options: JoystickOptions): JoystickManager;
  }

  const nipplejs: NippleJS;
  export default nipplejs;
}
