export type DrawerView =
  | "default"
  | "mint"
  | "transfer"
  | "pending"
  | "error"
  | "success";

export type GalleryState = {
  activeArtworkId: number;
};

export type DrawerState = {
  isOpen: boolean;
  view: DrawerView;
};

export type AddressState = {
  resolved?: `0x${string}`;
};

export type NfcState = {
  status: "idle" | "scanning" | "success" | "error";
  chipId?: `0x${string}`;
  nonce?: `0x${string}`;
  error?: string;
  kind?: "mint" | "transfer";
  to?: `0x${string}`;
};

export type TxState = {
  status: "idle" | "pending" | "success" | "error";
  hash?: `0x${string}`;
  error?: string;
};

export type FlowState = {
  gallery: GalleryState;
  drawer: DrawerState;
  address: AddressState;
  nfc: NfcState;
  tx: TxState;
};

export type FlowAction =
  | { type: "gallery/setActiveArtworkId"; id: number }
  | { type: "drawer/open" }
  | { type: "drawer/close" }
  | { type: "drawer/setView"; view: DrawerView }
  | { type: "address/resolved"; value: `0x${string}` }
  | { type: "address/reset" }
  | { type: "nfc/startScan"; kind: "mint" | "transfer"; to: `0x${string}` }
  | { type: "nfc/success"; chipId: `0x${string}`; nonce: `0x${string}` }
  | { type: "nfc/error"; error: string }
  | { type: "nfc/reset" }
  | { type: "tx/success"; hash: `0x${string}` }
  | { type: "tx/error"; error: string }
  | { type: "tx/reset" }
  | { type: "flow/reset" };

export type FlowContextValue = {
  state: FlowState;
  dispatch: (action: FlowAction) => void;
  isGalleryLocked: boolean;
};

export const initialState: FlowState = {
  gallery: { activeArtworkId: 0 },
  drawer: { isOpen: false, view: "default" },
  address: {},
  nfc: { status: "idle" },
  tx: { status: "idle" },
};

export function flowReducer(state: FlowState, action: FlowAction): FlowState {
  switch (action.type) {
    case "gallery/setActiveArtworkId":
      return { ...state, gallery: { activeArtworkId: action.id } };
    case "drawer/open":
      return { ...state, drawer: { ...state.drawer, isOpen: true } };
    case "drawer/close":
      return {
        ...state,
        drawer: { isOpen: false, view: "default" },
        address: {},
        nfc: { status: "idle" },
        tx: { status: "idle" },
      };
    case "drawer/setView":
      return { ...state, drawer: { ...state.drawer, view: action.view } };
    case "address/resolved":
      return { ...state, address: { resolved: action.value } };
    case "address/reset":
      return { ...state, address: {} };
    case "nfc/startScan":
      return {
        ...state,
        nfc: { status: "scanning", kind: action.kind, to: action.to },
        drawer: { ...state.drawer, view: "pending" },
      };
    case "nfc/success":
      return {
        ...state,
        nfc: { status: "success", chipId: action.chipId, nonce: action.nonce },
      };
    case "nfc/error":
      return {
        ...state,
        nfc: { status: "error", error: action.error },
        drawer: { ...state.drawer, view: "error" },
      };
    case "nfc/reset":
      return { ...state, nfc: { status: "idle" } };
    case "tx/success":
      return {
        ...state,
        tx: { status: "success", hash: action.hash },
        drawer: { ...state.drawer, view: "success" },
      };
    case "tx/error":
      return {
        ...state,
        tx: { status: "error", error: action.error },
        drawer: { ...state.drawer, view: "error" },
      };
    case "tx/reset":
      return { ...state, tx: { status: "idle" } };
    case "flow/reset":
      return initialState;
    default:
      return state;
  }
}
