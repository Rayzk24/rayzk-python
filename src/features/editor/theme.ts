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
          gap: "7px 8px",
          padding: "10px 44px 10px 12px",
          borderBottom: "1px solid var(--line)",
          fontSize: "12px",
        },
        ".cm-panel.cm-search br": { display: "none" },
        ".cm-panel.cm-search::before": {
          content: '""',
          flexBasis: "100%",
          height: "0",
          order: "1",
        },
        ".cm-panel.cm-search::after": {
          content: '""',
          flexBasis: "100%",
          height: "0",
          order: "2",
        },
        ".cm-panel.cm-search [name=replace], .cm-panel.cm-search [name=replaceAll]": {
          order: "1",
        },
        ".cm-panel.cm-search input, .cm-panel.cm-search button, .cm-panel.cm-search label": {
          margin: "0",
        },
        ".cm-panel.cm-search input.cm-textfield": {
          width: "min(180px, 42vw)",
          minHeight: "34px",
          padding: "5px 10px",
          borderRadius: "8px",
          transition: "border-color 120ms, box-shadow 120ms",
        },
        ".cm-panel.cm-search input.cm-textfield:focus": {
          outline: "none",
          borderColor: "#0a84ff80",
          boxShadow: "0 0 0 2px #0a84ff20",
        },
        ".cm-panel.cm-search button.cm-button": {
          fontSize: "12px",
          minHeight: "32px",
          padding: "5px 10px",
          backgroundColor: "var(--bg)",
          border: "1px solid var(--line)",
          borderRadius: "7px",
          color: "var(--text)",
          cursor: "pointer",
        },
        ".cm-panel.cm-search button.cm-button:hover": {
          backgroundColor: "var(--hover)",
          borderColor: "#0a84ff55",
        },
        ".cm-panel.cm-search button.cm-button:active": {
          backgroundColor: "#0a84ff20",
        },
        ".cm-panel.cm-search button:focus-visible, .cm-panel.cm-search input[type=checkbox]:focus-visible": {
          outline: "2px solid #0a84ff",
          outlineOffset: "2px",
        },
        ".cm-panel.cm-search input[type=checkbox]": {
          appearance: "none",
          position: "relative",
          backgroundColor: "var(--bg)",
          border: "1px solid var(--muted)",
          borderRadius: "4px",
          width: "14px",
          height: "14px",
          padding: "0",
          flexShrink: "0",
          cursor: "pointer",
        },
        ".cm-panel.cm-search input[type=checkbox]:checked": {
          backgroundColor: "#0a84ff",
          borderColor: "#0a84ff",
        },
        ".cm-panel.cm-search input[type=checkbox]:checked::after": {
          content: '""',
          position: "absolute",
          left: "3px",
          top: "3px",
          width: "6px",
          height: "3px",
          border: "solid white",
          borderWidth: "0 0 2px 2px",
          transform: "rotate(-45deg)",
        },
        ".cm-panel.cm-search label": {
          flexDirection: "row",
          alignItems: "center",
          gap: "6px",
          fontSize: "11px",
          color: "var(--muted)",
          order: "3",
          minHeight: "24px",
          paddingRight: "5px",
          cursor: "pointer",
        },
        ".cm-panel.cm-search label:hover": {
          color: "var(--text)",
        },
        ".cm-panel.cm-search label:hover input[type=checkbox]": {
          borderColor: "#0a84ff",
        },
        ".cm-panel.cm-search [name=close]": {
          top: "7px",
          right: "8px",
          color: "var(--text)",
          width: "28px",
          height: "28px",
          minHeight: "28px",
          borderRadius: "6px",
          fontSize: "18px",
        },
        ".cm-panel.cm-search [name=close]:hover": {
          backgroundColor: "var(--hover)",
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
