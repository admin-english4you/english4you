"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { BookOpen, Sparkles, Trophy, Calendar, ArrowRight, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function StudentDashboard() {
  const currentCourse = {
    title: "English Conversation & Grammar",
    level: "A2 Pre-Intermediate",
    nextClass: "Hoje • 19:00 - 20:00",
    teacher: "Emma Thompson",
    progress: 65,
  };

  const pendingPractices = [
    { id: "1", title: "Prática IA: Present Simple vs Continuous", duration: "10 min", xp: "+50 XP" },
    { id: "2", title: "Listening Exercise: Cafe Ordering", duration: "5 min", xp: "+30 XP" },
  ];

  return (
    <AppLayout role="STUDENT" userName="Noah Patel" userRoleTitle="Aluno Nível A2" userAvatarText="NP">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-6 sm:p-8 rounded-2xl text-white shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white mb-2 backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5 mr-1" /> Prática IA Liberada
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Welcome back, Noah!</h1>
            <p className="text-indigo-100 text-sm mt-1">Você concluiu 65% do seu plano de estudo do nível A2. Continue assim!</p>
          </div>
          <Button className="bg-white text-indigo-700 hover:bg-slate-100 font-bold shadow-sm">
            <PlayCircle className="w-4 h-4 mr-2 text-indigo-600" /> Praticar com IA Agora
          </Button>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">Nível Atual</p>
              <p className="text-lg font-bold text-slate-900">{currentCourse.level}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">Próxima Aula Ao Vivo</p>
              <p className="text-sm font-bold text-slate-900">{currentCourse.nextClass}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">Pontuação (XP)</p>
              <p className="text-lg font-bold text-slate-900">450 XP</p>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Course Card */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h2 className="font-bold text-slate-900 text-base">Meu Curso Principal</h2>
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
                {currentCourse.level}
              </span>
            </div>

            <div>
              <h3 className="text-xl font-bold text-slate-900 mb-1">{currentCourse.title}</h3>
              <p className="text-xs text-slate-500">Professor responsável: {currentCourse.teacher}</p>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1.5">
                <span>Progresso do Módulo</span>
                <span>{currentCourse.progress}%</span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${currentCourse.progress}%` }}></div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                Acessar Material da Aula <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </div>

          {/* AI Exercises */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h2 className="font-bold text-slate-900 text-base pb-3 border-b border-slate-100 flex items-center justify-between">
              <span>Exercícios de IA</span>
              <Sparkles className="w-4 h-4 text-amber-500" />
            </h2>

            <div className="space-y-3">
              {pendingPractices.map((p) => (
                <div key={p.id} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-indigo-50/40 hover:border-indigo-200 transition-all group cursor-pointer">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-bold text-slate-800 text-xs group-hover:text-indigo-600 transition-colors">{p.title}</h4>
                    <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      {p.xp}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">Duração aprox: {p.duration}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
