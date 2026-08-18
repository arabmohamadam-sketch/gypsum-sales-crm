"use client";

import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Truck,
  Phone,
  Target,
  BarChart3,
  Bot,
  Settings,
} from "lucide-react";

const menus = [
  { title: "داشبورد", icon: LayoutDashboard },
  { title: "مشتریان", icon: Users },
  { title: "سفارش‌ها", icon: ShoppingCart },
  { title: "حواله‌ها", icon: Truck },
  { title: "فعالیت‌ها", icon: Phone },
  { title: "اهداف فروش", icon: Target },
  { title: "گزارش‌ها", icon: BarChart3 },
  { title: "هوش مصنوعی", icon: Bot },
  { title: "تنظیمات", icon: Settings },
];

export default function Sidebar() {
  return (
    <aside className="w-72 min-h-screen bg-slate-900 text-white flex flex-col">

      <div className="p-8 border-b border-slate-700">
        <h1 className="text-2xl font-bold">
          CRM گچ آهوان
        </h1>

        <p className="text-slate-400 text-sm mt-2">
          نسخه هوشمند فروش
        </p>
      </div>

      <nav className="flex-1 p-4 space-y-2">

        {menus.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.title}
              className="w-full flex items-center gap-3 rounded-xl px-4 py-3 hover:bg-blue-600 transition-all duration-200"
            >
              <Icon size={20} />

              <span>{item.title}</span>
            </button>
          );
        })}

      </nav>

      <div className="border-t border-slate-700 p-6">

        <div className="font-semibold">
          محمد عرب
        </div>

        <div className="text-sm text-slate-400">
          مدیر فروش
        </div>

      </div>

    </aside>
  );
}