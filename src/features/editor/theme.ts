import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";
export function editorTheme(dark: boolean) {
  return [
    EditorView.theme(
      {
        "&": {
          height: "100%",
          color: dark ? "#e6e8ef" : "#252b3b",
          backgroundColor: "var(--editor)",
        },
        ".cm-scroller": {
          fontFamily: "var(--mono)",
          fontSize: "14px",
          lineHeight: "1.85",
          overflow: "auto",
        },
        ".cm-content": { padding: "20px 0", caretColor: "#0a84ff" },
        ".cm-line": { padding: "0 24px 0 12px" },
        ".cm-gutters": {
          backgroundColor: "var(--editor)",
          color: dark ? "#626a7d" : "#8b91a0",
          border: "none",
          minWidth: "50px",
        },
        ".cm-activeLineGutter": {
          backgroundColor: "var(--hover)",
          color: "var(--text)",
        },
        ".cm-activeLine": { backgroundColor: dark ? "#ffffff03" : "#0a84ff04" },
        "&.cm-focused": { outline: "none" },
        "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": {
          backgroundColor: dark ? "#2767a5 !important" : "#a8d2fa !important",
        },
        ".cm-selectionMatch": {
          backgroundColor: dark ? "#0a84ff2b" : "#0a84ff24",
        },
        ".cm-cursor": { borderLeftColor: "#0a84ff" },
        ".cm-matchingBracket": {
          backgroundColor: "#0a84ff25",
          outline: "1px solid #0a84ff50",
        },
        ".cm-panels": {
          backgroundColor: "var(--surface)",
          color: "var(--text)",
          borderColor: "var(--line)",
        },
        ".cm-search input, .cm-search button": {
          fontSize: "16px",
          background: "var(--bg)",
          color: "var(--text)",
          border: "1px solid var(--line)",
          borderRadius: "5px",
        },
        ".cm-tooltip": {
          backgroundColor: "var(--surface)",
          border: "1px solid var(--line)",
        },
        ".cm-error-line": {
          backgroundColor: dark ? "#e4757514" : "#d7333310",
          borderLeft: "2px solid var(--danger)",
        },
      },
      { dark },
    ),
    syntaxHighlighting(
      HighlightStyle.define([
        {
          tag: [tags.keyword, tags.modifier],
          color: dark ? "#ab9aeb" : "#7653b5",
        },
        {
          tag: [tags.string, tags.special(tags.string)],
          color: dark ? "#98c7a2" : "#387c4b",
        },
        {
          tag: [tags.number, tags.bool, tags.null],
          color: dark ? "#d9b27b" : "#a66b21",
        },
        {
          tag: [
            tags.function(tags.variableName),
            tags.function(tags.definition(tags.variableName)),
          ],
          color: dark ? "#87bdec" : "#216ca8",
        },
        {
          tag: tags.comment,
          color: dark ? "#707c8f" : "#818895",
          fontStyle: "italic",
        },
        {
          tag: [tags.operator, tags.punctuation],
          color: dark ? "#a7b2c5" : "#566479",
        },
        {
          tag: [tags.className, tags.typeName],
          color: dark ? "#78c4c3" : "#237f7d",
        },
      ]),
    ),
  ];
}
