/**
 * Ambient declarations for dependencies without proper typings.
 * Silences type errors in node_modules when type-checking the app.
 */
declare module "react-native/Libraries/Image/AssetSourceResolver" {
  export default class AssetSourceResolver {
    resourceIdentifierWithoutScale(): unknown;
  }
}

declare module "@react-native/assets-registry/registry" {
  export interface PackagerAsset {
    __packager_asset?: boolean;
    fileSystemLocation?: string;
    httpServerLocation?: string;
    width?: number;
    height?: number;
    scales?: number[];
    hash?: string;
    name?: string;
    type?: string;
  }
  export function getAssetByID(id: number): PackagerAsset;
}

declare module "invariant";
