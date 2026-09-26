import { EditorView, runScopeHandlers, type Panel, type ViewUpdate } from "@codemirror/view";
import {
  SearchQuery, getSearchQuery, setSearchQuery, searchPanelOpen,
  findNext, findPrevious, selectMatches, replaceNext, replaceAll, closeSearchPanel,
} from "@codemirror/search";

// The panel only edits CodeMirror's search query. Matching and replacements
// remain owned by the native search extension and its commands.
export function createSearchPanel(view: EditorView): Panel {
  const dom = document.createElement("div");
  dom.className = "cm-search";
  const query = getSearchQuery(view.state);
  function field(name: string, label: string, value: string) {
    const input = document.createElement("input");
    input.className = "cm-textfield";
    input.name = name;
    input.value = value;
    input.autocomplete = "off";
    input.setAttribute("autocorrect", "off");
    input.autocapitalize = "off";
    input.spellcheck = false;
    input.placeholder = label;
    input.setAttribute("aria-label", label);
    input.setAttribute("form", "");
    input.addEventListener("input", commit);
    return input;
  }
  const find = field("search", "Rechercher", query.search);
  find.setAttribute("main-field", "true");
  const replace = field("replace", "Remplacer par", query.replace);
  function option(name: string, label: string, description: string, checked: boolean) {
    const wrapper = document.createElement("label");
    wrapper.title = description;
    const input = document.createElement("input");
    input.type = "checkbox";
    input.name = name;
    input.checked = checked;
    input.title = description;
    input.setAttribute("aria-description", description);
    input.addEventListener("change", commit);
    wrapper.append(input, label);
    return { wrapper, input };
  }
  const caseOption = option("case", "Respecter la casse", "Distingue les majuscules et les minuscules.", query.caseSensitive);
  const regexOption = option("re", "Expression régulière", "Utilise une expression régulière pour la recherche.", query.regexp);
  const wordOption = option("word", "Mot entier", "Recherche uniquement le mot complet.", query.wholeWord);
  function button(name: string, label: string, command: (view: EditorView) => boolean) {
    const button = document.createElement("button");
    button.type = "button";
    button.name = name;
    button.className = "cm-button";
    button.textContent = label;
    button.addEventListener("click", () => command(view));
    return button;
  }
  const count = document.createElement("span");
  count.className = "cm-search-count";
  count.setAttribute("role", "status");
  count.setAttribute("aria-label", "Résultats de recherche");
  const close = button("close", "×", closeSearchPanel);
  close.className = "";
  close.setAttribute("aria-label", "Fermer");
  dom.append(find, button("next", "Suivant", findNext), button("prev", "Précédent", findPrevious), count,
    button("select", "Tout sélectionner", selectMatches), caseOption.wrapper, regexOption.wrapper, wordOption.wrapper,
    document.createElement("br"), replace, button("replace", "Remplacer", replaceNext), button("replaceAll", "Tout remplacer", replaceAll), close);

  let cachedQuery: SearchQuery | undefined;
  let cachedDoc = view.state.doc;
  let cachedMatches: { from: number; to: number }[] = [];
  function matches(query: SearchQuery) {
    if (cachedDoc === view.state.doc && cachedQuery?.eq(query)) return cachedMatches;
    const result: { from: number; to: number }[] = [];
    if (query.valid) {
      const cursor = query.getCursor(view.state);
      for (let next = cursor.next(); !next.done; next = cursor.next()) result.push({ ...next.value });
    }
    cachedDoc = view.state.doc;
    cachedQuery = query;
    cachedMatches = result;
    return result;
  }
  function activeMatch(results: { from: number; to: number }[]) {
    const selection = view.state.selection.main;
    return results.findIndex((match) => match.from === selection.from && match.to === selection.to);
  }
  function commit() {
    const next = new SearchQuery({
      search: find.value, replace: replace.value,
      caseSensitive: caseOption.input.checked, regexp: regexOption.input.checked,
      wholeWord: wordOption.input.checked,
    });
    const results = matches(next);
    const selected = activeMatch(results);
    const match = results[selected] ?? results.find((match) => match.from >= view.state.selection.main.from) ?? results[0];
    view.dispatch({
      effects: setSearchQuery.of(next),
      selection: match ? { anchor: match.from, head: match.to } : { anchor: view.state.selection.main.head },
    });
  }
  function refresh() {
    const current = getSearchQuery(view.state);
    find.value = current.search;
    replace.value = current.replace;
    caseOption.input.checked = current.caseSensitive;
    regexOption.input.checked = current.regexp;
    wordOption.input.checked = current.wholeWord;
    const results = matches(current);
    const active = activeMatch(results);
    count.textContent = !current.search ? "" : !results.length ? "Aucun résultat"
      : results.length === 1 ? "1 résultat"
      : active >= 0 ? `${active + 1} / ${results.length}` : `${results.length} résultats`;
  }
  function activate() {
    if (!searchPanelOpen(view.state) || !dom.isConnected) return;
    const results = matches(getSearchQuery(view.state));
    if (results.length && activeMatch(results) < 0) findNext(view);
    refresh();
  }
  dom.addEventListener("keydown", (event) => {
    if (runScopeHandlers(view, event, "search-panel")) event.preventDefault();
    else if (event.key === "Enter" && !(event.ctrlKey || event.metaKey)) {
      if (event.target === find) {
        event.preventDefault();
        (event.shiftKey ? findPrevious : findNext)(view);
      } else if (event.target === replace) {
        event.preventDefault();
        replaceNext(view);
      }
    }
  });
  refresh();
  return {
    dom, top: true,
    mount() { find.select(); queueMicrotask(activate); },
    update(update: ViewUpdate) {
      refresh();
      if (update.transactions.some((transaction) => transaction.effects.some((effect) => effect.is(setSearchQuery))))
        queueMicrotask(activate);
    },
  };
}
