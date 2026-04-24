import { create } from "zustand";

export type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
};

type AddCartItemInput = {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity?: number;
};

export type CartState = {
  items: CartItem[];
  addItem: (item: AddCartItemInput) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
};

type StateUpdate = CartState | Partial<CartState> | ((state: CartState) => CartState | Partial<CartState>);
type SetState = (partial: StateUpdate) => void;

const sanitizeQuantity = (quantity: number | undefined): number => {
  if (!quantity || Number.isNaN(quantity)) {
    return 1;
  }

  return Math.max(1, Math.floor(quantity));
};

export const useCartStore = create<CartState>((set: SetState) => ({
  items: [],
  addItem: (item: AddCartItemInput) =>
    set((state: CartState) => {
      const quantityToAdd = sanitizeQuantity(item.quantity);
      const existingItem = state.items.find((cartItem: CartItem) => cartItem.id === item.id);

      if (existingItem) {
        return {
          items: state.items.map((cartItem: CartItem) =>
            cartItem.id === item.id
              ? {
                  ...cartItem,
                  quantity: cartItem.quantity + quantityToAdd,
                }
              : cartItem
          ),
        };
      }

      return {
        items: [
          ...state.items,
          {
            id: item.id,
            name: item.name,
            price: item.price,
            image: item.image,
            quantity: quantityToAdd,
          },
        ],
      };
    }),
  removeItem: (id: string) =>
    set((state: CartState) => ({
      items: state.items.filter((item: CartItem) => item.id !== id),
    })),
  updateQuantity: (id: string, quantity: number) =>
    set((state: CartState) => {
      if (quantity <= 0) {
        return {
          items: state.items.filter((item: CartItem) => item.id !== id),
        };
      }

      return {
        items: state.items.map((item: CartItem) =>
          item.id === id
            ? {
                ...item,
                quantity: sanitizeQuantity(quantity),
              }
            : item
        ),
      };
    }),
  clearCart: () => set({ items: [] }),
}));
