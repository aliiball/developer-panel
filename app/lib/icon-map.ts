import {
  ShoppingCart,
  Newspaper,
  Users,
  Package as PackageOpen,
  Key as KeyRound,
  CreditCard,
  Image,
  Plug,
  ChartBar as BarChart3,
  Translate as Languages,
  Bell,
  Cube as Box,
  type Icon as LucideIcon,
} from "@phosphor-icons/react";

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
