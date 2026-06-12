import {
  ShoppingCart,
  Newspaper,
  Users,
  PackageOpen,
  KeyRound,
  CreditCard,
  Image,
  Plug,
  BarChart3,
  Languages,
  Bell,
  Box,
  type LucideIcon,
} from "lucide-react";

// Maps the string icon name stored on module data to a lucide component.
const MAP: Record<string, LucideIcon> = {
  ShoppingCart,
  Newspaper,
  Users,
  PackageOpen,
  KeyRound,
  CreditCard,
  Image,
  Plug,
  BarChart3,
  Languages,
  Bell,
};

export function moduleIcon(name: string): LucideIcon {
  return MAP[name] ?? Box;
}
