/** Read a contentEditable node as stored copy. `textContent` drops `<br>` and block splits. */
export function readEditableText(el: HTMLElement, multiline: boolean): string {
  if (!multiline) return el.textContent ?? "";
  return (el.innerText ?? "").replace(/\r\n/g, "\n").replace(/\n$/, "");
}

/** Write stored copy into a contentEditable node. `innerText` turns newlines into `<br>`. */
export function writeEditableText(el: HTMLElement, value: string, multiline: boolean) {
  if (multiline) {
    if (el.innerText.replace(/\r\n/g, "\n").replace(/\n$/, "") !== value) {
      el.innerText = value;
    }
    return;
  }
  if (el.textContent !== value) el.textContent = value;
}
