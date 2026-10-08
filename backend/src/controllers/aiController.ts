import { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import { db } from '../config/db.ts';

function getSchoolSummary() {
  const store = db.getStore();

  const totalStudents = store.students.length;
  const activeStudents = store.students.filter((s) => s.status === 'Active').length;
  const totalTeachers = store.teachers.length;
  const activeTeachers = store.teachers.filter((t) => t.status === 'Active').length;
  const totalFees = store.student_fees.length;
  const paidFees = store.student_fees.filter((f) => f.status === 'Paid').length;
  const pendingFees = store.student_fees.filter((f) => f.status === 'Pending').length;
  const partialFees = store.student_fees.filter((f) => f.status === 'Partial').length;
  const totalCollected = store.student_fees.reduce((sum, f) => sum + Number(f.paid_amount || 0), 0);
  const outstanding = store.student_fees.reduce(
    (sum, f) => sum + Number(f.remaining_amount || 0),
    0
  );

  const recentStudents = [...store.students]
    .sort((a, b) => b.id - a.id)
    .slice(0, 3)
    .map((s) => ({ id: s.id, name: s.student_name, className: s.class_name, status: s.status }));

  const recentFees = [...store.student_fees]
    .sort((a, b) => b.id - a.id)
    .slice(0, 3)
    .map((f) => ({ id: f.id, invoice: f.invoice_number, studentId: f.student_id, amount: f.total_amount, status: f.status }));

  return {
    totalStudents,
    activeStudents,
    totalTeachers,
    activeTeachers,
    totalFees,
    paidFees,
    pendingFees,
    partialFees,
    totalCollected,
    outstanding,
    recentStudents,
    recentFees,
  };
}

function buildFallbackAnswer(prompt: string, summary: ReturnType<typeof getSchoolSummary>): string {
  const p = String(prompt).toLowerCase();

  if (p.includes('student')) {
    return [
      'Student snapshot:',
      `- Total students: ${summary.totalStudents}`,
      `- Active students: ${summary.activeStudents}`,
      `- Recent entries: ${summary.recentStudents.map((s) => `${s.name} (${s.className})`).join(', ')}`,
    ].join('\n');
  }

  if (p.includes('fee') || p.includes('payment')) {
    return [
      'Fee snapshot:',
      `- Total fee records: ${summary.totalFees}`,
      `- Paid: ${summary.paidFees}`,
      `- Partial: ${summary.partialFees}`,
      `- Pending: ${summary.pendingFees}`,
      `- Collected: ${summary.totalCollected}`,
      `- Outstanding: ${summary.outstanding}`,
      `- Recent fees: ${summary.recentFees.map((f) => `${f.invoice} ($${Number(f.amount).toLocaleString()})`).join(', ')}`,
    ].join('\n');
  }

  if (p.includes('teacher')) {
    return [
      'Teacher snapshot:',
      `- Total teachers: ${summary.totalTeachers}`,
      `- Active teachers: ${summary.activeTeachers}`,
      `- Faculty coverage is ${summary.activeTeachers}/${summary.totalTeachers} active.`,
    ].join('\n');
  }

  return [
    'School snapshot:',
    `- Students: ${summary.totalStudents} total / ${summary.activeStudents} active`,
    `- Teachers: ${summary.totalTeachers} total / ${summary.activeTeachers} active`,
    `- Fees: ${summary.totalFees} records, ${summary.totalCollected} collected, ${summary.outstanding} outstanding`,
  ].join('\n');
}

export const askAI = async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body ?? {};
    if (!prompt || !String(prompt).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a prompt for the AI assistant.',
      });
    }

    const summary = getSchoolSummary();
    const promptText = String(prompt).trim();

    if (process.env.GEMINI_API_KEY) {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `You are a school-record assistant for PinkEdu. Use the data below and answer the user's request in plain English.\n\nUser request: ${promptText}\n\nSchool snapshot:\n${JSON.stringify(summary, null, 2)}`,
                },
              ],
            },
          ],
        });

        const answer =
          (response as any)?.text ||
          (response as any)?.candidates?.[0]?.content?.parts
            ?.map((part: any) => part?.text || '')
            .join('') ||
          null;

        if (answer) {
          return res.json({ success: true, answer, summary });
        }
      } catch (err) {
        console.error('Gemini AI error:', err);
      }
    }

    const answer = buildFallbackAnswer(promptText, summary);
    return res.json({ success: true, answer, summary });
  } catch (error) {
    console.error('AI assistant error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to process the AI request right now.',
    });
  }
};
