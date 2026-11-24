// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// HTML Sanitizer API (Element.setHTML), not yet in TypeScript's DOM lib.
// Transcribed from the WHATWG HTML WebIDL — keep in sync with:
// https://html.spec.whatwg.org/multipage/dynamic-markup-insertion.html#html-sanitization
// Ships in Chromium 146+ and Firefox 148+, not Safari: always feature-detect
// with `"setHTML" in Element.prototype` before calling.

type SanitizerPresets = "default"

interface SanitizerElementNamespace {
  name: string
  _namespace?: string | null
}

interface SanitizerElementNamespaceWithAttributes
  extends SanitizerElementNamespace {
  attributes?: readonly SanitizerAttribute[]
  removeAttributes?: readonly SanitizerAttribute[]
}

interface SanitizerAttributeNamespace {
  name: string
  _namespace?: string | null
}

interface SanitizerProcessingInstruction {
  target: string
}

type SanitizerElement = string | SanitizerElementNamespace
type SanitizerElementWithAttributes =
  | string
  | SanitizerElementNamespaceWithAttributes
type SanitizerPI = string | SanitizerProcessingInstruction
type SanitizerAttribute = string | SanitizerAttributeNamespace

interface SanitizerConfig {
  elements?: readonly SanitizerElementWithAttributes[]
  removeElements?: readonly SanitizerElement[]
  replaceWithChildrenElements?: readonly SanitizerElement[]
  processingInstructions?: readonly SanitizerPI[]
  removeProcessingInstructions?: readonly SanitizerPI[]
  attributes?: readonly SanitizerAttribute[]
  removeAttributes?: readonly SanitizerAttribute[]
  comments?: boolean
  dataAttributes?: boolean
  javascriptURLs?: boolean
}

interface Sanitizer {
  get(): SanitizerConfig
  allowElement(element: SanitizerElementWithAttributes): boolean
  removeElement(element: SanitizerElement): boolean
  replaceElementWithChildren(element: SanitizerElement): boolean
  allowProcessingInstruction(pi: SanitizerPI): boolean
  removeProcessingInstruction(pi: SanitizerPI): boolean
  allowAttribute(attribute: SanitizerAttribute): boolean
  removeAttribute(attribute: SanitizerAttribute): boolean
  setComments(allow: boolean): boolean
  setDataAttributes(allow: boolean): boolean
  setJavascriptURLs(allow: boolean): boolean
  removeUnsafe(): boolean
}

declare var Sanitizer: {
  prototype: Sanitizer
  new (configuration?: SanitizerConfig | SanitizerPresets): Sanitizer
}

interface SetHTMLOptions {
  sanitizer?: Sanitizer | SanitizerConfig | SanitizerPresets
}

interface Element {
  setHTML(html: string, options?: SetHTMLOptions): void
}
