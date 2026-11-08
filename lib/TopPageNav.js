"use client";
import React from "react";
import Link from "next/link";
import { ShoppingCartIcon, TrendingUpIcon, ClipboardListIcon, WalletIcon, UsersIcon } from "./icons";

const NAV_ITEMS = [
  {
    key: "purchase",
    href: "/purchase",
    label: "Purchase",
    icon: ShoppingCartIcon,
    themeColor: "#991b1b",
  },
  {
    key: "sales",
    href: "/sales",
    label: "Sales",
    icon: TrendingUpIcon,
    themeColor: "#1e40af",
  },
  {
    key: "work-orders",
    href: "/work-orders",
    label: "Work Orders",
    icon: ClipboardListIcon,
    themeColor: "#1e40af",
  },
  {
    key: "expense",
    href: "/expense",
    label: "Expense",
    icon: WalletIcon,
    themeColor: "#059669",
  },
  {
    key: "staff",
    href: "/staff",
    label: "Staff",
    icon: UsersIcon,
    themeColor: "#7c3aed",
  },
];

export default function TopPageNav({ active }) {
  return (
    <nav className="cew-top-page-nav" aria-label="Main Sections Navigation">
      {NAV_ITEMS.map((item) => {
        const isActive = active === item.key;
        const IconComponent = item.icon;
        return (
          <Link
            key={item.key}
            href={item.href}
            prefetch={true}
            className={`cew-top-nav-item ${isActive ? "active" : ""}`}
            data-page={item.key}
            title={isActive ? `Currently on ${item.label}` : `Switch to ${item.label} page`}
            style={{
              "--nav-theme-color": item.themeColor,
            }}
          >
            <IconComponent size={14} className="cew-top-nav-icon" />
            <span className="cew-top-nav-text">{item.label}</span>
            {isActive && <span className="cew-top-nav-active-dot" />}
          </Link>
        );
      })}
    </nav>
  );
}
