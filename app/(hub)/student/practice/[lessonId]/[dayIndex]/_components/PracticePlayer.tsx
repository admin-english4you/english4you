"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { completePracticeDayAction } from "@/modules/progress/progress.actions";
import { PRACTICE_MODE_LABELS } from "@/modules/progress/progress.utils";
import type { PracticeItem, PracticeSession } from "@/modules/practice/practice.types";
import { PracticeTopBar } from "./PracticeTopBar";
import { PracticeFeedbackBar, type FeedbackState } from "./PracticeFeedbackBar";
import { PracticeResultScreen } from "./PracticeResultScreen";
import { FlashcardCard } from "./FlashcardCard";
import { GapFillListeningCard } from "./GapFillListeningCard";
import { SentenceUnscrambleCard, type WordToken } from "./SentenceUnscrambleCard";
import { QuizChoiceCard } from "./QuizChoiceCard";
import { AudioReplayButton } from "./AudioReplayButton";

const MAX_HEARTS = 3;

/** Normaliza a resposta digitada: caixa, acentos, pontuação e espaços extras. */
function normalizeAnswer(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}'\s]/gu, "")
    .replace(/\s+/g, " ");
}

function isFlashcardMode(item: PracticeItem): boolean {
  return item.renderMode === "flashcard_visual" || item.renderMode === "flashcard_recall";
}

interface PracticePlayerProps {
  session: PracticeSession;
}

