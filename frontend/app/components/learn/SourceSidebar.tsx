import React, { useRef, useState, useEffect } from "react";
import { Upload, FileText, Trash2, Plus, History, MessageSquare, Clock, MoreVertical, RefreshCw, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";

interface SessionSummary {
    session_id: string;
    lesson_id: string;
    created_at: string;
    difficulty: string;
    turns: number;
    summary: string;
    uploaded_file_name?: string;
}

interface SourceSidebarProps {
    uploadedFileName: string | null;
    onUpload: (file: File) => void;
    onRemove: () => void;
    isUploading: boolean;
    onSelectSession?: (sessionId: string) => void;
    currentSessionId?: string | null;
    onNewSession?: () => Promise<void>;
    refreshTrigger?: number;
}

export function SourceSidebar({
    uploadedFileName,
    onUpload,
    onRemove,
    isUploading,
    onSelectSession,
    currentSessionId,
    onNewSession,
    refreshTrigger
}: SourceSidebarProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [activeTab, setActiveTab] = useState<"sources" | "history">("history");
    const [sessions, setSessions] = useState<SessionSummary[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    // Fetch history when tab changes to history or trigger changes
    useEffect(() => {
        if (activeTab === "history") {
            fetchHistory();
        }
    }, [activeTab, refreshTrigger]);

    const fetchHistory = async () => {
        setIsLoadingHistory(true);
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const res = await fetch(`${apiUrl}/api/v1/learn/sessions`);
            if (res.ok) {
                const data = await res.json();
                setSessions(data);
            }
        } catch (e) {
            console.error("Failed to fetch history", e);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onUpload(e.target.files[0]);
        }
    };

    const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState("");
    const editInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editingSessionId && editInputRef.current) {
            editInputRef.current.focus();
        }
    }, [editingSessionId]);

    const startEditing = (e: React.MouseEvent, session: SessionSummary) => {
        e.stopPropagation();
        setEditingSessionId(session.session_id);
        setEditTitle(session.summary);
    };

    const saveRename = async (sessionId: string) => {
        if (!editTitle.trim()) return cancelEditing();

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const res = await fetch(`${apiUrl}/api/v1/learn/sessions/${sessionId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: editTitle })
            });

            if (res.ok) {
                setSessions(prev => prev.map(s =>
                    s.session_id === sessionId ? { ...s, summary: editTitle } : s
                ));
            }
        } catch (error) {
            console.error("Failed to rename session", error);
        } finally {
            setEditingSessionId(null);
        }
    };

    const cancelEditing = () => {
        setEditingSessionId(null);
        setEditTitle("");
    };

    const handleKeyDown = (e: React.KeyboardEvent, sessionId: string) => {
        if (e.key === 'Enter') {
            saveRename(sessionId);
        } else if (e.key === 'Escape') {
            cancelEditing();
        }
    };

    const deleteSession = async (e: React.MouseEvent, sessionId: string) => {
        e.stopPropagation(); // Prevent triggering the select action
        if (!confirm("Are you sure you want to delete this session?")) return;

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const res = await fetch(`${apiUrl}/api/v1/learn/sessions/${sessionId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                // If we deleted the active session, notify parent? 
                // For now just refresh list
                fetchHistory();
                if (currentSessionId === sessionId) {
                    // Ideally we should deselect or something
                }
            }
        } catch (error) {
            console.error("Failed to delete session", error);
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="h-full flex flex-col glass-card border-r border-border overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-border">
                <button
                    onClick={() => setActiveTab("history")}
                    className={cn(
                        "flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors relative",
                        activeTab === "history"
                            ? "text-primary bg-primary/5"
                            : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                    )}
                >
                    <History className="w-4 h-4" />
                    History
                    {activeTab === "history" && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab("sources")}
                    className={cn(
                        "flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors relative",
                        activeTab === "sources"
                            ? "text-primary bg-primary/5"
                            : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                    )}
                >
                    <FileText className="w-4 h-4" />
                    Sources
                    {activeTab === "sources" && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                    )}
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {activeTab === "sources" ? (
                    // Sources View
                    <div className="space-y-4">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="font-bold text-sm flex items-center gap-2">
                                <FileText className="w-4 h-4 text-primary" />
                                Course Material
                            </h2>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                    className="p-1 hover:bg-primary/10 text-primary rounded-lg transition-colors"
                                    title="Add source"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                                <span className="text-[10px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                                    {uploadedFileName ? 1 : 0}
                                </span>
                            </div>
                        </div>

                        {!uploadedFileName ? (
                            <div className="text-center p-6 border-2 border-dashed border-border/50 rounded-xl hover:border-primary/50 transition-colors group">
                                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                                    <Upload className="w-6 h-6 text-primary" />
                                </div>
                                <p className="text-sm font-medium mb-1">Upload File</p>
                                <p className="text-xs text-muted-foreground mb-4">
                                    PDF, TXT, MD
                                </p>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                    className="px-4 py-2 bg-primary text-primary-foreground text-sm rounded-lg hover:bg-primary/90 transition-colors w-full flex items-center justify-center gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    Select File
                                </button>
                            </div>
                        ) : (
                            <div className="bg-surface border border-border rounded-lg p-3 flex items-center gap-3 group hover:border-primary/50 transition-colors">
                                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                                    <FileText className="w-5 h-5 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{uploadedFileName}</p>
                                    <p className="text-xs text-muted-foreground">Active Context</p>
                                </div>
                                <button
                                    onClick={onRemove}
                                    className="p-2 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                    title="Remove source"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    // History View
                    <div className="space-y-3">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="font-bold text-sm flex items-center gap-2">
                                <Clock className="w-4 h-4 text-primary" />
                                Discussions
                            </h2>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={async (e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if (isCreating || !onNewSession) return;

                                        setIsCreating(true);
                                        try {
                                            await onNewSession();
                                            await fetchHistory();
                                        } finally {
                                            setIsCreating(false);
                                        }
                                    }}
                                    disabled={isCreating}
                                    className={cn(
                                        "p-1 hover:bg-primary/10 text-primary rounded-lg transition-colors",
                                        isCreating && "opacity-50 cursor-wait"
                                    )}
                                    title="Nouvelle Discussion"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={fetchHistory}
                                    className="p-1 hover:bg-primary/10 text-primary rounded-lg transition-colors"
                                    title="Refresh List"
                                >
                                    <RefreshCw className={cn("w-4 h-4", isLoadingHistory && "animate-spin")} />
                                </button>
                            </div>
                        </div>

                        {isLoadingHistory ? (
                            <div className="flex justify-center p-4">
                                <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
                            </div>
                        ) : sessions.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground text-sm">
                                <History className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                No history yet
                            </div>
                        ) : (
                            sessions.map((session) => (
                                <div
                                    key={session.session_id}
                                    onClick={() => onSelectSession?.(session.session_id)}
                                    className={cn(
                                        "relative p-3 rounded-xl border transition-all cursor-pointer group",
                                        currentSessionId === session.session_id
                                            ? "bg-primary/10 border-primary/50 ring-1 ring-primary/20"
                                            : "bg-surface border-border hover:border-primary/30 hover:bg-surface/80"
                                    )}
                                >


                                    {editingSessionId === session.session_id ? (
                                        <div onClick={(e) => e.stopPropagation()} className="mb-1">
                                            <input
                                                ref={editInputRef}
                                                type="text"
                                                value={editTitle}
                                                onChange={(e) => setEditTitle(e.target.value)}
                                                onKeyDown={(e) => handleKeyDown(e, session.session_id)}
                                                onBlur={() => saveRename(session.session_id)}
                                                className="w-full bg-background border border-primary/50 rounded px-1 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                            />
                                        </div>
                                    ) : (
                                        <h3 className="text-sm font-semibold mb-1 line-clamp-1 group-hover:text-primary transition-colors">
                                            {session.summary}
                                        </h3>
                                    )}

                                    {session.uploaded_file_name && (
                                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-primary/5 px-2 py-0.5 rounded-full w-fit">
                                            <Paperclip className="w-3 h-3" />
                                            <span className="truncate max-w-[150px]">{session.uploaded_file_name}</span>
                                        </div>
                                    )}



                                    {/* Action Menu - Stop propagation to prevent selection */}
                                    <div className="absolute top-2 right-2 transition-opacity">
                                        <SessionMenu
                                            onRename={(e) => startEditing(e, session)}
                                            onDelete={(e) => deleteSession(e, session.session_id)}
                                        />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".pdf,.txt,.md"
            />
        </div>
    );
}

// Helper component for the session menu (local)
function SessionMenu({ onRename, onDelete }: { onRename: (e: React.MouseEvent) => void, onDelete: (e: React.MouseEvent) => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className="p-1 hover:bg-primary/20 rounded-md transition-colors"
                title="Options"
            >
                <MoreVertical className="w-4 h-4 text-muted-foreground hover:text-primary" />
            </button>

            {isOpen && (
                <div className="absolute right-0 top-6 w-32 bg-[#0F1623] border border-border rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    <button
                        onClick={(e) => {
                            setIsOpen(false);
                            onRename(e);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-white/5 transition-colors text-left"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        Rename
                    </button>
                    <button
                        onClick={(e) => {
                            setIsOpen(false);
                            onDelete(e);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors text-left"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                    </button>
                </div>
            )}
        </div>
    );
}
