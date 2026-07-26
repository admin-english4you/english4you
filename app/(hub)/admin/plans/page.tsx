import type { Metadata } from "next";
import { LearningBuilder } from "./_components/LearningBuilder";

export const metadata: Metadata = {
  title: "Planos de Ensino | English4You Admin",
  description: "Construtor de planos de ensino, lições e conteúdo pedagógico.",
};

export default function AdminPlansPage() {
  return <LearningBuilder />;
}
