import React, { useState, useEffect, useRef } from 'react';
import { apiRequest } from '../services/api';
import { AvatarImage } from './ui/AvatarImage';
import { ModuleKey } from './DashboardModule';
import {
  Search,
  X,
  ArrowUpRight,
  Users,
  GraduationCap,
  Layers,
  BookOpen,
  CreditCard,
  Wallet,
} from 'lucide-react';

interface GlobalSearchBarProps {
  onNavigate: (module: ModuleKey) => void;
}

export const GlobalSearchBar: React.FC<GlobalSearchBarProps> = ({ onNavigate }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    students: any[];
    teachers: any[];
    classes: any[];
    subjects: any[];
    fees: any[];
    salaries: any[];
  }>({
    students: [],
    teachers: [],
    classes: [],
    subjects: [],
    fees: [],
    salaries: [],
  });

  // Quick Record Inspector Modal state when a user clicks a specific record
  const [selectedRecord, setSelectedRecord] = useState<{
    type: 'student' | 'teacher' | 'class' | 'subject' | 'fee' | 'salary';
    item: any;
    targetModule: ModuleKey;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: Cmd+K / Ctrl+K to focus, Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch search results whenever dropdown opens or query changes
  useEffect(() => {
    if (!open) return;
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await apiRequest('/api/search', {
          params: { q: query },
        });
        if (active && res.results) {
          setResults(res.results);
        }
      } catch {
        // Ignore transient search errors
      } finally {
        if (active) setLoading(false);
      }
    }, 140);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, open]);

  const totalMatches =
    results.students.length +
    results.teachers.length +
    results.classes.length +
    results.subjects.length +
    results.fees.length +
    results.salaries.length;

  const handleSelectRecord = (
    type: 'student' | 'teacher' | 'class' | 'subject' | 'fee' | 'salary',
    item: any,
    targetModule: ModuleKey
  ) => {
    setOpen(false);
    onNavigate(targetModule);
    setSelectedRecord({ type, item, targetModule });
  };

  return (
    <>
      <div ref={containerRef} className="relative w-full max-w-xs sm:max-w-sm lg:max-w-md">
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            placeholder="Search students, teachers, invoices, classes... (⌘K)"
            className="w-full pl-8 pr-14 py-1.5 text-xs bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 focus:border-pink-600 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none transition-colors"
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="absolute right-2.5 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-block absolute right-2.5 text-[10px] font-mono text-slate-400 select-none pointer-events-none">
              ⌘K
            </kbd>
          )}
        </div>

        {/* Dropdown Results Panel */}
        {open && (
          <div className="absolute left-0 right-0 mt-2 w-full sm:w-[440px] bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-[75vh] overflow-y-auto divide-y divide-slate-100">
            <div className="px-3.5 py-2 bg-slate-50/70 flex items-center justify-between text-[11px] text-slate-500">
              <span>
                {query.trim()
                  ? `Search results for "${query}"`
                  : 'Quick Directory & Recent Records'}
              </span>
              <span className="font-mono tabular-nums">
                {loading ? 'Searching...' : `${totalMatches} matches`}
              </span>
            </div>

            {totalMatches === 0 && !loading ? (
              <div className="py-8 px-4 text-center text-xs text-slate-500">
                No matching students, teachers, classes, or financial records found for &ldquo;
                {query}&rdquo;.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {/* Students Section */}
                {results.students.length > 0 && (
                  <div className="p-2">
                    <div className="px-2 py-1 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3 h-3 text-pink-600" />
                        <span>Students</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setOpen(false);
                          onNavigate('students');
                        }}
                        className="text-pink-600 hover:underline cursor-pointer"
                      >
                        View All
                      </button>
                    </div>
                    <div className="mt-1 space-y-0.5">
                      {results.students.map((stu) => (
                        <button
                          key={`stu-${stu.id}`}
                          type="button"
                          onClick={() => handleSelectRecord('student', stu, 'students')}
                          className="w-full px-2.5 py-2 rounded-lg hover:bg-pink-50/60 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <AvatarImage src={stu.profile_image} name={stu.student_name} size="sm" />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-900 group-hover:text-pink-700 truncate">
                                {stu.student_name}
                              </p>
                              <p className="text-[11px] font-mono text-slate-500 tabular-nums truncate">
                                {stu.student_id} · {stu.class_name} ({stu.section}) · Roll #
                                {stu.roll_number}
                              </p>
                            </div>
                          </div>
                          <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-pink-600 shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Teachers Section */}
                {results.teachers.length > 0 && (
                  <div className="p-2">
                    <div className="px-2 py-1 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <GraduationCap className="w-3 h-3 text-pink-600" />
                        <span>Teachers & Faculty</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setOpen(false);
                          onNavigate('teachers');
                        }}
                        className="text-pink-600 hover:underline cursor-pointer"
                      >
                        View All
                      </button>
                    </div>
                    <div className="mt-1 space-y-0.5">
                      {results.teachers.map((t) => (
                        <button
                          key={`tch-${t.id}`}
                          type="button"
                          onClick={() => handleSelectRecord('teacher', t, 'teachers')}
                          className="w-full px-2.5 py-2 rounded-lg hover:bg-pink-50/60 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <AvatarImage src={t.profile_image} name={t.teacher_name} size="sm" />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-900 group-hover:text-pink-700 truncate">
                                {t.teacher_name}
                              </p>
                              <p className="text-[11px] font-mono text-slate-500 tabular-nums truncate">
                                {t.employee_id} · {t.subject_specialization} · {t.assigned_class}
                              </p>
                            </div>
                          </div>
                          <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-pink-600 shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fee Invoices Section */}
                {results.fees.length > 0 && (
                  <div className="p-2">
                    <div className="px-2 py-1 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <CreditCard className="w-3 h-3 text-pink-600" />
                        <span>Student Fee Invoices</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setOpen(false);
                          onNavigate('student-fees');
                        }}
                        className="text-pink-600 hover:underline cursor-pointer"
                      >
                        Fee Ledger
                      </button>
                    </div>
                    <div className="mt-1 space-y-0.5">
                      {results.fees.map((f) => (
                        <button
                          key={`fee-${f.id}`}
                          type="button"
                          onClick={() => handleSelectRecord('fee', f, 'student-fees')}
                          className="w-full px-2.5 py-2 rounded-lg hover:bg-pink-50/60 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer group"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-900 group-hover:text-pink-700 truncate">
                              {f.student_name} — {f.invoice_number}
                            </p>
                            <p className="text-[11px] font-mono text-slate-500 tabular-nums truncate">
                              Month: {f.fee_month} · Total: ${f.total_amount} · Due: $
                              {f.remaining_amount} · {f.status}
                            </p>
                          </div>
                          <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-pink-600 shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Teacher Salaries Section */}
                {results.salaries.length > 0 && (
                  <div className="p-2">
                    <div className="px-2 py-1 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <Wallet className="w-3 h-3 text-pink-600" />
                        <span>Faculty Salary Slips</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setOpen(false);
                          onNavigate('teacher-salaries');
                        }}
                        className="text-pink-600 hover:underline cursor-pointer"
                      >
                        Payroll
                      </button>
                    </div>
                    <div className="mt-1 space-y-0.5">
                      {results.salaries.map((sal) => (
                        <button
                          key={`sal-${sal.id}`}
                          type="button"
                          onClick={() => handleSelectRecord('salary', sal, 'teacher-salaries')}
                          className="w-full px-2.5 py-2 rounded-lg hover:bg-pink-50/60 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer group"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-900 group-hover:text-pink-700 truncate">
                              {sal.teacher_name} — {sal.slip_number}
                            </p>
                            <p className="text-[11px] font-mono text-slate-500 tabular-nums truncate">
                              {sal.salary_month} · Net: ${sal.net_salary} · {sal.status}
                            </p>
                          </div>
                          <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-pink-600 shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Classes & Subjects Section */}
                {(results.classes.length > 0 || results.subjects.length > 0) && (
                  <div className="p-2">
                    <div className="px-2 py-1 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <Layers className="w-3 h-3 text-pink-600" />
                        <span>Classes & Subjects</span>
                      </span>
                    </div>
                    <div className="mt-1 space-y-0.5">
                      {results.classes.map((c) => (
                        <button
                          key={`cls-${c.id}`}
                          type="button"
                          onClick={() => handleSelectRecord('class', c, 'classes')}
                          className="w-full px-2.5 py-1.5 rounded-lg hover:bg-pink-50/60 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer group"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-900 group-hover:text-pink-700 truncate">
                              {c.class_name} — Section {c.section}
                            </p>
                            <p className="text-[11px] font-mono text-slate-500 tabular-nums">
                              Room {c.room_number} · Capacity {c.capacity}
                            </p>
                          </div>
                          <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-pink-600 shrink-0" />
                        </button>
                      ))}
                      {results.subjects.map((sub) => (
                        <button
                          key={`sub-${sub.id}`}
                          type="button"
                          onClick={() => handleSelectRecord('subject', sub, 'subjects')}
                          className="w-full px-2.5 py-1.5 rounded-lg hover:bg-pink-50/60 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer group"
                        >
                          <div className="min-w-0 flex items-center gap-2">
                            <BookOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-900 group-hover:text-pink-700 truncate">
                                {sub.subject_name}
                              </p>
                              <p className="text-[11px] font-mono text-slate-500 tabular-nums">
                                {sub.subject_code} · {sub.class_name}
                              </p>
                            </div>
                          </div>
                          <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-pink-600 shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Record Inspector Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <p className="text-[11px] font-semibold text-pink-600 uppercase">
                  Global Search Record Inspector
                </p>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  {selectedRecord.type === 'student' && selectedRecord.item.student_name}
                  {selectedRecord.type === 'teacher' && selectedRecord.item.teacher_name}
                  {selectedRecord.type === 'fee' &&
                    `Fee Invoice ${selectedRecord.item.invoice_number}`}
                  {selectedRecord.type === 'salary' &&
                    `Salary Slip ${selectedRecord.item.slip_number}`}
                  {selectedRecord.type === 'class' &&
                    `${selectedRecord.item.class_name} — Section ${selectedRecord.item.section}`}
                  {selectedRecord.type === 'subject' && selectedRecord.item.subject_name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {selectedRecord.type === 'student' && (
              <div className="space-y-3 text-xs">
                <div className="flex items-center gap-3">
                  <AvatarImage
                    src={selectedRecord.item.profile_image}
                    name={selectedRecord.item.student_name}
                    size="lg"
                  />
                  <div>
                    <p className="font-mono text-slate-600">
                      {selectedRecord.item.student_id} · Adm #{selectedRecord.item.admission_number}
                    </p>
                    <p className="font-semibold text-slate-900 mt-0.5">
                      {selectedRecord.item.class_name} · Section {selectedRecord.item.section} ·
                      Roll #{selectedRecord.item.roll_number}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                  <p className="text-slate-500">
                    Father:{' '}
                    <span className="text-slate-900 font-medium">
                      {selectedRecord.item.father_name}
                    </span>
                  </p>
                  <p className="text-slate-500">
                    Mother:{' '}
                    <span className="text-slate-900 font-medium">
                      {selectedRecord.item.mother_name || '—'}
                    </span>
                  </p>
                  <p className="text-slate-500">
                    Phone:{' '}
                    <span className="font-mono text-slate-900">{selectedRecord.item.phone}</span>
                  </p>
                  <p className="text-slate-500">
                    Status:{' '}
                    <span className="font-semibold text-emerald-700">
                      {selectedRecord.item.status}
                    </span>
                  </p>
                </div>
              </div>
            )}

            {selectedRecord.type === 'teacher' && (
              <div className="space-y-3 text-xs">
                <div className="flex items-center gap-3">
                  <AvatarImage
                    src={selectedRecord.item.profile_image}
                    name={selectedRecord.item.teacher_name}
                    size="lg"
                  />
                  <div>
                    <p className="font-mono text-slate-600">{selectedRecord.item.employee_id}</p>
                    <p className="font-semibold text-slate-900 mt-0.5">
                      {selectedRecord.item.subject_specialization} ·{' '}
                      {selectedRecord.item.qualification}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                  <p className="text-slate-500">
                    Assigned Class:{' '}
                    <span className="text-slate-900 font-medium">
                      {selectedRecord.item.assigned_class}
                    </span>
                  </p>
                  <p className="text-slate-500">
                    Base Salary:{' '}
                    <span className="font-mono font-bold text-slate-900">
                      ${selectedRecord.item.basic_salary}
                    </span>
                  </p>
                  <p className="text-slate-500">
                    Phone:{' '}
                    <span className="font-mono text-slate-900">{selectedRecord.item.phone}</span>
                  </p>
                  <p className="text-slate-500">
                    Email: <span className="text-slate-900">{selectedRecord.item.email}</span>
                  </p>
                </div>
              </div>
            )}

            {selectedRecord.type === 'fee' && (
              <div className="space-y-2 text-xs font-mono tabular-nums">
                <p className="font-sans text-slate-700">
                  Scholar:{' '}
                  <strong className="text-slate-900">{selectedRecord.item.student_name}</strong> (
                  {selectedRecord.item.class_name})
                </p>
                <p>Billing Month: {selectedRecord.item.fee_month}</p>
                <p>
                  Total Amount: <strong>${selectedRecord.item.total_amount}</strong> · Paid:{' '}
                  <strong className="text-emerald-700">${selectedRecord.item.paid_amount}</strong> ·
                  Remaining:{' '}
                  <strong className="text-rose-600">${selectedRecord.item.remaining_amount}</strong>
                </p>
                <p className="font-sans">
                  Status: <strong className="text-pink-700">{selectedRecord.item.status}</strong> ·
                  Due Date: {selectedRecord.item.due_date}
                </p>
              </div>
            )}

            {selectedRecord.type === 'salary' && (
              <div className="space-y-2 text-xs font-mono tabular-nums">
                <p className="font-sans text-slate-700">
                  Faculty:{' '}
                  <strong className="text-slate-900">{selectedRecord.item.teacher_name}</strong> (
                  {selectedRecord.item.employee_id})
                </p>
                <p>Payroll Month: {selectedRecord.item.salary_month}</p>
                <p>
                  Net Salary: <strong>${selectedRecord.item.net_salary}</strong> · Paid:{' '}
                  <strong className="text-emerald-700">${selectedRecord.item.paid_amount}</strong> ·
                  Remaining:{' '}
                  <strong className="text-amber-600">
                    ${selectedRecord.item.remaining_salary}
                  </strong>
                </p>
              </div>
            )}

            {(selectedRecord.type === 'class' || selectedRecord.type === 'subject') && (
              <div className="space-y-2 text-xs">
                {selectedRecord.type === 'class' ? (
                  <p className="text-slate-600 font-mono">
                    Room: {selectedRecord.item.room_number} · Capacity:{' '}
                    {selectedRecord.item.capacity} · Status: {selectedRecord.item.status}
                  </p>
                ) : (
                  <>
                    <p className="font-mono text-slate-600">
                      Code: {selectedRecord.item.subject_code} · Class:{' '}
                      {selectedRecord.item.class_name}
                    </p>
                    <p className="text-slate-600">{selectedRecord.item.description}</p>
                  </>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 text-xs font-semibold text-white bg-pink-600 hover:bg-pink-700 rounded-lg cursor-pointer"
              >
                Continue in Module
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
