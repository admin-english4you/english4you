"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { LessonReader } from "@/components/lesson/LessonReader";
import type { Lesson } from "@/modules/lesson/lesson.types";

interface TeacherLessonViewProps {
  lesson: Lesson;
}

export function TeacherLessonView({ lesson }: TeacherLessonViewProps) {
  return (
    <AppLayout role="TEACHER">
      <Link
        href="/teacher/lessons"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para lições
      </Link>

      <Card className="p-0" variant="flat">
        <LessonReader
          title={lesson.title}
          level={lesson.level}
          html={lesson.content}
          audioUrl={lesson.audioUrl}
          videoUrl={lesson.videoUrl}
        />
      </Card>
    </AppLayout>
  );
}
