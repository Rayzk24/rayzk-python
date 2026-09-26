import { Compartment, EditorState } from "@codemirror/state";
import { highlightSelectionMatches } from "@codemirror/search";

function hasVisibleSelection(state: EditorState) {
  const { from, to } = state.selection.main;
  return /\S/.test(state.sliceDoc(from, to));
}

// Keep CodeMirror's native matching, except for whitespace-only selections.
export function selectionMatchHighlighting() {
  const matches = new Compartment();
  return [
    matches.of([]),
    EditorState.transactionExtender.of((transaction) => {
      const enabled = hasVisibleSelection(transaction.state);
      if (enabled === hasVisibleSelection(transaction.startState)) return null;
      return {
        effects: matches.reconfigure(enabled ? highlightSelectionMatches() : []),
      };
    }),
  ];
}
