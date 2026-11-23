// Party examples adapted from MF2 patterns and interpolation:
// https://messageformat.unicode.org/docs/reference/patterns/
// https://messageformat.unicode.org/docs/reference/variables/#usage
const title = { ".id": "jnkYXFtF", "^en": "You're invited!" };
const nameInput = "$name :string";
const welcomeDeclarations = [nameInput];
const welcome = { ".id": "GHAxFww_", ".inputs": welcomeDeclarations, "^en": "Welcome, {$name}!" };

// https://messageformat.unicode.org/docs/reference/functions/
// https://messageformat.unicode.org/docs/reference/variables/#local-declarations
const dateInput = "$date :date year=numeric month=short day=numeric";
const timeExpression = "$date :time timeStyle=short";
const timeLocal = { $time: timeExpression };
const dateDeclarations = [dateInput, timeLocal];
const dateInformation = "The start time tells guests when to arrive.";
const startsAt = {
  ".id": "B8saFlgf",
  ".info": dateInformation,
  ".inputs": dateDeclarations,
  "^en": "The party starts on {$date} at {$time}.",
};

// Plural and gender matching adapted from the MF2 party example:
// https://messageformat.unicode.org/docs/reference/matchers/
const countSelector = "$count";
const countInput = `${countSelector} :number`;
const countDeclarations = [countInput];
const countInformation =
  "The count is a non-negative integer and can be zero. It excludes the host.";
const count = {
  ".id": "aT8gAbWq",
  ".info": countInformation,
  ".inputs": countDeclarations,
  "^en": [
    countSelector,
    { "0     ": "No guests yet." },
    { "one   ": "One guest so far." },
    { "*     ": "So far there are {$count} guests." },
  ],
} as const;
const hostNameInput = "$hostName :string";
const hostGenderInput = "$hostGender :string";
const hostSelectors = "$hostGender $count";
const invitationDeclarations = [hostNameInput, hostGenderInput, countInput];
const invitation = {
  ".id": "G6XuOR6L",
  ".info": countInformation,
  ".inputs": invitationDeclarations,
  "^en": [
    countSelector,
    { "one   ": "Your host {$hostName} is having one guest over." },
    { "*     ": "Your host {$hostName} is having {$count} guests over." },
  ],
  de: [
    hostSelectors,
    { "female      one   ": "Deine Gastgeberin {$hostName} erwartet einen Gast." },
    { "female      *     ": "Deine Gastgeberin {$hostName} erwartet {$count} Gäste." },
    { "male        one   ": "Dein Gastgeber {$hostName} erwartet einen Gast." },
    { "male        *     ": "Dein Gastgeber {$hostName} erwartet {$count} Gäste." },
    { "*           one   ": "Dein*e Gastgeber*in {$hostName} erwartet einen Gast." },
    { "*           *     ": "Dein*e Gastgeber*in {$hostName} erwartet {$count} Gäste." },
  ],
} as const;

export const schemaExamples = {
  declarations: [dateDeclarations],
  information: [dateInformation],
  inputDeclarations: [nameInput, dateInput, countInput],
  localDeclarations: [timeLocal],
  localExpressions: [timeExpression],
  locales: [{ "^en": "English", de: "German", es: "Spanish" }],
  matchers: [count["^en"], invitation.de],
  messages: [title, welcome, startsAt, count, invitation],
  patterns: [title["^en"], welcome["^en"], startsAt["^en"]],
  selectors: [countSelector, hostSelectors],
};
