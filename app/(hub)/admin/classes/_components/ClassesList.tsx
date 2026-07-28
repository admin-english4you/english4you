"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { Plus, Calendar, Clock, Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";

interface ClassItem {
  id: string;
  name: string;
  level: string;
  schedule: string;
  enrolled: number;
  maxStudents: number;
  teacher: string;
  avatar: string;
  color: string;
}

export function ClassesList() {
  const classes: ClassItem[] = [
    { id: "cls-1", name: "Beginner Conversation", level: "A1", schedule: "Seg, Qua • 09:00", enrolled: 12, maxStudents: 12, teacher: "Emma Thompson", avatar: "ET", color: "emerald" },
    { id: "cls-2", name: "Business English Intensive", level: "B2", schedule: "Ter, Qui • 18:00", enrolled: 8, maxStudents: 12, teacher: "Sophia Kim", avatar: "SK", color: "indigo" },
    { id: "cls-3", name: "Advanced Grammar", level: "C1", schedule: "Sextas • 14:00", enrolled: 5, maxStudents: 12, teacher: "Robert James", avatar: "RJ", color: "rose" },
    { id: "cls-4", name: "IELTS Prep Course", level: "B2+", schedule: "Seg, Qua, Sex • 10:00", enrolled: 11, maxStudents: 12, teacher: "Emma Thompson", avatar: "ET", color: "amber" },
    { id: "cls-5", name: "Everyday Vocabulary", level: "A2", schedule: "Ter, Qui • 09:00", enrolled: 10, maxStudents: 12, teacher: "Sophia Kim", avatar: "SK", color: "cyan" },
    { id: "cls-6", name: "Pronunciation Workshop", level: "B1", schedule: "Sábados • 11:00", enrolled: 12, maxStudents: 12, teacher: "Robert James", avatar: "RJ", color: "violet" },
  ];

  const colorStyles: Record<string, { bg: string; badgeBg: string; badgeText: string; badgeBorder: string }> = {
    emerald: { bg: "bg-emerald-500", badgeBg: "bg-emerald-50", badgeText: "text-emerald-700", badgeBorder: "border-emerald-200" },
    indigo: { bg: "bg-indigo-500", badgeBg: "bg-indigo-50", badgeText: "text-indigo-700", badgeBorder: "border-indigo-200" },
    rose: { bg: "bg-rose-500", badgeBg: "bg-rose-50", badgeText: "text-rose-700", badgeBorder: "border-rose-200" },
    amber: { bg: "bg-amber-500", badgeBg: "bg-amber-50", badgeText: "text-amber-700", badgeBorder: "border-amber-200" },
    cyan: { bg: "bg-cyan-500", badgeBg: "bg-cyan-50", badgeText: "text-cyan-700", badgeBorder: "border-cyan-200" },
    violet: { bg: "bg-violet-500", badgeBg: "bg-violet-50", badgeText: "text-violet-700", badgeBorder: "border-violet-200" },
  };

  return (
    <AppLayout role="ADMIN">
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader 
          title="Turmas Ativas" 
          description="Gerencie os horários, matrículas e alocação de professores das turmas."
        >
          <Button className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-2" /> Criar Nova Turma
          </Button>
        </PageHeader>

        {/* Classes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((c) => {
            const isFull = c.enrolled >= c.maxStudents;
            const progress = (c.enrolled / c.maxStudents) * 100;
            const style = colorStyles[c.color] || colorStyles.indigo;

            return (
              <div
                key={c.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-all group flex flex-col cursor-pointer"
              >
                <div className={`h-1.5 w-full ${style.bg}`}></div>
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-3">
                    <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded text-xs font-bold ${style.badgeBg} ${style.badgeText} border ${style.badgeBorder}`}>
                      {c.level}
                    </span>
                    <button className="p-1 text-slate-400 hover:text-indigo-600 transition-colors">
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>

                  <h3 className="font-bold text-lg text-slate-900 leading-tight mb-3 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                    {c.name}
                  </h3>

                  <div className="space-y-2 mb-6">
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{c.schedule.split(" • ")[0]}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{c.schedule.split(" • ")[1]}</span>
                    </div>
                  </div>

                  <div className="mt-auto pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between text-xs font-medium mb-1.5">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" /> Alunos
                      </span>
                      <span className={isFull ? "text-amber-600 font-bold" : "text-slate-700 font-semibold"}>
                        {c.enrolled} <span className="text-slate-400 font-normal">/ {c.maxStudents} (max)</span>
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mb-4">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ease-in-out ${isFull ? "bg-amber-500" : "bg-indigo-600"}`}
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center border border-slate-200">
                        {c.avatar}
                      </div>
                      <div className="text-xs">
                        <div className="font-semibold text-slate-900 leading-none mb-0.5">{c.teacher}</div>
                        <div className="text-slate-400 leading-none">Professor Responsável</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
