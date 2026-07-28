"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { GraduationCap, Users, Clock, PlayCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TeacherDashboard() {
  const upcomingClasses = [
    { id: "1", title: "Business English B2", time: "Hoje • 18:00 - 19:00", studentsCount: 8, roomUrl: "#" },
    { id: "2", title: "Beginner Conversation A1", time: "Amanhã • 09:00 - 10:00", studentsCount: 12, roomUrl: "#" },
  ];

  return (
    <AppLayout role="TEACHER" userName="Emma Thompson" userRoleTitle="Professora de Inglês" userAvatarText="ET">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Welcome Banner */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Portal do Professor</h1>
            <p className="text-slate-500 text-sm mt-1">Bem-vinda, Emma! Confira suas próximas aulas e turmas ativas.</p>
          </div>
          <Button className="bg-amber-600 hover:bg-amber-700 text-white">
            <PlayCircle className="w-4 h-4 mr-2" /> Iniciar Sala Virtual
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
                <GraduationCap className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-slate-500 uppercase">Minhas Turmas</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">4 Turmas</div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                <Users className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-slate-500 uppercase">Total de Alunos</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">38 Alunos</div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-slate-500 uppercase">Aulas Realizadas</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">24 Aulas (Mês)</div>
          </div>
        </div>

        {/* Upcoming Classes */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="font-bold text-slate-900 text-base mb-4 pb-3 border-b border-slate-100">Próximas Aulas Agendadas</h2>
          <div className="space-y-4">
            {upcomingClasses.map((c) => (
              <div key={c.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-100/50 transition-colors gap-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{c.title}</h3>
                  <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-slate-400" /> {c.time}</span>
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-slate-400" /> {c.studentsCount} Alunos</span>
                  </div>
                </div>
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-xs w-full sm:w-auto">
                  Entrar na Aula
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
