import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, FileText, Loader2, Pencil, Trash2, Upload } from "lucide-react";
import { classesQuery, lessonsQuery, unitsQuery } from "@/lib/data";
import {
  deleteMaterialFile,
  formatFileSize,
  materialFileUrl,
  materialFilesQuery,
  materialKindLabel,
  updateMaterialFile,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/materials")({
  head: () => ({
    meta: [
      { title: "Materialer — CaseLab" },
      {
        name: "description",
        content: "Saml dine egne undervisningsfiler og knyt dem til undervisningen.",
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
  const lessons = useQuery(lessonsQuery());

  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [note, setNote] = useState("");
  const [classId, setClassId] = useState(NONE);
  const [unitId, setUnitId] = useState(NONE);
  const [lessonId, setLessonId] = useState(NONE);
  const [dragging, setDragging] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<MaterialFile | null>(null);
  const [editing, setEditing] = useState<MaterialFile | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editClassId, setEditClassId] = useState(NONE);
  const [editUnitId, setEditUnitId] = useState(NONE);
  const [editLessonId, setEditLessonId] = useState(NONE);

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
        lesson_id: lessonId === NONE ? null : lessonId,
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
      setLessonId(NONE);
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

  const saveEdit = useMutation({
    mutationFn: async () => {
      if (!editing) throw new Error("Vælg et materiale.");
      if (!editTitle.trim()) throw new Error("Skriv en titel.");
      return updateMaterialFile(editing.id, {
        title: editTitle.trim(),
        subject: editSubject.trim() || null,
        note: editNote.trim() || null,
        class_id: editClassId === NONE ? null : editClassId,
        unit_id: editUnitId === NONE ? null : editUnitId,
        lesson_id: editLessonId === NONE ? null : editLessonId,
      });
    },
    onSuccess: () => {
      toast.success("Materialet er opdateret.");
      setEditing(null);
      void qc.invalidateQueries({ queryKey: ["material-files"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function edit(f: MaterialFile) {
    setEditing(f);
    setEditTitle(f.title);
    setEditSubject(f.subject ?? "");
    setEditNote(f.note ?? "");
    setEditClassId(f.class_id ?? NONE);
    setEditUnitId(f.unit_id ?? NONE);
    setEditLessonId(f.lesson_id ?? NONE);
  }

  async function open(f: MaterialFile) {
    try {
      window.open(await materialFileUrl(f), "_blank", "noopener");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const classById = new Map((classes.data ?? []).map((c) => [c.id, c]));
  const unitById = new Map((units.data ?? []).map((u) => [u.id, u]));
  const lessonById = new Map((lessons.data ?? []).map((l) => [l.id, l]));
  const unitOptions = (units.data ?? []).filter((u) => classId === NONE || u.class_id === classId);
  const lessonOptions = (lessons.data ?? []).filter(
    (l) =>
      (classId === NONE || l.class_id === classId) && (unitId === NONE || l.unit_id === unitId),
  );
  const editUnitOptions = (units.data ?? []).filter(
    (u) => editClassId === NONE || u.class_id === editClassId,
  );
  const editLessonOptions = (lessons.data ?? []).filter(
    (l) =>
      (editClassId === NONE || l.class_id === editClassId) &&
      (editUnitId === NONE || l.unit_id === editUnitId),
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-14">
      <h1 className="font-display text-4xl font-semibold">Materialer</h1>
      <p className="mt-2 text-muted-foreground">
        Dine egne filer og kilder. Knyt dem til en klasse, et forløb, en lektion eller en konkret
        aktivitet i lektionseditoren.
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Bruger du en fil til planlægning med ChatGPT, vedhæfter du den selv — platformen læser eller
        sender ikke filen automatisk.
      </p>

      <section className="surface-card mt-8 space-y-6 p-4 sm:p-8">
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
          className={`rounded-2xl border-2 border-dashed p-5 text-center transition-colors sm:p-8 ${
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
            <Label id="material-class-label">Klasse (valgfri)</Label>
            <Select
              value={classId}
              onValueChange={(v) => {
                setClassId(v);
                setUnitId(NONE);
                setLessonId(NONE);
              }}
            >
              <SelectTrigger aria-labelledby="material-class-label">
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
            <Label id="material-unit-label">Forløb (valgfri)</Label>
            <Select
              value={unitId}
              onValueChange={(v) => {
                setUnitId(v);
                setLessonId(NONE);
              }}
            >
              <SelectTrigger aria-labelledby="material-unit-label">
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
          <div className="space-y-2">
            <Label id="material-lesson-label">Lektion (valgfri)</Label>
            <Select value={lessonId} onValueChange={setLessonId}>
              <SelectTrigger aria-labelledby="material-lesson-label">
                <SelectValue placeholder="Ingen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Ingen</SelectItem>
                {lessonOptions.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.title}
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
          <div role="status" className="mt-6 flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Henter filer …
          </div>
        )}
        {files.isError && (
          <div role="alert" className="mt-6 rounded-2xl border border-destructive/30 p-4">
            <p className="text-sm text-destructive">Dine filer kunne ikke hentes.</p>
            <Button
              type="button"
              variant="outline"
              className="mt-3 min-h-11 rounded-full"
              onClick={() => void files.refetch()}
            >
              Prøv igen
            </Button>
          </div>
        )}
        {files.data?.length === 0 && (
          <div className="surface-card mt-4 border-dashed p-8 text-center">
            <p className="text-lg font-medium">Ingen materialer endnu</p>
            <p className="mt-1 text-muted-foreground">
              Upload din første fil, så du kan knytte den til undervisningen.
            </p>
            <Button
              type="button"
              className="mt-5 rounded-full"
              onClick={() => inputRef.current?.click()}
            >
              Vælg første fil
            </Button>
          </div>
        )}
        <ul className="mt-6 space-y-3">
          {(files.data ?? []).map((f) => (
            <li
              key={f.id}
              className="surface-card flex flex-wrap items-center gap-3 px-4 py-4 sm:gap-4 sm:px-6 sm:py-5"
            >
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
                  {f.unit_id && unitById.get(f.unit_id)
                    ? ` · ${unitById.get(f.unit_id)?.title}`
                    : ""}
                  {f.lesson_id && lessonById.get(f.lesson_id)
                    ? ` · ${lessonById.get(f.lesson_id)?.title}`
                    : ""}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="min-h-11 rounded-full sm:min-h-8"
                onClick={() => void open(f)}
              >
                <Download className="size-4" /> Åbn
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-11 rounded-full sm:size-9"
                aria-label={`Redigér ${f.title}`}
                onClick={() => edit(f)}
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-11 rounded-full sm:size-9"
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

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redigér materiale</DialogTitle>
            <DialogDescription>
              Opdatér metadata og tilknytninger. Selve filen ændres ikke.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-material-title">Titel</Label>
              <Input
                id="edit-material-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-material-subject">Fag (valgfri)</Label>
              <Input
                id="edit-material-subject"
                value={editSubject}
                onChange={(e) => setEditSubject(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label id="edit-material-class-label">Klasse (valgfri)</Label>
              <Select
                value={editClassId}
                onValueChange={(v) => {
                  setEditClassId(v);
                  setEditUnitId(NONE);
                  setEditLessonId(NONE);
                }}
              >
                <SelectTrigger aria-labelledby="edit-material-class-label">
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
              <Label id="edit-material-unit-label">Forløb (valgfri)</Label>
              <Select
                value={editUnitId}
                onValueChange={(v) => {
                  setEditUnitId(v);
                  setEditLessonId(NONE);
                }}
              >
                <SelectTrigger aria-labelledby="edit-material-unit-label">
                  <SelectValue placeholder="Ingen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Ingen</SelectItem>
                  {editUnitOptions.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label id="edit-material-lesson-label">Lektion (valgfri)</Label>
              <Select value={editLessonId} onValueChange={setEditLessonId}>
                <SelectTrigger aria-labelledby="edit-material-lesson-label">
                  <SelectValue placeholder="Ingen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Ingen</SelectItem>
                  {editLessonOptions.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="edit-material-note">Note (valgfri)</Label>
              <Textarea
                id="edit-material-note"
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Annullér
            </Button>
            <Button
              onClick={() => saveEdit.mutate()}
              disabled={saveEdit.isPending || !editTitle.trim()}
            >
              {saveEdit.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Gem ændringer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
