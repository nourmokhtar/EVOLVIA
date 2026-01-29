import React, { useRef } from "react";
import { Upload, FileText, Trash2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface SourceSidebarProps {
    uploadedFileName: string | null;
    onUpload: (file: File) => void;
    onRemove: () => void;
    isUploading: boolean;
}

export function SourceSidebar({
    uploadedFileName,
    onUpload,
    onRemove,
    isUploading,
}: SourceSidebarProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onUpload(e.target.files[0]);
        }
    };

    return (
        <div className="h-full flex flex-col glass-card border-r border-border p-4">
            <div className="flex items-center justify-between mb-6">
                <h2 className="font-bold text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Sources
                </h2>
                <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
                    {uploadedFileName ? 1 : 0}
                </span>
            </div>

            <div className="flex-1 overflow-y-auto">
                {!uploadedFileName ? (
                    <div className="text-center p-6 border-2 border-dashed border-border/50 rounded-xl hover:border-primary/50 transition-colors group">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                            <Upload className="w-6 h-6 text-primary" />
                        </div>
                        <p className="text-sm font-medium mb-1">Add a source</p>
                        <p className="text-xs text-muted-foreground mb-4">
                            PDF, TXT, MD (Max 5MB)
                        </p>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="px-4 py-2 bg-primary text-primary-foreground text-sm rounded-lg hover:bg-primary/90 transition-colors w-full flex items-center justify-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Upload
                        </button>
                    </div>
                ) : (
                    <div className="bg-surface border border-border rounded-lg p-3 flex items-center gap-3 group hover:border-primary/50 transition-colors">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{uploadedFileName}</p>
                            <p className="text-xs text-muted-foreground">Uploaded Source</p>
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
