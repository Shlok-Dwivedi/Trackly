import { useState, useRef } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { uploadEventPhoto, type UploadPhotoResult } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

interface PhotoUploaderProps {
  eventId: string;
  onUploadComplete: (result: UploadPhotoResult) => void;
  className?: string;
}

export default function PhotoUploader({
  eventId,
  onUploadComplete,
  className,
}: PhotoUploaderProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!user) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File must be under 10 MB.");
      return;
    }

    setError(null);
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    setProgress(0);

    try {
      const result = await uploadEventPhoto(
        file,
        eventId,
        user.uid,
        (percent) => setProgress(percent)
      );
      onUploadComplete(result);
      setPreview(null);
      setProgress(0);
      toast.success("Photo uploaded");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
      setPreview(null);
      setProgress(0);
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload photo — tap or drop an image here"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => !uploading && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        className={cn(
          "relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors duration-200 cursor-pointer",
          uploading
            ? "border-primary/40 bg-primary-light/50 cursor-not-allowed"
            : "border-border hover:border-primary/50 hover:bg-primary-light/30"
        )}
      >
        {preview ? (
          <div className="relative w-full">
            <img
              src={preview}
              alt="Preview"
              className="max-h-40 mx-auto rounded-lg object-contain"
            />
            {uploading && (
              <div className="mt-2 w-full">
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  Uploading… {progress}%
                </p>
              </div>
            )}
          </div>
        ) : (
          <>
            {uploading ? (
              <div className="w-full space-y-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-muted-foreground">{progress}%</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-light mx-auto">
                  <Upload className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Tap to upload photo
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    JPG, PNG, WEBP up to 10 MB
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          <X className="h-4 w-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-hidden="true"
        onChange={handleChange}
        disabled={uploading}
      />
    </div>
  );
}
