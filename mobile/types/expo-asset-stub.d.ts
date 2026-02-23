declare module "expo-asset" {
  export class Asset {
    name: string;
    type: string;
    hash: string | null;
    uri: string;
    localUri: string | null;
    width?: number;
    height?: number;

    constructor(props: {
      name?: string;
      type?: string;
      hash?: string | null;
      uri: string;
      width?: number;
      height?: number;
    });

    static fromModule(moduleId: number | string | { uri: string }): Asset;
    static fromURI(uri: string): Asset;
    static loadAsync(moduleIds: (number | string)[]): Promise<Asset[]>;

    downloadAsync(): Promise<void>;
  }
}
