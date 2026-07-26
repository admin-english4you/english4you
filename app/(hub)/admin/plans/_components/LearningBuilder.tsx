"use client";

import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { 
  FileText, 
  PlayCircle, 
  Settings, 
  CheckCircle2, 
  Bold, 
  Italic, 
  Underline, 
  Link2, 
  List, 
  ListOrdered, 
  Image as ImageIcon,
  Save, 
  Eye, 
  GripVertical, 
  Plus 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LessonStatus } from "@/modules/lesson/lesson.types";

interface LessonOutlineItem {
  id: number;
  title: string;
  type: "video" | "article" | "quiz";
  status: LessonStatus;
}

export function LearningBuilder() {
  const [selectedLesson, setSelectedLesson] = useState<number>(2);

  const lessons: LessonOutlineItem[] = [
    { id: 1, title: "Introduction to Greetings", type: "video", status: "ACTIVE" },
    { id: 2, title: "Present Simple vs Continuous", type: "article", status: "IN_PROGRESS" },
    { id: 3, title: "Everyday Vocabulary Quiz", type: "quiz", status: "DISABLED" },
    { id: 4, title: "Listening Comprehension: At the Cafe", type: "video", status: "ACTIVE" },
    { id: 5, title: "Expressing Future Plans", type: "article", status: "DISABLED" },
  ];

  return (
    <AppLayout role="ADMIN">
      <div className="h-[calc(100vh-7rem)] flex flex-col md:flex-row overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        
        {/* Left Panel: Outline */}
        <div className="w-full md:w-80 border-r border-slate-200 bg-slate-50/70 flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-200 bg-white">
            <h2 className="font-bold text-slate-900 text-base">Estrutura do Módulo</h2>
            <p className="text-xs text-slate-500 mt-0.5">Currículo do Nível A2 Pre-Intermediate</p>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {lessons.map((lesson) => (
              <button
                key={lesson.id}
                onClick={() => setSelectedLesson(lesson.id)}
                className={`w-full text-left p-3 rounded-xl flex items-start gap-2.5 transition-all group border ${
                  selectedLesson === lesson.id
                    ? "bg-white shadow-sm border-indigo-200 ring-1 ring-indigo-100"
                    : "border-transparent hover:bg-slate-200/50"
                }`}
              >
                <div className="mt-0.5 text-slate-400 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity">
                  <GripVertical className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      lesson.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      lesson.status === 'IN_PROGRESS' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-slate-100 text-slate-500 border-slate-200'
                    }`}>
                      {lesson.status}
                    </span>
                    {lesson.type === 'video' && <PlayCircle className="w-4 h-4 text-indigo-500" />}
                    {lesson.type === 'article' && <FileText className="w-4 h-4 text-blue-500" />}
                    {lesson.type === 'quiz' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                  </div>
                  <h3 className={`font-semibold text-xs leading-snug line-clamp-2 ${
                    selectedLesson === lesson.id ? 'text-indigo-700' : 'text-slate-700'
                  }`}>
                    {lesson.title}
                  </h3>
                </div>
              </button>
            ))}

            <button className="w-full mt-3 p-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all flex items-center justify-center gap-2 text-xs font-semibold">
              <Plus className="w-4 h-4" /> Adicionar Lição
            </button>
          </div>
        </div>

        {/* Right Panel: Editor */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
          {/* Action Header */}
          <div className="h-14 border-b border-slate-200 flex items-center justify-between px-6 shrink-0 bg-white z-10">
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span>Lições</span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-900 font-semibold">Modo de Edição</span>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="text-slate-500">
                <Settings className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm">
                <Eye className="w-4 h-4 mr-1.5" /> Visualizar
              </Button>
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                <Save className="w-4 h-4 mr-1.5" /> Salvar Lição
              </Button>
            </div>
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-slate-50/30">
            <div className="max-w-3xl mx-auto space-y-6">
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Título da Lição</label>
                  <Input 
                    type="text" 
                    defaultValue="Present Simple vs Continuous" 
                    className="bg-white text-slate-900 font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Tipo da Lição</label>
                    <select className="w-full h-9 px-3 bg-white border border-slate-300 rounded-md text-xs text-slate-900 font-medium outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100">
                      <option>Artigo / Texto</option>
                      <option>Vídeo Aula</option>
                      <option>Quiz de Fixação</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Status (LessonStatusEnum)</label>
                    <select 
                      defaultValue="IN_PROGRESS"
                      className="w-full h-9 px-3 bg-white border border-slate-300 rounded-md text-xs text-slate-900 font-medium outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    >
                      <option value="DISABLED">DISABLED (Bloqueada)</option>
                      <option value="IN_PROGRESS">IN_PROGRESS (Aula Atual)</option>
                      <option value="ACTIVE">ACTIVE (Liberada para Prática)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">URL do Áudio / Vídeo (Opcional)</label>
                  <Input 
                    type="url" 
                    placeholder="https://stream.english4you.com/lesson-2.mp3" 
                    className="bg-white"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Se preenchido com áudio, o modo de prática desbloqueia o exercício Listening Choice.</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Conteúdo da Aula (Texto / Regras para IA)</label>
                <div className="border border-slate-300 rounded-xl overflow-hidden bg-white shadow-sm">
                  <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 flex flex-wrap items-center gap-1">
                    <button className="p-1.5 text-slate-600 hover:bg-slate-200 rounded transition-colors"><Bold className="w-4 h-4" /></button>
                    <button className="p-1.5 text-slate-600 hover:bg-slate-200 rounded transition-colors"><Italic className="w-4 h-4" /></button>
                    <button className="p-1.5 text-slate-600 hover:bg-slate-200 rounded transition-colors"><Underline className="w-4 h-4" /></button>
                    <div className="w-px h-4 bg-slate-300 mx-1"></div>
                    <button className="p-1.5 text-slate-600 hover:bg-slate-200 rounded transition-colors"><List className="w-4 h-4" /></button>
                    <button className="p-1.5 text-slate-600 hover:bg-slate-200 rounded transition-colors"><ListOrdered className="w-4 h-4" /></button>
                    <div className="w-px h-4 bg-slate-300 mx-1"></div>
                    <button className="p-1.5 text-slate-600 hover:bg-slate-200 rounded transition-colors"><Link2 className="w-4 h-4" /></button>
                    <button className="p-1.5 text-slate-600 hover:bg-slate-200 rounded transition-colors"><ImageIcon className="w-4 h-4" /></button>
                  </div>
                  <textarea 
                    className="w-full min-h-[260px] p-4 text-slate-800 outline-none resize-y leading-relaxed text-xs"
                    defaultValue="In English, we use the Present Simple to talk about habits, routines, and permanent situations. For example: I live in London. She works as a teacher. 

We use the Present Continuous to talk about actions happening right now, around now, or temporary situations. For example: I am writing an email. They are staying at a hotel this week."
                  ></textarea>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
