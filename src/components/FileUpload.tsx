import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Paperclip, X, Loader2, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FileUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  folder?: string;
  accept?: string;
}

const FileUpload = ({ value, onChange, folder = "geral", accept = ".pdf,.png,.jpg,.jpeg,.doc,.docx" }: FileUploadProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFile = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${folder}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("anexos").upload(path, file, { upsert: false });
    if (error) {
      toast({ variant: "destructive", title: "Erro no upload", description: error.message });
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("anexos").getPublicUrl(path);
    onChange(data.publicUrl);
    setUploading(false);
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      {value ? (
        <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
          <Paperclip size={14} />
          <a href={value} target="_blank" rel="noreferrer" className="flex-1 truncate text-primary hover:underline">
            {value.split("/").pop()}
          </a>
          <ExternalLink size={12} />
          <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => onChange(null)}>
            <X size={12} />
          </Button>
        </div>
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 size={14} className="mr-2 animate-spin" /> : <Paperclip size={14} className="mr-2" />}
          {uploading ? "Enviando..." : "Anexar arquivo"}
        </Button>
      )}
    </div>
  );
};

export default FileUpload;
