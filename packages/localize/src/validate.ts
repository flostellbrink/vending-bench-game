import { type RootNode } from "./schema.ts";

export function validateLexicon(root: RootNode) {
  void root;
  // TODO: make sure schema is specified
  // TODO: make sure all messages are valid
  // TODO: make sure all baseLocale messages exist
  // TODO: make sure all messages are translated into all locales
  // TODO: make sure there are no messages for additional locales
  // TODO: make sure all inputs pattern arg variables are declared (also local inputs)
  // TODO: make sure locale order matches
  // TODO: table align match cases within locale
  // TODO: sort match cases
  // TODO: attribute input/local errors to the message path, locale specific errors to the locale/match path
  // TODO: make sure all messages have ids
}
