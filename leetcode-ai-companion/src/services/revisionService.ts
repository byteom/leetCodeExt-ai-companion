import { loadNotes, saveNotes } from './storage';

export const getRevisionNote = async (slug: string): Promise<string> => {
  const notes = await loadNotes();
  return notes[slug] ?? '';
};

export const setRevisionNote = async (slug: string, note: string): Promise<void> => {
  const notes = await loadNotes();
  notes[slug] = note;
  await saveNotes(notes);
};