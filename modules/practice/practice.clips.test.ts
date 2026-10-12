import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Áudios curtos da prática de listening: gerados pela IA ou enviados pelo
 * admin. O ponto sensível é nunca deixar meio-registro (arquivo sem clipe,
 * clipe sem perguntas) quando a IA falha no meio do caminho.
 */

const repo = {
  findClipsByLessonId: vi.fn(),
  createClip: vi.fn(),
  createQuizQuestions: vi.fn(),
  findClipById: vi.fn(),
  deleteClipById: vi.fn(),
  updateClipTranscript: vi.fn(),
  countApprovedItemsByType: vi.fn(),
  countApprovedQuizQuestionsByModeAndSection: vi.fn(),
  countApprovedListeningByKind: vi.fn(),
  findApprovedClipQuestions: vi.fn(),
  findApprovedLegacyListeningQuestions: vi.fn(),
};
const getLessonById = vi.fn();
const ai = {
  generateClipScript: vi.fn(),
  synthesizeDialogue: vi.fn(),
  generateClipQuestions: vi.fn(),
  transcribeMedia: vi.fn(),
};
const uploadBufferToStorage = vi.fn();
const deleteStorageFileByUrl = vi.fn();

vi.mock('./practice.repository', () => ({
  practiceRepository: new Proxy({}, { get: (_t, key: string) => (...a: unknown[]) => repo[key as keyof typeof repo](...a) }),
}));
vi.mock('@/modules/lesson/lesson.service', () => ({
  lessonService: { getLessonById: (...a: unknown[]) => getLessonById(...a) },
}));
vi.mock('@/lib/openai', () => ({
  generateClipScript: (...a: unknown[]) => ai.generateClipScript(...a),
  synthesizeDialogue: (...a: unknown[]) => ai.synthesizeDialogue(...a),
  formatClipTranscript: (lines: { speaker: string; text: string }[]) =>
    lines.map((l) => `${l.speaker}: ${l.text}`).join('\n'),
  generateClipQuestions: (...a: unknown[]) => ai.generateClipQuestions(...a),
  transcribeMedia: (...a: unknown[]) => ai.transcribeMedia(...a),
}));
vi.mock('@/lib/storage-upload', () => ({
  uploadBufferToStorage: (...a: unknown[]) => uploadBufferToStorage(...a),
  deleteStorageFileByUrl: (...a: unknown[]) => deleteStorageFileByUrl(...a),
}));

const { practiceService } = await import('./practice.service');

const LESSON = { id: 'lesson-1', level: 'A2', content: '<p>Ordering food at a restaurant.</p>', transcript: null };
const PERGUNTA = { question: 'What did Anna order?', options: ['Soup', 'Pizza', 'Salad', 'Fish'], correctIndex: 1, explanation: 'Ela pede pizza.' };
const URL_AUDIO = 'https://x.public.blob.vercel-storage.com/lessons/lesson-1/clips/abc.mp3';

beforeEach(() => {
  vi.clearAllMocks();
  getLessonById.mockResolvedValue(LESSON);
  repo.findClipsByLessonId.mockResolvedValue([{ transcript: 'Roteiro antigo.' }]);
  repo.createClip.mockImplementation(async (data: Record<string, unknown>) => ({ id: 'clip-1', ...data }));
  ai.generateClipScript.mockResolvedValue([{ speaker: 'Anna', text: 'I would like a pizza, please.' }]);
  ai.synthesizeDialogue.mockResolvedValue(Buffer.from('mp3'));
  ai.generateClipQuestions.mockResolvedValue([PERGUNTA]);
  uploadBufferToStorage.mockResolvedValue(URL_AUDIO);
});

describe('createAiClip', () => {
  it('gera roteiro, voz e perguntas, e grava o clipe com as perguntas ligadas a ele', async () => {
    const clip = await practiceService.createAiClip('ADMIN', 'lesson-1', { targetSeconds: 30, questionCount: 1, voice: 'marin' });

    expect(ai.generateClipScript).toHaveBeenCalledWith(
      expect.objectContaining({ targetSeconds: 30, levelHint: 'A2', avoid: ['Roteiro antigo.'] })
    );
    expect(ai.synthesizeDialogue).toHaveBeenCalledWith([{ speaker: 'Anna', text: 'I would like a pizza, please.' }], 'marin');
    expect(uploadBufferToStorage).toHaveBeenCalledWith(expect.stringMatching(/^lessons\/lesson-1\/clips\/.+\.mp3$/), expect.any(Buffer), 'audio/mpeg');
    expect(repo.createClip).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'AI', transcript: 'Anna: I would like a pizza, please.', targetSeconds: 30, audioUrl: URL_AUDIO })
    );
    expect(repo.createQuizQuestions).toHaveBeenCalledWith([
      expect.objectContaining({ clipId: clip.id, renderMode: 'listening_choice', section: null, reviewStatus: 'APPROVED' }),
    ]);
  });

  it('se a IA falhar, nada é enviado nem gravado', async () => {
    ai.generateClipQuestions.mockRejectedValue(new Error('timeout'));

    await expect(
      practiceService.createAiClip('ADMIN', 'lesson-1', { targetSeconds: 30, questionCount: 1, voice: 'marin' })
    ).rejects.toThrow(/Falha ao gerar o áudio/);
    expect(uploadBufferToStorage).not.toHaveBeenCalled();
    expect(repo.createClip).not.toHaveBeenCalled();
  });

  it('recusa lição sem conteúdo', async () => {
    getLessonById.mockResolvedValue({ ...LESSON, content: '', transcript: null });

    await expect(
      practiceService.createAiClip('ADMIN', 'lesson-1', { targetSeconds: 30, questionCount: 1, voice: 'marin' })
    ).rejects.toThrow(/conteúdo escrito/);
    expect(ai.generateClipScript).not.toHaveBeenCalled();
  });

  it('recusa quem não é admin', async () => {
    await expect(
      practiceService.createAiClip('TEACHER', 'lesson-1', { targetSeconds: 30, questionCount: 1, voice: 'marin' })
    ).rejects.toThrow(/administradores/);
  });
});

