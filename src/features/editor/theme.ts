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
          fontVariantLigatures: "none",
          fontFeatureSettings: '"liga" 0, "clig" 0, "dlig" 0, "calt" 0',
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
          backgroundColor: dark ? "#0a84ff52" : "#0a84ff45",
          outline: dark ? "1px solid #0a84ff73" : "1px solid #0a84ff66",
          borderRadius: "2px",
        },
        ".cm-cursor": { borderLeftColor: "#0a84ff" },
        ".cm-matchingBracket": {
          backgroundColor: dark ? "#0a84ff38 !important" : "#0a84ff2b !important",
          outline: dark ? "1px solid #0a84ff85" : "1px solid #0a84ff70",
          borderRadius: "2px",
        },
        ".cm-panels": {
          backgroundColor: "var(--surface)",
          color: "var(--text)",
          borderColor: "var(--line)",
        },
        ".cm-panel.cm-search": {
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "6px 8px",
          padding: "9px 36px 9px 12px",
          borderBottom: "1px solid var(--line)",
          fontSize: "12px",
        },
        ".cm-panel.cm-search br": { flexBasis: "100%", height: "0" },
        ".cm-panel.cm-search input, .cm-panel.cm-search button, .cm-panel.cm-search label": {
          margin: "0",
        },
        ".cm-panel.cm-search input.cm-textfield": {
          width: "min(180px, 42vw)",
          minHeight: "30px",
          padding: "4px 8px",
        },
        ".cm-panel.cm-search button.cm-button": {
          fontSize: "12px",
          minHeight: "30px",
          padding: "4px 8px",
          backgroundColor: "var(--hover)",
          border: "1px solid var(--line)",
          borderRadius: "5px",
          color: "var(--text)",
          cursor: "pointer",
        },
        ".cm-panel.cm-search input[type=checkbox]": {
          accentColor: "#0a84ff",
          width: "14px",
          height: "14px",
          padding: "0",
          flexShrink: "0",
        },
        ".cm-panel.cm-search label": {
          flexDirection: "row",
          alignItems: "center",
          gap: "4px",
          fontSize: "11px",
        },
        ".cm-panel.cm-search [name=close]": {
          top: "7px",
          right: "8px",
          color: "var(--text)",
        },
        ".cm-searchMatch": {
          backgroundColor: dark ? "#0a84ff45" : "#0a84ff35",
        },
        ".cm-searchMatch-selected": {
          backgroundColor: dark ? "#0a84ff85" : "#0a84ff70",
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