export function PracticePlayer({ session }: PracticePlayerProps) {
  const router = useRouter();
  const [isSaving, startSaving] = useTransition();

  const [index, setIndex] = useState(0);
  const [hearts, setHearts] = useState(MAX_HEARTS);
  const [correctCount, setCorrectCount] = useState(0);
  const [feedback, setFeedback] = useState<FeedbackState>("idle");
  const [finished, setFinished] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedXp, setSavedXp] = useState(0);

  // Estados por tipo de exercício
  const [typedAnswer, setTypedAnswer] = useState("");
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [built, setBuilt] = useState<WordToken[]>([]);
  // O primeiro item precisa do banco já preenchido — o ajuste por troca de item
  // só roda a partir do segundo.
  const [bank, setBank] = useState<WordToken[]>(() =>
    (session.items[0]?.data.unscramble?.scrambledWords ?? []).map((word, i) => ({ id: i, word }))
  );

  const item = session.items[index];
  const isLastItem = index === session.items.length - 1;
  const total = session.items.length;

  // Reinicia o estado do exercício quando o item muda. Ajuste durante o render
  // (padrão "adjusting state when props change" do React) em vez de useEffect:
  // evita um render intermediário com o estado do item anterior.
  const [prevItemId, setPrevItemId] = useState(item?.id);
  if (item && item.id !== prevItemId) {
    setPrevItemId(item.id);
    setFeedback("idle");
    setTypedAnswer("");
    setSelectedOption(null);
    setBuilt([]);
    setBank(
      item.data.unscramble
        ? item.data.unscramble.scrambledWords.map((word, i) => ({ id: i, word }))
        : []
    );
  }

  const finish = useCallback(() => {
    setFinished(true);
    setSaveError(null);

    startSaving(async () => {
      const result = await completePracticeDayAction({
        lessonId: session.lessonId,
        dayIndex: session.dayIndex,
      });

      if (result.success && result.data) {
        // Não chamar router.refresh() aqui: isso re-executa a page.tsx da
        // própria rota, que agora vê o dia como COMPLETED e chama notFound(),
        // derrubando esta tela de resultado no meio da animação. A revalidação
        // de /student/practice feita pela action já é suficiente.
        setSavedXp(result.data.xpEarned);
      } else if (!result.success) {
        setSaveError(result.error);
      }
    });
  }, [session.lessonId, session.dayIndex]);

  const advance = useCallback(() => {
    if (isLastItem) finish();
    else setIndex((i) => i + 1);
  }, [isLastItem, finish]);

  /**
   * Registra o resultado. Flashcards se autoavaliam e avançam direto
   * (`skipFeedback`), já que "acertei/não lembrei" já é o próprio feedback.
   */
  const registerResult = useCallback(
    (correct: boolean, skipFeedback = false) => {
      if (correct) setCorrectCount((c) => c + 1);
      else setHearts((h) => Math.max(0, h - 1));

      if (skipFeedback) {
        if (isLastItem) finish();
        else setIndex((i) => i + 1);
        return;
      }

      setFeedback(correct ? "correct" : "wrong");
    },
    [isLastItem, finish]
  );

  const checkAnswer = useCallback(() => {
    if (!item || feedback !== "idle") return;

    if (item.data.gapFill) {
      const correct =
        normalizeAnswer(typedAnswer) === normalizeAnswer(item.data.gapFill.correctAnswer);
      registerResult(correct);
      return;
    }

    if (item.data.unscramble) {
      const correct =
        built.map((t) => t.word).join(" ") === item.data.unscramble.correctOrder.join(" ");
      registerResult(correct);
      return;
    }

    if (item.data.quiz && selectedOption !== null) {
      registerResult(selectedOption === item.data.quiz.correctIndex);
    }
  }, [item, feedback, typedAnswer, built, selectedOption, registerResult]);

  // Atalhos de teclado: Enter verifica/continua, 1-4 escolhem a alternativa.
  useEffect(() => {
    if (finished || !item) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        event.preventDefault();
        if (feedback !== "idle") advance();
        else if (!isFlashcardMode(item)) checkAnswer();
        return;
      }

      if (item.data.quiz && feedback === "idle" && /^[1-4]$/.test(event.key)) {
        const optionIndex = Number(event.key) - 1;
        if (optionIndex < item.data.quiz.options.length) setSelectedOption(optionIndex);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [finished, item, feedback, advance, checkAnswer]);

  const exitToPath = () => router.push("/student/practice");

  const checkDisabled = useMemo(() => {
    if (!item) return true;
    if (item.data.gapFill) return typedAnswer.trim().length === 0;
    if (item.data.unscramble) return built.length === 0;
    if (item.data.quiz) return selectedOption === null;
    return true;
  }, [item, typedAnswer, built, selectedOption]);

  const correctAnswerLabel = useMemo(() => {
    if (!item) return undefined;
    if (item.data.gapFill) return item.data.gapFill.correctAnswer;
    if (item.data.unscramble) return item.data.unscramble.correctOrder.join(" ");
    if (item.data.quiz) return item.data.quiz.options[item.data.quiz.correctIndex];
    return undefined;
  }, [item]);

  if (finished) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <PracticeResultScreen
          correct={correctCount}
          total={total}
          xpEarned={savedXp}
          isReplay={session.isReplay}
          saving={isSaving}
          saveError={saveError}
          onRetrySave={finish}
        />
      </div>
    );
  }

  if (!item) return null;

  const showHearts = !isFlashcardMode(item);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <PracticeTopBar
        progress={(index / total) * 100}
        hearts={hearts}
        maxHearts={MAX_HEARTS}
        showHearts={showHearts}
        onExit={exitToPath}
      />

      <div className="flex min-h-0 flex-1 flex-col justify-center px-5 py-6">
        <p className="mb-6 text-center text-xs font-semibold uppercase tracking-wider text-slate-400">
          {PRACTICE_MODE_LABELS[session.renderMode]} · {index + 1} de {total}
        </p>

        <AnimatePresence mode="wait">
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.2 }}
          >
            {isFlashcardMode(item) ? (
              <FlashcardCard item={item} onResult={(correct) => registerResult(correct, true)} />
            ) : item.data.gapFill ? (
              <GapFillListeningCard
                item={item}
                answered={feedback !== "idle"}
                value={typedAnswer}
                onChange={setTypedAnswer}
                onSubmit={checkAnswer}
                isCorrect={feedback === "idle" ? null : feedback === "correct"}
              />
            ) : item.data.unscramble ? (
              <SentenceUnscrambleCard
                item={item}
                answered={feedback !== "idle"}
                isCorrect={feedback === "idle" ? null : feedback === "correct"}
                built={built}
                bank={bank}
                onPickFromBank={(token) => {
                  setBank((b) => b.filter((t) => t.id !== token.id));
                  setBuilt((b) => [...b, token]);
                }}
                onReturnToBank={(token) => {
                  setBuilt((b) => b.filter((t) => t.id !== token.id));
                  setBank((b) => [...b, token]);
                }}
                onReset={() => {
                  setBank((b) => [...b, ...built].sort((x, y) => x.id - y.id));
                  setBuilt([]);
                }}
              />
            ) : item.data.quiz ? (
              <QuizChoiceCard
                item={item}
                answered={feedback !== "idle"}
                selectedIndex={selectedOption}
                onSelect={setSelectedOption}
                header={
                  session.renderMode === "listening_choice" && session.audioUrl ? (
                    <AudioReplayButton src={session.audioUrl} />
                  ) : undefined
                }
              />
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>

      <PracticeFeedbackBar
        state={feedback}
        correctAnswer={correctAnswerLabel}
        explanation={feedback === "idle" ? undefined : item.data.quiz?.explanation}
        onCheck={checkAnswer}
        onContinue={advance}
        checkDisabled={checkDisabled}
        isLastItem={isLastItem}
        hideCheckButton={isFlashcardMode(item)}
      />
    </div>
  );
}
