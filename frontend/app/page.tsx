"use client";

import { useState, useEffect } from 'react';
import {
  BookOpen,
  Trophy,
  Flame,
  ArrowUpRight,
  Play,
  CheckCircle2,
  BrainCircuit,
  MessageSquare
} from 'lucide-react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer
} from 'recharts';
import { cn } from '@/lib/utils';

const personalityData = [
  { subject: 'Communication', A: 85, fullMark: 100 },
  { subject: 'Empathy', A: 70, fullMark: 100 },
  { subject: 'Conflict Res', A: 60, fullMark: 100 },
  { subject: 'Collaboration', A: 90, fullMark: 100 },
  { subject: 'Confidence', A: 75, fullMark: 100 },
  { subject: 'Adaptability', A: 80, fullMark: 100 },
];

const courses = [
  { title: 'Public Speaking Mastery', progress: 65, icon: MessageSquare, color: 'text-primary' },
  { title: 'Python for AI', progress: 40, icon: BrainCircuit, color: 'text-secondary' },
  { title: 'Active Listening', progress: 90, icon: BookOpen, color: 'text-accent' },
];

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const [courseCount, setCourseCount] = useState(3); // Default placeholder

  useEffect(() => {
    setMounted(true);

    // Fetch sessions to count unique courses
    const fetchStats = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/api/v1/learn/sessions');
        if (response.ok) {
          const sessions = await response.json();

          // Logic: unique (lesson_id || uploaded_file_name || session_id if free discussion)
          const uniqueCourses = new Set();
          sessions.forEach((s: any) => {
            if (s.lesson_id) {
              uniqueCourses.add(`lesson-${s.lesson_id}`);
            } else if (s.uploaded_file_name) {
              uniqueCourses.add(`file-${s.uploaded_file_name}`);
            } else {
              // Free discussion without specific lesson/file - unique per session
              uniqueCourses.add(`session-${s.session_id}`);
            }
          });

          setCourseCount(uniqueCourses.size);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard stats:", error);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <header>
        <h1 className="text-4xl font-heading font-bold mb-2">Welcome back, Alex</h1>
        <p className="text-muted-foreground">You've completed 75% of your weekly goals. Keep it up!</p>
      </header>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground font-medium mb-1">Courses in Progress</p>
            <h3 className="text-3xl font-bold">{courseCount}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <BookOpen className="w-6 h-6" />
          </div>
        </div>
        <div className="glass-card p-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground font-medium mb-1">Skill Points</p>
            <h3 className="text-3xl font-bold">12,450</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary">
            <Trophy className="w-6 h-6" />
          </div>
        </div>
        <div className="glass-card p-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground font-medium mb-1">Current Streak</p>
            <h3 className="text-3xl font-bold">12 Days</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
            <Flame className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Personality Snapshot */}
        <div className="glass-card p-8 lg:col-span-2">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold font-heading">Personality Snapshot</h2>
              <p className="text-sm text-muted-foreground">Based on your recent soft skill simulations</p>
            </div>
            <button className="text-primary hover:underline flex items-center gap-1 font-medium">
              View Details <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
          <div className="h-[400px] min-h-[400px] w-full">
            {mounted && (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={personalityData}>
                  <PolarGrid stroke="#334155" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <Radar
                    name="Alex"
                    dataKey="A"
                    stroke="var(--primary)"
                    fill="var(--primary)"
                    fillOpacity={0.5}
                  />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Suggested Action */}
        <div className="space-y-6">
          <div className="glass-card p-8 bg-gradient-to-br from-primary/20 via-transparent to-transparent border-primary/30">
            <span className="inline-block px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold uppercase mb-4 tracking-wider">
              AI Suggested
            </span>
            <h3 className="text-2xl font-bold mb-3 font-heading leading-tight">Master Communication pitch simulation</h3>
            <p className="text-muted-foreground mb-6">
              You're only 15 points away from unlocking the "Orator" badge. Finish this practice to level up.
            </p>
            <button className="btn-primary w-full flex items-center justify-center gap-2">
              <Play className="w-4 h-4 fill-current" /> Start Practice
            </button>
          </div>

          <div className="glass-card p-6">
            <h3 className="text-xl font-bold mb-4 font-heading">Recent Activity</h3>
            <div className="space-y-4">
              {[
                { label: 'Conflict Resolution Quiz', time: '2 hours ago', icon: CheckCircle2, status: 'completed' },
                { label: 'Hard Skill: Python Loops', time: '5 hours ago', icon: CheckCircle2, status: 'completed' },
                { label: 'Empathy Module', time: 'Yesterday', icon: BookOpen, status: 'started' }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4 text-sm">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                    item.status === 'completed' ? "bg-green-500/20 text-green-500" : "bg-primary/20 text-primary"
                  )}>
                    <item.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Courses */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold font-heading">Current Learning Paths</h2>
          <button className="text-primary hover:underline font-medium">Browse All</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course, i) => (
            <div key={i} className="glass-card p-6 flex flex-col group cursor-pointer">
              <div className="flex items-start justify-between mb-4">
                <div className={cn("w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center", course.color)}>
                  <course.icon className="w-6 h-6" />
                </div>
                <div className="text-xs font-bold text-muted-foreground">{course.progress}%</div>
              </div>
              <h3 className="text-lg font-bold mb-4 group-hover:text-primary transition-colors">{course.title}</h3>
              <div className="mt-auto pt-4 flex flex-col gap-2">
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full bg-gradient-to-r transition-all duration-1000",
                      course.progress < 50 ? "from-yellow-500 to-orange-500" : "from-primary to-secondary"
                    )}
                    style={{ width: `${course.progress}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