describe('createUploadedClip', () => {
  const file = { buffer: Buffer.from('mp3'), contentType: 'audio/mpeg', extension: 'mp3' };

  it('com transcrição colada, não chama a transcrição da IA', async () => {
    await practiceService.createUploadedClip('ADMIN', 'lesson-1', file, { transcript: 'Hello there.', questionCount: 2 });

    expect(ai.transcribeMedia).not.toHaveBeenCalled();
    expect(ai.generateClipQuestions).toHaveBeenCalledWith(expect.objectContaining({ transcript: 'Hello there.', count: 2 }));
    expect(repo.createClip).toHaveBeenCalledWith(expect.objectContaining({ source: 'UPLOAD', transcript: 'Hello there.' }));
  });

  it('sem transcrição, a IA transcreve o arquivo enviado', async () => {
    ai.transcribeMedia.mockResolvedValue('Transcrito pela IA.');

    await practiceService.createUploadedClip('ADMIN', 'lesson-1', file, { questionCount: 1 });

    expect(ai.transcribeMedia).toHaveBeenCalledWith(URL_AUDIO, 'audio/mpeg');
    expect(repo.createClip).toHaveBeenCalledWith(expect.objectContaining({ transcript: 'Transcrito pela IA.' }));
  });

  it('se a transcrição falhar, apaga o arquivo já enviado e não grava nada', async () => {
    ai.transcribeMedia.mockRejectedValue(new Error('arquivo inválido'));

    await expect(practiceService.createUploadedClip('ADMIN', 'lesson-1', file, { questionCount: 1 })).rejects.toThrow(
      /Não foi possível transcrever/
    );
    expect(deleteStorageFileByUrl).toHaveBeenCalledWith(URL_AUDIO);
    expect(repo.createClip).not.toHaveBeenCalled();
  });
});

describe('deleteClip', () => {
  it('apaga a linha (perguntas em cascata) e o arquivo', async () => {
    repo.findClipById.mockResolvedValue({ id: 'clip-1', audioUrl: URL_AUDIO });

    await practiceService.deleteClip('ADMIN', 'clip-1');

    expect(repo.deleteClipById).toHaveBeenCalledWith('clip-1');
    expect(deleteStorageFileByUrl).toHaveBeenCalledWith(URL_AUDIO);
  });
});

describe('listening tocável', () => {
  beforeEach(() => {
    repo.countApprovedItemsByType.mockResolvedValue({ vocab: 3, structure: 3 });
    repo.countApprovedQuizQuestionsByModeAndSection.mockResolvedValue({
      vocabulary: 1, grammar: 1, context: 1, comprehension: 1, listening: 4,
    });
  });

  it('com clipe, há listening mesmo sem áudio da aula', async () => {
    repo.countApprovedListeningByKind.mockResolvedValue({ withClip: 2, legacy: 0 });
    const caps = await practiceService.getLessonPracticeCapabilities('lesson-1', null);
    expect(caps.hasListening).toBe(true);
    expect(caps.sectionCoverage.listening).toBe(2);
  });

  it('pergunta antiga só conta se a lição ainda tem o áudio da aula', async () => {
    repo.countApprovedListeningByKind.mockResolvedValue({ withClip: 0, legacy: 4 });
    expect((await practiceService.getLessonPracticeCapabilities('lesson-1', null)).hasListening).toBe(false);
    expect((await practiceService.getLessonPracticeCapabilities('lesson-1', 'https://aula.mp3')).hasListening).toBe(true);
  });

  it('sessão: com clipes, só as perguntas dos clipes, cada uma com o seu áudio', async () => {
    repo.findApprovedClipQuestions.mockResolvedValue([
      { question: { id: 'q1' }, audioUrl: 'https://clip1.mp3' },
      { question: { id: 'q2' }, audioUrl: 'https://clip2.mp3' },
    ]);

    const result = await practiceService.getPlayableListeningQuestions('lesson-1', 'https://aula.mp3');

    expect(result.questions.map((q) => q.id)).toEqual(['q1', 'q2']);
    expect(result.audioUrlByQuestionId.get('q2')).toBe('https://clip2.mp3');
    expect(repo.findApprovedLegacyListeningQuestions).not.toHaveBeenCalled();
  });

  it('sessão: sem clipes, as perguntas antigas tocam o áudio da aula', async () => {
    repo.findApprovedClipQuestions.mockResolvedValue([]);
    repo.findApprovedLegacyListeningQuestions.mockResolvedValue([{ id: 'antiga' }]);

    const result = await practiceService.getPlayableListeningQuestions('lesson-1', 'https://aula.mp3');

    expect(result.audioUrlByQuestionId.get('antiga')).toBe('https://aula.mp3');
  });
});
