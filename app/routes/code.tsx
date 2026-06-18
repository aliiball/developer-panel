import { useMemo, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { githubDark } from "@uiw/codemirror-theme-github";
import {
  File,
  Folder,
  Sparkle as Sparkles,
} from "@phosphor-icons/react";
import { PageHeader, PageBody } from "~/components/shell/PageHeader";
import { useSchemaStore } from "~/stores/schema-store";
import { useCopilotStore } from "~/stores/copilot-store";
import { modelToTs, modelToSql, modelToJson } from "~/lib/codegen";
import { cn } from "~/lib/utils";

export function meta() {
  return [{ title: "Code Editor — MetaPanel" }];
}

export default function Code() {
  const models = useSchemaStore((s) => s.models);
  const queuePrompt = useCopilotStore((s) => s.queuePrompt);
  const [active, setActive] = useState(0);

  const files = useMemo(() => {
    const out: { path: string; lang: "ts" | "sql" | "json"; code: string }[] = [];
    for (const m of models.slice(0, 6)) {
      out.push({ path: `models/${m.name}.ts`, lang: "ts", code: modelToTs(m) });
    }
    for (const m of models.slice(0, 4)) {
      out.push({ path: `migrations/create_${m.tableName}.sql`, lang: "sql", code: modelToSql(m) });
    }
    out.push({ path: "schema.json", lang: "json", code: modelToJson(models[0]) });
    return out;
  }, [models]);

  const file = files[active] ?? files[0];
  const extensions = file.lang === "json" ? [json()] : [javascript({ typescript: true })];

  return (
    <>
      <PageHeader
        title="Code Editor"
        description="Şemadan üretilen kod. CodeMirror 6 (salt görüntüleme prototipi)."
        actions={[
          { label: "AI ile Düzenle", icon: Sparkles, variant: "default", onClick: () => queuePrompt(`${file.path} dosyasını açıkla ve iyileştirme öner.`) },
        ]}
      />
      <PageBody grid={false} className="grid h-full grid-cols-1 gap-0 lg:grid-cols-[240px_1fr]">
        {/* File tree */}
        <aside className="mp-scroll overflow-y-auto border-r pr-2 lg:max-h-[calc(100vh-11rem)]">
          <TreeGroup label="models" icon={Folder}>
            {files.filter((f) => f.path.startsWith("models/")).map((f) => (
              <FileRow key={f.path} name={f.path.split("/")[1]} active={file.path === f.path} onClick={() => setActive(files.indexOf(f))} />
            ))}
          </TreeGroup>
          <TreeGroup label="migrations" icon={Folder}>
            {files.filter((f) => f.path.startsWith("migrations/")).map((f) => (
              <FileRow key={f.path} name={f.path.split("/")[1]} active={file.path === f.path} onClick={() => setActive(files.indexOf(f))} />
            ))}
          </TreeGroup>
          {files.filter((f) => !f.path.includes("/")).map((f) => (
            <FileRow key={f.path} name={f.path} active={file.path === f.path} onClick={() => setActive(files.indexOf(f))} />
          ))}
        </aside>

        {/* Editor */}
        <div className="flex min-w-0 flex-col">
          <div className="flex items-center gap-2 border-b bg-muted/30 px-3 py-1.5">
            <File className="size-3.5 text-muted-foreground" />
            <span className="font-mono text-xs">{file.path}</span>
          </div>
          <div className="mp-scroll overflow-auto">
            <CodeMirror
              value={file.code}
              theme={githubDark}
              extensions={extensions}
              editable={false}
              basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLine: false }}
              style={{ fontSize: 13 }}
            />
          </div>
        </div>
      </PageBody>
    </>
  );
}

function TreeGroup({ label, icon: Icon, children }: { label: string; icon: typeof Folder; children: React.ReactNode }) {
  return (
    <div className="mb-1">
      <div className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="size-3.5" /> {label}
      </div>
      <div className="ml-2">{children}</div>
    </div>
  );
}

function FileRow({ name, active, onClick }: { name: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left font-mono text-xs transition-colors",
        active ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50",
      )}
    >
      <File className="size-3" /> {name}
    </button>
  );
}
