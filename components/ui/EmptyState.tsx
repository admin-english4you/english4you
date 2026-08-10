"use client";

import { motion } from "framer-motion";
import { GraduationCap, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
}

export function EmptyState({ title, description, icon: Icon = GraduationCap }: EmptyStateProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="flex flex-col items-center text-center py-12">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
          <Icon className="w-7 h-7 text-slate-400" />
        </div>
        <p className="font-semibold text-slate-800">{title}</p>
        <p className="text-sm text-slate-500 mt-1 max-w-sm">{description}</p>
      </Card>
    </motion.div>
  );
}
