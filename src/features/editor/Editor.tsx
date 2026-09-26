import { useEffect, useRef } from "react";
import {
  Compartment,
  EditorState,
  StateEffect,
  StateField,
} from "@codemirror/state";
import {
  Decoration,
  EditorView,
  drawSelection,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  type DecorationSet,
} from "@codemirror/view";
import {
  bracketMatching,
  indentOnInput,
  indentUnit,
} from "@codemirror/language";
import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import {
  search,
  searchKeymap,
  openSearchPanel,
} from "@codemirror/search";
import { python } from "@codemirror/lang-python";
import { editorTheme } from "./theme";
import { selectionMatchHighlighting } from "./selection";
const markError = StateEffect.define<number | undefined>();
const errorField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(value, tr) {
    if (tr.docChanged) return Decoration.none;
    for (const effect of tr.effects)
      if (effect.is(markError)) {
        const line = effect.value;
        return line && line <= tr.state.doc.lines
          ? Decoration.set([
              Decoration.line({ class: "cm-error-line" }).range(
                tr.state.doc.line(line).from,
              ),
            ])
          : Decoration.none;
      }
    return value;
  },
  provide: (field) => EditorView.decorations.from(field),
});
type Props = {
  content: string;
  dark: boolean;
  error?: number;
  jump?: { line: number; seq: number };
  searchSignal: number;
  onChange: (code: string) => void;
  onRun: () => void;
  onCursor: (line: number, column: number) => void;
};
export function Editor(props: Props) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const theme = useRef(new Compartment());
  const latest = useRef(props);
  const lastSearchSignal = useRef(props.searchSignal);
  latest.current = props;
  useEffect(() => {
    if (!host.current) return;
    const editor = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: latest.current.content,
        extensions: [
          lineNumbers(),
          highlightActiveLineGutter(),
          highlightActiveLine(),
          history(),
          drawSelection(),
          python(),
          indentOnInput(),
          bracketMatching(),
          closeBrackets(),
          selectionMatchHighlighting(),
          search({ top: true }),
          EditorState.phrases.of({
            Find: "Rechercher",
            Replace: "Remplacer par",
            next: "Suivant",
            previous: "Précédent",
            all: "Tout sélectionner",
            "match case": "Respecter la casse",
            regexp: "Expression régulière",
            "by word": "Mot entier",
            replace: "Remplacer",
            "replace all": "Tout remplacer",
            close: "Fermer",
          }),
          errorField,
          EditorState.tabSize.of(4),
          indentUnit.of("    "),
          theme.current.of(editorTheme(latest.current.dark)),
          EditorView.contentAttributes.of({
            "aria-label": "Code Python",
            spellcheck: "false",
            autocapitalize: "off",
          }),
          keymap.of([
            { key: "Mod-h", run: openSearchPanel },
            {
              key: "Mod-Enter",
              run: () => {
                latest.current.onRun();
                return true;
              },
            },
            indentWithTab,
            ...closeBracketsKeymap,
            ...defaultKeymap,
            ...historyKeymap,
            ...searchKeymap,
          ]),
          EditorView.updateListener.of((update) => {
            if (update.docChanged)
              latest.current.onChange(update.state.doc.toString());
            if (update.selectionSet || update.docChanged) {
              const at = update.state.selection.main.head;
              const line = update.state.doc.lineAt(at);
              latest.current.onCursor(line.number, at - line.from + 1);
            }
          }),
        ],
      }),
    });
    view.current = editor;
    return () => {
      editor.destroy();
      view.current = null;
    };
  }, []);
  useEffect(() => {
    view.current?.dispatch({
      effects: theme.current.reconfigure(editorTheme(props.dark)),
    });
  }, [props.dark]);
  useEffect(() => {
    const editor = view.current;
    if (editor && editor.state.doc.toString() !== props.content)
      editor.dispatch({
        changes: {
          from: 0,
          to: editor.state.doc.length,
          insert: props.content,
        },
      });
  }, [props.content]);
  useEffect(() => {
    view.current?.dispatch({ effects: markError.of(props.error) });
  }, [props.error]);
  useEffect(() => {
    if (lastSearchSignal.current !== props.searchSignal) {
      lastSearchSignal.current = props.searchSignal;
      if (view.current) openSearchPanel(view.current);
    }
  }, [props.searchSignal]);
  useEffect(() => {
    const editor = view.current;
    const line = props.jump?.line;
    if (editor && line && line <= editor.state.doc.lines) {
      editor.dispatch({
        selection: { anchor: editor.state.doc.line(line).from },
        scrollIntoView: true,
      });
      editor.focus();
    }
  }, [props.jump]);
  return <div className="editor-host" ref={host} />;
}
