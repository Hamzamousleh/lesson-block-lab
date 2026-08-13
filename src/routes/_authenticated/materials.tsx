import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, FileText, Loader2, Trash2, Upload } from "lucide-react";
import { classesQuery, unitsQuery } from "@/lib/data";
import {
  deleteMaterialFile,
  formatFileSize,
  materialFileUrl,
  materialFilesQuery,
  materialKindLabel,
  uploadMaterialFile,
  validateMaterialFile,
  type MaterialFile,
} from "@/lib/materials";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/materials")({
  head: () => ({
    meta: [
      { title: "Materialer — CaseLab" },
      {
        name: "description",
        content:
          "Upload PowerPoints, PDF'er, Word-dokumenter og billeder, og brug dem i dine ChatGPT-prompts.",
      },
      { property: "og:title", content: "Materialer — CaseLab" },
      { property: "og:description", content: "Dine egne undervisningsfiler samlet ét sted." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MaterialsPage,
});

const NONE = "__none__";

function MaterialsPage() {
  const qc = useQueryClient();
  const files = useQuery(materialFilesQuery());
  const classes = useQuery(classesQuery());
  const units = useQuery(unitsQuery());

  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [note, setNote] = useState("");
  const [classId, setClassId] = useState(NONE);
  const [unitId, setUnitId] = useState(NONE);
  const [dragging, setDragging] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<MaterialFile | null>(null);

  function pick(f: File | null | undefined) {
    if (!f) return;
    const invalid = validateMaterialFile(f);
    if (invalid) {
      toast.error(invalid);
      return;
    }
    setFile(f);
    if (!title.trim()) setTitle(f.name.replace(/\.[^.]+$/, ""));
  }

  const upload = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Vælg en fil først.");
      return uploadMaterialFile({
        file,
        title,
        note,
        subject: subject.trim() || null,
        class_id: classId === NONE ? null : classId,
        unit_id: unitId === NONE ? null : unitId,
      });
    },
    onSuccess: () => {
      toast.success("✓ Fil uploadet");
      setFile(null);
      setTitle("");
      setNote("");
      setSubject("");
      setClassId(NONE);
      setUnitId(NONE);
      if (inputRef.current) inputRef.current.value = "";
      void qc.invalidateQueries({ queryKey: ["material-files"] });
    },
    onError: (e: Error) => toast.error(e.message || "Kunne ikke uploade"),
  });

  const remove = useMutation({
    mutationFn: (f: MaterialFile) => deleteMaterialFile(f),
    onSuccess: () => {
      toast.success("Filen er slettet.");
      setPendingDelete(null);
      void qc.invalidateQueries({ queryKey: ["material-files"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function open(f: MaterialFile) {
    try {
      window.open(await materialFileUrl(f), "_blank", "noopener");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const classById = new Map((classes.data ?? []).map((c) => [c.id, c]));
  const unitById = new Map((units.data ?? []).map((u) => [u.id, u]));
  const unitOptions = (units.data ?? []).filter((u) => classId === NONE || u.class_id === classId);

  return (
    <div className="mx-auto max-w-4xl px-6 py-14">
      <h1 className="font-display text-4xl font-semibold">Materialer</h1>
      <p className="mt-2 text-muted-foreground">
        Upload dine PowerPoints, PDF'er, Word-dokumenter og billeder — og vedhæft dem i ChatGPT, når
        du laver undervisning.
      </p>

      <section className="surface-card mt-8 space-y-6 p-8">
        <h2 className="text-xl font-semibold">Upload materiale</h2>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            pick(e.dataTransfer.files?.[0]);
          }}
          className={`rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
            dragging ? "border-primary bg-accent" : "border-border"
          }`}
        >
          <Upload className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            Træk en fil hertil — eller vælg den manuelt.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            PDF, PPTX, DOCX, PNG, JPG, WEBP · maks. 20 MB
          </p>
          <input
            ref={inputRef}
            id="material-file"
            type="file"
            className="sr-only"
            accept=".pdf,.pptx,.docx,.png,.jpg,.jpeg,.webp"
            onChange={(e) => pick(e.target.files?.[0])}
          />
          <Button
            type="button"
            variant="outline"
            className="mt-4 rounded-full"
            onClick={() => inputRef.current?.click()}
          >
            Vælg fil
          </Button>
          {file && (
            <p className="mt-4 text-sm font-medium">
              {file.name} · {formatFileSize(file.size)}
            </p>
          )}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="m-title">Titel</Label>
            <Input
              id="m-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Fx Intro til psykologi"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="m-subject">Fag (valgfri)</Label>
            <Input
              id="m-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Fx Psykologi C"
            />
          </div>
          <div className="space-y-2">
            <Label>Klasse (valgfri)</Label>
            <Select
              value={classId}
              onValueChange={(v) => {
                setClassId(v);
                setUnitId(NONE);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Ingen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Ingen</SelectItem>
                {(classes.data ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} · {c.subject}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Forløb (valgfri)</Label>
            <Select value={unitId} onValueChange={setUnitId}>
              <SelectTrigger>
                <SelectValue placeholder="Ingen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Ingen</SelectItem>
                {unitOptions.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="m-note">Note (valgfri)</Label>
          <Textarea
            id="m-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Hvad bruger du filen til?"
          />
        </div>

        <Button
          size="lg"
          className="rounded-full"
          disabled={!file || upload.isPending}
          onClick={() => upload.mutate()}
        >
          {upload.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Uploader …
            </>
          ) : (
            "Upload materiale"
          )}
        </Button>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">Dine filer</h2>
        {files.isLoading && (
          <div className="mt-6 flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Henter filer …
          </div>
        )}
        {files.data?.length === 0 && (
          <p className="mt-4 text-muted-foreground">Du har ikke uploadet filer endnu.</p>
        )}
        <ul className="mt-6 space-y-3">
          {(files.data ?? []).map((f) => (
            <li key={f.id} className="surface-card flex flex-wrap items-center gap-4 px-6 py-5">
              <FileText className="size-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{f.title}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {f.file_name} · {materialKindLabel(f.mime_type, f.file_name)} ·{" "}
                  {formatFileSize(f.file_size)} ·{" "}
                  {new Date(f.created_at).toLocaleDateString("da-DK")}
                  {f.subject ? ` · ${f.subject}` : ""}
                  {f.class_id && classById.get(f.class_id)
                    ? ` · ${classById.get(f.class_id)?.name}`
                    : ""}
                  {f.unit_id && unitById.get(f.unit_id) ? ` · ${unitById.get(f.unit_id)?.title}` : ""}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => void open(f)}
              >
                <Download className="size-4" /> Åbn
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                aria-label={`Slet ${f.title}`}
                onClick={() => setPendingDelete(f)}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      </section>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Slet materiale?</AlertDialogTitle>
            <AlertDialogDescription>
              «{pendingDelete?.title}» og selve filen slettes permanent. Dine lektioner og klasser
              berøres ikke.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annullér</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingDelete && remove.mutate(pendingDelete)}
              disabled={remove.isPending}
            >
              Slet
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
